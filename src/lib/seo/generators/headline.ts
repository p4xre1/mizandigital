/**
 * src/lib/seo/generators/headline.ts
 *
 * إعادة تصدير أدوات العناوين من title.ts لتطابق أسماء الملفات المذكورة في
 * سجلّ القدرات (registry) مع وحدات حقيقية.
 */
export { optimizeHeadline, generateTitles, generateMetaDescription } from "./title"
export type { HeadlineVariant, TitleSuggestion, MetaDescriptionResult } from "./title"
