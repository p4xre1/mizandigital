// اختبارات أمنية ثابتة (بلا شبكة وبلا قاعدة بيانات):
//   • لا مفتاح service_role ولا سر Stripe في الكود المرسَل للمتصفح ولا في البناء.
//   • الأخطاء لا تُرجع تفاصيل داخلية للعميل.
//   • كل workflow في GitHub Actions يحدّد صلاحيات GITHUB_TOKEN صراحةً.
//   • ترويسات الأمان في public/_headers وفي البناء.
//   • قراءة الجسم بحد صارم، وscrubber الأخطاء.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, expect, test } from "vitest"
import { scrub } from "../functions/_shared/errors.js"
import { readBoundedJson, readBoundedText } from "../functions/_shared/bodyLimit.js"
import { onRequestPost as quizSubmit } from "../functions/api/quiz/submit.js"

const ROOT = join(__dirname, "..")

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (["node_modules", ".git"].includes(name)) continue
      walk(full, out)
    } else if (/\.(m?js|cjs|ts|tsx|jsx|json|html|css|txt|md|xml|toml|yml|yaml)$/.test(name) || name === "_headers") {
      out.push(full)
    }
  }
  return out
}

/** يفكّ حمولة JWT (بلا تحقق من التوقيع، لأغراض الفحص فقط). */
function jwtRole(token: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"))
    return typeof payload.role === "string" ? payload.role : null
  } catch {
    return null
  }
}

const JWT_RE = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g
const STRIPE_RE = /\b(?:sk|rk|whsec)_(?:live|test)_[A-Za-z0-9]{8,}/g

describe("لا أسرار في الكود المرسَل للمتصفح أو في البناء", () => {
  const browserTrees = [join(ROOT, "src"), join(ROOT, "shared"), join(ROOT, "public"), join(ROOT, "dist")]

  test("لا JWT بدور service_role في أي ملف مرسَل للمتصفح", () => {
    const leaks: string[] = []
    for (const file of browserTrees.flatMap((d) => walk(d))) {
      const text = readFileSync(file, "utf8")
      for (const token of text.match(JWT_RE) || []) {
        if (jwtRole(token) === "service_role") leaks.push(relative(ROOT, file))
      }
    }
    expect(leaks).toEqual([])
  })

  test("لا مفتاح Stripe سرّي في الكود المرسَل للمتصفح", () => {
    const leaks: string[] = []
    for (const file of browserTrees.flatMap((d) => walk(d))) {
      if (STRIPE_RE.test(readFileSync(file, "utf8"))) leaks.push(relative(ROOT, file))
      STRIPE_RE.lastIndex = 0
    }
    expect(leaks).toEqual([])
  })

  test("لا يُذكر متغير SUPABASE_SERVICE_ROLE_KEY في المتصفح (src/shared)", () => {
    const hits = walk(join(ROOT, "src"))
      .concat(walk(join(ROOT, "shared")))
      .filter((f) => readFileSync(f, "utf8").includes("SUPABASE_SERVICE_ROLE_KEY"))
    expect(hits.map((f) => relative(ROOT, f))).toEqual([])
  })
})

