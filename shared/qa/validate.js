// shared/qa/validate.js
//
// المرحلة 12: التحقق من الجواب قبل إرساله. أي مخالفة تُفشل الجواب، ويُستبدل بجواب آمن ثابت.
//
// الفحوص:
//   1) عربي فقط: لا حروف لاتينية في الجواب (السياسة: الرد بالعربية حصراً).
//   2) لا محارف HTML أو روابط برمجية (javascript:، on*=). الجواب نص عادي يعرضه React بالهروب الآلي،
//      وهذا فحص إضافي لمن يعيد استعمال المخرج.
//   3) الاقتباسات حرفية: كل ما بين « » يجب أن يطابق نصاً من الأدلة المستعملة تماماً.
//   4) أرقام الفصول والمواد المذكورة يجب أن تكون في الأدلة أو في السؤال، لا مُخترعة.
//   5) الحد الأقصى للكلمات حسب نوع الجواب (config.answerBudgetWords). الحذف يقع على الأدلة الأدنى
//      رتبة، ولا يُقطع نص مُقتبس.

const LATIN_RE = /[A-Za-z]/
const UNSAFE_RE = /[<>]|javascript\s*:|\bon[a-z]{3,}\s*=/i
const QUOTE_RE = /«([^»]+)»/g
const ARTICLE_NUMBER_RE = /(?:رقم|الفصل|المادة|الفصول|المواد)\s+(\d+(?:[-.]\d+)?)/g

/** أرقام الفصول والمواد المذكورة في نص (تُستعمل للتحقق من الجواب). */
export function articleNumbersIn(text) {
  return [...String(text || "").matchAll(ARTICLE_NUMBER_RE)].map((m) => m[1])
}

export function countWords(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length
}

/**
 * @param {string} answer
 * @param {{ evidenceTexts: string[], evidenceNumbers: string[], questionNumbers: string[], budgetWords: number }} ctx
 * @returns {{ ok: boolean, violations: string[] }}
 */
export function validateAnswer(answer, ctx) {
  const violations = []
  if (typeof answer !== "string" || answer.trim() === "") return { ok: false, violations: ["empty"] }
  if (LATIN_RE.test(answer)) violations.push("latin_text")
  if (UNSAFE_RE.test(answer)) violations.push("unsafe_markup")

  for (const m of answer.matchAll(QUOTE_RE)) {
    const quote = m[1]
    if (!ctx.evidenceTexts.some((t) => t.includes(quote))) violations.push("quote_not_verbatim")
  }

  const allowedNumbers = new Set([...ctx.evidenceNumbers, ...ctx.questionNumbers])
  for (const m of answer.matchAll(ARTICLE_NUMBER_RE)) {
    if (!allowedNumbers.has(m[1])) violations.push("unsupported_article_number")
  }

  if (countWords(answer) > ctx.budgetWords) violations.push("over_budget")
  return { ok: violations.length === 0, violations: [...new Set(violations)] }
}
