import { afterEach, describe, expect, test, vi } from "vitest"
import { checkSignupRisk } from "../src/lib/security/signupRisk"

const input = { email: "amina@gmail.com", formStartedAt: Date.now() - 30_000, website: "" }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("checkSignupRisk (browser helper)", () => {
  test("returns the server decision and message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ action: "block", message: "تعذّر إنشاء الحساب الآن." }), { status: 200 })),
    )
    await expect(checkSignupRisk(input)).resolves.toEqual({ action: "block", message: "تعذّر إنشاء الحساب الآن." })
  })

  test("posts the signals to the same-origin endpoint as JSON", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ action: "allow", message: null }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)
    await checkSignupRisk(input)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("/api/account/signup-risk")
    expect(init.method).toBe("POST")
    expect(JSON.parse(String(init.body))).toMatchObject({ email: "amina@gmail.com", website: "" })
  })

  test("fails open on network errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network down") }))
    await expect(checkSignupRisk(input)).resolves.toEqual({ action: "allow", message: null })
  })

  test("fails open on server errors and malformed answers", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("oops", { status: 500 })))
    await expect(checkSignupRisk(input)).resolves.toEqual({ action: "allow", message: null })

    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ action: "nuke" }), { status: 200 })))
    await expect(checkSignupRisk(input)).resolves.toEqual({ action: "allow", message: null })
  })
})
