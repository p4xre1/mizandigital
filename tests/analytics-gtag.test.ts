/**
 * Google Analytics — regression test لعطل «لا يُرسل GA أي بيانات».
 *
 * السبب الجذري: كان shim الخاص بـ window.gtag يدفع مصفوفة `args` إلى dataLayer
 * بدل كائن `arguments`. gtag.js يتجاهل هذه المدخلات بصمت، فلا يُنفَّذ
 * js/config/consent/event ولا يُرسل أي hit. الاختبار يشغّل الكود الفعلي بمتصفح
 * مُحاكى (بلا شبكة) ويتحقق من أن الأوامر تصل بالنوع الصحيح وأن المحمّل يُطلب.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

type Listener = (ev?: unknown) => void

function isArgumentsObject(value: unknown): boolean {
  return Object.prototype.toString.call(value) === "[object Arguments]"
}

describe("Google Analytics gtag shim", () => {
  let listeners: Record<string, Listener[]>
  let appended: Array<{ src?: string }>

  beforeEach(() => {
    vi.resetModules()
    listeners = {}
    appended = []
    const win: Record<string, unknown> = {
      location: { search: "", href: "https://www.mizan.page/", pathname: "/" },
      localStorage: { getItem: () => null, setItem: () => undefined },
      addEventListener: (type: string, fn: Listener) => {
        ;(listeners[type] ||= []).push(fn)
      },
      removeEventListener: (type: string, fn: Listener) => {
        listeners[type] = (listeners[type] || []).filter((f) => f !== fn)
      },
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    }
    ;(globalThis as Record<string, unknown>).window = win
    ;(globalThis as Record<string, unknown>).document = {
      readyState: "complete",
      referrer: "",
      title: "",
      head: { appendChild: (el: { src?: string }) => appended.push(el) },
      createElement: () => ({}),
    }
  })

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).window
    delete (globalThis as Record<string, unknown>).document
    vi.useRealTimers()
  })

  test("الأوامر تُدفع كـ arguments حقيقية وتُحمَّل gtag.js عند أول تفاعل", async () => {
    const { initAnalytics } = await import("@/lib/analytics/gtag")
    initAnalytics()

    const win = (globalThis as unknown as { window: Record<string, any> }).window
    expect(typeof win.gtag).toBe("function")

    // الإعداد الافتراضي للموافقة يجب أن يكون مدفوعاً كـ arguments
    const dl: unknown[] = win.dataLayer
    expect(dl.length).toBeGreaterThan(0)
    expect(isArgumentsObject(dl[0])).toBe(true)
    expect(Array.from(dl[0] as ArrayLike<unknown>)).toEqual([
      "consent",
      "default",
      { analytics_storage: "denied", wait_for_update: 500 },
    ])

    // لا تحميل قبل التفاعل
    expect(appended.length).toBe(0)

    // أول تفاعل حقيقي → تحميل المحمّل
    for (const fn of [...(listeners["pointerdown"] || [])]) fn({})
    expect(appended.some((el) => String(el.src).startsWith("https://www.googletagmanager.com/gtag/js?id=G-S52GPR2RWL"))).toBe(true)

    // js و config يجب أن يصلا أيضاً كـ arguments (وإلا لا يُرسل GA شيئاً)
    const commands = dl.filter(isArgumentsObject).map((a) => Array.from(a as ArrayLike<unknown>))
    expect(commands.some((c) => c[0] === "js" && c[1] instanceof Date)).toBe(true)
    expect(commands.some((c) => c[0] === "config" && c[1] === "G-S52GPR2RWL")).toBe(true)
  })
})
