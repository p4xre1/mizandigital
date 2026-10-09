import { afterAll, beforeAll, describe, expect, test, vi } from "vitest"
import { onRequestPost } from "../functions/api/account/signup-risk.js"

const HUMAN_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/120.0 Safari/537.36"
let ipCounter = 0
/** A fresh IP per test so the in-memory counters start at zero. */
const freshIp = () => `203.0.113.${(ipCounter += 1) % 250}-${Math.random().toString(36).slice(2)}`

function call(body: unknown, opts: { ip?: string; ua?: string | null; env?: Record<string, string> } = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "CF-Connecting-IP": opts.ip ?? freshIp(),
    "CF-IPCountry": "MA",
  }
  if (opts.ua !== null) headers["User-Agent"] = opts.ua ?? HUMAN_UA
  const request = new Request("https://mizan.page/api/account/signup-risk", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
  return onRequestPost({ request, env: opts.env ?? {} } as any)
}

const legitBody = (over: Record<string, unknown> = {}) => ({
  email: "amina.benali@gmail.com",
  username: "amina_b",
  fullName: "أمينة بنعلي",
  website: "",
  formStartedAt: Date.now() - 60_000,
  ...over,
})

describe("POST /api/account/signup-risk", () => {
  // The endpoint logs every non-allow decision (and internal errors). Keep test output readable.
  beforeAll(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})
  })
  afterAll(() => {
    vi.restoreAllMocks()
  })

  test("allows a legitimate sign-up with no message", async () => {
    const res = await call(legitBody())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({ action: "allow", message: null })
  })

  test("blocks a disposable email and returns a neutral message", async () => {
    const res = await call(legitBody({ email: "bot@mailinator.com" }))
    const data = await res.json()
    expect(data.action).toBe("block")
    expect(typeof data.message).toBe("string")
    expect(data.message.length).toBeGreaterThan(0)
  })

  test("never leaks reasons or signal codes to the client", async () => {
    const res = await call(legitBody({ email: "bot@mailinator.com", website: "http://spam" }))
    const text = await res.text()
    expect(text).not.toMatch(/disposable|honeypot|reasons|score|codes/i)
  })

  test("a filled honeypot is blocked", async () => {
    const data = await (await call(legitBody({ website: "http://spam.example" }))).json()
    expect(data.action).toBe("block")
  })

  test("repeated attempts from one IP escalate to block", async () => {
    const ip = freshIp()
    const actions: string[] = []
    for (let i = 0; i < 22; i += 1) {
      const data = await (await call(legitBody({ email: `person${i}@gmail.com` }), { ip })).json()
      actions.push(data.action)
    }
    // Early attempts are allowed; the 20th attempt in an hour is blocked.
    expect(actions[0]).toBe("allow")
    expect(actions[3]).toBe("allow")
    expect(actions[19]).toBe("block")
  })

  test("a missing user agent alone does not block", async () => {
    const data = await (await call(legitBody(), { ua: null })).json()
    expect(data.action).toBe("allow")
  })

  test("when Turnstile is configured and no token is sent, the attempt is challenged", async () => {
    const data = await (await call(legitBody(), { env: { TURNSTILE_SECRET_KEY: "test-secret" } })).json()
    expect(data.action).toBe("challenge")
  })

  test("rejects bodies above the size limit", async () => {
    const huge = { email: "a@b.co", fullName: "x".repeat(5000) }
    const res = await call(huge)
    expect(res.status).toBe(413)
  })

  test("fails open (allow) if an internal step throws", async () => {
    const throwingHeaders = {
      get(name: string) {
        if (name === "CF-Connecting-IP") throw new Error("boom")
        return null
      },
    }
    const request = {
      headers: throwingHeaders,
      text: async () => JSON.stringify(legitBody()),
    } as unknown as Request
    const res = await onRequestPost({ request, env: {} } as any)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ action: "allow", message: null })
  })
})
