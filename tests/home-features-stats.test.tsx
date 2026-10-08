import { readFileSync } from "node:fs"
import { renderToStaticMarkup } from "react-dom/server"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, test } from "vitest"
import counts from "@/data/counts.json"
import lexicon from "@/data/lexicon.json"
import { AnimatedCount } from "@/components/home/AnimatedCount"
import { HomeFeatures, featuresFor, type FeatureCounts } from "@/components/home/HomeFeatures"
import { HomeStatsBand } from "@/components/home/HomeStatsBand"

const HOME = readFileSync("src/pages/public/HomePage.tsx", "utf8")
const FEATURES_SRC = readFileSync("src/components/home/HomeFeatures.tsx", "utf8")
const ROUTES = readFileSync("src/routes/AppRoutes.tsx", "utf8")

const sample: FeatureCounts = { laws: 98, lexicon: 250, schools: 21, quizQuestions: 224 }

const renderIn = (node: React.ReactElement) => renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)

describe("ميزات الصفحة الرئيسية: صادقة عن ميزان", () => {
  test("لا تظهر العبارات المرفوضة ولا ادعاءات الدورات أو الأجهزة", () => {
    for (const bad of ["أساتذة خبراء", "جدول مرن", "دعم مستمر", "مسارات متنوعة", "من أي جهاز", "خبراء", "مرونة"]) {
      expect(FEATURES_SRC).not.toContain(bad)
    }
  })

  test("ست ميزات، كل واحدة برابط إلى صفحة موجودة فعلاً في المسارات", () => {
    const features = featuresFor(sample)
    expect(features).toHaveLength(6)
    for (const f of features) {
      const path = f.to.split("?")[0]
      expect(ROUTES).toContain(`path="${path}"`)
    }
  })

  test("لكل ميزة لون واحد مميز", () => {
    const solids = featuresFor(sample).map((f) => f.accent.solid)
    expect(new Set(solids).size).toBe(6)
  })

  test("الشارات من البيانات وبتصريف عربي صحيح", () => {
    const tags = featuresFor(sample).map((f) => f.tag)
    expect(tags).toEqual(["98 نصاً قانونياً", "250 مصطلحاً", "S1 — S6", "224 سؤالاً", "21 كلية", "بلا تسجيل"])
    expect(featuresFor({ ...sample, laws: 1 })[0].tag).toBe("نص قانوني واحد")
    expect(featuresFor({ ...sample, laws: 0 })[0].tag).toBeNull()
  })

  test("العنوان بالنص المطلوب مع «طالب القانون» بالأزرق", () => {
    const html = renderIn(<HomeFeatures counts={sample} />)
    expect(html).toContain('text-[#2563eb] dark:text-[#93c5fd]">طالب القانون</span>')
    expect(html).toContain("كل ما يحتاجه")
    expect(html).toContain("لماذا نحن")
  })

  test("كل بطاقة رابط كامل وفيها وصف ورابط CTA", () => {
    const html = renderIn(<HomeFeatures counts={sample} />)
    expect((html.match(/<a /g) ?? []).length).toBe(6)
    expect(html).toContain('href="/lexicon"')
    expect(html).toContain('href="/quiz"')
    expect(html).toContain('href="/saved"')
  })

  test("الصفحة تستعمل المكوّنين بدل القسم القديم", () => {
    expect(HOME).toContain("<HomeFeatures counts={counts} />")
    expect(HOME).toContain("<HomeStatsBand")
    expect(HOME).not.toContain("اكتشف المزايا المميزة")
  })
})

describe("شريط الأرقام", () => {
  test("لا يظهر «+8 مقال» ولا 500+", () => {
    expect(HOME).not.toContain("مقال قانوني")
    expect(HOME).not.toContain('"500+"')
  })

  test("يعرض الأرقام الأربعة من البيانات ويحذف الصفر", () => {
    const html = renderIn(
      <HomeStatsBand
        items={[
          { value: 0, label: "النصوص القانونية" },
          { value: 250, label: "المصطلحات القانونية" },
          { value: 21, label: "الكليات في الدليل" },
          { value: 224, label: "أسئلة التدريب" },
        ]}
      />,
    )
    expect(html).not.toContain("النصوص القانونية")
    expect(html).toContain("المصطلحات القانونية")
    expect(html).toContain("أسئلة التدريب")
    // الرقم النهائي موجود في HTML قبل أي JS (للزوار وmحركات البحث)
    expect(html).toContain(">250<")
  })

  test("يُخفى الشريط كله إن لم يبق رقم صالح", () => {
    expect(renderIn(<HomeStatsBand items={[{ value: 0, label: "x" }]} />)).toBe("")
  })

  test("العدّاد يكتب القيمة النهائية أولاً ويحترم تقليل الحركة", () => {
    expect(renderToStaticMarkup(<AnimatedCount value={98} />)).toContain(">98<")
    const src = readFileSync("src/components/home/AnimatedCount.tsx", "utf8")
    expect(src).toContain("IntersectionObserver")
    expect(src).toContain("prefers-reduced-motion")
  })

  test("الأرقام الواردة من counts.json صحيحة", () => {
    expect(counts.lexicon).toBe(250)
    expect(counts.lexiconTree).toBe(58)
    expect(counts.quizQuestions).toBe(224)
    expect(typeof counts.laws).toBe("number")
    expect(counts.lexiconTree).toBe(
      (lexicon as Array<{ legal_sources?: unknown[] }>).filter((t) => Array.isArray(t.legal_sources) && t.legal_sources.length > 0).length,
    )
  })
})
