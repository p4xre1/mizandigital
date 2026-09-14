import type { MizanProfile, QuizProgress } from "@/types/quiz"

/**
 * خدمة البروفايل العام (mizan.page/u/:username).
 *
 * البروفايل يُبنى محلياً أولاً (يعمل بلا حساب وبلا شبكة)، ثم تُحاول
 * المزامنة مع جدول Supabase `mizan_profiles` عندما تتوفر جلسة صالحة.
 *
 * لماذا لا نعتمد على Supabase وحده؟ لأن أغلب زوار المنصة (طلبة) يستعملونها
 * بلا تسجيل دخول، وتجربة الألعاب (XP/الرتبة) يجب أن تعمل لهم فوراً.
 */

const DIRECTORY_KEY = "mizan:quiz:directory:v1"

export interface PublicProfile extends MizanProfile {
  xp: number
  credits: number
  rank: string
  badges: string[]
}

/* ------------------------------------------------------------------ *
 * دليل البروفايلات المحلي (يعمل بلا قاعدة بيانات)
 * ------------------------------------------------------------------ */

function readDirectory(): Record<string, PublicProfile> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(DIRECTORY_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, PublicProfile>
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function writeDirectory(directory: Record<string, PublicProfile>): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(DIRECTORY_KEY, JSON.stringify(directory))
  } catch {
    /* تجاهل */
  }
}

/** ينشر البروفايل المحلي (والتقدّم المرتبط به) في الدليل المحلي. */
export function publishLocalProfile(profile: MizanProfile, progress: QuizProgress, rank: string): PublicProfile {
  const entry: PublicProfile = {
    ...profile,
    xp: progress.xp,
    credits: progress.credits,
    rank,
    badges: progress.badges,
  }
  const directory = readDirectory()
  directory[profile.username.toLowerCase()] = entry
  writeDirectory(directory)
  return entry
}

export function getLocalProfile(username: string): PublicProfile | null {
  return readDirectory()[username.trim().toLowerCase()] ?? null
}

/* ------------------------------------------------------------------ *
 * المزامنة السحابية (اختيارية)
 * ------------------------------------------------------------------ */

/** يتحقق من توفّر اسم المستخدم (محلياً ثم في قاعدة البيانات). */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const normalized = username.trim().toLowerCase()
  if (!/^[a-z0-9_]{3,30}$/.test(normalized)) return false
  if (getLocalProfile(normalized)) return false

  try {
    const { supabase } = await import("@/lib/supabase/client")
    const { data, error } = await supabase
      .from("mizan_profiles")
      .select("username")
      .ilike("username", normalized)
      .maybeSingle()
    if (error) return true // تعذّر التحقق: لا نحجب المستخدم بسبب الشبكة
    return !data
  } catch {
    return true
  }
}

/**
 * يجلب بروفايلاً عاماً بالاسم. يبحث في قاعدة البيانات أولاً (حتى تعمل
 * الروابط بين الأجهزة)، ثم في الدليل المحلي كبديل.
 */
export async function fetchPublicProfile(username: string): Promise<PublicProfile | null> {
  const normalized = username.trim().toLowerCase()
  if (!normalized) return null

  try {
    const { supabase } = await import("@/lib/supabase/client")
    const { data, error } = await supabase
      .from("mizan_profiles")
      .select("username, display_name, role, semester, years_of_experience, interests, city, bio, xp, credits, rank, badges, updated_at")
      .ilike("username", normalized)
      .eq("is_public", true)
      .maybeSingle()

    if (!error && data) {
      return {
        username: data.username,
        displayName: data.display_name,
        role: data.role as MizanProfile["role"],
        semester: data.semester as MizanProfile["semester"],
        yearsOfExperience: data.years_of_experience,
        interests: data.interests ?? [],
        city: data.city,
        bio: data.bio,
        xp: data.xp ?? 0,
        credits: data.credits ?? 0,
        rank: data.rank ?? "D",
        badges: data.badges ?? [],
        updatedAt: data.updated_at ?? new Date().toISOString(),
      }
    }
  } catch {
    /* نكمل بالبحث المحلي */
  }

  return getLocalProfile(normalized)
}

/**
 * يزامن البروفايل والتقدّم مع قاعدة البيانات. يتطلب جلسة Supabase صالحة
 * (حسابات لوحة التحكم)؛ وبدونها يبقى كل شيء محلياً بلا أي خطأ للمستخدم.
 */
export async function syncProfileToCloud(
  profile: MizanProfile,
  progress: QuizProgress,
  rank: string
): Promise<{ synced: boolean; reason?: string }> {
  publishLocalProfile(profile, progress, rank)

  try {
    const { supabase } = await import("@/lib/supabase/client")
    const { data: sessionData } = await supabase.auth.getUser()
    const user = sessionData?.user
    if (!user) return { synced: false, reason: "لا توجد جلسة مسجلة — البروفايل محفوظ على هذا الجهاز." }

    const { error } = await supabase.from("mizan_profiles").upsert(
      {
        owner_id: user.id,
        username: profile.username.toLowerCase(),
        display_name: profile.displayName,
        role: profile.role,
        semester: profile.semester ?? null,
        years_of_experience: profile.yearsOfExperience ?? null,
        interests: profile.interests ?? [],
        city: profile.city ?? null,
        bio: profile.bio ?? null,
        xp: progress.xp,
        credits: progress.credits,
        rank,
        badges: progress.badges,
        streak_days: progress.streakDays,
        placement_completed: progress.placementCompleted,
        is_public: true,
      },
      { onConflict: "owner_id" }
    )

    if (error) throw error
    return { synced: true }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "خطأ غير معروف"
    return { synced: false, reason: `تعذّرت المزامنة السحابية: ${reason}` }
  }
}
