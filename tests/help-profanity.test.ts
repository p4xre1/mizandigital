import { describe, expect, test } from "vitest"
import {
  containsProfanity,
  maskProfanity,
  profanityTerms,
} from "../shared/help/profanity.js"
import { allEntries } from "../shared/help/knowledge.js"
import { answerQuestion } from "../shared/help/answer.js"
import { runPipeline, sanitizeAnswerResult } from "../shared/help/pipeline.js"
import { validateQaDraft } from "../shared/help/cms.js"

describe("فلتر الألفاظ المسيئة: المطابقة", () => {
  test("14 لفظاً مخزّناً، وكلها تُكتشف في سياق شتيمة", () => {
    const terms = profanityTerms()
    expect(terms).toHaveLength(14)
    expect(new Set(terms).size).toBe(14)

    const contexts: Record<string, string> = {
      "عاهر": "انت عاهر بلا شك",
      "عاهره": "اتهاموها عاهره قدام الناس",
      "زاني": "ادانه القاضي زاني بلا دليل",
      "زانيه": "قالوا فيها زانيه بلا دليل",
      "دج": "قالها دج فغضب",
      "عياش": "ماشي راجل، عياش",
      "خسيس": "سلوك خسيس فعلا",
      "سافل": "تصريح سافل منك",
      "دنيه": "هدف دنيه لهذا الطلب",
      "نصاب": "هذا الشخص نصاب ومؤكد",
      "غبي": "سؤال غبي من البعض",
      idiot: "what an idiot",
      stupid: "a stupid mistake",
      dumb: "pretty dumb idea",
    }
    for (const term of terms) {
      expect(containsProfanity(contexts[term]).found, `لم يُكتشف: ${term}`).toBe(true)
    }
  })

  test("حدود الكلمات العربية: لا يلتهم كلمة أطول ولا مشتقا", () => {
    expect(containsProfanity("اشتريت دجاجا مشويا").found).toBe(false)
    expect(containsProfanity("تداول عياشين المنطقة الخبر").found).toBe(false)
    // «الزاني» في نصوص الإثبات الشرعي ليست شتيمة موجّهة
    expect(containsProfanity("شهادة الزاني لا تقبل").found).toBe(false)
    expect(containsProfanity("زانياً بعد زانياً").found).toBe(false)
  })

  test("حدود الكلمات اللاتينية: idiotic وdumbly كلمات أخرى لا تُحسب", () => {
    expect(containsProfanity("he was idiotic once").found).toBe(false)
    expect(containsProfanity("she played dumbly").found).toBe(false)
    expect(containsProfanity("what an idiot, a stupid one").found).toBe(true)
  })

  test("«نصاب» ثنائية المعنى: شتيمة بلا سياق، ومصطلح مجلس مع السياق", () => {
    expect(containsProfanity("انت نصاب وسارق").found).toBe(true)
    expect(containsProfanity("تصدر المحكمة قراراتها وفق نصاب لا يحتسب فيه غير المنتخبين").found).toBe(false)
    expect(
      containsProfanity("لا يُعقد المجلس إلا بحضور النصاب القانوني للأعضاء").found,
    ).toBe(false)
  })

  test("maskProfanity يُخفي اللفظ ويحفظ سائر النص، ويحترم استثناء السياق", () => {
    const r = maskProfanity("هذا دج، وذا عياش في آن واحد")
    expect(r.removed).toBe(2)
    expect(r.text).toBe("هذا ××× وذا ××× في ان واحد")
    expect(maskProfanity("تصدر المحكمة قراراتها وفق نصاب").removed).toBe(0)
    expect(maskProfanity("نص سليم").text).toBe("نص سليم")
  })
})

describe("فلتر الألفاظ المسيئة: الكوربوس النظيف", () => {
  test("مئات المدخلات (معجم 325 + مدونان + أسئلة شائعة + مختارات) بلا أي راية", () => {
    const entries = allEntries()
    expect(entries.length).toBeGreaterThanOrEqual(800)
    const flagged: string[] = []
    for (const e of entries) {
      const blob = `${e.title || ""} ${(e.keywords || []).join(" ")} ${e.body || ""}`
      if (containsProfanity(blob).found) flagged.push(e.id)
    }
    expect(flagged).toEqual([])
  })
})

describe("فلتر الألفاظ المسيئة: التفعيل في الخطوط الثلاث", () => {
  test("الخرج النهائي المحمّل لفظاً محظوراً يُحظر في sanitizeAnswerResult", () => {
    const result = sanitizeAnswerResult(
      {
        mode: "answer",
        answer: "الزائر قال انك دج",
        sources: [{ title: "الأرشيف", url: "/archive" }],
      },
      "نعتذر عن هذا الطلب.",
    )
    expect(result.mode).toBe("blocked")
    expect(result.reason).toBe("profane_output")
    expect(result.sources).toEqual([])
  })

  test("مدخل مشرف محمّل لفظاً يُسقط: الجواب لا يأتي منه", () => {
    const dirty = {
      id: "cms-dirty",
      title: "المقياس البنفسجي",
      keywords: ["المقياس", "البنفسجي"],
      body: "انت دج وكل كلامك باطل",
      url: "/faq",
      sourceTitle: "أسئلة شائعة",
    }
    const result = answerQuestion("ما هو المقياس البنفسجي؟", {
      customEntries: [dirty],
    })
    // المداخلة المسيئة لا تُجاب — ولا بديل في الموقع فـ not_found
    expect(result?.mode).toBe("not_found")
    expect(result?.answer).not.toContain("دج")
  })

  test("runPipeline: سؤال يطابق مدخلاً محمّلاً لا يوصل لفظاً للزائر", () => {
    const dirty = {
      id: "cms-dirty-2",
      title: "المقياس البنفسجي",
      keywords: ["المقياس", "البنفسجي"],
      body: "انت عياش وما تعرف شي",
      url: "/faq",
      sourceTitle: "أسئلة شائعة",
    }
    const r = runPipeline("ما هو المقياس البنفسجي؟", { customEntries: [dirty] })
    expect(r.mode).toBe("not_found")
  })

  test("validateQaDraft: رفض الحفظ عند وجود لفظ محظور في السؤال أو الجواب", () => {
    expect(validateQaDraft({ question: "ما تعريف التقادم؟", answer: "انت غبي إن تسأل" })).not.toBeNull()
    expect(validateQaDraft({ question: "سؤال دج", answer: "جواب طويل وكافي للاختبار" })).not.toBeNull()
    expect(
      validateQaDraft({
        question: "ما تعريف التقادم القانوني؟",
        answer: "التقادم مدة يكتسب فيها الحق أثره أو يسقط به.",
      }),
    ).toBeNull()
    // الفصل 130 من الدستور يُحفظ ويُجاب كما هو: استثناء السياق يعمل
    expect(
      containsProfanity("تصدر المحكمة قراراتها وفق نصاب لا يحتسب فيه الأعضاء").found,
    ).toBe(false)
  })
})
