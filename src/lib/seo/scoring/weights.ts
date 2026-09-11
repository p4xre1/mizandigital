/**
 * src/lib/seo/scoring/weights.ts
 *
 * أوزان المقاييس الفرعية الثمانية عشر. المجموع = 1.00 بالضبط، ويوجد اختبار
 * في tests/seo-scoring.test.ts يفرض ذلك حتى لا يُعدَّل وزن سهواً فيتغير
 * مقياس النتيجة الإجمالية (0-1000) دون علم.
 *
 * منطق التوزيع: المحتوى والفحص التقني و E-E-A-T هي الأكثر أثراً على موقع
 * مرجعي قانوني، تليها طبقة الذكاء الاصطناعي (AEO/GEO) لأن الموقع يستهدف
 * الظهور في إجابات النماذج اللغوية. UX/CRO وزنهما منخفض لأن الموقع تعليمي
 * لا تجاري — لا معنى لمعاقبته على غياب قمع بيع.
 */

import type { SubScoreKey } from "./types"

export const SCORE_WEIGHTS: Record<SubScoreKey, number> = {
  technical: 0.1,
  content: 0.11,
  seo: 0.08,
  eeat: 0.1,
  readability: 0.05,
  aeo: 0.07,
  geo: 0.07,
  aiVisibility: 0.05,
  citation: 0.04,
  entity: 0.05,
  semantic: 0.04,
  intent: 0.04,
  freshness: 0.05,
  originality: 0.04,
  trust: 0.03,
  authority: 0.03,
  ux: 0.03,
  cro: 0.02,
}

export const SUB_SCORE_LABELS: Record<SubScoreKey, { label: string; acronym: string }> = {
  technical: { label: "النتيجة التقنية", acronym: "Technical" },
  content: { label: "نتيجة المحتوى", acronym: "Content" },
  seo: { label: "نتيجة السيو (على الصفحة)", acronym: "SEO" },
  eeat: { label: "نتيجة الخبرة والثقة", acronym: "E-E-A-T" },
  readability: { label: "نتيجة سهولة القراءة", acronym: "Readability" },
  aeo: { label: "نتيجة محركات الإجابة", acronym: "AEO" },
  geo: { label: "نتيجة المحركات التوليدية", acronym: "GEO" },
  aiVisibility: { label: "نتيجة الظهور في الذكاء الاصطناعي", acronym: "AI Visibility" },
  citation: { label: "نتيجة الاستشهاد", acronym: "Citation" },
  entity: { label: "نتيجة الكيانات", acronym: "Entity" },
  semantic: { label: "نتيجة الدلالة", acronym: "Semantic" },
  intent: { label: "نتيجة نية البحث", acronym: "Search Intent" },
  freshness: { label: "نتيجة الحداثة", acronym: "Freshness" },
  originality: { label: "نتيجة الأصالة", acronym: "Originality" },
  trust: { label: "نتيجة الثقة", acronym: "Trust" },
  authority: { label: "نتيجة المرجعية", acronym: "Authority" },
  ux: { label: "نتيجة تجربة الاستخدام", acronym: "UX" },
  cro: { label: "نتيجة التحويل", acronym: "CRO" },
}

export const SUB_SCORE_KEYS = Object.keys(SCORE_WEIGHTS) as SubScoreKey[]

/** مجموع الأوزان — يجب أن يكون 1.00. */
export function totalWeight(): number {
  return SUB_SCORE_KEYS.reduce((sum, key) => sum + SCORE_WEIGHTS[key], 0)
}
