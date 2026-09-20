import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Check, Crown, LayoutDashboard, LogIn, LogOut, UserRound } from "lucide-react"
import { useAuth } from "@/lib/auth/AuthProvider"
import { getRankDefinition } from "@/lib/quiz/ranks"
import { RankBadge } from "@/components/quiz/RankBadge"
import { AuthErrorBoundary } from "./AuthErrorBoundary"

/**
 * AuthControls — منطقة المصادقة في الشريط العلوي (Supabase Auth).
 * -----------------------------------------------------------------------
 * بديل SafeClerkAuth/UserButton بعد إزالة Clerk:
 *   • زائر          → زر «دخول» واحد نحو /login (إنشاء الحساب من داخل
 *                     صفحة الدخول نفسها، عبر مُبدّل «حساب جديد»).
 *   • مستخدم مسجّل  → دائرة صورة البروفايل وحدها في الشريط (الاسم والرتبة
 *                     داخل القائمة) + قائمة منسدلة فيها البروفايل، الرابط
 *                     العام، المحفوظات، الاختبارات وتسجيل الخروج.
 *                     لا مدخل إلى لوحة التحكم من هنا ولا من صفحة البروفايل:
 *                     للإدارة مسارها الخاص /admin المحميّ بـ AdminGate.
 *   • أثناء قراءة الجلسة → هيكل بنفس العرض حتى لا يقفز الشريط (CLS).
 */

interface AuthControlsProps {
  className?: string
  /** نمط مضغوط للشاشات الصغيرة. */
  /** يُنادى بعد إغلاق القائمة (مثلاً لإغلاق قائمة الموبايل). */
  onNavigate?: () => void
}

