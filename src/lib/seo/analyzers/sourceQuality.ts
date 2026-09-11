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
  /** 0-100 */
  score: number
  issues: string[]
  evidence: string[]
}

const URL_RE = /https?:\/\/[^\s)"'،]+/g

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

  const sources: ExtractedSource[] = []

  // 1) روابط صريحة
  for (const url of body.match(URL_RE) || []) {
    const tier = classifySource(url)
    sources.push({ url, label: url, tier, primary: tier === "primary-official" })
  }

  // 2) مصدر مذكور في حقول الخبر (source / source_url)
  if (options.explicitSource || options.explicitSourceUrl) {
    const label = options.explicitSource || options.explicitSourceUrl || ""
    const tier = classifySource(options.explicitSourceUrl || label)
    sources.push({ url: options.explicitSourceUrl, label, tier, primary: tier === "primary-official" })
  }

  // 3) إسنادات نصية رسمية بلا رابط
  const textualOfficial = body.match(/(بوابة عدالة|الجريدة الرسمية|الأمانة العامة للحكومة|وزارة العدل|المحكمة الدستورية|محكمة النقض)/g) || []
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

  if (sources.length === 0) issues.push("لا يوجد أي مصدر مذكور — كل معلومة قانونية تحتاج إسناداً.")
  if (!hasPrimary) issues.push("لا يوجد مصدر رسمي أولي — النص التشريعي نفسه هو المرجع، لا مقال عنه.")

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
  // 45 نقطة: وجود مصدر رسمي أولي
  const primaryScore = hasPrimary ? 100 : 0
  // 25 نقطة: تنوّع المصادر
  const diversityScore = Math.min(100, uniqueLabels.size * 34)
  // 20 نقطة: غياب المصادر المجهولة/الإعلامية الحصرية
  const reliabilityScore =
    tierCounts.unknown === 0 && !(tierCounts.media > 0 && !hasPrimary) ? 100 : tierCounts.unknown > 0 ? 40 : 60
  // 10 نقاط: وجود أي إسناد أصلاً
  const presenceScore = sources.length > 0 ? 100 : 0

  const score = Math.round(
    primaryScore * 0.45 + diversityScore * 0.25 + reliabilityScore * 0.2 + presenceScore * 0.1
  )

  return { sources, tierCounts, hasPrimary, score, issues, evidence }
}
