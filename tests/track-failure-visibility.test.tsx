// @vitest-environment jsdom
//
// «لا يختفي عطل التتبّع بصمت»: إدراج page_views يتجاهل خطأه لئلا يرى الزائر
// خطأً، وهذا بالضبط ما يجعل انقطاع الأرقام بلا أثر. المطلوب الآن:
//   1) كل فشل يُحفظ في sessionStorage (بلا بيانات شخصية) ويُقرأ للتشخيص.
//   2) تحذير واحد في console لكل جلسة، مع خطوات الفحص، لا سيل تحذيرات.
//   3) التتبّع نفسه لا يرمي أي خطأ مهما فشل الإدراج أو كان التخزين محجوباً.
//   4) الاستدعاء حقيقي من useTrackView عند خطأ العميل (رندر فعلي بالمكوّن).

import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const insertMock = vi.fn(async () => ({ error: null as unknown }))
vi.mock("../src/lib/supabase/client", () => ({
  supabase: {
    from: () => ({ insert: (...args: unknown[]) => insertMock(...(args as [])) }),
  },
}))

import { describeTrackError, readTrackFailure, recordTrackFailure } from "../src/lib/analytics/trackFailure"
import { useTrackView } from "../src/hooks/useTrackView"

const FAILURE_KEY = "mizan:track_last_error"
const WARNED_KEY = "mizan:track_warned"

let root: Root | null = null
let container: HTMLDivElement | null = null

function Harness({ id = "/schools" }: { id?: string }) {
  useTrackView("page", id)
  return null
}

async function render(ui: ReactElement) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(ui)
  })
  // ندع وعد الإدراج الداخلي يُحل قبل الفحص
  await act(async () => {
    await Promise.resolve()
  })
}

afterEach(() => {
  if (root) act(() => root!.unmount())
  container?.remove()
  root = null
  container = null
  vi.restoreAllMocks()
})

beforeEach(() => {
  window.sessionStorage.clear()
  insertMock.mockReset()
  insertMock.mockResolvedValue({ error: null })
})

describe("أثر فشل تسجيل الزيارة", () => {
  test("يحفظ آخر فشل ويقرؤه، بلا أي حقل شخصي", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    recordTrackFailure("page", "/lexicon/التقادم", { code: "42501", message: "permission denied for table page_views" })
    const failure = readTrackFailure()
    expect(failure).not.toBeNull()
    expect(failure!.contentType).toBe("page")
    expect(failure!.contentId).toBe("/lexicon/التقادم")
    expect(failure!.message).toBe("42501: permission denied for table page_views")
    expect(Object.keys(failure!).sort()).toEqual(["at", "contentId", "contentType", "message"])
  })

  test("تحذير واحد لكل جلسة، ويُحدَّث الأثر مع كل فشل", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    recordTrackFailure("page", "/a", "boom")
    recordTrackFailure("page", "/b", "boom again")
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toContain("page_views")
    expect(String(warn.mock.calls[0][0])).toContain("anyone can log a page view")
    expect(readTrackFailure()!.contentId).toBe("/b")

    // جلسة جديدة (تُفرَّغ العدادات) ⇒ تحذير واحد جديد فقط
    window.sessionStorage.clear()
    recordTrackFailure("page", "/c", "boom")
    expect(warn).toHaveBeenCalledTimes(2)
  })

  test("لا يرمي أي خطأ: خطأ غريب، أو تخزين يرمي عند القراءة والكتابة", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    expect(() => recordTrackFailure("article", "x", undefined)).not.toThrow()
    expect(() => recordTrackFailure("article", "x", { message: "م".repeat(5000) })).not.toThrow()
    expect(describeTrackError({ message: "م".repeat(5000) }).length).toBe(300)

    // متصفح في وضع خاص أو تخزين محجوب: كل نداءات Storage ترمي
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError")
    })
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError")
    })
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("SecurityError")
    })
    expect(() => recordTrackFailure("page", "/x", "boom")).not.toThrow()
    expect(readTrackFailure()).toBeNull()
  })

  test("إدراج ناجح لا يسجّل شيئاً ولا يحذّر، ويخزّن مفتاح الجلسة", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    await render(<Harness id="/news/x" />)
    expect(insertMock).toHaveBeenCalledTimes(1)
    expect(readTrackFailure()).toBeNull()
    expect(warn).not.toHaveBeenCalled()
    expect(window.sessionStorage.getItem("mizan:pv:page:/news/x")).toBe("1")
    expect(window.sessionStorage.getItem(WARNED_KEY)).toBeNull()
  })

  test("إدراج فاشل من useTrackView: يُحفظ الأثر ويُحذَّر مرة واحدة، والزائر لا يرى شيئاً", async () => {
    insertMock.mockResolvedValue({ error: { code: "42501", message: "permission denied for table page_views" } })
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})

    await render(<Harness id="/schools" />)
    const failure = readTrackFailure()
    expect(failure!.contentType).toBe("page")
    expect(failure!.contentId).toBe("/schools")
    expect(failure!.message).toContain("42501")
    expect(warn).toHaveBeenCalledTimes(1)

    // الزائر لا يرى أي خطأ على الشاشة
    expect(document.body.textContent).toBe("")
    // ومفتاح الاستثناء لا يُخزَّن عند الفشل: تُعاد المحاولة في التنقّل التالي
    expect(window.sessionStorage.getItem("mizan:pv:page:/schools")).toBeNull()

    // تنقّل آخر بفشل جديد ⇒ الأثر يُحدَّث بلا تحذير ثانٍ
    if (root) act(() => root!.unmount())
    await render(<Harness id="/articles" />)
    expect(readTrackFailure()!.contentId).toBe("/articles")
    expect(warn).toHaveBeenCalledTimes(1)
  })

  test("رسالة من نوع آخر (JWT) تُحفظ كما هي بلا تفسير مضلّل", async () => {
    insertMock.mockResolvedValue({ error: { message: "JWT expired" } })
    vi.spyOn(console, "warn").mockImplementation(() => {})
    await render(<Harness id="/lexicon/التقادم" />)
    expect(readTrackFailure()!.contentType).toBe("page")
    expect(readTrackFailure()!.message).toBe("JWT expired")
  })
})
