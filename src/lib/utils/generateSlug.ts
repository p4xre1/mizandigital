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

export type LexiconSlugItem = {
  id: string
  term_ar: string
  term_fr?: string
}

/** First Arabic slug wins; later homonyms append the French slug (then id). */
export function uniqueLexiconSlug(item: LexiconSlugItem, taken: Set<string>): string {
  const base = generateSlug(item.term_ar) || item.id
  const fr = generateSlug(item.term_fr || "") || item.id
  let slug = base
  if (taken.has(slug)) slug = `${base}-${fr}`
  if (taken.has(slug)) slug = `${base}-${item.id}`
  taken.add(slug)
  return slug
}

export function lexiconSlugById(items: LexiconSlugItem[]): Map<string, string> {
  const taken = new Set<string>()
  const map = new Map<string, string>()
  for (const item of items) {
    map.set(item.id, uniqueLexiconSlug(item, taken))
  }
  return map
}
