import { Fragment } from "react"
import type { ReactNode } from "react"
import type { ArticleBlock } from "../../lib/content/parseArticleMarkdown"
import { InContentAd } from "../ads/InContentAd"

// كل كم فقرة نصية نعرض صندوق إعلان تلقائياً بين فقرات المقال/الخبر
const AD_PARAGRAPH_INTERVAL = 4

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
          title={linkMatch[1]}
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
  // عدّاد الفقرات النصية (paragraph) فقط — لا نحتسب العناوين/الصور/القوائم
  // ضمن الفاصل الزمني حتى لا يظهر الإعلان مباشرة بعد عنوان أو صورة، بل بعد
  // كتلة نص متتالية فعلية، كما هو متعارف عليه فـ صفحات القراءة الطويلة.
  let paragraphsSinceLastAd = 0

  return (
    <div className="space-y-5">
      {blocks.map((block, idx) => {
        const isLastBlock = idx === blocks.length - 1
        let adAfterThisBlock: ReactNode = null

        if (block.type === "paragraph") {
          paragraphsSinceLastAd += 1
          if (paragraphsSinceLastAd >= AD_PARAGRAPH_INTERVAL && !isLastBlock) {
            paragraphsSinceLastAd = 0
            adAfterThisBlock = <InContentAd key={`ad-${idx}`} className="my-6" />
          }
        }

        let blockNode: ReactNode

        switch (block.type) {
          case "heading": {
            const Tag = block.level === 2 ? "h2" : "h3"
            blockNode = (
              <Tag
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
            break
          }
          case "paragraph":
            blockNode = <p className="leading-loose">{renderInline(block.text)}</p>
            break
          case "image":
            blockNode = (
              <figure className="my-6 -mx-1">
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
            break
          case "quote":
            blockNode = (
              <blockquote className="border-r-4 border-primary/50 bg-primary/5 rounded-lg py-3 px-4 italic text-foreground/90">
                {renderInline(block.text)}
              </blockquote>
            )
            break
          case "list":
            blockNode = block.ordered ? (
              <ol className="list-decimal ps-6 space-y-1.5 marker:text-primary marker:font-bold">
                {block.items.map((item, i2) => (
                  <li key={i2}>{renderInline(item)}</li>
                ))}
              </ol>
            ) : (
              <ul className="list-disc ps-6 space-y-1.5 marker:text-primary">
                {block.items.map((item, i2) => (
                  <li key={i2}>{renderInline(item)}</li>
                ))}
              </ul>
            )
            break
          case "hr":
            blockNode = <hr className="border-border my-8" />
            break
          default:
            blockNode = null
        }

        return (
          <Fragment key={idx}>
            {blockNode}
            {adAfterThisBlock}
          </Fragment>
        )
      })}
    </div>
  )
}