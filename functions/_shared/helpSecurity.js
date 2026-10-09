// functions/_shared/helpSecurity.js
//
// طبقة الأمان الخاصة بمساعد الموقع. كل دالة هنا تفشل إلى الرفض (fail closed):
//   • بوابة الطلب: المصدر، نوع المحتوى، حجم الجسم المتدفق.
//   • ترويسات أمنية صارمة على كل رد.
//   • فحص الخرج قبل إرساله، حتى لو تسرّب محتوى غير آمن إلى قاعدة البيانات.
//   • سجل أمني منظّم بلا نص السؤال (لا تُخزَّن أسئلة الزوار في السجلات).
//   • تجزئة معرّفات المستخدم في السجل بدل كشفها.


/** ترويسات تُضاف إلى كل رد من المساعد، ناجحاً كان أو خاطئاً. */
export const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
}

/**
 * هل الطلب من الموقع نفسه؟ المتصفح يرسل Sec-Fetch-Site و Origin في كل طلب POST.
 * الطلب بلا هذه الترويسات (أداة برمجية) مسموح، لأنه يحتاج رمز دخول صالحاً على أي حال.
 * @param {Request} request
 * @param {Record<string, any>} [env]   HELP_ALLOWED_ORIGINS: قائمة مفصولة بفاصلة لنطاقات إضافية.
 * @returns {{ ok: boolean, reason: string | null }}
 */
export function checkOrigin(request, env = {}) {
  const site = request.headers.get("Sec-Fetch-Site")
  if (site && !["same-origin", "none"].includes(site.toLowerCase())) {
    return { ok: false, reason: "cross_site" }
  }

  const origin = request.headers.get("Origin")
  if (origin) {
    let self
    try {
      self = new URL(request.url).origin
    } catch {
      return { ok: false, reason: "bad_request_url" }
    }
    const extra = String(env.HELP_ALLOWED_ORIGINS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
    if (origin !== self && !extra.includes(origin)) return { ok: false, reason: "origin_mismatch" }
  }
  return { ok: true, reason: null }
}

/**
 * يقرأ الجسم كتدفق ويتوقف فور تجاوز الحد، دون الاعتماد على Content-Length
 * (قد يكذب العميل أو يغيب مع النقل المجزأ).
 * @returns {Promise<{ok: true, text: string} | {ok: false, status: number, error: string}>}
 */
export async function readBoundedText(request, maxBytes) {
  const declared = Number(request.headers.get("Content-Length") || 0)
  if (declared > maxBytes) return { ok: false, status: 413, error: "payload_too_large" }
  if (!request.body) return { ok: true, text: "" }

  const reader = request.body.getReader()
  const chunks = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel().catch(() => {})
        return { ok: false, status: 413, error: "payload_too_large" }
      }
      chunks.push(value)
    }
  } catch {
    return { ok: false, status: 400, error: "unreadable_body" }
  }

  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) }
  } catch {
    return { ok: false, status: 400, error: "invalid_encoding" }
  }
}

/** أنماط ممنوعة في أي جواب يصل إلى الزائر، حتى لو كان من المحتوى المعتمد. */
// فحص الخرج معرّف في shared/help/pipeline.js ليشترك فيه الخادم ولوحة الاختبار.
export { sanitizeAnswerResult } from "../../shared/help/pipeline.js"

/** تجزئة قصيرة وغير قابلة للعكس لمعرّف في السجل (SHA-256 مقتطع). */
export async function shortHash(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value)))
  return Array.from(new Uint8Array(digest))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * سجل أمني منظّم. يقبل حقولاً قصيرة وبسيطة فقط، ولا يقبل نص السؤال أبداً.
 * @param {string} event
 * @param {Record<string, string | number | boolean | null>} [fields]
 */
export function logSecurityEvent(event, fields = {}) {
  const safe = {}
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string") {
      if (value.length <= 80) safe[key] = value
    } else if (typeof value === "number" || typeof value === "boolean" || value === null) {
      safe[key] = value
    }
  }
  console.warn(JSON.stringify({ scope: "help-chat", level: "security", event, ts: new Date().toISOString(), ...safe }))
}

/**
 * قفل مؤقت بعد محاولات الهندسة الاجتماعية المتكررة.
 * 3 محاولات مرفوضة خلال ساعة ← قفل ساعة من آخر محاولة. أثناء القفل لا تُحتسب محاولات جديدة.
 * بلا KV لا يوجد قفل (الرفض لكل رسالة يبقى قائماً).
 */
export const STRIKE_LIMIT = 3
export const STRIKE_WINDOW_SECONDS = 3600

const strikeKey = (userId) => `help:strikes:${userId}`

/** @returns {Promise<boolean>} */
export async function isLockedOut(kv, userId) {
  if (!kv) return false
  try {
    const raw = await kv.get(strikeKey(userId))
    return (parseInt(raw, 10) || 0) >= STRIKE_LIMIT
  } catch {
    return false
  }
}

/** يسجّل محاولة مرفوضة ويعيد عددها الحالي. */
export async function recordStrike(kv, userId) {
  if (!kv) return 0
  try {
    const raw = await kv.get(strikeKey(userId))
    const count = (parseInt(raw, 10) || 0) + 1
    await kv.put(strikeKey(userId), String(count), { expirationTtl: STRIKE_WINDOW_SECONDS })
    return count
  } catch {
    return 0
  }
}
