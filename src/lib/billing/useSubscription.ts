import { useEffect, useState } from "react";

export type SubscriptionStatus = "free" | "pro" | "pro_yearly" | "past_due" | "canceled";
export type Subscription = {
  status: SubscriptionStatus;
  planSlug: string | null;
  currentPeriodEnd: string | null;
  credits: number;
  isPro: boolean;
};

const STORAGE_KEY = "mizan:subscription:v1";

const DEFAULT_SUB: Subscription = {
  status: "free",
  planSlug: null,
  currentPeriodEnd: null,
  credits: 0,
  isPro: false,
};

function readSub(): Subscription {
  if (typeof window === "undefined") return DEFAULT_SUB;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SUB;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SUB, ...parsed };
  } catch {
    return DEFAULT_SUB;
  }
}

function writeSub(sub: Subscription) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sub));
  } catch {}
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription>(() => readSub());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { supabase } = await import("@/lib/supabase/client");
        const { data: userData } = await (supabase as any).auth.getUser();
        const user = userData?.user;
        if (!user) {
          setSubscription(readSub());
          return;
        }

        // مصدر الحقيقة لاشتراك Mizan Pro هو mizan_profiles (الترحيل
        // 20260916000000) المرتبط بـ owner_id = auth.uid(). صف profiles يبقى
        // كاحتياط للحسابات القديمة (ads_exempt / bonus_credits).
        const [mizanRes, profilesRes] = await Promise.all([
          (supabase as any)
            .from("mizan_profiles")
            .select("is_pro, credits, subscription_status, subscription_current_period_end, rank")
            .eq("owner_id", user.id)
            .maybeSingle(),
          (supabase as any)
            .from("profiles")
            .select("bonus_credits, ads_exempt")
            .eq("id", user.id)
            .maybeSingle(),
        ]);

        const mizan = mizanRes?.data as
          | {
              is_pro?: boolean | null;
              credits?: number | null;
              subscription_status?: string | null;
              subscription_current_period_end?: string | null;
              rank?: string | null;
            }
          | null;
        const legacy = profilesRes?.data as { bonus_credits?: number | null; ads_exempt?: boolean | null } | null;

        if (mizan || legacy) {
          const isPro = Boolean(
            mizan?.is_pro ||
              (mizan?.subscription_status && ["active", "trialing"].includes(mizan.subscription_status)) ||
              legacy?.ads_exempt ||
              (legacy?.bonus_credits || 0) > 1000
          );
          const sub: Subscription = {
            status: isPro
              ? ((mizan?.subscription_status as SubscriptionStatus) ?? "pro")
              : "free",
            planSlug: isPro ? "mizan_pro_monthly" : null,
            currentPeriodEnd: mizan?.subscription_current_period_end ?? null,
            credits: mizan?.credits ?? legacy?.bonus_credits ?? 0,
            isPro,
          };
          writeSub(sub);
          setSubscription(sub);
        }
      } catch {
        setSubscription(readSub());
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const isPro = subscription.isPro;

  return { subscription, isPro, loading, refresh: () => setSubscription(readSub()) };
}
