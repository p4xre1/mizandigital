import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { DeleteAccountSection } from "@/components/profile/DeleteAccountSection"
import {
  AlertCircle,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Cloud,
  CloudOff,
  Copy,
  ExternalLink,
  Flame,
  GraduationCap,
  Image as ImageIcon,
  Link2,
  Loader2,
  LogOut,
  Palette,
  RefreshCw,
  Share2,
  ShieldCheck,
  Target,
  Trash2,
  Trophy,
  UserRound,
  Users,
} from "lucide-react"
import { AEOHead } from "../../components/seo/AEOHead"
import { canonicalFor } from "@/lib/canonical"
import { generateBreadcrumbSchema } from "../../lib/seo/schema"
import { RankBadge } from "../../components/quiz/RankBadge"
import { XpBar } from "../../components/quiz/XpBar"
import { useQuizProgress } from "../../hooks/useQuizProgress"
import { BADGE_BY_ID, RANKS, getRankDefinition, getRankProgress } from "../../lib/quiz/ranks"
import { formatDuration } from "../../lib/quiz/engine"
import {
  checkUsernameAvailability,
  fetchRankBoard,
  generateUsernameSuggestions,
  publishLocalProfile,
  resetCloudProgression,
  type AvailabilityResult,
  type RankBoardEntry,
} from "../../lib/profiles/service"
import { useAuth } from "../../lib/auth/AuthProvider"
import type { MizanProfile, Semester, UserRole } from "../../types/quiz"
import { ConfirmDeleteModal } from "../../components/ui/ConfirmDeleteModal"
import {
  INPUT_LIMITS,
  validateUsername,
  validateDisplayName,
  validateCity,
  validateBio,
  checkRateLimit,
  RATE_LIMITS,
  getInputErrorMessage,
} from "../../lib/security/inputGuard"

const SEMESTERS: Semester[] = ["S1", "S2", "S3", "S4", "S5", "S6"]

const INTERESTS = [
  "القانون المدني",
  "القانون الجنائي",
  "قانون الأسرة",
  "قانون الشغل",
  "القانون الإداري",
  "قانون الأعمال",
  "المباريات والوظائف",
  "حقوق الإنسان",
]

const ROLES: Array<{ id: UserRole; label: string; icon: typeof GraduationCap; hint: string }> = [
  { id: "student", label: "طالب", icon: GraduationCap, hint: "تحدد فصلك الدراسي (S1 → S6)" },
  { id: "lawyer", label: "محامٍ", icon: BriefcaseBusiness, hint: "تحدد سنوات خبرتك وتخصصك" },
  { id: "citizen", label: "مواطن", icon: Users, hint: "تختار اهتماماتك القانونية" },
]

const THEME_COLORS = ["#2563eb", "#0f766e", "#7c3aed", "#c2410c", "#be123c", "#0f172a"]

