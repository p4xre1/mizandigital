import { describe, expect, test } from "vitest"
import { SEO_TOOL_GROUPS } from "../src/pages/admin/seoToolsLinks"

describe("أدوات SEMrush في لوحة SEO", () => {
  test("المجموعات الست كلها موجودة، وكل مجموعة فيها رابط واحد على الأقل", () => {
    expect(SEO_TOOL_GROUPS.map((g) => g.title)).toEqual([
      "لوحة SEO",
      "أداء الموقع",
      "التحليل التنافسي",
      "بحث الكلمات المفتاحية",
      "أفكار المحتوى",
      "بناء الروابط",
    ])
    for (const group of SEO_TOOL_GROUPS) expect(group.links.length).toBeGreaterThan(0)
  })

  test("كل الروابط https على semrush.com ولا تحمل مفتاح API", () => {
    const links = SEO_TOOL_GROUPS.flatMap((g) => g.links)
    expect(links.length).toBe(17)
    for (const link of links) {
      const url = new URL(link.href)
      expect(url.protocol).toBe("https:")
      expect(url.hostname).toMatch(/(^|\.)semrush\.com$/)
      expect(url.searchParams.has("key")).toBe(false)
      expect(url.searchParams.get("fid")).toBe("13520703")
    }
  })

  test("روابط التحليل التنافسي تشير إلى نطاق الموقع", () => {
    const domainLinks = SEO_TOOL_GROUPS.find((g) => g.title === "التحليل التنافسي")!.links
    for (const link of domainLinks) {
      expect(new URL(link.href).searchParams.get("q")).toBe("www.mizan.page")
    }
  })
})
