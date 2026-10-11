// shared/help/knowledge-legal.js
//
// المدخلات القانونية للمساعد: نص كل فصل/مادة من دستور 2011 ومدونة الأسرة (70.03)،
// مبنيان حرفياً من data/laws/*.articles.json (نفس المصدر الذي تُبنى منه
// بنك الأسئلة وترقيات Supabase).
//
// كل مدخل موسوم بعنوان رقمي ("المادة 113 من مدونة الأسرة") ليُستأنس من
// سؤال يطلب رقماً محدداً حتى لو أخفاه ترتيب الاسترجاع الغامض.
//
// ملاحظة: المادة 383 من مدونة الأسرة فارغة في النص المصدر، لذلك لا يوجد لها
// مدخل ولا يُجاب عنها.

import constitution from "../../data/laws/constitution-2011.articles.json"
import familyCode from "../../data/laws/mudawana-70-03.articles.json"

/** عنوان القانون كما يظهر في مصادر الجواب. */
export const CONSTITUTION_LAW_TITLE = "دستور المملكة المغربية (2011)"
export const FAMILY_CODE_LAW_TITLE = "مدونة الأسرة (القانون 70.03)"

/** رابط عرض القوانين في أدوات المحترف — موجود في AppRoutes. */
const LEGAL_URL = "/pro-tools/references"

function entryFor(lawId, lawTitle, labelPrefix, article) {
  const number = article.number
  const title = `${labelPrefix} ${number} من ${lawTitle.split(" (")[0]}`
  return {
    id: `legal-${lawId}-${number}`,
    title,
    url: LEGAL_URL,
    sourceTitle: lawTitle,
    keywords: [
      title,
      `${labelPrefix} ${number}`,
      String(number),
      lawTitle.split(" (")[0],
      "نص قانوني",
    ],
    body: article.text,
  }
}

/** 180 مدخلاً — واحد لكل فصل من دستور 2011. */
export const LEGAL_CONSTITUTION_ENTRIES = constitution.articles.map((article) =>
  entryFor("const", CONSTITUTION_LAW_TITLE, "الفصل", article),
)

/** 399 مدخلاً — واحد لكل مادة من مدونة الأسرة (383 فارغة في المصدر). */
export const LEGAL_FAMILY_CODE_ENTRIES = familyCode.articles.map((article) =>
  entryFor("fam", FAMILY_CODE_LAW_TITLE, "المادة", article),
)

/** كل المدخلات القانونية (579). تُسجَّل في allEntries() للمساعدة على الاسترجاع. */
export const LEGAL_ENTRIES = [...LEGAL_CONSTITUTION_ENTRIES, ...LEGAL_FAMILY_CODE_ENTRIES]

/* ------------------------------------------------------------------ *\
 * المسار الرقمي: سؤال يطلب رقماً محدداً ← المدخل نفسه
 * ------------------------------------------------------------------ */

/** تحويل الأرقام العربية-الهندية (٠-٩) إلى لاتينية. */
function toLatinDigits(value) {
  return String(value).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
}

/**
 * يبحث في السؤال عن طلب رقم محدد:
 *   "المادة 113" (بالأرقام اللاتينية أو العربية)  ← مدونة الأسرة
 *   "الفصل 71"                                    ← دستور 2011
 *
 * @param {string} text
 * @returns {{ entry: object, lawTitle: string, number: number, law: "constitution" | "family_code" } | null}
 */
export function findLegalArticle(text) {
  if (typeof text !== "string" || text.length === 0) return null
  const normalized = toLatinDigits(text)
  const material = normalized.match(/المادة\s+(\d{1,3})/)
  const fasl = normalized.match(/الفصل\s+(\d{1,3})/)
  // مادة بلا فصل، أو فصل بلا مادة — لا يلبث النص أن يخلط بين القانونين.
  const token = material ? { kind: "material", number: Number(material[1]) } : fasl ? { kind: "fasl", number: Number(fasl[1]) } : null
  if (!token) return null

  if (token.kind === "material") {
    const entry = LEGAL_FAMILY_CODE_ENTRIES.find((e) => e.id === `legal-fam-${token.number}`)
    if (entry) return { entry, lawTitle: FAMILY_CODE_LAW_TITLE, number: token.number, law: "family_code" }
    return null
  }
  const entry = LEGAL_CONSTITUTION_ENTRIES.find((e) => e.id === `legal-const-${token.number}`)
  if (entry) return { entry, lawTitle: CONSTITUTION_LAW_TITLE, number: token.number, law: "constitution" }
  return null
}
