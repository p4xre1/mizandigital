import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { isValidEmail } from "@/lib/security";
import { TurnstileCaptcha } from "./TurnstileCaptcha";
import { useI18n, sansFont, type Lang } from "@/lib/i18n";

interface LoginFormProps {
  onSwitchTab: (tab: "signup" | "forgot") => void;
  onSuccess: () => void;
  setGlobalError: (message: string) => void;
  setGlobalSuccess: (message: string) => void;
}

// noinspection SpellCheckingInspection
const translations: Record<
    Lang,
    {
      emailLabel: string;
      passwordLabel: string;
      forgotPass: string;
      invalidEmail: string;
      captchaRequired: string;
      captchaFailed: string;
      missingConfig: string;
      successMsg: string;
      fallbackErr: string;
      submitting: string;
      submit: string;
      noAccount: string;
      createAccount: string;
    }
> = {
  ar: {
    emailLabel: "البريد الإلكتروني",
    passwordLabel: "كلمة المرور",
    forgotPass: "نسيت كلمة المرور؟",
    invalidEmail: "عنوان البريد الإلكتروني غير صالح.",
    captchaRequired: "الرجاء إكمال التحقق الأمني أولاً.",
    captchaFailed: "فشل التحقق الأمني. الرجاء المحاولة مجدداً.",
    missingConfig: "Supabase غير مُهيّأ — أضف مفاتيح البيئة لتفعيل تسجيل الدخول.",
    successMsg: "تم تسجيل الدخول بنجاح!",
    fallbackErr: "فشل تسجيل الدخول. تحقق من بياناتك وحاول مجدداً.",
    submitting: "جاري تسجيل الدخول...",
    submit: "تسجيل الدخول",
    noAccount: "ليس لديك حساب؟",
    createAccount: "إنشاء حساب جديد",
  },
  fr: {
    emailLabel: "Adresse e-mail",
    passwordLabel: "Mot de passe",
    forgotPass: "Mot de passe oublié ?",
    invalidEmail: "Adresse email invalide.",
    captchaRequired: "Veuillez effectuer la vérification de sécurité.",
    captchaFailed: "Échec de la vérification de sécurité. Veuillez réessayer.",
    missingConfig: "Configuration Supabase manquante.",
    successMsg: "Connexion réussie !",
    fallbackErr: "Échec de la connexion. Vérifiez vos identifiants.",
    submitting: "Connexion en cours...",
    submit: "Se connecter",
    noAccount: "Vous n'avez pas de compte ?",
    createAccount: "S'inscrire",
  },
  en: {
    emailLabel: "Email address",
    passwordLabel: "Password",
    forgotPass: "Forgot password?",
    invalidEmail: "Invalid email address.",
    captchaRequired: "Please complete security verification first.",
    captchaFailed: "Security verification failed. Please try again.",
    missingConfig: "Supabase configuration is missing environment keys.",
    successMsg: "Signed in successfully!",
    fallbackErr: "Failed to sign in. Check your credentials.",
    submitting: "Signing in...",
    submit: "Sign In",
    noAccount: "Don't have an account?",
    createAccount: "Create account",
  },
  es: {
    emailLabel: "Correo electrónico",
    passwordLabel: "Contraseña",
    forgotPass: "¿Olvidaste tu contraseña?",
    invalidEmail: "Correo electrónico no válido.",
    captchaRequired: "Por favor complete la verificación de seguridad.",
    captchaFailed: "Verificación de seguridad fallida. Inténtelo de nuevo.",
    missingConfig: "Falta la configuración de Supabase.",
    successMsg: "¡Inicio de sesión exitoso!",
    fallbackErr: "Error al iniciar sesión. Verifique sus credenciales.",
    submitting: "Iniciando sesión...",
    submit: "Iniciar sesión",
    noAccount: "¿No tienes una cuenta?",
    createAccount: "Crear cuenta",
  },
};

export function LoginForm({
                            onSwitchTab,
                            onSuccess,
                            setGlobalError,
                            setGlobalSuccess,
                          }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const { lang, dir } = useI18n();
  const t = translations[lang] || translations.ar;

  const resetCaptcha = () => {
    setCaptchaToken(null);
    setTurnstileKey((prev) => prev + 1);
  };

  const handleLogin = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setGlobalError("");

    if (!isValidEmail(email)) {
      setError(t.invalidEmail);
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
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken },
      });

      if (authError) {
        const message = authError.message || t.fallbackErr;
        setError(message);
        setGlobalError(message);
        resetCaptcha();
        setLoading(false);
        return;
      }

      if (authData?.user) {
        const profilesTable = supabase.from("profiles") as any;

        const { data: profile } = await profilesTable
            .select("id, role")
            .eq("id", authData.user.id)
            .maybeSingle();

        if (!profile) {
          await profilesTable.upsert(
              {
                id: authData.user.id,
                email: authData.user.email,
                role: "member",
              },
              { onConflict: "id" }
          );
        }

        // noinspection SpellCheckingInspection
        localStorage.setItem(
            "mizan_user",
            JSON.stringify({
              id: authData.user.id,
              email: authData.user.email,
              name:
                  authData.user.user_metadata?.full_name ||
                  authData.user.email?.split("@")[0] ||
                  "Member",
            })
        );
      }

      setGlobalSuccess(t.successMsg);
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t.fallbackErr;
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
          onSubmit={handleLogin}
          className="space-y-4"
          dir={dir}
          style={{ fontFamily: sansFont(lang) }}
      >
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
                type="email"
                value={email}
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className={`w-full py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-colors ${
                    isRtl ? "pr-10 pl-3.5" : "pl-10 pr-3.5"
                }`}
                dir="ltr"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t.passwordLabel}
            </label>
            <button
                type="button"
                onClick={() => onSwitchTab("forgot")}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium min-h-[32px] flex items-center"
            >
              {t.forgotPass}
            </button>
          </div>
          <div className="relative">
            <Lock
                size={16}
                className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                    isRtl ? "right-3.5" : "left-3.5"
                }`}
            />
            <input
                required
                type={showPass ? "text" : "password"}
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full py-2.5 px-10 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                dir="ltr"
            />
            <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                aria-label="Toggle password visibility"
                className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center ${
                    isRtl ? "left-2.5" : "right-2.5"
                }`}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

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
            <p className="text-xs text-red-500 text-center font-medium animate-in fade-in-50">
              {error}
            </p>
        )}

        <button
            type="submit"
            disabled={loading || !captchaToken}
            className="w-full min-h-[44px] py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm disabled:opacity-60 shadow-xs cursor-pointer flex items-center justify-center"
        >
          {loading ? t.submitting : t.submit}
        </button>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
          {t.noAccount}{" "}
          <button
              type="button"
              className="text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer inline-flex items-center min-h-[32px]"
              onClick={() => onSwitchTab("signup")}
          >
            {t.createAccount}
          </button>
        </p>
      </form>
  );
}