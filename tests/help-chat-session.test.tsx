// @vitest-environment jsdom
//
// إصلاح «انتهت جلستك. سجّل الدخول من جديد لمتابعة السؤال.» الكاذبة.
//
// السيناريو المُنتَج: المستخدم مسجّل دخول وجلسته قابلة للتجديد، لكن رمز
// الوصول المعروض وقت التصيير (يُلتقط في HelpChat عند التصيير) انتهى أثناء
// خمول التبويب، فيرفض الخادم الطلب بـ401. قبل الإصلاح كان هذا يُترجم فوراً
// إلى «انتهت جلستك». ما تثبته هذه الاختبارات بعد الإصلاح:
//   • رمز قريب من الانتهاء يُجدَّد استباقياً قبل الإرسال.
//   • بعد 401: تجديد صريح وإعادة محاولة واحدة، ويصل الجواب بلا رسالة انتهاء.
//   • الجلسة المنتهية فعلاً (رفض التجديد) ما زالت تعرض «انتهت جلستك» —
//     الأمان لم يُخفَّض، فقط اختفى الإنذار الكاذب.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { MemoryRouter } from "react-router-dom"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
}))

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      refreshSession: mocks.refreshSession,
    },
  },
}))

// جلسة مسجّل دخول ثابتة — الرمز الملتقط وقت التصيير هو ما كان يسبب العطل.
vi.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    initialized: true,
    session: { access_token: "tok-render-time", user: { id: "u-1", email: "u@example.com" } },
    user: { id: "u-1", email: "u@example.com" },
    profile: null,
    profileLoading: false,
    rank: { id: "D", level: 1, label: "مبتدئ", glyph: "D" },
    isAdmin: false,
    isPro: false,
    syncError: null,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signInWithGoogle: vi.fn(),
    resetPassword: vi.fn(),
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
    saveProfile: vi.fn(),
    pushProgress: vi.fn(),
  }),
}))

import HelpChat from "../src/components/help/HelpChat"

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const SESSION_EXPIRED = "انتهت جلستك. سجّل الدخول من جديد لمتابعة السؤال."
const NOW_MS = 1_750_000_000_000
const HOUR = 3600

function supabaseSession(access_token: string, expiresInSec: number) {
  return {
    access_token,
    refresh_token: "rt",
    expires_at: Math.floor(NOW_MS / 1000) + expiresInSec,
    user: { id: "u-1", email: "u@example.com" },
  }
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

const ANSWER_OK = {
  answer: "تجد الملخصات في صفحة الأرشيف.",
  mode: "answer",
  sources: [],
  questionUsed: "فين نلقى الملخصات؟",
  quota: { limit: 5, remaining: 4 },
}

let container: HTMLDivElement | null = null
let root: Root | null = null
let fetchSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(Date, "now").mockReturnValue(NOW_MS)
  // jsdom لا ينفّذ تمرير العناصر.
  ;(Element.prototype as unknown as { scrollTo: () => void }).scrollTo = () => {}
  fetchSpy = vi.fn()
  vi.stubGlobal("fetch", fetchSpy)
})

afterEach(() => {
  if (root) act(() => root!.unmount())
  root = null
  container?.remove()
  container = null
  vi.unstubAllGlobals()
})

async function renderChat() {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(
      <MemoryRouter initialEntries={["/help"]}>
        <HelpChat />
      </MemoryRouter>,
    )
  })
  return container!
}

async function typeAndSend(el: HTMLElement, text: string) {
  const input = el.querySelector<HTMLInputElement>("#help-chat-input")!
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!
  await act(async () => {
    setter.call(input, text)
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })
  const form = el.querySelector("form")!
  await act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
  })
}

describe("مساعد الأسئلة: لا «انتهت جلستك» كاذبة والجلسة قابلة للتجديد", () => {
  it("رمز قريب من الانتهاء يجدَّد استباقياً: سؤال واحد، وجواب بلا إنذار", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: supabaseSession("tok-render-time", 10) }, error: null })
    mocks.refreshSession.mockResolvedValue({ data: { session: supabaseSession("tok-refreshed", HOUR) }, error: null })
    fetchSpy.mockResolvedValue(jsonResponse(200, ANSWER_OK))

    const el = await renderChat()
    await typeAndSend(el, "فين نلقى الملخصات؟")

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const init = fetchSpy.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok-refreshed")
    expect(el.textContent).toContain("تجد الملخصات في صفحة الأرشيف.")
    expect(el.textContent).not.toContain(SESSION_EXPIRED)
  })

  it("401 ثم تجديد ناجح: إعادة محاولة واحدة والجواب يصل (السيناريو المُبلَّغ عنه)", async () => {
    // الرمز ما زال «بعيداً» محلياً لكن الخادم رفضه (ساعة الجهاز، تجزئة…).
    mocks.getSession.mockResolvedValue({ data: { session: supabaseSession("tok-render-time", HOUR) }, error: null })
    mocks.refreshSession.mockResolvedValue({ data: { session: supabaseSession("tok-refreshed", HOUR) }, error: null })
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(401, { error: "auth_required" }))
      .mockResolvedValueOnce(jsonResponse(200, ANSWER_OK))

    const el = await renderChat()
    await typeAndSend(el, "فين نلقى الملخصات؟")

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    const first = fetchSpy.mock.calls[0][1] as RequestInit
    const second = fetchSpy.mock.calls[1][1] as RequestInit
    expect((first.headers as Record<string, string>).Authorization).toBe("Bearer tok-render-time")
    expect((second.headers as Record<string, string>).Authorization).toBe("Bearer tok-refreshed")
    expect(el.textContent).toContain("تجد الملخصات في صفحة الأرشيف.")
    expect(el.textContent).not.toContain(SESSION_EXPIRED)
  })

  it("الجلسة منتهية فعلاً (رفض التجديد): تبقى رسالة الانتهاء بلا جواب مختلق", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: supabaseSession("tok-render-time", HOUR) }, error: null })
    mocks.refreshSession.mockResolvedValue({ data: { session: null }, error: new Error("invalid_grant") })
    fetchSpy.mockResolvedValue(jsonResponse(401, { error: "auth_required" }))

    const el = await renderChat()
    await typeAndSend(el, "فين نلقى الملخصات؟")

    // محاولة واحدة فقط: التجديد فشل، فلا إعادة محاولة عقيمة ولا حلقة.
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(el.textContent).toContain(SESSION_EXPIRED)
    expect(el.textContent).not.toContain(ANSWER_OK.answer)
  })

  it("جلسة صالحة من أول نداء: بلا تجديد ولا رسالة خطأ", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: supabaseSession("tok-valid", HOUR) }, error: null })
    fetchSpy.mockResolvedValue(jsonResponse(200, ANSWER_OK))

    const el = await renderChat()
    await typeAndSend(el, "فين نلقى الملخصات؟")

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const init = fetchSpy.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok-valid")
    expect(mocks.refreshSession).not.toHaveBeenCalled()
    expect(el.textContent).toContain(ANSWER_OK.answer)
    expect(el.textContent).not.toContain(SESSION_EXPIRED)
  })
})
