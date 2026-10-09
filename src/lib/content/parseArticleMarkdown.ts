import { generateSlug } from "../utils/generateSlug"

export type ArticleHeadingLevel = 2 | 3 | 4 | 5 | 6

export type ArticleBlock =
  | { type: "heading"; level: ArticleHeadingLevel; id: string; text: string }
  | { type: "paragraph"; text: string }
  | { type: "image"; src: string; alt: string; caption?: string }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "hr" }

export interface ArticleTocEntry {
  id: string
  title: string
  level: ArticleHeadingLevel
}

export interface ParsedArticle {
  blocks: ArticleBlock[]
  toc: ArticleTocEntry[]
}

const IMAGE_RE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/
const HEADING_RE = /^(#{1,6})\s+(.*)$/
const UL_RE = /^[*-]\s+(.*)$/
const OL_RE = /^\d+\.\s+(.*)$/
const HR_RE = /^-{3,}\s*$/

/**
 * محرر ميزان الرقمية يستعمل أسلوب Markdown مبسّط داخل حقل المحتوى:
 * ## عنوان فرعي (يظهر في فهرس المحتويات)
 * ### عنوان جزئي
 * ![وصف الصورة](رابط الصورة "تعليق اختياري")
 * > اقتباس
 * - عنصر قائمة   أو   1. عنصر قائمة مرقّمة
 * ---  (فاصل أفقي)
 * **عريض** *مائل* `كود` [نص](رابط)
 *
 * هذه الدالة تحوّل النص الخام إلى بنية عناصر منظمة (Blocks)، وتبني منها
 * فهرس محتويات حقيقي مبني على العناوين الفعلية داخل المقال، بدل تخمين
 * أول كلمات كل فقرة كما كان يحدث سابقا.
 */
export function parseArticleMarkdown(raw: string): ParsedArticle {
  const blocks: ArticleBlock[] = []
  const toc: ArticleTocEntry[] = []
  const usedIds = new Set<string>()

  if (!raw) return { blocks, toc }

  const lines = raw.replace(/\r\n/g, "\n").split("\n")
  let i = 0
  let paragraphBuffer: string[] = []
  let listBuffer: { ordered: boolean; items: string[] } | null = null
  let quoteBuffer: string[] | null = null

  const flushParagraph = () => {
    if (paragraphBuffer.length) {
      blocks.push({ type: "paragraph", text: paragraphBuffer.join(" ").trim() })
      paragraphBuffer = []
    }
  }
  const flushList = () => {
    if (listBuffer) {
      blocks.push({ type: "list", ordered: listBuffer.ordered, items: listBuffer.items })
      listBuffer = null
    }
  }
  const flushQuote = () => {
    if (!quoteBuffer?.length) return
    const quoteLines = [...quoteBuffer]
    let attribution: string | undefined
    let attributionIndex = -1

    for (let lineIndex = quoteLines.length - 1; lineIndex >= 0; lineIndex--) {
      const match = quoteLines[lineIndex].match(/^(?:[—–-]\s+|(?:المصدر|القائل)\s*[:：]\s*)(.+)$/)
      if (match) {
        attribution = match[1].trim()
        attributionIndex = lineIndex
        break
      }
    }

    if (!attribution) {
      const lastIndex = quoteLines.length - 1
      const lastLine = quoteLines[lastIndex] || ""
      const inlineMatch = lastLine.match(/[»”"]\s*[—–-]\s*(.+)$/)
      if (inlineMatch) {
        attribution = inlineMatch[1].trim()
        quoteLines[lastIndex] = lastLine.slice(0, inlineMatch.index).trim()
      }
    }

    const text = quoteLines.filter((_, lineIndex) => lineIndex !== attributionIndex).join(" ").trim()
    if (text) blocks.push({ type: "quote", text, attribution })
    quoteBuffer = null
  }
  const uniqueId = (text: string) => {
    const base = generateSlug(text) || `section-${blocks.length + 1}`
    let id = base
    let n = 2
    while (usedIds.has(id)) {
      id = `${base}-${n}`
      n += 1
    }
    usedIds.add(id)
    return id
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      flushParagraph()
      flushList()
      flushQuote()
      i += 1
      continue
    }

    if (trimmed.startsWith(">")) {
      flushParagraph()
      flushList()
      quoteBuffer ??= []
      quoteBuffer.push(trimmed.replace(/^>\s?/, "").trim())
      i += 1
      continue
    }

    flushQuote()
    const headingMatch = trimmed.match(HEADING_RE)
    const imageMatch = trimmed.match(IMAGE_RE)

    if (headingMatch) {
      flushParagraph()
      flushList()
      const hashes = headingMatch[1]
      const text = headingMatch[2].trim()
      // مستوى H1 نادر داخل المحتوى (العنوان الرئيسي منفصل)، فنعامله كـ H2.
      // بقية المستويات تُحفظ كما هي حتى تُعرض دلالياً وتظهر قفزاتها في التدقيق.
      const level = Math.max(2, hashes.length) as ArticleHeadingLevel
      const id = uniqueId(text)
      blocks.push({ type: "heading", level, id, text })
      toc.push({ id, title: text, level })
    } else if (imageMatch) {
      flushParagraph()
      flushList()
      const [, alt, src, caption] = imageMatch
      blocks.push({ type: "image", src, alt: alt || "", caption: caption || undefined })
    } else if (HR_RE.test(trimmed)) {
      flushParagraph()
      flushList()
      blocks.push({ type: "hr" })
    } else if (UL_RE.test(trimmed)) {
      flushParagraph()
      const item = trimmed.match(UL_RE)![1]
      if (!listBuffer || listBuffer.ordered) {
        flushList()
        listBuffer = { ordered: false, items: [] }
      }
      listBuffer.items.push(item)
    } else if (OL_RE.test(trimmed)) {
      flushParagraph()
      const item = trimmed.match(OL_RE)![1]
      if (!listBuffer || !listBuffer.ordered) {
        flushList()
        listBuffer = { ordered: true, items: [] }
      }
      listBuffer.items.push(item)
    } else {
      flushList()
      paragraphBuffer.push(trimmed)
    }

    i += 1
  }

  flushParagraph()
  flushList()
  flushQuote()

  return { blocks, toc }
}
