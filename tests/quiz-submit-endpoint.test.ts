import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest"
import { onRequestPost } from "../functions/api/quiz/submit.js"

let ipCounter = 0
/** A fresh IP per test so the in-memory rate-limit counters start at zero. */
const freshIp = () => `198.51.100.${(ipCounter += 1) % 250}-${Math.random().toString(36).slice(2)}`

const HUMAN_ANSWERS = [
  { questionId: "q1", chosen: 2, elapsedMs: 4200 },
  { questionId: "q2", chosen: 0, elapsedMs: 9100 },
  { questionId: "q3", chosen: 3, elapsedMs: 2600 },
  { questionId: "q4", chosen: 1, elapsedMs: 12500 },
  { questionId: "q5", chosen: 2, elapsedMs: 6800 },
]
const BOT_ANSWERS = Array.from({ length: 12 }, (_, i) => ({ questionId: `q${i}`, chosen: 0, elapsedMs: 300 }))

const ENV = { SUPABASE_URL: "https://example.supabase.co", SUPABASE_ANON_KEY: "anon-test" }

function call(body: unknown, opts: { ip?: string; env?: Record<string, string> } = {}) {
  const request = new Request("https://mizan.page/api/quiz/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": opts.ip ?? freshIp() },
    body: JSON.stringify(body),
  })
  return onRequestPost({ request, env: opts.env ?? ENV } as any)
}

const payload = (answers: unknown[], over: Record<string, unknown> = {}) => ({
  mode: "general",
  label: "اختبار",
  tier: "general",
  answers,
  durationMs: 60_000,
  ...over,
})

describe("POST /api/quiz/submit — anti-farming and rate limit", () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeAll(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  const stubRpc = () => {
    fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify([{ id: "att-1", xp_earned: 42 }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    )
    vi.stubGlobal("fetch", fetchMock)
  }

  test("a human session is forwarded to the RPC and recorded", async () => {
    stubRpc()
    const res = await call(payload(HUMAN_ANSWERS))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toMatchObject({ ok: true, recorded: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toContain("/rest/v1/rpc/submit_quiz_attempt")
  })

  test("a bot session is dropped silently: 202, no RPC call, no reasons in the body", async () => {
    stubRpc()
    const res = await call(payload(BOT_ANSWERS, { durationMs: 4000 }))
    expect(res.status).toBe(202)
    const text = await res.text()
    expect(text).not.toMatch(/fast_answers|uniform|constant|score/)
    expect(JSON.parse(text)).toEqual({ ok: true, recorded: false })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test("the 21st attempt from one IP within the window is rate limited (fixed call signature)", async () => {
    stubRpc()
    const ip = freshIp()
    for (let i = 0; i < 20; i += 1) {
      const ok = await call(payload(HUMAN_ANSWERS), { ip })
      expect(ok.status).toBe(200)
    }
    const limited = await call(payload(HUMAN_ANSWERS), { ip })
    expect(limited.status).toBe(429)
    expect(Number(limited.headers.get("Retry-After"))).toBeGreaterThan(0)
    const body = await limited.json()
    expect(body.retryAfter).toBeGreaterThan(0)
  })

  test("invalid payloads are rejected before any rate or RPC work", async () => {
    stubRpc()
    expect((await call({ mode: "general", answers: [] })).status).toBe(400)
    expect((await call(payload(Array.from({ length: 101 }, () => HUMAN_ANSWERS[0])))).status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test("missing Supabase configuration returns 500 and never calls the RPC", async () => {
    stubRpc()
    const res = await call(payload(HUMAN_ANSWERS), { env: {} })
    expect(res.status).toBe(500)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
