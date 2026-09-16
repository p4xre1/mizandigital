/**
 * POST /api/billing/checkout
 * Create Stripe checkout for credit packages
 */

import { getPackageBySlug } from "../../../shared/billing/stripe.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { packageSlug, userRef } = await request.json();
    if (!packageSlug) return new Response(JSON.stringify({ error: "packageSlug required" }), { status: 400, headers: { "Content-Type": "application/json" } });

    const pkg = getPackageBySlug(packageSlug);
    if (!pkg) return new Response(JSON.stringify({ error: "Package not found" }), { status: 404, headers: { "Content-Type": "application/json" } });

    const stripeKey = env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      // Mock
      return new Response(JSON.stringify({ url: null, mock: true, package: pkg, paymentId: `mock-${Date.now()}` }), { headers: { "Content-Type": "application/json" } });
    }

    // Real Stripe checkout creation
    const params = new URLSearchParams({
      "payment_method_types[]": "card",
      mode: "payment",
      "line_items[0][price_data][currency]": "mad",
      "line_items[0][price_data][product_data][name]": `Mizan ${pkg.slug} - ${pkg.credits} credits`,
      "line_items[0][price_data][unit_amount]": String(Math.round(pkg.priceMAD * 100)),
      "line_items[0][quantity]": "1",
      success_url: `${env.VITE_SITE_URL || "https://www.mizan.page"}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.VITE_SITE_URL || "https://www.mizan.page"}/payments/cancel`,
    });

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    if (!stripeRes.ok) {
      const err = await stripeRes.text();
      return new Response(JSON.stringify({ error: "Stripe failed", details: err }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const session = await stripeRes.json();

    // Store pending payment in Supabase if service key available
    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      await fetch(`${env.SUPABASE_URL}/rest/v1/payments`, {
        method: "POST",
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_ref: userRef || null,
          amount_mad: pkg.priceMAD,
          credits_purchased: pkg.credits,
          bonus_credits: pkg.bonus || 0,
          provider: "stripe",
          provider_payment_id: session.id,
          status: "pending",
        }),
      });
    }

    return new Response(JSON.stringify({ url: session.url, id: session.id }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
