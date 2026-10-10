import { describe, expect, test } from "vitest"
import { UI_LIBRARY_GROUPS } from "../src/pages/admin/uiLibraryLinks"

const links = UI_LIBRARY_GROUPS.flatMap((g) => g.links)

describe("روابط awesome-ui-libraries في لوحة SEO", () => {
  test("كل المجموعات غير فارغة، وعدد الروابط كما في المستودع الأصلي بعد إزالة التكرار", () => {
    expect(UI_LIBRARY_GROUPS.length).toBe(12)
    for (const group of UI_LIBRARY_GROUPS) expect(group.links.length).toBeGreaterThan(0)
    expect(links.length).toBe(191)
  })

  test("كل رابط https صالح، بلا بيانات دخول ولا عنوان محلي", () => {
    for (const link of links) {
      const url = new URL(link.href)
      expect(url.protocol).toBe("https:")
      expect(url.username + url.password).toBe("")
      expect(["localhost", "127.0.0.1"]).not.toContain(url.hostname)
    }
  })

  test("لا روابط مكررة، وكل تسمية غير فارغة", () => {
    const hrefs = links.map((l) => l.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
    for (const link of links) expect(link.label.trim().length).toBeGreaterThan(0)
  })

  test("علامة PRO تظهر فقط في التسمية، والرابط يبقى نظيفاً", () => {
    const pro = links.filter((l) => l.label.endsWith(" (PRO)"))
    expect(pro.length).toBeGreaterThan(0)
    for (const link of pro) expect(link.href).not.toContain("(PRO)")
  })
})
