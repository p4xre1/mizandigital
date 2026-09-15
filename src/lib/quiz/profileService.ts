import type { MizanProfile, QuizProgress } from "@/types/quiz"

/**
 * خدمة البروفايل العام (mizan.page/u/:username).
 *
 * البروفايل يُبنى محلياً أولاً (يعمل بلا حساب وبلا شبكة)، ثم تُحاول
 * المزامنة مع جدول Supabase `mizan_profiles` عندما تتوفر جلسة صالحة.
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
 * اقتراح أسماء بديلة عند حجز الاسم
 * ------------------------------------------------------------------ */

export function generateUsernameSuggestions(base: string, max = 4): string[] {
  const clean = base.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20) || "user"
  const suggestions: string[] = []
  const rand = () => Math.floor(100 + Math.random() * 900)
  const candidates = [
    `${clean}_${rand()}`,
    `${clean}${rand()}`,
    `${clean}_law`,
    `${clean}_ma`,
    `${clean}_${new Date().getFullYear()}`,
    `${clean}_1`,
    `${clean}_2`,
  ]
  for (const c of candidates) {
    if (c.length >= 3 && c.length <= 30 && /^[a-z0-9_]+$/.test(c) && !suggestions.includes(c)) {
      suggestions.push(c)
    }
    if (suggestions.length >= max) break
  }
  return suggestions
}

/* ------------------------------------------------------------------ *
 * فحص التوفر مع منع التكرار
 * ------------------------------------------------------------------ */

export interface AvailabilityResult {
  available: boolean
  normalized: string
  reason?: "invalid_format" | "taken_local" | "taken_cloud" | "error"
  existsIn?: "local" | "cloud"
  suggestions?: string[]
}

export async function checkUsernameAvailability(
  rawUsername: string,
  currentUsername?: string | null
): Promise<AvailabilityResult> {
  const normalized = rawUsername.trim().toLowerCase().replace(/\s+/g, "_")

  if (!/^[a-z0-9_]{3,30}$/.test(normalized)) {
    return { available: false, normalized, reason: "invalid_format" }
  }

  // نفس المستخدم الحالي → متاح (يعدّل بروفايله)
  if (currentUsername && currentUsername.toLowerCase() === normalized) {
    return { available: true, normalized }
  }

  // فحص محلي (نفس الجهاز)
  const local = getLocalProfile(normalized)
  if (local) {
    // إذا كان البروفايل المحلي موجوداً لكنه ليس للمستخدم الحالي (نحن في وضع إنشاء جديد)
    // نعتبره محجوزاً على هذا الجهاز
    if (!currentUsername || local.username.toLowerCase() !== currentUsername.toLowerCase()) {
      return {
        available: false,
        normalized,
        reason: "taken_local",
        existsIn: "local",
        suggestions: generateUsernameSuggestions(normalized),
      }
    }
  }

  // فحص سحابي (Supabase) — مصدر الحقيقة الوحيد لمنع التكرار عبر الأجهزة
  try {
    const { supabase } = await import("@/lib/supabase/client")
    // نستخدم ilike بدون % لمطابقة دقيقة غير حساسة لحالة الأحرف،
    // والفهرس الفريد في قاعدة البيانات هو lower(username)
    const { data, error } = await supabase
      .from("mizan_profiles")
      .select("username")
      .ilike("username", normalized)
      .maybeSingle()

    if (error) {
      // خطأ شبكة/صلاحيات: لا نحجب المستخدم، لكن نعيد متاح مع تنبيه
      console.warn("checkUsernameAvailability supabase error:", error.message)
      return { available: true, normalized, reason: "error" }
    }

    if (data) {
      return {
        available: false,
        normalized,
        reason: "taken_cloud",
        existsIn: "cloud",
        suggestions: generateUsernameSuggestions(normalized),
      }
    }

    return { available: true, normalized }
  } catch (e) {
    console.warn("checkUsernameAvailability exception:", e)
    return { available: true, normalized, reason: "error" }
  }
}

/** واجهة قديمة للتوافق — تعيد boolean فقط */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const result = await checkUsernameAvailability(username)
  return result.available
}

/* ------------------------------------------------------------------ *
 * جلب بروفايل عام
 * ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ *
 * مزامنة سحابية مع معالجة تضارب الاسم المكرر
 * ------------------------------------------------------------------ */

export async function syncProfileToCloud(
  profile: MizanProfile,
  progress: QuizProgress,
  rank: string
): Promise<{ synced: boolean; reason?: string; duplicate?: boolean }> {
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

    if (error) {
      // كشف تضارب الاسم المكرر (unique violation على lower(username))
      const msg = error.message || ""
      const code = (error as any).code || ""
      const isDuplicate =
        code === "23505" ||
        msg.toLowerCase().includes("duplicate") ||
        msg.toLowerCase().includes("username") ||
        msg.toLowerCase().includes("mizan_profiles_username_lower_idx")

      if (isDuplicate) {
        return {
          synced: false,
          duplicate: true,
          reason: `اسم المستخدم "${profile.username}" محجوز من قبل — جرّب اسماً آخر: ${generateUsernameSuggestions(profile.username, 3).join("، ")}`,
        }
      }
      throw error
    }
    return { synced: true }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "خطأ غير معروف"
    const isDup = reason.toLowerCase().includes("duplicate") || reason.toLowerCase().includes("23505")
    if (isDup) {
      return {
        synced: false,
        duplicate: true,
        reason: `اسم المستخدم "${profile.username}" محجوز — جرّب: ${generateUsernameSuggestions(profile.username, 3).join("، ")}`,
      }
    }
    return { synced: false, reason: `تعذّرت المزامنة السحابية: ${reason}` }
  }
}
