import { useEffect, useMemo, useState, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  UserRound,
  Copy,
  Check,
  Trophy,
  Flame,
  Target,
  GraduationCap,
  BriefcaseBusiness,
  Users,
  RefreshCw,
  Trash2,
  ExternalLink,
  Share2,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react"
import { AEOHead } from "../../components/seo/AEOHead"
import { generateBreadcrumbSchema } from "../../lib/seo/schema"
import { RankBadge } from "../../components/quiz/RankBadge"
import { XpBar } from "../../components/quiz/XpBar"
import { useQuizProgress } from "../../hooks/useQuizProgress"
import { BADGE_BY_ID, RANKS } from "../../lib/quiz/ranks"
import { formatDuration } from "../../lib/quiz/engine"
import { checkUsernameAvailability, syncProfileToCloud, generateUsernameSuggestions, type AvailabilityResult } from "../../lib/quiz/profileService"
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

export function MyProfilePage() {
  const navigate = useNavigate()
  const { progress, profile, rank, rankProgress, stats, badges, streakDays, updateProfile, reset } = useQuizProgress()

  const [editing, setEditing] = useState<boolean>(() => !progress.profile)
  const [username, setUsername] = useState(progress.profile?.username ?? "")
  const [displayName, setDisplayName] = useState(progress.profile?.displayName ?? "")
  const [role, setRole] = useState<UserRole>(progress.profile?.role ?? "student")
  const [semester, setSemester] = useState<Semester>(progress.profile?.semester ?? "S1")
  const [years, setYears] = useState<number>(progress.profile?.yearsOfExperience ?? 1)
  const [interests, setInterests] = useState<string[]>(progress.profile?.interests ?? [])
  const [city, setCity] = useState(progress.profile?.city ?? "")
  const [bio, setBio] = useState(progress.profile?.bio ?? "")

  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [copied, setCopied] = useState(false)
  const [syncState, setSyncState] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  // --- Duplicate slug prevention: live availability check ---
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    if (progress.profile) {
      setUsername(progress.profile.username)
      setDisplayName(progress.profile.displayName)
      setRole(progress.profile.role)
      setSemester(progress.profile.semester ?? "S1")
      setYears(progress.profile.yearsOfExperience ?? 1)
      setInterests(progress.profile.interests ?? [])
      setCity(progress.profile.city ?? "")
      setBio(progress.profile.bio ?? "")
    }
  }, [progress.profile])

  const publicUrl = useMemo(
    () => (profile ? `mizan.page/u/${profile.username}` : null),
    [profile]
  )

  const toggleInterest = (interest: string) => {
    setInterests((current) =>
      current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest]
    )
  }

  // Live check when username changes (debounced 600ms)
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
      if (!result.available && result.suggestions) {
        setSuggestions(result.suggestions)
      } else {
        setSuggestions([])
      }
      setChecking(false)
    }, 600) as unknown as number

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [username, editing, profile?.username])

  const handleSave = async () => {
    setError(null)

    // Rate limit: 5 saves per minute
    const rl = checkRateLimit(RATE_LIMITS.PROFILE_SAVE.key, RATE_LIMITS.PROFILE_SAVE.max, RATE_LIMITS.PROFILE_SAVE.windowMs)
    if (!rl.allowed) {
      setError(`لقد حاولت الحفظ كثيراً. انتظر ${Math.ceil((rl.retryAfterMs || 0) / 1000)} ثانية.`)
      return
    }

    // Anti-spam + anti-XSS + char limits for every box
    const uCheck = validateUsername(username)
    if (!uCheck.ok) {
      setError(getInputErrorMessage(uCheck.error))
      return
    }

    const dCheck = validateDisplayName(displayName)
    if (!dCheck.ok) {
      setError(getInputErrorMessage(dCheck.error))
      return
    }

    const cCheck = validateCity(city)
    if (!cCheck.ok) {
      setError(getInputErrorMessage(cCheck.error))
      return
    }

    const bCheck = validateBio(bio)
    if (!bCheck.ok) {
      setError(getInputErrorMessage(bCheck.error))
      return
    }

    // Username availability — final check (prevents race condition)
    setChecking(true)
    const finalCheck = await checkUsernameAvailability(uCheck.value, profile?.username ?? null)
    setChecking(false)
    setAvailability(finalCheck)

    if (!finalCheck.available) {
      if (finalCheck.reason === "invalid_format") {
        setError("اسم المستخدم يجب أن يكون 3-30 حرفاً، أحرف لاتينية وأرقام و _ فقط.")
      } else {
        const sug = finalCheck.suggestions?.length ? ` — جرّب: ${finalCheck.suggestions.slice(0, 3).join("، ")}` : ""
        setError(`اسم المستخدم "${finalCheck.normalized}" محجوز من قبل — هذا الرابط مأخوذ. جرّب اسماً آخر${sug}`)
        setSuggestions(finalCheck.suggestions || generateUsernameSuggestions(finalCheck.normalized))
      }
      return
    }

    const next: MizanProfile = {
      username: finalCheck.normalized,
      displayName: dCheck.value,
      role,
      semester: role === "student" ? semester : null,
      yearsOfExperience: role === "lawyer" ? Math.max(INPUT_LIMITS.YEARS_MIN, Math.min(INPUT_LIMITS.YEARS_MAX, Number(years) || 0)) : null,
      interests: role === "citizen" ? interests.slice(0, 5) : [],
      city: cCheck.value || null,
      bio: bCheck.value || null,
      updatedAt: new Date().toISOString(),
    }

    updateProfile(next)
    setEditing(false)

    const sync = await syncProfileToCloud(next, progress, rank.id)
    if (sync.duplicate) {
      setError(sync.reason || "اسم المستخدم محجوز")
      setSuggestions(generateUsernameSuggestions(next.username))
      setEditing(true)
      return
    }
    setSyncState(
      sync.synced
        ? "تم نشر بروفايلك العام ومزامنته مع قاعدة البيانات."
        : (sync.reason ?? "البروفايل محفوظ على هذا الجهاز.")
    )
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

  return (
    <main className="container-wide py-10" dir="rtl">
      <AEOHead
        title="ملفي الشخصي — رتبتي ونقاط خبرتي"
        description="أنشئ بروفايلك العام على ميزان: رابط خاص بك، رتبتك، نقاط خبرتك، أوسمتك، وسجل اختباراتك القانونية."
        directAnswer="MyProfilePage في ميزان الرقمية منصة مغربية للمعرفة القانونية لطلبة الحقوق."
        canonicalUrl="https://www.mizan.page/profile"
        noindex
        schema={[
          generateBreadcrumbSchema([
            { name: "الرئيسية", url: "/" },
            { name: "ملفي", url: "/profile" },
          ]),
        ]}
      />

      <h1 className="text-2xl font-black text-foreground">ملفي</h1>
      <p className="mt-1 text-[13.5px] leading-7 text-muted-foreground">
        رتبتك ونقاط خبرتك وأوسمتك في مكان واحد، مع رابط عام تشاركه مع من تشاء.
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <UserRound className="size-6" strokeWidth={2.2} />
              </span>
              <div>
                <p className="text-base font-extrabold text-foreground">
                  {profile?.displayName ?? "بروفايل غير منشأ بعد"}
                </p>
                <p className="text-[12px] font-semibold text-muted-foreground" dir="ltr">
                  {publicUrl ?? "أنشئ اسم مستخدم للحصول على رابطك"}
                </p>
              </div>
            </div>
            <RankBadge rank={rank} />
          </div>

          <div className="mt-5">
            <XpBar rankProgress={rankProgress} xp={progress.xp} credits={progress.credits} />
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Trophy, label: "اختبارات", value: stats.totalAttempts },
              { icon: Target, label: "دقة الإجابات", value: `%${stats.accuracy}` },
              { icon: Flame, label: "سلسلة الأيام", value: streakDays },
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

          {badges.length > 0 && (
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
                معاينة البروفايل
              </Link>
              <button
                type="button"
                onClick={() => setEditing((value) => !value)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-[12.5px] font-extrabold text-primary-foreground transition hover:opacity-90"
              >
                <RefreshCw className="size-4" />
                {editing ? "إلغاء التحرير" : "تحرير البروفايل"}
              </button>
            </div>
          )}

          {syncState && <p className="mt-3 text-[12px] font-semibold text-muted-foreground">{syncState}</p>}
        </section>

        <section className="rounded-3xl border border-border bg-card p-6">
          {editing ? (
            <>
              <h2 className="text-[15px] font-extrabold text-foreground">
                {profile ? "تحرير البروفايل" : "أنشئ بروفايلك العام"}
              </h2>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1.5 block text-[12.5px] font-extrabold text-foreground" htmlFor="username">
                    اسم المستخدم (يظهر في الرابط) — {INPUT_LIMITS.USERNAME_MIN}-{INPUT_LIMITS.USERNAME_MAX} حرف
                  </label>
                  <div className="relative">
                    <input
                      id="username"
                      dir="ltr"
                      value={username}
                      onChange={(event) => setUsername(event.target.value.toLowerCase())}
                      placeholder="ex: abdo_law"
                      maxLength={INPUT_LIMITS.USERNAME_MAX}
                      autoComplete="username"
                      spellCheck={false}
                      className={`w-full rounded-xl border bg-background px-3 py-2.5 text-[13.5px] text-foreground outline-none transition pr-10 ${
                        availability && !availability.available
                          ? "border-rose-400 focus:border-rose-500"
                          : availability && availability.available
                            ? "border-emerald-400 focus:border-emerald-500"
                            : "border-border focus:border-primary"
                      }`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checking ? (
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      ) : availability && !availability.available ? (
                        <AlertCircle className="size-4 text-rose-500" />
                      ) : availability && availability.available && username.length >= 3 ? (
                        <CheckCircle2 className="size-4 text-emerald-500" />
                      ) : null}
                    </span>
                  </div>

                  {/* Live availability feedback */}
                  {availability && !availability.available ? (
                    <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 p-3">
                      <p className="text-[11.5px] font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                        <AlertCircle className="size-3.5" />
                        {availability.reason === "invalid_format"
                          ? "صيغة غير صالحة — 3-30 حرف، أحرف لاتينية وأرقام و _ فقط."
                          : `الاسم "${availability.normalized}" محجوز من قبل — هذا الرابط مأخوذ. جرّب اسماً آخر.`}
                      </p>
                      {suggestions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-[11px] font-bold text-muted-foreground mb-1.5">اقتراحات متاحة:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {suggestions.map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setUsername(s)}
                                className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[11px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition"
                                dir="ltr"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : availability && availability.available && username.length >= 3 ? (
                    <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 p-2.5">
                      <p className="text-[11.5px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5" />
                        الاسم "{availability.normalized}" متاح ✅ — رابطك سيكون mizan.page/u/{availability.normalized}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                      mizan.page/u/<span className="text-primary">{username || "…"}</span> — حروف لاتينية وأرقام فقط — {username.length}/{INPUT_LIMITS.USERNAME_MAX}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-[12.5px] font-extrabold text-foreground" htmlFor="displayName">
                    الاسم المعروض — {INPUT_LIMITS.DISPLAY_NAME_MIN}-{INPUT_LIMITS.DISPLAY_NAME_MAX} حرف
                  </label>
                  <input
                    id="displayName"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="عبد الرحمن — طالب قانون"
                    maxLength={INPUT_LIMITS.DISPLAY_NAME_MAX}
                    autoComplete="name"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13.5px] text-foreground outline-none transition focus:border-primary"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">{displayName.length}/{INPUT_LIMITS.DISPLAY_NAME_MAX}</p>
                </div>

                <div>
                  <p className="mb-1.5 text-[12.5px] font-extrabold text-foreground">صفتي</p>
                  <div className="grid gap-2">
                    {ROLES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setRole(item.id)}
                        className={`flex items-center gap-3 rounded-xl border p-3 text-right transition ${
                          role === item.id ? "border-primary bg-primary/[0.06]" : "border-border bg-background hover:border-primary/40"
                        }`}
                      >
                        <item.icon className="size-4 text-primary" aria-hidden="true" />
                        <span>
                          <span className="block text-[13px] font-extrabold text-foreground">{item.label}</span>
                          <span className="block text-[11px] font-semibold text-muted-foreground">{item.hint}</span>
                        </span>
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
                          className={`rounded-xl border px-3.5 py-2 text-[12.5px] font-extrabold transition ${
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

                <div>
                  <label className="mb-1.5 block text-[12.5px] font-extrabold text-foreground" htmlFor="city">
                    المدينة (اختياري) — حتى {INPUT_LIMITS.CITY_MAX} حرف
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
                  <p className="mt-1 text-[11px] text-muted-foreground">{city.length}/{INPUT_LIMITS.CITY_MAX}</p>
                </div>

                <div>
                  <label className="mb-1.5 block text-[12.5px] font-extrabold text-foreground" htmlFor="bio">
                    نبذة قصيرة (اختياري) — حتى {INPUT_LIMITS.BIO_MAX} حرف
                  </label>
                  <textarea
                    id="bio"
                    rows={3}
                    maxLength={INPUT_LIMITS.BIO_MAX}
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    placeholder="طالب بكلية الحقوق، مهتم بالقانون الجنائي والمسطرة الجنائية."
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13.5px] leading-6 text-foreground outline-none transition focus:border-primary resize-none"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">{bio.length}/{INPUT_LIMITS.BIO_MAX} — بلا روابط، بلا وسوم HTML</p>
                </div>
              </div>

              {error && (
                <p className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-[12.5px] font-bold text-rose-700 dark:text-rose-300">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={checking}
                className="mt-5 w-full rounded-xl bg-primary px-5 py-3 text-[14px] font-extrabold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {checking ? "جارٍ التحقق من الاسم..." : "حفظ ونشر البروفايل"}
              </button>
              <p className="mt-2 text-[10px] text-muted-foreground text-center">حماية من السبام: 5 محاولات حفظ في الدقيقة — تنقية تلقائية ضد XSS/SQL — فحص فوري لعدم التكرار</p>
            </>
          ) : (
            <>
              <h2 className="text-[15px] font-extrabold text-foreground">سجل الاختبارات</h2>
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
                        {attempt.correct}/{attempt.total} صحيحة · +{attempt.xpEarned} XP ·{" "}
                        {formatDuration(attempt.durationMs)} ·{" "}
                        {new Date(attempt.finishedAt).toLocaleDateString("ar-MA")}
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

      <section className="mt-6 rounded-3xl border border-border bg-card p-6">
        <h2 className="text-[15px] font-extrabold text-foreground">سلم الرتب في ميزان</h2>
        <p className="mt-2 text-[12.5px] leading-6 text-muted-foreground">
          كلما أجبت عن أسئلة QCM بشكل صحيح، تجمع نقاط خبرة <span className="font-bold text-foreground">XP</span>. 
          تبدأ من <strong>مبتدئ D</strong> (0 XP) وتصعد تدريجياً حتى <strong>النخبة العليا SSS</strong> (4000 XP+). 
          الرتب العليا تفتح لك مميزات: شهادة توصية، نشر مقالاتك، وظهور بروفايلك كمرجع للطلبة الآخرين. 
          المنصة 100% مجانية، والرتبة هي مقياس تقدمك الحقيقي، وليست اشتراكاً مدفوعاً.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {RANKS.map((item) => {
            const reached = progress.xp >= item.minXp
            return (
              <div
                key={item.id}
                className={`rounded-2xl border p-4 transition ${reached ? "border-primary/40 bg-primary/[0.04]" : "border-border bg-background opacity-70"}`}
              >
                <RankBadge rank={item} size="sm" />
                <p className="mt-2 text-[12px] leading-6 text-muted-foreground">{item.description}</p>
                <p className="mt-1.5 text-[11px] font-bold text-muted-foreground" dir="ltr">
                  {item.minXp} XP{item.maxXp ? ` — ${item.maxXp}` : "+"}
                </p>
              </div>
            )
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
          <p className="text-[12.5px] leading-7 text-amber-900 dark:text-amber-100">
            <span className="font-black">تنبيه:</span> أسئلة المنصة مُعدّة لأغراض تعليمية وتدريبية انطلاقاً من النصوص القانونية المغربية الجاري بها العمل، وهي لا تُغني عن مراجعة النص الرسمي المنشور في الجريدة الرسمية ولا عن استشارة قانونية متخصصة.
          </p>
        </div>
      </section>

      <ConfirmDeleteModal
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="تصفير التقدّم"
        description="سيُحذف سجل اختباراتك ونقاط خبرتك ورتبتك على هذا الجهاز نهائياً. لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="نعم، صفّر كل شيء"
        onConfirm={() => {
          reset()
          setConfirmReset(false)
          setEditing(true)
        }}
      />
    </main>
  )
}
