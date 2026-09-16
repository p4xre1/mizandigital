import type { MizanProfile, QuizProgress, RankId, Semester, UserRole } from "@/types/quiz"
import { getRankDefinition, getRankForXp, higherRank } from "@/lib/quiz/ranks"

/**
 * خدمة البروفايلات (Supabase Auth) — profiles/service
 * -----------------------------------------------------------------------
 * بعد إزالة Clerk صار `auth.users` هو مصدر الهوية الوحيد، وكل حساب يملك صفاً
 * في `public.mizan_profiles` مرتبطاً بـ `owner_id = auth.uid()`.
 *
 * طبقتان:
 *   1) السحابة (Supabase) — مصدر الحقيقة للمشاركة بين الأجهزة وللرتب.
 *      الرتبة لا تُكتب من العميل: المشغّل `apply_profile_rank` يشتقّها من xp
 *      داخل القاعدة (شوف 20260924000000_supabase_auth_profiles_and_ranks.sql).
 *   2) دليل محلي (localStorage) — يجعل البروفايل يعمل بلا جلسة وبلا شبكة،
 *      وهو نفسه مخزون التقدّم في lib/quiz/progressStore.
 *
 * فشل الطبقة السحابية لا يُسقط التجربة أبداً: كل دالة تُرجع نتيجة صريحة
 * `{ synced, reason }` بدل أن ترمي.
 */

/* ------------------------------------------------------------------ *
 * الأنواع
 * ------------------------------------------------------------------ */

/** صف mizan_profiles كما يرجع من Supabase (أعمدة snake_case). */
export interface ProfileRow {
  id: string
  owner_id: string | null
  username: string
  display_name: string
  role: string
  semester: string | null
  years_of_experience: number | null
  interests: string[] | null
  city: string | null
  bio: string | null
  occupation?: string | null
  share_location?: boolean | null
  bio_public?: boolean | null
  avatar_url?: string | null
  cover_url?: string | null
  headline?: string | null
  website_url?: string | null
  linkedin_url?: string | null
  theme_color?: string | null
  show_xp?: boolean | null
  show_badges?: boolean | null
  show_attempts?: boolean | null
  show_rank?: boolean | null
  xp: number | null
  credits: number | null
  rank: string | null
  highest_rank?: string | null
  rank_updated_at?: string | null
  badges: string[] | null
  streak_days?: number | null
  placement_completed?: boolean | null
  is_public: boolean | null
  is_pro?: boolean | null
  created_at?: string | null
  updated_at?: string | null
}

/** البروفايل العام كما يُستهلك في الواجهة. */
export interface PublicProfile extends MizanProfile {
  xp: number
  credits: number
  rank: RankId
  highestRank: RankId
  badges: string[]
  streakDays: number
  isPro: boolean
  isPublic: boolean
  placementCompleted: boolean
}

/** بروفايل المستخدم الحالي + حالة المزامنة. */
export interface MyProfile extends PublicProfile {
  ownerId: string
  profileId: string
}

export interface SyncResult {
  synced: boolean
  /** الرتبة التي رجّعتها القاعدة (مشتقة من xp — مصدر الحقيقة). */
  rank?: RankId
  reason?: string
  /** اسم المستخدم محجوز من مستخدم آخر. */
  duplicate?: boolean
}

const PROFILE_COLUMNS = [
  "id",
  "owner_id",
  "username",
  "display_name",
  "role",
  "semester",
  "years_of_experience",
  "interests",
  "city",
  "bio",
  "occupation",
  "share_location",
  "bio_public",
  "avatar_url",
  "cover_url",
  "headline",
  "website_url",
  "linkedin_url",
  "theme_color",
  "show_xp",
  "show_badges",
  "show_attempts",
  "show_rank",
  "xp",
  "credits",
  "rank",
  "highest_rank",
  "rank_updated_at",
  "badges",
  "streak_days",
  "placement_completed",
  "is_public",
  "is_pro",
  "created_at",
  "updated_at",
].join(", ")

const DIRECTORY_KEY = "mizan:quiz:directory:v1"

/* ------------------------------------------------------------------ *
 * تحويل الصفوف
 * ------------------------------------------------------------------ */

function toRankId(value: unknown, fallback: RankId = "D"): RankId {
  const rank = typeof value === "string" ? (value.toUpperCase() as RankId) : fallback
  return getRankDefinition(rank).id
}

