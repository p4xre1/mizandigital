/**
 * شكل سجلات بيانات المنصة — مصدر واحد لقاعدتين يستعملهما كل من doctor.mjs
 * وvalidate-data.mjs.
 *
 * لماذا ملف مشترك؟ لأن القاعدة كانت مكرّرة في السكربتين بقائمة مفاتيح ناقصة،
 * فانحرفا معاً عن البيانات الحقيقية وأعطيا نتائج خاطئة:
 *   • quiz-questions.json: السجل يعرّف نصّه في `question`، والقائمة لم تكن
 *     تعرفه ⇒ 224 خطأ وهمياً.
 *   • career-categories.json: العنوان في `title_ar`، ولم يكن معروفاً ⇒ فشل
 *     المدقّق على بيانات سليمة.
 * القاعدة الآن واحدة: أي سجل بمفتاح معرّف ومفتاح نصّ من القائمتين أدناه.
 *
 * ملاحظة مقصودة: لا نعتبر `summary`/`description` «نصاً» كافياً — سجل بلا
 * عنوان أو مصطلح لا يمكن عرضه في أي قائمة، وهو بالضبط ما نريد كشفه.
 */

/** مفاتيح المعرّف المقبولة. */
export const ID_KEYS = ["id", "slug", "key", "code"]

/** مفاتيح النص/العنوان المقبولة (عربية وفرنسية وإنجليزية). */
export const LABEL_KEYS = [
  // عام
  "title",
  "name",
  "label",
  "heading",
  "term",
  "word",
  // مُعرَّب/مفرنس
  "title_ar",
  "title_fr",
  "term_ar",
  "term_fr",
  "name_ar",
  "name_fr",
  // نصوص الأسئلة (quiz-questions.json)
  "question",
  "prompt",
]

const has = (item, keys) =>
  Boolean(item) &&
  typeof item === "object" &&
  keys.some((key) => typeof item[key] === "string" && item[key].trim().length > 0)

/** هل السجل معرّف صالح (id/slug/key/code)؟ */
export const hasIdentifier = (item) => has(item, ID_KEYS)

/** هل السجل نصّ صالح (عنوان/مصطلح/سؤال…)؟ */
export const hasLabel = (item) => has(item, LABEL_KEYS)

/**
 * سجل حاوٍ: عنوان + مصفوفة أبناء (faq.json: { title, items: [...] }).
 *
 * الحاويات لا تحتاج معرّفاً: لا أحد يبني لها رابطاً ولا يخزّنها في قاعدة
 * بيانات، وعنوانها وحدها هي مفتاحها في الواجهة. اشتراط `id` عليها كان
 * يُفشل المدقّق على بنية سليمة ومقصودة.
 */
export const isContainer = (item) => {
  if (!hasLabel(item)) return false
  return ["items", "data", "faqs", "questions"].some(
    (key) => Array.isArray(item?.[key]) && item[key].length > 0,
  )
}

/** هل السجل صالح للعرض؟ حاوٍ بعنوان، أو سجل بمعرّف ونصّ. */
export const isValidRecord = (item) =>
  isContainer(item) || (hasIdentifier(item) && hasLabel(item))

