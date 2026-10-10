// shared/help/clarify-state.js
//
// منطق حالة التوضيح الخالص (بلا شبكة ولا DOM): يُستعمل في نقطة الطلب للتحقق من الحقول،
// وفي واجهة المحادثة لتفسير الرد الكتابي على توضيح معلّق.
//
// القواعد:
//   • الحالة المعلّقة منفصلة: السؤال الأصلي، والتوضيح المقترح، والسؤال السابق (للسياق فقط).
//   • التأكيد الصريح وحده يُجيب عن الصياغة المقترحة. الصمت والتحديث وأي رسالة لا تطابق قائمة التأكيد ليست تأكيداً.
//   • الرد الكتابي بـ"نعم" أو "لا" يُفسَّر فقط وهناك توضيح معلّق. بعد تحديث الصفحة يصبح نصاً عادياً.
//   • الكتابة بصياغة جديدة تُعامل كسؤال جديد يمر بالفحوص نفسها، ولا تُدمج مع الاقتراح.

import { normalizeArabic } from "../qa/normalize.js"
import { CHOICE_IDS, CLARIFY_LIMITS } from "../qa/clarify-config.js"

const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/

/** ردود تأكيد صريحة. تُطابق بعد التطبيع (بلا تشكيل ولا علامات ترقيم). */
export const AFFIRMATIVE_REPLIES = new Set(
  ["نعم", "أجل", "اجل", "إي", "اي", "ايوه", "ايوا", "ايه", "صحيح", "بالضبط", "نعم صحيح", "هذا ما أقصده", "هذا ما اقصده", "هذا هو", "نعم هذا"].map(
    normalizeArabic,
  ),
)

/** ردود رفض صريحة: تُفسَّر على أنها طلب توضيح، لا تأكيد. */
export const NEGATIVE_REPLIES = new Set(
  ["لا", "كلا", "لا هذا", "غير ذلك", "ليس هذا", "ليس ذلك", "لا أقصد", "لا اقصد", "لا هذا ليس", "لا ليس هذا"].map(normalizeArabic),
)

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v)
const onlyKeys = (obj, allowed) => Object.keys(obj).every((k) => allowed.includes(k))

/**
 * يتحقق من الحقلين الاختياريين: clarification و context. أي شكل غير متوقع يُرفض كله.
 * @returns {{ok: true, value: {clarification?: {choice: string}, previousQuestion?: string}} | {ok: false}}
 */
export function parseClarificationRequest(body) {
  if (!isPlainObject(body)) return { ok: false }
  const value = {}
  if (body.clarification !== undefined) {
    const c = body.clarification
    if (!isPlainObject(c) || !onlyKeys(c, ["choice"]) || !CHOICE_IDS.includes(c.choice)) return { ok: false }
    value.clarification = { choice: c.choice }
  }
  if (body.context !== undefined) {
    const x = body.context
    if (!isPlainObject(x) || !onlyKeys(x, ["previousQuestion"])) return { ok: false }
    if (x.previousQuestion !== undefined) {
      const p = x.previousQuestion
      if (typeof p !== "string" || p.length > CLARIFY_LIMITS.maxPreviousQuestionChars || CONTROL_RE.test(p)) return { ok: false }
      value.previousQuestion = p
    }
  }
  return { ok: true, value }
}

/**
 * يفسّر رداً كتابياً على توضيح معلّق.
 * @param {{ clarification?: { suggestion?: string|null, choices?: Array<{id: string}> } } | null} pending
 * @returns {{type: 'choice', choice: string} | {type: 'invalid'} | {type: 'new'}}
 */
export function interpretPendingReply(pending, text) {
  const norm = normalizeArabic(String(text ?? ""))
  if (!pending || !pending.clarification) return { type: "new" }
  const choices = pending.clarification.choices ?? []
  const hasSuggestion = Boolean(pending.clarification.suggestion)
  if (norm && AFFIRMATIVE_REPLIES.has(norm)) {
    return hasSuggestion ? { type: "choice", choice: "suggested" } : { type: "invalid" }
  }
  if (norm && NEGATIVE_REPLIES.has(norm)) {
    return choices.some((c) => c.id === "explain") ? { type: "choice", choice: "explain" } : { type: "new" }
  }
  return { type: "new" }
}
