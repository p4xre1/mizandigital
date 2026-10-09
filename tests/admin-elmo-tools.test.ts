import { describe, expect, test } from "vitest"
import { ELMO_TOOL_GROUPS } from "../src/pages/admin/seoToolsLinks"

const links = ELMO_TOOL_GROUPS.flatMap((g) => g.links)

describe("أدوات Elmo في لوحة SEO", () => {
  test("أربع مجموعات، وكل مجموعة فيها روابط", () => {
    expect(ELMO_TOOL_GROUPS.map((g) => g.title)).toEqual([
      "المنصة والتجربة",
      "التشغيل الذاتي",
      "الربط والتكامل",
      "الخدمة المُدارة",
    ])
    for (const group of ELMO_TOOL_GROUPS) expect(group.links.length).toBeGreaterThan(0)
    expect(links.length).toBe(12)
  })

  test("كل رابط https على النطاقات المعروفة لـElmo، بلا بيانات دخول", () => {
    const allowed = ["github.com", "www.elmohq.com", "demo.elmohq.com", "www.npmjs.com"]
    for (const link of links) {
      const url = new URL(link.href)
      expect(url.protocol).toBe("https:")
      expect(allowed).toContain(url.hostname)
      expect(url.username + url.password).toBe("")
    }
  })

  test("المستودع الرسمي هو مستودع Elmo، ولا توجد روابط مكررة", () => {
    expect(links[0].href).toBe("https://github.com/elmohq/elmo")
    const hrefs = links.map((l) => l.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  test("الروابط داخل المستودع تشير إلى مجلدات أو ملفات موجودة في الشجرة الحالية", () => {
    const repoPaths = links
      .filter((l) => l.href.startsWith("https://github.com/elmohq/elmo/"))
      .map((l) => new URL(l.href).pathname)
    expect(repoPaths.sort()).toEqual(
      [
        "/elmohq/elmo/blob/main/docker/Dockerfile",
        "/elmohq/elmo/tree/main/apps/cli",
        "/elmohq/elmo/tree/main/packages/api-spec",
        "/elmohq/elmo/tree/main/plugins/elmo",
      ].sort(),
    )
  })
})
