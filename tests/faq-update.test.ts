/**
 * يثبت هذا الملف دقة FAQ المجانية بالكامل، وإفصاح المؤسس، والتكييف القانوني المغربي.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { describe, expect, test } from "vitest"
import faq from "@/data/faq.json"

const read = (p: string) => readFileSync(p, "utf8")

const groups = faq as Array<{ title: string; items: Array<{ question: string; answer: string }> }>
const items = groups.flatMap((g) => g.items)
const all = items.map((i) => `${i.question}\n${i.answer}`).join("\n")

/** المصادر المشحونة التي كانت تحمل ادّعاء المجانية الكاملة. */
const SURFACES = [
  "index.html",
  "src/pages/public/HomePage.tsx",
  "src/components/seo/SchemaOrg.tsx",
  "src/lib/seo/schema.ts",
  "src/layouts/PublicNavigation.tsx",
  "scripts/prerender.mjs",
]

describe("بنية الأسئلة الشائعة", () => {
  test("سبع مجموعات و34 سؤالاً", () => {
    expect(groups.length).toBe(7)
    expect(items.length).toBe(34)
  })

  test("كل سؤال فريد وكل جواب وافٍ", () => {
    const qs = items.map((i) => i.question)
    expect(new Set(qs).size).toBe(qs.length)
    for (const i of items) {
      expect(i.answer.length, i.question).toBeGreaterThan(80)
      expect(i.answer.trim(), i.question).toBe(i.answer.trim())
    }
  })

  test("لا أحرف صينية متسللة في النص العربي", () => {
    expect(all).not.toMatch(/[\u4e00-\u9fff]/)
  })
})

