/**
 * توليد روابط صديقة (Slugs) مخصصة للنصوص العربية والإنجليزية
 *
 * ⚠️ هذه الملف لم يعد يملك الخوارزمية: إعادة التصدير الوحيدة لـ
 * shared/seo/url-policy.js هي المصدر الوحيد للحقيقة.
 *
 * لماذا؟ كانت نسخة الواجهة (هذا الملف)، ونسخة prerender.mjs، ونسخة
 * generate-sitemap.mjs، ونسخة enhance-lexicon-prerender.mjs — أربع
 * خوارزميات تبني «نفس» المعرّف. divergence بينها يعني روابط في خريطة
 * الموقع أو في القوائم تشير إلى صفحات غير موجودة (404)، لأن الملف الثابت
 * يُولَّد باسم مختلف تماماً عن الرابط المنشور. شوهد هذا فعلاً في:
 *   /lexicon/الرهن-الحيازي-gage  (sitemap)  ↔  …-gage-civil (الصفحة الفعلية)
 *   و 7 روابط /pdf تحمل شرطة مزدوجة -- في sitemap لا تطابق أي ملف.
 *
 * أي تغيير هنا يجب أن يمرّ باختبارات tests/seo-canonical.test.ts التي
 * تقارن الخوارزميات على بيانات المشروع نفسها.
 */
import {
  docSlug,
  lexiconSlug,
  lexiconSlugMap,
  slugify,
} from "../../../shared/seo/url-policy.js"

/**
 * ترميز المعرّف الصديق: تطبيع NFKC، إزالة التشكيل (U+064B..U+065F، U+0670)
 * والتطويل (U+0640)، استبدال الفراغات والشرطات السفلية والمائلة بشرطة واحدة،
 * والاحتفاظ بالحروف اللاتينية والأرقام والمدى العربي.
 */
export function generateSlug(text: string): string {
  return slugify(text ?? "")
}

export type LexiconSlugItem = {
  id: string
  term_ar: string
  term_fr?: string
}

/** First Arabic slug wins; later homonyms append the item id instead of French. */
export function uniqueLexiconSlug(item: LexiconSlugItem, taken: Set<string>): string {
  return lexiconSlug(item, taken)
}

export function lexiconSlugById(items: LexiconSlugItem[]): Map<string, string> {
  return lexiconSlugMap(items)
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
  return docSlug(item, taken)
}

export function titledSlugById(items: TitledSlugItem[]): Map<string, string> {
  const taken = new Set<string>()
  const map = new Map<string, string>()
  for (const item of items) {
    map.set(item.id, uniqueTitledSlug(item, taken))
  }
  return map
}
