// shared/qa/normalize.js
//
// المرحلة 2: توحيد الكتابة العربية للمطابقة فقط. النص الأصلي لا يُستبدل به أبداً.
//
// ما تفعله هذه الوحدة (قواعد حتمية، بلا تحليل صرفي):
//   • إزالة التشكيل والتطويل.
//   • توحيد الألف (أ إ آ ٱ ← ا)، والياء والألف المقصورة (ى ← ي)، والتاء المربوطة (ة ← ه)،
//     والواو والياء المهموزتين (ؤ ← و، ئ ← ي).
//   • تحويل الأرقام العربية الهندية والفارسية إلى ASCII.
//   • استبدال علامات الترقيم بمسافات، مع الإبقاء على النقطة والشرطة بين الأرقام
//     (70.03 و1.11.91 و11-12)، لأنها جزء من رقم القانون أو الفصل.
//
// ما لا تفعله عمداً:
//   • لا تحذف أي كلمة. النفي (لا، لم، لن، ليس، غير، عدم)، والاستثناء (إلا، باستثناء)، والتواريخ،
//     وأرقام القوانين تبقى كما هي.
//   • لا تدّعي تحليلاً صرفياً كاملاً. الجذور في morph.js قواعد محدودة فقط.

/** حروف المد والتشكيل ونحوها: تُحذف للمطابقة. */
const DIACRITICS_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g
const TATWEEL_RE = /\u0640/g
const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩"
const EXTENDED_ARABIC_INDIC = "۰۱۲۳۴۵۶۷۸۹"

/** @param {string} text */
export function normalizeArabic(text) {
  let s = String(text ?? "").normalize("NFC")
  s = s.replace(DIACRITICS_RE, "").replace(TATWEEL_RE, "")
  s = s.replace(/[إأآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
  s = s.replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)))
  s = s.replace(/[۰-۹]/g, (d) => String(EXTENDED_ARABIC_INDIC.indexOf(d)))
  s = s.toLowerCase()
  // نقطة أو شرطة بين رقمين تبقى (70.03، 11-12). ما عدا ذلك يصير مسافة.
  // الشرطة الطويلة والقصيرة توحَّدان. ثم يُحمى كل فاصل بين رقمين بحرف مؤقت يعود إليه بالضبط.
  s = s.replace(/–/g, "-")
  s = s.replace(/(\d)\.(?=\d)/g, "$1\u0001").replace(/(\d)-(?=\d)/g, "$1\u0002")
  s = s.replace(/[^\p{L}\p{N}\u0001\u0002]+/gu, " ")
  s = s.replace(/\u0001/g, ".").replace(/\u0002/g, "-")
  return s.replace(/\s+/g, " ").trim()
}

/**
 * يقسّم النص المطبَّع إلى رموز. الرمز الذي فيه نقطة بين رقمين (70.03) يبقى رمزاً واحداً.
 * @param {string} normalized
 * @param {{ maxTokens?: number }} [options]
 * @returns {{ tokens: string[], truncated: boolean }}
 */
export function tokenizeNormalized(normalized, options = {}) {
  const max = options.maxTokens ?? 60
  const all = normalized.split(" ").filter(Boolean)
  return { tokens: all.slice(0, max), truncated: all.length > max }
}

/**
 * عبارات متعددة الكلمات مستخرجة من الرموز: كل تتابع من 2 إلى n كلمات، بلا حذف.
 * تُستعمل للمطابقة الحرفية فقط (لا جذور).
 * @param {string[]} tokens
 * @param {number} [maxLength]
 * @returns {string[]}
 */
export function extractPhrases(tokens, maxLength = 4) {
  const out = new Set()
  for (let n = 2; n <= maxLength; n += 1) {
    for (let i = 0; i + n <= tokens.length; i += 1) {
      out.add(tokens.slice(i, i + n).join(" "))
    }
  }
  return [...out]
}
