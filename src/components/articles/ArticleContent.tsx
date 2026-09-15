import { Fragment } from "react"
import type { ReactNode } from "react"
import type { ArticleBlock } from "../../lib/content/parseArticleMarkdown"
// InContentAd removed — ads deleted per file map
import { renderTextWithInternalLinks, renderTextWithEnhancedLinks } from "../../lib/utils/autoLinker"

// كل كم فقرة نصية نعرض صندوق إعلان تلقائياً بين فقرات المقال/الخبر
const AD_PARAGRAPH_INTERVAL = 4

// تنسيقات داخل السطر: **عريض** *مائل* `كود` [نص](رابط)
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
        <strong key={idx} className="font-black text-foreground bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={idx} className="rounded-lg bg-muted border border-border px-2 py-1 text-[0.85em] font-mono font-bold text-primary shadow-sm">
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
          className="inline-flex items-center gap-1 rounded-full bg-primary/5 border border-primary/20 px-2.5 py-0.5 text-primary font-bold underline decoration-primary/30 decoration-2 underline-offset-2 hover:bg-primary hover:text-primary-foreground hover:decoration-transparent transition-all"
        >
          {linkMatch[1]}
        </a>
      )
    }
    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      return (
        <em key={idx} className="italic font-medium text-foreground/80 bg-amber-500/5 px-1 rounded">
          {part.slice(1, -1)}
        </em>
      )
    }
    // نص عادي: ربط تلقائي محسن نحو صفحات المعجم (lexicon) —
    // - مرة واحدة لكل مصطلح عبر المقال كامل
    // - حد أقصى 15 رابط لتجنب السبام
    // - المصطلحات الطويلة أولاً
    // - لا نربط داخل روابط/كود موجودة
    if (lexiconTerms && lexiconTerms.length > 0) {
      // استخدم النسخة المحسنة التي تدعم الفرنسية وتطبيع العربية
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
  /**
   * مصطلحات المعجم القانوني (اختياري) — إيلا تعطات، أي ذكر لمصطلح فـ نص
   * المقال كيتربط تلقائياً بصفحة تعريفه فـ /lexicon/. هاد الشيء كيعطي
   * لمحركات البحث روابط داخلية حقيقية نحو صفحات المعجم بدل ما تبقى
   * صفحات "معزولة" ما حد كيشير ليها غير من الخريطة (sitemap).
   */
  lexiconTerms?: LinkableLexiconTerm[]
}

/**
 * يعرض عناصر المقال المُحلّلة (عناوين فرعية بمعرّفات للتنقل من الفهرس،
 * فقرات، صور بتعليقات، اقتباسات، قوائم) بنفس هوية تصميم الموقع.
 */
