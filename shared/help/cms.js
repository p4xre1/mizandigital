// shared/help/cms.js
//
// التحقق من المدخلات قبل الحفظ. يعتمد على قواعد الفحص في guardrails.js،
// لذلك لا يُستورد من الواجهة المتصفحية؛ تستدعيه نقطة API إدارية
// (functions/api/admin/help/validate.js). الثوابت والتحويلات في cms-constants.js
// وتُعاد تصديرها هنا للتوافق مع الاستيرادات القديمة.

import { checkInjection } from "./guardrails.js"
import { MAX_ANSWER_CHARS, MAX_KEYWORDS, MAX_LIST_ITEMS, MAX_MESSAGE_CHARS, MAX_QUESTION_CHARS, cleanText, isSafeInternalPath } from "./cms-constants.js"

export * from "./cms-constants.js"

/**
 * يُعيد رسالة خطأ بالعربية أو null إذا كان المدخل صالحاً.
 * @param {{ question: string, answer: string, keywords?: string[], sourceUrl?: string, sourceTitle?: string }} draft
 */
export function validateQaDraft(draft) {
  const question = cleanText(draft.question, 1000)
  const answer = cleanText(draft.answer, 5000)
  if (question.length < 4) return "السؤال قصير جداً (4 أحرف على الأقل)."
  if (question.length > MAX_QUESTION_CHARS) return `السؤال أطول من ${MAX_QUESTION_CHARS} حرف.`
  if (answer.length < 4) return "الجواب قصير جداً (4 أحرف على الأقل)."
  if (answer.length > MAX_ANSWER_CHARS) return `الجواب أطول من ${MAX_ANSWER_CHARS} حرف.`
  // لا وسوم إطلاقاً: النصوص المحفوظة نص عادي، وهذا يطابق قيد قاعدة البيانات.
  if (/[<>]/.test(question) || /[<>]/.test(answer) || checkInjection(question).block || checkInjection(answer).block) {
    return "النص يحوي وسوماً أو شيفرة غير مسموحة (مثل <script> أو javascript:)."
  }
  if (draft.keywords && draft.keywords.length > MAX_KEYWORDS) return `أقصى عدد للكلمات المفتاحية ${MAX_KEYWORDS}.`
  if (draft.sourceUrl && draft.sourceUrl.trim() && !isSafeInternalPath(draft.sourceUrl)) {
    return "رابط المصدر يجب أن يكون مساراً داخلياً مثل /archive أو /faq."
  }
  return null
}

/**
 * التحقق من رسائل الرد والقوائم قبل الحفظ.
 * @param {{ messages: Record<string,string>, blockedPhrases: string[], offTopicTerms: string[] }} draft
 */
export function validateSettingsDraft(draft) {
  for (const [key, value] of Object.entries(draft.messages || {})) {
    if (value && value.length > MAX_MESSAGE_CHARS) return `نص الرسالة "${key}" أطول من ${MAX_MESSAGE_CHARS} حرف.`
    if (value && (/[<>]/.test(value) || checkInjection(value).block)) return `نص الرسالة "${key}" يحوي وسوماً أو شيفرة غير مسموحة.`
  }
  const terms = [...(draft.blockedPhrases || []), ...(draft.offTopicTerms || [])]
  if (terms.some((term) => /[<>]/.test(term) || checkInjection(term).block)) return "القوائم تحوي وسوماً أو شيفرة غير مسموحة."
  if ((draft.blockedPhrases || []).length > MAX_LIST_ITEMS) return `أقصى عدد للعبارات المحظورة ${MAX_LIST_ITEMS}.`
  if ((draft.offTopicTerms || []).length > MAX_LIST_ITEMS) return `أقصى عدد لكلمات خارج الموضوع ${MAX_LIST_ITEMS}.`
  return null
}
