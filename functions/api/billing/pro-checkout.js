/**
 * POST /api/billing/pro-checkout
 * Stripe subscription for Mizan Pro
 */

import { getPlanBySlug } from "../../../shared/billing/stripe.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { planSlug, userRef } = await request.json();
    const plan = getPlanBySlug(planSlug);
    if (!plan) return new Response(JSON.stringify({ error: "Plan not found" }), { status: 404, headers: { "Content-Type": "application/json" } });

    const stripeKey = env.STRIPE_SECRET_KEY;
    const priceId = env[planSlug === "pro_monthly" ? "STRIPE_PRICE_MONTHLY" : "STRIPE_PRICE_YEARLY"];

    if (!stripeKey || !priceId) {
      return new Response(JSON.stringify({ url: null, mock: true, plan, note: "Stripe not configured — mock" }), { headers: { "Content-Type": "application/json" } });
    }

    const params = new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: `${env.VITE_SITE_URL || "https://www.mizan.page"}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.VITE_SITE_URL || "https://www.mizan.page"}/pricing`,
    });

    if (userRef) params.set("client_reference_id", userRef);

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: "Stripe failed", details: err }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const session = await res.json();
    return new Response(JSON.stringify({ url: session.url, id: session.id }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
