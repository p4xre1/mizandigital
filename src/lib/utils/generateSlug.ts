/**
 * توليد روابط صديقة (Slugs) مخصصة للنصوص العربية والإنجليزية
 */
export function generateSlug(text: string): string {
  if (!text) return ""

  return text
    .toString()
    .trim()
    .toLowerCase()
    // 1. إزالة التشكيل العربي (Tashkeel / Diacritics: ً ٌ ٍ َ ُ ِ ّ ْ)
    .replace(/[\u064B-\u0652]/g, "")
    // 2. إزالة التطويل العربي (Tatweel: ـ)
    .replace(/ـ/g, "")
    // 3. استبدال المسافات والشرطات السفلية بشرطة واحدة
    .replace(/[\s_]+/g, "-")
    // 4. الحفاظ على الأحرف العربية والأرقام والحروف الإنجليزية فقط
    .replace(/[^\w\u0600-\u06FF-]/g, "")
    // 5. دمج الشرطات المتكررة
    .replace(/-+/g, "-")
    // 6. إزالة الشرطات من البداية والنهاية
    .replace(/^-+|-+$/g, "")
}