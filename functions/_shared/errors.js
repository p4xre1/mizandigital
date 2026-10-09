// functions/_shared/errors.js
//
// أخطاء الخادم: تُسجَّل مُنقَّاة على الخادم فقط، ولا تصل إلى المتصفح أبداً.
// القاعدة (SECURITY.md، طبقة الأخطاء): لا نعيد للعميل نص خطأ Supabase أو Stripe
// أو R2 ولا stack ولا اسم جدول أو دالة أو ترحيل. الرسالة العامة تكفي للمستخدم،
// والتفاصيل تبقى في سجلات Cloudflare لمن يملك صلاحية الوصول إليها.

/** أنماط تشبه أسراراً. تُحذف قبل أي تسجيل. */
const SECRET_PATTERNS = [
  /eyJ[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]*){1,2}/g, // JWT: الرأس eyJ… ثم حمولة وتوقيع (قد يكون قصيراً في الاختبارات)
  /\b(?:sk|rk|pk|whsec)_(?:live|test)_[A-Za-z0-9]+/g, // مفاتيح Stripe
  /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /(?:secret|token|password|api[_-]?key|service[_-]?role)["'\s:=]+[^\s"',;&]{6,}/gi,
]

/**
 * ينظّف نصاً قبل تسجيله: يحذف الأسرار المعروفة ويقصّه إلى طول محدود.
 * @param {unknown} value
 * @param {number} [max=200]
 */
export function scrub(value, max = 200) {
  let text = String(value ?? "")
  for (const re of SECRET_PATTERNS) text = text.replace(re, "[redacted]")
  return text.replace(/\s+/g, " ").slice(0, max)
}

/**
 * يسجّل خطأً على الخادم بصيغة منظّمة. لا يُرجع شيئاً للعميل.
 * @param {string} scope  اسم المسار أو الوظيفة، مثل "r2.presign"
 * @param {unknown} err
 */
export function logServerError(scope, err) {
  console.error(`[${scope}] ${scrub(err instanceof Error ? err.message : err)}`)
}
