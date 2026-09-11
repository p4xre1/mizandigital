// functions/_shared/payloadGuard.js
//
// ─────────────────────────────────────────────────────────────────────────────
// المصدر الوحيد للحقيقة (single source of truth) لمنطق تنقية وكشف المدخلات.
// ─────────────────────────────────────────────────────────────────────────────
// هذا الملف يُستعمل من جهتين:
//   1) الخادم: functions/_shared/guard.js → functions/api/comments.js
//   2) المتصفح: src/lib/security/payloadGuard.ts (لتحقيق ردّ فعل فوري للمستخدم)
//
// لذلك يجب أن يبقى هذا الملف:
//   • ESM نقي بلا أي اعتمادية خارجية (لا supabase-js، لا Web APIs خاصة
//     بالمتصفح أو بالعمال وحدهم) كي يعمل في Node و Workers و Vite معاً.
//   • دوال نقية (pure) بلا حالة داخلية، حتى يسهل اختبارها في vitest.
//
// ⚠️ الفحص هنا "دفاع في العمق" وليس الحماية الوحيدة: التحقق الحقيقي الذي لا
// يمكن تجاوزه موجود في الهجرة SQL (comments_anti_abuse_guard) لأن كود
// المتصفح يمكن لأي مهاجم تجاوزه بالكامل.

/**
 * حروف غير مرئية تُستعمل في هجمات "Trojan Source" وتجاوز اتجاه النص (Bidi
 * override) إضافة إلى الأصفار العريضة (zero-width) التي تُستخدم لإخفاء
 * كلمات محظورة عن فلاتر السبام مع بقائها مرئية للقارئ.
 * @see https://trojansource.codes/
 */
export const INVISIBLE_CHARS_RE =
  /[\u200B\u200C\u200D\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF\u00AD\u180E]/g

/** حروف تحكم (control chars) ما عدا السطر الجديد والتاب المسموحين في النص. */
export const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

/**
 * أنماط حقن/برمجة (XSS + SQLi + traversal). مكتوبة بشكل متسامح مع المسافات
 * لأن المهاجمين يفصلون الكلمات بمسافات أو أسطر جديدة للتهرب.
 */
