import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { onRequestPost } from "../functions/api/help/chat.js"

const SUPABASE = "https://example.supabase.co"
const ENV = { SUPABASE_URL: SUPABASE, SUPABASE_ANON_KEY: "anon-test" }

let ipCounter = 0
/** IP جديد لكل طلب حتى لا يصطدم حد الـIP بالاختبارات. */
const freshIp = () => `203.0.113.${(ipCounter += 1) % 250}-${Math.random().toString(36).slice(2)}`
/** مستخدم جديد لكل اختبار حتى لا تتراكم حصصه. */
let userCounter = 0
const freshUser = () => `user-${(userCounter += 1)}-${Math.random().toString(36).slice(2)}`

/**
 * يحاكي Supabase Auth: الرمز "tok-<id>" يمثل مستخدماً مسجلاً، وأي رمز آخر مرفوض.
 * كل ما عدا /auth/v1/user يُعد خطأ في الاختبار.
 */
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: any, init?: any) => {
      const url = String(input)
      if (!url.startsWith(`${SUPABASE}/auth/v1/user`)) throw new Error(`unexpected fetch ${url}`)
      const auth: string = init?.headers?.Authorization || ""
      const token = auth.replace(/^Bearer\s+/i, "")
      if (!token.startsWith("tok-")) return new Response("unauthorized", { status: 401 })
      const id = token.slice(4)
      return new Response(JSON.stringify({ id, email: `${id}@example.test` }), { status: 200 })
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

type CallOpts = {
  ip?: string
  rawBody?: string
  headers?: Record<string, string>
  /** الافتراضي: رمز مستخدم جديد. اجعله "" لإرسال طلب بلا رمز. */
  token?: string
  user?: string
}

function call(body: unknown, opts: CallOpts = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json", "CF-Connecting-IP": opts.ip ?? freshIp(), ...(opts.headers ?? {}) }
  const token = opts.token ?? `tok-${opts.user ?? freshUser()}`
  if (token) headers.Authorization = `Bearer ${token}`
  const request = new Request("https://mizan.page/api/help/chat", {
    method: "POST",
    headers,
    body: opts.rawBody ?? JSON.stringify(body),
  })
  return onRequestPost({ request, env: ENV } as any)
}

describe("POST /api/help/chat: تسجيل الدخول", () => {
  test("بلا رمز دخول: 401 ولا جواب", async () => {
    const res = await call({ message: "كيف أبحث في الأرشيف؟" }, { token: "" })
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe("auth_required")
  })

  test("رمز مرفوض من Supabase: 401", async () => {
    const res = await call({ message: "كيف أبحث في الأرشيف؟" }, { token: "bad-token" })
    expect(res.status).toBe(401)
  })

  test("مستخدم مسجّل: جواب مع الحصة المتبقية وترويسة no-store", async () => {
    const res = await call({ message: "كيف أبحث في الأرشيف؟" })
    expect(res.status).toBe(200)
    expect(res.headers.get("Cache-Control")).toBe("no-store")
    const data = await res.json()
    expect(data.mode).toBe("answer")
    expect(data.sources.map((s: { url: string }) => s.url)).toContain("/archive")
    expect(data.quota).toEqual({ limit: 20, remaining: 19 })
  })
})

describe("POST /api/help/chat: الحصة اليومية", () => {
  test("بعد 20 سؤالاً في اليوم يأتي الرد 429 مع رمز daily_limit_reached", async () => {
    const user = freshUser()
    for (let i = 0; i < 20; i += 1) {
      const ok = await call({ message: "كيف أبحث في الأرشيف؟" }, { user })
      expect(ok.status).toBe(200)
    }
    const blocked = await call({ message: "كيف أبحث في الأرشيف؟" }, { user })
    expect(blocked.status).toBe(429)
    const data = await blocked.json()
    expect(data.error).toBe("daily_limit_reached")
    expect(data.quota).toEqual({ limit: 20, remaining: 0 })
  })

  test("الحصة فردية: استنفاد مستخدم لا يؤثر على مستخدم آخر", async () => {
    const exhausted = freshUser()
    for (let i = 0; i < 20; i += 1) await call({ message: "كيف أبحث في الأرشيف؟" }, { user: exhausted })
    expect((await call({ message: "كيف أبحث في الأرشيف؟" }, { user: exhausted })).status).toBe(429)
    const other = await call({ message: "كيف أبحث في الأرشيف؟" })
    expect(other.status).toBe(200)
  })

  test("الطلب غير الصالح لا يستهلك الحصة", async () => {
    const user = freshUser()
    expect((await call({}, { user })).status).toBe(400)
    expect((await call({ message: "a" }, { user })).status).toBe(400)
    const res = await call({ message: "كيف أبحث في الأرشيف؟" }, { user })
    expect((await res.json()).quota.remaining).toBe(19)
  })
})

describe("POST /api/help/chat: العربية فقط", () => {
  test("سؤال بالفرنسية يتوقف برسالة اللغة ولا يجيب من المحتوى", async () => {
    const res = await call({ message: "Comment chercher dans le lexique ?" })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.mode).toBe("unsupported_language")
    expect(data.answer).toContain("العربية فقط")
    expect(data.sources).toEqual([])
  })

  test("سؤال بالإنجليزية يتوقف أيضاً", async () => {
    const data = await (await call({ message: "How do I search the archive?" })).json()
    expect(data.mode).toBe("unsupported_language")
  })

  test("سؤال عربي فيه كلمة لاتينية قصيرة يُجاب عادياً", async () => {
    const data = await (await call({ message: "كيف أحمل ملفات PDF من الأرشيف؟" })).json()
    expect(data.mode).toBe("answer")
  })

  test("اللغة غير المرفوضة لا تُستهلك حصة مجانية: تُحتسب ضمن الحصة", async () => {
    const user = freshUser()
    const data = await (await call({ message: "Comment chercher ?" }, { user })).json()
    expect(data.quota.remaining).toBe(19)
  })
})

describe("POST /api/help/chat: التحقق من المدخلات", () => {
  test("سؤال أقصر من حرفين: 400 مع رمز الخطأ", async () => {
    const res = await call({ message: "a" })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe("message:too_short")
  })

  test("سؤال أطول من 500 حرف: 400", async () => {
    const res = await call({ message: "ب".repeat(501) })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe("message:too_long")
  })

  test("بلا حقل message أو برقم بدلاً من نص: 400", async () => {
    expect((await call({})).status).toBe(400)
    expect((await call({ message: 42 })).status).toBe(400)
  })

  test("محاولة حقن HTML تُرفض برد عام بلا كشف سبب الاكتشاف", async () => {
    const res = await call({ message: "<script>alert(1)</script> كيف أبحث" })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.mode).toBe("refused")
    expect(JSON.stringify(data)).not.toMatch(/injection|pattern|regex/i)
  })

  test("جسم أكبر من 4 كيلوبايت: 413", async () => {
    const res = await call(null, { rawBody: "{}", headers: { "Content-Length": "5000" } })
    expect(res.status).toBe(413)
  })

  test("JSON غير صالح: خطأ من 400 إلى 499 بلا انهيار", async () => {
    const res = await call(null, { rawBody: "{not json" })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  test("بعد 20 طلباً من IP واحد يأتي الرد 429 من حد الـIP", async () => {
    const ip = freshIp()
    for (let i = 0; i < 20; i += 1) {
      const ok = await call({ message: "كيف أبحث في الأرشيف؟" }, { ip })
      expect(ok.status).toBe(200)
    }
    const limited = await call({ message: "كيف أبحث في الأرشيف؟" }, { ip })
    expect(limited.status).toBe(429)
  })
})
