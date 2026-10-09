// shared/help/guardrails.js
//
// طبقات الحماية للمساعد، بالترتيب الذي تُطبَّق به في answer.js:
//   1) حقن الشيفرة والتعليمات (checkInjection)                 ← ثابت في الكود
//   2) العبارات المحظورة التي يضعها المشرف في الـCMS             ← checkBlockedPhrases
//   3) الاستشارة القانونية في حالة فردية                         ← checkScope
//   4) كلمات خارج الموضوع التي يضعها المشرف في الـCMS             ← checkOffTopic
//
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

/**
 * محاولات حقن التعليمات (prompt injection) بالعربية والإنجليزية والفرنسية.
 * الصيغ محددة عمداً حتى لا تُسقط أسئلة موقع عادية مثل "تعليمات التسجيل".
 */
const INJECTION_PATTERNS = [
  /تجاهل .*(تعليمات|تعليماتك|اوامر|الاوامر|سابق|السابق)/,
  /(تعليماتك|موجه النظام|رساله النظام|برومبت|البرومبت)/,
  /(اعرض|اظهر|اكشف|اطبع|اخبرني) .*(تعليماتك|موجه|برومبت|prompt)/,
  /(انت الان|تصرف (كانك|كأنك)|تظاهر (بانك|بأنك))/,
  /(وضع المطور|developer mode|jailbreak|\bdan mode\b)/,
  /ignore (all |any |the )?(previous|prior|above|earlier|system) (instructions|prompts?|messages?|rules)/,
  /(reveal|show|print|display|repeat) (your |the )?(system )?(prompt|instructions)/,
  /\bsystem prompt\b/,
  /\byou are now\b/,
  /ignore (les |toutes les |tes )?instructions/,
  /(affiche|montre|révèle|revele) .*(prompt|instructions)/,
]

/**
 * أنماط الشيفرة والوسوم الخطرة. تُطابق على النص الخام (غير المطبّع)
 * لأن بعضها يعتمد على علامات الترقيم.
 */
const SCRIPT_PATTERNS = [
  /<\s*\/?\s*(script|iframe|object|embed|svg|img|style|link|meta|base|form)\b/i,
  /javascript\s*:/i,
  /\bon(error|load|click|mouseover|focus|mouseenter|submit)\s*=/i,
  /\beval\s*\(/i,
  /document\.(cookie|write|location)/i,
  /window\.(location|open)\b/i,
  /data\s*:\s*text\/html/i,
]

/**
 * @param {string} text
 * @returns {{ block: boolean, reason: "script" | "prompt_injection" | null }}
 */
export function checkInjection(text) {
  const raw = String(text || "")
  if (SCRIPT_PATTERNS.some((re) => re.test(raw))) return { block: true, reason: "script" }
  const norm = normalize(raw)
  if (INJECTION_PATTERNS.some((re) => re.test(norm))) return { block: true, reason: "prompt_injection" }
  return { block: false, reason: null }
}

/**
 * مطابقة عبارة كاملة (بحدود كلمات) بعد التطبيع. "حساب" لا تطابق "حسابات".
 * تُستعمل للعبارات المحظورة وكلمات خارج الموضوع التي يضعها المشرف.
 * @param {string} text
 * @param {string} term
 */
export function containsTerm(text, term) {
  const words = normalize(term).split(" ").filter(Boolean)
  if (words.length === 0) return false
  const tokens = normalize(text).split(" ").filter(Boolean)
  for (let start = 0; start + words.length <= tokens.length; start += 1) {
    if (words.every((word, offset) => tokenMatches(tokens[start + offset], word))) return true
  }
  return false
}

/** أدوات الربط والتعريف التي تلتصق بأول الكلمة العربية: "المخدرات" و"بكرة" و"وللمحامي". */
const ARABIC_PREFIXES = ["", "ال", "و", "وال", "ب", "بال", "ل", "لل", "ف", "فال", "ك", "كال", "وب", "ول", "ولل"]

function tokenMatches(token, word) {
  return ARABIC_PREFIXES.some((prefix) => token === prefix + word)
}

/** @returns {{ block: boolean }} */
export function checkBlockedPhrases(text, phrases = []) {
  return { block: phrases.some((phrase) => containsTerm(text, phrase)) }
}

/** @returns {{ offTopic: boolean }} */
export function checkOffTopic(text, terms = []) {
  return { offTopic: terms.some((term) => containsTerm(text, term)) }
}

export const REFUSAL_LEGAL_ADVICE =
  "لا أقدّم استشارات قانونية أو آراء في حالات فردية. ميزان منصة تعليمية، ويمكنني مساعدتك في استعمال الموقع وإيجاد المواد المناسبة له. لاستشارة في حالتك، راجع محامياً مسجلاً أو الجهة المختصة."

export const REFUSAL_GENERIC =
  "لا أستطيع معالجة هذا الطلب. اكتب سؤالك عن استعمال الموقع أو محتواه."
