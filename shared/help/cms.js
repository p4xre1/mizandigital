// shared/help/cms.js
//
// كل ما يخص المحتوى الذي يديره المشرف من لوحة /admin/help-assistant:
// الإعدادات الافتراضية، تحويل صفوف قاعدة البيانات إلى مدخلات بحث،
// والتحقق من المدخلات قبل الحفظ (والتحقق نفسه يُعاد عند القراءة كحماية إضافية).
// هذا الملف بلا اعتماد على المتصفح أو الخادم، فيعمل في الثلاثة.

import { checkInjection } from "./guardrails.js"

export const MAX_QUESTION_CHARS = 300
export const MAX_ANSWER_CHARS = 1500
export const MAX_KEYWORDS = 15
export const MAX_MESSAGE_CHARS = 400
export const MAX_LIST_ITEMS = 300
export const MAX_TERM_CHARS = 80

/** نصوص الرد الافتراضية. المشرف يستطيع تغييرها من الإعدادات. */
export const DEFAULT_MESSAGES = {
  blocked: "لا أستطيع معالجة هذا الطلب. اكتب سؤالك عن استعمال الموقع أو محتواه.",
  offTopic: "هذا السؤال خارج نطاق محتوى ميزان. أستطيع الإجابة عن استعمال الموقع وأقسامه ومحتواه فقط.",
  notFound:
    "لم أجد جواباً واضحاً عن سؤالك في محتوى الموقع. جرّب كلمات أخرى، أو تصفح الأسئلة الشائعة، أو راسلنا من صفحة التواصل.",
  disabled: "مساعد ميزان متوقف مؤقتاً. حاول لاحقاً، أو راسلنا من صفحة التواصل.",
}

/** الإعدادات كما يستعملها المحرك (بعد التطبيع). */
/** @type {{ enabled: boolean, messages: Record<string, string>, blockedPhrases: string[], offTopicTerms: string[] }} */
export const DEFAULT_SETTINGS = {
  enabled: true,
  messages: { ...DEFAULT_MESSAGES },
  blockedPhrases: [],
  offTopicTerms: [],
}

/** نص نظيف بطول أقصى. */
function cleanText(value, max) {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, max)
}

/** قائمة نصوص: تُقصّ وتُزال المكررات والفارغ. */
export function cleanList(values, maxItems = MAX_LIST_ITEMS, maxChars = MAX_TERM_CHARS) {
  if (!Array.isArray(values)) return []
  const seen = new Set()
  const out = []
  for (const raw of values) {
    const value = cleanText(raw, maxChars)
    if (value.length < 2 || seen.has(value)) continue
    seen.add(value)
    out.push(value)
    if (out.length >= maxItems) break
  }
  return out
}

/**
 * صف واحد من جدول help_settings (أو null إذا لم يُنشأ الجدول بعد).
 * @param {null | {
 *   enabled?: boolean, blocked_message?: string|null, off_topic_message?: string|null,
 *   not_found_message?: string|null, disabled_message?: string|null,
 *   blocked_phrases?: string[]|null, off_topic_terms?: string[]|null
 * }} row
 */
export function settingsFromRow(row) {
  if (!row) return { ...DEFAULT_SETTINGS, messages: { ...DEFAULT_MESSAGES } }
  const pick = (value, fallback) => cleanText(value, MAX_MESSAGE_CHARS) || fallback
  return {
    enabled: row.enabled !== false,
    messages: {
      blocked: pick(row.blocked_message, DEFAULT_MESSAGES.blocked),
      offTopic: pick(row.off_topic_message, DEFAULT_MESSAGES.offTopic),
      notFound: pick(row.not_found_message, DEFAULT_MESSAGES.notFound),
      disabled: pick(row.disabled_message, DEFAULT_MESSAGES.disabled),
    },
    blockedPhrases: cleanList(row.blocked_phrases),
    offTopicTerms: cleanList(row.off_topic_terms),
  }
}

/**
 * صف من جدول help_qa (منشور فقط) ← مدخل بحث يفهمه المحرك.
 * الرابط اختياري: إن غاب لا يظهر مصدر للجواب.
 */
export function qaRowToEntry(row) {
  const question = cleanText(row.question, MAX_QUESTION_CHARS)
  const answer = cleanText(row.answer, MAX_ANSWER_CHARS)
  const sourceUrl = isSafeInternalPath(row.source_url) ? row.source_url.trim() : null
  return {
    id: `qa-${row.id}`,
    title: question,
    keywords: cleanList(row.keywords, MAX_KEYWORDS, 40),
    body: answer,
    url: sourceUrl,
    sourceTitle: cleanText(row.source_title, 120) || question,
    custom: true,
  }
}

/** مسار داخلي فقط: يبدأ بـ / ولا يبدأ بـ // ولا يحوي بروتوكولاً. */
export function isSafeInternalPath(value) {
  if (typeof value !== "string") return false
  const v = value.trim()
  return v.length > 1 && v.length <= 200 && v.startsWith("/") && !v.startsWith("//") && !/[:\s\\]/.test(v)
}

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
  if (checkInjection(question).block || checkInjection(answer).block) {
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
    if (value && checkInjection(value).block) return `نص الرسالة "${key}" يحوي شيفرة غير مسموحة.`
  }
  if ((draft.blockedPhrases || []).length > MAX_LIST_ITEMS) return `أقصى عدد للعبارات المحظورة ${MAX_LIST_ITEMS}.`
  if ((draft.offTopicTerms || []).length > MAX_LIST_ITEMS) return `أقصى عدد لكلمات خارج الموضوع ${MAX_LIST_ITEMS}.`
  return null
}

/** يحوّل نص متعدد الأسطر أو مفصول بفاصلة إلى قائمة نظيفة. */
export function parseList(text) {
  return cleanList(String(text || "").split(/[\n,،]+/))
}
