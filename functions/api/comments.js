// functions/api/comments.js  →  POST /api/comments
//
// ─────────────────────────────────────────────────────────────────────────────
// نقطة نهاية وحيدة لإضافة تعليق من زائر غير مسجّل
// ─────────────────────────────────────────────────────────────────────────────
// قبل هذا الملف كان المتصفح يُدرج التعليق مباشرة في Supabase بمفتاح anon،
// وأي سكربت يستطيع تكرار نفس الطلب بلا حدود (السياسة
// "public can insert comments" كانت WITH CHECK (true)). الفحص في الواجهة
// (CommentSection.tsx) كان شكلياً فقط لأن كود المتصفح قابل للتجاوز بالكامل.
//
// طبقات الحماية هنا، بالترتيب:
//   1. تحديد المعدل حسب IP (نافذة 10 دقائق) — KV إن وُجد، ذاكرة العامل وإلا
//   2. حدّ أقصى لحجم الجسم (8 كيلوبايت)
//   3. مصيدة البوتات (حقل مخفي يجب أن يبقى فارغاً) + زمن التعبئة الأدنى
//   4. Cloudflare Turnstile (اختياري — يُفعَّل تلقائياً عند ضبط المفتاح)
//   5. تنقية النص + كشف الحقن/السبام (payloadGuard)
//   6. التحقق من وجود المحتوى المستهدف فعلاً (slug حقيقي)
//   7. الإدراج عبر REST بمفتاح anon → يخضع لـ RLS وللمُشغّل
//      comments_anti_abuse_guard في القاعدة (الطبقة التي لا يمكن تجاوزها)
//
// ملاحظة تصميمية: الرد على السبام هو "نجاح صامت" دائماً. لا نُخبر المهاجم
// لماذا رُفض تعليقه وإلا صار able على تعديل هجومه. الأسباب تُسجَّل في
// console العامل فقط (Cloudflare → Functions → Logs).
//
// NEEDS CLOUDFLARE CONFIGURATION (اختياري لكن موصى به بشدة):
//   RATE_LIMIT_KV      → ربط KV namespace يجعل تحديد المعدل عالمياً ودقيقاً
//   TURNSTILE_SECRET_KEY → مفتاح Cloudflare Turnstile السري
//   IP_HASH_SALT       → ملح لبصمة IP (لا يُخزَّن IP الخام)
//   SUPABASE_URL / SUPABASE_ANON_KEY → مطلوبة (نفس values المستخدمة في r2/)

import {
  checkRateLimit,
  checkHoneypotAndTiming,
  fingerprint,
  getClientIp,
  inspectUserText,
  jsonResponse,
  readJsonBody,
  tooManyRequests,
  verifyTurnstile,
  LIMITS,
} from "../_shared/guard.js"

/** حدّ الإدراج: 3 تعليقات لكل IP داخل 10 دقائق. */
const RATE_LIMIT = 3
const RATE_WINDOW_SECONDS = 600
const MAX_BODY_BYTES = 8 * 1024

const ALLOWED_SOURCE_TYPES = new Set(["articles", "news"])
/** slug آمن: يبدأ بحرف/رقم ثم أحرف/أرقام/شرطة/تسطير (يسمح بالعربية). */
const SAFE_SLUG_RE = /^[\p{L}\p{N}][\p{L}\p{N}_-]{0,199}$/u

function logRejection(request, stage, detail) {
  // لا يُرسل أي جزء من هذا للزائر — سجلات الخادم فقط.
  console.warn(`[comments] rejected stage=${stage} ip=${getClientIp(request)} ${detail || ""}`.trim())
}

