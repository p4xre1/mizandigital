// functions/_shared/guard.js
//
// ─────────────────────────────────────────────────────────────────────────────
// طبقة حماية الطلبات (request guard) لـ Cloudflare Pages Functions
// ─────────────────────────────────────────────────────────────────────────────
// تجمع كل ما يحتاجه أي endpoint عام (public) من وسائل دفاع:
//   • تحديد عنوان IP الحقيقي للزائر
//   • تحديد المعدل (rate limiting) عبر KV مع تراجع تلقائي إلى ذاكرة العامل
//   • قراءة جسم الطلب بحدّ أقصى للحجم (منع هجمات التضخيم)
//   • التحقق من رمز Cloudflare Turnstile في الخادم (لا يُوثَق أبداً بالمتصفح)
//   • فحص حقل "مصيدة البوتات" (honeypot) والزمن المنقضي قبل الإرسال
//
// التصميم: كل ميزة تعمل بمعزل عن الأخرى وتتدهور بأمان (fail-open للخصائص
// الاختيارية مثل Turnstile/KV، وfail-closed للتحقق من المحتوى). السبب: لو
// غاب متغير بيئة اختياري يجب ألا يسقط الموقع كاملاً، لكن لا يجب أبداً أن
// يُقبل محتوى ضار بسبب غياب إعداد اختياري.

import { inspectUserText, LIMITS } from "./payloadGuard.js"

export { inspectUserText, LIMITS }

const encoder = new TextEncoder()

/**
 * مخزن احتياطي في ذاكرة العامل يُستعمل حين لا يكون KV مضبوطاً.
 * ⚠️ حدوده معروفة ومقصودة: Cloudflare Workers توزّع الطلبات على عدة عُقد
 * (isolates)، لذا هذا العدّاد "لكل isolate" وليس عالمياً. هو إذن طبقة تخفيف
 * (best-effort) وليس ضماناً. الضمان الحقيقي = ربط RATE_LIMIT_KV.
 */
const memoryStore = new Map()
const MEMORY_MAX_KEYS = 5000

function memoryPrune(now) {
  if (memoryStore.size < MEMORY_MAX_KEYS) return
  for (const [key, entry] of memoryStore) {
    if (entry.resetsAt <= now) memoryStore.delete(key)
  }
  // إن بقي المخزن ممتلئاً بعد التنظيف (هجوم فعلي)، أفرغه: رفض كل شيء أفضل
  // من السماح بفيض غير محدود.
  if (memoryStore.size >= MEMORY_MAX_KEYS) memoryStore.clear()
}

/**
 * تحديد عنوان IP للزائر. Cloudflare يضبط CF-Connecting-IP دائماً وهو غير
 * قابل للتزوير من العميل (يُستبدل في الحافة)، أما X-Forwarded-For فيمكن
 * للعميل إرساله — لذلك يُستعمل كحلّ أخير فقط (بيئة التطوير المحلية).
 * @param {Request} request
 * @returns {string}
 */
export function getClientIp(request) {
  const h = request.headers
  const cf = h.get("CF-Connecting-IP")
  if (cf) return cf.trim()
  const trueClient = h.get("True-Client-IP")
  if (trueClient) return trueClient.trim()
  const xff = h.get("X-Forwarded-For")
  if (xff) return xff.split(",")[0].trim()
  return "unknown"
}

/**
 * بصمة SHA-256 (بدون تخزين IP الخام احتراماً لخصوصية الزوّار — انظر
 * SECURITY.md). تستخدم كمفتاح لتحديد المعدل وللكشف عن الفيض في القاعدة.
 * @param {string} value
 * @param {string} [salt]
 * @returns {Promise<string>}
 */
export async function fingerprint(value, salt = "") {
  const data = encoder.encode(`${salt}::${value}`)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

/**
 * عدّاد نافذة ثابتة (fixed window) لتحديد المعدل.
 * @param {object} params
 * @param {{get:(k:string)=>Promise<any>,put:(k:string,v:string,o?:any)=>Promise<any>}} [params.kv]
 * @param {string} params.bucket اسم النطاق (مثلاً "comments")
 * @param {string} params.key   معرّف الزائر (بصمة IP عادة)
 * @param {number} params.limit الحد الأقصى داخل النافذة
 * @param {number} params.windowSeconds طول النافذة بالثواني
 * @returns {Promise<{allowed:boolean, remaining:number, retryAfterSeconds:number, backend:"kv"|"memory"}>}
 */
export async function checkRateLimit({ kv, bucket, key, limit, windowSeconds = 60 }) {
  const now = Date.now()
  const windowIndex = Math.floor(now / (windowSeconds * 1000))
  const cacheKey = `rl:${bucket}:${key}:${windowIndex}`
  const resetsAt = (windowIndex + 1) * windowSeconds * 1000
  const retryAfterSeconds = Math.max(1, Math.ceil((resetsAt - now) / 1000))

  if (kv) {
    try {
      const raw = await kv.get(cacheKey)
      const count = raw ? parseInt(raw, 10) || 0 : 0
      if (count >= limit) {
        return { allowed: false, remaining: 0, retryAfterSeconds, backend: "kv" }
      }
      // expirationTtl = ضعف النافذة: يكفي لانتهاء الصلاحية مع هامش أمان
      await kv.put(cacheKey, String(count + 1), { expirationTtl: windowSeconds * 2 })
      return { allowed: true, remaining: limit - count - 1, retryAfterSeconds: 0, backend: "kv" }
    } catch {
      // عطل KV لا يجب أن يُسقط الخدمة — ننتقل للمخزن المحلي
    }
  }

  memoryPrune(now)
  const entry = memoryStore.get(cacheKey)
  if (entry && entry.resetsAt > now) {
    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, retryAfterSeconds, backend: "memory" }
    }
    entry.count += 1
    return { allowed: true, remaining: limit - entry.count, retryAfterSeconds: 0, backend: "memory" }
  }

  memoryStore.set(cacheKey, { count: 1, resetsAt })
  return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0, backend: "memory" }
}

