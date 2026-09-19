import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  UserRound,
  Trophy,
  Target,
  Flame,
  Copy,
  Check,
  Share2,
  ArrowLeft,
  GraduationCap,
  BriefcaseBusiness,
  Users,
  MapPin,
  Link2,
  BadgeCheck,
  Sparkles,
} from "lucide-react"
import { AEOHead } from "../../components/seo/AEOHead"
import { generateBreadcrumbSchema } from "../../lib/seo/schema"
import { RankBadge } from "../../components/quiz/RankBadge"
import { XpBar } from "../../components/quiz/XpBar"
import { BADGE_BY_ID, RANKS, getRankDefinition, getRankProgress } from "../../lib/quiz/ranks"
import { fetchPublicProfile, type PublicProfile } from "../../lib/quiz/profileService"
import { buildProfileShare, copyToClipboard, openExternalShare } from "../../lib/quiz/shareCard"

const ROLE_META: Record<string, { label: string; icon: typeof Users }> = {
  student: { label: "طالب قانون", icon: GraduationCap },
  lawyer: { label: "محامٍ", icon: BriefcaseBusiness },
  citizen: { label: "مهتم بالقانون", icon: Users },
}

/**
 * البروفايل العام (/u/:username) — رابط يشاركه المستخدم في سيرته الذاتية
 * وعلى لينكد إن، ويبرز رتبته وإحصاءاته بدل أن يبرز "شهادة" لا معنى لها.
 */
