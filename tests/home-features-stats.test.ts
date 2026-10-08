import { describe, expect, test } from "vitest"
import { readFileSync } from "node:fs"
import counts from "@/data/counts.json"
import lexicon from "@/data/lexicon.json"

const HOME = readFileSync("src/pages/public/HomePage.tsx", "utf8")

describe("home features: مزايا حقيقية لميزان", () => {
  test("لا تظهر عبارات الدورات المدفوعة", () => {
    expect(HOME).not.toContain("أساتذة خبراء")
    expect(HOME).not.toContain("جدول مرن")
    expect(HOME).not.toContain("دعم مستمر")
  })

  test("المزايا الأربع: القاموس، السداسيات، الأخبار، بلا إعلانات", () => {
    expect(HOME).toContain("قاموس عربي-فرنسي")
    expect(HOME).toContain("منظّم حسب السداسيات")
    expect(HOME).toContain("أخبار قانونية محدّثة")
    expect(HOME).toContain("مجاني بلا إعلانات")
  })
})

describe("home stats band: أرقام غير مكررة", () => {
  test("لا يظهر «+8 مقال» ولا 250+ المكررة", () => {
    expect(HOME).not.toContain("مقال قانوني")
    expect(HOME).not.toContain('"250+"')
    expect(HOME).not.toContain('value: "100%"')
    expect(HOME).not.toContain('"500+"')
  })

  test("الرقم الجديد من البيانات: المصطلحات ذات الشجرة", () => {
    expect(HOME).toContain("counts.lexiconTree")
    const withTree = (lexicon as Array<{ legal_sources?: unknown[] }>).filter(
      (t) => Array.isArray(t.legal_sources) && t.legal_sources.length > 0,
    ).length
    expect(counts.lexiconTree).toBe(withTree)
  })
})
