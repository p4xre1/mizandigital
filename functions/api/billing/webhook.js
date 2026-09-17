/**
 * POST /api/billing/webhook
 *
 * نقطة الاستقبال الوحيدة لأحداث Stripe، ومصدَر الحقيقة الوحيد لمنح الكريدتس
 * و`is_pro`. لا يُصدَّق أي تأكيد دفع قادم من المتصفح أبداً.
 *
 * ── لماذا أعيدت كتابة هذا الملف ─────────────────────────────────────────────
 * النسخة السابقة كانت تقرأ ترويسة `stripe-signature` وتتحقق من وجود
 * `STRIPE_WEBHOOK_SECRET`… ثم لا تستعمل أياً منهما. كان التعليق فيها:
 * «Here we skip full verification for brevity». النتيجة أن أي شخص يستطيع:
 *
 *     curl -X POST https://mizan.page/api/billing/webhook \
 *       -H 'stripe-signature: t=1,v1=deadbeef' \
 *       -d '{"id":"evt_x","type":"checkout.session.completed",
 *            "data":{"object":{"id":"<معرّف جلسة>"}}}'
 *
 * فيُكمل دفعة معلّقة ويمنح نفسه الكريدتس مجاناً. وهذه ليست ثغرة نظرية:
 * الدالة `verifyStripeSignature` كانت موجودة ومكتوبة بعناية في
 * shared/billing/stripe.js — وموثّقة بوصف هذا الهجوم حرفياً — لكنها لم تكن
 * مستدعاة من أي مكان في المشروع. كذلك جدول `stripe_webhook_events` كان
 * مبنياً (RLS مفعّل، الصلاحيات مسحوبة من anon/authenticated) ولا يُكتب فيه.
 *
 * ── طبقات الحماية الآن ─────────────────────────────────────────────────────
 *   1. التحقق من التوقيع (HMAC + مقارنة ثابتة الزمن + نافذة 300 ثانية).
 *   2. قفل إعادة الإرسال عبر stripe_webhook_events (Stripe يسلّم at-least-once).
 *   3. `complete_payment_and_grant_credits` تشترط status='pending' وترمي
 *      استثناءً خلاف ذلك — فهي الضمانة الأخيرة ضد المعالجة المزدوجة حتى لو
 *      تعطّل الجدول في الطبقة 2.
 *
 * ── قرار تصميمي: لا نعيد 200 صامتة عند سوء الإعداد ────────────────────────
 * لو أعدنا 200 مع غياب SUPABASE_SERVICE_ROLE_KEY لضاعت كل دفعة بلا أثر ولا
 * خطأ. نعيد 500 فتظهر في لوحة Stripe وتُعاد المحاولة.
 */

import {
  reduceStripeEvent,
  verifyStripeSignature,
  ACTIVE_SUBSCRIPTION_STATUSES,
} from "../../../shared/billing/stripe.js";