export function PublicProfilePage() {
  const { username = "" } = useParams<{ username: string }>()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchPublicProfile(username).then((result) => {
      if (!mounted) return
      setProfile(result)
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [username])

  const copyLink = async () => {
    const ok = await copyToClipboard(window.location.href)
    setCopied(ok)
    window.setTimeout(() => setCopied(false), 2500)
  }

  if (loading) {
    return (
      <main className="container-wide py-16" dir="rtl">
        <p className="text-center text-sm font-bold text-muted-foreground">جارٍ تحميل البروفايل...</p>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="container-wide py-16" dir="rtl">
        <AEOHead title="البروفايل غير موجود" description="لم نعثر على هذا البروفايل العام على منصة ميزان."
        directAnswer="PublicProfilePage في ميزان الرقمية منصة مغربية للمعرفة القانونية لطلبة الحقوق." noindex />
        <div className="mx-auto max-w-lg rounded-3xl border border-dashed border-border bg-card p-8 text-center">
          <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <UserRound className="size-6" strokeWidth={2.2} />
          </span>
          <h1 className="text-lg font-extrabold text-foreground">هذا البروفايل غير متاح</h1>
          <p className="mt-2 text-[13px] leading-7 text-muted-foreground">
            لم نعثر على مستخدم بالاسم <span className="font-extrabold text-foreground" dir="ltr">@{username}</span>.
            إما أن الاسم غير صحيح، أو أن صاحبه لم ينشر بروفايله العام بعد.
          </p>
          <Link
            to="/quiz"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[13px] font-extrabold text-primary-foreground transition hover:opacity-90"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            استكشف الاختبارات
          </Link>
        </div>
      </main>
    )
  }

  const rank = getRankDefinition(profile.rank as never)
  const rankProgress = getRankProgress(profile.xp)
  const roleMeta = ROLE_META[profile.role] ?? ROLE_META.citizen
  const profileShare = buildProfileShare({
    displayName: profile.displayName,
    username: profile.username,
    rank: rank.id,
  })

  // داخل الإطارات المعزولة يحجب المتصفح النوافذ المنبثقة، فننسخ الرابط بدلاً منه
  const shareProfile = (url: string) => {
    if (openExternalShare(url) === "blocked") void copyToClipboard(url)
  }

  return (
    <main className="container-wide py-10" dir="rtl">
      <AEOHead
        title={`${profile.displayName} — بروفايل ميزان`}
        description={`بروفايل ${profile.displayName} على منصة ميزان الرقمية: الرتبة ${rank.id} (${rank.label})، نقاط الخبرة، والأوسمة القانونية.`}
        canonicalUrl={`https://www.mizan.page/u/${profile.username}`}
        schema={[
          generateBreadcrumbSchema([
            { name: "الرئيسية", url: "/" },
            { name: "الاختبارات", url: "/quiz" },
            { name: profile.displayName, url: `/u/${profile.username}` },
          ]),
          {
            "@type": "ProfilePage",
            mainEntity: {
              "@type": "Person",
              name: profile.displayName,
              alternateName: profile.username,
              url: `https://www.mizan.page/u/${profile.username}`,
            },
          },
        ]}
      />

      <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-border bg-card">
        {profile.coverUrl && (
          <div
            className="h-32 w-full bg-cover bg-center sm:h-40"
            style={{ backgroundImage: `url("${profile.coverUrl}")` }}
            role="img"
            aria-label={`غلاف بروفايل ${profile.displayName}`}
          />
        )}

        <div className="p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt=""
                className="size-16 rounded-2xl border border-border object-cover"
                width={64}
                height={64}
                referrerPolicy="no-referrer"
              />
            ) : (
              <span
                className="grid size-16 place-items-center rounded-2xl text-primary"
                style={{ backgroundColor: `${profile.themeColor ?? "hsl(var(--primary))"}1a` }}
              >
                <UserRound className="size-7" strokeWidth={2.2} />
              </span>
            )}
            <div>
              <h1 className="flex flex-wrap items-center gap-2 text-xl font-black text-foreground">
                {profile.displayName}
                {rank.capabilities.recommendationCert && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-accent-gold/40 bg-accent-gold/10 px-2 py-0.5 text-[10px] font-black text-accent-gold"
                    title="رتبة خبير فما فوق — شهادة توصية معتمدة"
                  >
                    <BadgeCheck className="size-3" aria-hidden="true" />
                    خبير موثق
                  </span>
                )}
              </h1>
              <p className="text-[12.5px] font-semibold text-muted-foreground" dir="ltr">
                mizan.page/u/{profile.username}
              </p>
              {profile.headline && (
                <p className="mt-1 text-[12.5px] font-bold text-foreground">{profile.headline}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] font-bold text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1">
                  <roleMeta.icon className="size-3" aria-hidden="true" />
                  {roleMeta.label}
                </span>
                {profile.occupation && (
                  <span className="rounded-full border border-border bg-background px-2.5 py-1">
                    {profile.occupation}
                  </span>
                )}
                {profile.semester && (
                  <span className="rounded-full border border-accent-gold/40 bg-accent-gold/10 px-2.5 py-1 text-accent-gold">
                    {profile.semester}
                  </span>
                )}
                {profile.yearsOfExperience !== null && profile.yearsOfExperience !== undefined && (
                  <span className="rounded-full border border-border bg-background px-2.5 py-1">
                    {profile.yearsOfExperience} سنوات خبرة
                  </span>
                )}
                {profile.city && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1">
                    <MapPin className="size-3" aria-hidden="true" />
                    {profile.city}
                  </span>
                )}
              </div>
            </div>
          </div>

          {profile.showRank !== false && <RankBadge rank={rank} size="lg" />}
        </div>

        {profile.bio && (
          <p className="mt-5 rounded-2xl border border-border bg-background p-4 text-[13.5px] leading-7 text-muted-foreground">
            {profile.bio}
          </p>
        )}

        {profile.showXp !== false && (
          <div className="mt-6">
            <XpBar rankProgress={rankProgress} xp={profile.xp} credits={profile.credits} />
          </div>
        )}

        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { icon: Trophy, label: "الرتبة", value: rank.id },
            { icon: Target, label: "نقاط الخبرة", value: profile.xp.toLocaleString("ar-MA") },
            { icon: Flame, label: "الكريدتس", value: profile.credits.toLocaleString("ar-MA") },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-border bg-background p-4 text-center">
              <item.icon className="mx-auto mb-1.5 size-4 text-primary" aria-hidden="true" />
              <p className="text-lg font-black text-foreground" dir="ltr">
                {item.value}
              </p>
              <p className="mt-0.5 text-[10.5px] font-bold text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>

        {profile.showBadges !== false && profile.badges.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-[12.5px] font-extrabold text-foreground">الأوسمة</p>
            <div className="flex flex-wrap gap-2">
              {profile.badges.map((badgeId) => {
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

        {(profile.interests?.length ?? 0) > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-[12.5px] font-extrabold text-foreground">الاهتمامات القانونية</p>
            <div className="flex flex-wrap gap-2">
              {(profile.interests ?? []).map((interest) => (
                <span
                  key={interest}
                  className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[12px] font-bold text-primary"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        {(profile.websiteUrl || profile.linkedinUrl) && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {profile.websiteUrl && (
              <a
                href={profile.websiteUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[12px] font-bold text-foreground transition hover:border-primary/50"
              >
                <Link2 className="size-3.5" aria-hidden="true" />
                الموقع الشخصي
              </a>
            )}
            {profile.linkedinUrl && (
              <a
                href={profile.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-[12px] font-bold text-sky-700 transition hover:bg-sky-500/20 dark:text-sky-300"
              >
                <Link2 className="size-3.5" aria-hidden="true" />
                لينكد إن
              </a>
            )}
          </div>
        )}

        {/* صلاحيات الرتبة المطبّقة على هذا البروفايل */}
        <div className="mt-6 rounded-2xl border border-border bg-background p-4">
          <p className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-foreground">
            <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
            صلاحيات الرتبة {rank.id} — {rank.label}
          </p>
          <ul className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
            {rank.perks.map((perk) => (
              <li key={perk} className="flex items-start gap-1.5 text-[11.5px] font-bold leading-5 text-muted-foreground">
                <span className={`mt-1 size-1.5 shrink-0 rounded-full ${rank.chip.split(" ")[0]}`} aria-hidden="true" />
                {perk}
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[10.5px] font-bold text-muted-foreground" dir="ltr">
            مستوى {rank.level}/7 - {rank.minXp} XP{rank.maxXp ? ` — ${rank.maxXp} XP` : "+"}
            {profile.highestRank && profile.highestRank !== rank.id ? ` - أعلى رتبة: ${profile.highestRank}` : ""}
          </p>
        </div>

        {/* السلم الكامل حتى يعرف الزائر ما ينتظره */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {RANKS.map((item) => (
            <span
              key={item.id}
              title={`${item.label} — ${item.minXp} XP${item.maxXp ? ` إلى ${item.maxXp}` : "+"}`}
              className={`rounded-lg border px-2 py-1 text-[10.5px] font-black ${item.chip} ${
                item.id === rank.id ? "ring-2 ring-primary/40" : "opacity-60"
              }`}
            >
              {item.glyph}
            </span>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-2 border-t border-border pt-5">
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-[12.5px] font-extrabold text-foreground transition hover:border-primary/50"
          >
            {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
            {copied ? "نُسخ الرابط" : "نسخ الرابط"}
          </button>
          <button
            type="button"
            onClick={() => shareProfile(profileShare.whatsappUrl)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-[12.5px] font-extrabold text-foreground transition hover:border-emerald-500/60 hover:text-emerald-600"
          >
            <Share2 className="size-4" />
            مشاركة على واتساب
          </button>
          <button
            type="button"
            onClick={() => shareProfile(profileShare.linkedinUrl)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-[12.5px] font-extrabold text-foreground transition hover:border-sky-500/60 hover:text-sky-600"
          >
            <Share2 className="size-4" />
            مشاركة على لينكد إن
          </button>
          <Link
            to="/quiz"
            className="mr-auto inline-flex items-center gap-2 text-[12.5px] font-extrabold text-primary transition hover:gap-3"
          >
            أنشئ بروفايلك وابدأ الاختبارات
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Link>
        </div>
        </div>
      </div>
    </main>
  )
}
