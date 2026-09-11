/**
 * src/lib/seo/scoring/index.ts
 *
 * تجميع كل المقاييس الفرعية الثمانية عشر في نتيجة واحدة من 0 إلى 1000.
 *
 * نقطتا الدخول:
 *   scoreContent(...) → تقييم مقال/خبر/مصطلح واحد
 *   scoreSite(...)    → تقييم الموقع ككل (يتطلب إشارات من الفحص التقني)
 */

import { originalityScore } from "../analyzers/duplicate"
import type { AiVisibilitySignals } from "./aiScores"
import { scoreAeo, scoreCitation, scoreGeo, scoreAiVisibility } from "./aiScores"
import {
  scoreAuthority,
  scoreContentDepth,
  scoreCro,
  scoreEeat,
  scoreEntities,
  scoreOnPageSeo,
  scoreReadability,
  scoreSearchIntent,
  scoreSemantic,
  scoreTrust,
  scoreFreshness,
  scoreUx,
  type ContentInput,
  type ScoreParts,
} from "./contentScores"
import { adapterRequired, aggregate, measured, notApplicable } from "./aggregate"
import { SCORE_WEIGHTS, SUB_SCORE_LABELS } from "./weights"
import type { ScoreResult, SubScore, SubScoreKey } from "./types"

export { bandFor, bandLabel, type ScoreResult, type SubScore, type SubScoreKey } from "./types"
export { aggregate } from "./aggregate"
export { SCORE_WEIGHTS, SUB_SCORE_LABELS, totalWeight } from "./weights"
export { RECOMMENDED_SCHEMA_TYPES } from "./aiScores"

/** يغلّف نتيجة مقياس في SubScore كامل مع التسمية والوزن. */
function sub(key: SubScoreKey, parts: ScoreParts): SubScore {
  const labels = SUB_SCORE_LABELS[key]
  return {
    ...measured(key, parts.score, SCORE_WEIGHTS[key], parts.evidence, parts.issues),
    label: labels.label,
    acronym: labels.acronym,
  }
}

function subUnavailable(key: SubScoreKey, reason: string, partial?: number): SubScore {
  const labels = SUB_SCORE_LABELS[key]
  return {
    ...adapterRequired(key, SCORE_WEIGHTS[key], reason, partial),
    label: labels.label,
    acronym: labels.acronym,
  }
}

function subNa(key: SubScoreKey, reason: string): SubScore {
  const labels = SUB_SCORE_LABELS[key]
  return {
    ...notApplicable(key, SCORE_WEIGHTS[key], reason),
    label: labels.label,
    acronym: labels.acronym,
  }
}

export interface ScoreContentOptions {
  /** أعلى تشابه مع مستند آخر (0-1) — من analyzeDuplicate. */
  duplicateSimilarity?: number
  /** أسئلة شائعة مرتبطة بالمحتوى. */
  faqs?: { question: string; answer: string }[]
  /** الرابط القانوني للصفحة. */
  canonicalUrl?: string
  /** إشارات اكتشاف الذكاء الاصطناعي على مستوى الموقع. */
  aiSignals?: AiVisibilitySignals
  /** أنواع البيانات المنظمة المستخدمة في هذه الصفحة. */
  schemaTypes?: string[]
  /** النتيجة التقنية للموقع (0-100) إن حُسبت. */
  technicalScore?: number
  /** أنواع البيانات المنظمة على مستوى الموقع. */
  siteSchemaTypes?: string[]
  /** مفتاح محوّل فحص النماذج اللغوية — بدونه يبقى AI Visibility جزئياً. */
  llmProbeEnabled?: boolean
  now?: Date
}

/**
 * تقييم محتوى واحد.
 *
 * @returns النتيجة الإجمالية 0-1000 مع تفصيل المقاييس والأدلة والإصلاحات
 */
