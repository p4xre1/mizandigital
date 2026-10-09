import { describe, expect, test } from "vitest"
import { onRequestPost } from "../functions/api/help/chat.js"

let ipCounter = 0
/** IP جديد لكل اختبار حتى لا تتراكم عدادات الحد في الذاكرة. */
const freshIp = () => `203.0.113.${(ipCounter += 1) % 250}-${Math.random().toString(36).slice(2)}`

function call(body: unknown, opts: { ip?: string; rawBody?: string; headers?: Record<string, string> } = {}) {
  const request = new Request("https://mizan.page/api/help/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": opts.ip ?? freshIp(), ...(opts.headers ?? {}) },
    body: opts.rawBody ?? JSON.stringify(body),
  })
  return onRequestPost({ request, env: {} } as any)
}

describe("POST /api/help/chat", () => {
  test("سؤال عن الموقع يُجاب بوضع answer مع روابط وترويسة no-store", async () => {
    const res = await call({ message: "كيف أبحث في الأرشيف؟" })
    expect(res.status).toBe(200)
    expect(res.headers.get("Cache-Control")).toBe("no-store")
    const data = await res.json()
    expect(data.mode).toBe("answer")
    expect(data.sources.map((s: { url: string }) => s.url)).toContain("/archive")
  })

  test("السؤال الفردي يُرفض بوضع refused بلا جواب قانوني", async () => {
    const res = await call({ message: "هل يحق لي فسخ عقد الكراء في حالتي؟" })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.mode).toBe("refused")
    expect(data.answer).toContain("لا أقدّم استشارات قانونية")
  })

  test("بلا حقل message أو برقم بدلاً من نص: 400", async () => {
    expect((await call({})).status).toBe(400)
    expect((await call({ message: 42 })).status).toBe(400)
  })

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

  test("JSON غير صالح: يرجع خطأ 400 بلا انهيار", async () => {
    const res = await call(null, { rawBody: "{not json" })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  test("بعد 20 رسالة من IP واحد يأتي الرد 429", async () => {
    const ip = freshIp()
    for (let i = 0; i < 20; i += 1) {
      const ok = await call({ message: "كيف أبحث في الأرشيف؟" }, { ip })
      expect(ok.status).toBe(200)
    }
    const limited = await call({ message: "كيف أبحث في الأرشيف؟" }, { ip })
    expect(limited.status).toBe(429)
  })
})
