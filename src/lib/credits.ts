import { supabase, isSupabaseConfigured } from "./supabase";

export interface CreditBalance {
  daily_credits: number;
  bonus_credits: number;
  total: number;
}

export interface DeductCreditResult {
  success: boolean;
  reason?: string;
  daily_credits: number;
  bonus_credits: number;
  used?: "daily" | "bonus";
}

export async function getCreditBalance(userId: string): Promise<CreditBalance> {
  if (!isSupabaseConfigured) {
    return { daily_credits: 0, bonus_credits: 0, total: 0 };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("daily_credits, bonus_credits")
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }

  const daily = Number(data?.daily_credits ?? 0);
  const bonus = Number(data?.bonus_credits ?? 0);

  return {
    daily_credits: Math.max(0, daily),
    bonus_credits: Math.max(0, bonus),
    total: Math.max(0, daily + bonus),
  };
}

export async function deductCredit(userId: string): Promise<DeductCreditResult> {
  if (!isSupabaseConfigured) {
    return { success: false, reason: "Supabase not configured", daily_credits: 0, bonus_credits: 0 };
  }

  const { data, error } = await supabase.rpc("deduct_credit", { user_id: userId });
  if (error) {
    throw error;
  }

  return {
    success: data?.success === true,
    reason: data?.reason ?? undefined,
    daily_credits: Number(data?.daily_credits ?? 0),
    bonus_credits: Number(data?.bonus_credits ?? 0),
    used: data?.used ?? undefined,
  };
}

export async function addBonusCredits(userId: string, amount = 1) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase not configured");
  }

  const { data, error } = await supabase.rpc("add_bonus_credits", {
    user_id: userId,
    amount,
  });

  if (error) {
    throw error;
  }

  return {
    bonus_credits: Number(data?.bonus_credits ?? 0),
    daily_credits: Number(data?.daily_credits ?? 0),
    total: Number(data?.total ?? 0),
  };
}