describe("دقّة تجارية: كل الموارد مجانية بلا إعلانات", () => {
  test("FAQ تصرّح بإتاحة الموارد التعليمية للجميع دون أسعار أو عروض", () => {
    expect(all).toContain("نعم. ميزان الرقمية منصة تعليمية مجانية بالكامل")
    expect(all).toContain("جميع موارد وأدوات ميزان التعليمية متاحة لكل الزوار")
    expect(all).not.toMatch(/(?:\d+\s*(?:د\.م|MAD)|شراء|اشتراك نشط|باقة مدفوعة)/)
  })

  test("كل أسطح العرض الرئيسية تعكس المجانية وعدم الإعلانات", () => {
    for (const file of SURFACES) {
      const source = read(file)
      expect(source, file).toMatch(/مجاني|مجانية/)
    }
    expect(read("src/lib/seo/schema.ts")).not.toMatch(/priceRange|priceCurrency|price:\s*"/)
    expect(read("src/pages/public/PricingPage.tsx")).not.toMatch(/(?:0|49|99|199|399)\s*(?:د\.م|MAD)|priceRange|priceCurrency/)
  })

  test("الموارد التعليمية العامة متاحة للزوار", () => {
    expect(all).toContain("جميع موارد وأدوات ميزان التعليمية متاحة لكل الزوار")
    expect(all).toContain("المعجم القانوني")
    expect(all).toContain("الأرشيف الدراسي من S1 إلى S6")
  })
})

describe("الإفصاح عمن يقف وراء المنصة", () => {
  test("اسم المؤسس ومدينته وتخصصه ومستواه", () => {
    expect(all).toContain("محمد رضا ياسين")
    expect(all).toContain("طنجة")
    expect(all).toContain("القانون الخاص")
    expect(all).toContain("السنة الثالثة")
    expect(all).toContain("سلك الإجازة")
  })

  test("مجموعة مستقلة بعنوان «من وراء المنصة»", () => {
    expect(groups.map((g) => g.title)).toContain("من وراء المنصة")
  })

  test("يصرّح بأنه ليس محامياً — وهو جوهر الدفاع", () => {
    expect(all).toContain("طالب قانون ولم يبلغ بعد سن التقييد في جدول هيئة للمحامين")
    expect(all).toContain("لا، وهذا أمر نصرّح به بوضوح")
  })

  test("الهوية نفسها مبثوثة في البيانات المهيكلة لا في FAQ وحدها", () => {
    const schema = read("src/lib/seo/schema.ts")
    expect(schema).toContain("محمد رضا ياسين")
    expect(schema).toContain("طالب بالسنة الثالثة من سلك الإجازة في القانون الخاص")
    expect(schema).toContain("ليس محامياً مقيّداً")
  })
})

describe("التكييف القانوني المغربي", () => {
  test("القانون 28.08 ومهنة المحاماة: المادة 2 والبند 5 والمادة 99", () => {
    expect(all).toContain("القانون رقم 28.08")
    expect(all).toContain("الظهير الشريف رقم 1.08.101")
    expect(all).toContain("الجريدة الرسمية عدد 5680")
    expect(all).toContain("المادة 2")
    expect(all).toContain("البند 5")
    expect(all).toContain("المادة 99")
    expect(all).toContain("الفصل 381 من القانون الجنائي")
  })

  test("القانون 31.08 مذكور ضمن حقوق المستهلك", () => {
    expect(all).toContain("القانون رقم 31.08")
    expect(all).toContain("حقوق مقررة قانوناً")
    expect(all).toContain("ولا يجوز حرمانه منها باتفاق")
  })

  test("باقي النصوص المرجعية", () => {
    for (const law of [
      "القانون رقم 53.05",
      "القانون رقم 09.08",
      "القانون رقم 2.00",
      "ظهير الالتزامات والعقود",
      "الفصل 230",
      "الفصلين 77 و78",
    ]) {
      expect(all, law).toContain(law)
    }
  })

  test("ينفي صراحةً علاقة المحامي بالموكل والاستشارة", () => {
    expect(all).toContain("لا تقدّم المنصة ولا مؤسسها أي استشارة قانونية")
    expect(all).toContain("ولا تنشئ أي علاقة محامٍ بموكل")
  })

  test("لا يتنصّل من الضمانات الآمرة — تنصّل مطلق يُبطل نفسه", () => {
    expect(all).toContain("لا يُفهم من هذا أي تنصّل من المسؤولية التقصيرية")
    expect(all).toContain("لا يجوز الاتفاق على مخالفتها")
  })

  test("مجموعة مستقلة للوضع القانوني وحدود المسؤولية", () => {
    expect(groups.map((g) => g.title)).toContain("الوضع القانوني وحدود المسؤولية")
  })
})

describe("البيانات المهيكلة لا تدّعي صفة خدمة قانونية", () => {
  const schema = read("src/lib/seo/schema.ts")

  test("النوع EducationalOrganization لا LegalService", () => {
    expect(schema).toContain('"@type": "EducationalOrganization"')
    expect(schema).not.toContain('"@type": "LegalService"')
  })

  test("يؤكد إتاحة المنصة دون نشر أسعار أو عروض تجارية", () => {
    expect(schema).toContain("isAccessibleForFree: true")
    expect(schema).not.toMatch(/priceRange|priceCurrency|price:\s*"|OfferCatalog/)
    expect(schema).not.toContain("اشتراك ميزان برو")
  })
})

describe("لا تضارب بين FAQ وباقي المنصة", () => {
  test("الحذف الذاتي وأجل الإمهال متسقان مع سياسة الخصوصية", () => {
    const policies = read("src/content/legal/policies.js")
    expect(all).toContain("ثلاثون يوماً")
    expect(policies).toContain("مهلة تراجع 30 يوماً")
    // تُذكر تفاصيل الاحتفاظ التاريخي في سياسة الخصوصية لا في FAQ.
    expect(policies).toContain("المادة 26 من مدونة التجارة")
    expect(policies).toContain("عشر سنوات")
  })

  test("وسيلة التواصل واحدة في كل الأسئلة", () => {
    const mentions = items.filter((i) => i.answer.includes("contact@mizan.page"))
    expect(mentions.length).toBeGreaterThanOrEqual(6)
  })

  test("لا تحوّل FAQ إلى عرض مالي؛ والإفصاح التاريخي محصور في سياسة الخصوصية", () => {
    expect(all).not.toMatch(/(?:سجل معاملة تاريخية|مدفوعات جديدة|Stripe|\d+\s*(?:د\.م|MAD))/)
    expect(read("src/content/legal/policies.js")).toContain("سجلات تاريخية محدودة")
    expect(read("src/content/legal/policies.js")).not.toContain("Stripe")
  })
})

const hasDist = existsSync("dist/faq.html")

describe("صفحة /faq المهيَّأة مسبقاً", () => {
  test.skipIf(!hasDist)("تحمل الأسئلة الجديدة والنفي القانوني", () => {
    const html = read("dist/faq.html")
    expect(html).toContain("محمد رضا ياسين")
    expect(html).toContain("القانون رقم 28.08")
    expect(html).toContain("من وراء المنصة")
    expect(html).not.toContain("مجانية 100%")
  })

  test.skipIf(!existsSync("dist/index.html"))("الرئيسية الثابتة تذكر أن المنصة مجانية", () => {
    expect(read("dist/index.html")).toContain("مجانية بالكامل")
    expect(read("dist/index.html")).not.toContain("Mizan Pro")
  })

  test.skipIf(!existsSync("dist/assets"))("الحزم المشحونة خالية من الادّعاء القديم", () => {
    const js = readdirSync("dist/assets")
      .filter((f) => f.endsWith(".js"))
      .map((f) => read(`dist/assets/${f}`))
      .join("\n")
    expect(js).not.toContain("مجانية 100%")
    expect(js).toContain("محمد رضا ياسين")
  })
})
