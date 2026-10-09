// shared/qa/analyze.js
//
// يجمع المراحل 1 إلى 6 لسؤال واحد: التحقق، والتطبيع، والرموز والعبارات، والجذور،
// والكيانات، والنية. كل ناتج يحمل الأصل (`original`) ولا يُستعمل بديلاً عنه في الاقتباس.
//
// نص الدارجة بالحروف اللاتينية يُحوَّل إلى عربي للاسترجاع والنية فقط (retrievalText). الفحوص الأمنية
// في pipeline.js تعمل على النص الأصلي قبل هذه المرحلة.

import { QA_CONFIG } from "./config.js"
import { validateQuestion } from "./input.js"
import { normalizeArabic, tokenizeNormalized, extractPhrases } from "./normalize.js"
import { stemVariants } from "./morph.js"
import { extractEntities } from "./entities.js"
import { classifyIntent, contentTokens } from "./intent.js"
import { transliterateLegalLatin } from "./translit.js"

/**
 * @param {unknown} raw
 * @param {{ retrievalText?: string, config?: typeof QA_CONFIG }} [options]
 * @returns {
 *   | { ok: false, code: string }
 *   | {
 *       ok: true, original: string, malformed: boolean, truncated: boolean,
 *       normalized: string, tokens: string[], content: string[], phrases: string[],
 *       variants: Map<string, string[]>, entities: ReturnType<typeof extractEntities>,
 *       intent: { type: string, signals: string[] },
 *     }
 * }
 */
export function analyzeQuestion(raw, options = {}) {
  const config = options.config ?? QA_CONFIG

  // 1) التحقق والحدود.
  const checked = validateQuestion(raw, { maxChars: config.maxInputChars })
  if (!checked.ok) return { ok: false, code: checked.code }

  // 2) التطبيع (للمطابقة فقط؛ الأصل محفوظ).
  // الجسر اللاتيني يضيف مرادفات عربية لمصطلحات معروفة فقط، والنص الأصلي لا يتغير.
  const bridge = transliterateLegalLatin(checked.clean)
  const retrieval = normalizeArabic([options.retrievalText, bridge].filter(Boolean).join(" "))
  const normalized = normalizeArabic(checked.clean)
  const combined = retrieval && retrieval !== normalized ? `${normalized} ${retrieval}` : normalized

  // 3) الرموز والعبارات. الحد الأقصى للرموز يمنع رسالة ضخمة من استهلاك المعالجة.
  const { tokens, truncated } = tokenizeNormalized(normalized, { maxTokens: config.maxTokens })
  const retrievalTokens = retrieval ? tokenizeNormalized(retrieval, { maxTokens: config.maxTokens }).tokens : []
  const allTokens = [...tokens, ...retrievalTokens.filter((t) => !tokens.includes(t))]
  const content = contentTokens(allTokens)
  const phrases = extractPhrases(content, config.maxPhraseLength)

  // 4) الجذور المحافظة لكل رمز محتوى.
  const variants = new Map()
  for (const t of content) variants.set(t, stemVariants(t))

  // 5) الكيانات من النص الكامل (بعد الدارجة) لكن ليس من التحويل وحده.
  const entities = extractEntities(combined)

  // 6) النية.
  const intent = classifyIntent(combined)

  return {
    ok: true,
    original: checked.original,
    malformed: checked.malformed,
    truncated,
    normalized: combined,
    tokens: allTokens,
    content,
    phrases,
    variants,
    entities,
    intent,
  }
}
