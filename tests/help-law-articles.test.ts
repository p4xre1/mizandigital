/**
 * المسار القانوني الرقمي في مساعد الموقع — tests/help-law-articles.test.ts
 *
 * سؤال يطلب رقماً محدداً ("المادة 113"، "الفصل 71" — بالأرقام اللاتينية
 * أو العربية) يجب أن يُجاب بنص المادة/الفصل الكامل من المدخلات القانونية
 * الموثقة، مع اسم القانون كمصدر — حتى لو أخفى الاسترجاع الغامض المدخل.
 */
import { test, expect, describe } from "vitest"
import constitution from "../data/laws/constitution-2011.articles.json"
import familyCode from "../data/laws/mudawana-70-03.articles.json"
import { answerQuestion } from "../shared/help/answer.js"
import {
  CONSTITUTION_LAW_TITLE,
  CONSTITUTION_URL,
  FAMILY_CODE_LAW_TITLE,
  FAMILY_CODE_URL,
  findLegalArticle,
  LEGAL_CONSTITUTION_ENTRIES,
  LEGAL_ENTRIES,
  LEGAL_FAMILY_CODE_ENTRIES,
} from "../shared/help/knowledge-legal.js"
import { allEntries, KNOWLEDGE_GROUPS } from "../shared/help/knowledge.js"

const constArticle = (n: number) => constitution.articles.find((a) => a.number === n)!
const famArticle = (n: number) => familyCode.articles.find((a) => a.number === n)!

/** أول 60 حرفاً من نص المادة — تحقق حرفية بلا تضمين النصوص في الاختبار. */
const head = (text: string) => text.slice(0, 60)

describe("بنية المدخلات القانونية", () => {
  test("180 مدخلاً للدستور و399 للمدونة، وكل مدخل بحجم النص الأصلي", () => {
    expect(LEGAL_CONSTITUTION_ENTRIES).toHaveLength(180)
    expect(LEGAL_FAMILY_CODE_ENTRIES).toHaveLength(399)
    expect(LEGAL_ENTRIES).toHaveLength(579)
    for (const entry of LEGAL_CONSTITUTION_ENTRIES) {
      expect(entry.body).toBe(constArticle(Number(entry.id.split("-").pop()!)).text)
    }
    for (const entry of LEGAL_FAMILY_CODE_ENTRIES) {
      expect(entry.body).toBe(famArticle(Number(entry.id.split("-").pop()!)).text)
    }
  })

  test("المجموعة القانونية مسجلة في allEntries ومجموعات المعرفة (9 مجموعات)", () => {
    expect(KNOWLEDGE_GROUPS.map((g) => g.name)).toEqual([
      "curated",
      "lexicon",
      "faq",
      "legal_constitution",
      "legal_family_code",
      "law_overview",
      "careers",
      "schools",
      "events",
    ])
    const all = allEntries()
    const isLegal = (e: { id: string }) => e.id.startsWith("legal-const-") || e.id.startsWith("legal-fam-")
    // لا معرّفين متطابقين، وكل مدخل قانوني مسجل في allEntries
    expect(new Set(all.map((e) => e.id)).size).toBe(all.length)
    expect(all.filter(isLegal)).toHaveLength(579)
  })

  test("المادة 383 الفارغة في المصدر بلا مدخل", () => {
    expect(famArticle(383)).toBeUndefined()
    expect(LEGAL_FAMILY_CODE_ENTRIES.find((e) => e.id === "legal-fam-383")).toBeUndefined()
    expect(findLegalArticle("ماذا تنص المادة 383 من مدونة الأسرة؟")).toBeNull()
  })
})

