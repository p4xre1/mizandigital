/**
 * src/lib/seo/scoring/mizanScore.ts
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * MIZAN CONTENT SCORE — /1000
 * ─────────────────────────────────────────────────────────────────────────────
 * النظام الرئيسي الموحّد لتقييم كل مقال أو خبر **قبل النشر**.
 *
 *   Legal Accuracy        200
 *   Source Quality        150
 *   SEO                   150
 *   AEO                   100
 *   GEO / AI              100
 *   Semantic / Entity     100
 *   E-E-A-T / Trust        75
 *   Readability            50
 *   Freshness              50
 *   UX / Internal Links    25
 *   ─────────────────────────
 *   المجموع              1000
 *
 * الأوزان مطلقة (نقاط من 1000) لا نِسَب، لأن المطلوب نتيجة /1000 مباشرة.
 * يوجد اختبار يفرض أن المجموع = 1000 بالضبط.
 *
 * ⚠️ حدّ صدق مهم: بُعد «Legal Accuracy» (200 نقطة) يقيس **انضباط الاستشهاد
 * وقابلية التحقق**، لا صحة المعلومة القانونية. التحقق من أن الفصل المذكور
 * يقول فعلاً ما يقوله المقال يتطلب المتن الرسمي للتشريع — انظر
 * analyzers/legalAccuracy.ts. لا يُعرض رقم يوحي بأن المحتوى مُدقَّق قانونياً.
 */

import {
  analyzeLegalAccuracy,
  detectContradictions,
  detectHallucinationRisk,
  toPlainText,
} from "../analyzers/legalAccuracy"
import { analyzeSourceQuality } from "../analyzers/sourceQuality"
import { analyzeBodyStructure, analyzeText, readabilityScore } from "../analyzers/text"
import { entityScore, extractEntities, semanticScore } from "../analyzers/entities"
import { scoreAeo, scoreGeo, type AiVisibilitySignals } from "./aiScores"
import {
  classifyIntent,
  scoreAuthority,
  scoreEeat,
  scoreFreshness,
  scoreOnPageSeo,
  scoreReadability,
  scoreTrust,
  scoreUx,
} from "./contentScores"

/** أبعاد النظام الرئيسي بأوزانها المطلقة (مجموعها 1000). */
export const MIZAN_DIMENSIONS = {
  legalAccuracy: 200,
  sourceQuality: 150,
  seo: 150,
  aeo: 100,
  geoAi: 100,
  semanticEntity: 100,
  eeatTrust: 75,
  readability: 50,
  freshness: 50,
  uxInternalLinks: 25,
} as const

export type MizanDimension = keyof typeof MIZAN_DIMENSIONS

export const MIZAN_DIMENSION_LABELS: Record<MizanDimension, { ar: string; en: string }> = {
  legalAccuracy: { ar: "الدقة القانونية", en: "Legal Accuracy" },
  sourceQuality: { ar: "جودة المصادر", en: "Source Quality" },
  seo: { ar: "السيو", en: "SEO" },
  aeo: { ar: "محركات الإجابة", en: "AEO" },
  geoAi: { ar: "المحركات التوليدية والذكاء الاصطناعي", en: "GEO / AI" },
  semanticEntity: { ar: "الدلالة والكيانات", en: "Semantic / Entity" },
  eeatTrust: { ar: "الخبرة والثقة", en: "E-E-A-T / Trust" },
  readability: { ar: "سهولة القراءة", en: "Readability" },
  freshness: { ar: "الحداثة", en: "Freshness" },
  uxInternalLinks: { ar: "التجربة والروابط الداخلية", en: "UX / Internal Links" },
}

export type MizanBand = "ready" | "needs-review" | "needs-work" | "blocked"

export const MIZAN_BAND_LABELS: Record<MizanBand, string> = {
  ready: "جاهز للنشر",
  "needs-review": "يحتاج مراجعة",
  "needs-work": "يحتاج عملاً",
  blocked: "غير صالح للنشر",
}

