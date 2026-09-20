/**
 * أنواع وحدة سياسة الروابط القانونية.
 *
 * التنفيذ في url-policy.js (لا يُستورد TypeScript في سكربتات node، فالحل
 * JavaScript + ملف تعريفات).
 */

export declare const SITE_ORIGIN: string;

/** يوحّد المسار: بلا شرطة نهاية، بلا معاملات، بلا تكرار للشرطات. */
export declare function normalizePath(input: string | null | undefined): string;

/** يبني الرابط القانوني المطلق: canonicalUrl("/schools/x/") → origin + /schools/x */
export declare function canonicalUrl(
  input: string,
  options?: { origin?: string }
): string;

/** مسار داخلي نظيف لـ to= و href= (الجذر = "/"). */
export declare function internalPath(input: string): string;

/** هل يطابق الرابط سياسة بلا-شرطة-النهاية؟ */
export declare function followsSlashPolicy(value: string): boolean;

/** هل يُفهرَس هذا المسار؟ (لا admin ولا حسابات ولا بحث داخلي) */
export declare function isIndexablePath(input: string): boolean;

export declare function canonicalHome(origin?: string): string;
export declare function canonicalSchool(slug: string, origin?: string): string;
export declare function canonicalSchools(origin?: string): string;
export declare function canonicalLexicon(slug: string, origin?: string): string;
export declare function canonicalLexiconHub(origin?: string): string;
export declare function canonicalNews(slug: string, origin?: string): string;
export declare function canonicalNewsHub(origin?: string): string;
export declare function canonicalArticle(slug: string, origin?: string): string;
export declare function canonicalArticlesHub(origin?: string): string;
export declare function canonicalEvent(slug: string, origin?: string): string;
export declare function canonicalEventsHub(origin?: string): string;
export declare function canonicalPdf(slug: string, origin?: string): string;
export declare function canonicalArchive(origin?: string): string;
export declare function canonicalPage(slug: string, origin?: string): string;

export declare const itemPath: {
  school(slug: string): string;
  lexicon(slug: string): string;
  news(slug: string): string;
  article(slug: string): string;
  event(slug: string): string;
  pdf(slug: string): string;
};

/** ترميز عربي/لاتيني موحّد للمعرّفات الصديقة. */
export declare function slugify(text?: string): string;

export interface LexiconSlugInput {
  id: string;
  term_ar: string;
  term_fr?: string | null;
}

export declare function lexiconSlug(
  item: LexiconSlugInput,
  taken?: Set<string>
): string;
export declare function lexiconSlugMap(items: LexiconSlugInput[]): Map<string, string>;

export interface SluggableItem {
  id?: string;
  slug?: string | null;
  title?: string | null;
  name?: string | null;
  name_ar?: string | null;
  term_ar?: string | null;
}

export declare function contentSlug(
  item: SluggableItem | null | undefined,
  options?: { fallbackKey?: string }
): string;

export declare function newsSlug(item: SluggableItem): string;
export declare function articleSlug(item: SluggableItem): string;
export declare function eventSlug(item: SluggableItem): string;
export declare function schoolSlug(item: SluggableItem): string;
export declare function docSlug(item: SluggableItem, taken?: Set<string>): string;

export declare function canonicalNewsItem(item: SluggableItem, origin?: string): string;
export declare function canonicalArticleItem(item: SluggableItem, origin?: string): string;
export declare function canonicalEventItem(item: SluggableItem, origin?: string): string;
export declare function canonicalSchoolItem(item: SluggableItem, origin?: string): string;

export declare function dedupeCanonicalUrls(
  values: Array<string | null | undefined>,
  options?: { origin?: string }
): string[];

export declare function pathOfUrl(value: string): string;
