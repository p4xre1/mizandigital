import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useAuth } from "@/lib/auth/AuthProvider"
import { getProgressSnapshot, mergeCloudProgression, subscribe } from "@/lib/quiz/progressStore"
import { getRankForXp } from "@/lib/quiz/ranks"
import type { MizanProfile } from "@/types/quiz"

/**
 * useProgressionSync — يربط التقدّم المحلي ببروفايل Supabase.
 * -----------------------------------------------------------------------
 * وظيفتان:
 *   1) عند تسجيل الدخول: دمج ما في السحابة (mizan_profiles) مع ما على الجهاز
 *      بحيث لا يضيع تقدّم ولا تُخفَّض رتبة.
 *   2) عند كل تغيير محلي (اختبار مكتمل، كريدتس، أوسمة): دفع القيم إلى
 *      البروفايل السحابي. الرتبة لا تُرسل كقرار من العميل — المشغّل
 *      `apply_profile_rank` في القاعدة يشتقّها من xp، ونحن نعرض ما رجّعته.
 *
 * الدفع مُرجَأ (debounce 1.2s) ومحمي من التكرار عبر توقيع للقيم، حتى لا
 * نُغرق الشبكة أثناء جلسة اختبار سريعة.
 */

const DEBOUNCE_MS = 1200

function signatureOf(xp: number, credits: number, badges: string[], streakDays: number): string {
  return `${xp}|${credits}|${[...badges].sort().join(",")}|${streakDays}`
}

function cloudProfileToMizanProfile(profile: NonNullable<ReturnType<typeof useAuth>["profile"]>): MizanProfile {
  return {
    username: profile.username,
    displayName: profile.displayName,
    role: profile.role,
    semester: profile.semester ?? null,
    yearsOfExperience: profile.yearsOfExperience ?? null,
    interests: profile.interests ?? [],
    city: profile.city ?? null,
    bio: profile.bio ?? null,
    occupation: profile.occupation ?? null,
    shareLocation: profile.shareLocation ?? false,
    bioPublic: profile.bioPublic ?? true,
    isPublic: profile.isPublic ?? true,
    avatarUrl: profile.avatarUrl ?? null,
    coverUrl: profile.coverUrl ?? null,
    headline: profile.headline ?? null,
    websiteUrl: profile.websiteUrl ?? null,
    linkedinUrl: profile.linkedinUrl ?? null,
    themeColor: profile.themeColor ?? null,
    showXp: profile.showXp ?? true,
    showBadges: profile.showBadges ?? true,
    showAttempts: profile.showAttempts ?? false,
    showRank: profile.showRank ?? true,
    updatedAt: profile.updatedAt,
  }
}

export function useProgressionSync(): { lastSyncedRank: string | null; syncing: boolean } {
  const { user, profile, pushProgress } = useAuth()
  const progress = useSyncExternalStore(subscribe, getProgressSnapshot, getProgressSnapshot)
  const hydratedFor = useRef<string | null>(null)
  const lastSignature = useRef<string | null>(null)
  const lastSyncedRank = useRef<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  const userId = user?.id ?? null

  /* 1) الدمج عند الدخول (مرة واحدة لكل حساب) */
  useEffect(() => {
    if (!userId || !profile) return
    if (hydratedFor.current === userId) return
    hydratedFor.current = userId

    mergeCloudProgression({
      xp: profile.xp,
      credits: profile.credits,
      badges: profile.badges,
      streakDays: profile.streakDays,
      placementCompleted: profile.placementCompleted,
      profile: cloudProfileToMizanProfile(profile),
    })
    lastSignature.current = signatureOf(
      Math.max(profile.xp, getProgressSnapshot().xp),
      Math.max(profile.credits, getProgressSnapshot().credits),
      profile.badges,
      Math.max(profile.streakDays, getProgressSnapshot().streakDays)
    )
  }, [userId, profile])

  /* 2) الدفع عند كل تغيير */
  useEffect(() => {
    if (!userId) {
      hydratedFor.current = null
      lastSignature.current = null
      return
    }

    const signature = signatureOf(progress.xp, progress.credits, progress.badges, progress.streakDays)
    if (lastSignature.current === signature) return

    const timer = window.setTimeout(async () => {
      const current = getProgressSnapshot()
      const nextSignature = signatureOf(current.xp, current.credits, current.badges, current.streakDays)
      if (lastSignature.current === nextSignature) return
      lastSignature.current = nextSignature
      setSyncing(true)
      try {
        const result = await pushProgress({
          xp: current.xp,
          credits: current.credits,
          badges: current.badges,
          streakDays: current.streakDays,
          placementCompleted: current.placementCompleted,
        })
        if (result.synced && result.rank) {
          lastSyncedRank.current = result.rank
        }
      } finally {
        setSyncing(false)
      }
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [progress, pushProgress, setSyncing, userId])

  return {
    lastSyncedRank: lastSyncedRank.current ?? (profile?.rank ?? getRankForXp(progress.xp).id),
    syncing,
  }
}
