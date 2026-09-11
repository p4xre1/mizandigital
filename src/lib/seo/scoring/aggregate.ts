/**
 * src/lib/seo/scoring/aggregate.ts
 *
 * تجميع المقاييس الفرعية في نتيجة إجمالية من 0 إلى 1000.
 *
 * قرار مهم: عند غياب مقياس (يحتاج مفتاح API) **لا** نُعيد توزيع وزنه على
 * الباقي. السبب: إعادة التوزيع تجعل النتيجة ترتفع تلقائياً كلما عطّلنا
 * مقياساً، وهذا تحريف. بدلاً من ذلك تُحسب النتيجة من الأوزان المتاحة فقط،
 * ويُبلَّغ عن `unmeasurableWeight` صراحةً ليظهر أن النتيجة جزئية.
 */

import { bandFor, type ScoreResult, type SubScore } from "./types"

export function aggregate(subScores: SubScore[], generatedAt = new Date().toISOString()): ScoreResult {
  let weightedSum = 0
  let measuredWeight = 0
  let unmeasurableWeight = 0

  for (const sub of subScores) {
    if (sub.status === "measured") {
      weightedSum += sub.score * sub.weight
      measuredWeight += sub.weight
    } else {
      unmeasurableWeight += sub.weight
    }
  }

  // القسمة على الوزن المُقاس فقط: مقياس 0-100 صادق ضمن ما قيس فعلاً
  const overallPercent = measuredWeight > 0 ? weightedSum / measuredWeight : 0
  const overall = Math.round(overallPercent * 10)

  const issues = subScores
    .flatMap((sub) =>
      sub.issues.map((issue) => ({
        issue,
        // الأولوية = حجم النقاط المُهدرة = (100 - النتيجة) × الوزن
        impact: (100 - sub.score) * sub.weight,
      }))
    )
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 5)
    .map((entry) => entry.issue)

  return {
    overall,
    overallPercent: Math.round(overallPercent),
    band: bandFor(overall),
    subScores,
    unmeasurableWeight: Math.round(unmeasurableWeight * 1000) / 1000,
    topIssues: issues,
    generatedAt,
  }
}

/** مقياس فرعي مُقاس فعلاً. */
export function measured(
  key: SubScore["key"],
  score: number,
  weight: number,
  evidence: string[],
  issues: string[]
): SubScore {
  return {
    key,
    label: "",
    acronym: "",
    score: Math.max(0, Math.min(100, Math.round(score))),
    weight,
    status: "measured",
    evidence,
    issues,
  }
}

/** مقياس يحتاج مصدراً خارجياً (CrUX / Search Console / LLM probe). */
export function adapterRequired(
  key: SubScore["key"],
  weight: number,
  reason: string,
  partialScore?: number,
  evidence: string[] = []
): SubScore {
  return {
    key,
    label: "",
    acronym: "",
    score: partialScore ?? 0,
    weight,
    status: "adapter-required",
    evidence,
    issues: [reason],
  }
}

/** مقياس لا ينطبق على هذا المحتوى. */
export function notApplicable(key: SubScore["key"], weight: number, reason: string): SubScore {
  return {
    key,
    label: "",
    acronym: "",
    score: 0,
    weight,
    status: "not-applicable",
    evidence: [reason],
    issues: [],
  }
}
