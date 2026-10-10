// @vitest-environment node
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { onRequestPost } from "../functions/api/help/chat.js"
import { resetHelpConfigCache } from "../functions/_shared/helpConfig.js"
import { LEGAL_LAST_UPDATED } from "../src/content/legal/version.js"
import { TERMS_POLICY, PRIVACY_POLICY } from "../src/content/legal/policies.js"
import { policyToHtml } from "../src/content/legal/markup.js"

/**
 * بوابة الموافقة على المساعد:
 *   - بلا موافقة على النسخة الحالية: 403 consent_required، ولا تُقرأ الرسالة ولا تُستهلك حصة.
 *   - الموافقة على نسخة قديمة لا تكفي (الاستعلام مقيّد بـ policy_version الحالية).
 *   - تعذّر التحقق: 503 (fail closed).
 * وأيضاً: الصفحات القانونية تصف المساعد وقواعده والمواد الجنائية المغربية.
 */

const SUPABASE = "https://example.supabase.co"
const SERVICE_KEY = "service-test"
const ANON_KEY = "anon-test"

let consentRows: unknown[]
let consentStatus: number
let consentQueries: string[]
let env: Record<string, any>
let answerCalls: number

beforeEach(() => {
  consentRows = []
  consentStatus = 200
  consentQueries = []
  answerCalls = 0
  env = { SUPABASE_URL: SUPABASE, SUPABASE_ANON_KEY: ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, HELP_ALLOW_MEMORY_LIMITER: "1" }
  resetHelpConfigCache()
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: any, init?: any) => {
      const url = String(input)
      const headers = init?.headers || {}
      if (url.startsWith(`${SUPABASE}/rest/v1/legal_consents`)) {
        consentQueries.push(url)
        return new Response(JSON.stringify(consentRows), { status: consentStatus })
      }
      if (url.startsWith(`${SUPABASE}/rest/v1/profiles`)) {
        return new Response(JSON.stringify([{ account_status: "active" }]), { status: 200 })
      }
      if (url.startsWith(`${SUPABASE}/rest/v1/help_settings`)) {
        answerCalls += 1
        return new Response(JSON.stringify([{ enabled: true }]), { status: 200 })
      }
      if (url.startsWith(`${SUPABASE}/rest/v1/help_qa`)) {
        return new Response(JSON.stringify([]), { status: 200 })
      }
      if (!url.startsWith(`${SUPABASE}/auth/v1/user`)) throw new Error(`unexpected fetch ${url}`)
      const token = String(headers.Authorization || "").replace(/^Bearer\s+/i, "")
      if (!token.startsWith("tok-")) return new Response("unauthorized", { status: 401 })
      const id = token.slice(4)
      return new Response(JSON.stringify({ id, email: `${id}@example.test` }), { status: 200 })
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

let ipCounter = 0
function call(message: string, user = "consent-user") {
  ipCounter += 1
  const request = new Request("https://mizan.page/api/help/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CF-Connecting-IP": `198.51.100.${ipCounter % 250}`,
      Authorization: `Bearer tok-${user}-${ipCounter}`,
    },
    body: JSON.stringify({ message }),
  })
  return onRequestPost({ request, env } as any)
}

describe("بوابة الموافقة قبل أول سؤال", () => {
  test("بلا موافقة على النسخة الحالية: 403 consent_required ولا جواب", async () => {
    consentRows = []
    const res = await call("كيف أبحث في الأرشيف؟")
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe("consent_required")
    expect(answerCalls, "the question was processed before consent").toBe(0)
  })

  test("الاستعلام مقيّد بالمستند (terms) وبنسخة النص الحالية وبمعرف المستخدم", async () => {
    consentRows = [{ id: "c" }]
    await call("كيف أبحث في الأرشيف؟", "alice")
    expect(consentQueries).toHaveLength(1)
    const q = new URL(consentQueries[0]).searchParams
    expect(q.get("document")).toBe("eq.terms")
    expect(q.get("policy_version")).toBe(`eq.${LEGAL_LAST_UPDATED}`)
    expect(q.get("user_id")).toMatch(/^eq\./)
  })

  test("موافقة موجودة: يُكمل الطلب بشكل طبيعي", async () => {
    consentRows = [{ id: "c" }]
    const res = await call("كيف أبحث في الأرشيف؟")
    expect(res.status).toBe(200)
    expect(answerCalls).toBe(1)
  })

  test("تعذّر التحقق من الموافقة: 503 (fail closed)", async () => {
    consentStatus = 500
    const res = await call("كيف أبحث في الأرشيف؟")
    expect(res.status).toBe(503)
    expect(answerCalls).toBe(0)
  })
})

