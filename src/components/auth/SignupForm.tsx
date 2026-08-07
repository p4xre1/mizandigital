/* eslint-disable */
// noinspection SpellCheckingInspection
/* cspell:disable */

import { useState, useEffect, useMemo, useCallback, SyntheticEvent } from "react";
import { Mail, Lock, User, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { isValidEmail, throttle } from "@/lib/security";
import { TurnstileCaptcha } from "./TurnstileCaptcha";
import { useI18n, sansFont } from "@/lib/i18n";

interface SignupFormProps {
  onSwitchTab: (tab: "login") => void;
  onSuccess?: () => void;
  setGlobalError: (message: string) => void;
  setGlobalSuccess: (message: string) => void;
}

// ─── Translations ─────────────────────────────────────────────
const translations = {
  ar: {
    fullNameLabel: "الاسم الكامل",
    emailLabel: "البريد الإلكتروني",
    passwordLabel: "كلمة المرور",
    confirmPasswordLabel: "تأكيد كلمة المرور",
    invalidEmail: "عنوان البريد الإلكتروني غير صالح.",
    weakPassword: "كلمة المرور ضعيفة: يجب أن تكون 8 أحرف على الأقل، وتحتوي على حرف كبير، حرف صغير، رقم، ورمز خاص.",
    passwordsMismatch: "كلمتا المرور غير متطابقتين.",
    captchaRequired: "الرجاء إكمال التحقق الأمني أولاً.",
    captchaFailed: "فشل التحقق الأمني. الرجاء المحاولة مجدداً.",
    missingConfig: "Supabase غير مُهيّأ — أضف مفاتيح البيئة.",
    signupFailed: "فشل إنشاء الحساب.",
    emailTaken: "هذا البريد الإلكتروني مسجل مسبقاً.",
    success: "تم إنشاء الحساب بنجاح! جاري تسجيل الدخول...",
    creating: "جاري إنشاء الحساب...",
    submitBtn: "إنشاء حساب جديد",
    hasAccount: "لديك حساب بالفعل؟",
    loginNow: "تسجيل الدخول",
    strength: {
      minLength: "8+ أحرف",
      upper: "حرف كبير",
      lower: "حرف صغير",
      number: "رقم",
      special: "رمز خاص",
    },
  },
  fr: {
    fullNameLabel: "Nom complet",
    emailLabel: "Adresse e-mail",
    passwordLabel: "Mot de passe",
    confirmPasswordLabel: "Confirmer le mot de passe",
    invalidEmail: "Adresse email invalide.",
    weakPassword: "Mot de passe faible : 8 car. min, majuscule, minuscule, chiffre et symbole requis.",
    passwordsMismatch: "Les mots de passe ne correspondent pas.",
    captchaRequired: "Veuillez effectuer la vérification de sécurité.",
    captchaFailed: "Échec de la vérification de sécurité. Veuillez réessayer.",
    missingConfig: "Configuration Supabase manquante.",
    signupFailed: "Échec de la création du compte.",
    emailTaken: "Cette adresse e-mail est déjà utilisée.",
    success: "Compte créé avec succès ! Connexion en cours...",
    creating: "Création du compte...",
    submitBtn: "Créer un compte",
    hasAccount: "Vous avez déjà un compte ?",
    loginNow: "Se connecter",
    strength: {
      minLength: "8+ caractères",
      upper: "Majuscule",
      lower: "Minuscule",
      number: "Chiffre",
      special: "Symbole",
    },
  },
  en: {
    fullNameLabel: "Full Name",
    emailLabel: "Email address",
    passwordLabel: "Password",
    confirmPasswordLabel: "Confirm Password",
    invalidEmail: "Invalid email address.",
    weakPassword: "Weak password: Must be at least 8 characters, include uppercase, lowercase, number, and special character.",
    passwordsMismatch: "Passwords do not match.",
    captchaRequired: "Please complete security verification first.",
    captchaFailed: "Security verification failed. Please try again.",
    missingConfig: "Supabase configuration is missing environment keys.",
    signupFailed: "Failed to create account.",
    emailTaken: "This email is already registered.",
    success: "Account created successfully! Signing you in...",
    creating: "Creating account...",
    submitBtn: "Create Account",
    hasAccount: "Already have an account?",
    loginNow: "Sign In",
    strength: {
      minLength: "8+ chars",
      upper: "Uppercase",
      lower: "Lowercase",
      number: "Number",
      special: "Special",
    },
  },
  es: {
    fullNameLabel: "Nombre completo",
    emailLabel: "Correo electrónico",
    passwordLabel: "Contraseña",
    confirmPasswordLabel: "Confirmar contraseña",
    invalidEmail: "Correo electrónico no válido.",
    weakPassword: "Contraseña débil: mín. 8 caracteres, mayúscula, minúscula, número y símbolo.",
    passwordsMismatch: "Las contraseñas no coinciden.",
    captchaRequired: "Por favor complete la verificación de seguridad.",
    captchaFailed: "Verificación de seguridad fallida. Inténtelo de nuevo.",
    missingConfig: "Falta la configuración de Supabase.",
    signupFailed: "Error al crear la cuenta.",
    emailTaken: "Este correo electrónico ya está registrado.",
    success: "¡Cuenta creada exitosamente! Iniciando sesión...",
    creating: "Creando cuenta...",
    submitBtn: "Crear cuenta",
    hasAccount: "¿Ya tienes una cuenta?",
    loginNow: "Iniciar sesión",
    strength: {
      minLength: "8+ caract.",
      upper: "Mayúscula",
      lower: "Minúscula",
      number: "Número",
      special: "Símbolo",
    },
  },
};

// ─── Password Analysis ───────────────────────────────────────
function analyzePassword(pass: string) {
  return {
    minLength: pass.length >= 8,
    hasUpper: /[A-Z]/.test(pass),
    hasLower: /[a-z]/.test(pass),
    hasNumber: /[0-9]/.test(pass),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>\-_+=\/\[\]\\]/.test(pass),
  };
}

