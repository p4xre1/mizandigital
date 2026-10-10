// تجديد رمز الجلسة قبل أن يرفضه الخادم.
//
// المشكلة التي نحمي منها هنا: رمز Supabase (JWT) يعيش ساعة واحدة. إن بقيت
// الصفحة مفتوحة طويلاً ثم أرسل المستخدم طلبه قبل أن يكتمل تجديد supabase-js
// التلقائي، يصل رمز منتهٍ إلى الخادم فيردّ 401 وتظهر «انتهت جلستك» رغم أن
// الجلسة قابلة للتجديد. هذه الاختبارات تثبت:
//   • الرمز الصالح يُرسل كما هو دون تجديد زائد.
//   • الرمز القريب من الانتهاء يُجدَّد استباقياً قبل الإرسال.
//   • بعد 401 يُجدَّد مرة واحدة ويُعاد النداء، ولا تُعلن النهاية إلا إن فشل
//     التجديد فعلاً (رمز التحديث ملغى) — فلا نفقد الأمان ولا نزعج المستخدم.
import { describe, expect, it, vi, beforeEach } from "vitest"

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

import {
  freshAccessToken,
  refreshedAccessToken,
  withAuthRetry,
  EXPIRY_MARGIN_MS,
} from "../src/lib/auth/sessionToken"

const NOW_MS = 1_750_000_000_000

function session(access_token: string, expiresInSec: number, refresh_token = "rt-old") {
  return {
    access_token,
    refresh_token,
    expires_at: Math.floor(NOW_MS / 1000) + expiresInSec,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(Date, "now").mockReturnValue(NOW_MS)
})

describe("freshAccessToken — رمز صالح لحظة النداء", () => {
  it("رمز بعيد عن الانتهاء يُرسل كما هو دون تجديد", async () => {
    mocks.getSession.mockResolvedValueOnce({ data: { session: session("tok-fresh", 3600) }, error: null })
    expect(await freshAccessToken()).toBe("tok-fresh")
    expect(mocks.refreshSession).not.toHaveBeenCalled()
  })

  it("رمز داخل هامش الانتهاء يُجدَّد استباقياً قبل الإرسال", async () => {
    const withinMargin = Math.floor(EXPIRY_MARGIN_MS / 1000) - 5 // 25 ثانية
    mocks.getSession.mockResolvedValueOnce({ data: { session: session("tok-stale", withinMargin) }, error: null })
    mocks.refreshSession.mockResolvedValueOnce({ data: { session: session("tok-renewed", 3600) }, error: null })
    expect(await freshAccessToken()).toBe("tok-renewed")
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1)
  })

  it("بلا جلسة يعيد null (لا يرمي ولا يختلق رمزاً)", async () => {
    mocks.getSession.mockResolvedValueOnce({ data: { session: null }, error: null })
    expect(await freshAccessToken()).toBeNull()
  })

  it("فشل قراءة الجلسة أو رميها يعيد null بدل الانهيار", async () => {
    mocks.getSession.mockResolvedValueOnce({ data: { session: null }, error: new Error("boom") })
    expect(await freshAccessToken()).toBeNull()
    mocks.getSession.mockRejectedValueOnce(new Error("network"))
    expect(await freshAccessToken()).toBeNull()
  })
})

describe("refreshedAccessToken — تجديد صريح", () => {
  it("يعيد الرمز الجديد عند نجاح التجديد", async () => {
    mocks.refreshSession.mockResolvedValueOnce({ data: { session: session("tok-new", 3600) }, error: null })
    expect(await refreshedAccessToken()).toBe("tok-new")
  })

  it("يعيد null إن رفضت Supabase التجديد (جلسة منتهية فعلاً)", async () => {
    mocks.refreshSession.mockResolvedValueOnce({ data: { session: null }, error: new Error("invalid_grant") })
    expect(await refreshedAccessToken()).toBeNull()
  })
})

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

describe("withAuthRetry — إعادة محاولة واحدة بعد 401", () => {
  it("نجاح أول: لا تجديد ولا إعادة محاولة", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: session("tok-ok", 3600) }, error: null })
    const run = vi.fn(async (token: string) => ({
      res: jsonResponse(200, { answer: "أهلاً", token }),
      data: { answer: "أهلاً", token },
    }))
    const out = await withAuthRetry(run)
    expect(out.res.status).toBe(200)
    expect(run).toHaveBeenCalledTimes(1)
    expect(mocks.refreshSession).not.toHaveBeenCalled()
  })

  it("بعد 401: يجدّد ويعيد النداء بالرمز الجديد مرة واحدة", async () => {
    // رمز بعيد عن الانتهاء محلياً (لا تجديد استباقي)، لكن الخادم رفضه بـ401 —
    // هنا يجب أن يُجدَّد صراحةً ويُعاد النداء بالرمز الجديد.
    mocks.getSession.mockResolvedValue({ data: { session: session("tok-stale", 3600) }, error: null })
    mocks.refreshSession.mockResolvedValue({ data: { session: session("tok-new", 3600) }, error: null })

    const seenTokens: string[] = []
    let calls = 0
    const run = vi.fn(
      async (token: string): Promise<{ res: Response; data: Record<string, unknown> | null }> => {
        seenTokens.push(token)
        calls += 1
        if (calls === 1) return { res: jsonResponse(401, { error: "auth_required" }), data: { error: "auth_required" } }
        return { res: jsonResponse(200, { answer: "إجابة" }), data: { answer: "إجابة" } }
      },
    )

    const out = await withAuthRetry(run)
    expect(out.res.status).toBe(200)
    expect(run).toHaveBeenCalledTimes(2)
    expect(seenTokens[0]).toBe("tok-stale")
    expect(seenTokens[1]).toBe("tok-new")
  })

  it("فشل التجديد بعد 401: يعيد الـ401 ولا يعيد المحاولة (لا حلقة لانهائية)", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: session("tok-dead", 10) }, error: null })
    mocks.refreshSession.mockResolvedValue({ data: { session: null }, error: new Error("invalid_grant") })

    const run = vi.fn(async (token: string) => ({
      res: jsonResponse(401, { error: "auth_required" }),
      data: { error: "auth_required", token },
    }))
    const out = await withAuthRetry(run)
    expect(out.res.status).toBe(401)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it("رمز جديد مطابق للقديم بعد 401: لا إعادة محاولة عقيمة", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: session("same-tok", 10) }, error: null })
    mocks.refreshSession.mockResolvedValue({ data: { session: session("same-tok", 3600) }, error: null })
    const run = vi.fn(async () => ({ res: jsonResponse(401, {}), data: {} }))
    const out = await withAuthRetry(run)
    expect(out.res.status).toBe(401)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it("بلا جلسة صالحة يستعمل الرمز الاحتياطي (المعروض وقت التصيير)", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
    const seenTokens: string[] = []
    const run = vi.fn(async (token: string) => {
      seenTokens.push(token)
      return { res: jsonResponse(200, {}), data: {} }
    })
    await withAuthRetry(run, "render-time-token")
    expect(seenTokens[0]).toBe("render-time-token")
  })
})
