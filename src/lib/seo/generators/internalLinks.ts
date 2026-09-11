/**
 * src/lib/seo/generators/internalLinks.ts
 *
 * Internal Link Generator: يقترح روابط داخلية من نص إلى صفحات موجودة فعلاً
 * في المرجع. لا يقترح رابطاً لصفحة غير موجودة — كل اقتراح مبني على بيانات
 * حقيقية (المعجم، المقالات، الكليات).
 */

import { normalizeArabic, tokenize } from "../analyzers/text"

export interface LinkableTarget {
  slug: string
  title: string
  kind: "article" | "news" | "lexicon" | "school" | "event" | "static"
  /** كلمات مفتاحية تُطابق النص لاقتراح الرابط. */
  keywords: string[]
  path: string
}

export interface LinkSuggestion {
  target: LinkableTarget
  /** النص الذي يُربط داخل المقال. */
  anchor: string
  /** موضع تقريبي (حرف البداية) للإدراج. */
  position: number
  /** 0-100: قوة الاقتراح. */
  confidence: number
  reason: string
}

/** استخراج كلمات ذات دلالة من عنوان/مصطلح. */
function keywordsFor(target: { title: string; keywords?: string[] }): string[] {
  const words = tokenize(normalizeArabic(target.title))
    .filter((w) => w.length >= 4)
    .filter((w) => !STOPWORDS.has(w))
  return [...new Set([...(target.keywords || []), ...words])]
}

const STOPWORDS = new Set([
  "في", "من", "على", "إلى", "عن", "مع", "هذا", "هذه", "ذلك", "التي", "الذي",
  "كيف", "ما", "هل", "بين", "عبر", "بعد", "قبل", "كل", "some", "the",
])

/**
 * اقتراح روابط داخلية لنص.
 *
 * @param text نص المقال
 * @param targets كل الصفحات القابلة للربط
 * @param options.currentSlug صفحة المقال نفسه (تُستبعد من الاقتراحات)
 */
export function suggestInternalLinks(
  text: string,
  targets: LinkableTarget[],
  options: { currentSlug?: string; maxSuggestions?: number } = {}
): LinkSuggestion[] {
  const max = options.maxSuggestions ?? 8
  const normalizedText = normalizeArabic(text || "")
  if (!normalizedText) return []

  const suggestions: LinkSuggestion[] = []
  const usedTargets = new Set<string>()

  for (const target of targets) {
    if (options.currentSlug && target.slug === options.currentSlug) continue
    if (usedTargets.has(target.slug)) continue

    const keywords = target.keywords?.length ? target.keywords : keywordsFor({ title: target.title })
    if (keywords.length === 0) continue

    let bestKeyword = ""
    let bestPosition = -1
    let hits = 0

    for (const keyword of keywords) {
      const needle = normalizeArabic(keyword)
      if (needle.length < 4) continue
      const position = normalizedText.indexOf(needle)
      if (position === -1) continue
      hits++
      if (!bestKeyword || keyword.length > bestKeyword.length) {
        bestKeyword = keyword
        bestPosition = position
      }
    }

    if (!bestKeyword || bestPosition === -1) continue

    usedTargets.add(target.slug)

    // الأولوية: طول الكلمة المطابقة (دلالة أعلى) + نوع الصفحة + عدد التطابقات
    const lengthScore = Math.min(bestKeyword.length / 12, 1) * 50
    const kindScore = target.kind === "lexicon" ? 25 : target.kind === "article" ? 20 : 12
    const hitsScore = Math.min(hits, 3) * 8

    suggestions.push({
      target,
      anchor: bestKeyword,
      position: bestPosition,
      confidence: Math.min(100, Math.round(lengthScore + kindScore + hitsScore)),
      reason: `${target.kind}: تطابق «${bestKeyword}» ${hits} مرة`,
    })
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, max)
}

/** تحويل اقتراحات إلى Markdown جاهز للمراجعة البشرية. */
export function toMarkdownLinks(suggestions: LinkSuggestion[]): string {
  return suggestions
    .map((s) => `[${s.anchor}](${s.target.path}) — ${s.reason} (ثقة ${s.confidence}%)`)
    .join("\n")
}

/**
 * تحويل سجلات المعجم إلى أهداف قابلة للربط.
 * @param terms سجلات المعجم
 */
export function lexiconTargets(
  terms: { term_ar: string; slug?: string; id: string | number; category?: string }[]
): LinkableTarget[] {
  return terms.map((term) => ({
    slug: term.slug || String(term.id),
    title: term.term_ar,
    kind: "lexicon" as const,
    keywords: [term.term_ar],
    path: `/lexicon/${term.slug || term.id}`,
  }))
}

/** تحويل المقالات إلى أهداف قابلة للربط. */
export function articleTargets(
  articles: { slug: string; title: string; category?: string }[]
): LinkableTarget[] {
  return articles.map((article) => ({
    slug: article.slug,
    title: article.title,
    kind: "article" as const,
    keywords: [],
    path: `/articles/${article.slug}`,
  }))
}
