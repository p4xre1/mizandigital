// shared/help/answer.js
//
// الواجهة الوحيدة التي يستعملها الـendpoint والاختبارات:
// سؤال ← (رفض للاستشارة | جواب من المحتوى | لا جواب مع روابط بديلة).

import { allEntries } from "./knowledge.js"
import { rankEntries } from "./retrieve.js"
import { checkScope, REFUSAL_LEGAL_ADVICE } from "./guardrails.js"

export const NOT_FOUND_ANSWER =
  "لم أجد جواباً واضحاً عن سؤالك في محتوى الموقع. جرّب كلمات أخرى، أو تصفح الأسئلة الشائعة، أو راسلنا من صفحة التواصل."

const FALLBACK_SOURCES = [
  { title: "الأسئلة الشائعة", url: "/faq" },
  { title: "تواصل معنا", url: "/contact" },
]

/**
 * @param {string} question
 * @param {{ entries?: any[] }} [options]
 * @returns {{ mode: "refused" | "answer" | "not_found", answer: string, sources: Array<{title: string, url: string}> }}
 */
export function answerQuestion(question, options = {}) {
  const entries = options.entries ?? allEntries()

  const scope = checkScope(question)
  if (scope.refuse) {
    return {
      mode: "refused",
      answer: REFUSAL_LEGAL_ADVICE,
      sources: [{ title: "الوضع القانوني للمنصة وحدود المحتوى", url: "/terms" }],
    }
  }

  const hits = rankEntries(question, entries, { limit: 3 })
  if (hits.length === 0) {
    return { mode: "not_found", answer: NOT_FOUND_ANSWER, sources: FALLBACK_SOURCES }
  }

  // مصادر فريدة حسب الرابط، مع الحفاظ على ترتيب الأفضلية.
  const seen = new Set()
  const sources = []
  for (const { entry } of hits) {
    if (seen.has(entry.url)) continue
    seen.add(entry.url)
    sources.push({ title: entry.title, url: entry.url })
  }

  return { mode: "answer", answer: hits[0].entry.body, sources }
}