function initials(name?: string | null, username?: string | null): string {
  const source = (name || username || "م").trim()
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

function AuthControlsInner({ className = "hidden md:flex items-center gap-2", onNavigate }: AuthControlsProps) {
  const { initialized, user, profile, rank, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  const go = (path: string) => {
    setOpen(false)
    onNavigate?.()
    navigate(path)
  }

  // الجلسة ما زالت تُقرأ: هيكل ثابت العرض بدل زر يظهر ويختفي
  if (!initialized && !user) {
    return (
      <div className={className} aria-hidden="true">
        <span className="h-9 w-24 animate-pulse rounded-full bg-[#f1f5f9] dark:bg-[#334155]" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className={className}>
        <Link
          to="/login"
          onClick={onNavigate}
          className="rounded-full border border-[#e2e8f0] dark:border-[#334155] px-4 py-2 text-[13px] font-bold text-[#334155] dark:text-[#e2e8f0] hover:bg-[#f8fafc] dark:hover:bg-[#1e293b] transition-colors"
        >
          دخول
        </Link>
      </div>
    )
  }

  const rankDefinition = getRankDefinition(profile?.rank ?? rank.id)
  const displayName = profile?.displayName || user.email?.split("@")[0] || "حسابي"
  const publicUrl = profile?.username ? `/u/${profile.username}` : null

  const handleSignOut = async () => {
    setBusy(true)
    setOpen(false)
    await signOut()
    setBusy(false)
    onNavigate?.()
    navigate("/")
  }

  return (
    <div ref={containerRef} className={`${className} relative`}>
      {/* الاسم لم يعد ظاهراً كنص، فننقله إلى aria-label وtitle حتى لا تُفقد
          المعلومة عن قارئ الشاشة وعمّن يمرّر المؤشر فوق الدائرة. */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`قائمة الحساب — ${displayName}`}
        title={displayName}
        className="flex items-center justify-center rounded-full border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-1 hover:bg-[#f8fafc] dark:hover:bg-[#334155] transition-colors"
      >
        {profile?.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt=""
            className="size-7 rounded-full object-cover"
            width={28}
            height={28}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className={`grid size-7 place-items-center rounded-full border text-[10px] font-black ${rankDefinition.chip}`}>
            {initials(displayName, profile?.username)}
          </span>
        )}
        {/* لا اسم ولا رمز رتبة ولا سهم — الدائرة وحدها كما طُلب.
            الرتبة والاسم يبقيان داخل القائمة المنسدلة عند الفتح. */}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-[calc(100%+8px)] z-[80] w-[280px] overflow-hidden rounded-2xl border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-lg"
        >
          <div className="flex items-center gap-3 border-b border-[#e2e8f0] dark:border-[#334155] p-3.5">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="size-11 rounded-xl object-cover" width={44} height={44} referrerPolicy="no-referrer" />
            ) : (
              <span className={`grid size-11 place-items-center rounded-xl border text-sm font-black ${rankDefinition.chip}`}>
                {initials(displayName, profile?.username)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-extrabold text-[#0f172a] dark:text-white">{displayName}</p>
              <p className="truncate text-[11px] font-semibold text-[#94a3b8]" dir="ltr">
                {profile?.username ? `@${profile.username}` : user.email}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-b border-[#e2e8f0] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#0f172a]/40 px-3.5 py-2.5">
            <RankBadge rank={rankDefinition} size="sm" />
            <span className="text-[11px] font-bold text-[#64748b] dark:text-[#94a3b8]" dir="ltr">
              {(profile?.xp ?? 0).toLocaleString("en-US")} XP
            </span>
          </div>

          <nav className="p-1.5">
            <MenuItem icon={<UserRound className="size-4" />} label="بروفايلي ورتبتي" onClick={() => go("/profile")} />
            {publicUrl && (
              <MenuItem
                icon={<Check className="size-4" />}
                label="رابطي العام"
                hint={publicUrl}
                onClick={() => go(publicUrl)}
              />
            )}
            <MenuItem icon={<Crown className="size-4" />} label="المحتوى المحفوظ" onClick={() => go("/saved")} />
            <MenuItem icon={<LayoutDashboard className="size-4" />} label="الاختبارات" onClick={() => go("/quiz")} />
          </nav>

          <div className="border-t border-[#e2e8f0] dark:border-[#334155] p-1.5">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={busy}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-bold text-[#e11d48] transition-colors hover:bg-[#fff1f2] dark:hover:bg-[#4c0519]/40 disabled:opacity-60"
            >
              <LogOut className="size-4" />
              {busy ? "جارٍ تسجيل الخروج…" : "تسجيل الخروج"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItem({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  hint?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-bold text-[#334155] dark:text-[#e2e8f0] transition-colors hover:bg-[#f8fafc] dark:hover:bg-[#334155]"
    >
      {icon}
      <span className="min-w-0 flex-1 text-right">
        <span className="block truncate">{label}</span>
        {hint && (
          <span className="block truncate text-[10.5px] font-semibold text-[#94a3b8]" dir="ltr">
            {hint}
          </span>
        )}
      </span>
    </button>
  )
}

export function AuthControls(props: AuthControlsProps) {
  return (
    <AuthErrorBoundary>
      <AuthControlsInner {...props} />
    </AuthErrorBoundary>
  )
}

/** زر دخول صريح للصفحات التي تحتاج CTA كبيراً (بدون قائمة). */
export function SignInButton({
  label = "تسجيل الدخول / إنشاء حساب",
  className = "inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[13px] font-bold text-primary-foreground shadow-sm transition hover:opacity-90 hover:shadow-md active:scale-[0.98] sm:px-5 sm:text-sm",
  mode = "signin",
}: {
  label?: string
  className?: string
  mode?: "signin" | "signup"
}) {
  const { user } = useAuth()
  if (user) {
    return (
      <Link to="/profile" className={className}>
        <UserRound className="size-4" />
        بروفايلي
      </Link>
    )
  }
  return (
    <Link to={mode === "signup" ? "/login?mode=signup" : "/login"} className={className}>
      <LogIn className="size-4" strokeWidth={2.3} />
      <span>{label}</span>
    </Link>
  )
}

export default AuthControls
