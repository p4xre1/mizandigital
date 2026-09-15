/**
 * Server-side Content Optimization
 * Handles SSR optimization, prerender enhancement, and content processing
 */

import type { LinkableTerm } from "./enhancedAutoLinker"
import { processArticleWithTermLinks, buildTermIndex } from "./enhancedAutoLinker"

export interface OptimizedContent {
  id: string
  title: string
  slug: string
  excerpt?: string
  content: string
  optimizedContent: string
  termLinks: { count: number, terms: string[] }
  readingTime: string
  wordCount: number
  seo: {
    description: string
    keywords: string[]
    internalLinks: number
  }
}

export interface ContentStats {
  total: number
  withTermLinks: number
  avgTermLinks: number
  avgWordCount: number
  totalInternalLinks: number
}

// Calculate reading time (Arabic optimized: ~200 wpm)
export function calculateReadingTime(content: string): string {
  const words = content.trim().split(/\s+/).length
  const minutes = Math.ceil(words / 200)
  return `${minutes} دقائق`
}

export function countWords(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length
}

// Generate SEO description from content
export function generateSeoDescription(content: string, maxLength = 160): string {
  const cleaned = content
    .replace(/[#*`>\-\d\.]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
  
  if (cleaned.length <= maxLength) return cleaned
  return cleaned.slice(0, maxLength - 3).trim() + "..."
}

// Extract keywords from content (simple TF approach for Arabic)
export function extractKeywords(content: string, terms: LinkableTerm[], limit = 5): string[] {
  const keywords = new Set<string>()
  
  // Add matched lexicon terms as keywords
  for (const term of terms) {
    if (content.includes(term.term_ar) && keywords.size < limit) {
      keywords.add(term.term_ar)
    }
  }
  
  return Array.from(keywords).slice(0, limit)
}

// Server-side optimize single article/news
export function optimizeContentServerSide(
  raw: { id: string, title: string, slug: string, content: string, excerpt?: string },
  terms: LinkableTerm[]
): OptimizedContent {
  const { content: optimized, stats } = processArticleWithTermLinks(raw.content, terms, {
    maxLinks: 15,
    minTermLength: 4,
    oncePerTerm: true,
  })

  const wordCount = countWords(raw.content)
  const readingTime = calculateReadingTime(raw.content)
  const seoDesc = raw.excerpt || generateSeoDescription(raw.content)
  const keywords = extractKeywords(raw.content, terms)

  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug,
    excerpt: raw.excerpt,
    content: raw.content,
    optimizedContent: optimized,
    termLinks: {
      count: stats.totalLinks,
      terms: stats.uniqueTerms,
    },
    readingTime,
    wordCount,
    seo: {
      description: seoDesc,
      keywords,
      internalLinks: stats.totalLinks,
    }
  }
}

// Batch optimize
export function batchOptimizeContent(
  items: { id: string, title: string, slug: string, content: string, excerpt?: string }[],
  terms: LinkableTerm[]
): { optimized: OptimizedContent[], stats: ContentStats } {
  const optimized = items.map(item => optimizeContentServerSide(item, terms))
  
  const totalLinks = optimized.reduce((s, o) => s + o.termLinks.count, 0)
  const withLinks = optimized.filter(o => o.termLinks.count > 0).length
  const totalWords = optimized.reduce((s, o) => s + o.wordCount, 0)

  return {
    optimized,
    stats: {
      total: items.length,
      withTermLinks: withLinks,
      avgTermLinks: items.length ? totalLinks / items.length : 0,
      avgWordCount: items.length ? totalWords / items.length : 0,
      totalInternalLinks: totalLinks,
    }
  }
}

// For prerender.mjs - generate static HTML with term links
export function generateStaticHtmlWithTermLinks(
  content: string,
  terms: LinkableTerm[]
): string {
  const linkedIds = new Set<string>()
  const { content: optimized } = processArticleWithTermLinks(content, terms, {
    maxLinks: 10,
    minTermLength: 4,
  })

  // Convert markdown to simple HTML for prerender
  return optimized
    .split("\n\n")
    .map(block => {
      const trimmed = block.trim()
      if (!trimmed) return ""
      if (trimmed.startsWith("## ")) return `<h2>${trimmed.slice(3)}</h2>`
      if (trimmed.startsWith("### ")) return `<h3>${trimmed.slice(4)}</h3>`
      if (trimmed.startsWith("> ")) return `<blockquote>${trimmed.slice(2)}</blockquote>`
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const items = block.split("\n").filter(l => l.trim().startsWith("-") || l.trim().startsWith("*"))
        return `<ul>${items.map(i => `<li>${i.replace(/^[-*]\s+/, "")}</li>`).join("")}</ul>`
      }
      return `<p>${trimmed}</p>`
    })
    .join("\n")
}

// Cache for term index (for performance)
let cachedTermIndex: ReturnType<typeof buildTermIndex> | null = null
let cachedTermsHash = ""

export function getCachedTermIndex(terms: LinkableTerm[]) {
  const hash = terms.length + "_" + terms.slice(0, 5).map(t => t.id).join(",")
  if (cachedTermIndex && cachedTermsHash === hash) {
    return cachedTermIndex
  }
  cachedTermIndex = buildTermIndex(terms)
  cachedTermsHash = hash
  return cachedTermIndex
}

// SEO: Generate internal linking report
export function generateLinkingReport(
  articles: { id: string, title: string, slug: string, content: string }[],
  news: { id: string, title: string, slug: string, content: string }[],
  terms: LinkableTerm[]
) {
  const allContent = [...articles, ...news]
  const report = {
    articles: batchOptimizeContent(articles, terms).stats,
    news: batchOptimizeContent(news, terms).stats,
    total: {
      content: allContent.length,
      totalLinks: 0,
      avgLinks: 0,
    },
    termCoverage: {
      linked: 0,
      unlinked: 0,
      total: terms.length,
    },
    recommendations: [] as string[],
  }

  report.total.totalLinks = report.articles.totalInternalLinks + report.news.totalInternalLinks
  report.total.avgLinks = allContent.length ? report.total.totalLinks / allContent.length : 0

  // Term coverage
  const linkedTermIds = new Set<string>()
  for (const item of allContent) {
    const { stats } = processArticleWithTermLinks(item.content, terms, { maxLinks: 20 })
    for (const id of stats.uniqueTerms) linkedTermIds.add(id)
  }

  report.termCoverage.linked = linkedTermIds.size
  report.termCoverage.unlinked = terms.length - linkedTermIds.size

  // Recommendations
  if (report.total.avgLinks < 3) {
    report.recommendations.push("متوسط الروابط الداخلية منخفض — أضف المزيد من المصطلحات القانونية في المقالات")
  }
  if (report.termCoverage.unlinked > 50) {
    report.recommendations.push(`${report.termCoverage.unlinked} مصطلح غير مستخدم في أي مقال — فكر في كتابة مقالات عنها`)
  }
  if (report.articles.withTermLinks / report.articles.total < 0.7) {
    report.recommendations.push("بعض المقالات بلا روابط داخلية — حسّن الربط التلقائي")
  }

  return report
}
