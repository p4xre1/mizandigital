import { describe, expect, test } from "vitest"
import { AKII_PLUGIN_GROUPS } from "../src/pages/admin/seoToolsLinks"

const SKILLS = [
  "seo-audit",
  "broken-links",
  "ai-visibility",
  "competitor-intel",
  "content-strategy",
  "content-brief",
  "optimize-page",
  "keyword-clustering",
  "content-translation",
  "schema-markup",
  "internal-linking",
  "llms-txt",
]

describe("مهارات Akii في لوحة SEO", () => {
  const links = AKII_PLUGIN_GROUPS.flatMap((g) => g.links)

  test("كل مهارات المستودع الاثنتي عشرة مُدرجة مرة واحدة", () => {
    const skillLinks = links.filter((l) => l.href.includes("/tree/main/skills/"))
    expect(skillLinks.map((l) => l.label).sort()).toEqual([...SKILLS].sort())
    expect(new Set(skillLinks.map((l) => l.href)).size).toBe(SKILLS.length)
  })

  test("كل رابط https على GitHub (المستودع) أو akii.com فقط", () => {
    for (const link of links) {
      const url = new URL(link.href)
      expect(url.protocol).toBe("https:")
      expect(["github.com", "akii.com"]).toContain(url.hostname)
      expect(url.username + url.password).toBe("")
    }
  })

  test("المستودع المرتبط هو مستودع Akii الصحيح، والشرح يذكر أن الإضافة تعمل خارج الـCMS", () => {
    expect(links[0].href).toBe("https://github.com/akii-technologies-ltd/akii-seo-ai-search-optimizer")
    const source = JSON.stringify(AKII_PLUGIN_GROUPS)
    expect(source).not.toMatch(/token|password|apikey/i)
  })
})
