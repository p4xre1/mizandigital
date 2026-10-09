// خط المعالجة المشترك: يستعمله نقطة الطلب (الخادم) ولوحة الاختبار في الإدارة،
// فيرى المشرف بالضبط ما يراه الزائر. لا يستهلك أي حصة ولا يكتب في أي مكان.

import { isSafeInternalPath, DEFAULT_MESSAGES } from "./cms.js"
import { screenMessage } from "./guardrails.js"
import { detectLanguage, UNSUPPORTED_LANGUAGE_ANSWER } from "./language.js"
import { answerQuestion } from "./answer.js"

/** أنماط ممنوعة في جواب يصل إلى المتصفح، مهما كان مصدره. */
export const UNSAFE_OUTPUT_PATTERNS = [/[<>]/, /javascript\s*:/i, /data\s*:\s*text\/html/i, /\bon[a-z]{3,}\s*=/i]

/**
 * فحص الخرج الأخير: يُسقط المصادر غير الداخلية، ويستبدل الجواب غير الآمن بنص الحظر.
 * @param {{ mode: string, answer: string, sources: Array<{title: string, url: string}>, reason?: string }} result
 * @param {string} blockedText
 */
export function sanitizeAnswerResult(result, blockedText) {
  const sources = (result.sources || []).filter(
    (source) => source && typeof source.title === "string" && isSafeInternalPath(source.url),
  )
  const unsafe = UNSAFE_OUTPUT_PATTERNS.some((re) => re.test(String(result.answer || "")))
  if (unsafe) {
    return { mode: "blocked", answer: blockedText, sources: [], reason: "unsafe_output" }
  }
  return { ...result, sources }
}

/**
 * يشغّل ترتيب الدفاع نفسه الذي تستعمله نقطة الطلب بدون الحصة:
 * فحص الحقن والتمويه -> بوابة اللغة -> الجواب -> فحص الخرج.
 * @param {string} text
 * @param {{ settings?: object, customEntries?: object[] }} config
 */
export function runPipeline(text, config = {}) {
  const messages = config.settings?.messages || DEFAULT_MESSAGES
  if (config.settings && config.settings.enabled === false) {
    return sanitizeAnswerResult(answerQuestion(text, config), messages.blocked)
  }
  const screen = screenMessage(text)
  if (screen.block) {
    return { mode: "blocked", answer: messages.blocked, sources: [], reason: screen.reason ?? "unknown" }
  }
  if (detectLanguage(text) === "other") {
    return { mode: "unsupported_language", answer: UNSUPPORTED_LANGUAGE_ANSWER, sources: [] }
  }
  return sanitizeAnswerResult(answerQuestion(text, config), messages.blocked)
}