export interface MizanDimensionResult {
  key: MizanDimension
  label: string
  labelEn: string
  /** النقاط المحققة من وزن البعد. */
  points: number
  /** الوزن الأقصى. */
  max: number
  /** 0-100 */
  percent: number
  evidence: string[]
  issues: string[]
}

export interface MizanScoreResult {
  /** 0-1000 */
  score: number
  band: MizanBand
  dimensions: MizanDimensionResult[]
  /** أعلى الإصلاحات أثراً (مرتبة بعدد النقاط المُهدرة). */
  topIssues: string[]
  /** تحذيرات تمنع النشر مهما كانت النتيجة. */
  blockers: string[]
  /** هل يجوز النشر؟ */
  publishable: boolean
  generatedAt: string
}

export interface MizanScoreInput {
  title: string
  /** نص المقال — سلسلة أو مصفوفة فقرات (كما في src/data/articles.json). */
  body: string | string[]
  slug: string
  /** وصف الميتا أو الملخص. */
  description?: string
  excerpt?: string
  category?: string
  publishedAt?: string
  updatedAt?: string
  author?: string
  focusKeyword?: string
  readingTime?: string
  /** نوع المحتوى — الأخبار تُقيَّم بمعايير حداثة أشد. */
  kind?: "article" | "news"
  /** مصدر الخبر الصريح (حقل source في جدول news). */
  source?: string
  sourceUrl?: string
  faqs?: { question: string; answer: string }[]
  canonicalUrl?: string
  aiSignals?: AiVisibilitySignals
  now?: Date
}

/** الحد الأدنى للنشر. */
export const PUBLISH_THRESHOLD = 600
/** تحته يُطلب تأكيد صريح. */
export const REVIEW_THRESHOLD = 400

function dimension(
  key: MizanDimension,
  percent: number,
  evidence: string[],
  issues: string[]
): MizanDimensionResult {
  const max = MIZAN_DIMENSIONS[key]
  const clamped = Math.max(0, Math.min(100, Math.round(percent)))
  const labels = MIZAN_DIMENSION_LABELS[key]
  return {
    key,
    label: labels.ar,
    labelEn: labels.en,
    points: Math.round((clamped / 100) * max),
    max,
    percent: clamped,
    evidence,
    issues,
  }
}

function bandFor(score: number): MizanBand {
  if (score >= PUBLISH_THRESHOLD) return "ready"
  if (score >= REVIEW_THRESHOLD) return "needs-work"
  if (score >= 250) return "needs-review"
  return "blocked"
}

/**
 * احتساب MIZAN CONTENT SCORE /1000 لمقال أو خبر.
 *
 * @returns النتيجة مع تفصيل الأبعاد والإصلاحات وموانع النشر
 */
