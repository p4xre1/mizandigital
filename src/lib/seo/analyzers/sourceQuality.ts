/**
 * src/lib/seo/analyzers/sourceQuality.ts
 *
 * Source Quality Checker / Official Source Verification / Primary Source
 * Checker / Legal Source Checker.
 *
 * يقيس **جودة الإسناد**: هل المعلومات مسنودة إلى مصادر أولية رسمية، ومتنوعة،
 * وحديثة، وقابلة للتتبّع؟ لا يتحقق من صحة المصدر نفسه — ذلك يحتاج fetch
 * فعلياً وهو خلف المحوّلات.
 */

import { parseArabicDate, toPlainText } from "./legalAccuracy"

export type SourceTier = "primary-official" | "institutional" | "academic" | "media" | "unknown"

export interface ExtractedSource {
  url?: string
  label: string
  tier: SourceTier
  /** هل المصدر أولي (النص التشريعي نفسه) لا ثانوي (مقال عنه)؟ */
  primary: boolean
}

export interface SourceQualityReport {
  sources: ExtractedSource[]
  tierCounts: Record<SourceTier, number>
  hasPrimary: boolean
  citationPresentation: CitationPresentationReport
  /** 0-100 */
  score: number
  issues: string[]
  evidence: string[]
}

export interface NamedSourceLink {
  url: string
  label: string
  tier: SourceTier
}

export interface QuotationEvidence {
  text: string
  attribution: string | null
}

export interface CitationPresentationReport {
  /** الروابط الخارجية الواردة في متن المحتوى أو حقول المصدر الصريحة. */
  outboundLinks: string[]
  /** روابط تحمل اسماً وصفياً للمصدر أو تقود إلى نطاق موثوق معروف. */
  namedLinkedSources: NamedSourceLink[]
  quotations: QuotationEvidence[]
  attributedQuoteCount: number
}

const URL_RE = /https?:\/\/[^\s)"'،]+/g
const MARKDOWN_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g
const GENERIC_LINK_LABEL_RE = /^(?:هنا|المصدر|المصدر الرسمي|الرابط|اضغط هنا|اقرأ المزيد|click here|read more|source)$/i
const NAMED_AUTHORITY_RE = /(?:بوابة عدالة|الجريدة الرسمية|الأمانة العامة للحكومة|وزارة\s+[^،.؛:\n]{2,45}|المحكمة\s+(?:الدستورية|الإدارية|التجارية|الابتدائية|الاستئناف)|محكمة\s+(?:النقض|الاستئناف)|المجلس الأعلى للسلطة القضائية|رئاسة النيابة العامة|مجلس\s+[^،.؛:\n]{2,45}|الوكالة الوطنية للسلامة الطرقية|NARSA|court of cassation|constitutional court)/i
const VAGUE_ATTRIBUTION_RE = /^(?:مصدر مجهول|مصدر مسؤول|بعض المصادر|مصادر مطلعة|الجهة المختصة|السلطة القضائية|المصدر الرسمي|اسم الجهة|اسم المؤلف|جهة مختصة)$|اسم (?:الجهة|المؤلف)|رابط المصدر|اسم المصدر/i
const ATTRIBUTION_CUE_RE = /(?:قال(?:ت)?|ذكر(?:ت)?|صرح(?:ت)?|أفاد(?:ت)?|بحسب|وفق(?:اً)?\s*(?:لـ?|ل)?|نقلاً عن|استناداً إلى|كما جاء في)/g
const INLINE_QUOTE_RE = /«([^»\n]{8,})»|“([^”\n]{8,})”|„([^“\n]{8,})“|"([^"\n]{8,})"/g

function cleanUrl(value: string): string {
  return value.replace(/[.,;،؛:!?؟]+$/g, "")
}

function isOutboundUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase()
    return host !== "mizan.page" && !host.endsWith(".mizan.page")
  } catch {
    return false
  }
}

