import { useCallback, useMemo, useSyncExternalStore } from "react"
import type { MizanProfile, QuizAttempt, RankId } from "@/types/quiz"
import {
  completePlacement,
  getProgressSnapshot,
  getProgressStats,
  getRecentlySeenQuestionIds,
  grantCredits,
  recordAttempt,
  resetProgress,
  saveProfile,
  skipPlacement,
  spendCredits,
  subscribe,
} from "@/lib/quiz/progressStore"
import { getRankProgress } from "@/lib/quiz/ranks"

/**
 * الخطاف الموحّد للتقدّم (XP، الرتبة، الكريدتس، الملف الشخصي).
 *
 * يستعمل useSyncExternalStore بدل useState + useEffect لأن المخزن مشترك
 * بين كل صفحات التطبيق: أي تحديث (من صفحة اختبار أخرى أو من نافذة ثانية)
 * ينعكس فوراً على الشريط والشارة بلا إعادة تحميل.
 */
export function useQuizProgress() {
  const progress = useSyncExternalStore(subscribe, getProgressSnapshot, getProgressSnapshot)

  const rankProgress = useMemo(() => getRankProgress(progress.xp), [progress.xp])
  const stats = useMemo(() => getProgressStats(progress), [progress])
  const recentQuestionIds = useMemo(() => getRecentlySeenQuestionIds(progress), [progress])

  const submitAttempt = useCallback((attempt: QuizAttempt) => recordAttempt(attempt), [])
  const finishPlacement = useCallback(
    (attempt: QuizAttempt, rank: RankId, xpGrant: number) => completePlacement(attempt, rank, xpGrant),
    []
  )
  const updateProfile = useCallback((profile: MizanProfile) => saveProfile(profile), [])
  const payCredits = useCallback((amount: number) => spendCredits(amount), [])
  const addCredits = useCallback((amount: number) => grantCredits(amount), [])
  const reset = useCallback(() => resetProgress(), [])
  const payToSkipPlacement = useCallback((rank: RankId, xpGrant: number, cost: number) => skipPlacement(rank, xpGrant, cost), [])

  return {
    progress,
    xp: progress.xp,
    credits: progress.credits,
    rank: rankProgress.rank,
    rankProgress,
    stats,
    recentQuestionIds,
    profile: progress.profile,
    badges: progress.badges,
    streakDays: progress.streakDays,
    placementCompleted: progress.placementCompleted,
    placementRank: progress.placementRank,
    submitAttempt,
    finishPlacement,
    updateProfile,
    payCredits,
    addCredits,
    payToSkipPlacement,
    reset,
  }
}