export function mapRowToProfile(row: ProfileRow): PublicProfile {
  const xp = Number.isFinite(row.xp as number) ? Math.max(0, Number(row.xp ?? 0)) : 0
  const rank = toRankId(row.rank, getRankForXp(xp).id)
  return {
    username: row.username,
    displayName: row.display_name,
    role: (row.role as UserRole) ?? "student",
    semester: (row.semester as Semester | null) ?? null,
    yearsOfExperience: row.years_of_experience ?? null,
    interests: row.interests ?? [],
    city: row.city ?? null,
    bio: row.bio ?? null,
    occupation: row.occupation ?? null,
    shareLocation: row.share_location ?? false,
    bioPublic: row.bio_public ?? true,
    isPublic: row.is_public ?? true,
    avatarUrl: row.avatar_url ?? null,
    coverUrl: row.cover_url ?? null,
    headline: row.headline ?? null,
    websiteUrl: row.website_url ?? null,
    linkedinUrl: row.linkedin_url ?? null,
    themeColor: row.theme_color ?? null,
    showXp: row.show_xp ?? true,
    showBadges: row.show_badges ?? true,
    showAttempts: row.show_attempts ?? false,
    showRank: row.show_rank ?? true,
    xp,
    credits: Number.isFinite(row.credits as number) ? Math.max(0, Number(row.credits ?? 0)) : 0,
    rank,
    highestRank: higherRank(toRankId(row.highest_rank, rank), rank),
    badges: row.badges ?? [],
    streakDays: row.streak_days ?? 0,
    placementCompleted: row.placement_completed ?? false,
    isPro: row.is_pro ?? false,
    updatedAt: row.updated_at ?? new Date().toISOString(),
  }
}

async function getClient() {
  const { supabase } = await import("@/lib/supabase/client")
  return supabase
}

/* ------------------------------------------------------------------ *
 * بروفايل المستخدم الحالي (Supabase Auth)
 * ------------------------------------------------------------------ */

/** يجلب بروفايل الحساب الحالي من القاعدة — null إن لم يكن قد أُنشئ بعد. */
export async function fetchMyProfile(ownerId: string): Promise<MyProfile | null> {
  if (!ownerId) return null
  try {
    const supabase = await getClient()
    const { data, error } = await supabase
      .from("mizan_profiles")
      .select(PROFILE_COLUMNS)
      .eq("owner_id", ownerId)
      .maybeSingle()

    if (error || !data) return null
    const row = data as unknown as ProfileRow
    return { ...mapRowToProfile(row), ownerId: row.owner_id ?? ownerId, profileId: row.id }
  } catch {
    return null
  }
}

/**
 * ينشئ بروفايل الحساب إن لم يكن موجوداً (بعد تسجيل الدخول مباشرة).
 * المشغّل `handle_new_user` ينشئه تلقائياً عند التسجيل، لكن الحسابات القديمة
 * (أو التي أُنشئت قبل ترحيل 20260924000000) تحتاج إنشاءً صريحاً من العميل.
 */
export async function ensureMyProfile(
  ownerId: string,
  seed: { displayName?: string | null; username?: string | null; avatarUrl?: string | null }
): Promise<MyProfile | null> {
  const existing = await fetchMyProfile(ownerId)
  if (existing) return existing

  const username = generateUsernameSuggestions(seed.username ?? seed.displayName ?? "mizan", 1)[0]
  const displayName = (seed.displayName ?? "مستخدم ميزان").slice(0, 80)

  try {
    const supabase = await getClient()
    const { data, error } = await supabase
      .from("mizan_profiles")
      .insert({
        owner_id: ownerId,
        username,
        display_name: displayName,
        role: "student",
        xp: 0,
        credits: 0,
        // الرتبة تُشتق من xp في القاعدة — نمرر D كقيمة ابتدائية صالحة فقط
        rank: "D",
        badges: [],
        streak_days: 0,
        placement_completed: false,
        is_public: true,
        avatar_url: seed.avatarUrl ?? null,
      })
      .select(PROFILE_COLUMNS)
      .single()

    if (error || !data) return null
    const row = data as unknown as ProfileRow
    return { ...mapRowToProfile(row), ownerId, profileId: row.id }
  } catch {
    return null
  }
}

