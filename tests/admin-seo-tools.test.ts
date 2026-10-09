import { describe, expect, test } from "vitest"
import { SEO_TOOL_GROUPS, TRAFFIC_TOOL_GROUPS } from "../src/pages/admin/seoToolsLinks"

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

describe("أدوات Traffic & Market في لوحة SEO", () => {
  test("المجموعات الست بعدد الروابط نفسه في القائمة الأصلية (26 رابطاً)", () => {
    expect(TRAFFIC_TOOL_GROUPS.map((g) => g.title)).toEqual([
      "الحركة والسوق",
      "توزيع الحركة",
      "الصفحات والفئات",
      "الاتجاهات الإقليمية",
      "ملف الجمهور",
      "متقدم",
    ])
    const links = TRAFFIC_TOOL_GROUPS.flatMap((g) => g.links)
    expect(links.length).toBe(26)
  })

  test("كل رابط https على semrush.com/analytics/traffic مع fid الحساب", () => {
    for (const link of TRAFFIC_TOOL_GROUPS.flatMap((g) => g.links)) {
      const url = new URL(link.href)
      expect(url.protocol).toBe("https:")
      expect(url.hostname).toBe("www.semrush.com")
      expect(url.pathname.startsWith("/analytics/traffic/")).toBe(true)
      expect(url.searchParams.get("fid")).toBe("13520703")
      expect(url.searchParams.has("key")).toBe(false)
    }
  })

  test("الأسماء المطابقة للقائمة الأصلية، ومنها Page Groups (beta) بلا تنسيق", () => {
    const labels = TRAFFIC_TOOL_GROUPS.flatMap((g) => g.links.map((l) => l.label))
    expect(labels).toContain("Get Started")
    expect(labels).toContain("Page Groups (beta)")
    expect(labels).toContain("Sources & Destinations")
    expect(labels).toContain("Industry & Bulk Analysis")
    expect(new Set(labels).size).toBe(labels.length)
  })
})