/**
 * قراءة جسم الطلب كـ JSON مع حدّ أقصى صارم للحجم.
 * نقرأ نصاً أولاً (بدل request.json() مباشرة) كي نرفض الأحجام الضخمة قبل
 * صرف الذاكرة على التحليل.
 * @param {Request} request
 * @param {number} [maxBytes]
 * @returns {Promise<{ok:true, body:any}|{ok:false, status:number, error:string}>}
 */
export async function readJsonBody(request, maxBytes = 16_384) {
  const declared = Number(request.headers.get("Content-Length") || 0)
  if (declared > maxBytes) return { ok: false, status: 413, error: "Payload too large" }

  let text
  try {
    text = await request.text()
  } catch {
    return { ok: false, status: 400, error: "Unreadable body" }
  }
  if (text.length > maxBytes) return { ok: false, status: 413, error: "Payload too large" }

  try {
    return { ok: true, body: JSON.parse(text) }
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON body" }
  }
}

/**
 * فحص مصيدة البوتات + الحد الأدنى لزمن التعبئة.
 * الحقل المخفي يجب أن يبقى فارغاً (البوتات تملأ كل الحقول)، والمدة بين
 * عرض النموذج والإرسال يجب ألا تكون لحظية.
 * @param {{ [k: string]: any }} body
 * @param {string} [honeypotField]
 * @param {number} [minSeconds]
 * @returns {{ ok: boolean, reason: string|null }}
 */
export function checkHoneypotAndTiming(body, honeypotField = "website", minSeconds = LIMITS.MIN_SUBMIT_SECONDS) {
  const honeypot = body?.[honeypotField]
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return { ok: false, reason: "honeypot_filled" }
  }
  if (honeypot !== undefined && honeypot !== null && honeypot !== "") {
    return { ok: false, reason: "honeypot_filled" }
  }

  const startedAt = Number(body?.formStartedAt)
  if (Number.isFinite(startedAt) && startedAt > 0) {
    const elapsedSeconds = (Date.now() - startedAt) / 1000
    // زمن في المستقبل (ساعة جهاز معدّلة) أو لحظي = بوت
    if (elapsedSeconds < minSeconds || elapsedSeconds > 86_400) {
      return { ok: false, reason: "submitted_too_fast" }
    }
  }

  return { ok: true, reason: null }
}

/**
 * التحقق من رمز Cloudflare Turnstile في الخادم.
 * @param {object} params
 * @param {string} params.secret المفتاح السري (TURNSTILE_SECRET_KEY)
 * @param {string} params.token  الرمز القادم من الويدجت
 * @param {string} [params.remoteIp]
 * @returns {Promise<{verified:boolean, skipped:boolean, codes:string[]}>}
 */
export async function verifyTurnstile({ secret, token, remoteIp }) {
  // بلا مفتاح سري = الميزة غير مفعّلة (نرجع skipped لا verified).
  if (!secret) return { verified: false, skipped: true, codes: [] }
  if (!token) return { verified: false, skipped: false, codes: ["missing-input"] }

  try {
    const form = new URLSearchParams({ secret, response: token })
    if (remoteIp) form.set("remoteip", remoteIp)

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    })
    if (!res.ok) return { verified: false, skipped: false, codes: [`http-${res.status}`] }

    const data = await res.json()
    return {
      verified: data?.success === true,
      skipped: false,
      codes: Array.isArray(data?.["error-codes"]) ? data["error-codes"] : [],
    }
  } catch {
    // تعذّر الوصول إلى Cloudflare: لا نرفض المستخدم الشرعي بسبب عطل خارجي،
    // لكن نُسجّل أن التحقق لم يتم.
    return { verified: false, skipped: true, codes: ["network-error"] }
  }
}

/** ردّ JSON قياسي مع ترويسات تمنع التخزين المؤقت. */
export function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  })
}

/** ردّ 429 مع Retry-After (يُحترم من طرف العملاء والوكلاء). */
export function tooManyRequests(retryAfterSeconds = 60) {
  return jsonResponse(
    { error: "too_many_requests" },
    429,
    { "Retry-After": String(retryAfterSeconds) }
  )
}