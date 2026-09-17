/**
 * safeRedirect — تحقّق من وجهة إعادة التوجيه قبل استعمالها.
 * -----------------------------------------------------------------------
 * المشكلة: `?next=` كانت تُقرأ من الرابط وتمرَّر إلى navigate() كما هي.
 * المتصفح يحلّ القيم التالية خارج النطاق:
 *     //evil.com      → https://evil.com     (بداية ببروتوكول نسبي)
 *     /\evil.com      → https://evil.com     (الشرطة المائلة العكسية تعامل معاملة /)
 *     ///evil.com     → https://evil.com
 *     https://evil.com→ https://evil.com
 * وهذا «إعادة توجيه مفتوحة» (Open Redirect): تُستعمل للتصيّد بحملة رابط
 * يبدو أنه من mizan.page، ولتسريب رموز العودة بعد OAuth.
 *
 * القاعدة: نقبل مساراً نسبيّاً داخليّاً فقط، وكل شيء آخر يسقط إلى البديل.
 */

/** أحرف تحكم وأسطر جديدة — تُرفض لمنع الحقن في الترويسات أو السجلات. */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/

/**
 * يُرجِع مساراً داخليّاً آمناً، أو `fallback` إن كانت الوجهة مريبة.
 *
 * @param candidate القيمة الخام (عادة من searchParams.get("next"))
 * @param fallback  الوجهة الافتراضية الداخلية (مثل "/profile")
 */
export function safeRedirectPath(candidate: string | null | undefined, fallback: string): string {
  if (typeof candidate !== "string") return fallback

  const value = candidate.trim()
  if (!value || value.length > 512) return fallback
  if (CONTROL_CHARS.test(value)) return fallback

  // يجب أن يبدأ بشرطة مائلة واحدة بالضبط:
  //   "//"  → بروتوكول نسبي، يخرج من النطاق
  //   "/\"  → المتصفحات تعاملها معاملة "//"
  //   "/%2f%2f" → لا يفكّ ترميزها هنا، لكنها تُرفض احتياطاً
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback

  // مسافة داخلية: مسار داخلي مشروع لا يحتاجها، ووجودها مؤشر محاولة تشويش.
  if (/\s/.test(value)) return fallback

  // الشرطة المائلة أو العكسية المرمّزة (%2f / %5c): تبقى داخل النطاق عند
  // الحلّ هنا، لكن بعض الوكلاء والخوادم تفكّ ترميزها فتنقلب // أو /\، لذا
  // تُرفض احتياطاً (دفاع في العمق).
  if (/%2f/i.test(value) || /%5c/i.test(value)) return fallback

  // لا مخطّط (scheme) مضمّناً: "http:" أو "javascript:" أو ما شابه
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return fallback
  if (value.toLowerCase().includes("javascript:") || value.toLowerCase().includes("data:")) {
    return fallback
  }

  // الفحص الحاسم: الحلّ كما يفعله المتصفح تماماً، ومقارنة النطاق.
  // نُمرّر أصلاً صريحاً حتى يعمل الدالة في الاختبارات وفي SSR.
  const base =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://www.mizan.page"

  try {
    const resolved = new URL(value, base)
    if (resolved.origin !== new URL(base).origin) return fallback
    if (resolved.protocol !== "https:" && resolved.protocol !== "http:") return fallback
    // نُعيد المسار والاستعلام والجزء، بلا النطاق — فيبقى التنقّل داخليّاً.
    return `${resolved.pathname}${resolved.search}${resolved.hash}`
  } catch {
    return fallback
  }
}

/**
 * يبني وجهة كاملة بعد التحقق — تستعمل حيث يُطلب رابط مطلق
 * (مثل emailRedirectTo وredirectTo في OAuth).
 */
export function safeRedirectUrl(
  candidate: string | null | undefined,
  fallbackPath: string,
): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://www.mizan.page"
  return `${origin}${safeRedirectPath(candidate, fallbackPath)}`
}