const JSON_HEADERS = { "Content-Type": "application/json" };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // ── 1) الجسم الخام أولاً ────────────────────────────────────────────────
  // التوقيع يُحسب على البايتات كما أرسلتها Stripe. أي JSON.parse ثم إعادة
  // تركيب تُغيّر المسافات أو ترتيب المفاتيح أو ترميز العربية، فيفشل التحقق
  // على أحداث سليمة. لذلك لا نلمس الجسم إلا بعد التحقق.
  const payload = await request.text();

  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return json({ error: "webhook_secret_not_configured" }, 500);
  }

  // ── 2) التحقق من التوقيع قبل أي منطق عمل ────────────────────────────────
  const verification = await verifyStripeSignature({
    header: request.headers.get("stripe-signature"),
    payload,
    secret,
  });
  if (!verification.valid) {
    // 400 لا 401: لا نكشف أن التوقيع هو الفارق الوحيد، ولا نعيد سبباً
    // تفصيلياً beyond ما تحتاجه لوحة Stripe للتشخيص.
    return json({ error: "invalid_signature", reason: verification.reason }, 400);
  }

  let event;
  try {
    event = JSON.parse(payload);
  } catch {
    return json({ error: "malformed_json" }, 400);
  }

  const eventId = typeof event?.id === "string" ? event.id : null;
  const eventType = typeof event?.type === "string" ? event.type : "unknown";

  // ── 3) أحداث لا نعني بها: 200 بسرعة ─────────────────────────────────────
  // Stripe يعيد التسليم عند أي ردّ ليس 2xx. الردّ بغير 200 على حدث لا يهمّنا
  // يعني إعادة إرسال إلى الأبد.
  const reduced = reduceStripeEvent(event);
  if (!reduced) {
    return json({ received: true, ignored: eventType });
  }

  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "supabase_not_configured" }, 500);
  }

  const sb = (path, init = {}) =>
    fetch(`${supabaseUrl}${path}`, {
      ...init,
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    });

  // ── 4) قفل إعادة الإرسال ────────────────────────────────────────────────
  if (eventId) {
    try {
      const res = await sb("/rest/v1/stripe_webhook_events", {
        method: "POST",
        // resolution=ignore-duplicates + return=representation ⇒ مصفوفة فارغة
        // تعني أن الصف موجود مسبقاً، أي أن الحدث عُولج من قبل.
        headers: { Prefer: "return=representation,resolution=ignore-duplicates" },
        body: JSON.stringify({ event_id: eventId, event_type: eventType }),
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length === 0) {
          return json({ received: true, duplicate: true, eventId });
        }
      }
      // لو فشل الإدراج (جدول ناقص، انقطاع شبكة) نكمل المعالجة عمداً:
      // الطبقة 3 (اشتراط pending) تمنع المنح المزدوج، فالتوفّر أولى هنا.
    } catch {
      /* نتابع — انظر أعلاه */
    }
  }

  // ── 5) التطبيق ──────────────────────────────────────────────────────────
  try {
    switch (reduced.kind) {
      case "intent_succeeded":
      case "checkout_completed":
        return await completeCreditPayment({ sb, reduced, eventType });

      case "subscription_updated":
      case "subscription_deleted":
      case "payment_succeeded":
        return await applySubscriptionEntitlement({ sb, reduced, eventType });

      default:
        // payment_failed / intent_payment_failed: تُسجَّل للمخاطر في مسارها
        // الخاص (payment_risk_events)، ولا تمنح شيئاً هنا.
        return json({ received: true, noted: reduced.kind });
    }
  } catch (e) {
    // 500 ⇒ Stripe تعيد التسليم. أفضل من ابتلاع فشل منحٍ مشروع.
    return json({ error: "processing_failed", detail: e?.message || "unknown" }, 500);
  }
}

/**
 * يكمل دفعة كريدتس معلّقة.
 *
 * المطابقة: نفضّل `paymentId` من metadata (نحن من كتبه وقت الإنشاء، فهو
 * الأدق)، ونرجع إلى `provider_payment_id` بمعرّف الجلسة أو الـ PaymentIntent
 * للدفعات الأقدم التي أُنشئت قبل هذا المسار.
 */
