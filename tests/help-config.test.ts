import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { loadHelpConfig, resetHelpConfigCache } from "../functions/_shared/helpConfig.js"

const env = { SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-service-key" }
let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  resetHelpConfigCache()
  fetchMock = vi.fn(async (url: string) => new Response(JSON.stringify(
    url.includes("/help_settings?") ? [{ id: 1, enabled: true }] : [],
  )))
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  resetHelpConfigCache()
})

describe("help configuration failure diagnostics", () => {
  test("distinguishes missing URL from missing service-role secret without a network call", async () => {
    await expect(loadHelpConfig({ SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY }))
      .rejects.toMatchObject({ code: "missing_supabase_url", upstreamStatus: null })
    await expect(loadHelpConfig({ SUPABASE_URL: env.SUPABASE_URL }))
      .rejects.toMatchObject({ code: "missing_service_key", upstreamStatus: null })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test.each(["help_settings", "help_qa"])("preserves %s upstream status without its response body", async (table) => {
    fetchMock.mockImplementation(async (url: string) => url.includes(`/${table}?`)
      ? new Response("sensitive upstream body", { status: 403 })
      : new Response(JSON.stringify([{ id: 1 }])))
    const error = await loadHelpConfig(env).catch((error: Error) => error)
    expect(error).toMatchObject({ code: table === "help_settings" ? "settings_http" : "qa_http", upstreamStatus: 403 })
    expect(JSON.stringify(error)).not.toContain("sensitive upstream body")
    expect(JSON.stringify(error)).not.toContain(env.SUPABASE_SERVICE_ROLE_KEY)
  })

  test.each([
    ["TimeoutError", "fetch_timeout"],
    ["TypeError", "fetch_failed"],
  ])("classifies %s and does not retain arbitrary network error details", async (name, code) => {
    fetchMock.mockRejectedValue(Object.assign(new Error("sensitive network details"), { name }))
    await expect(loadHelpConfig(env)).rejects.toMatchObject({
      code, upstreamStatus: null, message: "Help configuration request failed",
    })
  })

  test("does not cache a failure: repaired configuration is used immediately", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"))
    await expect(loadHelpConfig(env)).rejects.toMatchObject({ code: "fetch_failed" })
    await expect(loadHelpConfig(env)).resolves.toMatchObject({ settings: { enabled: true }, customEntries: [] })
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  test("reports a missing singleton rather than serving default rules", async () => {
    fetchMock.mockImplementation(async () => new Response("[]"))
    await expect(loadHelpConfig(env)).rejects.toMatchObject({ code: "settings_row_missing" })
  })
})
