/**
 * POST /api/quiz/submit
 * مسار بديل لإرسال محاولة اختبار عبر Cloudflare Function بدلاً من RPC مباشر
 * يضيف طبقة تحديد معدل إضافية (KV) وحماية من البوتات (XP farming)
 *
 * ملاحظة: المتصفح الحالي يستدعي RPC submit_quiz_attempt مباشرة (attemptService.ts)،
 * لذلك فإن هذه الطبقة لا تحمي المسار الحالي بعد؛ انظر docs/algorithms-learning-and-search.md.
 */

import { checkRateLimit, fingerprint, getClientIp } from "../../_shared/guard.js";
import { assessQuizSession } from "../../../shared/quiz/anti-farming.js";

const MAX_ANSWERS = 100;

const json = (body, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });

export async function onRequestPost(context) {
  const { request, env } = context;

  // تحديد معدل: 20 محاولة / 10 دقائق لكل IP (مُخزَّن بهاش لا بعنوان IP خام)
  const ip = getClientIp(request);
  const ipHash = await fingerprint(ip, env.IP_HASH_SALT || "");
  const rate = await checkRateLimit({
    kv: env.RATE_LIMIT_KV,
    bucket: "quiz_submit",
    key: ipHash,
    limit: 20,
    windowSeconds: 10 * 60,
  });
  if (!rate.allowed) {
    return json(
      { error: "Rate limited", retryAfter: rate.retryAfterSeconds },
      429,
      { "Retry-After": String(rate.retryAfterSeconds || 60) },
    );
  }

  try {
    const body = await request.json();
    const { mode, label, tier, answers, durationMs, userRef } = body;

    if (!mode || !Array.isArray(answers) || answers.length === 0 || answers.length > MAX_ANSWERS) {
      return json({ error: "Invalid payload" }, 400);
    }

    // كشف الجلسات الآلية: تُسقَط بصمت (202 بلا استدعاء RPC، فلا XP ولا تفاصيل للعميل)
    const verdict = assessQuizSession({ answers, durationMs });
    if (verdict.action === "drop") {
      // سجل خادم فقط: الرموز بلا أي بيانات شخصية
      console.warn(
        `[quiz/submit] dropped score=${verdict.score} codes=${verdict.reasons.map((r) => r.code).join(",")}`,
      );
      return json({ ok: true, recorded: false }, 202);
    }

    const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
    const supabaseKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return json({ error: "Supabase not configured" }, 500);
    }

    // استدعاء RPC submit_quiz_attempt عبر REST
    const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/submit_quiz_attempt`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_mode: mode,
        p_label: label,
        p_tier: tier,
        p_answers: answers,
        p_duration_ms: durationMs,
        p_user_ref: userRef,
      }),
    });

    if (!rpcRes.ok) {
      const errText = await rpcRes.text();
      return json({ error: "RPC failed", details: errText }, 500);
    }

    const data = await rpcRes.json();
    return json({ ok: true, recorded: true, result: Array.isArray(data) ? data[0] : data });
  } catch (e) {
    return json({ error: e?.message || "Unknown" }, 500);
  }
}
