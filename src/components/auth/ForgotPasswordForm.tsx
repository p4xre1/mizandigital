/* eslint-disable */
// noinspection SpellCheckingInspection
/* cspell:disable */

import { useState, useEffect, useCallback, SyntheticEvent } from "react";
import { Mail, ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { isValidEmail, throttle } from "@/lib/security";
import { TurnstileCaptcha } from "./TurnstileCaptcha";
import { useI18n, sansFont } from "@/lib/i18n";

interface ForgotPasswordFormProps {
  onSwitchTab: (tab: "login") => void;
  setGlobalError: (message: string) => void;
  setGlobalSuccess: (message: string) => void;
}

const translations = {
  ar: {
    emailLabel: "البريد الإلكتروني",
    invalidEmail: "عنوان البريد الإلكتروني غير صالح.",
    waitSeconds: (s: number) => `الرجاء الانتظار ${s} ثانية قبل طلب رابط آخر.`,
    captchaRequired: "الرجاء إكمال التحقق الأمني أولاً.",
    captchaFailed: "فشل التحقق الأمني. الرجاء المحاولة مجدداً.",
    missingConfig: "Supabase غير مُهيّأ — أضف مفاتيح البيئة.",
    sendFailed: "حدث خطأ أثناء إرسال الرابط.",
    success: "تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني! ✉️",
    sending: "جاري الإرسال...",
    sendBtn: "إرسال رابط الاستعادة",
    backToLogin: "العودة لتسجيل الدخول",
    sentNote: "إذا كان البريد مسجلاً لدينا، ستصلك رسالة خلال دقائق. تأكد من مجلد Spam.",
  },
  fr: {
    emailLabel: "Adresse e-mail",
    invalidEmail: "Adresse email invalide.",
    waitSeconds: (s: number) => `Veuillez attendre ${s} secondes avant une nouvelle demande.`,
    captchaRequired: "Veuillez effectuer la vérification de sécurité.",
    captchaFailed: "Échec de la vérification de sécurité. Veuillez réessayer.",
    missingConfig: "Configuration Supabase manquante.",
    sendFailed: "Erreur lors de l'envoi du lien.",
    success: "Le lien de réinitialisation a été envoyé à votre e-mail ! ✉️",
    sending: "Envoi en cours...",
    sendBtn: "Envoyer le lien",
    backToLogin: "Retour à la connexion",
    sentNote: "Si l'adresse est enregistrée, vous recevrez un e-mail dans quelques minutes. Vérifiez vos spams.",
  },
  en: {
    emailLabel: "Email address",
    invalidEmail: "Invalid email address.",
    waitSeconds: (s: number) => `Please wait ${s} seconds before requesting another link.`,
    captchaRequired: "Please complete security verification first.",
    captchaFailed: "Security verification failed. Please try again.",
    missingConfig: "Supabase configuration is missing environment keys.",
    sendFailed: "An error occurred while sending the reset link.",
    success: "Password reset link sent to your email! ✉️",
    sending: "Sending...",
    sendBtn: "Send Reset Link",
    backToLogin: "Back to login",
    sentNote: "If the email is registered, you will receive a message within minutes. Check your Spam folder.",
  },
  es: {
    emailLabel: "Correo electrónico",
    invalidEmail: "Correo electrónico no válido.",
    waitSeconds: (s: number) => `Por favor espere ${s} segundos antes de solicitar otro enlace.`,
    captchaRequired: "Por favor complete la verificación de seguridad.",
    captchaFailed: "Verificación de seguridad fallida. Inténtelo de nuevo.",
    missingConfig: "Falta la configuración de Supabase.",
    sendFailed: "Error al enviar el enlace de recuperación.",
    success: "¡Se ha enviado el enlace de restablecimiento a tu correo! ✉️",
    sending: "Enviando...",
    sendBtn: "Enviar enlace",
    backToLogin: "Volver al inicio de sesión",
    sentNote: "Si el correo está registrado, recibirás un mensaje en minutos. Revisa tu carpeta de Spam.",
  },
};

export function ForgotPasswordForm({
  onSwitchTab,
  setGlobalError,
  setGlobalSuccess,
}: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [isSent, setIsSent] = useState(false);
  const [throttleWait, setThrottleWait] = useState(0);

  const { lang, dir } = useI18n();
  const t = translations[lang] || translations.ar;

  // ⏱️ عداد تنازلي للـ Throttle
  useEffect(() => {
    if (throttleWait <= 0) return;
    const timer = setInterval(() => {
      setThrottleWait((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [throttleWait]);

  useEffect(() => {
    setError("");
    setGlobalError("");
    setGlobalSuccess("");
  }, [setGlobalError, setGlobalSuccess]);

  const resetCaptcha = useCallback(() => {
    setCaptchaToken(null);
    setTurnstileKey((prev) => prev + 1);
  }, []);

  const handleForgotPassword = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setGlobalError("");
    setIsSent(false);

    if (!isValidEmail(email)) {
      setError(t.invalidEmail);
      return;
    }

    const wait = throttle("forgot_password", 30_000);
    if (wait > 0) {
      setThrottleWait(Math.ceil(wait / 1000));
      setError(t.waitSeconds(Math.ceil(wait / 1000)));
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
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
        captchaToken,
      });

      if (err) {
        setError(err.message || t.sendFailed);
        setGlobalError(err.message || t.sendFailed);
        resetCaptcha();
        return;
      }

      setGlobalSuccess(t.success);
      setEmail("");
      setIsSent(true);
      resetCaptcha();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t.sendFailed;
      setError(message);
      setGlobalError(message);
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  // ✅ حالة النجاح — عرض واضح بدلاً من البقاء في النموذج
  if (isSent) {
    return (
      <div
        className="space-y-5 text-center py-6"
        dir={dir}
        style={{ fontFamily: sansFont(lang) }}
      >
        <div className="w-16 h-16 mx-auto bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center">
          <CheckCircle2 size={32} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
            {t.success}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-4">
            {t.sentNote}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSwitchTab("login")}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          {t.backToLogin}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleForgotPassword}
      className="space-y-4"
      dir={dir}
      style={{ fontFamily: sansFont(lang) }}
    >
      <div>
        <label
          htmlFor="forgot-email"
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 cursor-pointer"
        >
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
            id="forgot-email"
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

      {/* Throttle Warning */}
      {throttleWait > 0 && (
        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-400 text-center font-medium">
          ⏱️ {t.waitSeconds(throttleWait)}
        </div>
      )}

      {/* Cloudflare Turnstile */}
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
        disabled={loading || !captchaToken || throttleWait > 0}
        className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed shadow-xs cursor-pointer flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {t.sending}
          </>
        ) : (
          <>
            <Send size={14} />
            {t.sendBtn}
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => onSwitchTab("login")}
        className="w-full text-center text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mt-2 block font-medium cursor-pointer"
      >
        {t.backToLogin}
      </button>
    </form>
  );
}

export default ForgotPasswordForm;