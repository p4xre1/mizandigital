import { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, User, ShieldAlert } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { trackEvent } from "../../lib/analytics";
import { isValidEmail, sanitizeText, throttle } from "../../lib/security";
import { TurnstileCaptcha } from "./TurnstileCaptcha";
import { useI18n, sansFont, useLocalizedPath } from "../../lib/i18n";

interface SignupFormProps {
  onSwitchTab: (tab: "login") => void;
  setGlobalError: (message: string) => void;
  setGlobalSuccess: (message: string) => void;
}

export function SignupForm({
  onSwitchTab,
  setGlobalError,
  setGlobalSuccess,
}: SignupFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Security & Throttle States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const { lang, dir } = useI18n();
  const localizedPath = useLocalizedPath();

  const MAX_ATTEMPTS = 5;
  const isLockedOut = failedAttempts >= MAX_ATTEMPTS;

  useEffect(() => {
    setError("");
    setGlobalError("");
  }, [setGlobalError]);

  const resetCaptcha = () => {
    setCaptchaToken(null);
    setTurnstileKey((prev) => prev + 1);
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setGlobalError("");

    if (isLockedOut) {
      setError(
        lang === "ar"
          ? "تم حظر النموذج مؤقتاً لدواعٍ أمنية."
          : "Form locked temporarily due to too many failed attempts."
      );
      return;
    }

    const cleanName = sanitizeText(name, 120);
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2) {
      setError(lang === "ar" ? "الرجاء إدخال اسم صحيح." : "Please enter a valid name.");
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError(lang === "ar" ? "عنوان البريد الإلكتروني غير صالح." : "Invalid email address.");
      return;
    }

    // 🔒 Supabase 8-Character Minimum Requirement
    if (password.length < 8) {
      const msg =
        lang === "ar"
          ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل."
          : lang === "fr"
          ? "Le mot de passe doit contenir au moins 8 caractères."
          : lang === "es"
          ? "La contraseña debe tener al menos 8 caracteres."
          : "Password must be at least 8 characters.";
      setError(msg);
      return;
    }

    if (!acceptedTerms) {
      setError(
        lang === "ar"
          ? "الرجاء الموافقة على شروط الخدمة وسياسة الخصوصية."
          : "Please accept the Terms of Service and Privacy Policy."
      );
      return;
    }

    // Throttle client-side signups
    const wait = throttle("signup_attempt", 30_000);
    if (wait > 0) {
      setError(
        lang === "ar"
          ? "الرجاء الانتظار قليلاً قبل المحاولة مجدداً."
          : "Please wait before attempting again."
      );
      return;
    }

    if (!captchaToken) {
      setError(
        lang === "ar"
          ? "الرجاء إكمال التحقق الأمني أولاً."
          : "Please complete security verification first."
      );
      return;
    }

    setLoading(true);

    if (!isSupabaseConfigured) {
      setError("Supabase configuration is missing environment keys.");
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error: err } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { full_name: cleanName },
          captchaToken,
        },
      });

      // 🛡️ Prevent duplicate account creation with same email
      if (err) {
        if (
          err.message.toLowerCase().includes("already registered") ||
          err.status === 400
        ) {
          throw new Error(
            lang === "ar"
              ? "هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول."
              : "This email is already registered. Please sign in."
          );
        }
        throw err;
      }

      // Catch implicit duplicate email responses from Supabase Auth
      if (authData?.user?.identities?.length === 0) {
        throw new Error(
          lang === "ar"
            ? "هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول."
            : "This email is already registered. Please sign in."
        );
      }

      // Assign default 'member' role in Supabase profiles
      if (authData?.user) {
        await supabase.from("profiles").upsert(
          {
            id: authData.user.id,
            email: authData.user.email,
            role: "member",
          },
          { onConflict: "id" }
        );

        // Update local session storage for active navbar account icon
        localStorage.setItem(
          "mizan_user",
          JSON.stringify({
            id: authData.user.id,
            email: authData.user.email,
            name: cleanName || authData.user.email?.split("@")[0] || "Member",
          })
        );
      }

      trackEvent("sign_up", { method: "email" });

      const successMsg =
        lang === "ar"
          ? "تم إنشاء الحساب بنجاح! جاري التوجيه..."
          : "Account created successfully! Redirecting...";

      setGlobalSuccess(successMsg);

      // Auto redirect to home page
      setTimeout(() => {
        window.location.href = localizedPath("/");
      }, 500);

    } catch (err: unknown) {
      const fallbackMsg =
        lang === "ar" ? "حدث خطأ أثناء التسجيل." : "An error occurred during registration.";
      const message = err instanceof Error ? err.message : fallbackMsg;

      setFailedAttempts((prev) => prev + 1);
      setError(message);
      setGlobalError(message);
      resetCaptcha();
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSignup}
      className="space-y-4"
      dir={dir}
      style={{ fontFamily: sansFont(lang) }}
    >
      {isLockedOut && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-red-700 dark:text-red-400 text-xs font-bold mb-4">
          <ShieldAlert size={16} />
          {lang === "ar"
            ? "تم قفل النموذج مؤقتاً بسبب محاولات متكررة. يرجى تحديث الصفحة لاحقاً."
            : "Form locked due to multiple failed attempts. Please refresh to try again."}
        </div>
      )}

      {/* Full Name */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          {lang === "ar" && "الاسم الكامل"}
          {lang === "fr" && "Nom complet"}
          {lang === "en" && "Full Name"}
          {lang === "es" && "Nombre completo"}
        </label>
        <div className="relative">
          <User
            size={16}
            className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${
              dir === "rtl" ? "right-3.5" : "left-3.5"
            }`}
          />
          <input
            required
            disabled={isLockedOut || loading}
            maxLength={120}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={lang === "ar" ? "الاسم الكامل" : "John Doe"}
            className={`w-full py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-colors disabled:opacity-50 ${
              dir === "rtl" ? "pr-10 pl-3.5" : "pl-10 pr-3.5"
            }`}
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          {lang === "ar" && "البريد الإلكتروني"}
          {lang === "fr" && "Adresse e-mail"}
          {lang === "en" && "Email address"}
          {lang === "es" && "Correo electrónico"}
        </label>
        <div className="relative">
          <Mail
            size={16}
            className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${
              dir === "rtl" ? "right-3.5" : "left-3.5"
            }`}
          />
          <input
            required
            disabled={isLockedOut || loading}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className={`w-full py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-colors disabled:opacity-50 ${
              dir === "rtl" ? "pr-10 pl-3.5" : "pl-10 pr-3.5"
            }`}
            dir="ltr"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          {lang === "ar" && "كلمة المرور"}
          {lang === "fr" && "Mot de passe"}
          {lang === "en" && "Password"}
          {lang === "es" && "Contraseña"}
        </label>
        <div className="relative">
          <Lock
            size={16}
            className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${
              dir === "rtl" ? "right-3.5" : "left-3.5"
            }`}
          />
          <input
            required
            disabled={isLockedOut || loading}
            minLength={8}
            maxLength={128}
            type={showPass ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={`w-full py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-colors disabled:opacity-50 ${
              dir === "rtl" ? "pr-10 pl-10" : "pl-10 pr-10"
            }`}
            dir="ltr"
          />
          <button
            type="button"
            disabled={isLockedOut}
            onClick={() => setShowPass(!showPass)}
            className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50 ${
              dir === "rtl" ? "left-3.5" : "right-3.5"
            }`}
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Terms Checkbox */}
      <div className="flex items-start gap-2 pt-1">
        <input
          id="terms-checkbox"
          type="checkbox"
          disabled={isLockedOut || loading}
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-700 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
        />
        <label
          htmlFor="terms-checkbox"
          className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer"
        >
          {lang === "ar" && (
            <>
              أوافق على{" "}
              <a href={localizedPath("/about")} className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">شروط الخدمة</a>
              {" "}و{" "}
              <a href={localizedPath("/about")} className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">سياسة الخصوصية</a>.
            </>
          )}
          {lang === "en" && (
            <>
              I agree to the{" "}
              <a href={localizedPath("/about")} className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">Terms of Service</a>
              {" "}and{" "}
              <a href={localizedPath("/about")} className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">Privacy Policy</a>.
            </>
          )}
        </label>
      </div>

      {/* Captcha Widget */}
      {!isLockedOut && (
        <div className="flex justify-center my-3 min-h-[65px]" dir="ltr">
          <TurnstileCaptcha
            key={turnstileKey}
            onVerify={(token) => setCaptchaToken(token)}
            onExpire={() => setCaptchaToken(null)}
            onError={() => {
              setCaptchaToken(null);
              setError(lang === "ar" ? "فشل التحقق الأمني. الرجاء المحاولة مجدداً." : "Security verification failed.");
            }}
            theme="auto"
          />
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 text-center font-bold px-2 py-1 bg-red-50 dark:bg-red-950/30 rounded-lg">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !captchaToken || !acceptedTerms || isLockedOut}
        className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
      >
        {loading
          ? lang === "ar" ? "جاري إنشاء الحساب..." : "Creating Account..."
          : lang === "ar" ? "إنشاء الحساب" : "Create Account"}
      </button>

      <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
        {lang === "ar" ? "لديك حساب بالفعل؟ " : "Already have an account? "}
        <button
          type="button"
          disabled={loading}
          className="text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer disabled:opacity-50"
          onClick={() => onSwitchTab("login")}
        >
          {lang === "ar" ? "تسجيل الدخول" : "Sign In"}
        </button>
      </p>
    </form>
  );
}