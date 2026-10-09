// shared/help/output.js
//
// فرض حد الطول على الجواب برمجياً. الحد بالكلمات، والقطع عند نهاية جملة إن أمكن،
// ولا يُقطع أبداً داخل استشهاد قانوني (رقم القانون كاملاً أو لا شيء).

import { extractLawCitations } from "../laws/citations.js"

/** @param {string} text */
export function countWords(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length
}

/** مواضع نهاية الجمل: بعد نقطة أو علامة استفهام أو تعجب أو فاصلة منقوطة عربية أو سطر جديد. */
const SENTENCE_END_RE = /[.!؟?؛;](?=\s|$)|\n/g

/**
 * @param {string} text
 * @param {number} maxWords
 * @returns {{ text: string, truncated: boolean }}
 */
export function enforceLengthLimit(text, maxWords) {
  const value = String(text || "")
  if (countWords(value) <= maxWords) return { text: value, truncated: false }

  const citations = extractLawCitations(value).map((c) => [c.index, c.index + c.raw.length])
  // لا يصح أن يبقى القطع داخل استشهاد: نرجع إلى بدايته.
  const safeCut = (index) => {
    for (const [start, end] of citations) {
      if (start < index && index < end) return start
    }
    return index
  }

  // 1) أطول مقطع ينتهي بجملة كاملة ضمن الحد.
  let best = -1
  for (const match of value.matchAll(SENTENCE_END_RE)) {
    const end = safeCut(match.index + (match[0] === "\n" ? 0 : 1))
    if (end <= 0) continue
    if (countWords(value.slice(0, end)) <= maxWords) best = Math.max(best, end)
  }
  if (best > 0) {
    return { text: value.slice(0, best).trimEnd(), truncated: true }
  }

  // 2) لا جملة كاملة: نقطع بعد آخر كلمة ضمن الحد، مع احترام الاستشهاد.
  const wordEnds = [...value.matchAll(/\S+/g)].map((m) => m.index + m[0].length)
  const keep = wordEnds[maxWords - 1]
  const end = safeCut(keep)
  if (!end || end <= 0) return { text: value, truncated: false }
  return { text: `${value.slice(0, end).trimEnd()}…`, truncated: true }
}
