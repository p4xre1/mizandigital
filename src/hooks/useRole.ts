import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Role, UserProfile } from "@/types/database";

export interface UseRoleResult {
  profile: UserProfile | null;
  role: Role;
  daily_credits: number;
  bonus_credits: number;
  // Role Helpers
  isStaff: boolean;
  isGuest: boolean;
  // Master Blueprint UI Helpers
  isDeveloper: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  // Loading & Execution States
  loading: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface ProfileData {
  role: string | null;
  daily_credits: number | null;
  bonus_credits: number | null;
}

function normalizeRole(value: string | null | undefined): Role {
  if (!value) return "guest";
  const lower = value.toLowerCase();

  switch (lower) {
    case "root":
    case "admin":
    case "developer":
      return "root";
    case "security_admin":
      return "security_admin";
    case "writer":
    case "editor":
      return "writer";
    case "member":
    case "user":
      return "member";
    default:
      return "guest";
  }
}

async function fetchProfileState(): Promise<{
  profile: UserProfile | null;
  role: Role;
  daily_credits: number;
  bonus_credits: number;
}> {
  if (!isSupabaseConfigured) {
    return { profile: null, role: "guest", daily_credits: 0, bonus_credits: 0 };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { profile: null, role: "guest", daily_credits: 0, bonus_credits: 0 };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    return { profile: null, role: "member", daily_credits: 0, bonus_credits: 0 };
  }

  const raw = data as ProfileData & UserProfile;

  return {
    profile: raw,
    role: normalizeRole(raw.role),
    daily_credits: Math.max(0, Number(raw.daily_credits ?? 0)),
    bonus_credits: Math.max(0, Number(raw.bonus_credits ?? 0)),
  };
}

export function useRole(): UseRoleResult {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<Role>("guest");
  const [dailyCredits, setDailyCredits] = useState(0);
  const [bonusCredits, setBonusCredits] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRole = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const state = await fetchProfileState();
      setProfile(state.profile);
      setRole(state.role);
      setDailyCredits(state.daily_credits);
      setBonusCredits(state.bonus_credits);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load role.");
      setProfile(null);
      setRole("guest");
      setDailyCredits(0);
      setBonusCredits(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRole();

    if (!isSupabaseConfigured) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  // 1. Role Mappings
  const isStaff = useMemo(
    () => role === "writer" || role === "security_admin" || role === "root",
    [role]
  );
  const isGuest = useMemo(() => role === "guest", [role]);

  // 2. Blueprint Permission Helpers
  const isDeveloper = useMemo(
    () => role === "root" || role === "security_admin",
    [role]
  );
  const isAdmin = useMemo(
    () => role === "root" || role === "security_admin",
    [role]
  );
  const isEditor = useMemo(() => role === "writer" || role === "root", [role]);

  return {
    profile,
    role,
    daily_credits: dailyCredits,
    bonus_credits: bonusCredits,
    isStaff,
    isGuest,
    isDeveloper,
    isAdmin,
    isEditor,
    loading: isLoading,
    isLoading,
    error,
    refresh: loadRole,
  };
}