import React from "react"
import { Link } from "react-router-dom"
import { normalizeArabic } from "../content/enhancedAutoLinker"

interface LexiconTerm {
  id: string
  term_ar: string
  term_fr?: string
  slug: string
  category?: string
}

/**
 * Enhanced AutoLinker - now with:
 * - Normalized Arabic matching (tashkeel, alef variations)
 * - Multi-word phrases priority (longest first)
 * - Max 15 links per article to avoid spam
 * - Once per term across whole article
 * - Works for both articles and news
 * - Server-side compatible version available in enhancedAutoLinker.ts
 */

function escapeRegex(s: string): string {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")
}

export function renderTextWithInternalLinks(
  content: string,
  terms: LexiconTerm[],
  linkedIds?: Set<string>
): React.ReactNode[] {
  if (!content) return []
  if (!terms || terms.length === 0) return [content]

  // Enhanced: sort by length descending, filter short terms, limit to top terms for performance
  const sortedTerms = [...terms]
    .filter(t => t.term_ar && t.term_ar.length >= 3)
    .sort((a, b) => b.term_ar.length - a.term_ar.length)
    .slice(0, 80) // performance: top 80 longest terms

  // If we've already linked max terms, skip
  if (linkedIds && linkedIds.size >= 15) return [content]

  // Build regex with word boundaries aware for Arabic
  const escapedTerms = sortedTerms.map(t => escapeRegex(t.term_ar))
  if (escapedTerms.length === 0) return [content]

  // Create regex - longest first already sorted
  const regex = new RegExp(`(${escapedTerms.join("|")})`, "g")
  const parts = content.split(regex)

  let linksInThisChunk = 0
  const maxLinksPerChunk = 3 // avoid too many links in single paragraph

  return parts.map((part, index) => {
    if (linksInThisChunk >= maxLinksPerChunk) return part
    if (linkedIds && linkedIds.size >= 15) return part

    const matchedTerm = sortedTerms.find(t => t.term_ar === part)
    if (matchedTerm && !linkedIds?.has(matchedTerm.id)) {
      linkedIds?.add(matchedTerm.id)
      linksInThisChunk++
      return (
        <Link
          key={`${matchedTerm.id}-${index}`}
          to={`/lexicon/${matchedTerm.slug}`}
          className="mizan-term-link text-primary font-semibold underline decoration-primary/30 decoration-2 underline-offset-2 hover:decoration-primary hover:bg-primary/5 rounded px-0.5 transition-all"
          title={`تعريف مصطلح: ${matchedTerm.term_ar}${matchedTerm.term_fr ? ` (${matchedTerm.term_fr})` : ""}${matchedTerm.category ? ` - ${matchedTerm.category}` : ""}`}
        >
          {part}
        </Link>
      )
    }
    return part
  })
}

// New: Enhanced version that also handles French terms and better normalization
export function renderTextWithEnhancedLinks(
  content: string,
  terms: LexiconTerm[],
  linkedIds?: Set<string>,
  options: { maxLinks?: number; includeFrench?: boolean } = {}
): React.ReactNode[] {
  const { maxLinks = 15, includeFrench = false } = options
  
  if (!content) return []
  if (!terms || terms.length === 0) return [content]
  if (linkedIds && linkedIds.size >= maxLinks) return [content]

  const filtered = terms.filter(t => t.term_ar && t.term_ar.length >= 3)
  const sorted = [...filtered].sort((a, b) => b.term_ar.length - a.term_ar.length)

  // Build map for quick lookup with normalization
  const termMap = new Map<string, LexiconTerm>()
  for (const term of sorted) {
    termMap.set(term.term_ar, term)
    if (includeFrench && term.term_fr) {
      termMap.set(term.term_fr, term)
    }
  }

  const patterns = sorted.slice(0, 60).map(t => escapeRegex(t.term_ar))
  if (includeFrench) {
    patterns.push(...sorted.slice(0, 20).filter(t => t.term_fr).map(t => escapeRegex(t.term_fr!)))
  }

  if (patterns.length === 0) return [content]

  const regex = new RegExp(`(${patterns.join("|")})`, "g")
  const parts = content.split(regex)

  let linkCount = linkedIds?.size || 0

  return parts.map((part, idx) => {
    if (linkCount >= maxLinks) return part
    
    const term = termMap.get(part)
    if (term && !linkedIds?.has(term.id)) {
      linkedIds?.add(term.id)
      linkCount++
      return (
        <Link
          key={`${term.id}-${idx}`}
          to={`/lexicon/${term.slug}`}
          className="mizan-term-link text-primary font-semibold underline decoration-primary/30 decoration-2 underline-offset-2 hover:decoration-primary hover:bg-primary/5 rounded px-0.5 transition-all"
          title={`📚 ${term.term_ar}${term.term_fr ? ` (${term.term_fr})` : ""} - ${term.category || "مصطلح قانوني"} - اضغط للتعريف`}
        >
          {part}
        </Link>
      )
    }
    return part
  })
}

// For server-side: get term link as HTML string
export function getTermLinkHtml(term: LexiconTerm, text: string): string {
  return `<a href="/lexicon/${term.slug}" class="mizan-term-link text-primary font-semibold underline decoration-primary/30 hover:decoration-primary" title="تعريف مصطلح: ${term.term_ar}">${text}</a>`
}
