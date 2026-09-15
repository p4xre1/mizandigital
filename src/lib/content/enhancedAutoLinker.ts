/**
 * Enhanced AutoLinker - Server + Client compatible
 * Converts lexicon terms into internal links for articles and news
 * Optimized for 250+ terms, handles Arabic diacritics, multi-word, French
 */

export interface LinkableTerm {
  id: string
  term_ar: string
  term_fr?: string
  slug: string
  category?: string
}

interface LinkerOptions {
  maxLinks?: number // max links per article (default 12 to avoid spam)
  minTermLength?: number // default 3
  oncePerTerm?: boolean // link each term only once per article (default true)
  includeFrench?: boolean // also link French terms (default true)
  className?: string
}

const DEFAULT_OPTIONS: Required<LinkerOptions> = {
  maxLinks: 12,
  minTermLength: 3,
  oncePerTerm: true,
  includeFrench: true,
  className: "mizan-term-link",
}

// Normalize Arabic text - remove tashkeel, normalize alef, etc for matching
export function normalizeArabic(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "") // tashkeel
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim()
}

// Escape regex
function escapeRegex(s: string): string {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")
}

// Build optimized lookup
export function buildTermIndex(terms: LinkableTerm[]): { 
  arMap: Map<string, LinkableTerm>, 
  frMap: Map<string, LinkableTerm>,
  sortedAr: LinkableTerm[],
  sortedFr: LinkableTerm[]
} {
  const arMap = new Map<string, LinkableTerm>()
  const frMap = new Map<string, LinkableTerm>()

  const filtered = terms.filter(t => t.term_ar && t.term_ar.length >= 2)

  for (const term of filtered) {
    const normAr = normalizeArabic(term.term_ar).toLowerCase()
    if (normAr.length >= 2) {
      if (!arMap.has(normAr) || term.term_ar.length > (arMap.get(normAr)?.term_ar.length || 0)) {
        arMap.set(normAr, term)
      }
    }
    if (term.term_fr && term.term_fr.length >= 2) {
      const normFr = term.term_fr.toLowerCase().trim()
      if (!frMap.has(normFr)) frMap.set(normFr, term)
    }
  }

  // Sort by length descending for longest-match-first
  const sortedAr = [...arMap.values()].sort((a, b) => b.term_ar.length - a.term_ar.length)
  const sortedFr = [...frMap.values()].sort((a, b) => (b.term_fr?.length || 0) - (a.term_fr?.length || 0))

  return { arMap, frMap, sortedAr, sortedFr }
}

// Client-side: React nodes (existing behavior enhanced)
export function linkTermsInText(
  text: string,
  terms: LinkableTerm[],
  linkedIds: Set<string>,
  options: LinkerOptions = {}
): { html: string, count: number, linked: string[] } {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  if (!text || terms.length === 0) return { html: text, count: 0, linked: [] }

  const { sortedAr, sortedFr } = buildTermIndex(terms)
  const allTerms = opts.includeFrench ? [...sortedAr, ...sortedFr] : sortedAr
  
  // Filter out already linked if oncePerTerm
  const available = opts.oncePerTerm 
    ? allTerms.filter(t => !linkedIds.has(t.id))
    : allTerms

  if (available.length === 0) return { html: text, count: 0, linked: [] }

  // Build regex for all terms - longest first
  const patterns = available
    .filter(t => t.term_ar.length >= opts.minTermLength)
    .slice(0, 50) // limit to top 50 longest to avoid huge regex
    .map(t => escapeRegex(t.term_ar))

  if (opts.includeFrench) {
    const frPatterns = available
      .filter(t => t.term_fr && t.term_fr.length >= opts.minTermLength)
      .slice(0, 20)
      .map(t => escapeRegex(t.term_fr!))
    patterns.push(...frPatterns)
  }

  if (patterns.length === 0) return { html: text, count: 0, linked: [] }

  // Word boundary aware for Arabic - use lookarounds for Arabic
  const regex = new RegExp(`(${patterns.join("|")})`, "g")

  let linkCount = 0
  const linkedTerms: string[] = []
  const termLookup = new Map<string, LinkableTerm>()
  for (const t of available) {
    termLookup.set(t.term_ar, t)
    if (t.term_fr) termLookup.set(t.term_fr, t)
  }

  const result = text.replace(regex, (match) => {
    if (linkCount >= opts.maxLinks) return match
    const term = termLookup.get(match)
    if (!term) return match
    if (opts.oncePerTerm && linkedIds.has(term.id)) return match

    linkedIds.add(term.id)
    linkCount++
    linkedTerms.push(term.id)

    // Return placeholder that will be replaced with <a> in React or <a> in HTML
    return `__MIZAN_TERM_${term.id}__${match}__MIZAN_TERM_END__`
  })

  return { html: result, count: linkCount, linked: linkedTerms }
}