/**
 * يحفظ البروفايل المخصص + التقدّم في السحابة.
 *
 * ملاحظة مهمة: `rank` لا يُرسل كقيمة يقررها العميل — القاعدة تعيد حسابها من
 * xp عبر المشغّل apply_profile_rank، ونحن نعرض ما رجّعته.
 */
export async function saveMyProfile(
  ownerId: string,
  profile: MizanProfile,
  progression: Pick<QuizProgress, "xp" | "credits" | "badges" | "streakDays" | "placementCompleted">,
  options: { isPublic?: boolean } = {}
): Promise<SyncResult> {
  if (!ownerId) {
    return { synced: false, reason: "لا توجد جلسة مسجلة — البروفايل محفوظ على هذا الجهاز." }
  }

  const payload = {
    owner_id: ownerId,
    username: profile.username.toLowerCase(),
    display_name: profile.displayName,
    role: profile.role,
    semester: profile.semester ?? null,
    years_of_experience: profile.yearsOfExperience ?? null,
    interests: profile.interests ?? [],
    city: profile.city ?? null,
    bio: profile.bio ?? null,
    occupation: profile.occupation ?? null,
    share_location: profile.shareLocation ?? false,
    bio_public: profile.bioPublic ?? true,
    avatar_url: profile.avatarUrl ?? null,
    cover_url: profile.coverUrl ?? null,
    headline: profile.headline ?? null,
    website_url: profile.websiteUrl ?? null,
    linkedin_url: profile.linkedinUrl ?? null,
    theme_color: profile.themeColor ?? null,
    show_xp: profile.showXp ?? true,
    show_badges: profile.showBadges ?? true,
    show_attempts: profile.showAttempts ?? false,
    show_rank: profile.showRank ?? true,
    xp: Math.max(0, Math.round(progression.xp ?? 0)),
    credits: Math.max(0, Math.round(progression.credits ?? 0)),
    rank: getRankForXp(progression.xp ?? 0).id,
    badges: progression.badges ?? [],
    streak_days: Math.max(0, Math.round(progression.streakDays ?? 0)),
    placement_completed: progression.placementCompleted ?? false,
    is_public: options.isPublic ?? profile.isPublic ?? true,
  }

  try {
    const supabase = await getClient()
    const { data, error } = await supabase
      .from("mizan_profiles")
      .upsert(payload, { onConflict: "owner_id" })
      .select("rank, highest_rank")
      .maybeSingle()

    if (error) return describeWriteError(error, profile.username)

    const row = data as unknown as Pick<ProfileRow, "rank" | "highest_rank"> | null
    return { synced: true, rank: toRankId(row?.rank ?? payload.rank) }
  } catch (error) {
    return describeWriteError(error, profile.username)
  }
}

/**
 * مزامنة التقدّم وحده (XP/الكريدتس/الأوسمة) بلا لمس حقول البروفايل.
 * تُنادى بعد كل اختبار مكتمل حتى تُطبَّق الرتبة الجديدة على البروفايل فوراً.
 */
export async function syncProgression(
  ownerId: string,
  progression: Pick<QuizProgress, "xp" | "credits" | "badges" | "streakDays" | "placementCompleted">
): Promise<SyncResult> {
  if (!ownerId) return { synced: false, reason: "بلا جلسة" }

  const xp = Math.max(0, Math.round(progression.xp ?? 0))
  try {
    const supabase = await getClient()

    // نقرأ الصف الحالي أولاً: التحديث الجزئي لا يجوز أن يُنشئ صفاً بلا username
    const { data: current } = await supabase
      .from("mizan_profiles")
      .select("id, xp, rank")
      .eq("owner_id", ownerId)
      .maybeSingle()

    if (!current) return { synced: false, reason: "لا يوجد بروفايل مرتبط بهذا الحساب بعد." }

    // لا نُرجع الرتبة إلى الوراء محلياً: القاعدة هي الحكم، لكن نتفادى إرسال
    // xp أقل مما هو مسجّل (يحدث عند تصفير الجهاز) إلا بطلب صريح من المستخدم.
    const nextXp = Math.max(xp, Number((current as { xp?: number }).xp ?? 0))

    const { data, error } = await supabase
      .from("mizan_profiles")
      .update({
        xp: nextXp,
        credits: Math.max(0, Math.round(progression.credits ?? 0)),
        badges: progression.badges ?? [],
        streak_days: Math.max(0, Math.round(progression.streakDays ?? 0)),
        placement_completed: progression.placementCompleted ?? false,
      })
      .eq("id", (current as { id: string }).id)
      .select("rank, highest_rank")
      .maybeSingle()

    if (error) return describeWriteError(error, "بروفايلك")

    const row = data as unknown as Pick<ProfileRow, "rank"> | null
    return { synced: true, rank: toRankId(row?.rank ?? getRankForXp(nextXp).id) }
  } catch (error) {
    return describeWriteError(error, "بروفايلك")
  }
}

