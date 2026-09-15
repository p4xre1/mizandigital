// shared/billing/stripe.js
//
// ─────────────────────────────────────────────────────────────────────────────
// طبقة Stripe المشتركة — بلا أي حزمة npm
// ─────────────────────────────────────────────────────────────────────────────
//
// لماذا fetch خام بدل `stripe` الرسمي؟
//   1. المستودع لا يملك أي اعتمادية خادم (functions/* تستعمل fetch فقط).
//   2. نتجنّب مشاكل الحزم في بيئة Cloudflare Workers.
//   3. الجزء الحرج أمنياً (التحقق من التوقيع) يصبح قابلاً للاختبار مباشرة
//      في vitest دون شبكة — انظر tests/billing.test.ts.
//
// يُستورد من جهة الخادم فقط (Cloudflare Pages Functions). لا يُدمج أبداً في
// حزمة المتصفح: المفتاح السري لا يجوز أن يصل للعميل.
//
// يعتمد على WebCrypto (crypto.subtle) المتوفر في Workers و Node 18+ معاً.

const STRIPE_API = "https://api.stripe.com"

/**
 * مقارنة بزمن ثابت.
 *
 * `a === b` في JavaScript يخرج من الحلقة عند أول اختلاف، فزمن التنفيذ يكشف
 * طول البادئة الصحيحة. في مقارنة HMAC هذا يفتح باب هجوم توقيعي تدريجي.
 * لذلك نمرّ على كل البايتات دائماً.
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function timingSafeEqualStr(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

/**
 * يحسب توقيع Stripe لمعطيات محددة.
 *
 * الصيغة الموقَّعة هي "<timestamp>.<rawBody>" — وليس الجسم وحده. تضمين الوقت
 * هو ما يجعل حماية إعادة الإرسال ممكنة.
 *
 * @param {{ payload: string, timestamp: number, secret: string }} args
 * @returns {Promise<string>} التوقيع hex
 */
