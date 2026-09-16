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

        // Try to fetch from profiles or a subscriptions table if exists
        const { data } = await (supabase as any).from("profiles").select("bonus_credits, ads_exempt").eq("id", user.id).maybeSingle();
        if (data) {
          const isPro = !!data.ads_exempt || (data.bonus_credits || 0) > 1000;
          const sub: Subscription = {
            status: isPro ? "pro" : "free",
            planSlug: isPro ? "pro_monthly" : null,
            currentPeriodEnd: null,
            credits: data.bonus_credits || 0,
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
