// shared/help/profanity.js
//
// فلترة الألفاظ المسيئة — طبقة أخيرة قبل الخرج، وفحص للمدخلات المحفوظة من
// لوحة الإدارة. ليست بديلاً عن فحوص الحقن/الهندسة الاجتماعية (guardrails.js)؛
// تلك تطارد الشيفرة والانتحال، وهذه تطارد ألفاظ الإهانة في النصوص نفسها.
//
// مساران للمطابقة — ولا ثالث لهما:
//   • الكلمات اللاتينية: حدود كلمات \b (وورد JS إنكليزي، فالحدود تعمل).
//   • الكلمات العربية: تحفظات نطاق محارف (lookaround) — \b لا يطابق أبداً بين
//     حروف عربية (الحرف العربي «غير كلمة» في JS)، فبدون الحدود يلتهم "دج"
//     داخل "دجاج". لا نستخدم خصائص يونيكود (\p{Arabic}) إطلاقاً: نكتفي
//     بنطاقات صريحة تعمل في أي V8، منها حواف edge.
//
// المطابقة على النص المنوَّع (normalize في retrieve.js): بلا تشكيل، وة←ه وئ←ي
// وى←ي، فالكلمات المخزنة أدناه بصورتها المنوّعة.

import { normalize } from "./retrieve.js"

/** نطاق الحروف العربية: الأساس + الحزمة التكميلية + الممتدة-أ. */
const A = "\u0621-\u064A\u0671-\u06BF\u08A0-\u08FF"

/**
 * قائمة الألفاظ. كل كلمة تُخزن منوّعة، وتُطابق معزولة عن أي لسان عربي:
 * لا "دج" داخل "دجاج"، ولا "عياش" داخل "عياشين".
 */
const ARABIC_TERMS = [
  "عاهر",
  "عاهره",
  "زاني",
  "زانيه",
  "دج",
  "عياش",
  "خسيس",
  "سافل",
  "دنيه",
  "نصاب",
  "غبي",
]

const LATIN_TERMS = ["idiot", "stupid", "dumb"]

const ARABIC_RES = ARABIC_TERMS.map((term) => new RegExp(`(?<![${A}])${term}(?![${A}])`))
const LATIN_RES = LATIN_TERMS.map((term) => new RegExp(`\\b${term}\\b`, "i"))

/**
 * «نصاب» وحدها ثنائية المعنى: شتيمة (نصاب = محتال) ومصطلح تقني (نصاب المجلس/
 * المحكمة = الحد الأدنى لعضويته). تُحسب شتيمةً فقط إذا غاب سياق قانوني في النص
 * نفسه — فالفصل 130 من الدستور («تصدر قراراتها وفق نصاب…») إحالة دستورية لا
 * إهانة، وإسقاطه يكسر ميزة النص الكامل للمادة.
 */
const NABAB = "نصاب"
const NABAB_LEGAL_CONTEXT = /مجلس|نواب|برلمان|جلسه|اعضاء|محكمه|تصويت|اكثريه|قانون|دستور/

/** الألفاظ المحظورة الموجودة فعلاً في نص منوَّع (مع استثناء السياق). */
function findTerms(norm) {
  const terms = []
  for (let i = 0; i < ARABIC_TERMS.length; i += 1) {
    const term = ARABIC_TERMS[i]
    if (!ARABIC_RES[i].test(norm)) continue
    if (term === NABAB && NABAB_LEGAL_CONTEXT.test(norm)) continue
    terms.push(term)
  }
  for (let i = 0; i < LATIN_TERMS.length; i += 1) {
    if (LATIN_RES[i].test(norm)) terms.push(LATIN_TERMS[i])
  }
  return terms
}

/** قائمة الألفاظ المخزّنة (للتوثيق والاختبار). */
export function profanityTerms() {
  return [...ARABIC_TERMS, ...LATIN_TERMS]
}

/**
 * هل يحوي النص لفظاً محظوراً؟
 * @param {string} text
 * @returns {{ found: boolean, terms: string[] }} مصفوفة terms باسم اللفظ المخزّن
 */
export function containsProfanity(text) {
  const norm = normalize(String(text || ""))
  if (!norm) return { found: false, terms: [] }
  const terms = findTerms(norm)
  return { found: terms.length > 0, terms }
}

/**
 * يُخفي كل لفظ محظور في النص بعلامة «×××». المطابقة على الصورة المنوّعة،
 * فإن وُجد لفظ رجع النص المنوَّع المخفي (يتخلى عن التشكيل — مقبول في مسار
 * الاحتياط حيث الأولوية إخفاء اللفظ لا الحفاظ على الشكل)، وإلا رجع النص كما هو.
 * @param {string} text
 * @returns {{ text: string, removed: number }}
 */
export function maskProfanity(text) {
  const original = String(text || "")
  const normalized = normalize(original)
  if (!normalized) return { text: original, removed: 0 }
  let out = normalized
  let removed = 0
  const mask = (re) => {
    out = out.replace(re, () => {
      removed += 1
      return "×××"
    })
  }
  const legalContext = NABAB_LEGAL_CONTEXT.test(normalized)
  for (let i = 0; i < ARABIC_TERMS.length; i += 1) {
    const term = ARABIC_TERMS[i]
    if (term === NABAB && legalContext) continue
    mask(new RegExp(`(?<![${A}])${term}(?![${A}])`, "g"))
  }
  for (let i = 0; i < LATIN_TERMS.length; i += 1) {
    mask(new RegExp(`\\b${LATIN_TERMS[i]}\\b`, "gi"))
  }
  return { text: removed > 0 ? out : original, removed }
}
