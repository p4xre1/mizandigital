/**
 * خدمة إرسال محاولات الاختبارات بشكل آمن — attemptService
 *
 * كانت المشكلة: QuizRunner يحسب XP محلياً ويخزنه في localStorage فقط،
 * و quiz_attempts كان يقبل أي قيمة عبر insert مباشر (WITH CHECK true).
 *
 * الحل الجديد:
 *   1) الإرسال عبر RPC submit_quiz_attempt — الخادم يعيد حساب XP بنفسه
 *   2) localStorage يبقى كـ cache للعمل بلا إنترنت، لكن عند توفر الشبكة
 *      الخادم هو مصدر الحقيقة
 *   3) تحديد معدل على العميل (debounce) لمنع الفيض
 */

import type { QuizAttempt, QuizQuestion } from "@/types/quiz";
import { getProgressSnapshot } from "./progressStore";

export interface SecureSubmitPayload {
  mode: QuizAttempt["mode"];
  label: string;
  tier: QuizAttempt["tier"];
  answers: Array<{
    questionId: string;
    chosen: number | null;
    elapsedMs: number;
    difficulty?: string;
    correct?: boolean; // للأسئلة المحلية فقط
  }>;
  durationMs: number;
}

export interface SecureSubmitResult {
  id: string;
  correct: number;
  total: number;
  score: number;
  xpEarned: number;
  creditsEarned: number;
  bestStreak: number;
  verified: boolean;
}

const SUBMIT_COOLDOWN_MS = 3000;
let lastSubmitAt = 0;

function getUserRef(): string | null {
  try {
    const progress = getProgressSnapshot();
    // نستخدم username أو معرف عشوائي ثابت كـ user_ref للمجهولين
    if (progress.profile?.username) return `local:${progress.profile.username}`;
    // معرف مجهول ثابت لكل جهاز
    if (typeof window !== "undefined") {
      const key = "mizan:anon:user_ref:v1";
      let ref = window.localStorage.getItem(key);
      if (!ref) {
        ref = `anon:${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
        window.localStorage.setItem(key, ref);
      }
      return ref;
    }
    return null;
  } catch {
    return null;
  }
}

export async function submitAttemptSecure(payload: SecureSubmitPayload): Promise<SecureSubmitResult> {
  const now = Date.now();
  if (now - lastSubmitAt < SUBMIT_COOLDOWN_MS) {
    throw new Error("يرجى الانتظار قليلاً قبل إرسال محاولة أخرى");
  }
  lastSubmitAt = now;

  // التحقق الأساسي على العميل قبل الإرسال
  if (payload.answers.length === 0 || payload.answers.length > 100) {
    throw new Error("عدد الإجابات غير صالح");
  }
  if (payload.durationMs < 0 || payload.durationMs > 86400000) {
    throw new Error("مدة غير صالحة");
  }

  try {
    const { supabase } = await import("@/lib/supabase/client");

    // تحويل الإجابات إلى JSONB كما تتوقعه الدالة
    const answersJson = payload.answers.map((a) => ({
      questionId: a.questionId,
      chosen: a.chosen,
      elapsedMs: Math.max(0, Math.min(a.elapsedMs, 600000)),
      difficulty: a.difficulty,
      correct: a.correct,
    }));

    const { data, error } = await (supabase as any).rpc("submit_quiz_attempt", {
      p_mode: payload.mode,
      p_label: payload.label.slice(0, 200),
      p_tier: payload.tier,
      p_answers: answersJson as unknown as string, // supabase-js يقبل jsonb كـ object
      p_duration_ms: payload.durationMs,
      p_user_ref: getUserRef(),
    });

    if (error) {
      // في حالة فشل RPC (مثلاً الشبكة)، نعود للوضع المحلي
      console.warn("[attemptService] RPC failed, fallback to local", error);
      throw error;
    }

    // data قد تكون مصفوفة (RETURNS TABLE) أو كائن واحد
    const row = Array.isArray(data) ? (data as any)[0] : (data as any);
    if (!row) throw new Error("لا توجد نتيجة من الخادم");

    return {
      id: row.id,
      correct: row.correct,
      total: row.total,
      score: row.score,
      xpEarned: row.xp_earned,
      creditsEarned: row.credits_earned,
      bestStreak: row.best_streak,
      verified: true,
    };
  } catch (err) {
    // fallback: حساب محلي إذا فشل الخادم (للوضع بلا إنترنت)
    // نعيد نفس القيم المحسوبة محلياً لكن مع verified=false
    const correct = payload.answers.filter((a) => a.correct).length;
    const total = payload.answers.length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    // تقدير XP محلي (سيتم التحقق لاحقاً عند توفر الشبكة)
    const estimatedXp = correct * 12 + (total > 0 ? 15 : 0) + (correct === total && total > 0 ? 40 : 0);
    const estimatedCredits = total > 0 ? Math.max(1, Math.round(estimatedXp / 12) + 3) : 0;

    return {
      id: `local-${Date.now().toString(36)}`,
      correct,
      total,
      score,
      xpEarned: estimatedXp,
      creditsEarned: estimatedCredits,
      bestStreak: 0,
      verified: false,
    };
  }
}

// التحقق من إجابة واحدة عبر الخادم (للمسار الآمن)
export async function checkAnswerSecure(questionId: string, chosen: number | null): Promise<{ correct: boolean | null; explanation: string | null; reference: string | null }> {
  if (chosen === null || chosen < 0 || chosen > 3) {
    return { correct: false, explanation: null, reference: null };
  }

  try {
    const { supabase } = await import("@/lib/supabase/client");
    const { data, error } = await (supabase as any).rpc("check_quiz_answer", {
      p_question_id: questionId,
      p_chosen: chosen,
    });

    if (error || !data) {
      return { correct: null, explanation: null, reference: null };
    }

    const row = Array.isArray(data) ? (data as any)[0] : (data as any);
    if (!row) return { correct: null, explanation: null, reference: null };

    return {
      correct: row.correct,
      explanation: row.explanation,
      reference: row.reference,
    };
  } catch {
    return { correct: null, explanation: null, reference: null };
  }
}

// مزامنة المحاولات المحلية المعلقة عند عودة الشبكة
export async function syncPendingAttempts(attempts: QuizAttempt[]): Promise<number> {
  let synced = 0;
  for (const attempt of attempts.slice(-20)) {
    try {
      await submitAttemptSecure({
        mode: attempt.mode,
        label: attempt.label,
        tier: attempt.tier,
        answers: attempt.answers.map((a) => ({
          questionId: a.questionId,
          chosen: a.chosen,
          elapsedMs: a.elapsedMs,
          correct: a.correct,
        })),
        durationMs: attempt.durationMs,
      });
      synced++;
    } catch {
      // تجاهل الفشل — سنحاول لاحقاً
    }
  }
  return synced;
}