export function SignupForm({
  onSwitchTab,
  onSuccess,
  setGlobalError,
  setGlobalSuccess,
}: SignupFormProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const { lang, dir } = useI18n();
  const t = translations[lang] || translations.ar;

  useEffect(() => {
    setError("");
    setGlobalError("");
    setGlobalSuccess("");
  }, [setGlobalError, setGlobalSuccess]);

  const resetCaptcha = useCallback(() => {
    setCaptchaToken(null);
    setTurnstileKey((prev) => prev + 1);
  }, []);

  const checks = useMemo(() => analyzePassword(password), [password]);
  const allChecksPass = Object.values(checks).every(Boolean);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSignup = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setGlobalError("");

    if (!fullName.trim()) {
      setError(lang === "ar" ? "الرجاء إدخال الاسم الكامل." : "Please enter your full name.");
      return;
    }

    if (!isValidEmail(email)) {
      setError(t.invalidEmail);
      return;
    }

    if (!allChecksPass) {
      setError(t.weakPassword);
      return;
    }

    if (!passwordsMatch) {
      setError(t.passwordsMismatch);
      return;
    }

    if (!captchaToken) {
      setError(t.captchaRequired);
      return;
    }

    if (!isSupabaseConfigured) {
      setError(t.missingConfig);
      return;
    }

    setLoading(true);
    try {
      // ─── 1. Create Auth User ────────────────────────────────
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName.trim() },
          captchaToken,
        },
      });

      if (authError) {
        const msg = authError.message.includes("already registered") ||
                    authError.message.includes("User already registered")
          ? t.emailTaken
          : authError.message || t.signupFailed;
        setError(msg);
        setGlobalError(msg);
        resetCaptcha();
        return;
      }

      if (!authData.user) {
        setError(t.signupFailed);
        setGlobalError(t.signupFailed);
        resetCaptcha();
        return;
      }

      // ─── 2. Create Profile immediately ──────────────────────
      // ⚠️ Honeypot blocks triggers on auth.users, so we create profile here
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: authData.user.id,
          email: authData.user.email,
          role: "member",
          full_name: fullName.trim(),
          bio: "",
          avatar_url: "",
          preferred_lang: lang,
        },
        { onConflict: "id" }
      );

      if (profileError) {
        console.error("Profile creation error:", profileError);
        // Don't block the user — they can still use the site,
        // but log the error for debugging
      }

      setGlobalSuccess(t.success);

      // ─── 3. Auto sign-in if session exists (email confirm off) ─
      if (authData.session) {
        localStorage.setItem(
          "mizan_user",
          JSON.stringify({
            id: authData.user.id,
            email: authData.user.email,
            name: fullName.trim() || authData.user.email?.split("@")[0] || "Member",
          })
        );
        if (onSuccess) onSuccess();
      } else {
        // Email confirmation required — switch to login
        setTimeout(() => onSwitchTab("login"), 2000);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t.signupFailed;
      setError(message);
      setGlobalError(message);
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading;

  return (
    <form
      onSubmit={handleSignup}
      className="space-y-4"
      dir={dir}
      style={{ fontFamily: sansFont(lang) }}
    >
      {/* Full Name */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          {t.fullNameLabel}
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
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
            className={`w-full py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-colors ${
              dir === "rtl" ? "pr-10 pl-3.5" : "pl-10 pr-3.5"
            }`}
            dir="ltr"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          {t.emailLabel}
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
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className={`w-full py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-colors ${
              dir === "rtl" ? "pr-10 pl-3.5" : "pl-10 pr-3.5"
            }`}
            dir="ltr"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          {t.passwordLabel}
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
            minLength={8}
            maxLength={128}
            type={showPass ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={`w-full py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-colors ${
              dir === "rtl" ? "pr-10 pl-10" : "pl-10 pr-10"
            }`}
            dir="ltr"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ${
              dir === "rtl" ? "left-3.5" : "right-3.5"
            }`}
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {/* Password Strength Meter */}
        {password.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(checks).map(([key, valid]) => (
              <span
                key={key}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                  valid
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {valid ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                {t.strength[key as keyof typeof t.strength]}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          {t.confirmPasswordLabel}
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
            minLength={8}
            maxLength={128}
            type={showPass ? "text" : "password"}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className={`w-full py-2.5 text-sm border rounded-xl bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition-colors ${
              confirmPassword.length > 0
                ? passwordsMatch
                  ? "border-emerald-300 dark:border-emerald-700 focus:border-emerald-500"
                  : "border-red-300 dark:border-red-700 focus:border-red-500"
                : "border-slate-200 dark:border-slate-700 focus:border-blue-600"
            } ${dir === "rtl" ? "pr-10 pl-10" : "pl-10 pr-10"}`}
            dir="ltr"
          />
          {confirmPassword.length > 0 && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 ${
                dir === "rtl" ? "left-10" : "right-10"
              }`}
            >
              {passwordsMatch ? (
                <CheckCircle2 size={14} className="text-emerald-500" />
              ) : (
                <XCircle size={14} className="text-red-400" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Turnstile */}
      <div className="flex justify-center my-3 min-h-[65px]" dir="ltr">
        <TurnstileCaptcha
          key={turnstileKey}
          onVerify={(token) => setCaptchaToken(token)}
          onExpire={() => setCaptchaToken(null)}
          onError={() => {
            setCaptchaToken(null);
            setError(t.captchaFailed);
          }}
          theme="auto"
        />
      </div>

      {error && (
        <p className="text-xs text-red-500 text-center font-medium px-2 py-1 bg-red-50 dark:bg-red-950/30 rounded-lg animate-in fade-in-50">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !captchaToken}
        className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed shadow-xs cursor-pointer flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {t.creating}
          </>
        ) : (
          t.submitBtn
        )}
      </button>

      <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
        {t.hasAccount}{" "}
        <button
          type="button"
          className="text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer inline-flex items-center min-h-[32px]"
          onClick={() => onSwitchTab("login")}
        >
          {t.loginNow}
        </button>
      </p>
    </form>
  );
}

export default SignupForm;