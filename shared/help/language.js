// shared/help/language.js
//
// كشف لغة السؤال بشكل بسيط ومحافظ: المساعد يعمل بالعربية فقط.
// الحروف العربية مقابل الحروف اللاتينية وغيرها. كلمات قصيرة مثل S1 أو PDF
// لا تكفي وحدها لرفض سؤال عربي، لأن الأغلبية تحسم القرار.

const ARABIC_LETTER_RE = /\p{Script=Arabic}/gu
const LATIN_LETTER_RE = /\p{Script=Latin}/gu
const ANY_LETTER_RE = /\p{L}/gu

/**
 * @param {string} text
 * @returns {"ar" | "other" | "none"}
 *   "ar"    : السؤال عربي (أو يحوي عربيةً تغلب على ما سواها)
 *   "other" : السؤال غير عربي بوضوح
 *   "none"  : لا حروف أصلاً (أرقام أو رموز فقط)، ويُعامل كعربي في المسار العادي
 */
export function detectLanguage(text) {
  const value = String(text || "")
  const arabic = (value.match(ARABIC_LETTER_RE) || []).length
  const latin = (value.match(LATIN_LETTER_RE) || []).length
  const all = (value.match(ANY_LETTER_RE) || []).length
  const other = Math.max(0, all - arabic - latin)
  const nonArabic = latin + other

  if (all === 0) return "none"
  if (arabic === 0) return "other"
  return nonArabic > arabic ? "other" : "ar"
}

export const UNSUPPORTED_LANGUAGE_ANSWER =
  "هذا المساعد يعمل باللغة العربية فقط. اكتب سؤالك بالعربية من فضلك. · Cet assistant fonctionne uniquement en arabe. Merci d'écrire votre question en arabe."
