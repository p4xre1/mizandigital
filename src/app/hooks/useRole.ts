import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type Role =
  | "guest"
  | "member"
  | "premium_member"
  | "writer"
  | "security_admin"
  | "root";

type Tier = "free" | "premium" | "enterprise";

interface UseRoleResult {
  role: Role;
  tier: Tier;
  daily_credits: number;
  bonus_credits: number;
  isPremium: boolean;
  isStaff: boolean;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface ProfileData {
  role: string | null;
  tier: string | null;
  daily_credits: number | null;
  bonus_credits: number | null;
}

function normalizeRole(value: string | null | undefined): Role {
  switch (value) {
    case "premium_member":
      return "premium_member";
    case "writer":
      return "writer";
    case "security_admin":
      return "security_admin";
    case "root":
      return "root";
    case "admin":
      return "root";
    case "member":
    case "user":
      return "member";
    default:
      return "guest";
  }
}

function normalizeTier(value: string | null | undefined): Tier {
  switch (value) {
    case "premium":
      return "premium";
    case "enterprise":
      return "enterprise";
    default:
      return "free";
  }
}

async function fetchProfileState(): Promise<{
  role: Role;
  tier: Tier;
  daily_credits: number;
  bonus_credits: number;
}> {
  if (!isSupabaseConfigured) {
    return { role: "guest", tier: "free", daily_credits: 0, bonus_credits: 0 };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { role: "guest", tier: "free", daily_credits: 0, bonus_credits: 0 };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("role, tier, daily_credits, bonus_credits")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    return { role: "member", tier: "free", daily_credits: 0, bonus_credits: 0 };
  }

  return {
    role: normalizeRole((data as ProfileData).role),
    tier: normalizeTier((data as ProfileData).tier),
    daily_credits: Math.max(0, Number((data as ProfileData).daily_credits ?? 0)),
    bonus_credits: Math.max(0, Number((data as ProfileData).bonus_credits ?? 0)),
  };
}

export function useRole(): UseRoleResult {
  const [role, setRole] = useState<Role>("guest");
  const [tier, setTier] = useState<Tier>("free");
  const [dailyCredits, setDailyCredits] = useState(0);
  const [bonusCredits, setBonusCredits] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRole = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const profile = await fetchProfileState();
      setRole(profile.role);
      setTier(profile.tier);
      setDailyCredits(profile.daily_credits);
      setBonusCredits(profile.bonus_credits);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load role.");
      setRole("guest");
      setTier("free");
      setDailyCredits(0);
      setBonusCredits(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRole();

    if (!isSupabaseConfigured) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event) => {
      void loadRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  const isPremium = useMemo(
    () => role === "premium_member" || role === "root",
    [role]
  );

  const isStaff = useMemo(
    () => role === "writer" || role === "security_admin" || role === "root",
    [role]
  );

  const isGuest = useMemo(
    () => role === "guest",
    [role]
  );

  return {
    role,
    tier,
    daily_credits: dailyCredits,
    bonus_credits: bonusCredits,
    isPremium,
    isStaff,
    isGuest,
    isLoading,
    error,
    refresh: loadRole,
  };
}