export const INJECTION_PATTERNS = [
  // وسوم HTML / script / iframe / svg
  /<\s*\/?\s*(script|iframe|object|embed|svg|math|style|link|meta|base|form|body|html|applet)\b/i,
  // أي وسم HTML عام: <a ...> ، </div> ، <!-- --> ، <!DOCTYPE ...>
  /<[a-z!/][^>]*>/i,
  // معالجات الأحداث: onclick= ، onerror =
  /\bon[a-z]{3,}\s*=/i,
  // مخططات URI خطرة (مكتوبة بدقة لتفادي رفض نص عادي مثل "data: the results")
  /\b(javascript|vbscript)\s*:/i,
  /\bdata\s*:\s*(text\/(html|javascript)|application\/|image\/svg)/i,
  /\bfile\s*:\/\//i,
  // الوصول إلى كائنات المتصفح الحساسة
  /\b(document\s*\.\s*(cookie|write|domain)|window\s*\.\s*location|localStorage|sessionStorage|top\s*\.\s*location)\b/i,
  /\b(eval|Function|setTimeout|setInterval)\s*\(\s*["'`]/i,
  /base64\s*,/i,
  /expression\s*\(/i,
  // حقن SQL
  /\b(union\s+(all\s+)?select|insert\s+into|drop\s+(table|database|schema)|delete\s+from|update\s+[\w."]+\s+set\s|truncate\s+table|alter\s+table|create\s+(or\s+replace\s+)?(function|trigger)|copy\s+\w+\s+(from|to)\b)/i,
  /\b(xp_cmdshell|pg_sleep|pg_read_file|load_file|outfile|dumpfile|information_schema|pg_catalog|pg_shadow|waitfor\s+delay|benchmark\s*\()/i,
  // الحيلة الكلاسيكية: ' OR '1'='1
  /(['"`])\s*(or|and)\s*['"`]?\s*\d+\s*['"`]?\s*=\s*['"`]?\s*\d+/i,
  // تسلسلات تعليق/إنهاء تعليمة SQL.
  // ملاحظة: لا نرفض "--" وحدها في نهاية النص — علامة شائعة في الكتابة
  // العادية وتسبب رفضاً خاطئاً (false positive) لتعليقات قانونية سليمة.
  /;\s*(--|#|\/\*)/,
  /\/\*[\s\S]*?\*\//,
  // اجتياز المسارات (path traversal)
  /(\.\.[/\\]){2,}/,
]

/** كلمات سبام شائعة (روابط القمار/الأدوية/العملات). */
export const SPAM_KEYWORDS_RE =
  /\b(viagra|cialis|pharmacy|casino|slot\s?machine|poker\s?online|betting\s?tips|crypto\s?(pump|signal|invest)|forex\s?signal|seo\s?backlink|backlinks?\s?cheap|buy\s?followers|escort|onlyfans|link\s?building|guest\s?post\s?cheap)\b/i

/** رابط HTTP(S) أو www. — يُستعمل لحساب عدد الروابط (علامة سبام قوية). */
export const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"']{4,}/gi

/** الحدود الافتراضية للحقول. */
export const LIMITS = Object.freeze({
  AUTHOR_NAME_MAX: 100,
  BODY_MAX: 2000,
  BODY_MIN: 2,
  MAX_URLS: 3,
  /** عدد مرات تكرار الحرف نفسه المتتالية المقبولة. */
  MAX_CHAR_REPEAT: 9,
  /** أقل مدة مقبولة بين عرض النموذج والإرسال (ثوانٍ) — يكشف البوتات الفورية. */
  MIN_SUBMIT_SECONDS: 3,
})

/**
 * إزالة الحروف غير المرئية وحروف التحكم من نص.
 * @param {string} value
 * @returns {string}
 */
export function stripInvisibleChars(value) {
  if (typeof value !== "string" || !value) return ""
  return value.replace(INVISIBLE_CHARS_RE, "").replace(CONTROL_CHARS_RE, "")
}

/**
 * تنقية نص حرّ مدخل من مستخدم: إزالة الحروف الخفية، توحيد المسافات،
 * وقصّ الطول. لا تُعدّل المعنى المقروء إطلاقاً.
 * @param {string} value
 * @param {{ maxLength?: number, collapseNewlines?: boolean }} [options]
 * @returns {string}
 */
export function sanitizeUserText(value, options = {}) {
  const { maxLength = LIMITS.BODY_MAX, collapseNewlines = true } = options
  if (typeof value !== "string") return ""

  let out = stripInvisibleChars(value)
  // تحويل مسافات Unicode غير القياسية إلى مسافة عادية قبل الطيّ
  out = out.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ")
  out = out.replace(/[ \t\u061C]+/g, " ")
  // مسافات ملاصقة لسطر جديد تُحذف (وإلا بقيت "كلمة \n كلمة" بمسافات زائدة)
  out = out.replace(/ ?\n ?/g, "\n")
  if (collapseNewlines) out = out.replace(/\n{3,}/g, "\n\n")
  out = out.replace(/^[\s]+|[\s]+$/g, "")
  return out.length > maxLength ? out.slice(0, maxLength) : out
}

/**
 * كشف محاولات الحقن (XSS / SQLi / path traversal).
 * @param {string} value
 * @returns {{ safe: boolean, matches: string[] }} أسباب المطابقة (للسجلات فقط —
 *   لا تُعرض للمستخدم كي لا تُعطيه خريطة للتهرب من الفلتر).
 */
export function detectInjection(value) {
  if (typeof value !== "string" || !value) return { safe: true, matches: [] }
  const matches = []
  for (const re of INJECTION_PATTERNS) {
    const found = value.match(re)
    if (found) matches.push(found[0].slice(0, 60))
  }
  return { safe: matches.length === 0, matches }
}

/**
 * حساب عدد الروابط في نص.
 * @param {string} value
 * @returns {number}
 */
export function countUrls(value) {
  if (typeof value !== "string" || !value) return 0
  const found = value.match(URL_RE)
  return found ? found.length : 0
}

/**
 * كشف علامات السبام: روابط كثيرة، تكرار أحرف مبالغ، كلمات محظورة،
 * أو نص شبه فارغ.
 * @param {string} value
 * @param {{ maxUrls?: number }} [options]
 * @returns {{ spam: boolean, reasons: string[] }}
 */
export function detectSpam(value, options = {}) {
  const { maxUrls = LIMITS.MAX_URLS } = options
  const reasons = []
  if (typeof value !== "string") return { spam: false, reasons }

  const urls = countUrls(value)
  if (urls > maxUrls) reasons.push(`too_many_urls:${urls}`)

  if (new RegExp(`(.)\\1{${LIMITS.MAX_CHAR_REPEAT},}`).test(value)) {
    reasons.push("repeated_chars")
  }

  if (SPAM_KEYWORDS_RE.test(value)) reasons.push("spam_keyword")

  // نص لاتيني كله حروف كبيرة (علامة سبام كلاسيكية) — لا ينطبق على العربية
  const latinLetters = value.match(/[a-zA-Z]/g)
  if (latinLetters && latinLetters.length >= 20) {
    const upper = latinLetters.filter((c) => c === c.toUpperCase()).length
    if (upper / latinLetters.length > 0.8) reasons.push("all_caps")
  }

  return { spam: reasons.length > 0, reasons }
}

/**
 * الفحص الشامل لنص مدخل من مستخدم: تنقية + كشف حقن + كشف سبام + حدود الطول.
 * @param {string} raw
 * @param {{ field?: string, maxLength?: number, minLength?: number, maxUrls?: number }} [options]
 * @returns {{ ok: boolean, value: string, code: string|null, log?: string }}
 *   `code` رمز مستقر يُسجَّل في الخادم (لا يُعرض حرفياً للمستخدم).
 */
export function inspectUserText(raw, options = {}) {
  const {
    field = "text",
    maxLength = LIMITS.BODY_MAX,
    minLength = 1,
    maxUrls = LIMITS.MAX_URLS,
  } = options

  const value = sanitizeUserText(raw, { maxLength })

  if (value.length < minLength) return { ok: false, value, code: `${field}:too_short` }
  if (value.length > maxLength) return { ok: false, value, code: `${field}:too_long` }

  const injection = detectInjection(value)
  if (!injection.safe) {
    return { ok: false, value, code: `${field}:injection`, log: injection.matches.join("|") }
  }

  const spam = detectSpam(value, { maxUrls })
  if (spam.spam) return { ok: false, value, code: `${field}:spam`, log: spam.reasons.join("|") }

  return { ok: true, value, code: null }
}
