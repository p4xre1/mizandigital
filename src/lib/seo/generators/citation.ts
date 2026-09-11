/**
 * src/lib/seo/generators/citation.ts
 *
 * Citation Generator + Citation Validator + AI Citation Optimizer.
 *
 * الصدق: هذه الأدوات تُنتج **صيغ استشهاد** من بيانات موجودة، وتتحقق من أن
 * الإحالات في النص قابلة للتتبّع. لا تتحقق من صحة معلومة قانونية — ذلك
 * يحتاج مصدراً رسمياً وبشرياً.
 */

import { tokenize } from "../analyzers/text"

export interface CitationData {
  title: string
  url: string
  siteName?: string
  author?: string
  publishedAt?: string
  accessedAt?: string
}

/**
 * توليد صيغ استشهاد متعددة من بيانات الصفحة.
 * تُستخدم كي يستطيع الآخرون (والنماذج اللغوية) إسناد المعلومة بدقة.
 */
export function generateCitations(data: CitationData): Record<string, string> {
  const site = data.siteName || "ميزان الرقمية"
  const author = data.author?.trim() || "فريق ميزان الرقمية"
  const published = data.publishedAt || ""
  const accessed = data.accessedAt || new Date().toISOString().slice(0, 10)
  const title = (data.title || "").trim()

  return {
    // APA 7
    apa: `${author}. (${published || "بلا تاريخ"}). ${title}. ${site}. ${data.url}`,
    // MLA 9
    mla: `${author}. "${title}." ${site}, ${published || "n.d."}, ${data.url}. Accessed ${accessed}.`,
    // Chicago
    chicago: `${author}. "${title}." ${site}. ${published ? `${published}. ` : ""}${data.url}.`,
    // صيغة مختصرة للاستشهاد داخل النص
    inline: `(${site}، ${published || "بلا تاريخ"})`,
    // BibTeX
    bibtex: `@misc{${slugForBibKey(title)},\n  title = {${title}},\n  author = {${author}},\n  year = {${published ? published.slice(0, 4) : ""}},\n  howpublished = {\\url{${data.url}}},\n  note = {${site}, accessed ${accessed}}\n}`,
  }
}

function slugForBibKey(title: string): string {
  const ascii = (title || "")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20)
  return ascii || `mizan${Date.now().toString(36)}`
}

export interface CitationIssue {
  claim: string
  reason: "no-source" | "unverifiable-source" | "outdated"
  severity: "high" | "medium"
}

export interface CitationValidation {
  claims: number
  supported: number
  issues: CitationIssue[]
  /** 0-100 */
  score: number
}

/** مصادر تُعدّ قابلة للتتبّع. */
const VERIFIABLE_SOURCE_RE =
  /(adala\.justice\.gov\.ma|sgg\.gov\.ma|justice\.gov\.ma|enssup\.gov\.ma|الجريدة الرسمية|\.gov\.ma|https?:\/\/)/i

/** إحالة تشريعية محددة (فصل/مادة/قانون). */
const LEGAL_REF_RE = /(?:الفصل|المادة|القانون|المرسوم|الظهير)\s*(?:رقم\s+)?\d+/g

/**
 * أرقام وادعاءات كمية تحتاج سنداً.
 *
 * ⚠️ العربية تكتب النسبة «45 بالمئة» أو «45 بالمائة» أكثر مما تكتبها «45%»،
 * لذا تُغطى الصيغ الثلاث. إغفال الصيغة المكتوبة كان يجعل الفحص يمر على
 * ادعاءات رقمية بلا سند.
 */
const QUANTITATIVE_CLAIM_RE =
  /\d+\s*(?:%|بالمئة|بالمائة|في المئة|في المائة)|\d+\s*(?:سنة|سنوات|شهراً|أشهر|يوماً|أيام|درهماً|درهم)|20\d{2}/g

/**
 * فحص إحالات النص: هل كل ادعاء كمي أو تشريعي مسنود بمصدر قابل للتتبّع؟
 *
 * لا يحكم على صحة المعلومة، بل على **قابلية تتبّعها** — وهذا ما يرفع
 * احتمال استشهاد النماذج اللغوية بالمحتوى.
 */
export function validateCitations(text: string): CitationValidation {
  const source = text || ""
  const paragraphs = source
    .split(/,|\n+/)
    .map((p) => p.trim())
    .filter((p) => tokenize(p).length >= 6)

  const issues: CitationIssue[] = []
  let claims = 0
  let supported = 0

  for (const paragraph of paragraphs) {
    const legalRefs = paragraph.match(LEGAL_REF_RE) || []
    const quantitative = paragraph.match(QUANTITATIVE_CLAIM_RE) || []
    const claimCount = legalRefs.length + quantitative.length
    if (claimCount === 0) continue

    claims += claimCount
    const hasSource = VERIFIABLE_SOURCE_RE.test(paragraph) || legalRefs.length > 0

    if (hasSource) {
      supported += claimCount
    } else {
      issues.push({
        claim: paragraph.slice(0, 160),
        reason: "no-source",
        severity: quantitative.length ? "high" : "medium",
      })
    }
  }

  const score = claims === 0 ? 70 : Math.round((supported / claims) * 100)
  return { claims, supported, issues, score }
}

/**
 * AI Citation Optimizer: يقترح تحسينات تجعل النص أكثر قابلية للاستشهاد من
 * النماذج اللغوية.
 */
export function optimizeForCitation(text: string, context: { url: string; title: string; updatedAt?: string }): string[] {
  const suggestions: string[] = []
  const validation = validateCitations(text)
  const source = text || ""

  if (!/(?:وفقاً|بحسب|وفق|ينص|نصّت|حسب)/.test(source)) {
    suggestions.push("أضف إسناداً صريحاً قبل المعلومة: «وفقاً للفصل …»، «بحسب الجريدة الرسمية».")
  }

  const legalRefs = source.match(LEGAL_REF_RE) || []
  if (legalRefs.length === 0) {
    suggestions.push("لا توجد إحالة تشريعية محددة — اذكر الفصل/المادة بدل الوصف العام.")
  }

  if (!/https?:\/\//.test(source)) {
    suggestions.push("أضف رابط المصدر الرسمي مباشرة بعد المعلومة — النماذج تفضّل المصدر المرتبط.")
  }

  if (validation.issues.length > 0) {
    suggestions.push(
      `${validation.issues.length} فقرة تحمل أرقاماً أو ادعاءات بلا سند — أضف مصدراً لكل منها.`
    )
  }

  if (!context.updatedAt) {
    suggestions.push("أضف تاريخ تحديث واضحاً — عند تعارض المصادر يرجّح النموذج الأحدث.")
  }

  const sentences = source.split(/[.؟?]/).filter((s) => tokenize(s).length >= 12)
  const shortFacts = sentences.filter((s) => tokenize(s).length <= 35 && /\d/.test(s))
  if (shortFacts.length === 0) {
    suggestions.push("لا توجد جملة قصيرة تحمل رقماً — أضف جملة حقيقة مستقلة قابلة للاقتباس حرفياً.")
  }

  return suggestions
}
