// [AI-SEC] حارس ثابت: صفحة المشرف للمساعد لا تستورد محرك الفحص ولا قواعده.
// إن عادت هذه الاستيرادات إلى الواجهة الإدارية، تُشحن قواعد الحماية لأي زائر يعرف رابط الـchunk.
// الاختبار الثاني (الحزمة) يعمل بعد `npm run build` ويتخطى إن لم يوجد dist/.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join, resolve } from "node:path"
import { describe, expect, test } from "vitest"

const ROOT = resolve(__dirname, "..")
const PAGE = join(ROOT, "src/pages/admin/HelpAssistantPage.tsx")
const CMS_SERVICE = join(ROOT, "src/lib/help/cmsService.ts")
const CONSTANTS = join(ROOT, "shared/help/cms-constants.js")

/** أسماء وحدات تحتوي قواعد الفحص أو محرك المعالجة أو الدوال المسموح بها للخادم فقط. */
const FORBIDDEN_IMPORT = /from\s+["'][^"']*(guardrails|pipeline|\/cms(\.js)?)["']/

function importsOf(file: string): string[] {
  const src = readFileSync(file, "utf8")
  return [...src.matchAll(/(?:import|export)\s[^;]*?from\s+["']([^"']+)["']/g)].map((m) => m[1])
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

describe("صفحة المشرف للمساعد: مصدر", () => {
  test("لا تستورد guardrails ولا pipeline ولا cms.js", () => {
    const bad = importsOf(PAGE).filter((spec) => FORBIDDEN_IMPORT.test(`from "${spec}"`))
    expect(bad).toEqual([])
  })

  test("خدمة المشرف في الواجهة لا تستورد محرك الفحص", () => {
    const bad = importsOf(CMS_SERVICE).filter((spec) => FORBIDDEN_IMPORT.test(`from "${spec}"`))
    expect(bad).toEqual([])
  })

  test("وحدة الثوابت المشتركة لا تعتمد على guardrails", () => {
    const bad = importsOf(CONSTANTS).filter((spec) => /guardrails|pipeline/.test(spec))
    expect(bad).toEqual([])
  })

  test("الصفحة تتحقق وتعاين عبر نقاط الخادم", () => {
    const src = readFileSync(PAGE, "utf8")
    expect(src).toMatch(/validateHelpDraftOnServer\(\s*"qa"/)
    expect(src).toMatch(/validateHelpDraftOnServer\(\s*"settings"/)
    expect(src).toMatch(/previewHelpAnswerOnServer\(/)
    expect(src).not.toMatch(/\brunPipeline\b/)
    expect(src).not.toMatch(/\bvalidateQaDraft\b|\bvalidateSettingsDraft\b/)
  })
})

describe("صفحة المشرف للمساعد: الحزمة المبنية", () => {
  const DIST = join(ROOT, "dist")
  const built = existsSync(DIST)

  test.skipIf(!built)("chunk المشرف لا يحوي علامة من قواعد الفحص ولا خريطة مصدر", () => {
    const assets = walk(join(DIST, "assets"))
    const adminChunks = assets.filter((f) => /HelpAssistantPage-.*\.js$/.test(f))
    expect(adminChunks.length).toBeGreaterThan(0)
    for (const file of adminChunks) {
      const js = readFileSync(file, "utf8")
      // "obfuscated_payload" رمز سبب داخلي من guardrails.js لا يجب أن يظهر في الحزمة الإدارية.
      expect(js).not.toContain("obfuscated_payload")
      expect(js).not.toContain("social_engineering")
      expect(js).not.toMatch(/sourceMappingURL/)
    }
  })

  test.skipIf(!built)("لا توجد ملفات خرائط مصدر في dist/", () => {
    const maps = walk(DIST).filter((f) => f.endsWith(".map"))
    expect(maps).toEqual([])
  })
})
