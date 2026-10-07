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

  /**
   * عطل «الخطوط السوداء» (2026-10-07) — الحارس المستقل عن dist:
   * الكتلة كانت تُخرِج القواعد بلا غلاف @layer، والنمط غير المُطبَّق على طبقة
   * يغلب كل الأنماط المُطبَّقة عليها؛ فقاعدة الـpreflight
   * `*,:after,:before{border:0 solid}` كانت تلغي border-color:
   * hsl(var(--border)) في @layer base، فيرجع إلى currentColor (لون النص)
   * على كل عنصر بلا صنف لون صريح ⇒ خطوط داكنة على البطاقات والأزرار.
   */
  test("buildCriticalCss يحفظ @layer وترتيبها — لا قاعدة عارية تغلب النمط الكامل", async () => {
    const mod = await import("../scripts/lib/critical-css.mjs")
    const html =
      '<html class="light"><head></head><body><header class="sticky top-0"><a class="border">x</a></header>' +
      '<main><section><h1 class="text-4xl font-black">عنوان</h1></section></main></body></html>'
    const cssText =
      "@layer properties, theme, base, components, utilities;" +
      "@layer base{*,:after,:before{box-sizing:border-box;border:0 solid;margin:0;padding:0}" +
      "*{border-color:hsl(var(--border))}}" +
      "@layer utilities{@supports (position:sticky){.sticky{position:sticky}}}" +
      ":root{--font-sans:Cairo}"

    const built = mod.buildCriticalCss({ html, cssText })
    expect(built.css.length).toBeGreaterThan(0)
    // تعليمة ترتيب الطبقات تتصدّر الكتلة (بترتيب أول ظهور في ملف الأنماط)،
    // فلا تُرتَّب طبقات الكتلة قبل طبقات النمط الكامل فينقلب ترتيب الأولوية.
    const orderStatement = /^@layer\s+([\w-]+(?:\s*,\s*[\w-]+)*);/.exec(built.css)?.[1]
    expect(orderStatement, "الكتلة تبدأ بتعليمة ترتيب الطبقات").toBeTruthy()
    expect(orderStatement!.split(/\s*,\s*/).slice(0, 2)).toEqual(["base", "utilities"])
    // الـpreflight داخل @layer base، والصنف داخل @layer utilities
    expect(built.css).toContain("@layer base{")
    expect(built.css).toContain("@layer utilities{")

    // لا قاعدة عارية على المستوى الأعلى: تعليمة ترتيب، :root/@property، أو @layer
    const bare = topLevelStatements(built.css).filter(
      (statement) =>
        !/^@layer\s+[\w-]+(\s*,\s*[\w-]+)*\s*;$/.test(statement) &&
        !/^:root\s*\{/.test(statement) &&
        !/^@property\s/.test(statement) &&
        !/^@layer\s+[\w-]+\s*\{/.test(statement)
    )
    expect(bare, "قواعد خارج @layer تغلب النمط الكامل في السلسلة").toEqual([])
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

  /**
   * عطل «الخطوط السوداء» (2026-10-07): الكتلة كانت تُخرِج القواعد بلا غلاف
   * @layer. والنمط غير المُطبَّق على طبقة يغلب كل الأنماط المُطبَّقة عليها،
   * فقاعدة الـpreflight المستخرجة `*,:after,:before{border:0 solid}` كانت
   * تغلب `@layer base *{border-color:hsl(var(--border))}` في ملف الأنماط،
   * فيرجع border-color إلى currentColor (لون النص) على كل عنصر بلا صنف لون
   * صريح ⇒ خطوط داكنة على البطاقات والأزرار والرأس.
   *
   * الحارس: كل ما في الكتلة إما تعليمة ترتيب الطبقات، أو كتلة :root/@property،
   * أو قاعدة داخل @layer — ولا قاعدة عارية على المستوى الأعلى أبداً.
   */
  test("كل قاعدة داخل طبقتها الأصلية (@layer) — لا قاعدة عارية تغلب النمط الكامل", () => {
    const topLevel = topLevelStatements(block)
    const bare = topLevel.filter(
      (statement) =>
        !/^@layer\s+[\w-]+(\s*,\s*[\w-]+)*\s*;$/.test(statement) && // تعليمة ترتيب الطبقات
        !/^:root\s*\{/.test(statement) && // متغيّرات :root اللازمة
        !/^@property\s/.test(statement) && // تسجيلات @property
        !/^@layer\s+[\w-]+\s*\{/.test(statement) // قاعدة داخل طبقتها
    )
    expect(bare.slice(0, 3), "قواعد خارج @layer تغلب النمط الكامل في السلسلة").toEqual([])

    // الـpreflight بالتحديد يجب أن يبقى في @layer base
    expect(block).toContain("@layer base{")
    expect(block).toContain("@layer utilities{")
    // وتعليمة الترتيب تصدَّر الكتلة، فلا تُرتَّب طبقاتها قبل properties/theme
    expect(block).toMatch(/^@layer properties, theme, base/)
  })
})

/** تقطيع المستوى الأعلى: تعليمات (@layer …;) وكتل (@layer …{…}) دون الدخول في الأقواس. */
function topLevelStatements(css: string): string[] {
  const out: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < css.length; i += 1) {
    const ch = css[i]
    if (ch === '"' || ch === "'") {
      const quote = ch
      i += 1
      while (i < css.length && css[i] !== quote) {
        if (css[i] === "\\") i += 1
        i += 1
      }
      continue
    }
    if (ch === "{") depth += 1
    else if (ch === "}") {
      depth -= 1
      if (depth === 0) {
        out.push(css.slice(start, i + 1))
        start = i + 1
      }
    } else if (ch === ";" && depth === 0) {
      out.push(css.slice(start, i + 1))
      start = i + 1
    }
  }
  if (start < css.length) out.push(css.slice(start))
  return out.map((s) => s.trim()).filter(Boolean)
}
