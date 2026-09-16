import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Check, ChevronDown, Crown, LayoutDashboard, LogIn, LogOut, UserRound } from "lucide-react"
import { useAuth } from "@/lib/auth/AuthProvider"
import { getRankDefinition } from "@/lib/quiz/ranks"
import { RankBadge } from "@/components/quiz/RankBadge"
import { AuthErrorBoundary } from "./AuthErrorBoundary"

/**
 * AuthControls — منطقة المصادقة في الشريط العلوي (Supabase Auth).
 * -----------------------------------------------------------------------
 * بديل SafeClerkAuth/UserButton بعد إزالة Clerk:
 *   • زائر          → زرا «دخول» و«حساب جديد» نحو /login.
 *   • مستخدم مسجّل  → صورة/حرف أول + شارة الرتبة + قائمة منسدلة فيها
 *                     البروفايل، الرابط العام، المحفوظات، لوحة التحكم
 *                     (للإدارة فقط) وتسجيل الخروج.
 *   • أثناء قراءة الجلسة → هيكل بنفس العرض حتى لا يقفز الشريط (CLS).
 */

interface AuthControlsProps {
  className?: string
  /** نمط مضغوط للشاشات الصغيرة. */
  compact?: boolean
  /** يُنادى بعد إغلاق القائمة (مثلاً لإغلاق قائمة الموبايل). */
  onNavigate?: () => void
}

function initials(name?: string | null, username?: string | null): string {
  const source = (name || username || "م").trim()
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

function AuthControlsInner({ className = "hidden md:flex items-center gap-2", compact = false, onNavigate }: AuthControlsProps) {
  const { initialized, user, profile, isAdmin, rank, signOut } = useAuth()
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
        {!compact && (
          <Link
            to="/login?mode=signup"
            onClick={onNavigate}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#2563eb] px-4 py-2 text-[13px] font-bold text-white shadow-sm hover:bg-[#1d4ed8] transition-colors"
          >
            <UserRound className="size-4" />
            حساب جديد
          </Link>
        )}
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
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="قائمة الحساب"
        className="flex items-center gap-2 rounded-full border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] py-1 pr-1 pl-2.5 hover:bg-[#f8fafc] dark:hover:bg-[#334155] transition-colors"
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
        {!compact && (
          <span className="hidden max-w-[92px] truncate text-[12.5px] font-bold text-[#334155] dark:text-[#e2e8f0] sm:block">
            {displayName}
          </span>
        )}
        <span className={`hidden text-[10px] font-black sm:inline ${rankDefinition.tone}`} title={`الرتبة ${rankDefinition.id}`}>
          {rankDefinition.glyph}
        </span>
        <ChevronDown className={`size-3.5 text-[#94a3b8] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-[calc(100%+8px)] z-[80] w-[280px] overflow-hidden rounded-2xl border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.25)]"
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
            {isAdmin && (
              <MenuItem
                icon={<LayoutDashboard className="size-4" />}
                label="لوحة التحكم"
                onClick={() => go("/admin/dashboard")}
                accent
              />
            )}
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
  accent = false,
}: {
  icon: React.ReactNode
  label: string
  hint?: string
  onClick: () => void
  accent?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-colors ${
        accent
          ? "text-[#2563eb] hover:bg-[#eff6ff] dark:hover:bg-[#1e3a5f]/40"
          : "text-[#334155] dark:text-[#e2e8f0] hover:bg-[#f8fafc] dark:hover:bg-[#334155]"
      }`}
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
