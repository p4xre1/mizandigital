/**
 * واجهة TypeScript فوق سياسة الروابط القانونية (shared/seo/url-policy.js).
 *
 * لماذا واجهة صغيرة بدل إعادة التنفيذ هنا؟
 * ----------------------------------------
 * الروابط تُبنى أيضاً في سكربتات node (prerender، sitemap، feed، llms) التي
 * لا تستطيع استيراد TypeScript. المنطق الوحيد الصالح لذلك في shared/ على شكل
 * ESM خالص، وهذه الملف يوفّر له الأنواع والاستعمال المريح داخل الواجهة.
 * النتيجة: مصدر واحد للقاعدة، فلا تنحرف canonical عن sitemap عن الروابط
 * الداخلية عن الملفات الثابتة المولّدة.
 *
 * القاعدة كاملة (ولماذا بهذا الشكل): SEO-URL-POLICY.md في جذر المستودع.
 * القاعدة: لا شرطة مائلة في نهاية أي رابط.
 *   ✓ https://www.mizan.page/schools/fsjes-ait-melloul
 *   ✓ https://www.mizan.page/lexicon/التقادم
 *   ✗ https://www.mizan.page/schools/fsjes-ait-melloul/
 */
import {
  SITE_ORIGIN as ORIGIN,
  canonicalAnnonces,
  canonicalArticle,
  canonicalArticlesHub,
  canonicalArchive,
  canonicalEvent,
  canonicalEventsHub,
  canonicalHome,
  canonicalLexicon,
  canonicalLexiconHub,
  canonicalNews,
  canonicalNewsHub,
  canonicalPage,
  canonicalPdf,
  canonicalResume,
  canonicalSchool,
  canonicalSchools,
  canonicalUrl,
  contentSlug,
  dedupeCanonicalUrls,
  docSlug,
  followsSlashPolicy,
  internalPath,
  isIndexablePath,
  isItemPath,
  itemPath,
  lexiconSlug,
  lexiconSlugMap,
  newsSlug,
  normalizePath,
  pathOfUrl,
  slugify,
} from "../../shared/seo/url-policy.js";

/** النطاق القانوني الموحّد — بلا شرطة مائلة. */
export const BASE_URL: string = ORIGIN;

export {
  canonicalAnnonces,
  canonicalArticle,
  canonicalArticlesHub,
  canonicalArchive,
  canonicalEvent,
  canonicalEventsHub,
  canonicalHome,
  canonicalLexicon,
  canonicalLexiconHub,
  canonicalNews,
  canonicalNewsHub,
  canonicalPage,
  canonicalPdf,
  canonicalResume,
  canonicalSchool,
  canonicalSchools,
  canonicalUrl,
  contentSlug,
  dedupeCanonicalUrls,
  docSlug,
  followsSlashPolicy,
  internalPath,
  isIndexablePath,
  isItemPath,
  itemPath,
  lexiconSlug,
  lexiconSlugMap,
  newsSlug,
  normalizePath,
  pathOfUrl,
  slugify,
};

/**
 * معرّف مصطلح في المعجم (المصدر نفسه المستعمل في prerender و sitemap).
 * تُمرَّر مجموعة `taken` عند توليد قائمة، لتفصل التكرار بإلحاق المعرّف.
 */
export function lexiconItemSlug(
  item: { id: string; term_ar: string; term_fr?: string | null },
  taken?: Set<string>,
): string {
  return lexiconSlug(item, taken ?? new Set<string>());
}

/** معرّفات كل مصطلحات المعجم بترتيب القائمة — id → slug. */
export const lexiconSlugs = lexiconSlugMap;

/** معرّف خبر/مقال/فعالية/كلية من بياناتها. */
export const slugForContent = contentSlug;

/**
 * الرابط القانوني من مسار المتصفح.
 *
 * لماذا؟ SEOHead كان يسقط على `window.location.href` حين لا يُمرَّر
 * canonicalUrl صراحةً — أي أن أي زيارة عبر رابط بشرطة نهاية أو بمعاملات
 * (utm_source، فصل الدراسة، ...) كانت تكتب canonical يطابق ذلك الرابط،
 * فتتوزّع إشارة الفهرسة على نسخ متعددة من الصفحة نفسها.
 * هذه الدالة تُعيد دائماً النسخة القانونية: مسار نظيف على النطاق الموحّد.
 */
export function canonicalFromLocation(pathname: string, origin: string = BASE_URL): string {
  return canonicalUrl(pathname || "/", { origin });
}

/** تقاطع المسار الحالي مع السياسة — يُستعمل لتحديث canonical بعد التنقل. */
export function canonicalPathFromLocation(pathname: string): string {
  return internalPath(pathname || "/");
}

/** هل هذا الرابط داخلي قابل للفهرسة؟ (لترشيح الروابط في القوائم) */
export function isIndexableInternalHref(href: string): boolean {
  if (!href) return false;
  if (/^(mailto:|tel:|javascript:|#)/i.test(href)) return false;
  if (/^https?:\/\//i.test(href) && !href.startsWith(BASE_URL)) return false;
  return isIndexablePath(href);
}

/**
 * الاسم المفضَّل داخل المكوّنات when the component already has a local
 * `canonicalUrl` variable: يبني الرابط القانوني من مسار الصفحة نفسه.
 *
 *   canonicalUrl={canonicalFor("/lexicon")}
 */
export function canonicalFor(path: string): string {
  return canonicalUrl(path)
}
