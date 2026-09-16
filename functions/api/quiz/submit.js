/**
 * POST /api/quiz/submit
 * مسار بديل لإرسال محاولة اختبار عبر Cloudflare Function بدلاً من RPC مباشر
 * يضيف طبقة تحديد معدل إضافية (KV) وحماية من البوتات
 */

import { checkRateLimit } from "../../_shared/guard.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for") || "unknown";
  const rateKey = `quiz:submit:${ip}`;

  // تحديد معدل: 20 محاولة / 10 دقائق لكل IP
  const rate = await checkRateLimit(env, rateKey, 20, 10 * 60);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ error: "Rate limited", retryAfter: rate.retryAfter }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfter || 60) },
    });
  }

  try {
    const body = await request.json();
    const { mode, label, tier, answers, durationMs, userRef } = body;

    if (!mode || !Array.isArray(answers) || answers.length === 0 || answers.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
    const supabaseKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "Supabase not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });
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
      return new Response(JSON.stringify({ error: "RPC failed", details: errText }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const data = await rpcRes.json();
    return new Response(JSON.stringify({ ok: true, result: Array.isArray(data) ? data[0] : data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || "Unknown" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