describe("findLegalArticle: التمييز بين القانونين والأرقام العربية", () => {
  test('"المادة N" → مدونة الأسرة، "الفصل N" → دستور 2011', () => {
    expect(findLegalArticle("المادة 113 من مدونة الأسرة")).toMatchObject({ law: "family_code", number: 113 })
    expect(findLegalArticle("ما هو الفصل 71 من دستور 2011")).toMatchObject({ law: "constitution", number: 71 })
  })

  test("الأرقام العربية-الهندية تُقرأ بنفس الطريقة", () => {
    expect(findLegalArticle("المادة ١١٣ من المدونة")).toMatchObject({ law: "family_code", number: 113 })
    expect(findLegalArticle("الفصل ٧١ من الدستور")).toMatchObject({ law: "constitution", number: 71 })
  })

  test("رقم خارج نطاق القانون → null", () => {
    expect(findLegalArticle("الفصل 999 من الدستور")).toBeNull()
    expect(findLegalArticle("المادة 401 من مدونة الأسرة")).toBeNull()
  })
})

describe("إجابات المسار الرقمي — 10 فحوص منتقاة من القانونين", () => {
  const checks: Array<{ label: string; question: string; text: string; lawTitle: string }> = [
    { label: "دستور: الفصل 1 (نظام الحكم)", question: "ماذا ينص الفصل 1 من دستور 2011؟", text: constArticle(1).text, lawTitle: CONSTITUTION_LAW_TITLE },
    { label: "دستور: الفصل 41 (السيادة)", question: "ما نص الفصل 41 من الدستور؟", text: constArticle(41).text, lawTitle: CONSTITUTION_LAW_TITLE },
    { label: "دستور: الفصل 71 (الحقوق والحريات)", question: "الفصل 71 من دستور 2011", text: constArticle(71).text, lawTitle: CONSTITUTION_LAW_TITLE },
    { label: "دستور: الفصل 180 (الأولوية)", question: "ما نص الفصل 180 من دستور 2011؟", text: constArticle(180).text, lawTitle: CONSTITUTION_LAW_TITLE },
    { label: "مدونة: المادة 1 (التسمية)", question: "ماذا تنص المادة 1 من مدونة الأسرة؟", text: famArticle(1).text, lawTitle: FAMILY_CODE_LAW_TITLE },
    { label: "مدونة: المادة 19 (العقد)", question: "المادة 19 من مدونة الأسرة", text: famArticle(19).text, lawTitle: FAMILY_CODE_LAW_TITLE },
    { label: "مدونة: المادة 94 (التطليق)", question: "ما هو نص المادة 94 من مدونة الأسرة؟", text: famArticle(94).text, lawTitle: FAMILY_CODE_LAW_TITLE },
    { label: "مدونة: المادة 113 (انحلال الزوجية)", question: "المادة 113 من مدونة الأسرة (70.03)", text: famArticle(113).text, lawTitle: FAMILY_CODE_LAW_TITLE },
    { label: "مدونة: المادة 321 (التركة)", question: "ما نص المادة 321 من مدونة الأسرة؟", text: famArticle(321).text, lawTitle: FAMILY_CODE_LAW_TITLE },
    { label: "مدونة: المادة 400 (المذاهب)", question: "ماذا تنص المادة 400 من مدونة الأسرة؟", text: famArticle(400).text, lawTitle: FAMILY_CODE_LAW_TITLE },
  ]

  for (const check of checks) {
    test(check.label, () => {
      const result = answerQuestion(check.question)
      expect(result, `سؤال: ${check.question}`).not.toBeNull()
      expect(result!.mode).toBe("answer")
      // النص الكامل حرفياً (أو على الأقل مفتحه الحرفي) في الجواب
      expect(result!.answer).toContain(head(check.text))
      // المصدر: اسم القانون، ورابط صفحة ذلك النص في خريطة الإحالات
      const lawUrl = check.lawTitle === CONSTITUTION_LAW_TITLE ? CONSTITUTION_URL : FAMILY_CODE_URL
      expect(result!.sources[0]).toMatchObject({ url: lawUrl })
      expect(result!.sources[0].title).toBe(check.lawTitle)
      // المسار القانوني أو استرجاع المدخل القانوني — لا "لا يوجد"
      expect(["legal_article", "site_content"]).toContain(result!.reason)
    })
  }
})