export function ArticleContent({ blocks, lexiconTerms }: ArticleContentProps) {
  // عدّاد الفقرات النصية (paragraph) فقط — لا نحتسب العناوين/الصور/القوائم
  // ضمن الفاصل الزمني حتى لا يظهر الإعلان مباشرة بعد عنوان أو صورة، بل بعد
  // كتلة نص متتالية فعلية، كما هو متعارف عليه فـ صفحات القراءة الطويلة.
  let paragraphsSinceLastAd = 0
  // كل مصطلح كيتربط مرة واحدة فقط عبر المقال كامل (شوف autoLinker.tsx) —
  // Set مشتركة عبر كل الفقرات/العناصر ديال هاد المقال بالذات.
  const linkedTermIds = new Set<string>()

  return (
    <div className="space-y-5">
      {blocks.map((block, idx) => {
        const isLastBlock = idx === blocks.length - 1
        let adAfterThisBlock: ReactNode = null

        if (block.type === "paragraph") {
          paragraphsSinceLastAd += 1
          if (paragraphsSinceLastAd >= AD_PARAGRAPH_INTERVAL && !isLastBlock) {
            paragraphsSinceLastAd = 0
            adAfterThisBlock = null
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
                    ? "group/heading scroll-mt-28 relative mt-12 mb-6 text-[1.35rem] md:text-[1.6rem] font-black leading-tight text-foreground first:mt-0 flex items-center gap-3"
                    : "scroll-mt-28 mt-8 mb-4 text-[1.1rem] md:text-[1.25rem] font-bold text-foreground/90 flex items-center gap-2.5"
                }
              >
                {block.level === 2 && (
                  <span className="hidden md:grid size-8 place-items-center rounded-xl bg-gradient-to-br from-primary to-violet-600 text-white shadow-[0_4px_12px_hsl(var(--primary)/0.2)] text-[12px] font-black shrink-0">
                    {idx + 1}
                  </span>
                )}
                <span className="relative">
                  {block.text}
                  {block.level === 2 && (
                    <span className="absolute -bottom-1 right-0 h-[2px] w-0 bg-gradient-to-r from-primary to-violet-500 group-hover/heading:w-full transition-all duration-700" />
                  )}
                </span>
              </Tag>
            )
            break
          }
          case "paragraph":
            blockNode = (
              <p className="leading-[1.9] text-[15px] md:text-[16px] text-foreground/85 font-[450] tracking-[-0.01em] first-letter:font-black first-letter:text-[1.1em] selection:bg-primary/20">
                {renderInline(block.text, lexiconTerms, linkedTermIds)}
              </p>
            )
            break
          case "image":
            blockNode = (
              <figure className="group/fig my-10 overflow-hidden rounded-[20px] border border-border/50 bg-muted shadow-[0_8px_32px_hsl(0_0%_0%/0.08)] hover:shadow-[0_16px_48px_hsl(0_0%_0%/0.12)] transition-all duration-500">
                <div className="relative overflow-hidden">
                  <img
                    src={block.src}
                    alt={block.alt}
                    loading="lazy"
                    className="w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/fig:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover/fig:opacity-100 transition-opacity" />
                </div>
                {block.caption && (
                  <figcaption className="flex items-center gap-2 px-5 py-3 text-[11px] font-bold text-muted-foreground bg-card/50 backdrop-blur border-t border-border/50">
                    <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            )
            break
          case "quote":
            blockNode = (
              <blockquote className="group/quote relative my-8 overflow-hidden rounded-[16px] border border-primary/10 bg-gradient-to-br from-primary/[0.06] via-violet-500/[0.03] to-transparent p-5 md:p-6">
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-primary/30 via-violet-500/20 to-transparent" />
                <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-primary to-violet-600" />
                <div className="flex gap-4">
                  <div className="hidden md:grid size-8 place-items-center rounded-full bg-primary/10 text-primary shrink-0 mt-1">“</div>
                  <p className="flex-1 text-[14px] md:text-[15px] leading-7 font-medium italic text-foreground/80">
                    {renderInline(block.text, lexiconTerms, linkedTermIds)}
                  </p>
                </div>
              </blockquote>
            )
            break
          case "list":
            blockNode = block.ordered ? (
              <ol className="my-6 space-y-3 ps-1">
                {block.items.map((item, i2) => (
                  <li key={i2} className="group/li flex gap-3">
                    <span className="grid size-6 place-items-center rounded-full bg-foreground text-background text-[11px] font-black shrink-0 mt-0.5 group-hover/li:bg-primary group-hover/li:scale-110 transition-all">
                      {i2 + 1}
                    </span>
                    <span className="flex-1 text-[14px] leading-7 text-foreground/80 pt-0.5">
                      {renderInline(item, lexiconTerms, linkedTermIds)}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <ul className="my-6 space-y-3 ps-1">
                {block.items.map((item, i2) => (
                  <li key={i2} className="group/li flex gap-3">
                    <span className="mt-2 size-1.5 rounded-full bg-primary group-hover/li:scale-[1.8] group-hover/li:bg-violet-600 transition-all shrink-0" />
                    <span className="flex-1 text-[14px] leading-7 text-foreground/80">
                      {renderInline(item, lexiconTerms, linkedTermIds)}
                    </span>
                  </li>
                ))}
              </ul>
            )
            break
          case "hr":
            blockNode = (
              <div className="my-12 flex items-center gap-3">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                <div className="grid size-8 place-items-center rounded-full border border-border bg-card text-muted-foreground">
                  <span className="text-[10px]">✦</span>
                </div>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
              </div>
            )
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