export async function onRequestPost(context) {
  const { request, env } = context

  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    return jsonResponse({ error: "service_unavailable" }, 503)
  }

  const ip = getClientIp(request)
  const ipHash = await fingerprint(ip, env.IP_HASH_SALT || "")

  // ── 1) تحديد المعدل ───────────────────────────────────────────────────────
  const rate = await checkRateLimit({
    kv: env.RATE_LIMIT_KV,
    bucket: "comments",
    key: ipHash,
    limit: RATE_LIMIT,
    windowSeconds: RATE_WINDOW_SECONDS,
  })
  if (!rate.allowed) {
    logRejection(request, "rate_limit", `retry=${rate.retryAfterSeconds}s backend=${rate.backend}`)
    return tooManyRequests(rate.retryAfterSeconds)
  }

  // ── 2) حجم الجسم ─────────────────────────────────────────────────────────
  const parsed = await readJsonBody(request, MAX_BODY_BYTES)
  if (!parsed.ok) {
    logRejection(request, "body", parsed.error)
    return jsonResponse({ error: "invalid_request" }, parsed.status)
  }
  const body = parsed.body || {}

  // ── 3) مصيدة البوتات + زمن التعبئة ───────────────────────────────────────
  const bot = checkHoneypotAndTiming(body)
  if (!bot.ok) {
    logRejection(request, "bot", bot.reason)
    // نجاح صامت: البوت يظن أنه نجح فلا يغيّر سلوكه المكشوف
    return jsonResponse({ ok: true, moderation: true })
  }

  // ── 4) Turnstile (اختياري) ───────────────────────────────────────────────
  const turnstile = await verifyTurnstile({
    secret: env.TURNSTILE_SECRET_KEY,
    token: body.turnstileToken,
    remoteIp: ip,
  })
  if (!turnstile.skipped && !turnstile.verified) {
    logRejection(request, "turnstile", turnstile.codes.join(","))
    return jsonResponse({ error: "captcha_failed" }, 400)
  }

  // ── 5) التحقق من الحقول وتنقيتها ─────────────────────────────────────────
  const sourceType = String(body.sourceType || "").trim().toLowerCase()
  const sourceSlug = String(body.sourceSlug || "").trim()

  if (!ALLOWED_SOURCE_TYPES.has(sourceType) || !SAFE_SLUG_RE.test(sourceSlug)) {
    logRejection(request, "target", `type=${sourceType} slug_len=${sourceSlug.length}`)
    return jsonResponse({ error: "invalid_target" }, 400)
  }

  const nameCheck = inspectUserText(body.authorName, {
    field: "name",
    maxLength: LIMITS.AUTHOR_NAME_MAX,
    minLength: 1,
    maxUrls: 0, // الاسم لا يجب أن يحتوي أي رابط
    collapseNewlines: true,
  })
  if (!nameCheck.ok) {
    logRejection(request, "author_name", `${nameCheck.code} ${nameCheck.log || ""}`.trim())
    return jsonResponse({ ok: true, moderation: true })
  }

  const bodyCheck = inspectUserText(body.body, {
    field: "body",
    maxLength: LIMITS.BODY_MAX,
    minLength: LIMITS.BODY_MIN,
  })
  if (!bodyCheck.ok) {
    logRejection(request, "body", `${bodyCheck.code} ${bodyCheck.log || ""}`.trim())
    return jsonResponse({ ok: true, moderation: true })
  }

  // ── 6) التحقق من وجود المحتوى المستهدف ───────────────────────────────────
  const table = sourceType === "news" ? "news" : "articles"
  const existsRes = await fetch(
    `${supabaseUrl}/rest/v1/${table}?slug=eq.${encodeURIComponent(sourceSlug)}&select=id`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }, method: "GET" }
  )
  if (!existsRes.ok) {
    return jsonResponse({ error: "invalid_target" }, 400)
  }
  const targetRows = await existsRes.json()
  if (!Array.isArray(targetRows) || targetRows.length === 0) {
    logRejection(request, "target", `unknown_slug:${table}`)
    return jsonResponse({ error: "invalid_target" }, 404)
  }

  // ── 7) الإدراج (يخضع لـ RLS + comments_anti_abuse_guard) ─────────────────
  const userAgent = String(request.headers.get("User-Agent") || "").slice(0, 300)

  const insertRes = await fetch(`${supabaseUrl}/rest/v1/comments`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      source_type: sourceType,
      source_slug: sourceSlug,
      author_name: nameCheck.value,
      body: bodyCheck.value,
      // is_approved لا تُرسل إطلاقاً: المشغّل trg_force_comment_unapproved
      // يفرض false في كل الأحوال، فلا معنى لإرسالها.
      client_ip_hash: ipHash,
      user_agent: userAgent,
    }),
  })

  if (!insertRes.ok) {
    // رسالة القاعدة (constraint/trigger) تُسجَّل لكن لا تُرسل للزائر
    const detail = await insertRes.text().catch(() => "")
    logRejection(request, "insert", `http=${insertRes.status} ${detail.slice(0, 200)}`)
    return jsonResponse({ error: "insert_failed" }, 500)
  }

  // المشغّل قد يُسقط الصف بصمت (RETURN NULL) إن كان سباماً — الرد واحد في
  // الحالتين كي لا يتعلم المهاجم أي قاعدة أصابته.
  return jsonResponse({ ok: true, moderation: true })
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "POST, OPTIONS",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
