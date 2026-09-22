/**
 * سلامة CSP — دروس عطل حقيقي (لم يُلتقط بأي بوابة سابقة).
 *
 * ما الذي حدث على الإنتاج؟
 *   `Loading the script 'https://www.mizan.page/assets/index-*.js' violates the
 *   following Content Security Policy directive: "script-src 'self'
 *   'unsafe-inline' 'strict-dynamic' 'sha256-…' …". The action has been blocked.`
 * الحزمة نفسها = التطبيق كله. لا React، لا توجيه، لا تفاعل: موقع ميت بصرياً.
 *
 * لماذا لم يكفِ الـhash؟
 *   CSP3 §6.7.2.4 «Does integrity metadata match source list?»: hash في
 *   script-src لا يطابق سكربتاً **خارجياً** إلا إذا حمل وسم `<script>`
 *   integrity يحوي الـhash نفسه (المواصفة تُحيل فرض البايتات إلى SRI).
 *   وسم الحزمة عندنا `type="module" crossorigin src=…` بلا integrity ⇒ لا
 *   مطابقة، ومع 'strict-dynamic' تُتجاهل 'self' وقائمة المضيفين ⇒ حجب.
 *
 * القاعدة المعتمدة الآن:
 *   - حزمة الدخول تُسمح عبر 'self' (سكربت من نفس الأصل) لا عبر hash.
 *   - السكربت المضمّن الوحيد (theme bootstrap) يُسمح بـhash مطابق لبايتاته.
 *   - لا 'strict-dynamic' ولا 'unsafe-inline' في script-src.
 *   - الـhash الخارجي لا يعود إلا إذا أضاف البناء integrity إلى الوسم.
 *
 * الاختبارات أدناه لا تكتفي بفحص النص: أحدها يمثّل قواعد المطابقة في CSP3
 * ويقيّم كل سكربت فعلي في dist/ كما يفعل المتصفح — وهو ما كان سيمنع العطل.
 *
 * Trusted Types: `require-trusted-types-for 'script'` أُزيل أيضاً. React 18
 * ينشئ عناصر <script> (وسوم JSON-LD عندنا) عبر innerHTML داخلياً:
 *   `"script"===c?(a=g.createElement("div"),a.innerHTML="<script>…`
 * وبلا default policy يرمي المتصفح TypeError أثناء الرسم. الاختبار الأخير
 * يمنع إعادته بلا default policy في الشيفرة.
 */
import { createHash } from "node:crypto"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vitest"

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const sha256 = (s: string): string =>
  "sha256-" + createHash("sha256").update(s, "utf8").digest("base64")

const read = (p: string): string => readFileSync(path.join(rootDir, p), "utf8")

const hasFile = (p: string): boolean => existsSync(path.join(rootDir, p))

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

/* ── نموذج مصغّر لقواعد المطابقة في CSP3 (السكربتات فقط) ──────────────────── */

type BuiltScript = { src?: string; body?: string; integrity?: string }

/**
 * هل يسمح المتصفح بهذا السكربت وفق script-src؟
 * يمثّل: 'strict-dynamic' (تُتجاهل معه 'self' وقائمة المضيفين)، وشرط integrity
 * لمطابقة hash لسكربت خارجي، و'unsafe-inline' المُلغاة عند وجود hash.
 */
