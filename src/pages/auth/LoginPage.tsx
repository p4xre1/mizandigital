import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { safeRedirectPath, safeRedirectUrl } from "@/lib/auth/safeRedirect"
import { describeAuthError } from "@/lib/auth/AuthProvider"
import {
  ArrowRight,
  AtSign,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import { useAuth } from "@/lib/auth/AuthProvider"
import { AEOHead } from "@/components/seo/AEOHead"
import { RANKS } from "@/lib/quiz/ranks"
import { INPUT_LIMITS, validateDisplayName, validateUsername } from "@/lib/security/inputGuard"
import {
  POLICY_VERSION,
  captureConsent,
  hasCurrentConsent,
} from "@/lib/legal/consent"

/**
 * صفحة المصادقة الموحّدة — Supabase Auth (بلا Clerk).
 * -----------------------------------------------------------------------
 * /login?mode=signin  → تسجيل الدخول (بريد + كلمة مرور، أو Google)
 * /login?mode=signup  → إنشاء حساب (ينشئ البروفايل العام تلقائياً برتبة D)
 * /login?mode=password→ استعادة كلمة المرور / تعيين كلمة جديدة بعد Recovery
 *
 * بعد نجاح الدخول:
 *   • مدير (admin_god_mode أو role editor/super_admin) → /admin/dashboard
 *   • بقية المستخدمين → /profile (أو إلى ?next= إن وُجد)
 *
 * ملاحظة: المشغّل handle_new_user في القاعدة ينشئ صفوف profiles و
 * mizan_profiles معاً عند التسجيل، فكل حساب جديد يملك بروفايلًا مخصصاً
 * ورتبة مطبّقة منذ اللحظة الأولى.
 */

type Mode = "signin" | "signup" | "password"

interface LoginPageProps {
  onNavigate?: (path: string) => void
}

/**
 * الحد الأدنى لطول كلمة المرور.
 * رُفع من 6 إلى 8: ستة أحرف دونها كل أدوات الكسر المتاحة، ولا تحقق الحد
 * الأدنى في إرشادات NIST SP 800-63B. التحقق في الخادم (GoTrue) يبقى
 * مستقلاً، فتشديد جهة العميل لا يكسر شيئاً — أما تخفيفه فممنوع.
 */
const MIN_PASSWORD = 8

function GoogleIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09Z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A11.99 11.99 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  )
}

