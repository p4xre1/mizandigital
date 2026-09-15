import { useEffect, useMemo, useState } from "react"
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
} from "lucide-react"
import { AEOHead } from "../../components/seo/AEOHead"
import { generateBreadcrumbSchema } from "../../lib/seo/schema"
import { RankBadge } from "../../components/quiz/RankBadge"
import { XpBar } from "../../components/quiz/XpBar"
import { useQuizProgress } from "../../hooks/useQuizProgress"
import { BADGE_BY_ID, RANKS } from "../../lib/quiz/ranks"
import { formatDuration } from "../../lib/quiz/engine"
import { isUsernameAvailable, syncProfileToCloud } from "../../lib/quiz/profileService"
import type { MizanProfile, Semester, UserRole } from "../../types/quiz"
import { ConfirmDeleteModal } from "../../components/ui/ConfirmDeleteModal"

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

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/

/**
 * صفحة ملفي (/profile): إنشاء البروفايل العام وتحريره، عرض الرتبة
 * والإحصاءات والأوسمة، ومزامنة اختيارية مع قاعدة البيانات.
 */
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

  const handleSave = async () => {
    setError(null)
    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, "_")
    if (!USERNAME_PATTERN.test(cleanUsername)) {
      setError("اسم المستخدم يجب أن يكون من 3 إلى 30 حرفاً، بالأحرف اللاتينية والأرقام والشرطة السفلية فقط.")
      return
    }
    if (!displayName.trim()) {
      setError("الاسم المعروض مطلوب (يظهر في بروفايلك العام).")
      return
    }

    setChecking(true)
    const available = await isUsernameAvailable(cleanUsername)
    setChecking(false)

    const isSameUser = profile?.username === cleanUsername
    if (!available && !isSameUser) {
      setError("اسم المستخدم مستعمل من قبل — جرّب اسماً آخر.")
      return
    }

    const next: MizanProfile = {
      username: cleanUsername,
      displayName: displayName.trim(),
      role,
      semester: role === "student" ? semester : null,
      yearsOfExperience: role === "lawyer" ? Math.max(0, Math.min(60, Number(years) || 0)) : null,
      interests: role === "citizen" ? interests : [],
      city: city.trim() || null,
      bio: bio.trim() || null,
      updatedAt: new Date().toISOString(),
    }

    updateProfile(next)
    setEditing(false)

    const sync = await syncProfileToCloud(next, progress, rank.id)
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
        {/* بطاقة الرتبة */}
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

        {/* نموذج التحرير / الإنشاء */}
        <section className="rounded-3xl border border-border bg-card p-6">
          {editing ? (
            <>
              <h2 className="text-[15px] font-extrabold text-foreground">
                {profile ? "تحرير البروفايل" : "أنشئ بروفايلك العام"}
              </h2>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1.5 block text-[12.5px] font-extrabold text-foreground" htmlFor="username">
                    اسم المستخدم (يظهر في الرابط)
                  </label>
                  <input
                    id="username"
                    dir="ltr"
                    value={username}
                    onChange={(event) => setUsername(event.target.value.toLowerCase())}
                    placeholder="ex: abdo_law"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13.5px] text-foreground outline-none transition focus:border-primary"
                  />
                  <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                    mizan.page/u/<span className="text-primary">{username || "…"}</span> — حروف لاتينية وأرقام فقط
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-[12.5px] font-extrabold text-foreground" htmlFor="displayName">
                    الاسم المعروض
                  </label>
                  <input
                    id="displayName"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="عبد الرحمن — طالب قانون"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13.5px] text-foreground outline-none transition focus:border-primary"
                  />
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
                      سنوات الخبرة
                    </label>
                    <input
                      id="years"
                      type="number"
                      min={0}
                      max={60}
                      value={years}
                      onChange={(event) => setYears(Number(event.target.value))}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13.5px] text-foreground outline-none transition focus:border-primary"
                    />
                  </div>
                )}

                {role === "citizen" && (
                  <div>
                    <p className="mb-1.5 text-[12.5px] font-extrabold text-foreground">الاهتمامات القانونية</p>
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
                    المدينة (اختياري)
                  </label>
                  <input
                    id="city"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder="طنجة"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13.5px] text-foreground outline-none transition focus:border-primary"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[12.5px] font-extrabold text-foreground" htmlFor="bio">
                    نبذة قصيرة (اختياري)
                  </label>
                  <textarea
                    id="bio"
                    rows={3}
                    maxLength={240}
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    placeholder="طالب بكلية الحقوق، مهتم بالقانون الجنائي والمسطرة الجنائية."
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13.5px] leading-6 text-foreground outline-none transition focus:border-primary"
                  />
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

      {/* سلم الرتب */}
      <section className="mt-6 rounded-3xl border border-border bg-card p-6">
        <h2 className="text-[15px] font-extrabold text-foreground">سلم الرتب في ميزان</h2>
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
