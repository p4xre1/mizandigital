/**
 * POST /api/payments/create
 * إنشاء عملية دفع جديدة — حالياً mock، في الإنتاج سيتصل بـ CMI/Stripe/MoPay
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { packageSlug, userRef } = body;

    if (!packageSlug || typeof packageSlug !== "string") {
      return new Response(JSON.stringify({ error: "packageSlug required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // جلب الحزمة من Supabase
    const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
    const supabaseKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      // Fallback mock
      return new Response(JSON.stringify({ paymentId: `mock-${Date.now()}`, checkoutUrl: null, mock: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // محاولة جلب الحزمة
    const pkgRes = await fetch(`${supabaseUrl}/rest/v1/credit_packages?slug=eq.${encodeURIComponent(packageSlug)}&is_active=eq.true&select=*`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    if (!pkgRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch package" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const packages = await pkgRes.json();
    const pkg = packages[0];
    if (!pkg) {
      return new Response(JSON.stringify({ error: "Package not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    // إنشاء سجل دفع pending
    // ملاحظة: RLS يمنع insert المباشر من anon، لذا نستخدم service role إن وجد، أو نعيد mock
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      // بدون service key، نعيد mock — الإدارة ستكمل الدفع يدوياً
      return new Response(
        JSON.stringify({
          paymentId: `mock-${Date.now()}`,
          checkoutUrl: null,
          package: pkg,
          note: "No service role key — mock payment, admin must complete manually",
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const paymentRes = await fetch(`${supabaseUrl}/rest/v1/payments`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        user_ref: userRef || null,
        package_id: pkg.id,
        amount_mad: pkg.price_mad,
        credits_purchased: pkg.credits,
        bonus_credits: pkg.bonus_credits,
        provider: "manual",
        status: "pending",
      }),
    });

    if (!paymentRes.ok) {
      const errText = await paymentRes.text();
      return new Response(JSON.stringify({ error: "Failed to create payment", details: errText }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const paymentData = await paymentRes.json();
    const payment = paymentData[0];

    // هنا في الإنتاج: إنشاء checkout session لدى المزود (Stripe, CMI, إلخ)
    // وإعادة checkoutUrl
    // const checkoutUrl = await createStripeSession(pkg, payment.id)

    return new Response(
      JSON.stringify({
        paymentId: payment.id,
        checkoutUrl: null,
        package: pkg,
        message: "تم إنشاء طلب الدفع — بانتظار التأكيد",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