function browserAllows(scriptSrc: string, script: BuiltScript): boolean {
  const sources = scriptSrc.split(/\s+/).filter(Boolean)
  const hashSources = sources.filter((s) => /^'sha(256|384|512)-/.test(s))
  const nonceSources = sources.filter((s) => /^'nonce-/.test(s))

  const strictDynamic = sources.includes("'strict-dynamic'")
  const hashMatches = (value?: string): boolean => {
    if (!value) return false
    const values = value.split(/\s+/).filter(Boolean)
    // المواصفة (§6.7.2.4): كل قيم integrity يجب أن تكون ضمن hash-sources.
    return values.length > 0 && values.every((v) => hashSources.includes(`'${v}'`))
  }

  if (script.src) {
    // سكربت خارجي (طلب عبر URL).
    if (strictDynamic) {
      // 'strict-dynamic' تُلغي 'self' وقائمة المضيفين للمطابقة، ويبقى
      // nonce أو integrity — ووسوم البناء عندنا بلا أيٍّ منهما.
      if (nonceSources.length > 0) return true
      return hashMatches(script.integrity)
    }
    const sameOrigin = script.src.startsWith("/") && !script.src.startsWith("//")
    if (sameOrigin && sources.includes("'self'")) return true
    const hosts = sources.filter((s) => /^https:\/\//.test(s))
    return hosts.some((h) => {
      const pattern = h.replace(/^https:\/\//, "").replace(/\/$/, "")
      const host = script.src!.replace(/^https:\/\//, "").split("/")[0]
      if (pattern.startsWith("*.")) return host.endsWith(pattern.slice(1))
      return host === pattern
    })
  }

  // سكربت مضمّن: hash يطابقه حتى مع وجود 'strict-dynamic'، و'unsafe-inline'
  // تُلغى في CSP2+ متى وُجد hash أو nonce في نفس السياسة.
  if (hashMatches(sha256(script.body ?? ""))) return true
  return hashSources.length === 0 && nonceSources.length === 0 && sources.includes("'unsafe-inline'")
}

const SCRIPT_TAG = /<script(\s[^>]*)?>([\s\S]*?)<\/script[^>]*>/gi

function executableScriptsOf(html: string): BuiltScript[] {
  const out: BuiltScript[] = []
  for (const m of html.matchAll(SCRIPT_TAG)) {
    const attrs = m[1] ?? ""
    const src = /\ssrc\s*=\s*"([^"]*)"/i.exec(attrs)?.[1]
    const type = /\stype\s*=\s*"([^"]*)"/i.exec(attrs)?.[1] ?? ""
    const integrity = /\sintegrity\s*=\s*"([^"]*)"/i.exec(attrs)?.[1]
    if (src) {
      out.push({ src, integrity })
      continue
    }
    const mime = type.split(";")[0].trim().toLowerCase()
    const executable =
      mime === "" ||
      mime === "module" ||
      mime === "text/javascript" ||
      mime === "application/javascript" ||
      mime === "text/ecmascript" ||
      mime === "application/ecmascript"
    // كتل البيانات (application/ld+json) لا يخصّها script-src إطلاقاً.
    if (executable) out.push({ body: m[2], integrity })
  }
  return out
}

function distHtmlFiles(dir = path.join(rootDir, "dist")): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...distHtmlFiles(full))
    else if (entry.endsWith(".html")) out.push(full)
  }
  return out.sort()
}

