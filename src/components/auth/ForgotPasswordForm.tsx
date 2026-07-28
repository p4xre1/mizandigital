/* eslint-disable */
// noinspection SpellCheckingInspection
/* cspell:disable */

import { useState, useEffect, SyntheticEvent } from "react";
import { Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isValidEmail, throttle } from "@/lib/security";
import { TurnstileCaptcha } from "./TurnstileCaptcha";
import { useI18n, sansFont } from "@/lib/i18n";

interface ForgotPasswordFormProps {
  onSwitchTab: (tab: "login") => void;
  setGlobalError: (message: string) => void;
  setGlobalSuccess: (message: string) => void;
}

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

  const { lang, dir } = useI18n();

  useEffect(() => {
    setError("");
    setGlobalError("");
  }, [setGlobalError]);

  const resetCaptcha = () => {
    setCaptchaToken(null);
    setTurnstileKey((prev) => prev + 1);
  };

  const handleForgotPassword = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setGlobalError("");

    if (!isValidEmail(email)) {
      const msg =
          lang === "ar"
              ? "عنوان البريد الإلكتروني غير صالح."
              : lang === "fr"
                  ? "Adresse email invalide."
                  : lang === "es"
                      ? "Correo electrónico no válido."
                      : "Invalid email address.";
      setError(msg);
      return;
    }

    const wait = throttle("forgot_password", 30_000);
    if (wait > 0) {
      const msg =
          lang === "ar"
              ? "الرجاء الانتظار قليلاً قبل طلب رابط آخر."
              : "Please wait a moment before requesting another link.";
      setError(msg);
      return;
    }

    if (!captchaToken) {
      const msg =
          lang === "ar"
              ? "الرجاء إكمال التحقق الأمني أولاً."
              : lang === "fr"
                  ? "Veuillez effectuer la vérification de sécurité."
                  : lang === "es"
                      ? "Por favor complete la verificación de seguridad."
                      : "Please complete security verification first.";
      setError(msg);
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname,
        captchaToken,
      });

      if (err) {
        const fallbackMsg =
            lang === "ar"
                ? "حدث خطأ أثناء إرسال الرابط."
                : "An error occurred while sending the reset link.";
        const message = err.message || fallbackMsg;

        setError(message);
        setGlobalError(message);
        resetCaptcha();
        return;
      }

      const successMsg =
          lang === "ar"
              ? "تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني بنجاح! ✉️"
              : lang === "fr"
                  ? "Le lien de réinitialisation a été envoyé à votre e-mail ! ✉️"
                  : lang === "es"
                      ? "¡Se ha enviado el enlace de restablecimiento a tu correo! ✉️"
                      : "Password reset link sent to your email! ✉️";

      setGlobalSuccess(successMsg);
      setEmail("");
      resetCaptcha();
    } catch (err: unknown) {
      const fallbackMsg =
          lang === "ar"
              ? "حدث خطأ أثناء إرسال الرابط."
              : "An error occurred while sending the reset link.";
      const message = err instanceof Error ? err.message : fallbackMsg;

      setError(message);
      setGlobalError(message);
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

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

        {/* Cloudflare Turnstile */}
        <div className="flex justify-center my-3 min-h-[65px]" dir="ltr">
          <TurnstileCaptcha
              key={turnstileKey}
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
              onError={() => {
                setCaptchaToken(null);
                setError(
                    lang === "ar"
                        ? "فشل التحقق الأمني. الرجاء المحاولة مجدداً."
                        : "Security verification failed. Please try again."
                );
              }}
              theme="auto"
          />
        </div>

        {error && (
            <p className="text-xs text-red-500 text-center font-medium">{error}</p>
        )}

        <button
            type="submit"
            disabled={loading || !captchaToken}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm disabled:opacity-60 shadow-xs cursor-pointer"
        >
          {loading
              ? lang === "ar"
                  ? "جاري التحميل..."
                  : lang === "fr"
                      ? "Chargement..."
                      : lang === "es"
                          ? "Cargando..."
                          : "Loading..."
              : lang === "ar"
                  ? "إرسال رابط الاستعادة"
                  : lang === "fr"
                      ? "Envoyer le lien de réinitialisation"
                      : lang === "es"
                          ? "Enviar enlace de recuperación"
                          : "Send Reset Link"}
        </button>

        <button
            type="button"
            onClick={() => onSwitchTab("login")}
            className="w-full text-center text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mt-2 block font-medium cursor-pointer"
        >
          {lang === "ar" && "إلغاء والعودة لتسجيل الدخول"}
          {lang === "fr" && "Annuler et revenir à la connexion"}
          {lang === "en" && "Cancel and return to login"}
          {lang === "es" && "Cancelar y volver al inicio de sesión"}
        </button>
      </form>
  );
}

export default ForgotPasswordForm;