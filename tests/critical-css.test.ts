/**
 * الكتلة الحرجة (critical CSS) — حماية الهيكل الأولي من انزياح التخطيط.
 *
 * تقرير Agentic Browsing (PageSpeed، الجوال) رصد CLS 0.186 على الرئيسية: النمط
 * الكامل يُحمَّل غير حاجب للرسم، فيُعاد تنسيق الرأس والواجهة عند وصوله. الحل:
 * <style data-mizan-critical-css> صغير في <head> مقتطع من ملف الأنماط المبنى نفسه
 * (scripts/lib/critical-css.mjs) يحمل الخصائص الهندسية للهيكل فقط.
 *
 * هذا الملف يحرس: وجود الكتلة، موضعها قبل رابط النمط، حدود الحجم، انتماء كل تعريف
 * حرفياً إلى ملف الأنماط (لا كتلة يدوية تنحرف عنه)، وتخطّي الصفحات الرقيقة للحفاظ
 * على نسبة النص/HTML (الدرس المرجعي: scripts/nonblocking-css.mjs 2026-09-29).
 */
import { describe, expect, test } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (p: string) => readFileSync(path.join(rootDir, p), "utf8")
const hasFile = (p: string) => existsSync(path.join(rootDir, p))

const MAX_CRITICAL_BYTES = 8192
const MIN_RATIO_AFTER = 0.06
const CRITICAL_RE = /<style data-mizan-critical-css>([\s\S]*?)<\/style>/
const DIST_INDEX = "dist/index.html"
const distReady = hasFile(DIST_INDEX)

/** نسبة النص/HTML كما يحسبها سكربت البناء (بايتات UTF-8 بعد حذف الوسوم). */
function textBytes(html: string): number {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
  return Buffer.byteLength(text, "utf8")
}

describe("بنية الكتلة الحرجة", () => {
  test("الوحدة موجودة ومستعملة في سكربت CSS غير الحاجب", () => {
    expect(hasFile("scripts/lib/critical-css.mjs")).toBe(true)
    const script = read("scripts/nonblocking-css.mjs")
    expect(script).toContain('"./lib/critical-css.mjs"')
    expect(script).toContain("criticalStyleTag")
    // الحُرّاس موثّقون في السكربت (نسبة النص/HTML وسقف الحجم)
    expect(script).toContain("MIN_RATIO_AFTER")
    expect(script).toContain("MAX_RATIO_SHARE")
  })

  test("الوحدات تُصدّر ما يحتاجه البناء", async () => {
    const mod = await import("../scripts/lib/critical-css.mjs")
    for (const name of ["buildCriticalCss", "criticalStyleTag", "shellSlice", "htmlTextBytes"]) {
      expect(typeof (mod as Record<string, unknown>)[name]).toBe("function")
    }
    expect((mod as { MAX_CRITICAL_BYTES: number }).MAX_CRITICAL_BYTES).toBe(MAX_CRITICAL_BYTES)
  })
})

describe.skipIf(!distReady)("الكتلة الحرجة في dist", () => {
  const html = distReady ? read(DIST_INDEX) : ""
  const block = CRITICAL_RE.exec(html)?.[1] ?? ""

  test("الرئيسية تحمل الكتلة، داخل <head> وقبل رابط النمط", () => {
    expect(block.length).toBeGreaterThan(0)
    const styleAt = html.indexOf("<style data-mizan-critical-css>")
    const linkAt = html.indexOf('rel="preload" as="style"')
    expect(linkAt).toBeGreaterThan(-1)
    expect(styleAt).toBeLessThan(linkAt)
    expect(styleAt).toBeLessThan(html.indexOf('<div id="root">'))
    // الهيكل الأولي (رأس + عنوان الواجهة) هو المقصود، لا مجموعات تُبنى في React
    expect(html).toContain('<header class="sticky')
    expect(block).toContain(".sticky")
  })

  test("الحجم داخل الحد، ونسبة النص/HTML لا تهبط دون الحد", () => {
    const bytes = Buffer.byteLength(block, "utf8")
    expect(bytes).toBeLessThanOrEqual(MAX_CRITICAL_BYTES)
    const htmlBytes = Buffer.byteLength(html, "utf8")
    expect(bytes).toBeLessThanOrEqual(htmlBytes * 0.35)
    expect(textBytes(html) / htmlBytes).toBeGreaterThanOrEqual(MIN_RATIO_AFTER)
  })

  test("كل تعريف في الكتلة موجود حرفياً في ملف الأنماط المبنى (لا كتلة يدوية)", () => {
    const href = /<link rel="preload" as="style" href="([^"]+)"/.exec(html)?.[1]
    expect(href, "لم يُعثر على رابط النمط في dist/index.html").toBeTruthy()
    const css = read(`dist${href}`)
    const pairs = block.match(/[a-z-]+:[^;{}]+/gi) ?? []
    expect(pairs.length).toBeGreaterThan(50)
    const missing = pairs.filter((pair) => !css.includes(pair.trim()))
    expect(missing.slice(0, 5), "تعريفات خرجت عن ملف الأنماط").toEqual([])
  })

  test("الخصائص هندسية فقط (لا ألوان ولا ظلال ولا انتقالات)", () => {
    expect(block).not.toMatch(/(^|;)(color|background|background-color|box-shadow|transition|animation):/)
    // قيم أساسية للهيكل: التباعد، عرض الحاوية، مقاس العنوان
    expect(block).toContain("--spacing:.25rem")
    expect(block).toMatch(/#?container|\.container/)
    expect(block).toMatch(/font-size:3[0-9]px/)
  })

  test("الحُرّاس يعملان: الرئيسية والأقسام الغنية كتلة، والأغلفة الرقيقة بلا كتلة", () => {
    expect(html).toContain("data-mizan-critical-css")
    // صفحة غنية بالمحتوى المُهيّأ مسبقاً (نسبة مرتفعة) ⇒ كتلة
    expect(read("dist/lexicon.html")).toContain("data-mizan-critical-css")
    // أغلفة SPA رقيقة النص (نسبة 0.03) ⇒ تُتخطّى حفاظاً على نسبة النص/HTML
    expect(read("dist/app.html")).not.toContain("data-mizan-critical-css")
    expect(read("dist/search.html")).not.toContain("data-mizan-critical-css")
  })

  test("الوسم مغلق سليم ولا يبتلع شيئاً بعده", () => {
    const opens = (html.match(/<style data-mizan-critical-css>/g) ?? []).length
    expect(opens).toBe(1)
    const styleOpens = (html.match(/<style\b/g) ?? []).length
    const styleCloses = (html.match(/<\/style>/g) ?? []).length
    expect(styleCloses).toBe(styleOpens)
  })
})
