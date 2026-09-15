import type { CreditPackage, Payment, CreditTransaction } from "./types";

const PACKAGES_CACHE_KEY = "mizan:payments:packages:v1";
const PACKAGES_TTL = 1000 * 60 * 60; // 1 hour

interface CacheEnvelope {
  savedAt: number;
  packages: CreditPackage[];
}

function readCache(): CreditPackage[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PACKAGES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope;
    if (Date.now() - parsed.savedAt > PACKAGES_TTL) return null;
    return (parsed as any).packages || [];
  } catch {
    return null;
  }
}

function writeCache(packages: CreditPackage[]): void {
  if (typeof window === "undefined") return;
  try {
    const envelope: CacheEnvelope = { savedAt: Date.now(), packages };
    window.localStorage.setItem(PACKAGES_CACHE_KEY, JSON.stringify(envelope));
  } catch {
    /* ignore */
  }
}

export async function fetchPackages(force = false): Promise<CreditPackage[]> {
  if (!force) {
    const cached = readCache();
    if (cached && cached.length > 0) return cached;
  }

  try {
    const { supabase } = await import("@/lib/supabase/client");
    const { data, error } = await (supabase as any)
      .from("credit_packages")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error || !data) throw error || new Error("No data");

    const packages = data as unknown as CreditPackage[];
    writeCache(packages);
    return packages;
  } catch {
    // Fallback hardcoded packages (matches migration seeds)
    return [
      { id: "seed-starter", slug: "starter", title: "الباقة التجريبية", description: "لتجاوز اختبار تحديد المستوى", credits: 100, price_mad: 19, price_usd: null, bonus_credits: 0, is_popular: false, is_active: true, sort_order: 1 },
      { id: "seed-student", slug: "student", title: "باقة الطالب", description: "الأكثر مبيعاً — شهر كامل", credits: 350, price_mad: 49, price_usd: null, bonus_credits: 50, is_popular: true, is_active: true, sort_order: 2 },
      { id: "seed-pro", slug: "pro", title: "باقة المحترف", description: "للمقبلين على المباريات", credits: 800, price_mad: 99, price_usd: null, bonus_credits: 150, is_popular: false, is_active: true, sort_order: 3 },
      { id: "seed-elite", slug: "elite", title: "باقة النخبة", description: "دعم المنصة والوصول الكامل", credits: 2000, price_mad: 199, price_usd: null, bonus_credits: 500, is_popular: false, is_active: true, sort_order: 4 },
    ];
  }
}

export async function fetchUserPayments(userRef: string): Promise<Payment[]> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    const { data, error } = await (supabase as any).from("payments").select("*").eq("user_ref", userRef).order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return (data as unknown as Payment[]) || [];
  } catch {
    return [];
  }
}

export async function fetchCreditHistory(userRef: string): Promise<CreditTransaction[]> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    const { data, error } = await (supabase as any).from("credit_transactions").select("*").eq("user_ref", userRef).order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return (data as unknown as CreditTransaction[]) || [];
  } catch {
    return [];
  }
}

// محاكاة إنشاء عملية دفع — في الإنتاج سيتصل بـ Stripe/CMI/MoPay
export async function createPaymentIntent(packageSlug: string, userRef: string | null): Promise<{ paymentId: string; checkoutUrl?: string }> {
  // حالياً ننشئ سجلاً محلياً ونعيد معرفاً — الدفع الحقيقي سيحتاج Edge Function
  const packages = await fetchPackages();
  const pkg = packages.find((p) => p.slug === packageSlug);
  if (!pkg) throw new Error("Package not found");

  // في بيئة التطوير، نحاكي النجاح مباشرة
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return { paymentId: `mock-${Date.now()}`, checkoutUrl: undefined };
  }

  // في الإنتاج، هنا سيتم استدعاء functions/api/payments/create.js
  // الذي سيُنشئ payment intent لدى المزود ويعيد checkoutUrl
  try {
    const res = await fetch("/api/payments/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageSlug, userRef }),
    });
    if (!res.ok) throw new Error("Failed to create payment");
    const json = await res.json();
    return { paymentId: json.paymentId, checkoutUrl: json.checkoutUrl };
  } catch {
    // fallback mock
    return { paymentId: `mock-${Date.now()}`, checkoutUrl: undefined };
  }
}

export function formatPriceMAD(price: number): string {
  return `${price.toFixed(2)} د.م.`;
}