describe("الصفحات القانونية تصف المساعد كما هو في الكود", () => {
  const TERMS_HTML = policyToHtml(TERMS_POLICY) as string
  const PRIVACY_HTML = policyToHtml(PRIVACY_POLICY) as string
  const SECTION_TITLES = TERMS_POLICY.sections.map((s) => s.title)

  test("نسخة النص الحالية هي تاريخ 10 أكتوبر 2026 في كل الصفحات", () => {
    expect(LEGAL_LAST_UPDATED).toBe("10 أكتوبر 2026")
    for (const p of [TERMS_POLICY, PRIVACY_POLICY]) {
      expect(p.updatedNote).toContain(LEGAL_LAST_UPDATED)
    }
  })

  test("الشروط تحتوي قسم المساعد: الموافقة، ما يجب فعله، ما يُمنع، والمتابعة القانونية", () => {
    expect(SECTION_TITLES.some((t) => t.includes("المساعد الذكي") && t.includes("الموافقة"))).toBe(true)
    expect(SECTION_TITLES.some((t) => t.includes("ما يجب فعله وما يُمنع"))).toBe(true)
    expect(SECTION_TITLES.some((t) => t.includes("المحاولات الخبيثة"))).toBe(true)
    expect(TERMS_HTML).toContain("المسجّلين فقط")
  })

  test("الشروط تذكر مواد القانون الجنائي المغربي على الصياغة الصحيحة", () => {
    for (const article of ["607-3", "607-4", "607-5", "607-11", "07-03", "09-08"]) {
      expect(TERMS_HTML, `terms omits ${article}`).toContain(article)
    }
    expect(TERMS_HTML).toContain("القانون الجنائي المغربي")
  })

  test("الأرقام المذكورة للمساعد تطابق الثوابت في الكود", () => {
    const chat = readFileSync(join(__dirname, "../functions/api/help/chat.js"), "utf8")
    const daily = Number(chat.match(/const DAILY_LIMIT = (\d+)/)?.[1])
    const burst = Number(chat.match(/const BURST_LIMIT = (\d+)/)?.[1])
    const maxChars = Number(chat.match(/const MAX_MESSAGE_CHARS = (\d+)/)?.[1])
    expect(TERMS_HTML).toContain(`${daily} سؤالاً في اليوم`)
    expect(TERMS_HTML).toContain(`${maxChars} حرف`)
    expect(TERMS_HTML).toContain(`${burst} أسئلة في الدقيقة`)
    expect(PRIVACY_HTML).toContain(`${maxChars} حرف`)
  })

  test("الخصوصية تصف ما يُخزَّن والسجلات وعدم إرسال السؤال لمزود خارجي", () => {
    expect(PRIVACY_HTML).toContain("المساعد الذكي")
    expect(PRIVACY_HTML).toContain("لا يُخزَّن في قاعدة البيانات")
    expect(PRIVACY_HTML).toContain("لا يُرسل نص سؤالك إلى أي مزود ذكاء اصطناعي خارجي")
    expect(PRIVACY_HTML).toContain("لا تحتوي نص السؤال")
  })

  test("وصف الكود المصدري للمساعد لا يزال صحيحاً (لا نموذج خارجي، لا تخزين محلي)", () => {
    const pipeline = readFileSync(join(__dirname, "../shared/help/policy.js"), "utf8")
    expect(pipeline).toContain('llm: "none')
    const chatUi = readFileSync(join(__dirname, "../src/components/help/HelpChat.tsx"), "utf8")
    expect(chatUi).not.toMatch(/localStorage|sessionStorage/)
  })
})
