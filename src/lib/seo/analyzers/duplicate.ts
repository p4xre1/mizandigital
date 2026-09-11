/**
 * src/lib/seo/analyzers/duplicate.ts
 *
 * كشف المحتوى المكرر عبر "shingling" + تشابه Jaccard. يُستخدم في:
 * Duplicate Content Test و Originality Score و Content Gap Analysis.
 *
 * ملاحظة صدق: هذا يكشف التكرار **داخل المرجع نفسه** (مقالاتك مع بعضها).
 * كشف النسخ من مواقع خارجية يحتاج فهرساً خارجياً ولا يمكن عمله دون شبكة.
 */

import { normalizeArabic, tokenize } from "./text"

/** مجموعة shingles (تتابعات من n كلمة) لنص. */
export function shingles(text: string, n = 5): Set<string> {
  const words = tokenize(text).map(normalizeArabic)
  const set = new Set<string>()
  if (words.length < n) {
    if (words.length) set.add(words.join(" "))
    return set
  }
  for (let i = 0; i <= words.length - n; i++) {
    set.add(words.slice(i, i + n).join(" "))
  }
  return set
}

/** تشابه Jaccard بين مجموعتين (0-1). */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  const [small, large] = a.size <= b.size ? [a, b] : [b, a]
  for (const item of small) if (large.has(item)) intersection++
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

export interface DuplicatePair {
  a: string
  b: string
  similarity: number
}

export interface DuplicateReport {
  pairs: DuplicatePair[]
  /** أعلى تشابه لأي مستند مع غيره. */
  maxSimilarityByDoc: Record<string, number>
  hasDuplicates: boolean
}

/**
 * مقارنة كل مستند بكل المستندات الأخرى.
 * @param docs خريطة slug → نص
 * @param threshold عتبة اعتبار التكرار مشكلة (افتراضي 0.25)
 */
export function findDuplicates(
  docs: Record<string, string>,
  threshold = 0.25
): DuplicateReport {
  const keys = Object.keys(docs)
  const sets = new Map<string, Set<string>>()
  for (const key of keys) sets.set(key, shingles(docs[key]))

  const pairs: DuplicatePair[] = []
  const maxSimilarityByDoc: Record<string, number> = {}
  for (const key of keys) maxSimilarityByDoc[key] = 0

  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const similarity = jaccard(sets.get(keys[i])!, sets.get(keys[j])!)
      maxSimilarityByDoc[keys[i]] = Math.max(maxSimilarityByDoc[keys[i]], similarity)
      maxSimilarityByDoc[keys[j]] = Math.max(maxSimilarityByDoc[keys[j]], similarity)
      if (similarity >= threshold) {
        pairs.push({ a: keys[i], b: keys[j], similarity: Math.round(similarity * 1000) / 1000 })
      }
    }
  }

  pairs.sort((x, y) => y.similarity - x.similarity)
  return { pairs, maxSimilarityByDoc, hasDuplicates: pairs.length > 0 }
}

/**
 * نتيجة الأصالة (0-100) لمستند واحد: 100 = لا يشبه أي مستند آخر.
 * @param maxSimilarity أعلى تشابه لهذا المستند مع غيره (0-1)
 */
export function originalityScore(maxSimilarity: number): number {
  // تشابه ≤ 0.10 طبيعي (مصطلحات قانونية مشتركة)، ≥ 0.55 نسخ فعلي
  if (maxSimilarity <= 0.1) return 100
  if (maxSimilarity >= 0.55) return 0
  return Math.round(100 - ((maxSimilarity - 0.1) / 0.45) * 100)
}