export function scoreContent(input: ContentInput, options: ScoreContentOptions = {}): ScoreResult {
  const now = options.now ?? new Date()
  const resolved: ContentInput = { ...input, now }

  const subScores: SubScore[] = [
    sub("content", scoreContentDepth(resolved)),
    sub("seo", scoreOnPageSeo(resolved)),
    sub("readability", scoreReadability(resolved)),
    sub("entity", scoreEntities(resolved)),
    sub("semantic", scoreSemantic(resolved)),
    sub("intent", scoreSearchIntent(resolved)),
    sub("freshness", scoreFreshness(resolved)),
    sub("eeat", scoreEeat(resolved)),
    sub("trust", scoreTrust(resolved)),
    sub("authority", scoreAuthority(resolved)),
    sub("ux", scoreUx(resolved)),
    sub("cro", scoreCro(resolved)),
    sub(
      "originality",
      options.duplicateSimilarity !== undefined
        ? {
            score: originalityScore(options.duplicateSimilarity),
            evidence: [`أعلى تشابه مع محتوى آخر: ${Math.round(options.duplicateSimilarity * 100)}%`],
            issues:
              options.duplicateSimilarity > 0.25
                ? [`المحتوى يشبه محتوى آخر بنسبة ${Math.round(options.duplicateSimilarity * 100)}% — أعد الصياغة أو ادمج الصفحتين.`]
                : [],
          }
        : {
            score: 0,
            evidence: ["لم تُحسب مقارنة التكرار"],
            issues: ["شغّل تحليل التكرار على المرجع كله للحصول على نتيجة الأصالة."],
          }
    ),
    sub(
      "aeo",
      scoreAeo({
        title: resolved.title,
        body: resolved.body,
        slug: resolved.slug,
        excerpt: resolved.excerpt,
        faqs: options.faqs,
      })
    ),
    sub("geo", scoreGeo({ title: resolved.title, body: resolved.body, slug: resolved.slug, updatedAt: resolved.updatedAt })),
    sub(
      "citation",
      scoreCitation({
        title: resolved.title,
        body: resolved.body,
        slug: resolved.slug,
        updatedAt: resolved.updatedAt,
        canonicalUrl: options.canonicalUrl,
      })
    ),
  ]

  // AI Visibility: الجاهزية تُحسب محلياً، لكن "هل يظهر فعلاً" يحتاج فحص النماذج
  if (options.aiSignals) {
    const visibility = scoreAiVisibility(options.aiSignals, options.schemaTypes)
    if (options.llmProbeEnabled) {
      subScores.push(sub("aiVisibility", visibility))
    } else {
      subScores.push({
        ...subUnavailable(
          "aiVisibility",
          "الظهور الفعلي في إجابات النماذج يتطلب فحصاً حياً (llmProbe). النتيجة المعروضة هي الجاهزية فقط.",
          visibility.score
        ),
        evidence: visibility.evidence,
        issues: [...visibility.issues],
      })
    }
  } else {
    subScores.push(subNa("aiVisibility", "لم تُمرَّر إشارات اكتشاف الذكاء الاصطناعي على مستوى الموقع."))
  }

  // النتيجة التقنية خاصة بالموقع، لا بالمقال الواحد
  subScores.push(
    options.technicalScore !== undefined
      ? {
          ...measured("technical", options.technicalScore, SCORE_WEIGHTS.technical, ["نتيجة الفحص التقني للموقع"], []),
          label: SUB_SCORE_LABELS.technical.label,
          acronym: SUB_SCORE_LABELS.technical.acronym,
        }
      : subUnavailable("technical", "لم يُشغَّل الفحص التقني — نفّذ `pnpm seo:audit` أو افتح لوحة السيو.")
  )

  return aggregate(subScores, now.toISOString())
}

export interface SiteScoreInput {
  /** نتيجة الفحص التقني المجمّعة 0-100. */
  technical: number
  technicalIssues?: string[]
  /** متوسط نتائج المحتوى لكل المقالات. */
  contentAverage: number
  readabilityAverage: number
  eeatAverage: number
  entityAverage: number
  semanticAverage: number
  freshnessAverage: number
  originalityAverage: number
  aeoAverage: number
  geoAverage: number
  citationAverage: number
  intentAverage: number
  trustAverage: number
  authorityAverage: number
  uxAverage: number
  croAverage: number
  seoAverage: number
  aiSignals: AiVisibilitySignals
  /** عدد الصفحات المفهرسة في خريطة الموقع. */
  indexedPages: number
}

/** تقييم الموقع ككل من متوسطات محتواه ونتيجة فحصه التقني. */
export function scoreSite(input: SiteScoreInput, options: { llmProbeEnabled?: boolean } = {}): ScoreResult {
  const averages: [SubScoreKey, number][] = [
    ["content", input.contentAverage],
    ["seo", input.seoAverage],
    ["readability", input.readabilityAverage],
    ["eeat", input.eeatAverage],
    ["entity", input.entityAverage],
    ["semantic", input.semanticAverage],
    ["intent", input.intentAverage],
    ["freshness", input.freshnessAverage],
    ["originality", input.originalityAverage],
    ["aeo", input.aeoAverage],
    ["geo", input.geoAverage],
    ["citation", input.citationAverage],
    ["trust", input.trustAverage],
    ["authority", input.authorityAverage],
    ["ux", input.uxAverage],
    ["cro", input.croAverage],
  ]

  const subScores: SubScore[] = averages.map(([key, value]) =>
    sub(key, { score: value, evidence: [`متوسط ${input.indexedPages} صفحة`], issues: [] })
  )

  subScores.push({
    ...measured("technical", input.technical, SCORE_WEIGHTS.technical, ["نتيجة الفحص التقني"], input.technicalIssues || []),
    label: SUB_SCORE_LABELS.technical.label,
    acronym: SUB_SCORE_LABELS.technical.acronym,
  })

  const visibility = scoreAiVisibility(input.aiSignals, input.aiSignals.schemaTypes)
  subScores.push(
    options.llmProbeEnabled
      ? { ...sub("aiVisibility", visibility) }
      : {
          ...subUnavailable(
            "aiVisibility",
            "قياس الظهور الفعلي في إجابات النماذج يتطلب فحصاً حياً (llmProbe) بمفتاح API.",
            visibility.score
          ),
          evidence: visibility.evidence,
          issues: [...visibility.issues],
        }
  )

  return aggregate(subScores)
}

/** متوسّط آمن لمصفوفة نتائج (يتجاهل القيم غير المُقاسة). */
export function averageOf(values: number[]): number {
  const valid = values.filter((v) => Number.isFinite(v))
  if (valid.length === 0) return 0
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)
}
