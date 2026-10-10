/**
 * POST /api/quiz/submit
 * مسار بديل لإرسال محاولة اختبار عبر Cloudflare Function بدلاً من RPC مباشر
 * يضيف طبقة تحديد معدل إضافية (KV) وحماية من البوتات (XP farming)
 *
 * ملاحظة: المتصفح الحالي يستدعي RPC submit_quiz_attempt مباشرة (attemptService.ts)،
 * لذلك فإن هذه الطبقة لا تحمي المسار الحالي بعد؛ انظر docs/algorithms-learning-and-search.md.
 */

import { checkRateLimit, fingerprint, getClientIp } from "../../_shared/guard.js";
import { readBoundedJson } from "../../_shared/bodyLimit.js";
import { logServerError } from "../../_shared/errors.js";

/** حجم أقصى لجسم الطلب: 100 إجابة لا تتجاوز بضعة كيلوبايتات. */
const MAX_BODY_BYTES = 32 * 1024;
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
    const parsed = await readBoundedJson(request, MAX_BODY_BYTES);
    if (!parsed.ok) {
      return json({ error: "Invalid payload" }, parsed.status === 413 ? 413 : 400);
    }
    const body = parsed.data;
    if (!body || typeof body !== "object") return json({ error: "Invalid payload" }, 400);
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
      // تفصيل خطأ قاعدة البيانات للسجل المُنقّى فقط، لا للعميل.
      const errText = await rpcRes.text().catch(() => "");
      logServerError("quiz.submit", `rpc http=${rpcRes.status} ${errText}`);
      return json({ error: "RPC failed" }, 500);
    }

    const data = await rpcRes.json();
    return json({ ok: true, recorded: true, result: Array.isArray(data) ? data[0] : data });
  } catch (e) {
    logServerError("quiz.submit", e);
    return json({ error: "internal_error" }, 500);
  }
}
