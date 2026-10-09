// shared/help/answer.js
//
// الواجهة الوحيدة التي يستعملها الـendpoint ولوحة الإدارة والاختبارات:
// سؤال ← (متوقف | محظور | رفض للاستشارة | خارج الموضوع | جواب | لا جواب).
//
// الترتيب مهم:
//   1) المساعد متوقف من الإعدادات؟
//   2) حقن شيفرة أو تعليمات (ثابت في الكود)
//   3) عبارات محظورة يضعها المشرف
//   4) استشارة قانونية في حالة فردية
//   5) كلمات خارج الموضوع يضعها المشرف
//   6) البحث: أسئلة المشرف أولاً، ثم محتوى الموقع المدمج

import { allEntries } from "./knowledge.js"
import { rankEntries } from "./retrieve.js"
import { checkBlockedPhrases, checkInjection, checkOffTopic, checkScope, REFUSAL_LEGAL_ADVICE } from "./guardrails.js"
import { DEFAULT_MESSAGES, DEFAULT_SETTINGS } from "./cms.js"

/** يبقى مُصدَّراً للتوافق مع الاختبارات والاستعمالات القديمة. */
export const NOT_FOUND_ANSWER = DEFAULT_MESSAGES.notFound

const FALLBACK_SOURCES = [
  { title: "الأسئلة الشائعة", url: "/faq" },
  { title: "تواصل معنا", url: "/contact" },
]

/**
 * @param {string} question
 * @param {{
 *   entries?: any[],            // محتوى الموقع المدمج (الافتراضي: allEntries())
 *   customEntries?: any[],      // أسئلة المشرف المنشورة (من qaRowToEntry)
 *   settings?: typeof DEFAULT_SETTINGS
 * }} [options]
 * @returns {{ mode: "disabled" | "blocked" | "refused" | "out_of_topic" | "answer" | "not_found", answer: string, sources: Array<{title: string, url: string}> }}
 */
export function answerQuestion(question, options = {}) {
  const settings = options.settings ?? DEFAULT_SETTINGS
  const messages = settings.messages ?? DEFAULT_MESSAGES
  const staticEntries = options.entries ?? allEntries()
  const customEntries = options.customEntries ?? []

  if (settings.enabled === false) {
    return { mode: "disabled", answer: messages.disabled, sources: [] }
  }

  if (checkInjection(question).block || checkBlockedPhrases(question, settings.blockedPhrases).block) {
    return { mode: "blocked", answer: messages.blocked, sources: [] }
  }

  if (checkScope(question).refuse) {
    return {
      mode: "refused",
      answer: REFUSAL_LEGAL_ADVICE,
      sources: [{ title: "الوضع القانوني للمنصة وحدود المحتوى", url: "/terms" }],
    }
  }

  if (checkOffTopic(question, settings.offTopicTerms).offTopic) {
    return { mode: "out_of_topic", answer: messages.offTopic, sources: FALLBACK_SOURCES }
  }

  // أسئلة المشرف أولاً: إن طابقت فهي الجواب المعتمد، وإلا نرجع إلى محتوى الموقع.
  const customHits = rankEntries(question, customEntries, { limit: 3 })
  const hits = customHits.length > 0 ? customHits : rankEntries(question, staticEntries, { limit: 3 })
  if (hits.length === 0) {
    return { mode: "not_found", answer: messages.notFound, sources: FALLBACK_SOURCES }
  }

  // مصادر فريدة حسب الرابط، مع الحفاظ على ترتيب الأفضلية. المدخل بلا رابط لا يُعرض كمصدر.
  const seen = new Set()
  const sources = []
  for (const { entry } of hits) {
    if (!entry.url || seen.has(entry.url)) continue
    seen.add(entry.url)
    sources.push({ title: entry.sourceTitle || entry.title, url: entry.url })
  }

  return { mode: "answer", answer: hits[0].entry.body, sources }
}
