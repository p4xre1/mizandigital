/**
 * سلامة CSP المعزَّز (لمعالجة تدقيقات Lighthouse: csp-xss + trusted-types-xss).
 *
 * السياسة «غير القابلة للتجاوز» حسب Tوثائق Lighthouse الرسمية:
 *  - script-src بلا 'unsafe-eval'، مع object-src وbase-uri.
 *  - 'strict-dynamic' + hash للسكربت المضمّن الوحيد (theme bootstrap)
 *    — في متصفحات CSP3 تُتجاهل 'self' و'unsafe-inline' وقائمة المضيفين،
 *    فلا يعمل إلا ما يحمل hash/nonce وما يحمّله سكربت موثوق.
 *  - hash حزمة الدخول entry يُملأ وقت البناء (scripts/csp-hashes.mjs)
 *    عبر placeholder — لذلك يُشترَ هنا وجود placeholder وليس قيمة نهائية.
 *  - GA غير مضمّن: %VITE_GA_ID% يغيّر بايتات السكربت المضمّن بين البيئات،
 *    فلا يمكن تثبيت hash له؛ نُقل إلى src/lib/analytics/gtag.ts (حزمة
 *    موثوقة) ومحمّله يرث الثقة عبر trust chain.
 *  - Trusted Types: require-trusted-types-for 'script'
 *    (بدون توجيه trusted-types صريح يبقى default policy permisive
 *    فلا كسر وقت التشغيل).
 */
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vitest"

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const sha256 = (s: string): string =>
  "sha256-" + createHash("sha256").update(s, "utf8").digest("base64")

const read = (p: string): string => readFileSync(path.join(rootDir, p), "utf8")

/** يُخرج نص CSP من public/_headers (قد يمتد على سطر واحد) */
function cspFromHeaders(): string {
  const headers = read("public/_headers")
  const lines = headers.split("\n")
  const cspLine = lines.find((l) => l.includes("Content-Security-Policy:"))
  expect(cspLine, "يجب أن يوجد ترويسة Content-Security-Policy في public/_headers").toBeTruthy()
  return (cspLine ?? "").replace(/^.*Content-Security-Policy:\s*/, "").trim()
}

function directive(csp: string, name: string): string {
  const m = csp.match(new RegExp(`${name} ([^;]+)`))
  expect(m, `يجب أن يوجد توجيه ${name} في CSP`).not.toBeNull()
  return (m ?? [])[1]?.trim() ?? ""
}

describe("CSP — public/_headers (Lighthouse csp-xss / trusted-types-xss)", () => {
  const csp = cspFromHeaders()
  const scriptSrc = directive(csp, "script-src")

  test("يستهدف CSP الـ XSS: script-src + object-src + base-uri وبدون 'unsafe-eval'", () => {
    expect(scriptSrc).toBeTruthy()
    expect(directive(csp, "object-src")).toBe("'none'")
    expect(directive(csp, "base-uri")).toBeTruthy()
    expect(scriptSrc).not.toContain("'unsafe-eval'")
  })

  test("'strict-dynamic' + hash مطابق للسكربت المضمّن الوحيد (dist/ إن وُجد)", () => {
    expect(scriptSrc).toContain("'strict-dynamic'")
    const builtHeaders = path.join(rootDir, "dist/_headers")
    const htmlFile = path.join(rootDir, "dist/index.html")
    const exists = (p: string) => {
      try {
        readFileSync(p)
        return true
      } catch {
        return false
      }
    }
    // قبل البناء لا يوجد dist/_headers — الحالة «قبل البناء» يغطيها اختبار
    // الـplaceholders أدناه (CI لا تبنى في validate، فلا نفحص hash هنا).
    if (!exists(builtHeaders) || !exists(htmlFile)) return
    const indexHtml = readFileSync(htmlFile, "utf8")
    const inline = [...indexHtml.matchAll(/<script\s*>([\s\S]*?)<\/script\s*>/gi)]
    expect(inline, "يجب أن يوجد سكربت مضمّن واحد بلا attributes (theme)").toHaveLength(1)
    const expected = sha256(inline[0][1])
    const cspToCheck = (
      readFileSync(builtHeaders, "utf8")
        .split("\n")
        .find((l) => l.includes("Content-Security-Policy:")) ?? ""
    ).replace(/^.*Content-Security-Policy:\s*/, "")
    expect(cspToCheck, `hash السكربت المضمّن ${expected} يجب أن يكون في script-src`).toContain(expected)
  })

  test("placeholders لحاشمتي inline/entry موجودة ليملأها scripts/csp-hashes.mjs وقت البناء", () => {
    expect(scriptSrc).toContain("'sha256-__MIZAN_INLINE_HASH__'")
    expect(scriptSrc).toContain("'sha256-__MIZAN_ENTRY_HASH__'")
  })

  test("الاحتياط للمتصفحات القديمة (CSP2) محفوظ: 'self' و'unsafe-inline' وقائمة mضيفي التحليل", () => {
    // تُتجاهل هذه المصادر في CSP3 عند وجود hash/nonce + 'strict-dynamic'
    expect(scriptSrc).toContain("'self'")
    expect(scriptSrc).toContain("'unsafe-inline'")
    expect(scriptSrc).toContain("https://www.googletagmanager.com")
  })

  test("Trusted Types مفعّل: require-trusted-types-for 'script'", () => {
    expect(csp).toMatch(/require-trusted-types-for\s+'script'/)
  })

  test("GA ليس مضمّناً: نُقل إلى src/lib/analytics/gtag.ts ويُستدعى من main.tsx", () => {
    const indexHtml = read("index.html")
    expect(indexHtml).not.toContain("window.dataLayer")
    // وسم script (خارجي أو مضمّن) لا يُرجع إلى googletagmanager —
    // وسم <link rel="dns-prefetch"> وحده مسموح (تلميح أداء ليس سكربتاً).
    const scriptTags = indexHtml.match(/<script[\s\S]*?<\/script\s*>/gi) ?? []
    expect(
      scriptTags.find((s) => s.includes("googletagmanager")),
      "لا يجب أن يوجد أي وسم script يشير إلى googletagmanager"
    ).toBeUndefined()
    expect(indexHtml).not.toContain("%VITE_GA_ID%")

    const main = read("src/main.tsx")
    expect(main).toContain("initAnalytics")

    const gtag = read("src/lib/analytics/gtag.ts")
    expect(gtag).toContain("googletagmanager.com/gtag/js")
    expect(gtag).toContain("import.meta.env.VITE_GA_ID")
    // سلوك الموافقة مطابق للنسخة المضمّنة السابقة
    expect(gtag).toContain('analytics_storage: "denied"')
    expect(gtag).toContain("requestIdleCallback")
  })
})
