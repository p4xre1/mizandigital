/**
 * أسئلة شائعة مُحيَّنة لنموذج «فريميوم» + إفصاح عن المؤسس + تكييف قانوني
 * مغربي صريح يحدّ من مخاطر المتابعة.
 *
 * ما نثبّته هنا ثلاثة أصناف:
 *   1) دقّة تجارية — لا ادّعاء «مجاني 100%» في أي مصدر يُشحن، والأسعار
 *      المذكورة في FAQ مطابقة لأرقام الخطط في الكود. وهذا ليس تجميلياً:
 *      الإشهار المضلّل معرّض للمتابعة بالقانون 31.08.
 *   2) إفصاح — من يقف وراء المنصة، وأنه طالب قانون لا محامٍ.
 *   3) تكييف قانوني — الإحالات على النصوص المغربية بأرقامها الموثّقة.
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
  test("سبع مجموعات و39 سؤالاً (كانت 5 و13)", () => {
    expect(groups.length).toBe(7)
    expect(items.length).toBe(39)
  })

  test("كل سؤال فريد وكل جواب وافٍ", () => {
    const qs = items.map((i) => i.question)
    expect(new Set(qs).size).toBe(qs.length)
    for (const i of items) {
      expect(i.answer.length, i.question).toBeGreaterThan(120)
      expect(i.answer.trim(), i.question).toBe(i.answer.trim())
    }
  })

  test("لا أحرف صينية متسللة في النص العربي", () => {
    expect(all).not.toMatch(/[\u4e00-\u9fff]/)
  })
})

describe("دقّة تجارية: لا ادّعاء مجانية كاملة", () => {
  test.each(SURFACES)("%s خالٍ من ادّعاء المجانية الكاملة", (file) => {
    const s = read(file)
    expect(s, "«مجانية 100%»").not.toContain("مجانية 100%")
    expect(s, "«منصة مجانية»").not.toContain("منصة مجانية")
    expect(s, "«دون دفع أي اشتراك»").not.toContain("دفع أي اشتراك")
  })

  test("FAQ تنفي المجانية الكاملة صراحةً وتذكر النموذج", () => {
    expect(all).toContain("لا. اعتمدت المنصة نموذج «فريميوم»")
    expect(all).toContain("بدل المجانية الكاملة التي كانت سائدة في مرحلة سابقة")
    expect(all).toContain("إخفاءه سيشكّل إشهاراً مضللاً")
  })

  test("الأسعار في FAQ مطابقة لأرقام الخطط في الكود", () => {
    const pricing = read("src/pages/admin/PricingManagementPage.tsx")
    // نفس الأرقام: 49 شهري / 399 سنوي / 500 / 7000 / 1000 هدية
    for (const n of ["49", "399", "500", "7000", "1000"]) {
      expect(pricing, `plan number ${n}`).toContain(n)
      expect(all, `faq number ${n}`).toContain(n)
    }
    expect(all).toContain("49 درهماً")
    expect(all).toContain("399 درهماً")
  })

  test("ما هو مجاني مذكور على وجه التحديد لا بإطلاق", () => {
    expect(all).toContain("التصفح والقراءة مجانيان")
    expect(all).toContain("المعجم القانوني")
    expect(all).toContain("أرشيف الفصول S1 إلى S6")
    expect(all).toContain("لا يُطلب منك حساب ولا بطاقة بنكية")
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

  test("القانون 31.08: حق التراجع والآجال", () => {
    expect(all).toContain("القانون رقم 31.08")
    expect(all).toContain("سبعة أيام كاملة")
    expect(all).toContain("ثلاثين يوماً")
    expect(all).toContain("المادة 36")
    expect(all).toContain("المادة 37")
    expect(all).toContain("خمسة عشر يوماً")
    // الاستثناء الذي ينطبق فعلاً على خدمة رقمية تُستهلك فوراً
    expect(all).toContain("الخدمات التي شُرع في تنفيذها بموافقة المستهلك")
  })

  test("باقي النصوص المرجعية", () => {
    for (const law of [
      "القانون رقم 53.05",
      "القانون رقم 09.08",
      "القانون رقم 2.00",
      "ظهير الالتزامات والعقود",
      "الفصل 230",
      "الفصلين 77 و78",
      "المادة 26 من مدونة التجارة",
    ]) {
      expect(all, law).toContain(law)
    }
  })

  test("ينفي صراحةً علاقة المحامي بالموكل والاستشارة", () => {
    expect(all).toContain("لا تقدّم المنصة ولا مؤسسها أي استشارة قانونية")
    expect(all).toContain("لا ينشئ بأي حال علاقة محامٍ بموكل")
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

  test("نطاق السعر يعكس الواقع لا «مجاني»", () => {
    expect(schema).toContain('priceRange: "0-399 MAD"')
    expect(schema).not.toContain('priceRange: "مجاني"')
  })

  test("الكتالوج يفصل المجاني من المدفوع", () => {
    expect(schema).toContain('"@type": "Offer", itemOffered: { "@type": "Service", name: "اشتراك ميزان برو الشهري" }, price: "49"')
    expect(schema).toContain('name: "اشتراك ميزان برو السنوي" }, price: "399"')
    expect(schema).toContain('price: "0", priceCurrency: "MAD"')
  })
})

describe("لا تضارب بين FAQ وباقي المنصة", () => {
  test("الحذف الذاتي وأجل الإمهال متسقان مع سياسة الخصوصية", () => {
    const policies = read("src/content/legal/policies.js")
    expect(all).toContain("ثلاثون يوماً")
    expect(policies).toContain("pending_deletion")
    // السجلات المالية تُجهَّل لا تُحذف — المادة 26 من مدونة التجارة
    expect(all).toContain("عشر سنوات")
  })

  test("وسيلة التواصل واحدة في كل الأسئلة", () => {
    const mentions = items.filter((i) => i.answer.includes("contact@mizan.page"))
    expect(mentions.length).toBeGreaterThanOrEqual(6)
  })

  test("الأداء عبر Stripe ولا تخزين لبيانات البطاقة", () => {
    expect(all).toContain("Stripe")
    expect(all).toContain("cus_")
    expect(all).toContain("لا تطلب ولا تعالج ولا تخزّن أرقام البطاقات البنكية")
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

  test.skipIf(!existsSync("dist/index.html"))("الرئيسية الثابتة لم تعد تدّعي المجانية الكاملة", () => {
    expect(read("dist/index.html")).not.toContain("مجانية 100%")
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
