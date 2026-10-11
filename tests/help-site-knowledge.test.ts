/**
 * معرفة الموقع في المساعد — tests/help-site-knowledge.test.ts
 *
 * المهن الأربع عشرة والكليات والفعاليات وبطاقتا النصين القانونيين مشتقة من ملفات
 * البيانات نفسها (careers.json / schools.json / events.json / data/laws). السؤال عن
 * مهنة أو كلية أو فعالية يُجاب من صفحتها، ولا تُزاحم هذه المدخلات تعريفات المعجم.
 */
import { describe, expect, test } from "vitest"
import careers from "../src/data/careers.json"
import events from "../src/data/events.json"
import schools from "../src/data/schools.json"
import { answerQuestion } from "../shared/help/answer.js"
import { CONSTITUTION_URL, FAMILY_CODE_URL } from "../shared/help/knowledge-legal.js"
import {
  CAREER_ENTRIES,
  EVENT_ENTRIES,
  LAW_OVERVIEW_ENTRIES,
  SCHOOL_ENTRIES,
  SITE_ENTRIES,
} from "../shared/help/knowledge-site.js"
import { allEntries } from "../shared/help/knowledge.js"

const firstSource = (question: string) => {
  const result = answerQuestion(question)
  expect(result, `سؤال: ${question}`).not.toBeNull()
  expect(result!.mode, `سؤال: ${question}`).toBe("answer")
  return result!.sources[0]
}

describe("بنية معرفة الموقع", () => {
  test("مدخل لكل مهنة وكلية وفعالية، وبطاقتان للنصين", () => {
    expect(CAREER_ENTRIES).toHaveLength(careers.length)
    expect(careers).toHaveLength(14)
    expect(SCHOOL_ENTRIES).toHaveLength(schools.length)
    expect(EVENT_ENTRIES).toHaveLength(events.length)
    expect(LAW_OVERVIEW_ENTRIES.map((e) => e.url)).toEqual([CONSTITUTION_URL, FAMILY_CODE_URL])
  })

  test("كل مدخل بمعرّف فريد ونص وكلمات مفتاحية ورابط إلى صفحته", () => {
    const ids = allEntries().map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const entry of SITE_ENTRIES) {
      expect(entry.body.length, entry.id).toBeGreaterThan(10)
      expect(entry.keywords.length, entry.id).toBeGreaterThan(0)
      expect(entry.url, entry.id).toMatch(/^\/(careers|schools|events|pro-tools\/references)\/[^/\s]+$/)
    }
    expect(CAREER_ENTRIES.map((e) => e.url)).toEqual(careers.map((c) => `/careers/${c.slug}`))
    expect(SCHOOL_ENTRIES.map((e) => e.url)).toEqual(schools.map((s) => `/schools/${s.slug}`))
  })

  test("مسجلة في allEntries", () => {
    const all = new Set(allEntries())
    for (const entry of SITE_ENTRIES) expect(all.has(entry), entry.id).toBe(true)
  })
})

describe("أسئلة الموقع تُجاب من صفحاتها", () => {
  test("المهن", () => {
    expect(firstSource("ما هي شروط الولوج إلى مهنة العدل؟").url).toBe("/careers/adoul")
    expect(firstSource("ما هو المفوض القضائي؟").url).toBe("/careers/commissaire-judiciaire")
    expect(firstSource("مسؤول الامتثال").url).toBe("/careers/responsable-conformite")
  })

  test("الكليات حسب المدينة", () => {
    expect(firstSource("ما هي كلية الحقوق بطنجة؟").url).toBe("/schools/fsjes-tangier")
    expect(firstSource("كلية الحقوق بتطوان").url).toBe("/schools/fsjes-tetouan")
    expect(firstSource("هل توجد كلية حقوق في أكادير؟").url).toBe("/schools/fsjes-agadir")
  })

  test("الفعاليات", () => {
    const moot = events.find((e) => e.title.includes("للمحاكمة الافتراضية"))!
    expect(firstSource("المسابقة الوطنية للمحاكمة الافتراضية").url).toBe(`/events/${moot.id}`)
  })

  test("السؤال عن النص نفسه يُجاب ببطاقته", () => {
    expect(firstSource("ما هو الدستور المغربي؟").url).toBe(CONSTITUTION_URL)
    expect(firstSource("ما هي مدونة الأسرة؟").url).toBe(FAMILY_CODE_URL)
  })

  test("تعريفات المعجم تبقى للمعجم (بما فيها المصطلحات المضافة)", () => {
    expect(firstSource("ما هو الصداق؟").url).toBe("/lexicon/الصداق")
    expect(firstSource("ما هو رئيس الحكومة؟").url).toBe("/lexicon/رئيس-الحكومة")
    expect(firstSource("ما معنى الظهير الشريف؟").url).toBe("/lexicon/الظهير-الشريف")
  })
})
