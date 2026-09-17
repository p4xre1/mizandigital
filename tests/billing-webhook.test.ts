/**
 * اختبارات /api/billing/webhook.
 *
 * أهمّ اختبار هنا هو `يرفض الحدث المزوَّر` — كان هذا الطلب ينجح قبل الإصلاح
 * ويمنح الكريدتس مجاناً. يبقى الاختبار ليمنع عودة الثغرة.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { onRequestPost } from "../functions/api/billing/webhook.js"
import { buildSignatureHeader } from "../shared/billing/stripe.js"
import { reduceStripeEvent } from "../shared/billing/stripe.js"

const SECRET = "whsec_test_0123456789abcdef0123456789abcdef"
const WRONG_SECRET = "whsec_attacker_guessed_value_000000000000"
const URL_BASE = "https://www.mizan.page/api/billing/webhook"

// ─────────────────────────────────────────────────────────────────────────────
// أدوات
// ─────────────────────────────────────────────────────────────────────────────

type Call = { url: string; method: string; body?: any }

type MockState = {
  duplicateEvent: boolean
  directRows: any[]
  fallbackRows: any[]
  rpcOk: boolean
  rpcBody: string
  profileRows: any[]
  calls: Call[]
}

function state(over: Partial<MockState> = {}): MockState {
  return {
    duplicateEvent: false,
    directRows: [{ id: "11111111-1111-1111-1111-111111111111", status: "pending", amount_mad: 200, amount_usd: null }],
    fallbackRows: [],
    rpcOk: true,
    rpcBody: "true",
    profileRows: [{ id: "22222222-2222-2222-2222-222222222222" }],
    calls: [],
    ...over,
  }
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function installFetch(s: MockState) {
  globalThis.fetch = vi.fn(async (input: any, init: any) => {
    const url = String(input)
    const method = String(init?.method || "GET").toUpperCase()
    let body: any
    try {
      body = init?.body ? JSON.parse(init.body) : undefined
    } catch {
      body = init?.body
    }
    s.calls.push({ url, method, body })

    if (url.includes("/rest/v1/stripe_webhook_events")) {
      // مصفوفة فارغة ⇒ الصف موجود مسبقاً ⇒ تكرار
      return jsonResponse(s.duplicateEvent ? [] : [{ event_id: "evt_test" }])
    }
    if (url.includes("/rest/v1/rpc/complete_payment_and_grant_credits")) {
      return s.rpcOk ? jsonResponse(true) : new Response(s.rpcBody, { status: 400 })
    }
    if (url.includes("/rest/v1/profiles")) {
      return jsonResponse(s.profileRows)
    }
    if (url.includes("/rest/v1/payments")) {
      if (method === "PATCH") return new Response(null, { status: 204 })
      return jsonResponse(url.includes("id=eq.") ? s.directRows : s.fallbackRows)
    }
    return jsonResponse({})
  }) as any
}

function makeEnv(over: Record<string, unknown> = {}) {
  return {
    STRIPE_WEBHOOK_SECRET: SECRET,
    SUPABASE_URL: "https://db.example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service_role_test_key",
    ...over,
  }
}

async function call(payload: string, signature: string | null, env = makeEnv()) {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (signature !== null) headers["stripe-signature"] = signature
  return (await onRequestPost({
    request: new Request(URL_BASE, { method: "POST", headers, body: payload }),
    env,
    waitUntil: () => {},
    params: {},
    next: async () => new Response(),
  } as any)) as Response
}

const sign = (payload: string, secret = SECRET, timestamp = Math.floor(Date.now() / 1000)) =>
  buildSignatureHeader({ payload, secret, timestamp })

const intentEvent = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    id: "evt_intent_1",
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: "pi_test_123",
        object: "payment_intent",
        status: "succeeded",
        amount: 20000,
        amount_received: 20000,
        currency: "mad",
        customer: "cus_123",
        metadata: { paymentId: "11111111-1111-1111-1111-111111111111" },
        ...over,
      },
    },
  })

const checkoutEvent = () =>
  JSON.stringify({
    id: "evt_checkout_1",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_123",
        object: "checkout.session",
        status: "complete",
        amount_total: 20000,
        currency: "MAD",
        payment_intent: "pi_from_session",
        metadata: {},
      },
    },
  })

// ─────────────────────────────────────────────────────────────────────────────

let originalFetch: typeof globalThis.fetch

beforeEach(() => {
  originalFetch = globalThis.fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

describe("webhook — التحقق من التوقيع (الثغرة المُصلَحة)", () => {
  it("يرفض الحدث المزوَّر الذي كان ينجح سابقاً", async () => {
    // هذا هو الهجوم حرفياً: توقيع مختلَق + حدث مكتمل الجلسة.
    const s = state()
    installFetch(s)
    const payload = intentEvent()
    // طابع زمني حالي + توقيع مختلَق: نفحص مسار التوقيع نفسه، لا مسار الوقت.
    const forged = `t=${Math.floor(Date.now() / 1000)},v1=${"deadbeef".repeat(8)}`
    const res = await call(payload, forged)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("invalid_signature")
    expect(body.reason).toBe("signature_mismatch")
    // لم تُمسّ قاعدة البيانات إطلاقاً
    expect(s.calls.filter((c) => c.url.includes("/rest/v1/"))).toEqual([])
  })

  it("يرفض الطلب بلا ترويسة توقيع", async () => {
    const s = state()
    installFetch(s)
    const res = await call(intentEvent(), null)
    expect(res.status).toBe(400)
    expect((await res.json()).reason).toBe("missing_timestamp")
    expect(s.calls.length).toBe(0)
  })

  it("يرفع 400 حين يكون التوقيع مبنياً بالسرّ الخطأ", async () => {
    const s = state()
    installFetch(s)
    const payload = intentEvent()
    const res = await call(payload, await sign(payload, WRONG_SECRET))
    expect(res.status).toBe(400)
    expect((await res.json()).reason).toBe("signature_mismatch")
  })

  it("يرفض إعادة إرسال حدث قديم موقَّع توقيعاً صحيحاً", async () => {
    const s = state()
    installFetch(s)
    const payload = intentEvent()
    const stale = Math.floor(Date.now() / 1000) - 3600 // ساعة مضت
    const res = await call(payload, await sign(payload, SECRET, stale))
    expect(res.status).toBe(400)
    expect((await res.json()).reason).toBe("timestamp_outside_tolerance")
  })

  it("يرفض 500 حين لا يكون السرّ مضبوطاً — لا يبتلع الدفعات", async () => {
    const s = state()
    installFetch(s)
    const payload = intentEvent()
    const res = await call(payload, await sign(payload), makeEnv({ STRIPE_WEBHOOK_SECRET: undefined }))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe("webhook_secret_not_configured")
  })

  it("يقبل التوقيع الصحيح ويمرّ إلى المعالجة", async () => {
    const s = state()
    installFetch(s)
    const payload = intentEvent()
    const res = await call(payload, await sign(payload))
    expect(res.status).toBe(200)
    expect((await res.json()).received).toBe(true)
  })

  it("يتحقق من الجسم الخام: تعديل حرف واحد بعد التوقيع يُسقط التحقق", async () => {
    const s = state()
    installFetch(s)
    const payload = intentEvent()
    const header = await sign(payload)
    // مهاجم وقّع حمولة ثم بدّل المبلغ
    const tampered = payload.replace('"amount":20000', '"amount":100')
    const res = await call(tampered, header)
    expect(res.status).toBe(400)
  })
})

describe("webhook — حماية إعادة التسليم", () => {
  it("لا يعيد منح الكريدتس لحدث مكرَّر", async () => {
    const s = state({ duplicateEvent: true })
    installFetch(s)
    const payload = intentEvent()
    const res = await call(payload, await sign(payload))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.duplicate).toBe(true)
    expect(s.calls.some((c) => c.url.includes("complete_payment_and_grant_credits"))).toBe(false)
  })

  it("يسجّل معرّف الحدث في stripe_webhook_events", async () => {
    const s = state()
    installFetch(s)
    const payload = intentEvent()
    await call(payload, await sign(payload))
    const insert = s.calls.find((c) => c.url.includes("stripe_webhook_events"))
    expect(insert, "must write the replay lock").toBeTruthy()
    expect(insert!.body.event_id).toBe("evt_intent_1")
    expect(insert!.body.event_type).toBe("payment_intent.succeeded")
  })

  it("يكمل المعالجة لو تعطّل جدول التكرار — والطبقة الثالثة تمنع المنح المزدوج", async () => {
    const s = state()
    installFetch(s)
    const mockFetch = globalThis.fetch
    // جدول التكرار يفشل، وبقية النداءات تسير كالمعتاد
    globalThis.fetch = vi.fn(async (input: any, init: any) => {
      if (String(input).includes("stripe_webhook_events")) return new Response("boom", { status: 500 })
      return (mockFetch as any)(input, init)
    }) as any

    const payload = intentEvent()
    const res = await call(payload, await sign(payload))
    expect(res.status, "must still grant — availability over strict dedup").toBe(200)
    expect((await res.json()).completed).toBeTruthy()
    expect(s.calls.some((c) => c.url.includes("complete_payment_and_grant_credits"))).toBe(true)
  })
})

describe("webhook — منح الكريدتس", () => {
  it("يستدعي complete_payment_and_grant_credits عند payment_intent.succeeded", async () => {
    const s = state()
    installFetch(s)
    const payload = intentEvent()
    const res = await call(payload, await sign(payload))
    expect(res.status).toBe(200)
    const rpc = s.calls.find((c) => c.url.includes("complete_payment_and_grant_credits"))
    expect(rpc, "RPC must be called").toBeTruthy()
    expect(rpc!.body.p_payment_id).toBe("11111111-1111-1111-1111-111111111111")
  })

  it("يحافظ على مسار checkout.session.completed القديم", async () => {
    const s = state({ directRows: [], fallbackRows: [{ id: "33333333-3333-3333-3333-333333333333", status: "pending", amount_mad: 200, amount_usd: null }] })
    installFetch(s)
    const payload = checkoutEvent()
    const res = await call(payload, await sign(payload))
    expect(res.status).toBe(200)
    const rpc = s.calls.find((c) => c.url.includes("complete_payment_and_grant_credits"))
    expect(rpc).toBeTruthy()
    expect(rpc!.body.p_payment_id).toBe("33333333-3333-3333-3333-333333333333")
  })

  it("يعامل «not found or not pending» كتكرار حميد لا كفشل", async () => {
    const s = state({ rpcOk: false, rpcBody: '{"message":"Payment not found or not pending"}' })
    installFetch(s)
    const payload = intentEvent()
    const res = await call(payload, await sign(payload))
    // 200 لا 500 — وإلا أعادت Stripe التسليم إلى الأبد
    expect(res.status).toBe(200)
    expect((await res.json()).alreadyCompleted).toBeTruthy()
  })

  it("يرفع 500 عند فشل المنح لسبب حقيقي حتى تعيد Stripe المحاولة", async () => {
    const s = state({ rpcOk: false, rpcBody: '{"message":"permission denied"}' })
    installFetch(s)
    const payload = intentEvent()
    const res = await call(payload, await sign(payload))
    expect(res.status).toBe(500)
  })

  it("لا يفشل عند غياب دفعة معلّقة (قد تكون دفعة اشتراك)", async () => {
    const s = state({ directRows: [], fallbackRows: [] })
    installFetch(s)
    const payload = intentEvent()
    const res = await call(payload, await sign(payload))
    expect(res.status).toBe(200)
    expect((await res.json()).skipped).toBe("no_pending_payment")
    expect(s.calls.some((c) => c.url.includes("complete_payment_and_grant_credits"))).toBe(false)
  })

  it("يمنح الدفع ويوثّق التحذير عند اختلاف المبلغ — لا يعاقب العميل على خللنا", async () => {
    const s = state({ directRows: [{ id: "11111111-1111-1111-1111-111111111111", status: "pending", amount_mad: 500, amount_usd: null }] })
    installFetch(s)
    const payload = intentEvent() // amount=20000 minor MAD = 200.00 ≠ 500
    const res = await call(payload, await sign(payload))
    const body = await res.json()
    expect(body.completed, "must still grant").toBeTruthy()
    expect(body.amountWarning).toBeTruthy()
    expect(body.amountWarning.expected_minor).toBe(50000)
    const patch = s.calls.find((c) => c.method === "PATCH" && c.url.includes("/rest/v1/payments"))
    expect(patch!.body.metadata.amount_mismatch).toBeTruthy()
  })
})

describe("webhook — استحقاق Pro", () => {
  const subEvent = (type: string, status: string) =>
    JSON.stringify({
      id: `evt_sub_${status}`,
      type,
      data: { object: { id: "sub_1", object: "subscription", status, customer: "cus_123" } },
    })

  it("يفعّل is_pro عند اشتراك نشط", async () => {
    const s = state()
    installFetch(s)
    const payload = subEvent("customer.subscription.updated", "active")
    const res = await call(payload, await sign(payload))
    expect(res.status).toBe(200)
    const patch = s.calls.find((c) => c.url.includes("/rest/v1/profiles"))
    expect(patch).toBeTruthy()
    expect(patch!.body.is_pro).toBe(true)
    expect(patch!.url).toContain("stripe_customer_id=eq.cus_123")
  })

  it("يسقط is_pro عند إلغاء الاشتراك", async () => {
    const s = state()
    installFetch(s)
    const payload = subEvent("customer.subscription.deleted", "canceled")
    await call(payload, await sign(payload))
    const patch = s.calls.find((c) => c.url.includes("/rest/v1/profiles"))
    expect(patch!.body.is_pro).toBe(false)
  })

  it("لا يفعّل Pro عند past_due — الدفع فشل", async () => {
    const s = state()
    installFetch(s)
    const payload = subEvent("customer.subscription.updated", "past_due")
    await call(payload, await sign(payload))
    const patch = s.calls.find((c) => c.url.includes("/rest/v1/profiles"))
    expect(patch!.body.is_pro).toBe(false)
  })

  it("لا يحدّث أي بروفايل بلا stripe_customer_id — التخمين يفعّل Pro لغير صاحبه", async () => {
    const s = state()
    installFetch(s)
    const payload = JSON.stringify({
      id: "evt_nocust",
      type: "customer.subscription.updated",
      data: { object: { id: "sub_2", object: "subscription", status: "active" } },
    })
    const res = await call(payload, await sign(payload))
    expect((await res.json()).skipped).toBe("no_customer_id")
    expect(s.calls.some((c) => c.url.includes("/rest/v1/profiles"))).toBe(false)
  })
})

describe("webhook — أحداث لا نعني بها", () => {
  it("يردّ 200 على حدث مجهول حتى لا تعيد Stripe إرساله", async () => {
    const s = state()
    installFetch(s)
    const payload = JSON.stringify({ id: "evt_x", type: "charge.dispute.created", data: { object: {} } })
    const res = await call(payload, await sign(payload))
    expect(res.status).toBe(200)
    expect((await res.json()).ignored).toBe("charge.dispute.created")
  })

  it("يردّ 400 على JSON تالف موقَّع", async () => {
    const s = state()
    installFetch(s)
    const payload = "{not json"
    const res = await call(payload, await sign(payload))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe("malformed_json")
  })

  it("يردّ 500 حين لا تكون Supabase مضبوطة", async () => {
    const s = state()
    installFetch(s)
    const payload = intentEvent()
    const res = await call(payload, await sign(payload), makeEnv({ SUPABASE_SERVICE_ROLE_KEY: undefined }))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe("supabase_not_configured")
  })
})

describe("reduceStripeEvent — payment_intent.succeeded", () => {
  it("يُخرج kind=intent_succeeded مع paymentId من metadata", () => {
    const r = reduceStripeEvent(JSON.parse(intentEvent()))
    expect(r, "must not be null for a known event").not.toBeNull()
    expect(r!.kind).toBe("intent_succeeded")
    expect(r!.paymentIntentId).toBe("pi_test_123")
    expect(r!.paymentId).toBe("11111111-1111-1111-1111-111111111111")
    expect(r!.amount).toBe(20000)
    expect(r!.amountReceived).toBe(20000)
    expect(r!.currency).toBe("mad")
  })

  it("يفضّل payment_id كذلك", () => {
    const r = reduceStripeEvent({
      id: "e",
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_2", metadata: { payment_id: "abc" } } },
    })
    expect(r!.paymentId).toBe("abc")
  })

  it("يعيد null لحدث غير معروف", () => {
    expect(reduceStripeEvent({ id: "e", type: "ping", data: { object: {} } })).toBeNull()
  })
})
