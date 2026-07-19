import { useCallback, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { addBonusCredits, deductCredit as deductCreditFn, getCreditBalance, type CreditBalance, type DeductCreditResult } from "../lib/credits";

export interface UseCreditsResult extends CreditBalance {
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  deductCredit: () => Promise<DeductCreditResult>;
  addCredit: (amount?: number) => Promise<{ bonus_credits: number; daily_credits: number; total: number }>;
  consumeCredit: () => Promise<DeductCreditResult>;
  hasCredits: boolean;
}

export function useCredits(): UseCreditsResult {
  const [credits, setCredits] = useState<CreditBalance>({ daily_credits: 0, bonus_credits: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const loadCurrentUser = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!isSupabaseConfigured) {
        setCredits({ daily_credits: 0, bonus_credits: 0, total: 0 });
        setUserId(null);
        return;
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user?.id) {
        setCredits({ daily_credits: 0, bonus_credits: 0, total: 0 });
        setUserId(null);
        return;
      }

      setUserId(user.id);
      const nextCredits = await getCreditBalance(user.id);
      setCredits(nextCredits);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load credits.");
      setCredits({ daily_credits: 0, bonus_credits: 0, total: 0 });
      setUserId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCurrentUser();
  }, [loadCurrentUser]);

  const refresh = useCallback(async () => {
    await loadCurrentUser();
  }, [loadCurrentUser]);

  const deductCredit = useCallback(async () => {
    if (!userId) {
      return { success: false, reason: "Unauthenticated user", daily_credits: 0, bonus_credits: 0 };
    }
    const result = await deductCreditFn(userId);
    setCredits({ daily_credits: result.daily_credits, bonus_credits: result.bonus_credits, total: result.daily_credits + result.bonus_credits });
    return result;
  }, [userId]);

  const consumeCredit = useCallback(async () => {
    if (credits.total <= 0) {
      return {
        success: false,
        reason: "insufficient_credits",
        daily_credits: credits.daily_credits,
        bonus_credits: credits.bonus_credits,
      };
    }
    return await deductCredit();
  }, [credits, deductCredit]);

  const addCredit = useCallback(async (amount = 1) => {
    if (!userId) {
      throw new Error("Unauthenticated user");
    }
    const result = await addBonusCredits(userId, amount);
    setCredits({ daily_credits: result.daily_credits, bonus_credits: result.bonus_credits, total: result.total });
    return result;
  }, [userId]);

  return {
    daily_credits: credits.daily_credits,
    bonus_credits: credits.bonus_credits,
    total: credits.total,
    loading,
    error,
    refresh,
    deductCredit,
    addCredit,
    consumeCredit,
    hasCredits: credits.total > 0,
  };
}