export function computeMizanScore(input: MizanScoreInput): MizanScoreResult {
  const now = input.now ?? new Date()
  const publishedAt = input.publishedAt ?? now.toISOString()
  // تطبيع الشكل عند الباب: أجسام المقالات في بيانات المستودع مصفوفات فقرات،
  // وكل محلل تحته يتوقع سلسلة.
  const body = toPlainText(input.body)

  // ── 1) الدقة القانونية (200) ──────────────────────────────────────────────
  const legal = analyzeLegalAccuracy(body, { publishedAt })
  const contradictions = detectContradictions(body)
  const hallucination = detectHallucinationRisk(body)
  const highRisk = hallucination.filter((h) => h.risk === "high")

  const legalIssues = [...legal.issues]
  if (contradictions.length) legalIssues.push(...contradictions)
  if (highRisk.length) legalIssues.push(`${highRisk.length} فقرة عالية الخطورة (ادعاء محدد بلا أي سند قابل للتتبّع).`)

  // التناقضات الداخلية والادعاءات عالية الخطورة تُخصم من النتيجة مباشرة
  let legalPercent = legal.score - contradictions.length * 15 - highRisk.length * 10
  legalPercent = Math.max(0, Math.min(100, legalPercent))

  const dimensions: MizanDimensionResult[] = [
    dimension(
      "legalAccuracy",
      legalPercent,
      [...legal.evidence, `تناقضات=${contradictions.length}، فقرات عالية الخطورة=${highRisk.length}`],
      legalIssues
    ),
  ]

  // ── 2) جودة المصادر (150) ─────────────────────────────────────────────────
  const sources = analyzeSourceQuality(body, {
    publishedAt,
    explicitSource: input.source,
    explicitSourceUrl: input.sourceUrl,
  })
  dimensions.push(dimension("sourceQuality", sources.score, sources.evidence, sources.issues))

  // ── 3) السيو (150) ────────────────────────────────────────────────────────
  const seo = scoreOnPageSeo({ ...input, body, publishedAt })
  dimensions.push(dimension("seo", seo.score, seo.evidence, seo.issues))

  // ── 4) AEO (100) ──────────────────────────────────────────────────────────
  const aeo = scoreAeo({
    title: input.title,
    body,
    slug: input.slug,
    excerpt: input.excerpt,
    faqs: input.faqs,
  })
  dimensions.push(dimension("aeo", aeo.score, aeo.evidence, aeo.issues))

  // ── 5) GEO / AI (100) ─────────────────────────────────────────────────────
  const geo = scoreGeo({
    title: input.title,
    body,
    slug: input.slug,
    updatedAt: input.updatedAt,
  })
  // إن توفرت إشارات اكتشاف الذكاء الاصطناعي تُدمج بوزن أقل
  let geoPercent = geo.score
  const geoEvidence = [...geo.evidence]
  if (input.aiSignals) {
    const signalsOk =
      (input.aiSignals.hasLlmsTxt && input.aiSignals.llmsTxtIsMarkdown ? 1 : 0) +
      (input.aiSignals.hasAiCatalog ? 1 : 0) +
      (input.aiSignals.hasAgentCard ? 1 : 0) +
      (input.aiSignals.hasMcpEndpoint ? 1 : 0)
    geoPercent = Math.round(geo.score * 0.75 + (signalsOk / 4) * 100 * 0.25)
    geoEvidence.push(`إشارات اكتشاف الذكاء الاصطناعي: ${signalsOk}/4`)
  }
  dimensions.push(dimension("geoAi", geoPercent, geoEvidence, geo.issues))

  // ── 6) الدلالة والكيانات (100) ────────────────────────────────────────────
  const metrics = analyzeText(body, "\n")
  const structure = analyzeBodyStructure(body)
  const entityReport = extractEntities(body, metrics.words)
  const semanticPercent = Math.round(
    entityScore(entityReport, metrics.words) * 0.5 + semanticScore(entityReport, structure, metrics.words) * 0.5
  )
  dimensions.push(
    dimension("semanticEntity", semanticPercent, [
      `${entityReport.uniqueCount} كيان فريد، كثافة ${entityReport.density}%`,
      `${structure.h2Count + structure.h3Count} عنوان فرعي`,
      `نية البحث: ${classifyIntent(input.title)}`,
    ], [
      ...(entityReport.byKind["legal-article"] === 0 ? ["لا إحالة إلى فصل أو مادة محددة."] : []),
      ...(structure.h2Count + structure.h3Count < 4 ? ["بنية عناوين ضعيفة (أقل من 4)."] : []),
    ])
  )

  // ── 7) E-E-A-T / الثقة (75) ───────────────────────────────────────────────
  const eeat = scoreEeat({ ...input, body, publishedAt })
  const trust = scoreTrust({ ...input, body, publishedAt })
  const eeatPercent = Math.round(eeat.score * 0.6 + trust.score * 0.4)
  dimensions.push(
    dimension("eeatTrust", eeatPercent, [...eeat.evidence, ...trust.evidence], [...eeat.issues, ...trust.issues])
  )

  // ── 8) سهولة القراءة (50) ─────────────────────────────────────────────────
  const readability = scoreReadability({ ...input, body, publishedAt })
  dimensions.push(dimension("readability", readability.score, readability.evidence, readability.issues))

  // ── 9) الحداثة (50) ───────────────────────────────────────────────────────
  // الأخبار تفقد قيمتها أسرع من المقالات المرجعية
  const freshnessInput = { ...input, body, publishedAt }
  const freshness = scoreFreshness(freshnessInput)
  let freshnessPercent = freshness.score
  const freshnessIssues = [...freshness.issues]
  if (input.kind === "news") {
    const newsDate = input.publishedAt ? new Date(input.publishedAt) : null
    if (newsDate && !Number.isNaN(newsDate.getTime())) {
      const ageDays = Math.floor((now.getTime() - newsDate.getTime()) / 86_400_000)
      const newsScore = ageDays <= 30 ? 100 : ageDays <= 90 ? 70 : ageDays <= 180 ? 40 : 10
      freshnessPercent = Math.round(freshness.score * 0.5 + newsScore * 0.5)
      if (ageDays > 90) freshnessIssues.push(`الخبر عمره ${ageDays} يوماً — القيمة الإخبارية تتلاشى بسرعة.`)
    }
  }
  dimensions.push(dimension("freshness", freshnessPercent, freshness.evidence, freshnessIssues))

  // ── 10) التجربة والروابط الداخلية (25) ────────────────────────────────────
  const ux = scoreUx({ ...input, body, publishedAt })
  const authority = scoreAuthority({ ...input, body, publishedAt })
  const uxPercent = Math.round(ux.score * 0.6 + authority.score * 0.4)
  dimensions.push(
    dimension("uxInternalLinks", uxPercent, [...ux.evidence, ...authority.evidence], [...ux.issues, ...authority.issues])
  )

  // ── التجميع ───────────────────────────────────────────────────────────────
  const score = dimensions.reduce((sum, d) => sum + d.points, 0)

  // موانع النشر: مشاكل تُبطل المحتوى مهما ارتفعت النتيجة الإجمالية
  const blockers: string[] = []
  if (contradictions.length > 0) blockers.push(`تناقضات داخلية: ${contradictions[0]}`)
  if (legal.counts.article === 0 && input.kind === "news") {
    blockers.push("خبر قانوني بلا أي إحالة إلى نص محدد (قانون رقم / فصل / جريدة رسمية).")
  }
  if (dimensions[0].percent < 30) blockers.push("انضباط الاستشهاد القانوني ضعيف جداً (< 30%).")

  const publishable = score >= PUBLISH_THRESHOLD && blockers.length === 0

  const topIssues = dimensions
    .flatMap((d) => d.issues.map((issue) => ({ issue, impact: d.max - d.points })))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 6)
    .map((entry) => entry.issue)

  return {
    score,
    band: bandFor(score),
    dimensions,
    topIssues,
    blockers,
    publishable,
    generatedAt: now.toISOString(),
  }
}

