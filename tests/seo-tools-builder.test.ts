import { describe, expect, test } from "vitest"
import { buildSitemap, escapeXml, normalizeSitemapUrl, SITEMAP_MAX_URLS } from "../src/lib/seo/sitemapBuilder"
import { decide, parseRobots } from "../src/lib/seo/robotsRules"

describe("بناء sitemap.xml", () => {
  test("يبني XML صالحاً بروابط الموقع فقط، مرتبة كما أُدخلت، بلا تكرار", () => {
    const result = buildSitemap(
      ["https://www.mizan.page/archive", "https://www.mizan.page/quiz#top", "https://www.mizan.page/archive"].join("\n"),
    )
    expect(result.error).toBeUndefined()
    expect(result.urls).toEqual(["https://www.mizan.page/archive", "https://www.mizan.page/quiz"])
    expect(result.xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(result.xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(result.xml.match(/<loc>/g)?.length).toBe(2)
  })

  test("يرفض الروابط الخارجية وhttp والأسطر غير الصالحة ويذكر السبب", () => {
    const result = buildSitemap(
      ["https://www.mizan.page/news", "http://www.mizan.page/x", "https://example.com/a", "ليس رابطاً"].join("\n"),
    )
    expect(result.urls).toEqual(["https://www.mizan.page/news"])
    expect(result.rejected.map((r) => r.reason)).toEqual([
      "يجب أن يكون الرابط https",
      "خارج نطاق الموقع (www.mizan.page)",
      "ليس رابطاً صالحاً",
    ])
  })

  test("لا يُنتج ملفاً فارغاً", () => {
    const result = buildSitemap("\n  \n")
    expect(result.xml).toBe("")
    expect(result.error).toBeDefined()
  })

  test("يحترم حدّ 50,000 رابط", () => {
    const lines = Array.from({ length: SITEMAP_MAX_URLS + 1 }, (_, i) => `https://www.mizan.page/p-${i}`).join("\n")
    const result = buildSitemap(lines)
    expect(result.xml).toBe("")
    expect(result.error).toContain("50,000")
  })

  test("الهروب من محارف XML في الروابط", () => {
    expect(escapeXml(`a&b<c>"d"'e'`)).toBe("a&amp;b&lt;c&gt;&quot;d&quot;&apos;e&apos;")
    const result = buildSitemap("https://www.mizan.page/search?q=a&b=1")
    expect(result.xml).toContain("<loc>https://www.mizan.page/search?q=a&amp;b=1</loc>")
  })

  test("تاريخ lastmod اختياري ويظهر لكل رابط", () => {
    const result = buildSitemap("https://www.mizan.page/news", { lastmod: "2026-10-09" })
    expect(result.xml).toContain("<lastmod>2026-10-09</lastmod>")
    expect(normalizeSitemapUrl("https://www.mizan.page/news")).toEqual({ url: "https://www.mizan.page/news" })
  })
})

describe("مطابقة robots.txt وفق RFC 9309", () => {
  const robots = `
# تعليق
User-agent: *
Disallow: /admin/
Allow: /admin/public
Disallow: /*.pdf$

User-agent: GPTBot
Disallow: /
`

  test("المجموعة الأطول مطابقة لاسم الزاحف تتقدم على «*»", () => {
    const groups = parseRobots(robots)
    expect(decide(groups, "GPTBot/1.0", "https://www.mizan.page/archive").allowed).toBe(false)
    expect(decide(groups, "Googlebot", "https://www.mizan.page/archive").allowed).toBe(true)
  })

  test("القاعدة الأطول تفوز، وعند التساوي يفوز Allow", () => {
    const groups = parseRobots(robots)
    expect(decide(groups, "Googlebot", "https://www.mizan.page/admin/public/x").allowed).toBe(true)
    expect(decide(groups, "Googlebot", "https://www.mizan.page/admin/users").allowed).toBe(false)

    const tie = parseRobots("User-agent: *\nDisallow: /a\nAllow: /a")
    expect(decide(tie, "Bot", "https://www.mizan.page/a").allowed).toBe(true)
  })

  test("الأنماط بـ * و$", () => {
    const groups = parseRobots(robots)
    const blocked = decide(groups, "Googlebot", "https://www.mizan.page/docs/judicial-s4.pdf")
    expect(blocked.allowed).toBe(false)
    expect(blocked.rule?.pattern).toBe("/*.pdf$")
    expect(decide(groups, "Googlebot", "https://www.mizan.page/docs/x.pdf?download=1").allowed).toBe(true)
  })

  test("بلا قاعدة مطابقة أو بلا مجموعة يُسمح، و«Disallow:» الفارغ لا يمنع", () => {
    expect(decide([], "Bot", "https://www.mizan.page/").allowed).toBe(true)
    const empty = parseRobots("User-agent: *\nDisallow:")
    expect(decide(empty, "Bot", "https://www.mizan.page/anything").allowed).toBe(true)
  })
})