function cleanAttribution(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/^[\s—–-]+|[\s،؛:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function isNamedAttribution(value: string): boolean {
  const attribution = cleanAttribution(value)
  if (!attribution || VAGUE_ATTRIBUTION_RE.test(attribution)) return false
  if (NAMED_AUTHORITY_RE.test(attribution)) return true

  // الأسماء الشخصية عادة كلمتان فأكثر؛ العبارات العامة مثل «خبير قانوني» أو
  // «المحكمة» وحدها لا تكفي لإسناد اقتباس قابل للتحقق.
  const words = attribution.split(/\s+/).filter(Boolean)
  return words.length >= 2 && !/(?:خبير قانوني|مسؤول مختص|مصدر رسمي|جهة رسمية)$/i.test(attribution)
}

function attributionAround(text: string, start: number, end: number): string | null {
  const before = text.slice(Math.max(0, start - 120), start)
  const after = text.slice(end, Math.min(text.length, end + 120))
  const candidates: string[] = []

  for (const match of before.matchAll(ATTRIBUTION_CUE_RE)) {
    const value = before.slice((match.index || 0) + match[0].length).split(/[،.؛:!?؟\n]/, 1)[0]
    if (value.trim()) candidates.push(value)
  }
  for (const match of after.matchAll(ATTRIBUTION_CUE_RE)) {
    const value = after.slice((match.index || 0) + match[0].length).split(/[،.؛:!?؟\n]/, 1)[0]
    if (value.trim()) candidates.push(value)
  }
  for (const match of before.matchAll(/[—–]\s*([^،.؛:!?؟\n]{2,100})/g)) candidates.push(match[1])
  for (const match of after.matchAll(/[—–]\s*([^،.؛:!?؟\n]{2,100})/g)) candidates.push(match[1])

  return candidates.find(isNamedAttribution)?.trim() || null
}

function extractQuotations(text: string): QuotationEvidence[] {
  const quotations: QuotationEvidence[] = []
  const lines = text.split(/\r?\n/)
  let offset = 0
  let index = 0

  while (index < lines.length) {
    if (!lines[index].trim().startsWith(">")) {
      offset += lines[index].length + 1
      index++
      continue
    }

    const blockStart = offset
    const quoteLines: string[] = []
    while (index < lines.length && lines[index].trim().startsWith(">")) {
      quoteLines.push(lines[index].trim().replace(/^>\s?/, "").trim())
      offset += lines[index].length + 1
      index++
    }

    let attribution: string | null = null
    let attributionIndex = -1
    for (let lineIndex = quoteLines.length - 1; lineIndex >= 0; lineIndex--) {
      const match = quoteLines[lineIndex].match(/^(?:[—–-]\s+|(?:المصدر|القائل)\s*[:：]\s*)(.+)$/)
      if (match) {
        attribution = match[1].trim()
        attributionIndex = lineIndex
        break
      }
    }

    // دعم الإسناد في السطر نفسه أيضاً: > «النص المنقول» — اسم الجهة
    if (!attribution) {
      const lastLine = quoteLines.at(-1) || ""
      const inlineAttribution = lastLine.match(/[»”"]\s*[—–-]\s*(.+)$/)
      if (inlineAttribution) {
        attribution = inlineAttribution[1].trim()
        quoteLines[quoteLines.length - 1] = lastLine.slice(0, inlineAttribution.index).trim()
      }
    }

    const quoteText = quoteLines
      .filter((_, lineIndex) => lineIndex !== attributionIndex)
      .join(" ")
      .trim()
    if (quoteText) {
      quotations.push({
        text: quoteText,
        attribution: attribution && isNamedAttribution(attribution) ? cleanAttribution(attribution) : null,
      })
    }

    // حماية من الدوران في حال وجود سطر Markdown اقتباس فارغ.
    if (offset === blockStart) index++
  }

  // الاقتباس داخل فقرة عادية: «...» أو “...” أو "...". نزيل كتل Markdown
  // والوسوم الوصفية للصور كي لا تُحتسب أمثلة/تعليقات صور كأنها أقوال منقولة.
  const inlineText = lines
    .filter((line) => !line.trim().startsWith(">"))
    .join("\n")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
  for (const match of inlineText.matchAll(INLINE_QUOTE_RE)) {
    const quoteText = match[1] || match[2] || match[3] || match[4] || ""
    const start = match.index || 0
    const attribution = attributionAround(inlineText, start, start + match[0].length)
    quotations.push({ text: quoteText, attribution })
  }

  return quotations
}

/** تحليل الروابط المُسمّاة والاقتباسات المنسوبة؛ لا يتحقق من صدق النقل نفسه. */
export function analyzeCitationPresentation(
  text: string | string[],
  options: { explicitSource?: string; explicitSourceUrl?: string } = {}
): CitationPresentationReport {
  const body = toPlainText(text)
  // الصور ليست مراجع نصية، والروابط المؤهلة إلى نطاق الموقع تبقى روابط داخلية.
  const citationText = body.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
  const outboundLinks = new Set((citationText.match(URL_RE) || []).map(cleanUrl).filter(isOutboundUrl))
  const namedLinkedSources = new Map<string, NamedSourceLink>()

  for (const match of citationText.matchAll(MARKDOWN_LINK_RE)) {
    const label = match[1].trim()
    const url = cleanUrl(match[2])
    if (!isOutboundUrl(url)) continue
    outboundLinks.add(url)
    const tier = classifySource(url)
    if (!GENERIC_LINK_LABEL_RE.test(label) || tier !== "unknown") {
      namedLinkedSources.set(url, { url, label: label || url, tier })
    }
  }

  // الروابط العارية إلى نطاق رسمي/أكاديمي لها اسم مصدر قابل للتعرّف من النطاق.
  for (const url of outboundLinks) {
    const tier = classifySource(url)
    if (tier !== "unknown" && !namedLinkedSources.has(url)) {
      let label = url
      try { label = new URL(url).hostname } catch { /* أبقِ الرابط كما هو */ }
      namedLinkedSources.set(url, { url, label, tier })
    }
  }

  if (options.explicitSourceUrl) {
    const url = cleanUrl(options.explicitSourceUrl)
    if (isOutboundUrl(url)) {
      outboundLinks.add(url)
      const label = options.explicitSource?.trim() || url
      const tier = classifySource(url)
      if (!GENERIC_LINK_LABEL_RE.test(label)) namedLinkedSources.set(url, { url, label, tier })
    }
  }

  const quotations = extractQuotations(body)
  return {
    outboundLinks: [...outboundLinks],
    namedLinkedSources: [...namedLinkedSources.values()],
    quotations,
    attributedQuoteCount: quotations.filter((quote) => Boolean(quote.attribution)).length,
  }
}

const OFFICIAL_DOMAINS = [
  "adala.justice.gov.ma",
  "sgg.gov.ma",
  "justice.gov.ma",
  "enssup.gov.ma",
  "maroc.ma",
  "conseil-constitutionnel.ma",
]

const INSTITUTIONAL_PATTERNS = [/(?:\.gov\.ma|\.gov)$/i, /cour|محكمة|وزارة|الأمانة العامة/i]
const ACADEMIC_PATTERNS = [/(?:\.ac\.ma|\.edu|universit|fsjes|كلية|جامعة)/i]
const MEDIA_PATTERNS = [/(?:hespress|goud|le360|medi1|2m\.ma|mapexpress|menara)/i]

/** تصنيف مصدر حسب نطاقه/تسميته. */
export function classifySource(urlOrLabel: string): SourceTier {
  const value = urlOrLabel || ""
  let host = value
  try {
    host = new URL(value).hostname
  } catch {
    /* ليس رابطاً — نص عادي */
  }

  if (OFFICIAL_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) return "primary-official"
  if (host.endsWith(".gov.ma") || host.endsWith(".gov")) return "primary-official"
  if (INSTITUTIONAL_PATTERNS.some((re) => re.test(value))) return "institutional"
  if (ACADEMIC_PATTERNS.some((re) => re.test(value))) return "academic"
  if (MEDIA_PATTERNS.some((re) => re.test(value))) return "media"
  return "unknown"
}

/**
 * تحليل جودة المصادر في نص.
 *
 * @param text نص المقال/الخبر
 * @param options.publishedAt تاريخ النشر — لمقارنة حداثة المصادر
 */
export function analyzeSourceQuality(
  text: string | string[],
  options: { publishedAt?: string; explicitSource?: string; explicitSourceUrl?: string } = {}
): SourceQualityReport {
  const body = toPlainText(text)
  const issues: string[] = []
  const evidence: string[] = []
  const citationPresentation = analyzeCitationPresentation(body, options)
  const citationBody = body.replace(/!\[[^\]]*\]\([^)]*\)/g, "")

  const sources: ExtractedSource[] = []

  // 1) روابط صريحة (لا نحتسب صوراً أو روابط عائدة إلى الموقع نفسه كمراجع).
  for (const url of citationBody.match(URL_RE) || []) {
    const clean = cleanUrl(url)
    if (!isOutboundUrl(clean)) continue
    const tier = classifySource(clean)
    sources.push({ url: clean, label: clean, tier, primary: tier === "primary-official" })
  }

  // 2) مصدر مذكور في حقول الخبر (source / source_url)
  if (options.explicitSource || options.explicitSourceUrl) {
    const url = options.explicitSourceUrl ? cleanUrl(options.explicitSourceUrl) : undefined
    if (!url || isOutboundUrl(url)) {
      const label = options.explicitSource || url || ""
      const tier = classifySource(url || label)
      sources.push({ url, label, tier, primary: tier === "primary-official" })
    }
  }

  // 3) إسنادات نصية رسمية بلا رابط
  const textualOfficial = citationBody.match(/(بوابة عدالة|الجريدة الرسمية|الأمانة العامة للحكومة|وزارة العدل|المحكمة الدستورية|محكمة النقض)/g) || []
  for (const label of [...new Set(textualOfficial)]) {
    sources.push({ label, tier: "primary-official", primary: true })
  }

  const tierCounts: Record<SourceTier, number> = {
    "primary-official": 0, institutional: 0, academic: 0, media: 0, unknown: 0,
  }
  for (const source of sources) tierCounts[source.tier]++

  const hasPrimary = tierCounts["primary-official"] > 0
  evidence.push(
    `${sources.length} مصدر: ${tierCounts["primary-official"]} رسمي أولي، ${tierCounts.institutional} مؤسساتي، ${tierCounts.academic} أكاديمي، ${tierCounts.media} إعلامي`
  )
  evidence.push(
    `روابط خارجية=${citationPresentation.outboundLinks.length}، مصادر مسمّاة مرتبطة=${citationPresentation.namedLinkedSources.length}، اقتباسات منسوبة=${citationPresentation.attributedQuoteCount}/${citationPresentation.quotations.length}`
  )

  if (sources.length === 0) issues.push("لا يوجد أي مصدر مذكور — كل معلومة قانونية تحتاج إسناداً.")
  if (!hasPrimary) issues.push("لا يوجد مصدر رسمي أولي — النص التشريعي نفسه هو المرجع، لا مقال عنه.")
  if (citationPresentation.outboundLinks.length === 0) {
    issues.push("لا توجد روابط خارجية في متن المحتوى — أدرج رابطاً مباشراً إلى المصدر الذي تستند إليه.")
  } else if (citationPresentation.namedLinkedSources.length === 0) {
    issues.push("الروابط الخارجية غير مرتبطة باسم مصدر واضح — سمِّ الجهة أو النص واربطه بمصدره.")
  }
  if (citationPresentation.quotations.length > citationPresentation.attributedQuoteCount) {
    issues.push("يوجد اقتباس بلا نسبة واضحة إلى جهة أو مؤلف مسمّى — أضف الإسناد، وراجع النص الحرفي للمصدر.")
  }

  // التنوع: مصدر وحيد هشّ
  const uniqueLabels = new Set(sources.map((s) => s.label))
  if (sources.length > 0 && uniqueLabels.size === 1) {
    issues.push("مصدر وحيد فقط — أضف مصدراً ثانياً مستقلاً لتقليل خطر الخطأ.")
  }

  // مصادر مجهولة
  if (tierCounts.unknown > 0) {
    issues.push(`${tierCounts.unknown} مصدر غير مصنَّف (نطاق غير معروف) — تحقق من موثوقيته.`)
  }

  // اعتماد على الإعلام وحده
  if (!hasPrimary && tierCounts.media > 0) {
    issues.push("الاعتماد على مصدر إعلامي وحده غير كافٍ في المحتوى القانوني — رجع إلى النص المنشور بالجريدة الرسمية.")
  }

  // حداثة المصدر إن وُجد تاريخ
  if (options.publishedAt) {
    const published = new Date(options.publishedAt)
    if (!Number.isNaN(published.getTime())) {
      const dates = [...body.matchAll(/(\d{1,2}\s+(?:يناير|فبراير|مارس|أبريل|ماي|يونيو|يوليوز|غشت|شتنبر|أكتوبر|نونبر|دجنبر)\s+20\d{2})/g)]
      const stale = dates.filter((d) => {
        const parsed = parseArabicDate(d[1])
        return parsed ? published.getTime() - parsed.getTime() > 3 * 365 * 86_400_000 : false
      })
      if (stale.length) issues.push(`${stale.length} تاريخ مصدر قديم (> 3 سنوات) — تحقق من بقاء النص نافذاً.`)
    }
  }

  // ── النتيجة ───────────────────────────────────────────────────────────────
  // 40% مصدر رسمي أولي، 22% تنوع، 18% موثوقية، 10% وجود إسناد، 10% طريقة عرضه.
  const primaryScore = hasPrimary ? 100 : 0
  const diversityScore = Math.min(100, uniqueLabels.size * 34)
  const reliabilityScore =
    tierCounts.unknown === 0 && !(tierCounts.media > 0 && !hasPrimary) ? 100 : tierCounts.unknown > 0 ? 40 : 60
  const presenceScore = sources.length > 0 ? 100 : 0
  const namedLinkScore = citationPresentation.namedLinkedSources.length > 0 ? 100 : 0
  // غياب الاقتباس ليس عيباً بذاته في كل مادة؛ لكن وجود اقتباس مجهول النسبة يُخصم.
  const quoteAttributionScore = citationPresentation.quotations.length
    ? Math.round((citationPresentation.attributedQuoteCount / citationPresentation.quotations.length) * 100)
    : 70
  const presentationScore = namedLinkScore * 0.65 + quoteAttributionScore * 0.35

  const score = Math.round(
    primaryScore * 0.4 +
    diversityScore * 0.22 +
    reliabilityScore * 0.18 +
    presenceScore * 0.1 +
    presentationScore * 0.1
  )

  return { sources, tierCounts, hasPrimary, citationPresentation, score, issues, evidence }
}
