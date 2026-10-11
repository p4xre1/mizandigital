import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(__dirname, "..")
const read = (p: string) => readFileSync(join(root, p), "utf8")

describe("طبقة الأجهزة الثلاثة للموقع العام", () => {
  const css = read("src/styles/devices.css")

  it("تعرّف نقاط phone و tablet و pc بنقاط Tailwind (640px و 1024px)", () => {
    expect(css).toMatch(/@media \(min-width: 640px\)/)
    expect(css).toMatch(/@media \(min-width: 1024px\)/)
    expect(css).toMatch(/@media \(max-width: 639px\)/)
    expect(css).toMatch(/@media \(min-width: 640px\) and \(max-width: 1023px\)/)
  })

  it("تمنع التمرير الأفقي على الغلاف دون كسر sticky", () => {
    expect(css).toMatch(/overflow-x:\s*clip/)
    expect(css).not.toMatch(/overflow-x:\s*hidden/)
  })

  it("أهداف اللمس على الهاتف لا تقل عن 44px", () => {
    expect(css).toMatch(/--device-touch:\s*44px/)
  })

  it("مُدمجة في نقطة الدخول وغلاف الموقع العام", () => {
    expect(read("src/main.tsx")).toMatch(/import "\.\/styles\/devices\.css"/)
    expect(read("src/layouts/PublicLayout.tsx")).toMatch(/className="site-public /)
  })
})