// Server-side: Generate HTML with <a> tags for prerendering
export function linkTermsToHtml(
  text: string,
  terms: LinkableTerm[],
  linkedIds: Set<string>,
  options: LinkerOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const { html } = linkTermsInText(text, terms, linkedIds, opts)

  // Replace placeholders with actual <a> tags
  return html.replace(/__MIZAN_TERM_(.*?)__(.*?)__MIZAN_TERM_END__/g, (_, termId, termText) => {
    const term = terms.find(t => t.id === termId)
    if (!term) return termText
    return `<a href="/lexicon/${term.slug}" class="${opts.className} text-primary font-semibold underline decoration-primary/30 hover:decoration-primary transition-colors" title="تعريف مصطلح: ${term.term_ar}">${termText}</a>`
  })
}

// Process full markdown content server-side with term linking
export function processArticleWithTermLinks(
  markdown: string,
  terms: LinkableTerm[],
  options: LinkerOptions = {}
): { content: string, stats: { totalLinks: number, uniqueTerms: string[] } } {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const linkedIds = new Set<string>()
  let totalLinks = 0
  const allLinked: string[] = []

  // Split by markdown blocks to avoid linking inside code, headings, etc
  const lines = markdown.split("\n")
  const processedLines = lines.map(line => {
    const trimmed = line.trim()
    
    // Don't link inside these markdown constructs
    if (
      !trimmed ||
      trimmed.startsWith("#") ||
      trimmed.startsWith("![") ||
      trimmed.startsWith(">") ||
      trimmed.startsWith("- ") ||
      trimmed.startsWith("* ") ||
      /^\d+\./.test(trimmed) ||
      trimmed.startsWith("---") ||
      trimmed.startsWith("```")
    ) {
      return line
    }

    // For paragraph lines, apply linking
    if (totalLinks >= opts.maxLinks) return line

    const result = linkTermsToHtml(line, terms, linkedIds, {
      ...opts,
      maxLinks: opts.maxLinks - totalLinks,
    })
    
    if (result !== line) {
      const matches = result.match(/class="mizan-term-link/g) || []
      totalLinks += matches.length
    }

    return result
  })

  return {
    content: processedLines.join("\n"),
    stats: {
      totalLinks,
      uniqueTerms: Array.from(linkedIds),
    }
  }
}

// Get term suggestions for an article (for admin dashboard)
export function suggestTermsForContent(
  content: string,
  terms: LinkableTerm[],
  limit = 10
): { term: LinkableTerm, count: number }[] {
  if (!content) return []
  
  const normalizedContent = normalizeArabic(content).toLowerCase()
  const suggestions: { term: LinkableTerm, count: number }[] = []

  for (const term of terms) {
    const normTerm = normalizeArabic(term.term_ar).toLowerCase()
    if (normTerm.length < 3) continue
    
    const regex = new RegExp(escapeRegex(normTerm), "g")
    const matches = normalizedContent.match(regex)
    const count = matches ? matches.length : 0
    
    if (count > 0) {
      suggestions.push({ term, count })
    }
  }

  return suggestions
    .sort((a, b) => b.count - a.count || b.term.term_ar.length - a.term.term_ar.length)
    .slice(0, limit)
}

// For admin: analyze content for internal linking opportunities
export function analyzeContentLinking(
  articles: { id: string, title: string, content: string, slug: string }[],
  terms: LinkableTerm[]
): {
  totalArticles: number
  articlesWithLinks: number
  avgLinksPerArticle: number
  topLinkedTerms: { term: LinkableTerm, articleCount: number, totalMentions: number }[]
  articlesNeedingLinks: { id: string, title: string, slug: string, suggestions: number }[]
} {
  let totalLinks = 0
  let withLinks = 0
  const termStats = new Map<string, { term: LinkableTerm, articleCount: number, totalMentions: number }>()
  const needingLinks: { id: string, title: string, slug: string, suggestions: number }[] = []

  for (const article of articles) {
    const suggestions = suggestTermsForContent(article.content, terms, 20)
    const count = suggestions.reduce((s, sug) => s + sug.count, 0)
    
    if (count > 0) withLinks++
    totalLinks += suggestions.length

    for (const sug of suggestions) {
      const existing = termStats.get(sug.term.id)
      if (existing) {
        existing.articleCount++
        existing.totalMentions += sug.count
      } else {
        termStats.set(sug.term.id, {
          term: sug.term,
          articleCount: 1,
          totalMentions: sug.count,
        })
      }
    }

    if (suggestions.length < 3) {
      needingLinks.push({
        id: article.id,
        title: article.title,
        slug: article.slug,
        suggestions: suggestions.length,
      })
    }
  }

  const topLinked = Array.from(termStats.values())
    .sort((a, b) => b.articleCount - a.articleCount || b.totalMentions - a.totalMentions)
    .slice(0, 15)

  return {
    totalArticles: articles.length,
    articlesWithLinks: withLinks,
    avgLinksPerArticle: articles.length ? totalLinks / articles.length : 0,
    topLinkedTerms: topLinked,
    articlesNeedingLinks: needingLinks.slice(0, 10),
  }
}
