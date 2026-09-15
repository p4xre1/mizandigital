import { Fragment } from "react"
import type { ReactNode } from "react"
import type { ArticleBlock } from "../../lib/content/parseArticleMarkdown"
import { renderTextWithEnhancedLinks } from "../../lib/utils/autoLinker"

const INLINE_RE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g

export interface LinkableLexiconTerm {
  id: string
  term_ar: string
  term_fr?: string
  slug: string
  category?: string
}

function renderInline(
  text: string,
  lexiconTerms: LinkableLexiconTerm[] | undefined,
  linkedTermIds: Set<string>
) {
  const parts = text.split(INLINE_RE).filter((p) => p !== "")
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={idx} className="rounded bg-muted border border-border px-1.5 py-0.5 text-[0.9em] font-mono">
          {part.slice(1, -1)}
        </code>
      )
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (linkMatch) {
      return (
        <a
          key={idx}
          href={linkMatch[2]}
          title={linkMatch[1]}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 decoration-border hover:decoration-foreground transition-colors font-medium"
        >
          {linkMatch[1]}
        </a>
      )
    }
    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      return (
        <em key={idx} className="italic text-foreground/80">
          {part.slice(1, -1)}
        </em>
      )
    }
    if (lexiconTerms && lexiconTerms.length > 0) {
      return (
        <Fragment key={idx}>
          {renderTextWithEnhancedLinks(part, lexiconTerms as any, linkedTermIds, { maxLinks: 15, includeFrench: false })}
        </Fragment>
      )
    }
    return <Fragment key={idx}>{part}</Fragment>
  })
}

interface ArticleContentProps {
  blocks: ArticleBlock[]
  lexiconTerms?: LinkableLexiconTerm[]
}

export function ArticleContent({ blocks, lexiconTerms }: ArticleContentProps) {
  const linkedTermIds = new Set<string>()

  return (
    <div className="space-y-5">
      {blocks.map((block, idx) => {
        let blockNode: ReactNode

        switch (block.type) {
          case "heading": {
            const Tag = block.level === 2 ? "h2" : "h3"
            blockNode = (
              <Tag
                id={block.id}
                className={
                  block.level === 2
                    ? "scroll-mt-24 mt-10 mb-4 text-[18px] font-bold tracking-[-0.01em] text-foreground border-b border-border pb-3"
                    : "scroll-mt-24 mt-8 mb-3 text-[15px] font-semibold text-foreground"
                }
              >
                {block.text}
              </Tag>
            )
            break
          }
          case "paragraph":
            blockNode = (
              <p className="leading-[1.8] text-[14px] text-foreground/90">
                {renderInline(block.text, lexiconTerms, linkedTermIds)}
              </p>
            )
            break
          case "image":
            blockNode = (
              <figure className="my-8 overflow-hidden rounded-[12px] border border-border">
                <img src={block.src} alt={block.alt} loading="lazy" className="w-full object-cover" />
                {block.caption && (
                  <figcaption className="border-t border-border bg-muted/50 px-4 py-2 text-[11px] text-muted-foreground">
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            )
            break
          case "quote":
            blockNode = (
              <blockquote className="my-6 border-s-2 border-foreground/15 ps-4 py-1">
                <p className="text-[14px] leading-[1.7] text-muted-foreground italic">
                  {renderInline(block.text, lexiconTerms, linkedTermIds)}
                </p>
              </blockquote>
            )
            break
          case "list":
            blockNode = block.ordered ? (
              <ol className="my-5 list-decimal ps-5 space-y-2 marker:text-muted-foreground">
                {block.items.map((item, i2) => (
                  <li key={i2} className="text-[14px] leading-[1.6] text-foreground/80">
                    {renderInline(item, lexiconTerms, linkedTermIds)}
                  </li>
                ))}
              </ol>
            ) : (
              <ul className="my-5 list-disc ps-5 space-y-2 marker:text-muted-foreground">
                {block.items.map((item, i2) => (
                  <li key={i2} className="text-[14px] leading-[1.6] text-foreground/80">
                    {renderInline(item, lexiconTerms, linkedTermIds)}
                  </li>
                ))}
              </ul>
            )
            break
          case "hr":
            blockNode = <hr className="my-8 border-border" />
            break
          default:
            blockNode = null
        }

        return <Fragment key={idx}>{blockNode}</Fragment>
      })}
    </div>
  )
}
