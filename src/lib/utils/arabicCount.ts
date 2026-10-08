/**
 * مطابقة العدد للمعدود في العربية (الفصحى)، للعرض على البطاقات.
 *
 * القواعد المعتمدة:
 *   1      → المفرد الكامل مع كلمة «واحد»: «مصدر قانوني واحد»
 *   2      → المثنى الكامل بلا رقم: «مصدران قانونيان»
 *   3–10   → رقم + جمع: «10 فصول»، «3 مصادر قانونية»
 *   11+    → رقم + منصوب مفرد: «11 مصدراً قانونياً»، «250 مصطلحاً»
 *
 * لماذا لا نكتب «1 مصادر»؟ لأن الرقم 1 يعامل معاملة خاصة في العربية: الكلمة
 * تأتي مفردةً مع «واحد»، لا جمعاً مع رقم. وهذا ما يلاحظه طلبة القانون أولاً.
 */

export interface ArabicForms {
  /** المفرد مع «واحد» — يُعرض وحده (بلا رقم). */
  one: string
  /** المثنى الكامل — يُعرض وحده (بلا رقم). */
  two: string
  /** الجمع — يُسبق بالرقم. */
  few: string
  /** المنصوب المفرد — يُسبق بالرقم. */
  many: string
}

export function arabicCount(n: number, forms: ArabicForms): string {
  if (n === 1) return forms.one
  if (n === 2) return forms.two
  if (n >= 3 && n <= 10) return `${n} ${forms.few}`
  return `${n} ${forms.many}`
}

export const SOURCE_FORMS: ArabicForms = {
  one: "مصدر قانوني واحد",
  two: "مصدران قانونيان",
  few: "مصادر قانونية",
  many: "مصدراً قانونياً",
}

export const ARTICLE_FORMS: ArabicForms = {
  one: "فصل واحد",
  two: "فصلان",
  few: "فصول",
  many: "فصلاً",
}

export const TERM_FORMS: ArabicForms = {
  one: "مصطلح واحد",
  two: "مصطلحان",
  few: "مصطلحات",
  many: "مصطلحاً",
}
