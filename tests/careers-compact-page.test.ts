import { readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"

// نتحقق من الشيفرة لا من التعليق التوضيحي أعلى الملف
const CARD = readFileSync("src/components/careers/CareerCard.tsx", "utf8").replace(/\/\*\*[\s\S]*?\*\//, "")
const HUB = readFileSync("src/pages/public/careers/CareersPage.tsx", "utf8")
const NEARBY = readFileSync("src/components/careers/NearbyLawSchools.tsx", "utf8")

describe("صفحة المسارات: بطاقات مختصرة بلا تكرار", () => {
  test("البطاقة لا تكرّر طريقة الولوج ولا العمل الحر ولا شارة التحقق", () => {
    expect(CARD).not.toContain("طريقة الولوج")
    expect(CARD).not.toContain("العمل الحر")
    expect(CARD).not.toContain("CAREERS_VERIFY_BADGE")
    expect(CARD).toContain("line-clamp-2")
  })

  test("التحذير: سطر واحد في الأعلى، والنص الكامل مرة واحدة في الأسفل", () => {
    expect(HUB).toContain('href="#careers-disclaimer"')
    expect(HUB).toContain('id="careers-disclaimer"')
    expect((HUB.match(/<CareerDisclaimer/g) ?? []).length).toBe(1)
  })

  test("الهيرو: زر يصل إلى الفلاتر، وبلا صف الأرقام الثلاثة", () => {
    expect(HUB).toContain('href="#careers-filters"')
    expect(HUB).toContain('id="careers-filters"')
    expect(HUB).not.toContain("statsLabels")
  })

  test("الأسئلة الشائعة أكورديون مغلق بعناصر details", () => {
    expect(HUB).toContain("<details")
    expect(HUB).toContain("<summary")
  })
})

describe("الكليات القريبة: «في مدينتك» بدل «≈ 0 كم»", () => {
  test("المسافة أقل من كم تُعرض كـ«في مدينتك»", () => {
    expect(NEARBY).toContain('distanceKm < 1 ? "في مدينتك"')
  })
})
