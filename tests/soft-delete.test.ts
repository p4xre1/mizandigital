/**
 * اختبارات الحذف الناعم: الطرفان + الدالة + وجود الواجهة.
 *
 * أهم خاصيتين نثبّتهما:
 *   1) الطرف لم يعد يحذف صفوفاً — كان يحذف payments وcredit_transactions.
 *   2) لا مفتاح service_role في مسار المتصفح — الدالة تُنادى برمز المستخدم
 *      فتعمل auth.uid() وتُقيَّم RLS، ولا يمكن طلب حذف حساب الغير.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { onRequestDelete, GRACE_PERIOD_DAYS } from "../functions/api/account/delete.js"
import { onRequestPost } from "../functions/api/account/restore.js"

// مستخدم فريد لكل نداء مصادقة: تحديد المعدل في guard.js keyed على user.id
// ومخزنه على مستوى الوحدة، فاستعمال معرّف واحد في كل الاختبارات كان يستنفد
// الحدّ (5 في الساعة) ويجعل الاختبارات اللاحقة تفشل بـ 429 لا بسبب خطأ فيها.
let seq = 0
function nextUserId() {
  seq += 1
  return `11111111-1111-1111-1111-${String(seq).padStart(12, "0")}`
}
const USER = { id: "11111111-1111-1111-1111-111111111111", email: "user@mizan.page", token: "user-access-token" }

type Call = { url: string; method: string; auth?: string | null; body?: any }

let calls: Call[] = []
let rpcStatus = 200
let rpcBody: unknown = { success: true, account_status: "pending_deletion", grace_period_days: 30 }

function installFetch() {
  globalThis.fetch = vi.fn(async (input: any, init: any) => {
    const url = String(input)
    const method = String(init?.method || "GET").toUpperCase()
    const auth = init?.headers?.Authorization ?? null
    let body: any
    try {
      body = init?.body ? JSON.parse(init.body) : undefined
    } catch {
      body = init?.body
    }
    calls.push({ url, method, auth, body })

    // requireUser يتحقق من الرمز عبر /auth/v1/user
    if (url.includes("/auth/v1/user")) {
      return new Response(JSON.stringify({ ...USER, id: nextUserId() }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }
    if (url.includes("/rest/v1/rpc/")) {
      return new Response(JSON.stringify(rpcBody), {
        status: rpcStatus,
        headers: { "Content-Type": "application/json" },
      })
    }
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } })
  }) as any
}

const ENV = {
  SUPABASE_URL: "https://db.example.supabase.co",
  SUPABASE_ANON_KEY: "anon-public-key",
}

function ctx(url = "https://www.mizan.page/api/account/delete", token: string | null = USER.token) {
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  return {
    request: new Request(url, { method: token ? "DELETE" : "POST", headers }),
    env: ENV,
    waitUntil: () => {},
    params: {},
    next: async () => new Response(),
  } as any
}

let originalFetch: typeof globalThis.fetch

beforeEach(() => {
  originalFetch = globalThis.fetch
  calls = []
  rpcStatus = 200
  rpcBody = { success: true, account_status: "pending_deletion", grace_period_days: 30 }
  installFetch()
})

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

describe("DELETE /api/account/delete — حذف ناعم", () => {
  it("ينادي request_account_deletion برمز المستخدم لا بمفتاح الخدمة", () => {
    return onRequestDelete(ctx()).then(async (res: Response) => {
      expect(res.status).toBe(200)
      const rpc = calls.find((c) => c.url.includes("rpc/request_account_deletion"))
      expect(rpc, "must call the soft-delete RPC").toBeTruthy()
      expect(rpc!.auth).toBe(`Bearer ${USER.token}`)
      // صفر ثقة: لا مفتاح خدمة في مسار يصله المتصفح
      expect(calls.every((c) => !String(c.auth).includes("service_role"))).toBe(true)
    })
  })

  it("لم يعد يحذف أي صفّ من أي جدول", async () => {
    const res: Response = await onRequestDelete(ctx())
    expect(res.status).toBe(200)
    const deletes = calls.filter((c) => c.method === "DELETE" && c.url.includes("/rest/v1/"))
    expect(deletes, "no row deletions — that was the Art. 26 violation").toEqual([])
    // ولا نداء auth admin لحذف المستخدم: الإخفاء مهمة مجدولة لا طلب متصفح
    expect(calls.some((c) => c.url.includes("/auth/v1/admin/"))).toBe(false)
  })

  it("يرفض بلا رمز", async () => {
    const res: Response = await onRequestDelete(ctx("https://www.mizan.page/api/account/delete", null))
    expect(res.status).toBe(401)
    expect(calls.some((c) => c.url.includes("rpc/"))).toBe(false)
  })

  it("يمرّر السبب الاختياري ويقتطع ما زاد على 500", async () => {
    const long = "س".repeat(900)
    const res: Response = await onRequestDelete(
      ctx(`https://www.mizan.page/api/account/delete?reason=${encodeURIComponent(long)}`)
    )
    expect(res.status).toBe(200)
    const rpc = calls.find((c) => c.url.includes("rpc/request_account_deletion"))
    // الطرف نفسه يقتطع قبل الإرسال
    expect(String(rpc!.body.p_reason ?? "").length).toBeLessThanOrEqual(500)
  })

  it("لا يرسل سبباً فارغاً", async () => {
    await onRequestDelete(ctx("https://www.mizan.page/api/account/delete?reason=%20%20"))
    const rpc = calls.find((c) => c.url.includes("rpc/request_account_deletion"))
    expect(rpc!.body.p_reason).toBeNull()
  })

  it("يُبلغ بوضوح حين يكون الترحيل غير مطبَّق (404 من PostgREST)", async () => {
    // هذا بالضبط وضع القاعدة الحية اليوم: الترحيل 13 غير مطبَّق.
    rpcStatus = 404
    rpcBody = { message: "Could not find the function public.request_account_deletion" }
    const res: Response = await onRequestDelete(ctx())
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.detail).toContain("20260926000000")
  })

  it("يميّز الطلب المكرر — المهلة لا تُصفَّر", async () => {
    rpcBody = { success: true, already_requested: true, account_status: "pending_deletion" }
    const res: Response = await onRequestDelete(ctx())
    const body = await res.json()
    expect(body.alreadyRequested).toBe(true)
    expect(body.gracePeriodDays).toBe(GRACE_PERIOD_DAYS)
  })

  it("يعيد مهلة 30 يوماً ومسار الاستعادة", async () => {
    const res: Response = await onRequestDelete(ctx())
    const body = await res.json()
    expect(body.accountStatus).toBe("pending_deletion")
    expect(body.gracePeriodDays).toBe(30)
    expect(body.restorePath).toBe("/api/account/restore")
  })

  it("يرفع 500 عند فشل الدالة الحقيقي لا 200 صامتة", async () => {
    rpcStatus = 500
    rpcBody = { message: "profile not found" }
    const res: Response = await onRequestDelete(ctx())
    expect(res.status).toBe(500)
  })
})

describe("POST /api/account/restore — التراجع الذاتي", () => {
  const restoreCtx = (token: string | null = USER.token) => {
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`
    return {
      request: new Request("https://www.mizan.page/api/account/restore", { method: "POST", headers }),
      env: ENV,
      waitUntil: () => {},
      params: {},
      next: async () => new Response(),
    } as any
  }

  it("ينادي cancel_account_deletion برمز المستخدم", async () => {
    rpcBody = { success: true, account_status: "active", canceled: true }
    const res: Response = await onRequestPost(restoreCtx())
    expect(res.status).toBe(200)
    const rpc = calls.find((c) => c.url.includes("rpc/cancel_account_deletion"))
    expect(rpc).toBeTruthy()
    expect(rpc!.auth).toBe(`Bearer ${USER.token}`)
  })

  it("يرفض بلا رمز", async () => {
    const res: Response = await onRequestPost(restoreCtx(null))
    expect(res.status).toBe(401)
  })

  it("حساب نشط أصلاً ليس خطأً", async () => {
    rpcBody = { success: true, already_active: true, account_status: "active" }
    const res: Response = await onRequestPost(restoreCtx())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.alreadyActive).toBe(true)
  })

  it("يُبلغ بوضوح حين يكون الترحيل غير مطبَّق", async () => {
    rpcStatus = 404
    const res: Response = await onRequestPost(restoreCtx())
    expect(res.status).toBe(503)
  })
})

describe("الترحيل: الدالة الذاتية لا تأخذ معرّفاً", () => {
  const sql = readFileSync(
    "supabase/migrations/20260926000000_admin_actions_soft_delete_and_audit.sql",
    "utf8"
  )
  const body = (() => {
    const start = sql.indexOf("FUNCTION public.cancel_account_deletion(")
    return sql.slice(start, sql.indexOf("$$;", start))
  })()

  it("لا معامَل هدف — تقرأ auth.uid() فقط فلا تُستعاد حسابات الغير", () => {
    expect(sql).toMatch(/FUNCTION public\.cancel_account_deletion\(\)\s*RETURNS jsonb/)
    expect(body).toContain("SELECT auth.uid()")
    expect(body).not.toContain("p_target_user_id")
  })

  it("ممنوحة للمستخدمين المسجّلين لا للخدمة فقط", () => {
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.cancel_account_deletion\(\) TO authenticated/)
  })

  it("تصفّر التاريخ مع الحالة احتراماً لقيد الاتساق", () => {
    expect(body).toMatch(/SET account_status = 'active',\s+deletion_requested_at = NULL/)
  })

  it("لا تعمل إلا على حساب في مهلة الحذف", () => {
    expect(body).toContain("v_status <> 'pending_deletion'")
  })
})

describe("الواجهة موجودة فعلاً", () => {
  const page = readFileSync("src/pages/public/MyProfilePage.tsx", "utf8")
  const comp = readFileSync("src/components/profile/DeleteAccountSection.tsx", "utf8")

  it("المكوّن مستورد ومرسوم في صفحة البروفايل", () => {
    expect(page).toContain('from "@/components/profile/DeleteAccountSection"')
    expect(page).toMatch(/<DeleteAccountSection/)
  })

  it("التأكيد بالكتابة لا بنقرة واحدة", () => {
    expect(comp).toContain("CONFIRM_PHRASE")
    expect(comp).toContain("typed.trim() === required")
    // الزر معطّل حتى تتطابق الكتابة
    expect(comp).toMatch(/disabled=\{busy \|\| !matches\}/)
  })

  it("تعرض العدّاد التنازلي لا رسالة «تم الحذف»", async () => {
    expect(comp).toContain("daysLeft")
    expect(comp).toContain("GRACE_DAYS * 86_400_000")
    // لا ادعاء كاذب بأن المحو فوري
    expect(comp).not.toContain("تم حذف حسابك نهائياً")
  })

  it("توفّر تراجعاً ذاتياً خلال المهلة", () => {
    expect(comp).toContain("/api/account/restore")
    expect(comp).toContain("cancelDeletion")
  })

  it("تشرح بقاء السجلات المالية — لا توحي بمحو مطلق", () => {
    expect(comp).toContain("المادة 26 من مدونة التجارة")
  })

  it("رسالة واضحة حين يكون الترحيل غير مطبَّق", () => {
    expect(comp).toContain("res.status === 503")
  })
})
