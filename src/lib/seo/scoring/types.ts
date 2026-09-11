/**
 * src/lib/seo/scoring/types.ts
 *
 * نموذج النتيجة الموحّد لكل المقاييس الفرعية الثمانية عشر، والنتيجة
 * الإجمالية من 0 إلى 1000.
 */

export type SubScoreKey =
  | "technical"
  | "content"
  | "seo"
  | "eeat"
  | "readability"
  | "aeo"
  | "geo"
  | "aiVisibility"
  | "citation"
  | "entity"
  | "semantic"
  | "intent"
  | "freshness"
  | "originality"
  | "trust"
  | "authority"
  | "ux"
  | "cro"

/**
 * حالة القياس — مهم للصدق:
 *   measured          → حُسب فعلاً من بياناتك
 *   adapter-required  → يحتاج مفتاح API/مصدر خارجي (معطّل حتى توفّره)
 *   not-applicable    → لا ينطبق على هذا النوع من المحتوى
 */
export type MeasurementStatus = "measured" | "adapter-required" | "not-applicable"

export interface SubScore {
  key: SubScoreKey
  /** التسمية العربية للعرض. */
  label: string
  /** الاختصار الإنجليزي كما ورد في المتطلبات. */
  acronym: string
  /** 0-100 */
  score: number
  /** الوزن في النتيجة الإجمالية (مجموع الأوزان = 1). */
  weight: number
  status: MeasurementStatus
  /** ما الذي بُنيت عليه النتيجة. */
  evidence: string[]
  /** ما الذي يجب إصلاحه، مرتّباً حسب الأثر. */
  issues: string[]
  /** نقاط مُهدرة بسبب مقياس يحتاج مصدراً خارجياً. */
  unavailableWeight?: number
}

export type ScoreBand = "excellent" | "good" | "needs-work" | "poor"

export interface ScoreResult {
  /** 0-1000 */
  overall: number
  /** 0-100 — نفس النتيجة الإجمالية لكن على مئة، للمقارنة السريعة. */
  overallPercent: number
  band: ScoreBand
  subScores: SubScore[]
  /** مجموع أوزان المقاييس التي لم تُحسب (لأنها تحتاج مصدراً خارجياً). */
  unmeasurableWeight: number
  /** أعلى 5 إصلاحات أثراً. */
  topIssues: string[]
  generatedAt: string
}

/** ماذا يُقيَّم: مقال/خبر واحد، أو الموقع ككل. */
export type ScoreTarget =
  | { kind: "content"; slug: string; title: string; body: string; meta: ContentMeta }
  | { kind: "site" }

export interface ContentMeta {
  description?: string
  excerpt?: string
  category?: string
  publishedAt?: string
  updatedAt?: string
  author?: string
  focusKeyword?: string
  imageAlt?: string
  readingTime?: string
}

/** تحويل 0-1000 إلى نطاق وصفي. */
export function bandFor(overall: number): ScoreBand {
  if (overall >= 800) return "excellent"
  if (overall >= 600) return "good"
  if (overall >= 400) return "needs-work"
  return "poor"
}

export const BAND_LABELS: Record<ScoreBand, string> = {
  excellent: "ممتاز",
  good: "جيد",
  "needs-work": "يحتاج تحسيناً",
  poor: "ضعيف",
}

export function bandLabel(band: ScoreBand): string {
  return BAND_LABELS[band]
}
