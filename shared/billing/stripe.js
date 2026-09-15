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