export default function LoginPage({ onNavigate }: LoginPageProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { initialized, user, isAdmin, signIn, signUp, signInWithGoogle, resetPassword } = useAuth()

  const [mode, setMode] = useState<Mode>(() => {
    const requested = searchParams.get("mode")
    return requested === "signup" || requested === "password" ? requested : "signin"
  })
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [username, setUsername] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // موافقة سياسات الخصوصية — خانة إلزامية قبل إنشاء الحساب أو المتابعة عبر Google.
  // لا تُؤشَّر مسبقاً أبداً (الصناديق المُؤشَّرة مسبقاً لا تُعد موافقة صحيحة).
  const [alreadyConsented] = useState<boolean>(() => hasCurrentConsent())
  const [agreed, setAgreed] = useState(false)

  // وضع Recovery: Supabase يعيدنا بـ type=recovery بعد رابط استعادة كلمة المرور
  const isRecovery =
    searchParams.get("type") === "recovery" ||
    (typeof window !== "undefined" && window.location.hash.includes("type=recovery"))
  const next = searchParams.get("next")

  useEffect(() => {
    if (isRecovery) setMode("password")
  }, [isRecovery])

  useEffect(() => {
    const requested = searchParams.get("mode")
    if (requested === "signup" || requested === "password" || requested === "signin") {
      setMode(requested as Mode)
    }
  }, [searchParams])

  // كان: next || ... — قيمة ?next= تمرّ كما هي إلى navigate()، فيكفي
  // ‎?next=//evil.com‎ لإخراج المستخدم من النطاق بعد تسجيل الدخول.
  // صار يمرّ عبر safeRedirectPath الذي لا يقبل إلا مساراً داخليّاً.
  const destination = useMemo(
    () => safeRedirectPath(next, isAdmin ? "/admin/dashboard" : "/profile"),
    [next, isAdmin],
  )

  // مستخدم مسجّل مسبقاً → لا نُبقيه في صفحة الدخول
  useEffect(() => {
    if (initialized && user && !isRecovery) {
      navigate(destination, { replace: true })
    }
  }, [initialized, user, isRecovery, destination, navigate])

  const go = (path: string) => {
    if (onNavigate) onNavigate(path)
    else navigate(path)
  }

  const switchMode = (nextMode: Mode) => {
    setError(null)
    setNotice(null)
    setMode(nextMode)
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    url.searchParams.set("mode", nextMode)
    window.history.replaceState({}, "", url.toString())
  }

  const consentRequired = !alreadyConsented && !isRecovery && mode !== "password"
  const CONSENT_ERROR = "يجب الموافقة على سياسة الخصوصية والشروط والأحكام للمتابعة."

  /**
   * يلتقط الموافقة *قبل* استدعاء الشبكة: مسار Google يغادر الصفحة ويعود
   * إليها، فلو انتظرنا النجاح لضاع وقت الموافقة.
   */
  const ensureConsent = (method: "email" | "google"): boolean => {
    if (!consentRequired) return true
    if (!agreed) {
      setError(CONSENT_ERROR)
      return false
    }
    captureConsent(method)
    return true
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setNotice(null)

    if (mode === "password" && !isRecovery) {
      if (!email.trim()) {
        setError("أدخل بريدك الإلكتروني لإرسال رابط الاستعادة.")
        return
      }
      setLoading(true)
      const result = await resetPassword(email)
      setLoading(false)
      if (result.error) {
        setError(result.error)
        return
      }
      setNotice("أرسلنا رابط استعادة كلمة المرور إلى بريدك — افتحه لإكمال العملية.")
      return
    }

    if (password.length < MIN_PASSWORD) {
      setError(`كلمة المرور يجب أن تكون ${MIN_PASSWORD} أحرف على الأقل.`)
      return
    }

    setLoading(true)

    if (mode === "signup") {
      if (!ensureConsent("email")) return
      let chosenUsername = username.trim().toLowerCase()
      if (chosenUsername) {
        const check = validateUsername(chosenUsername)
        if (!check.ok) {
          setLoading(false)
          setError("اسم المستخدم يجب أن يكون 3-30 حرفاً: أحرف لاتينية صغيرة وأرقام و _ فقط.")
          return
        }
        chosenUsername = check.value
      }
      const nameCheck = fullName.trim() ? validateDisplayName(fullName) : null
      if (nameCheck && !nameCheck.ok) {
        setLoading(false)
        setError("الاسم الكامل غير صالح (2-50 حرفاً، بلا رموز).")
        return
      }

      const result = await signUp({
        email,
        password,
        fullName: nameCheck?.value ?? fullName.trim(),
        username: chosenUsername || undefined,
      })
      setLoading(false)
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.needsEmailConfirmation) {
        setNotice("تم إنشاء الحساب. افتح رابط التأكيد في بريدك ثم سجّل الدخول — بروفايلك ورتبتك D أُنشئا تلقائياً.")
        setMode("signin")
        return
      }
      navigate(destination, { replace: true })
      return
    }

    // تسجيل الدخول (أو تعيين كلمة مرور جديدة في وضع Recovery)
    if (isRecovery) {
      try {
        const { supabase } = await import("@/lib/supabase/client")
        const { error: updateError } = await supabase.auth.updateUser({ password })
        if (updateError) {
          // كانت updateError.message تُعرض كما وردت من الخادم، وقد تحمل
          // تفاصيل داخلية. تمرّ الآن عبر نفس مُعرِّب الأخطاء المعتمد.
          setError(describeAuthError(updateError))
          return
        }
        setNotice("تم تحديث كلمة المرور — يمكنك الآن متابعة استخدام حسابك.")
        navigate(destination, { replace: true })
      } catch {
        // لا نُظهر رسالة الاستثناء الخام: قد تكشف مسارات أو تفاصيل داخلية.
        setError("تعذّر تحديث كلمة المرور. حاول مجدداً أو اطلب رابط استعادة جديداً.")
      } finally {
        setLoading(false)
      }
      return
    }

    const result = await signIn(email, password)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    go(destination)
  }

  const handleGoogle = async () => {
    setError(null)
    if (!ensureConsent("google")) return
    setLoading(true)
    // لا نلصق الوجهة الخام بعد الأصل: إن احتوت // أو مخطّطاً ينتج رابط
    // مشوّه أو خارج النطاق. safeRedirectUrl تتحقق ثم تبني.
    const result = await signInWithGoogle(
      typeof window === "undefined"
        ? undefined
        : safeRedirectUrl(next, isAdmin ? "/admin/dashboard" : "/profile"),
    )
    setLoading(false)
    if (result.error) setError(result.error)
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-background py-2.5 pr-10 pl-4 text-xs text-foreground outline-none transition focus:border-primary"

  /**
   * خانة الموافقة الإلزامية.
   * تُعرض فقط حين تكون مطلوبة فعلاً: في وضع "حساب جديد" أمام زر الإنشاء،
   * وفي وضع الدخول أمام زر Google (لأن Google قد ينشئ حساباً جديداً).
   */
  const consentRow = consentRequired ? (
    <div className="rounded-xl border border-border bg-muted/40 p-3">
      <label htmlFor="legalConsent" className="flex cursor-pointer items-start gap-2.5">
        <input
          id="legalConsent"
          type="checkbox"
          required
          checked={agreed}
          onChange={(event) => {
            setAgreed(event.target.checked)
            if (event.target.checked) setError(null)
          }}
          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
        />
        <span className="text-[11px] leading-6 text-muted-foreground">
          أوافق على{" "}
          <Link
            to="/privacy"
            target="_blank"
            rel="noreferrer"
            className="font-bold text-primary underline"
          >
            سياسة الخصوصية
          </Link>{" "}
          و{" "}
          <Link
            to="/terms"
            target="_blank"
            rel="noreferrer"
            className="font-bold text-primary underline"
          >
            الشروط والأحكام
          </Link>
          . أعلم أن حسابي ينشئ <strong className="text-foreground">بروفايلاً عاماً</strong> برتبة D
          يمكنني إخفاؤه لاحقاً من بروفايلي.
          <span className="mt-1 block text-[10px] text-muted-foreground/80">
            نُسجّل موافقتك مع التاريخ ونسخة السياسة ({POLICY_VERSION}) كإثبات قانوني.
          </span>
        </span>
      </label>
    </div>
  ) : alreadyConsented && !isRecovery && mode !== "password" ? (
    <p className="flex items-start gap-1.5 text-[10.5px] leading-5 text-muted-foreground">
      <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
      <span>
        موافقتك على سياسة الخصوصية مسجّلة لهذه النسخة ({POLICY_VERSION}).
      </span>
    </p>
  ) : null

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12" dir="rtl">
      <AEOHead
        title="تسجيل الدخول أو إنشاء حساب — ميزان الرقمية"
        description="أنشئ حسابك على ميزان الرقمية عبر Supabase Auth: بروفايل عام مخصص، رتبة من D إلى SSS، ونقاط خبرة تُحفظ عبر كل أجهزتك."
        directAnswer="تسجيل الدخول في ميزان الرقمية يتم بالبريد الإلكتروني وكلمة المرور أو عبر حساب Google، ويُنشئ لك بروفايلًا عاماً برتبة مبتدئ D."
        canonicalUrl="https://www.mizan.page/login"
        noindex
      />

      <div className="w-full max-w-md space-y-6">
        <button
          onClick={() => go("/")}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground transition hover:text-foreground"
        >
          <ArrowRight className="size-4" />
          العودة للرئيسية
        </button>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
          <div className="space-y-2 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="size-6" />
            </div>
            <h1 className="text-xl font-black text-foreground">
              {isRecovery ? "تعيين كلمة مرور جديدة" : mode === "signup" ? "إنشاء حساب ميزان" : "الدخول إلى ميزان"}
            </h1>
            <p className="text-xs leading-6 text-muted-foreground">
              {isRecovery
                ? "أدخل كلمة المرور الجديدة لحسابك."
                : mode === "signup"
                  ? "حسابك ينشئ تلقائياً بروفايلًا عاماً (mizan.page/u/اسمك) ورتبة مبتدئ D."
                  : "بروفايلك ورتبتك ونقاط خبرتك محفوظة في حسابك عبر كل الأجهزة."}
            </p>
          </div>

          {/* مبدّل الوضع */}
          {!isRecovery && (
            <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className={`rounded-lg py-2 text-[12px] font-extrabold transition ${
                  mode === "signin" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                تسجيل الدخول
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={`rounded-lg py-2 text-[12px] font-extrabold transition ${
                  mode === "signup" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                حساب جديد
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-bold text-destructive">
              {error}
            </div>
          )}
          {notice && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <Check className="mt-0.5 size-4 shrink-0" />
              <span className="leading-6">{notice}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && !isRecovery && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground" htmlFor="fullName">
                    الاسم الكامل
                  </label>
                  <div className="relative">
                    <UserRound className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="أمينة بنعلي"
                      maxLength={INPUT_LIMITS.DISPLAY_NAME_MAX}
                      autoComplete="name"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground" htmlFor="username">
                    اسم المستخدم (اختياري) — رابطك العام
                  </label>
                  <div className="relative">
                    <AtSign className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/\s+/g, "_"))}
                      placeholder="amina_law"
                      maxLength={30}
                      dir="ltr"
                      autoComplete="username"
                      className={`${inputClass} text-left`}
                    />
                  </div>
                  <p className="text-[10.5px] text-muted-foreground">
                    3-30 حرفاً (a-z، 0-9، _). إن تركته فارغاً نقترح واحداً من بريدك، ويمكنك تغييره لاحقاً من بروفايلك.
                  </p>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground" htmlFor="email">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@mizan.page"
                  autoComplete="email"
                  dir="ltr"
                  className={`${inputClass} pl-4 text-left`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground" htmlFor="password">
                {isRecovery || mode === "password" ? "كلمة المرور الجديدة" : "كلمة المرور"}
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required={mode !== "password" || isRecovery}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  minLength={MIN_PASSWORD}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  dir="ltr"
                  className={`${inputClass} pl-10 text-left`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {mode === "signup" && consentRow}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:brightness-110 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  جارٍ المعالجة...
                </>
              ) : isRecovery ? (
                "حفظ كلمة المرور الجديدة"
              ) : mode === "signup" ? (
                "إنشاء الحساب والبروفايل"
              ) : mode === "password" ? (
                "إرسال رابط الاستعادة"
              ) : (
                "تسجيل الدخول"
              )}
            </button>
          </form>

          {!isRecovery && mode !== "password" && (
            <>
              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-[10.5px] font-bold text-muted-foreground">أو</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              {mode === "signin" && consentRow}

              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background py-2.5 text-xs font-bold text-foreground transition hover:bg-muted disabled:opacity-50"
              >
                <GoogleIcon />
                المتابعة عبر Google
              </button>
            </>
          )}

          <div className="mt-5 flex items-center justify-between text-[11px] font-bold">
            {mode !== "password" && !isRecovery ? (
              <button type="button" onClick={() => switchMode("password")} className="text-muted-foreground transition hover:text-foreground">
                نسيت كلمة المرور؟
              </button>
            ) : (
              <button type="button" onClick={() => switchMode("signin")} className="text-muted-foreground transition hover:text-foreground">
                العودة لتسجيل الدخول
              </button>
            )}
            <Link to="/privacy" className="text-muted-foreground transition hover:text-foreground">
              سياسة الخصوصية
            </Link>
          </div>
        </div>

        {/* سلم الرتب — يُذكّر المستخدم بأن الحساب يفتح مسار الرتب كاملاً */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[11.5px] font-black text-foreground">ماذا يفتح لك الحساب؟</p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {RANKS.map((rank) => (
              <li
                key={rank.id}
                title={`${rank.label} — ${rank.minXp} XP${rank.maxXp ? ` إلى ${rank.maxXp}` : "+"}`}
                className={`rounded-lg border px-2 py-1 text-[10.5px] font-black ${rank.chip}`}
              >
                {rank.glyph}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10.5px] leading-6 text-muted-foreground">
            تبدأ برتبة <strong className="text-foreground">D (مبتدئ)</strong> وتصعد حتى{" "}
            <strong className="text-foreground">SSS (النخبة العليا)</strong> بنقاط الخبرة من الاختبارات. الرتبة تُطبق
            على بروفايلك تلقائياً وتفتح صلاحيات حقيقية (نشر المقالات، شهادة التوصية، لوحة الاستشارات).
          </p>
        </div>
      </div>
    </div>
  )
}