/** تصفير التقدّم السحابي مع التقدّم المحلي (بطلب صريح من المستخدم). */
export async function resetCloudProgression(ownerId: string): Promise<SyncResult> {
  if (!ownerId) return { synced: false, reason: "بلا جلسة" }
  try {
    const supabase = await getClient()
    const { error } = await supabase
      .from("mizan_profiles")
      .update({ xp: 0, credits: 0, badges: [], streak_days: 0, placement_completed: false })
      .eq("owner_id", ownerId)
    if (error) return describeWriteError(error, "بروفايلك")
    return { synced: true, rank: "D" }
  } catch (error) {
    return describeWriteError(error, "بروفايلك")
  }
}

function describeWriteError(error: unknown, username: string): SyncResult {
  const message = error instanceof Error ? error.message : String((error as { message?: string })?.message ?? error)
  const code = String((error as { code?: string })?.code ?? "")
  const isDuplicate =
    code === "23505" ||
    message.toLowerCase().includes("duplicate") ||
    message.toLowerCase().includes("mizan_profiles_username_lower_idx")
  const isUsernameLocked = message.toLowerCase().includes("username cannot be changed")

  if (isDuplicate) {
    return {
      synced: false,
      duplicate: true,
      reason: `اسم المستخدم "${username}" محجوز من قبل — جرّب اسماً آخر: ${generateUsernameSuggestions(username, 3).join("، ")}`,
    }
  }
  if (isUsernameLocked) {
    return {
      synced: false,
      reason: "لا يمكن تغيير اسم المستخدم بعد إنشاء البروفايل (رابطك العام ثابت). باقي التعديلات محفوظة.",
    }
  }
  return { synced: false, reason: `تعذّرت المزامنة السحابية: ${message}` }
}

/* ------------------------------------------------------------------ *
 * البروفايل العام (mizan.page/u/:username)
 * ------------------------------------------------------------------ */

export async function fetchPublicProfile(username: string): Promise<PublicProfile | null> {
  const normalized = username.trim().toLowerCase()
  if (!normalized) return null

  try {
    const supabase = await getClient()
    // ilike بلا % = مطابقة دقيقة غير حساسة لحالة الأحرف (الفهرس الفريد lower(username))
    const { data, error } = await supabase
      .from("mizan_profiles")
      .select(PROFILE_COLUMNS)
      .ilike("username", normalized)
      .eq("is_public", true)
      .maybeSingle()

    if (!error && data) {
      const profile = mapRowToProfile(data as unknown as ProfileRow)
      // احترام مفاتيح الإظهار: ما أخفاه صاحبه لا يُرسل إلى الواجهة أصلاً
      if (!profile.showXp) profile.xp = 0
      if (!profile.showBadges) profile.badges = []
      if (!profile.shareLocation) profile.city = null
      if (!profile.bioPublic) profile.bio = null
      return profile
    }
  } catch {
    /* نكمل بالبحث المحلي */
  }

  return getLocalProfile(normalized)
}

/** لوحة الرتب — أعلى البروفايلات العامة حسب الخبرة. */
export interface RankBoardEntry {
  username: string
  displayName: string
  avatarUrl: string | null
  role: string
  rank: RankId
  rankLabel: string
  level: number
  xp: number
  badges: string[]
}

export async function fetchRankBoard(limit = 20): Promise<RankBoardEntry[]> {
  try {
    const supabase = await getClient()
    const { data, error } = await supabase.rpc("profile_rank_board", { p_limit: limit })
    if (error || !Array.isArray(data)) return []
    return (data as Array<Record<string, unknown>>).map((row) => ({
      username: String(row.username ?? ""),
      displayName: String(row.display_name ?? ""),
      avatarUrl: (row.avatar_url as string | null) ?? null,
      role: String(row.role ?? "student"),
      rank: toRankId(row.rank),
      rankLabel: String(row.rank_label ?? getRankDefinition(toRankId(row.rank)).label),
      level: Number(row.level ?? getRankDefinition(toRankId(row.rank)).level),
      xp: Number(row.xp ?? 0),
      badges: Array.isArray(row.badges) ? (row.badges as string[]) : [],
    }))
  } catch {
    return []
  }
}