describe("الأخطاء لا تكشف تفاصيل داخلية للعميل", () => {
  const apiFiles = walk(join(ROOT, "functions/api"))

  test("لا يُعاد نص خطأ Supabase/R2 أو رسالة استثناء في أي رد", () => {
    const offenders: string[] = []
    const patterns = [/String\(err\?\.message/, /e\?\.message/, /details:\s*errText/, /detail:\s*detail\.slice/, /detail:\s*String\(/]
    for (const f of apiFiles) {
      const src = readFileSync(f, "utf8")
      if (patterns.some((re) => re.test(src))) offenders.push(relative(ROOT, f))
    }
    expect(offenders).toEqual([])
  })

  test("الأخطاء تُسجَّل عبر logServerError المُنقّى", () => {
    for (const f of [
      "functions/api/r2/presign.js",
      "functions/api/r2/delete.js",
      "functions/api/quiz/submit.js",
      "functions/api/account/delete.js",
      "functions/api/account/restore.js",
      "functions/api/billing/webhook.js",
    ]) {
      expect(readFileSync(join(ROOT, f), "utf8"), f).toContain("logServerError")
    }
  })

  test("scrub يحذف JWT وBearer ومفاتيح Stripe ويقصّ الطول", () => {
    const raw = "Bearer abc.def-ghi token=supersecretvalue eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.sig sk_live_1234567890ab " + "x".repeat(500)
    const out = scrub(raw)
    expect(out).not.toContain("supersecretvalue")
    expect(out).not.toContain("sk_live_1234567890ab")
    expect(out).not.toContain("eyJhbGciOiJIUzI1NiJ9")
    expect(out.length).toBeLessThanOrEqual(200)
  })
})

describe("قراءة الجسم بحد صارم", () => {
  const stream = (chunks: string[]) =>
    new ReadableStream({
      start(c) {
        for (const x of chunks) c.enqueue(new TextEncoder().encode(x))
        c.close()
      },
    })

  test("جسم أكبر من الحد يُرفض 413 دون تحليل", async () => {
    const req = new Request("https://x.test", { method: "POST", body: stream(["{", "a".repeat(200), "}"]), duplex: "half" } as any)
    expect(await readBoundedText(req, 100)).toMatchObject({ ok: false, status: 413 })
  })

  test("JSON غير صالح يُرفض 400", async () => {
    const req = new Request("https://x.test", { method: "POST", body: "{nope" })
    expect(await readBoundedJson(req, 1000)).toMatchObject({ ok: false, status: 400, error: "invalid_json" })
  })

  test("JSON صالح ضمن الحد يُحلَّل", async () => {
    const req = new Request("https://x.test", { method: "POST", body: '{"a":1}' })
    expect(await readBoundedJson(req, 1000)).toEqual({ ok: true, data: { a: 1 } })
  })

  test("quiz/submit يرفض جسماً أكبر من 32 كيلوبايت قبل أي استدعاء لقاعدة البيانات", async () => {
    const huge = JSON.stringify({ mode: "x", answers: [{ q: "a".repeat(40 * 1024) }] })
    const req = new Request("https://mizan.page/api/quiz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.77" },
      body: huge,
    })
    const res = await quizSubmit({ request: req, env: {} } as any)
    expect(res.status).toBe(413)
  })
})

describe("صلاحيات GitHub Actions", () => {
  const workflows = walk(join(ROOT, ".github/workflows")).filter((f) => f.endsWith(".yml"))

  test("كل workflow يحدّد permissions صراحةً على مستوى الملف", () => {
    const missing = workflows.filter((f) => !/^permissions:/m.test(readFileSync(f, "utf8")))
    expect(missing.map((f) => relative(ROOT, f))).toEqual([])
  })

  test("لا workflow يستعمل pull_request_target (يعمل بصلاحيات الفرع الأساسي)", () => {
    const risky = workflows.filter((f) => /pull_request_target/.test(readFileSync(f, "utf8")))
    expect(risky.map((f) => relative(ROOT, f))).toEqual([])
  })
})

describe("ترويسات الأمان", () => {
  const headers = readFileSync(join(ROOT, "public/_headers"), "utf8")

  test("HSTS وX-Content-Type-Options وReferrer-Policy وPermissions-Policy موجودة", () => {
    expect(headers).toMatch(/Strict-Transport-Security: max-age=\d+/)
    expect(headers).toContain("X-Content-Type-Options: nosniff")
    expect(headers).toContain("Referrer-Policy: strict-origin-when-cross-origin")
    expect(headers).toMatch(/Permissions-Policy: .*camera=\(\)/)
  })

  test("CSP: لا unsafe-eval، ولا unsafe-inline في script-src، وclickjacking محجوب", () => {
    const csp = /Content-Security-Policy: (.+)/.exec(headers)?.[1] || ""
    expect(csp).toContain("frame-ancestors 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).not.toContain("unsafe-eval")
    const scriptSrc = /script-src ([^;]+)/.exec(csp)?.[1] || ""
    expect(scriptSrc).not.toContain("unsafe-inline")
    expect(scriptSrc).toContain("'self'")
  })

  test("البناء المنشور (dist/_headers) لا يحوي placeholder ولا يُخفي CSP", () => {
    const built = join(ROOT, "dist/_headers")
    if (!existsSync(built)) return // يُشغَّل بعد npm run build
    const text = readFileSync(built, "utf8")
    expect(text).not.toContain("__MIZAN_INLINE_HASH__")
    expect(text).toContain("Content-Security-Policy:")
  })
})

describe("تثبيت الإجراءات الخارجية في CI", () => {
  test("كل uses: خارجي مثبَّت على commit SHA كامل (40 محرفاً hex)", () => {
    const files = walk(join(ROOT, ".github/workflows")).filter((f) => f.endsWith(".yml"))
    const unpinned: string[] = []
    for (const f of files) {
      for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
        const m = /^\s*-?\s*uses:\s*(\S+)/.exec(line)
        if (!m) continue
        const ref = m[1]
        if (ref.startsWith("./") || ref.startsWith("docker://")) continue
        if (!/@[0-9a-f]{40}$/.test(ref)) unpinned.push(`${relative(ROOT, f)}: ${ref}`)
      }
    }
    expect(unpinned).toEqual([])
  })
})
