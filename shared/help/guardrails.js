// shared/help/guardrails.js
//
// يكشف الأسئلة التي تطلب استشارة قانونية في قضية فردية، فيرفضها بلطف ويحيل إلى مختص.
// الهدف ليس منع كل ذكر للقانون، بل منع "حالتي/قضيتي/هل يحق لي" وما شابهها.
// أمثلة مقبولة: "كيف أبحث في الأرشيف؟"، "ما معنى الالتزام؟" (تعريف من المعجم).

import { normalize } from "./retrieve.js"

/**
 * أنماط الحالة الشخصية بالعربية. تُكتب بالصيغة بعد التطبيع لأن normalize()
 * يحوّل ة إلى ه، وى/ئ إلى ي، وأ/إ/آ إلى ا قبل المطابقة.
 */
const PERSONAL_CASE_AR = [
  // ملاحظة: لا نستعمل \b هنا، لأنها لا تعرف الحروف العربية في JavaScript.
  /هل (يحق|يجوز|يمكنني|يمكنن|استطيع|نستطيع) (لي|لنا)/,
  /(قضيتي|قضيتنا|ملفي|دعواي|حالتي|نزاعي|مشكلتي|طلاقي|كرايي|كرائي|شكايتي)/,
  /(اريد|احتاج|ابغي|نحتاج) استشاره|استشيرك|استشير|انصحني|نصيحه قانونيه/,
  /(عندي|نحتاج|احتاج) محامي/,
  /(هل (سأربح|اربح|ساربح)|حكم لصالحي|سيحكم لصالحي)/,
]

/** أنماط الحالة الشخصية بالفرنسية. */
const PERSONAL_CASE_FR = [
  /\bconseil juridique\b/,
  /\bmon (cas|litige|dossier|affaire|divorce|contrat|bail|licenciement)\b/,
  /\bpuis[- ]je\b/,
  /\bdois[- ]je\b/,
  /\bme conseiller\b/,
  /\bavocat\b/,
  /\bai[- ]je le droit\b/,
]

/**
 * @param {string} text
 * @returns {{ refuse: boolean, reason: "personal_case" | null }}
 */
export function checkScope(text) {
  const raw = String(text || "")
  const norm = normalize(raw)
  const fr = raw.toLowerCase()

  if (PERSONAL_CASE_AR.some((re) => re.test(norm))) {
    return { refuse: true, reason: "personal_case" }
  }
  if (PERSONAL_CASE_FR.some((re) => re.test(fr))) {
    return { refuse: true, reason: "personal_case" }
  }
  return { refuse: false, reason: null }
}

export const REFUSAL_LEGAL_ADVICE =
  "لا أقدّم استشارات قانونية أو آراء في حالات فردية. ميزان منصة تعليمية، ويمكنني مساعدتك في استعمال الموقع وإيجاد المواد المناسبة له. لاستشارة في حالتك، راجع محامياً مسجلاً أو الجهة المختصة."

export const REFUSAL_GENERIC =
  "لا أستطيع معالجة هذا الطلب. اكتب سؤالك عن استعمال الموقع أو محتواه."