async function completeCreditPayment({ sb, reduced, eventType }) {
  const candidates = [
    reduced.paymentId,
    reduced.kind === "checkout_completed" ? reduced.sessionId : null,
    reduced.paymentIntentId,
  ].filter((v) => typeof v === "string" && v.length > 0);

  if (candidates.length === 0) {
    return json({ received: true, skipped: "no_payment_reference", eventType });
  }

  // نبحث عن صفّ معلّق فقط: المكتمل لا يُعاد إكماله (والـ RPC سترمي أصلاً).
  const SELECT = "id,status,amount_mad,amount_usd";
  let payment = null;

  // المسار الأول: معرّف الدفعة مباشرةً في metadata — الأدقّ.
  if (reduced.paymentId) {
    const direct = await sb(
      `/rest/v1/payments?select=${SELECT}&status=eq.pending&id=eq.${encodeURIComponent(reduced.paymentId)}`
    );
    const rows = direct.ok ? await direct.json() : [];
    payment = Array.isArray(rows) ? rows[0] : null;
  }

  // المسار الاحتياطي: مطابقة provider_payment_id بأيّ من المعرّفات المتاحة.
  // يُنفَّذ فقط لو فشل الأول، فلا نضاعف النداءات.
  if (!payment) {
    const or = candidates.map((id) => `provider_payment_id.eq.${encodeURIComponent(id)}`).join(",");
    const fallback = await sb(`/rest/v1/payments?select=${SELECT}&status=eq.pending&or=(${or})`);
    const rows = fallback.ok ? await fallback.json() : [];
    payment = Array.isArray(rows) ? rows[0] : null;
  }

  if (!payment) {
    // ليست خطأً بالضرورة: قد تكون دفعة اشتراك Pro لا تمرّ بجدول payments.
    return json({ received: true, skipped: "no_pending_payment", eventType });
  }

  // ── تقاطع المبلغ ────────────────────────────────────────────────────────
  // لا نرفض الدفع عند الاختلاف، والسبب جوهري: مبلغ الـ PaymentIntent يضعه
  // خادمنا نحن من سعر الحزمة في قاعدة البيانات، فالعميل لا يستطيع تخفيضه.
  // اختلاف المبلغ هنا يعني خللاً في إعدادنا لا محاولة احتيال — والمال صار
  // مقبوضاً فعلاً، فرفض المنح يعاقب العميل على خطئنا. نوثّقه للمراجعة.
  const amountNote = buildAmountNote(reduced, payment);

  const rpcRes = await sb("/rest/v1/rpc/complete_payment_and_grant_credits", {
    method: "POST",
    body: JSON.stringify({ p_payment_id: payment.id }),
  });

  if (!rpcRes.ok) {
    const detail = await rpcRes.text();
    // «not found or not pending» = عولجت مسبقاً ⇒ تكرار حميد، لا فشل.
    if (/not found or not pending/i.test(detail)) {
      return json({ received: true, alreadyCompleted: payment.id });
    }
    throw new Error(`grant_failed: ${detail.slice(0, 300)}`);
  }

  // نوثّق معرّف Stripe والمبلغ على الصفّ للتدقيق المحاسبي (المادة 26).
  await sb(`/rest/v1/payments?id=eq.${encodeURIComponent(payment.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      provider: "stripe",
      provider_payment_id: reduced.paymentIntentId || reduced.sessionId || null,
      metadata: {
        stripe_event: eventType,
        stripe_payment_intent_id: reduced.paymentIntentId || null,
        stripe_session_id: reduced.sessionId || null,
        stripe_amount: reduced.amount ?? null,
        stripe_amount_received: reduced.amountReceived ?? null,
        stripe_currency: reduced.currency || null,
        ...(amountNote ? { amount_mismatch: amountNote } : {}),
      },
    }),
  });

  return json({ received: true, completed: payment.id, ...(amountNote ? { amountWarning: amountNote } : {}) });
}

/** يبني ملاحظة اختلاف المبلغ، أو null إن تطابق/تعذّرت المقارنة. */
function buildAmountNote(reduced, payment) {
  if (!Number.isFinite(reduced.amount) || reduced.amount == null) return null;
  const currency = (reduced.currency || "").toLowerCase();
  const expectedMinor =
    currency === "usd" && payment.amount_usd != null
      ? Math.round(Number(payment.amount_usd) * 100)
      : currency === "mad" && payment.amount_mad != null
        ? Math.round(Number(payment.amount_mad) * 100)
        : null;
  if (expectedMinor == null) return null; // عملة غير مخزّنة — لا نقارن تخميناً
  if (expectedMinor === reduced.amount) return null;
  return { expected_minor: expectedMinor, stripe_minor: reduced.amount, currency };
}

/**
 * يطبّق استحقاق Pro على public.profiles (عمود is_pro هناك، لا في
 * mizan_profiles — الجدول الثاني هو البروفايل العام).
 *
 * نتحرك فقط عند وجود stripe_customer_id: بدونه لا نستطيع تحديد الصفّ،
 * والتخمين يعني تفعيل Pro لشخص آخر.
 */
async function applySubscriptionEntitlement({ sb, reduced, eventType }) {
  const customerId = reduced.customerId;
  if (!customerId) {
    return json({ received: true, skipped: "no_customer_id", eventType });
  }

  const isActive =
    reduced.kind === "subscription_deleted"
      ? false
      : ACTIVE_SUBSCRIPTION_STATUSES.has(String(reduced.status || ""));

  const res = await sb(
    `/rest/v1/profiles?stripe_customer_id=eq.${encodeURIComponent(customerId)}&select=id`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        is_pro: isActive,
        subscription_status: reduced.status || (isActive ? "active" : "canceled"),
        stripe_subscription_id: reduced.subscriptionId || null,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`entitlement_update_failed: ${(await res.text()).slice(0, 300)}`);
  }

  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    // عميل Stripe لا يطابق أي بروفايل — يُسجَّل ولا يُعتبر فشلاً.
    return json({ received: true, skipped: "no_matching_profile", customerId, eventType });
  }

  return json({ received: true, updatedProfiles: rows.length, isPro: isActive });
}
