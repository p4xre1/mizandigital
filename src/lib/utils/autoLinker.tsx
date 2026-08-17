import React from "react"
import { Link } from "react-router-dom"

interface LexiconTerm {
  id: string
  term_ar: string
  slug: string
}

export function renderTextWithInternalLinks(
  content: string, 
  terms: LexiconTerm[]
): React.ReactNode[] {
  if (!content) return []
  if (!terms || terms.length === 0) return [content]

  // Sort terms by length descending to match multi-word phrases first (e.g. "قانون الشغل" before "قانون")
  const sortedTerms = [...terms].sort((a, b) => b.term_ar.length - a.term_ar.length)
  
  // Build a safe regex pattern matching any of the legal terms
  const escapedTerms = sortedTerms.map(t => t.term_ar.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'))
  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'g')

  const parts = content.split(regex)

  return parts.map((part, index) => {
    const matchedTerm = sortedTerms.find(t => t.term_ar === part)
    if (matchedTerm) {
      return (
        <Link
          key={`${matchedTerm.id}-${index}`}
          to={`/lexicon/${matchedTerm.slug}`}
          className="text-primary font-semibold underline decoration-primary/30 hover:decoration-primary transition-colors"
          title={`تعريف مصطلح: ${matchedTerm.term_ar}`}
        >
          {part}
        </Link>
      )
    }
    return part
  })
}