export async function computeStripeSignature({ payload, timestamp, secret }) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${payload}`))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * يبني ترويسة Stripe-Signature (يُستعمل في الاختبارات وفي إعادة الإرسال).
 * @returns {string} مثال: "t=1700000000,v1=abc..."
 */
export async function buildSignatureHeader({ payload, secret, timestamp = Math.floor(Date.now() / 1000) }) {
  const v1 = await computeStripeSignature({ payload, timestamp, secret })
  return `t=${timestamp},v1=${v1}`
}

/**
 * يفكّ ترويسة Stripe-Signature.
 *
 * قد تحمل الترويسة أكثر من v1 (أثناء تدوير السرّ)، لذلك نجمعها كلها ونقبل
 * إن تطابق أيٌّ منها — وإلا انكسر التحقق لحظة تدوير المفتاح.
 *
 * @param {string} header
 * @returns {{ timestamp: number|null, signatures: string[] }}
 */
export function parseSignatureHeader(header) {
  const out = { timestamp: null, signatures: [] }
  if (typeof header !== "string" || !header) return out
  for (const part of header.split(",")) {
    const idx = part.indexOf("=")
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    if (key === "t") {
      const n = Number(value)
      if (Number.isFinite(n)) out.timestamp = n
    } else if (key === "v1" && value) {
      out.signatures.push(value)
    }
    // v0 مهجور عمداً: خوارزميته أضعف ولا نقبله.
  }
  return out
}

/**
 * يتحقق من توقيع webhook قادم من Stripe.
 *
 * ── ما يحمي منه هذا ─────────────────────────────────────────────────────────
 * نقطة /api/billing/webhook عامة بالضرورة (Stripe لا يسجّل الدخول). بدون هذا
 * التحقق يستطيع أي شخص أن يرسل:
 *     {"type":"checkout.session.completed","data":{"object":{...}}}
 * فيُفعّل Pro لنفسه مجاناً. التوقيع هو ما يثبت أن الطلب جاء من Stripe فعلاً.
 *
 * @param {object} args
 * @param {string} args.header   ترويسة Stripe-Signature الخام
 * @param {string} args.payload  الجسم الخام كما وصل (قبل JSON.parse!)
 * @param {string} args.secret   whsec_...
 * @param {number} [args.tolerance=300] أقصى فرق مسموح بالثواني (حماية إعادة الإرسال)
 * @param {number} [args.now]     للتجريب في الاختبارات
 * @returns {Promise<{ valid: boolean, reason?: string }>}
 */
export async function verifyStripeSignature({ header, payload, secret, tolerance = 300, now = Math.floor(Date.now() / 1000) }) {
  if (!secret) return { valid: false, reason: "missing_webhook_secret" }
  if (typeof payload !== "string") return { valid: false, reason: "payload_not_string" }

  const parsed = parseSignatureHeader(header)
  if (parsed.timestamp === null) return { valid: false, reason: "missing_timestamp" }
  if (parsed.signatures.length === 0) return { valid: false, reason: "missing_v1_signature" }

  // إعادة الإرسال: توقيع صالح لكنه قديم يُرفض.
  const delta = Math.abs(now - parsed.timestamp)
  if (delta > tolerance) return { valid: false, reason: "timestamp_outside_tolerance" }

  const expected = await computeStripeSignature({ payload, timestamp: parsed.timestamp, secret })
  const matched = parsed.signatures.some((sig) => timingSafeEqualStr(sig, expected))
  return matched ? { valid: true } : { valid: false, reason: "signature_mismatch" }
}

/**
 * يرمّج جسماً إلى application/x-www-form-urlencoded كما تتوقع Stripe،
 * مع دعم المفاتيح المتداخلة: metadata[userId] و line_items[0][price].
 *
 * @param {Record<string, unknown>} obj
 * @param {string} [prefix]
 * @returns {string}
 */
export function encodeStripeForm(obj, prefix = "") {
  const parts = []
  for (const [rawKey, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue
    const key = prefix ? `${prefix}[${rawKey}]` : rawKey
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item !== null && typeof item === "object") {
          parts.push(encodeStripeForm(item, `${key}[${i}]`))
        } else if (item !== undefined && item !== null) {
          parts.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`)
        }
      })
    } else if (typeof value === "object") {
      parts.push(encodeStripeForm(value, key))
    } else if (typeof value === "boolean") {
      parts.push(`${encodeURIComponent(key)}=${value ? "true" : "false"}`)
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    }
  }
  return parts.filter(Boolean).join("&")
}

/**
 * نداء Stripe API.
 *
 * @param {object} args
 * @param {string} args.path     مثال: "/v1/checkout/sessions"
 * @param {string} args.secretKey sk_...
 * @param {string} [args.method="POST"]
 * @param {Record<string, unknown>} [args.body]
 * @param {AbortSignal} [args.signal]
 * @returns {Promise<{ ok: boolean, status: number, data: any }>}
 */
export async function stripeRequest({ path, secretKey, method = "POST", body, signal }) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    signal,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body ? encodeStripeForm(body) : undefined,
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  return { ok: res.ok, status: res.status, data }
}

/**
 * حالات اشتراك Stripe التي تُعتبر "Pro فعّال".
 *
 * 'trialing' مقصود هنا: فترة تجريبية بدأت فعلاً تمنح الوصول. أما
 * 'past_due' فلا — الدفع فشل فلا يجوز إبقاء الاستحقاق.
 */
export const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"])

/**
 * يُسقط حدث Stripe إلى قرار اشتراك بسيط.
 *
 * دالة نقية (بلا شبكة ولا قاعدة بيانات) حتى تُختبر مباشرة.
 *
 * @param {any} event حدث Stripe
 * @returns {{ kind: string, customerId?: string, subscriptionId?: string,
 *             status?: string, sessionId?: string, amount?: number,
 *             currency?: string, invoiceId?: string, paymentIntentId?: string,
 *             billingReason?: string, periodEnd?: string|null, declineCode?: string|null,
 *             paymentMethodId?: string, ipCountry?: string|null, cardCountry?: string|null,
 *             errorCode?: string|null, clerkUserId?: string|null,
 *             endsAt?: string|null, userId?: string|null } | null}
 */
