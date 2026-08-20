import { Fragment } from "react"
import type { ArticleBlock } from "../../lib/content/parseArticleMarkdown"

// تنسيقات داخل السطر: **عريض** *مائل* `كود` [نص](رابط)
const INLINE_RE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g

function renderInline(text: string) {
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
        <code key={idx} className="rounded bg-muted px-1.5 py-0.5 text-[0.85em] font-mono text-primary">
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
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:no-underline"
        >
          {linkMatch[1]}
        </a>
      )
    }
    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      return (
        <em key={idx} className="italic">
          {part.slice(1, -1)}
        </em>
      )
    }
    return <Fragment key={idx}>{part}</Fragment>
  })
}

interface ArticleContentProps {
  blocks: ArticleBlock[]
}

/**
 * يعرض عناصر المقال المُحلّلة (عناوين فرعية بمعرّفات للتنقل من الفهرس،
 * فقرات، صور بتعليقات، اقتباسات، قوائم) بنفس هوية تصميم الموقع.
 */
export function ArticleContent({ blocks }: ArticleContentProps) {
  return (
    <div className="space-y-5">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "heading": {
            const Tag = block.level === 2 ? "h2" : "h3"
            return (
              <Tag
                key={idx}
                id={block.id}
                className={
                  block.level === 2
                    ? "scroll-mt-24 text-xl md:text-2xl font-extrabold text-foreground pt-4 border-t border-border/60 first:border-t-0 first:pt-0"
                    : "scroll-mt-24 text-lg md:text-xl font-bold text-foreground pt-2"
                }
              >
                {block.text}
              </Tag>
            )
          }
          case "paragraph":
            return (
              <p key={idx} className="leading-loose">
                {renderInline(block.text)}
              </p>
            )
          case "image":
            return (
              <figure key={idx} className="my-6 -mx-1">
                <img
                  src={block.src}
                  alt={block.alt}
                  loading="lazy"
                  className="w-full rounded-xl border border-border object-cover"
                />
                {block.caption && (
                  <figcaption className="mt-2 text-center text-xs text-muted-foreground">
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            )
          case "quote":
            return (
              <blockquote
                key={idx}
                className="border-r-4 border-primary/50 bg-primary/5 rounded-lg py-3 px-4 italic text-foreground/90"
              >
                {renderInline(block.text)}
              </blockquote>
            )
          case "list":
            return block.ordered ? (
              <ol key={idx} className="list-decimal ps-6 space-y-1.5 marker:text-primary marker:font-bold">
                {block.items.map((item, i2) => (
                  <li key={i2}>{renderInline(item)}</li>
                ))}
              </ol>
            ) : (
              <ul key={idx} className="list-disc ps-6 space-y-1.5 marker:text-primary">
                {block.items.map((item, i2) => (
                  <li key={i2}>{renderInline(item)}</li>
                ))}
              </ul>
            )
          case "hr":
            return <hr key={idx} className="border-border my-8" />
          default:
            return null
        }
      })}
    </div>
  )
}