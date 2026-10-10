import { describe, expect, test } from "vitest"
import { AWESOME_AEO_TOOL_GROUPS } from "../src/pages/admin/seoToolsLinks"

const links = AWESOME_AEO_TOOL_GROUPS.flatMap((g) => g.links)

describe("قائمة awesome-aeo-seo-tools في لوحة SEO", () => {
  test("سبع مجموعات، وكل مجموعة فيها روابط", () => {
    expect(AWESOME_AEO_TOOL_GROUPS.length).toBe(7)
    for (const group of AWESOME_AEO_TOOL_GROUPS) expect(group.links.length).toBeGreaterThan(0)
    expect(links.length).toBe(41)
  })

  test("كل رابط https على GitHub أو discoveredlabs.com، بلا بيانات دخول", () => {
    for (const link of links) {
      const url = new URL(link.href)
      expect(url.protocol).toBe("https:")
      expect(["github.com", "discoveredlabs.com"]).toContain(url.hostname)
      expect(url.username + url.password).toBe("")
    }
  })

  test("لا روابط مكررة، ولا مقالات أو مواصفات أو أداة getcito المكررة", () => {
    const hrefs = links.map((l) => l.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
    expect(hrefs.some((h) => h.includes("getcito"))).toBe(false)
    expect(hrefs.some((h) => h.includes("metehan.ai"))).toBe(false)
    expect(hrefs.some((h) => h.includes("webmachinelearning"))).toBe(false)
    expect(hrefs.some((h) => h.includes("promptingguide"))).toBe(false)
  })

  test("روابط Discovered Labs تشير إلى صفحات أدوات أو خدمات، لا إلى الصفحة الرئيسية", () => {
    const dl = links.filter((l) => l.href.startsWith("https://discoveredlabs.com/"))
    expect(dl.length).toBe(7)
    for (const link of dl) expect(new URL(link.href).pathname.length).toBeGreaterThan(1)
  })
})
