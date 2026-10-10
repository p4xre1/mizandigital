// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { MemoryRouter } from "react-router-dom"
import { LEGAL_LAST_UPDATED } from "../src/content/legal/version.js"

/**
 * بوابة الموافقة داخل واجهة المساعد:
 *   - مسجّل بلا موافقة متزامنة على النسخة الحالية: تظهر البوابة ولا تظهر خانة السؤال.
 *   - زر المتابعة معطّل حتى تُؤشَّر الخانة.
 *   - مسجّل بموافقة متزامنة على النسخة الحالية: تظهر المحادثة مباشرة.
 */

const authState: { session: unknown } = { session: null }

vi.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ session: authState.session, initialized: true }),
}))

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
    rpc: vi.fn(async () => ({ data: null, error: null })),
  },
}))

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const CONSENT_KEY = "mizan:legal:consent:v1"
let container: HTMLDivElement | null = null
let root: Root | null = null

async function renderAssistant() {
  const { default: HelpChat } = await import("@/components/help/HelpChat")
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(
      <MemoryRouter>
        <HelpChat compact />
      </MemoryRouter>,
    )
  })
  return container
}

beforeEach(() => {
  localStorage.clear()
  authState.session = { access_token: "tok", user: { id: "u1", app_metadata: { provider: "email" } } }
})

afterEach(() => {
  if (root) act(() => root!.unmount())
  root = null
  container?.remove()
  container = null
})

describe("بوابة الموافقة في واجهة المساعد", () => {
  it("مسجّل بلا موافقة: تظهر البوابة وزر المتابعة معطّل، ولا تظهر خانة السؤال", async () => {
    const el = await renderAssistant()
    expect(el.textContent).toContain("قبل استعمال المساعد")
    expect(el.querySelector("#help-chat-input")).toBeNull()
    const button = [...el.querySelectorAll("button")].find((b) => b.textContent?.includes("موافقة ومتابعة"))!
    expect(button.disabled).toBe(true)
  })

  it("تأشير الخانة يفعّل الزر", async () => {
    const el = await renderAssistant()
    const checkbox = el.querySelector<HTMLInputElement>("#assistant-consent")!
    await act(async () => {
      checkbox.click()
    })
    const button = [...el.querySelectorAll("button")].find((b) => b.textContent?.includes("موافقة ومتابعة"))!
    expect(button.disabled).toBe(false)
  })

  it("موافقة متزامنة على النسخة الحالية: تظهر المحادثة مباشرة", async () => {
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({
        policyVersion: LEGAL_LAST_UPDATED,
        agreedAt: new Date().toISOString(),
        method: "email",
        documents: ["privacy", "terms"],
        synced: true,
      }),
    )
    const el = await renderAssistant()
    expect(el.querySelector("#help-chat-input")).not.toBeNull()
    expect(el.textContent).not.toContain("قبل استعمال المساعد")
  })

  it("موافقة على نسخة قديمة لا تكفي", async () => {
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({
        policyVersion: "27 شتنبر 2026",
        agreedAt: new Date().toISOString(),
        method: "email",
        documents: ["privacy", "terms"],
        synced: true,
      }),
    )
    const el = await renderAssistant()
    expect(el.textContent).toContain("قبل استعمال المساعد")
  })
})