export function reduceStripeEvent(event) {
  if (!event || typeof event !== "object") return null
  const type = String(event.type || "")
  const obj = event?.data?.object
  if (!obj || typeof obj !== "object") return null

  // metadata قد تكون على الجلسة أو على الاشتراك أو على العميل
  const md = obj.metadata || obj.subscription_details?.metadata || {}

  // ── فصل هويتين لا يجوز خلطهما ──────────────────────────────────────────
  // Mizan له مسارا مصادقة: Supabase Auth (profiles.id، وهو UUID) و Clerk
  // (mizan_profiles.clerk_user_id، وشكله user_…). المسودة الأولى كانت تُسند
  // client_reference_id إلى userId مباشرة، فأي جلسة Clerk كانت ستُعامَل
  // كمعرّف Supabase وتفشل الكتابة بصمت.
  const refId = typeof obj.client_reference_id === "string" ? obj.client_reference_id : null
  const isClerkId = (v) => typeof v === "string" && /^user_[A-Za-z0-9]{8,}$/.test(v)

  const clerkUserId =
    (typeof md.clerkUserId === "string" && md.clerkUserId) ||
    (isClerkId(refId) ? refId : null) ||
    null

  const userId =
    (typeof md.userId === "string" && md.userId) ||
    (typeof md.user_id === "string" && md.user_id) ||
    (refId && !isClerkId(refId) ? refId : null) ||
    null

  if (type === "checkout.session.completed") {
    const sub = typeof obj.subscription === "string" ? obj.subscription : obj.subscription?.id
    return {
      kind: "checkout_completed",
      sessionId: obj.id,
      customerId: typeof obj.customer === "string" ? obj.customer : obj.customer?.id,
      subscriptionId: sub,
      status: obj.status === "complete" ? "active" : obj.status,
      amount: Number.isFinite(obj.amount_total) ? obj.amount_total : null,
      currency: typeof obj.currency === "string" ? obj.currency.toLowerCase() : null,
      invoiceId: typeof obj.invoice === "string" ? obj.invoice : obj.invoice?.id,
      paymentIntentId: typeof obj.payment_intent === "string" ? obj.payment_intent : obj.payment_intent?.id,
      billingReason: "subscription_start",
      // بلد البطاقة ليس على جلسة Checkout — إنه على PaymentMethod. نمرّر
      // المعرّف فقط، ويسترجع الـ webhook البلد من Stripe.
      paymentMethodId: typeof obj.payment_method === "string" ? obj.payment_method : obj.payment_method?.id,
      ipCountry: typeof md.ipCountry === "string" && md.ipCountry.length === 2 ? md.ipCountry : null,
      userId,
      clerkUserId,
    }
  }

  if (type === "customer.subscription.updated" || type === "customer.subscription.created") {
    const status = String(obj.status || "")
    const endsAt = obj.cancel_at_period_end && obj.current_period_end
      ? toIso(obj.current_period_end)
      : null
    return {
      kind: "subscription_updated",
      customerId: typeof obj.customer === "string" ? obj.customer : obj.customer?.id,
      subscriptionId: obj.id,
      status,
      periodEnd: toIso(obj.current_period_end),
      userId,
      clerkUserId,
      // نهاية الاشتراك الفعلية عند الإلغاء في نهاية الفترة
      endsAt,
    }
  }

  if (type === "customer.subscription.deleted") {
    return {
      kind: "subscription_deleted",
      customerId: typeof obj.customer === "string" ? obj.customer : obj.customer?.id,
      subscriptionId: obj.id,
      status: "canceled",
      userId,
      clerkUserId,
    }
  }

  if (type === "invoice.payment_failed") {
    return {
      kind: "payment_failed",
      customerId: typeof obj.customer === "string" ? obj.customer : obj.customer?.id,
      subscriptionId: typeof obj.subscription === "string" ? obj.subscription : obj.subscription?.id,
      invoiceId: obj.id,
      amount: Number.isFinite(obj.amount_due) ? obj.amount_due : null,
      currency: typeof obj.currency === "string" ? obj.currency.toLowerCase() : null,
      status: "past_due",
      userId,
    }
  }

  if (type === "payment_intent.payment_failed") {
    // هنا يوجد decline_code — وهو أقوى إشارة مخاطر متاحة لنا.
    const err = obj.last_payment_error || {}
    return {
      kind: "intent_payment_failed",
      paymentIntentId: obj.id,
      customerId: typeof obj.customer === "string" ? obj.customer : obj.customer?.id,
      declineCode: typeof err.decline_code === "string" ? err.decline_code : null,
      errorCode: typeof err.code === "string" ? err.code : null,
      amount: Number.isFinite(obj.amount) ? obj.amount : null,
      currency: typeof obj.currency === "string" ? obj.currency.toLowerCase() : null,
      userId,
    }
  }

  if (type === "invoice.payment_succeeded") {
    return {
      kind: "payment_succeeded",
      customerId: typeof obj.customer === "string" ? obj.customer : obj.customer?.id,
      subscriptionId: typeof obj.subscription === "string" ? obj.subscription : obj.subscription?.id,
      invoiceId: obj.id,
      paymentIntentId: typeof obj.payment_intent === "string" ? obj.payment_intent : obj.payment_intent?.id,
      amount: Number.isFinite(obj.amount_paid) ? obj.amount_paid : null,
      currency: typeof obj.currency === "string" ? obj.currency.toLowerCase() : null,
      billingReason: obj.billing_reason || null,
      status: "paid",
      userId,
    }
  }

  return null
}

