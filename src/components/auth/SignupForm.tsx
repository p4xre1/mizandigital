import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, User, ShieldAlert } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";
import { isValidEmail, sanitizeText, throttle } from "@/lib/security";
import { TurnstileCaptcha } from "./TurnstileCaptcha";
import { useI18n, sansFont, useLocalizedPath, type Lang } from "@/lib/i18n";

interface SignupFormProps {
  onSwitchTab: (tab: "login") => void;
  setGlobalError: (message: string) => void;
  setGlobalSuccess: (message: string) => void;
}

// noinspection SpellCheckingInspection
const translations: Record<
    Lang,
    {
      nameLabel: string;
      emailLabel: string;
      passwordLabel: string;
      namePlaceholder: string;
      lockedMessage: string;
      lockedBanner: string;
      invalidName: string;
      invalidEmail: string;
      shortPassword: string;
      acceptTermsRequired: string;
      throttleWait: string;
      captchaRequired: string;
      captchaFailed: string;
      missingConfig: string;
      alreadyRegistered: string;
      termsAgree: string;
      terms: string;
      and: string;
      privacy: string;
      successMsg: string;
      submitting: string;
      submit: string;
      alreadyHaveAccount: string;
      signIn: string;
      fallbackErr: string;
    }
> = {
  ar: {
    nameLabel: "الاسم الكامل",
    emailLabel: "البريد الإلكتروني",
    passwordLabel: "كلمة المرور",
    namePlaceholder: "الاسم الكامل",
    lockedMessage: "تم حظر النموذج مؤقتاً لدواعٍ أمنية.",
    lockedBanner: "تم قفل النموذج مؤقتاً بسبب محاولات متكررة. يرجى تحديث الصفحة لاحقاً.",
    invalidName: "الرجاء إدخال اسم صحيح (حرفين على الأقل).",
    invalidEmail: "عنوان البريد الإلكتروني غير صالح.",
    shortPassword: "كلمة المرور يجب أن تكون 8 أحرف على الأقل.",
    acceptTermsRequired: "الرجاء الموافقة على شروط الخدمة وسياسة الخصوصية.",
    throttleWait: "الرجاء الانتظار قليلاً قبل المحاولة مجدداً.",
    captchaRequired: "الرجاء إكمال التحقق الأمني أولاً.",
    captchaFailed: "فشل التحقق الأمني. الرجاء المحاولة مجدداً.",
    missingConfig: "Supabase غير مُهيّأ — أضف مفاتيح البيئة لتفعيل التسجيل.",
    alreadyRegistered: "هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.",
    termsAgree: "أوافق على ",
    terms: "شروط الخدمة",
    and: " و ",
    privacy: "سياسة الخصوصية",
    successMsg: "تم إنشاء الحساب بنجاح! جاري التوجيه...",
    submitting: "جاري إنشاء الحساب...",
    submit: "إنشاء الحساب",
    alreadyHaveAccount: "لديك حساب بالفعل؟ ",
    signIn: "تسجيل الدخول",
    fallbackErr: "حدث خطأ أثناء التسجيل.",
  },
  fr: {
    nameLabel: "Nom complet",
    emailLabel: "Adresse e-mail",
    passwordLabel: "Mot de passe",
    namePlaceholder: "John Doe",
    lockedMessage: "Formulaire verrouillé temporairement pour des raisons de sécurité.",
    lockedBanner: "Formulaire verrouillé suite à plusieurs échecs. Veuillez réessayer plus tard.",
    invalidName: "Veuillez entrer un nom valide (au moins 2 caractères).",
    invalidEmail: "Adresse email invalide.",
    shortPassword: "Le mot de passe doit contenir au moins 8 caractères.",
    acceptTermsRequired: "Veuillez accepter les conditions d'utilisation et la politique de confidentialité.",
    throttleWait: "Veuillez patienter avant de réessayer.",
    captchaRequired: "Veuillez effectuer la vérification de sécurité.",
    captchaFailed: "Échec de la vérification de sécurité.",
    missingConfig: "Configuration Supabase manquante.",
    alreadyRegistered: "Cet e-mail est déjà enregistré. Veuillez vous connecter.",
    termsAgree: "J'accepte les ",
    terms: "Conditions d'utilisation",
    and: " et la ",
    privacy: "Politique de confidentialité",
    successMsg: "Compte créé avec succès ! Redirection...",
    submitting: "Création du compte...",
    submit: "S'inscrire",
    alreadyHaveAccount: "Vous avez déjà un compte ? ",
    signIn: "Se connecter",
    fallbackErr: "Une erreur est survenue lors de l'inscription.",
  },
  en: {
    nameLabel: "Full Name",
    emailLabel: "Email address",
    passwordLabel: "Password",
    namePlaceholder: "John Doe",
    lockedMessage: "Form locked temporarily due to security measures.",
    lockedBanner: "Form locked due to multiple failed attempts. Please refresh to try again.",
    invalidName: "Please enter a valid name (at least 2 characters).",
    invalidEmail: "Invalid email address.",
    shortPassword: "Password must be at least 8 characters.",
    acceptTermsRequired: "Please accept the Terms of Service and Privacy Policy.",
    throttleWait: "Please wait before attempting again.",
    captchaRequired: "Please complete security verification first.",
    captchaFailed: "Security verification failed. Please try again.",
    missingConfig: "Supabase configuration is missing environment keys.",
    alreadyRegistered: "This email is already registered. Please sign in.",
    termsAgree: "I agree to the ",
    terms: "Terms of Service",
    and: " and ",
    privacy: "Privacy Policy",
    successMsg: "Account created successfully! Redirecting...",
    submitting: "Creating Account...",
    submit: "Create Account",
    alreadyHaveAccount: "Already have an account? ",
    signIn: "Sign In",
    fallbackErr: "An error occurred during registration.",
  },
  es: {
    nameLabel: "Nombre completo",
    emailLabel: "Correo electrónico",
    passwordLabel: "Contraseña",
    namePlaceholder: "Juan Pérez",
    lockedMessage: "Formulario bloqueado temporalmente por razones de seguridad.",
    lockedBanner: "Formulario bloqueado tras varios intentos fallidos. Por favor, actualice la página.",
    invalidName: "Por favor ingrese un nombre válido (al menos 2 caracteres).",
    invalidEmail: "Correo electrónico no válido.",
    shortPassword: "La contraseña debe tener al menos 8 caracteres.",
    acceptTermsRequired: "Por favor acepte los Términos de Servicio y la Política de Privacidad.",
    throttleWait: "Por favor espere antes de intentarlo de nuevo.",
    captchaRequired: "Por favor complete la verificación de seguridad.",
    captchaFailed: "Verificación de seguridad fallida.",
    missingConfig: "Falta la configuración de Supabase.",
    alreadyRegistered: "Este correo ya está registrado. Por favor inicie sesión.",
    termsAgree: "Acepto los ",
    terms: "Términos del Servicio",
    and: " y la ",
    privacy: "Política de Privacidad",
    successMsg: "¡Cuenta creada con éxito! Redirigiendo...",
    submitting: "Creando cuenta...",
    submit: "Crear cuenta",
    alreadyHaveAccount: "¿Ya tienes una cuenta? ",
    signIn: "Iniciar sesión",
    fallbackErr: "Ocurrió un error durante el registro.",
  },
};

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const { lang, dir } = useI18n();
  const navigate = useNavigate();
  const localizedPath = useLocalizedPath();
  const t = translations[lang] || translations.ar;

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

  const handleSignup = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setGlobalError("");

    if (isLockedOut) {
      setError(t.lockedMessage);
      return;
    }

    const cleanName = sanitizeText(name, 120);
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2) {
      setError(t.invalidName);
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError(t.invalidEmail);
      return;
    }

    if (password.length < 8) {
      setError(t.shortPassword);
      return;
    }

    if (!acceptedTerms) {
      setError(t.acceptTermsRequired);
      return;
    }

    const wait = throttle("signup_attempt", 30_000);
    if (wait > 0) {
      setError(t.throttleWait);
      return;
    }

    if (!captchaToken) {
      setError(t.captchaRequired);
      return;
    }

    setLoading(true);

    if (!isSupabaseConfigured) {
      setError(t.missingConfig);
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { full_name: cleanName },
          captchaToken,
        },
      });

      if (authErr) {
        const isDuplicate =
            authErr.message.toLowerCase().includes("already registered") ||
            authErr.status === 400;

        const msg = isDuplicate ? t.alreadyRegistered : authErr.message || t.fallbackErr;
        setFailedAttempts((prev) => prev + 1);
        setError(msg);
        setGlobalError(msg);
        resetCaptcha();
        setLoading(false);
        return;
      }

      if (authData?.user?.identities?.length === 0) {
        setFailedAttempts((prev) => prev + 1);
        setError(t.alreadyRegistered);
        setGlobalError(t.alreadyRegistered);
        resetCaptcha();
        setLoading(false);
        return;
      }

      if (authData?.user) {
        const profilesTable = supabase.from("profiles") as any;

        await profilesTable.upsert(
            {
              id: authData.user.id,
              email: authData.user.email,
              role: "member",
            },
            { onConflict: "id" }
        );

        // noinspection SpellCheckingInspection
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
      setGlobalSuccess(t.successMsg);

      setTimeout(() => {
        navigate(localizedPath("/"));
      }, 500);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t.fallbackErr;
      setFailedAttempts((prev) => prev + 1);
      setError(message);
      setGlobalError(message);
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const isRtl = dir === "rtl";

  return (
      <form
          onSubmit={handleSignup}
          className="space-y-4"
          dir={dir}
          style={{ fontFamily: sansFont(lang) }}
      >
        {isLockedOut && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-red-700 dark:text-red-400 text-xs font-bold mb-4">
              <ShieldAlert size={16} className="shrink-0" />
              <span>{t.lockedBanner}</span>
            </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {t.nameLabel}
          </label>
          <div className="relative">
            <User
                size={16}
                className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                    isRtl ? "right-3.5" : "left-3.5"
                }`}
            />
            <input
                required
                disabled={isLockedOut || loading}
                maxLength={120}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.namePlaceholder}
                className={`w-full py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-colors disabled:opacity-50 ${
                    isRtl ? "pr-10 pl-3.5" : "pl-10 pr-3.5"
                }`}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {t.emailLabel}
          </label>
          <div className="relative">
            <Mail
                size={16}
                className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                    isRtl ? "right-3.5" : "left-3.5"
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
                    isRtl ? "pr-10 pl-3.5" : "pl-10 pr-3.5"
                }`}
                dir="ltr"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {t.passwordLabel}
          </label>
          <div className="relative">
            <Lock
                size={16}
                className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                    isRtl ? "right-3.5" : "left-3.5"
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
                className="w-full py-2.5 px-10 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-colors disabled:opacity-50"
                dir="ltr"
            />
            <button
                type="button"
                disabled={isLockedOut}
                onClick={() => setShowPass(!showPass)}
                aria-label="Toggle password visibility"
                className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center disabled:opacity-50 ${
                    isRtl ? "left-2.5" : "right-2.5"
                }`}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

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
              className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none"
          >
            {t.termsAgree}
            <Link to={localizedPath("/legal#terms")} className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
              {t.terms}
            </Link>
            {t.and}
            <Link to={localizedPath("/legal#privacy")} className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
              {t.privacy}
            </Link>
            .
          </label>
        </div>

        {!isLockedOut && (
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
        )}

        {error && (
            <p className="text-xs text-red-500 text-center font-bold px-2 py-1 bg-red-50 dark:bg-red-950/30 rounded-lg animate-in fade-in-50">
              {error}
            </p>
        )}

        <button
            type="submit"
            disabled={loading || !captchaToken || !acceptedTerms || isLockedOut}
            className="w-full min-h-[44px] py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer flex items-center justify-center"
        >
          {loading ? t.submitting : t.submit}
        </button>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
          {t.alreadyHaveAccount}
          <button
              type="button"
              disabled={loading}
              className="text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer disabled:opacity-50 inline-flex items-center min-h-[32px]"
              onClick={() => onSwitchTab("login")}
          >
            {t.signIn}
          </button>
        </p>
      </form>
  );
}