/** رسالة عربية موجزة لبوابة النشر. */
export function formatMizanGate(result: MizanScoreResult): string {
  const lines = [
    `MIZAN CONTENT SCORE: ${result.score}/1000 — ${MIZAN_BAND_LABELS[result.band]}`,
    "",
    ...result.dimensions.map(
      (d) => `  ${d.label}: ${d.points}/${d.max} (${d.percent}%)`
    ),
  ]
  if (result.blockers.length) {
    lines.push("", "⛔ موانع النشر:", ...result.blockers.map((b) => `  • ${b}`))
  }
  if (result.topIssues.length) {
    lines.push("", "أهم الإصلاحات:", ...result.topIssues.map((i) => `  • ${i}`))
  }
  return lines.join("\n")
}

/** ملخص قابل للتخزين مع السجل (لحفظ النتيجة وقت النشر). */
export function toStorableSummary(result: MizanScoreResult): {
  score: number
  band: MizanBand
  dimensions: Record<string, number>
  blockers: string[]
  scoredAt: string
} {
  const dimensions: Record<string, number> = {}
  for (const d of result.dimensions) dimensions[d.key] = d.points
  return {
    score: result.score,
    band: result.band,
    dimensions,
    blockers: result.blockers,
    scoredAt: result.generatedAt,
  }
}