/** طابع Stripe الزمني (ثوانٍ) ← ISO. */
function toIso(seconds) {
  if (!Number.isFinite(seconds)) return null
  return new Date(seconds * 1000).toISOString()
}

// ─────────────────────────────────────────────────────────────────────────────
// Mizan Pro plans + credit packages (from previous implementation)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stripe billing utilities — shared between Cloudflare Functions and Vite
 * Supports Mizan Pro subscription: monthly / yearly
 */

export const MIZAN_PRO_PLANS = {
  monthly: {
    id: "mizan_pro_monthly",
    slug: "pro_monthly",
    name: "ميزان برو — شهري",
    priceMAD: 49,
    priceUSD: 5,
    interval: "month",
    credits: 500,
    features: ["تحميل بلا إنترنت", "شجرة القوانين المتقدمة", "تحديات مميزة", "دعم أولوية"],
  },
  yearly: {
    id: "mizan_pro_yearly",
    slug: "pro_yearly",
    name: "ميزان برو — سنوي",
    priceMAD: 399,
    priceUSD: 39,
    interval: "year",
    credits: 7000,
    bonusCredits: 1000,
    features: ["كل مزايا الشهري", "خصم 32%", "1000 كريدتس هدية", "شهادة توصية"],
  },
};

export const CREDIT_PACKAGES = [
  { slug: "starter", credits: 100, priceMAD: 19, bonus: 0 },
  { slug: "student", credits: 350, priceMAD: 49, bonus: 50, popular: true },
  { slug: "pro", credits: 800, priceMAD: 99, bonus: 150 },
  { slug: "elite", credits: 2000, priceMAD: 199, bonus: 500 },
];

export function formatPrice(price, currency = "MAD") {
  if (currency === "MAD") return `${price.toFixed(2)} د.م.`;
  return `$${price.toFixed(2)}`;
}

export function getPlanBySlug(slug) {
  return Object.values(MIZAN_PRO_PLANS).find((p) => p.slug === slug) || null;
}

export function getPackageBySlug(slug) {
  return CREDIT_PACKAGES.find((p) => p.slug === slug) || null;
}

// Stripe price IDs — should be set in env
export function getStripePriceId(planSlug, env) {
  const map = {
    pro_monthly: env.STRIPE_PRICE_MONTHLY,
    pro_yearly: env.STRIPE_PRICE_YEARLY,
  };
  return map[planSlug] || null;
}
