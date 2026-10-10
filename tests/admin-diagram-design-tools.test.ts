import { describe, expect, test } from "vitest"
import { DIAGRAM_DESIGN_TOOL_GROUPS } from "../src/pages/admin/seoToolsLinks"

const links = DIAGRAM_DESIGN_TOOL_GROUPS.flatMap((g) => g.links)

describe("روابط Diagram Design في لوحة SEO", () => {
  test("أربع مجموعات، وكل مجموعة فيها روابط", () => {
    expect(DIAGRAM_DESIGN_TOOL_GROUPS.map((g) => g.title)).toEqual([
      "المشروع",
      "المهارات والأوامر",
      "الإضافات لكل منصة",
      "التوثيق",
    ])
    for (const group of DIAGRAM_DESIGN_TOOL_GROUPS) expect(group.links.length).toBeGreaterThan(0)
    expect(links.length).toBe(9)
  })

  test("المستودع الرسمي هو مستودع cathrynlavery، وكل الروابط https", () => {
    expect(links[0].href).toBe("https://github.com/cathrynlavery/diagram-design")
    for (const link of links) {
      const url = new URL(link.href)
      expect(url.protocol).toBe("https:")
      expect(url.username + url.password).toBe("")
    }
  })

  test("روابط المستودع تشير إلى المستودع الصحيح وإلى المجلدات الموجودة فقط", () => {
    const repoLinks = links.filter((l) => l.href.startsWith("https://github.com/"))
    for (const link of repoLinks) {
      expect(link.href.startsWith("https://github.com/cathrynlavery/diagram-design")).toBe(true)
    }
    const hrefs = links.map((l) => l.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })
})