/* ------------------------------------------------------------------ *
 * الدليل المحلي (يعمل بلا جلسة وبلا شبكة)
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
    /* تجاهل: امتلاء المساحة لا يجب أن يوقف التجربة */
  }
}

/** ينشر البروفايل المحلي (والتقدّم المرتبط به) في الدليل المحلي. */
export function publishLocalProfile(profile: MizanProfile, progress: QuizProgress, rank: string): PublicProfile {
  const entry: PublicProfile = {
    ...profile,
    xp: progress.xp,
    credits: progress.credits,
    rank: toRankId(rank),
    highestRank: toRankId(rank),
    badges: progress.badges,
    streakDays: progress.streakDays,
    placementCompleted: progress.placementCompleted,
    isPro: false,
    isPublic: profile.isPublic ?? true,
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
 * أسماء المستخدمين: اقتراح + فحص التوفر
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
  for (const candidate of candidates) {
    if (candidate.length >= 3 && candidate.length <= 30 && /^[a-z0-9_]+$/.test(candidate) && !suggestions.includes(candidate)) {
      suggestions.push(candidate)
    }
    if (suggestions.length >= max) break
  }
  return suggestions
}

export interface AvailabilityResult {
  available: boolean
  normalized: string
  reason?: "invalid_format" | "taken_local" | "taken_cloud" | "taken_by_me" | "error"
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

  // نفس اسم المستخدم الحالي → متاح (يعدّل بروفايله)
  if (currentUsername && currentUsername.toLowerCase() === normalized) {
    return { available: true, normalized }
  }

  // فحص محلي (نفس الجهاز)
  const local = getLocalProfile(normalized)
  if (local && (!currentUsername || local.username.toLowerCase() !== currentUsername.toLowerCase())) {
    return {
      available: false,
      normalized,
      reason: "taken_local",
      existsIn: "local",
      suggestions: generateUsernameSuggestions(normalized),
    }
  }

  // فحص سحابي (Supabase) — مصدر الحقيقة الوحيد لمنع التكرار عبر الأجهزة
  try {
    const supabase = await getClient()
    const { data, error } = await supabase
      .from("mizan_profiles")
      .select("username, owner_id")
      .ilike("username", normalized)
      .maybeSingle()

    if (error) {
      // خطأ شبكة/صلاحيات: لا نحجب المستخدم، لكن نعلّم النتيجة كخطأ
      console.warn("checkUsernameAvailability supabase error:", error.message)
      return { available: true, normalized, reason: "error" }
    }

    if (data) {
      const row = data as unknown as { username: string; owner_id: string | null }
      const { data: authData } = await supabase.auth.getUser()
      if (authData?.user && row.owner_id === authData.user.id) {
        return { available: true, normalized, reason: "taken_by_me" }
      }
      return {
        available: false,
        normalized,
        reason: "taken_cloud",
        existsIn: "cloud",
        suggestions: generateUsernameSuggestions(normalized),
      }
    }

    return { available: true, normalized }
  } catch (error) {
    console.warn("checkUsernameAvailability exception:", error)
    return { available: true, normalized, reason: "error" }
  }
}

/** واجهة قديمة للتوافق — تعيد boolean فقط. */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const result = await checkUsernameAvailability(username)
  return result.available
}

/**
 * مزامنة كاملة (بروفايل + تقدّم) مع حفظ نسخة محلية أولاً.
 * الاسم محفوظ للتوافق مع الاستعمالات السابقة في lib/quiz/profileService.
 */
export async function syncProfileToCloud(
  profile: MizanProfile,
  progress: QuizProgress,
  rank: string
): Promise<SyncResult> {
  publishLocalProfile(profile, progress, rank)

  try {
    const supabase = await getClient()
    const { data } = await supabase.auth.getUser()
    const ownerId = data?.user?.id
    if (!ownerId) {
      return { synced: false, reason: "لا توجد جلسة مسجلة — البروفايل محفوظ على هذا الجهاز." }
    }
    return await saveMyProfile(ownerId, profile, progress, { isPublic: profile.isPublic ?? true })
  } catch (error) {
    return describeWriteError(error, profile.username)
  }
}