/** تقبّل رابط http(s) صالح فقط، وترفض أي شيء آخر (بلا javascript: ولا وسوم). */
function normalizeUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length > 2048) return null
  if (!/^https?:\/\/[^\s"'<>]+$/i.test(trimmed)) return null
  return trimmed
}

function normalizeColor(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : null
}

/**
 * صفحة «ملفي» — البروفايل المخصص + كل الرتب مطبّقة عليه.
 * -----------------------------------------------------------------------
 * الهوية هنا Supabase Auth (أُزيل Clerk):
 *   • بلا جلسة → دعوة لتسجيل الدخول/إنشاء حساب، مع عرض سلم الرتب كاملاً.
 *   • بجلسة    → البروفايل السحابي (mizan_profiles) هو مصدر الحقيقة، والتقدّم
 *                المحلي يُدمج معه، والرتبة تُشتق من xp داخل القاعدة
 *                (المشغّل apply_profile_rank) لا من المتصفح.
 */
export function MyProfilePage() {
  const navigate = useNavigate()
  const { user, profile: cloudProfile, isAdmin, initialized, saveProfile, refreshProfile, signOut } = useAuth()
  const { progress, profile: localProfile, rank, rankProgress, stats, badges, streakDays, updateProfile, reset } =
    useQuizProgress()

  // البروفايل المعروض: السحابي أولاً (مصدر الحقيقة)، والمحلي للزائر
  const profile = cloudProfile ?? localProfile

  const [editing, setEditing] = useState<boolean>(false)
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [role, setRole] = useState<UserRole>("student")
  const [semester, setSemester] = useState<Semester>("S1")
  const [years, setYears] = useState<number>(1)
  const [interests, setInterests] = useState<string[]>([])
  const [city, setCity] = useState("")
  const [bio, setBio] = useState("")
  const [occupation, setOccupation] = useState("")
  const [headline, setHeadline] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [coverUrl, setCoverUrl] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [linkedinUrl, setLinkedinUrl] = useState("")
  const [themeColor, setThemeColor] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [shareLocation, setShareLocation] = useState(false)
  const [bioPublic, setBioPublic] = useState(true)
  const [showXp, setShowXp] = useState(true)
  const [showBadges, setShowBadges] = useState(true)
  const [showAttempts, setShowAttempts] = useState(false)
  const [showRank, setShowRank] = useState(true)

  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [syncState, setSyncState] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [board, setBoard] = useState<RankBoardEntry[]>([])

  const [availability, setAvailability] = useState<AvailabilityResult | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const debounceRef = useRef<number | null>(null)

  // تهيئة الحقول من البروفايل المتوفر
  useEffect(() => {
    if (!profile) return
    setUsername(profile.username ?? "")
    setDisplayName(profile.displayName ?? "")
    setRole((profile.role as UserRole) ?? "student")
    setSemester((profile.semester as Semester) ?? "S1")
    setYears(profile.yearsOfExperience ?? 1)
    setInterests(profile.interests ?? [])
    setCity(profile.city ?? "")
    setBio(profile.bio ?? "")
    setOccupation(profile.occupation ?? "")
    setHeadline(profile.headline ?? "")
    setAvatarUrl(profile.avatarUrl ?? "")
    setCoverUrl(profile.coverUrl ?? "")
    setWebsiteUrl(profile.websiteUrl ?? "")
    setLinkedinUrl(profile.linkedinUrl ?? "")
    setThemeColor(profile.themeColor ?? "")
    setIsPublic(profile.isPublic ?? true)
    setShareLocation(profile.shareLocation ?? false)
    setBioPublic(profile.bioPublic ?? true)
    setShowXp(profile.showXp ?? true)
    setShowBadges(profile.showBadges ?? true)
    setShowAttempts(profile.showAttempts ?? false)
    setShowRank(profile.showRank ?? true)
    // أول دخول بلا بروفايل محلي → نفتح المحرر مباشرة
    setEditing((current) => current || !localProfile)
  }, [profile, localProfile])

  // لوحة الرتب (أعلى البروفايلات العامة)
  useEffect(() => {
    let mounted = true
    fetchRankBoard(12).then((rows) => {
      if (mounted) setBoard(rows)
    })
    return () => {
      mounted = false
    }
  }, [])

  const publicUrl = useMemo(() => (profile?.username ? `mizan.page/u/${profile.username}` : null), [profile])

  // الرتبة المعروضة: السحابة أولاً لأنها مشتقة من xp في القاعدة
  const activeRank = useMemo(() => getRankDefinition(cloudProfile?.rank ?? rank.id), [cloudProfile, rank])
  const activeRankProgress = useMemo(
    () => getRankProgress(cloudProfile?.xp ?? progress.xp),
    [cloudProfile, progress.xp]
  )
  const capabilities = activeRank.capabilities

  const toggleInterest = (interest: string) => {
    setInterests((current) =>
      current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest]
    )
  }

  // فحص توفر اسم المستخدم (debounce) — فقط أثناء التحرير
  useEffect(() => {
    if (!editing) return
    const raw = username.trim()
    if (!raw) {
      setAvailability(null)
      setSuggestions([])
      return
    }
    if (raw.length < 3) {
      setAvailability({ available: false, normalized: raw, reason: "invalid_format" })
      return
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(async () => {
      setChecking(true)
      const result = await checkUsernameAvailability(raw, profile?.username ?? null)
      setAvailability(result)
      setSuggestions(result.available ? [] : result.suggestions ?? [])
      setChecking(false)
    }, 600) as unknown as number

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [username, editing, profile?.username])

  const handleSave = async () => {
    setError(null)

    if (!user) {
      setError("سجّل الدخول أولاً — البروفايل مرتبط بحسابك في Supabase.")
      navigate("/login?next=/profile")
      return
    }

    // تحديد المعدل: 5 عمليات حفظ في الدقيقة
    const rateLimit = checkRateLimit(RATE_LIMITS.PROFILE_SAVE.key, RATE_LIMITS.PROFILE_SAVE.max, RATE_LIMITS.PROFILE_SAVE.windowMs)
    if (!rateLimit.allowed) {
      setError(`لقد حاولت الحفظ كثيراً. انتظر ${Math.ceil((rateLimit.retryAfterMs || 0) / 1000)} ثانية.`)
      return
    }

    const usernameCheck = validateUsername(username)
    if (!usernameCheck.ok) {
      setError(getInputErrorMessage(usernameCheck.error))
      return
    }
    const displayNameCheck = validateDisplayName(displayName)
    if (!displayNameCheck.ok) {
      setError(getInputErrorMessage(displayNameCheck.error))
      return
    }
    const cityCheck = validateCity(city)
    if (!cityCheck.ok) {
      setError(getInputErrorMessage(cityCheck.error))
      return
    }
    const bioCheck = validateBio(bio)
    if (!bioCheck.ok) {
      setError(getInputErrorMessage(bioCheck.error))
      return
    }

    const avatar = normalizeUrl(avatarUrl)
    if (avatarUrl.trim() && !avatar) {
      setError("رابط صورة البروفايل يجب أن يبدأ بـ https://")
      return
    }
    const cover = normalizeUrl(coverUrl)
    if (coverUrl.trim() && !cover) {
      setError("رابط صورة الغلاف يجب أن يبدأ بـ https://")
      return
    }
    const website = normalizeUrl(websiteUrl)
    if (websiteUrl.trim() && !website) {
      setError("رابط الموقع يجب أن يبدأ بـ https://")
      return
    }
    const linkedin = normalizeUrl(linkedinUrl)
    if (linkedinUrl.trim() && !linkedin) {
      setError("رابط لينكد إن يجب أن يبدأ بـ https://")
      return
    }
    if (headline.trim().length > 120) {
      setError("السطر التعريفي يجب ألا يتجاوز 120 حرفاً.")
      return
    }
    if (occupation.trim().length > 120) {
      setError("المهنة يجب ألا تتجاوز 120 حرفاً.")
      return
    }

    setChecking(true)
    const finalCheck = await checkUsernameAvailability(usernameCheck.value, profile?.username ?? null)
    setChecking(false)
    setAvailability(finalCheck)

    if (!finalCheck.available) {
      if (finalCheck.reason === "invalid_format") {
        setError("اسم المستخدم يجب أن يكون 3-30 حرفاً، أحرف لاتينية وأرقام و _ فقط.")
      } else {
        const hint = finalCheck.suggestions?.length ? ` — جرّب: ${finalCheck.suggestions.slice(0, 3).join("، ")}` : ""
        setError(`اسم المستخدم "${finalCheck.normalized}" محجوز من قبل — هذا الرابط مأخوذ${hint}`)
        setSuggestions(finalCheck.suggestions ?? generateUsernameSuggestions(finalCheck.normalized))
      }
      return
    }

    const next: MizanProfile = {
      username: finalCheck.normalized,
      displayName: displayNameCheck.value,
      role,
      semester: role === "student" ? semester : null,
      yearsOfExperience:
        role === "lawyer" ? Math.max(INPUT_LIMITS.YEARS_MIN, Math.min(INPUT_LIMITS.YEARS_MAX, Number(years) || 0)) : null,
      interests: role === "citizen" ? interests.slice(0, 5) : [],
      city: cityCheck.value || null,
      bio: bioCheck.value || null,
      occupation: occupation.trim() || null,
      headline: headline.trim() || null,
      avatarUrl: avatar,
      coverUrl: cover,
      websiteUrl: website,
      linkedinUrl: linkedin,
      themeColor: normalizeColor(themeColor),
      isPublic,
      shareLocation,
      bioPublic,
      showXp,
      showBadges,
      showAttempts,
      showRank,
      updatedAt: new Date().toISOString(),
    }

    // نسخة محلية أولاً (تعمل بلا شبكة)، ثم السحابة
    updateProfile(next)
    publishLocalProfile(next, progress, activeRank.id)

    setSaving(true)
    const result = await saveProfile(next, {
      xp: progress.xp,
      credits: progress.credits,
      badges: progress.badges,
      streakDays: progress.streakDays,
      placementCompleted: progress.placementCompleted,
    })
    setSaving(false)

    if (result.duplicate) {
      setError(result.reason ?? "اسم المستخدم محجوز")
      setSuggestions(generateUsernameSuggestions(next.username))
      return
    }

    if (result.synced) {
      setEditing(false)
      const appliedRank = result.rank ? getRankDefinition(result.rank) : activeRank
      setSyncState(
        `تم حفظ البروفايل ومزامنته. الرتبة المطبّقة من الخادم: ${appliedRank.id} — ${appliedRank.label}.`
      )
      await refreshProfile()
    } else {
      setEditing(false)
      setSyncState(result.reason ?? "البروفايل محفوظ على هذا الجهاز.")
    }
  }

  const handleReset = async () => {
    reset()
    if (user) {
      const result = await resetCloudProgression(user.id)
      setSyncState(
        result.synced
          ? "تم تصفير التقدّم على الجهاز وفي البروفايل السحابي (الرتبة عادت إلى D)."
          : `صُفّر التقدّم محلياً فقط: ${result.reason ?? ""}`
      )
      await refreshProfile()
    } else {
      setSyncState("تم تصفير التقدّم على هذا الجهاز.")
    }
    setConfirmReset(false)
    setEditing(true)
  }

  const copyLink = async () => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(`https://${publicUrl}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      setSyncState("تعذّر نسخ الرابط — انسخه يدوياً من الأعلى.")
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate("/")
  }

  /* ------------------------------------------------------------------ *
   * زائر: دعوة لتسجيل الدخول + سلم الرتب
   * ------------------------------------------------------------------ */
  if (initialized && !user) {
    return (
      <main className="container-wide py-10" dir="rtl">
        <AEOHead
          title="ملفي — سجّل الدخول لإنشاء بروفايلك"
          description="أنشئ حساباً على ميزان الرقمية لتحصل على بروفايل عام مخصص ورتبة من D إلى SSS تُطبّق تلقائياً على نقاط خبرتك."
          directAnswer="بروفايل ميزان يتطلب حساباً: سجّل الدخول أو أنشئ حساباً جديداً عبر Supabase Auth."
          canonicalUrl={canonicalFor("/profile")}
          noindex
        />
        <div className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-8 text-center">
          <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <UserRound className="size-6" strokeWidth={2.2} />
          </span>
          <h1 className="text-xl font-black text-foreground">بروفايلك يحتاج حساباً</h1>
          <p className="mt-2 text-[13px] leading-7 text-muted-foreground">
            البروفايل العام ورتبتك ونقاط خبرتك مرتبطة بحسابك. أنشئ حساباً مجاناً بالبريد الإلكتروني أو عبر Google،
            وسيُنشأ بروفايلك ورتبتك <strong className="text-foreground">D (مبتدئ)</strong> تلقائياً.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link
              to="/login?next=/profile"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[13px] font-extrabold text-primary-foreground transition hover:opacity-90"
            >
              <ShieldCheck className="size-4" />
              تسجيل الدخول
            </Link>
            <Link
              to="/login?mode=signup&next=/profile"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-[13px] font-extrabold text-foreground transition hover:border-primary/50"
            >
              إنشاء حساب جديد
            </Link>
          </div>
          {progress.xp > 0 && (
            <p className="mt-5 rounded-2xl border border-dashed border-border bg-background p-4 text-[12px] leading-6 text-muted-foreground">
              لديك <strong className="text-foreground">{progress.xp.toLocaleString("ar-MA")} XP</strong> محفوظة على هذا
              الجهاز. عند تسجيل الدخول تُدمج مع بروفايلك وتُطبّق عليها الرتبة{" "}
              <strong className="text-foreground">{rank.id} — {rank.label}</strong> تلقائياً.
            </p>
          )}
        </div>

        <RankLadder xp={progress.xp} />
      </main>
    )
  }

  /* ------------------------------------------------------------------ *
   * مستخدم مسجّل
   * ------------------------------------------------------------------ */
  return (
    <main className="container-wide py-10" dir="rtl">
      <AEOHead
        title="ملفي الشخصي — رتبتي ونقاط خبرتي"
        description="بروفايلك العام على ميزان: صورة وغلاف وسطر تعريفي وروابط، مع رتبتك ونقاط خبرتك وأوسمتك وسجل اختباراتك القانونية."
        directAnswer="MyProfilePage في ميزان الرقمية منصة مغربية للمعرفة القانونية لطلبة الحقوق."
        canonicalUrl={canonicalFor("/profile")}
        noindex
        schema={[
          generateBreadcrumbSchema([
            { name: "الرئيسية", url: "/" },
            { name: "ملفي", url: "/profile" },
          ]),
        ]}
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">ملفي</h1>
          <p className="mt-1 text-[13.5px] leading-7 text-muted-foreground">
            بروفايلك المخصص ورتبتك ونقاط خبرتك وأوسمتك في مكان واحد، مع رابط عام تشاركه مع من تشاء.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold ${
              cloudProfile
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-border bg-background text-muted-foreground"
            }`}
            title={cloudProfile ? "بروفايلك موجود في قاعدة البيانات ومرتبطة بحسابك" : "لم يُحمَّل البروفايل السحابي بعد"}
          >
            {cloudProfile ? <Cloud className="size-3.5" /> : <CloudOff className="size-3.5" />}
            {cloudProfile ? "متزامن مع الحساب" : "بلا مزامنة"}
          </span>
          <button
            type="button"
            onClick={() => void refreshProfile()}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-bold text-muted-foreground transition hover:text-foreground"
          >
            <RefreshCw className="size-3.5" />
            تحديث
          </button>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-bold text-muted-foreground transition hover:border-destructive/40 hover:text-destructive"
          >
            <LogOut className="size-3.5" />
            خروج
          </button>
        </div>
      </div>

      {syncState && (
        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-border bg-card p-3 text-[12.5px] font-bold leading-6 text-muted-foreground">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          {syncState}
        </p>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        {/* ---------------- بطاقة البروفايل ---------------- */}
        <section className="overflow-hidden rounded-3xl border border-border bg-card">
          {(profile?.coverUrl || coverUrl) && (
            <div
              className="h-28 w-full bg-cover bg-center"
              style={{ backgroundImage: `url("${normalizeUrl(coverUrl) ?? profile?.coverUrl ?? ""}")` }}
              aria-hidden="true"
            />
          )}

          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className="size-14 rounded-2xl border border-border object-cover"
                    width={56}
                    height={56}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span
                    className="grid size-14 place-items-center rounded-2xl text-primary"
                    style={{ backgroundColor: `${profile?.themeColor ?? "hsl(var(--primary))"}1a` }}
                  >
                    <UserRound className="size-6" strokeWidth={2.2} />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-base font-extrabold text-foreground">
                    {profile?.displayName ?? "بروفايل غير منشأ بعد"}
                    {isAdmin && (
                      <span className="mr-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
                        إدارة
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[12px] font-semibold text-muted-foreground" dir="ltr">
                    {publicUrl ?? "أنشئ اسم مستخدم للحصول على رابطك"}
                  </p>
                  {profile?.headline && (
                    <p className="mt-1 truncate text-[11.5px] font-bold text-muted-foreground">{profile.headline}</p>
                  )}
                </div>
              </div>
              <RankBadge rank={activeRank} />
            </div>

            <div className="mt-5">
              <XpBar rankProgress={activeRankProgress} xp={cloudProfile?.xp ?? progress.xp} credits={cloudProfile?.credits ?? progress.credits} />
            </div>

            {/* صلاحيات الرتبة الحالية */}
            <div className="mt-4 rounded-2xl border border-border bg-background p-4">
              <p className="text-[12px] font-extrabold text-foreground">
                ما تفتحه رتبتك {activeRank.id} ({activeRank.label})
              </p>
              <ul className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
                {[
                  ["نشر المقالات", capabilities.canPublishArticle],
                  ["شهادة التوصية", capabilities.recommendationCert],
                  ["لوحة الاستشارات", capabilities.advisorPanel],
                  ["قاعة المشاهير", capabilities.hallOfFame],
                  ["اقتراح مصطلحات", capabilities.canSuggestContent],
                  ["مساعدة الزملاء", capabilities.canHelpPeers],
                ].map(([label, enabled]) => (
                  <li
                    key={String(label)}
                    className={`flex items-center gap-2 text-[11.5px] font-bold ${
                      enabled ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground line-through decoration-1"
                    }`}
                  >
                    {enabled ? <Check className="size-3.5 shrink-0" /> : <AlertCircle className="size-3.5 shrink-0" />}
                    {label}
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 text-[10.5px] font-bold text-muted-foreground" dir="ltr">
                {capabilities.maxDailyComments} تعليقات/يوم - {capabilities.maxDailyReports} بلاغات/يوم
              </p>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: Trophy, label: "اختبارات", value: stats.totalAttempts },
                { icon: Target, label: "دقة الإجابات", value: `%${stats.accuracy}` },
                { icon: Flame, label: "سلسلة الأيام", value: cloudProfile?.streakDays ?? streakDays },
                { icon: Target, label: "أفضل نتيجة", value: `%${stats.bestScore}` },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border bg-background p-3 text-center">
                  <item.icon className="mx-auto mb-1.5 size-4 text-primary" aria-hidden="true" />
                  <dd className="text-sm font-extrabold text-foreground" dir="ltr">
                    {item.value}
                  </dd>
                  <dt className="mt-0.5 text-[10.5px] font-bold text-muted-foreground">{item.label}</dt>
                </div>
              ))}
            </dl>

            {badges.length > 0 && showBadges && (
              <div className="mt-5 border-t border-border pt-4">
                <p className="mb-2 text-[12px] font-extrabold text-foreground">الأوسمة</p>
                <div className="flex flex-wrap gap-2">
                  {badges.map((badgeId) => {
                    const badge = BADGE_BY_ID.get(badgeId)
                    if (!badge) return null
                    return (
                      <span
                        key={badgeId}
                        title={badge.description}
                        className="rounded-full border border-border bg-background px-3 py-1.5 text-[12px] font-bold text-foreground"
                      >
                        {badge.icon} {badge.label}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {publicUrl && (
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-[12.5px] font-extrabold text-foreground transition hover:border-primary/50"
                >
                  {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                  {copied ? "نُسخ الرابط" : "نسخ الرابط العام"}
                </button>
                <Link
                  to={`/u/${profile?.username}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-[12.5px] font-extrabold text-foreground transition hover:border-primary/50"
                >
                  <ExternalLink className="size-4" />
                  فتح البروفايل العام
                </Link>
                {!editing && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-[12.5px] font-extrabold text-primary-foreground transition hover:opacity-90"
                  >
                    تخصيص البروفايل
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ---------------- المحرر / السجل ---------------- */}
        <section className="rounded-3xl border border-border bg-card p-6">
          {editing ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[15px] font-extrabold text-foreground">تخصيص البروفايل</h2>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false)
                    setError(null)
                  }}
                  className="text-[11.5px] font-bold text-muted-foreground transition hover:text-foreground"
                >
                  إلغاء
                </button>
              </div>

              {error && (
                <p className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-[12.5px] font-bold leading-6 text-rose-700 dark:text-rose-300">
                  {error}
                </p>
              )}

              <div className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[12.5px] font-extrabold text-foreground" htmlFor="displayName">
                      الاسم الظاهر
                    </label>
                    <input
                      id="displayName"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      maxLength={INPUT_LIMITS.DISPLAY_NAME_MAX}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13.5px] text-foreground outline-none transition focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12.5px] font-extrabold text-foreground" htmlFor="username">
                      اسم المستخدم (رابطك العام)
                    </label>
                    <div className="relative">
                      <input
                        id="username"
                        value={username}
                        onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/\s+/g, "_"))}
                        dir="ltr"
                        maxLength={INPUT_LIMITS.USERNAME_MAX}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-left text-[13.5px] text-foreground outline-none transition focus:border-primary"
                      />
                      {checking && <Loader2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
                    </div>
                    {availability && (
                      <p
                        className={`mt-1 text-[11px] font-bold ${
                          availability.available ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {availability.available
                          ? "✓ الاسم متاح"
                          : availability.reason === "invalid_format"
                            ? "3-30 حرفاً: a-z و0-9 و_ فقط"
                            : "✗ الاسم محجوز"}
                      </p>
                    )}
                    {suggestions.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => setUsername(suggestion)}
                            className="rounded-lg border border-border bg-background px-2 py-1 text-[10.5px] font-bold text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                            dir="ltr"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[12.5px] font-extrabold text-foreground" htmlFor="headline">
                    سطر تعريفي (اختياري)
                  </label>
                  <input
                    id="headline"
                    value={headline}
                    onChange={(event) => setHeadline(event.target.value)}
                    maxLength={120}
                    placeholder="طالب بالسنة الثالثة — مهتم بالقانون الجنائي"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13.5px] text-foreground outline-none transition focus:border-primary"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-extrabold text-foreground" htmlFor="avatarUrl">
                      <ImageIcon className="size-3.5" /> صورة البروفايل (رابط https)
                    </label>
                    <input
                      id="avatarUrl"
                      value={avatarUrl}
                      onChange={(event) => setAvatarUrl(event.target.value)}
                      placeholder="https://…"
                      dir="ltr"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-left text-[12.5px] text-foreground outline-none transition focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-extrabold text-foreground" htmlFor="coverUrl">
                      <ImageIcon className="size-3.5" /> صورة الغلاف (رابط https)
                    </label>
                    <input
                      id="coverUrl"
                      value={coverUrl}
                      onChange={(event) => setCoverUrl(event.target.value)}
                      placeholder="https://…"
                      dir="ltr"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-left text-[12.5px] text-foreground outline-none transition focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-extrabold text-foreground" htmlFor="occupation">
                    المهنة / التخصص
                  </label>
                  <input
                    id="occupation"
                    value={occupation}
                    onChange={(event) => setOccupation(event.target.value)}
                    maxLength={120}
                    placeholder="محامٍ متمرن بهيئة الرباط"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13.5px] text-foreground outline-none transition focus:border-primary"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-extrabold text-foreground" htmlFor="websiteUrl">
                      <Link2 className="size-3.5" /> موقع شخصي
                    </label>
                    <input
                      id="websiteUrl"
                      value={websiteUrl}
                      onChange={(event) => setWebsiteUrl(event.target.value)}
                      placeholder="https://…"
                      dir="ltr"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-left text-[12.5px] text-foreground outline-none transition focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-extrabold text-foreground" htmlFor="linkedinUrl">
                      <Link2 className="size-3.5" /> لينكد إن
                    </label>
                    <input
                      id="linkedinUrl"
                      value={linkedinUrl}
                      onChange={(event) => setLinkedinUrl(event.target.value)}
                      placeholder="https://linkedin.com/in/…"
                      dir="ltr"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-left text-[12.5px] text-foreground outline-none transition focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-extrabold text-foreground">
                    <Palette className="size-3.5" /> لون تمييز البروفايل
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {THEME_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setThemeColor(color)}
                        aria-label={`اختيار اللون ${color}`}
                        className={`size-8 rounded-xl border-2 transition ${
                          themeColor === color ? "border-foreground scale-110" : "border-border"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <input
                      type="color"
                      value={normalizeColor(themeColor) ?? "#2563eb"}
                      onChange={(event) => setThemeColor(event.target.value)}
                      className="size-8 cursor-pointer rounded-lg border border-border bg-background p-0.5"
                      aria-label="لون مخصص"
                    />
                    {themeColor && (
                      <button
                        type="button"
                        onClick={() => setThemeColor("")}
                        className="text-[11px] font-bold text-muted-foreground hover:text-foreground"
                      >
                        إزالة
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-[12.5px] font-extrabold text-foreground">الصفة</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {ROLES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setRole(item.id)}
                        className={`rounded-xl border p-3 text-right transition ${
                          role === item.id ? "border-primary bg-primary/[0.06]" : "border-border bg-background hover:border-primary/40"
                        }`}
                      >
                        <item.icon className="mb-1.5 size-4 text-primary" aria-hidden="true" />
                        <span className="block text-[12.5px] font-extrabold text-foreground">{item.label}</span>
                        <span className="mt-0.5 block text-[10.5px] leading-5 text-muted-foreground">{item.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {role === "student" && (
                  <div>
                    <p className="mb-1.5 text-[12.5px] font-extrabold text-foreground">الفصل الدراسي</p>
                    <div className="flex flex-wrap gap-2">
                      {SEMESTERS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setSemester(item)}
                          className={`rounded-xl border px-3.5 py-1.5 text-[12px] font-extrabold transition ${
                            semester === item
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {role === "lawyer" && (
                  <div>
                    <label className="mb-1.5 block text-[12.5px] font-extrabold text-foreground" htmlFor="years">
                      سنوات الخبرة — {INPUT_LIMITS.YEARS_MIN}-{INPUT_LIMITS.YEARS_MAX}
                    </label>
                    <input
                      id="years"
                      type="number"
                      min={INPUT_LIMITS.YEARS_MIN}
                      max={INPUT_LIMITS.YEARS_MAX}
                      value={years}
                      onChange={(event) => setYears(Number(event.target.value))}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13.5px] text-foreground outline-none transition focus:border-primary"
                    />
                  </div>
                )}

                {role === "citizen" && (
                  <div>
                    <p className="mb-1.5 text-[12.5px] font-extrabold text-foreground">الاهتمامات القانونية — حد أقصى 5</p>
                    <div className="flex flex-wrap gap-2">
                      {INTERESTS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleInterest(item)}
                          className={`rounded-xl border px-3 py-1.5 text-[12px] font-extrabold transition ${
                            interests.includes(item)
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[12.5px] font-extrabold text-foreground" htmlFor="city">
                      المدينة (اختياري)
                    </label>
                    <input
                      id="city"
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      placeholder="طنجة"
                      maxLength={INPUT_LIMITS.CITY_MAX}
                      autoComplete="address-level2"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13.5px] text-foreground outline-none transition focus:border-primary"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {city.length}/{INPUT_LIMITS.CITY_MAX}
                    </p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12.5px] font-extrabold text-foreground" htmlFor="bio">
                      نبذة قصيرة (اختياري)
                    </label>
                    <textarea
                      id="bio"
                      rows={2}
                      maxLength={INPUT_LIMITS.BIO_MAX}
                      value={bio}
                      onChange={(event) => setBio(event.target.value)}
                      placeholder="طالب بكلية الحقوق، مهتم بالمسطرة الجنائية."
                      className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-[13.5px] leading-6 text-foreground outline-none transition focus:border-primary"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {bio.length}/{INPUT_LIMITS.BIO_MAX} — بلا روابط، بلا وسوم HTML
                    </p>
                  </div>
                </div>

                {/* مفاتيح الخصوصية والإظهار */}
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-[12.5px] font-extrabold text-foreground">ما الذي يظهر في بروفايلك العام؟</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Toggle label="البروفايل عام (mizan.page/u/…)" checked={isPublic} onChange={setIsPublic} />
                    <Toggle label="الرتبة والشارة" checked={showRank} onChange={setShowRank} />
                    <Toggle label="نقاط الخبرة XP" checked={showXp} onChange={setShowXp} />
                    <Toggle label="الأوسمة" checked={showBadges} onChange={setShowBadges} />
                    <Toggle label="المدينة" checked={shareLocation} onChange={setShareLocation} />
                    <Toggle label="النبذة" checked={bioPublic} onChange={setBioPublic} />
                    <Toggle label="سجل الاختبارات" checked={showAttempts} onChange={setShowAttempts} />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={checking || saving}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-[14px] font-extrabold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {saving || checking ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {checking ? "جارٍ التحقق من الاسم..." : saving ? "جارٍ الحفظ والمزامنة..." : "حفظ ونشر البروفايل"}
              </button>
              <p className="mt-2 text-center text-[10px] leading-5 text-muted-foreground">
                حماية من السبام: 5 محاولات حفظ في الدقيقة - تنقية ضد XSS - فحص فوري لتكرار الاسم - الرتبة تُحسب في
                الخادم من نقاط خبرتك ولا يمكن تعديلها يدوياً
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[15px] font-extrabold text-foreground">سجل الاختبارات</h2>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-[11.5px] font-bold text-primary transition hover:opacity-80"
                >
                  تخصيص البروفايل
                </button>
              </div>

              {progress.attempts.length === 0 ? (
                <p className="mt-3 rounded-2xl border border-dashed border-border p-5 text-center text-[13px] font-semibold text-muted-foreground">
                  لم تُكمل أي اختبار بعد.
                  <Link to="/quiz" className="mx-1 font-extrabold text-primary">
                    ابدأ من هنا
                  </Link>
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {[...progress.attempts].reverse().slice(0, 12).map((attempt) => (
                    <li key={attempt.id} className="rounded-xl border border-border bg-background p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-[13px] font-extrabold text-foreground">{attempt.label}</p>
                        <span
                          className={`shrink-0 text-[12.5px] font-black ${
                            attempt.score >= 70
                              ? "text-emerald-600 dark:text-emerald-400"
                              : attempt.score >= 50
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-rose-600 dark:text-rose-400"
                          }`}
                          dir="ltr"
                        >
                          %{attempt.score}
                        </span>
                      </div>
                      <p className="mt-1 text-[11.5px] font-semibold text-muted-foreground">
                        {attempt.correct}/{attempt.total} صحيحة - +{attempt.xpEarned} XP -{" "}
                        {formatDuration(attempt.durationMs)} - {new Date(attempt.finishedAt).toLocaleDateString("ar-MA")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => navigate("/quiz")}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-[12.5px] font-extrabold text-primary-foreground transition hover:opacity-90"
                >
                  <Share2 className="size-4" />
                  اختبار جديد
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-[12.5px] font-extrabold text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                  تصفير التقدّم
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      <RankLadder xp={cloudProfile?.xp ?? progress.xp} currentRank={activeRank.id} />

      {board.length > 0 && (
        <section className="mt-6 rounded-3xl border border-border bg-card p-6">
          <h2 className="text-[15px] font-extrabold text-foreground">لوحة الرتب — أعلى البروفايلات</h2>
          <p className="mt-1.5 text-[12px] leading-6 text-muted-foreground">
            البروفايلات العامة المرتبة حسب نقاط الخبرة، مع الرتبة المطبّقة على كل بروفايل.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {board.map((entry, index) => {
              const entryRank = getRankDefinition(entry.rank)
              return (
                <li key={entry.username}>
                  <Link
                    to={`/u/${entry.username}`}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3 transition hover:border-primary/40"
                  >
                    <span className="w-5 shrink-0 text-center text-[12px] font-black text-muted-foreground" dir="ltr">
                      {index + 1}
                    </span>
                    {entry.avatarUrl ? (
                      <img src={entry.avatarUrl} alt="" className="size-9 rounded-xl object-cover" width={36} height={36} referrerPolicy="no-referrer" />
                    ) : (
                      <span className={`grid size-9 place-items-center rounded-xl border text-[11px] font-black ${entryRank.chip}`}>
                        {entryRank.glyph}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-extrabold text-foreground">{entry.displayName}</span>
                      <span className="block truncate text-[10.5px] font-bold text-muted-foreground" dir="ltr">
                        @{entry.username} - {entry.xp.toLocaleString("en-US")} XP
                      </span>
                    </span>
                    <span className={`shrink-0 text-[11px] font-black ${entryRank.tone}`}>{entryRank.id}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* منطقة الخطر: حذف الحساب بمهلة 30 يوماً. آخر الصفحة عمداً —
          لا نضع إجراءً ينهي الحساب بجانب أزرار الحفظ اليومية. */}
      <DeleteAccountSection username={username} />

      <ConfirmDeleteModal
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="تصفير التقدّم"
        description={
          user
            ? "سيُحذف سجل اختباراتك ونقاط خبرتك ورتبتك على هذا الجهاز وفي بروفايلك السحابي نهائياً (تعود الرتبة إلى D). لا يمكن التراجع."
            : "سيُحذف سجل اختباراتك ونقاط خبرتك ورتبتك على هذا الجهاز نهائياً. لا يمكن التراجع عن هذا الإجراء."
        }
        confirmLabel="نعم، صفّر كل شيء"
        onConfirm={() => void handleReset()}
      />
    </main>
  )
}

/* ------------------------------------------------------------------ *
 * مكوّنات مساعدة
 * ------------------------------------------------------------------ */

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-right transition hover:border-primary/40"
    >
      <span className="text-[12px] font-bold text-foreground">{label}</span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-primary" : "bg-muted"}`}
        aria-hidden="true"
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${
            checked ? "right-0.5" : "right-[18px]"
          }`}
        />
      </span>
    </button>
  )
}

/** سلم الرتب الكامل مع ما تفتحه كل رتبة من صلاحيات. */
function RankLadder({ xp, currentRank }: { xp: number; currentRank?: string }) {
  return (
    <section className="mt-6 rounded-3xl border border-border bg-card p-6">
      <h2 className="text-[15px] font-extrabold text-foreground">سلم الرتب في ميزان — وكل رتبة ماذا تفتح</h2>
      <p className="mt-2 text-[12.5px] leading-6 text-muted-foreground">
        كلما أجبت عن أسئلة QCM بشكل صحيح تجمع نقاط خبرة <span className="font-bold text-foreground">XP</span>. تبدأ من{" "}
        <strong>مبتدئ D</strong> (0 XP) وتصعد حتى <strong>النخبة العليا SSS</strong> (4000 XP+). الرتبة تُطبَّق على
        بروفايلك تلقائياً في قاعدة البيانات، وهي التي تمنح الصلاحيات — لا الاشتراك.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {RANKS.map((item) => {
          const reached = xp >= item.minXp
          const isCurrent = currentRank ? item.id === currentRank : reached
          return (
            <div
              key={item.id}
              className={`rounded-2xl border p-4 transition ${
                isCurrent
                  ? "border-primary bg-primary/[0.06] shadow-sm"
                  : reached
                    ? "border-primary/30 bg-primary/[0.03]"
                    : "border-border bg-background opacity-75"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <RankBadge rank={item} size="sm" />
                {isCurrent && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[9.5px] font-black text-primary-foreground">
                    رتبتك
                  </span>
                )}
              </div>
              <p className="mt-2 text-[12px] leading-6 text-muted-foreground">{item.description}</p>

              <ul className="mt-2.5 space-y-1">
                {item.perks.slice(0, 3).map((perk) => (
                  <li key={perk} className="flex items-start gap-1.5 text-[11px] font-bold leading-5 text-foreground">
                    <Check className="mt-0.5 size-3 shrink-0 text-emerald-600" aria-hidden="true" />
                    {perk}
                  </li>
                ))}
              </ul>

              <p className="mt-2.5 text-[11px] font-bold text-muted-foreground" dir="ltr">
                {item.minXp} XP{item.maxXp ? ` — ${item.maxXp}` : "+"} - مستوى {item.level}/7
              </p>
            </div>
          )
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
        <p className="text-[12.5px] leading-7 text-amber-900 dark:text-amber-100">
          <span className="font-black">تنبيه:</span> أسئلة المنصة مُعدّة لأغراض تعليمية وتدريبية انطلاقاً من النصوص
          القانونية المغربية الجاري بها العمل، وهي لا تُغني عن مراجعة النص الرسمي المنشور في الجريدة الرسمية ولا عن
          استشارة قانونية متخصصة.
        </p>
      </div>
    </section>
  )
}

export default MyProfilePage