describe("CSP — public/_headers", () => {
  const csp = cspFromHeaders()
  const scriptSrc = directive(csp, "script-src")

  test("يستهدف XSS: object-src 'none' وbase-uri وframe-ancestors، وبلا 'unsafe-eval'", () => {
    expect(scriptSrc).toBeTruthy()
    expect(directive(csp, "object-src")).toBe("'none'")
    expect(directive(csp, "base-uri")).toBeTruthy()
    expect(directive(csp, "frame-ancestors")).toBeTruthy()
    expect(scriptSrc).not.toContain("'unsafe-eval'")
  })

  test("لا 'strict-dynamic' ولا 'unsafe-inline': السياسة صادقة مع وسوم بلا integrity", () => {
    // 'strict-dynamic' مع hash خارجي وبلا integrity = حجب الحزمة (العطل الفعلي).
    expect(scriptSrc).not.toContain("'strict-dynamic'")
    // وجود hash يجعل 'unsafe-inline' بلا مفعول في CSP2+، فبقاؤها تضليل.
    expect(scriptSrc).not.toContain("'unsafe-inline'")
    expect(scriptSrc).toContain("'self'")
  })

  test("placeholder واحد: hash السكربت المضمّن (لا hash لحزمة خارجية)", () => {
    expect(scriptSrc).toContain("'sha256-__MIZAN_INLINE_HASH__'")
    expect(scriptSrc).not.toContain("__MIZAN_ENTRY_HASH__")
  })

  test("مضيفو التحليل/التحدي ما زالوا مسموحين (CSP2: القائمة تُحترم بلا strict-dynamic)", () => {
    expect(scriptSrc).toContain("https://www.googletagmanager.com")
    expect(scriptSrc).toContain("https://challenges.cloudflare.com")
  })

  test("Trusted Types لا تُفرض بلا default policy (React 18 ينشئ <script> عبر innerHTML)", () => {
    const enforced = /require-trusted-types-for\s+'script'/.test(csp)
    if (enforced) {
      // إن أُعيد التوجيه فيجب أن تنشئ الشيفرة default policy، وإلا رُمي
      // TypeError أثناء إنشاء وسوم JSON-LD وسقط الرسم.
      const sources = readdirSync(path.join(rootDir, "src"), { recursive: true, withFileTypes: true })
      const createsPolicy = sources
        .filter((d) => d.isFile() && /\.(ts|tsx)$/.test(d.name))
        .some((d) => {
          const file = readFileSync(path.join(d.parentPath ?? path.join(rootDir, "src"), d.name), "utf8")
          return /createPolicy\(\s*["']default["']/.test(file)
        })
      expect(
        createsPolicy,
        "require-trusted-types-for مفعّل بلا default policy — React 18 سيرمي TypeError عند إنشاء <script>"
      ).toBe(true)
    } else {
      expect(enforced).toBe(false)
    }
  })

  test("GA ليس مضمّناً: نُقل إلى src/lib/analytics/gtag.ts ويُستدعى من main.tsx", () => {
    const indexHtml = read("index.html")
    expect(indexHtml).not.toContain("window.dataLayer")
    const scriptTags = indexHtml.match(/<script[\s\S]*?<\/script[^>]*>/gi) ?? []
    expect(
      scriptTags.find((s) => s.includes("googletagmanager")),
      "لا يجب أن يوجد أي وسم script يشير إلى googletagmanager"
    ).toBeUndefined()
    expect(indexHtml).not.toContain("%VITE_GA_ID%")
    expect(read("src/main.tsx")).toContain("initAnalytics")
    const gtag = read("src/lib/analytics/gtag.ts")
    expect(gtag).toContain("googletagmanager.com/gtag/js")
    expect(gtag).toContain("import.meta.env.VITE_GA_ID")
    expect(gtag).toContain('analytics_storage: "denied"')
    expect(gtag).toContain("requestIdleCallback")
  })
})

describe("CSP — نموذج المطابقة نفسه (فحص عدم-الفراغ)", () => {
  test("النموذج يرفض السياسة القديمة ويقبل الجديدة على نفس الوسوم", () => {
    const themeBody = "/* theme bootstrap */"
    const themeHash = `'${sha256(themeBody)}'`
    const entry = { src: "/assets/index-abc123.js" } // بلا integrity، كما يخرج من vite
    const inline = { body: themeBody }

    // السياسة القديمة: 'strict-dynamic' يمنع 'self'، والـhash لا يطابق وسماً بلا
    // integrity ⇒ هذا بالضبط ما حجب حزمة التطبيق على الإنتاج.
    const broken = `'self' 'unsafe-inline' 'strict-dynamic' ${themeHash} 'sha256-ZW50cnk=' https://www.googletagmanager.com`
    expect(browserAllows(broken, entry)).toBe(false)
    expect(browserAllows(broken, inline)).toBe(true) // السكربت المضمّن كان يمرّ، فالعطل لم يظهر في سجلاته

    // السياسة الجديدة: الحزمة عبر 'self'، والسكربت المضمّن عبر hash.
    const good = `'self' ${themeHash} https://www.googletagmanager.com`
    expect(browserAllows(good, entry)).toBe(true)
    expect(browserAllows(good, inline)).toBe(true)

    // 'unsafe-inline' المُلغاة عند وجود hash (وهذا سبب إزالتها من السياسة).
    expect(browserAllows("'unsafe-inline'", inline)).toBe(true)
    expect(browserAllows(`'unsafe-inline' 'sha256-ZW50cnk='`, inline)).toBe(false)

    // ومضيف ثالث مسموح يبقى مسموحاً بلا 'strict-dynamic' (محمّل gtag).
    expect(
      browserAllows("'self' https://www.googletagmanager.com", {
        src: "https://www.googletagmanager.com/gtag/js?id=G-X",
      })
    ).toBe(true)
  })
})

describe("CSP — مطابقة البناء الفعلي (dist/ إن وُجد)", () => {
  const distHtml = hasFile("dist/index.html") ? distHtmlFiles() : []
  const skip = distHtml.length === 0

  test.skipIf(skip)("كل سكربت في كل صفحات dist/ يسمح به المتصفح وفق السياسة", () => {
    const cspBuilt = hasFile("dist/_headers")
      ? (readFileSync(path.join(rootDir, "dist/_headers"), "utf8")
          .split("\n")
          .find((l) => l.includes("Content-Security-Policy:")) ?? "").replace(
          /^.*Content-Security-Policy:\s*/,
          ""
        )
      : ""
    const policy = cspBuilt || cspFromHeaders()
    const builtScriptSrc = policy.includes("__MIZAN_INLINE_HASH__")
      ? ""
      : directive(policy, "script-src")
    expect(policy, "dist/_headers بلا Content-Security-Policy").toContain("script-src")
    expect(builtScriptSrc, "الـplaceholder لم يُعبَّأ في dist/_headers").toBeTruthy()

    const blocked: string[] = []
    for (const file of distHtml) {
      const html = readFileSync(file, "utf8")
      for (const script of executableScriptsOf(html)) {
        if (!browserAllows(builtScriptSrc, script)) {
          blocked.push(
            `${path.relative(path.join(rootDir, "dist"), file)} → ${
              script.body ? "(inline)" : script.src
            }`
          )
        }
      }
    }
    expect(blocked, `سكربتات سيحجبها المتصفح:\n${blocked.join("\n")}`).toEqual([])
  })

  test.skipIf(skip)("حزمة الدخول وسكربت السمة: المسار المُسمَّح واضح لكل واحد", () => {
    const html = read("dist/index.html")
    const scripts = executableScriptsOf(html)
    const external = scripts.filter((s) => s.src)
    const inline = scripts.filter((s) => !s.src)
    expect(external, "يجب أن توجد حزمة دخول واحدة").toHaveLength(1)
    expect(inline, "يجب أن يوجد سكربت مضمّن واحد (theme)").toHaveLength(1)

    const builtHeaders =
      (readFileSync(path.join(rootDir, "dist/_headers"), "utf8")
        .split("\n")
        .find((l) => l.includes("Content-Security-Policy:")) ?? "").replace(
        /^.*Content-Security-Policy:\s*/,
        ""
      )
    const builtScriptSrc = directive(builtHeaders, "script-src")

    // الحزمة: بلا integrity ⇒ لا hash يطابقها، فالمسار الوحيد 'self'.
    expect(external[0].integrity).toBeUndefined()
    expect(browserAllows(builtScriptSrc, external[0])).toBe(true)
    // السكربت المضمّن: hash مطابق لبايتات البناء.
    const expected = sha256(inline[0].body ?? "")
    expect(builtScriptSrc).toContain(`'${expected}'`)
    expect(browserAllows(builtScriptSrc, inline[0])).toBe(true)
  })
})
