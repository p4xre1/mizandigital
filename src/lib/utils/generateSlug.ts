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

/** First Arabic slug wins; later homonyms append the item id instead of French. */
export function uniqueLexiconSlug(item: LexiconSlugItem, taken: Set<string>): string {
  const base = generateSlug(item.term_ar) || item.id
  let slug = base
  
  // إذا تكرر الاسم العربي، نضيف الـ id بدلاً من الـ term_fr لضمان فرادة الرابط ونظافته
  if (taken.has(slug)) {
    slug = `${base}-${item.id}`
  }
  
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

export type TitledSlugItem = {
  id: string
  title: string
}

/**
 * روابط فريدة صديقة لمحركات البحث للموارد المحلية غير المرتبطة بقاعدة
 * بيانات (مثل docs.json)، حيث لا يوجد عمود "slug" جاهز. يُستخدم نفس
 * منطق lexiconSlugById: العنوان أولاً، ثم إضافة المعرّف الأصلي عند التكرار
 * لضمان فرادة الرابط.
 */
export function uniqueTitledSlug(item: TitledSlugItem, taken: Set<string>): string {
  const base = generateSlug(item.title) || generateSlug(item.id) || item.id
  let slug = base
  if (taken.has(slug)) {
    slug = `${base}-${generateSlug(item.id) || item.id}`
  }
  taken.add(slug)
  return slug
}

export function titledSlugById(items: TitledSlugItem[]): Map<string, string> {
  const taken = new Set<string>()
  const map = new Map<string, string>()
  for (const item of items) {
    map.set(item.id, uniqueTitledSlug(item, taken))
  }
  return map
}