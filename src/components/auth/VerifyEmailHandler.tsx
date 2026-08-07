/* eslint-disable */
// noinspection SpellCheckingInspection
/* cspell:disable */

import { useEffect, useState, useRef, useCallback } from "react";
import { ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useI18n, sansFont, useLocalizedPath } from "@/lib/i18n";

type VerifyStatus = "loading" | "success" | "error";

const translations = {
  ar: {
    loadingTitle: "جاري التحقق من بريدك الإلكتروني...",
    loadingSubtitle: "يرجى الانتظار بينما نقوم بتأمين حسابك.",
    successTitle: "تم التحقق بنجاح!",
    successSubtitle: "تم تأكيد بريدك الإلكتروني. جاري تحويلك...",
    errorTitle: "فشل التحقق",
    errorDefault: "رابط التحقق غير صالح أو منتهي الصلاحية.",
    errorConfig: "نظام المصادقة غير مُهيّأ.",
    errorNoCode: "لم يُعثر على رمز التحقق في الرابط.",
    errorSession: "فشل إنشاء الجلسة بعد التحقق.",
    backToLogin: "العودة لتسجيل الدخول",
  },
  fr: {
    loadingTitle: "Vérification de votre e-mail...",
    loadingSubtitle: "Veuillez patienter pendant que nous sécurisons votre compte.",
    successTitle: "Vérification réussie !",
    successSubtitle: "Votre e-mail est confirmé. Redirection...",
    errorTitle: "Échec de la vérification",
    errorDefault: "Le lien de vérification est invalide ou expiré.",
    errorConfig: "Le système d'authentification n'est pas configuré.",
    errorNoCode: "Aucun code de vérification trouvé dans le lien.",
    errorSession: "Échec de la création de la session après vérification.",
    backToLogin: "Retour à la connexion",
  },
  en: {
    loadingTitle: "Verifying your email...",
    loadingSubtitle: "Please wait while we secure your account.",
    successTitle: "Verification Successful!",
    successSubtitle: "Your email is confirmed. Redirecting...",
    errorTitle: "Verification Failed",
    errorDefault: "Verification link is invalid or expired.",
    errorConfig: "Authentication system is not configured.",
    errorNoCode: "No verification code found in the link.",
    errorSession: "Failed to create session after verification.",
    backToLogin: "Return to Login",
  },
  es: {
    loadingTitle: "Verificando tu correo electrónico...",
    loadingSubtitle: "Por favor espera mientras aseguramos tu cuenta.",
    successTitle: "¡Verificación exitosa!",
    successSubtitle: "Tu correo está confirmado. Redirigiendo...",
    errorTitle: "Verificación fallida",
    errorDefault: "El enlace de verificación es inválido o ha expirado.",
    errorConfig: "El sistema de autenticación no está configurado.",
    errorNoCode: "No se encontró código de verificación en el enlace.",
    errorSession: "Error al crear la sesión después de la verificación.",
    backToLogin: "Volver al inicio de sesión",
  },
};

export function VerifyEmailHandler() {
  const [status, setStatus] = useState<VerifyStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const { lang, dir } = useI18n();
  const localizedPath = useLocalizedPath();
  const t = translations[lang] || translations.ar;

  // 🛡️ Prevent React strict-mode double firing
  const hasAttempted = useRef(false);

  const fail = useCallback(
    (msg: string = t.errorDefault) => {
      setErrorMessage(msg);
      setStatus("error");
      // Clean URL to prevent link sharing / replay
      window.history.replaceState(
        {},
        document.title,
        localizedPath("/login")
      );
    },
    [t.errorDefault, localizedPath]
  );

  useEffect(() => {
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    const verify = async () => {
      if (!isSupabaseConfigured) {
        fail(t.errorConfig);
        return;
      }

      try {
        const url = new URL(window.location.href);

        // ─── Check for explicit errors in URL ───────────────────
        const urlError = url.searchParams.get("error");
        const urlErrorDesc = url.searchParams.get("error_description");
        if (urlError) {
          fail(urlErrorDesc || t.errorDefault);
          return;
        }

        // ─── PKCE Flow: ?code=... ───────────────────────────────
        const code = url.searchParams.get("code");
        if (code) {
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeErr) {
            fail(exchangeErr.message || t.errorSession);
            return;
          }
        }

        // ─── Implicit Flow: #access_token=... ───────────────────
        // (Legacy or specific Supabase configurations)
        const hash = window.location.hash;
        if (hash && hash.includes("access_token")) {
          // Supabase client automatically parses hash on init,
          // but we can force it:
          const { error: hashErr } = await supabase.auth.getSession();
          if (hashErr) {
            fail(hashErr.message || t.errorSession);
            return;
          }
        }

        // ─── No token found at all ──────────────────────────────
        if (!code && !hash.includes("access_token")) {
          fail(t.errorNoCode);
          return;
        }

        // ─── Verify session is valid and email is confirmed ─────
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();

        if (sessionErr || !sessionData.session) {
          fail(t.errorSession);
          return;
        }

        const { user } = sessionData.session;
        if (!user.email_confirmed_at) {
          fail(t.errorDefault);
          return;
        }

        // ✅ Success
        setStatus("success");
        window.history.replaceState(
          {},
          document.title,
          localizedPath("/") // ← أو "/dashboard" حسب رغبتك
        );

        // Auto-redirect after delay
        setTimeout(() => {
          window.location.href = localizedPath("/");
        }, 2000);
      } catch (err: unknown) {
        fail(err instanceof Error ? err.message : undefined);
      }
    };

    verify();
  }, [fail, t]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center"
      dir={dir}
      style={{ fontFamily: sansFont(lang) }}
    >
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 max-w-md w-full">
        {status === "loading" && (
          <div className="flex flex-col items-center">
            <Loader2 size={48} className="text-blue-600 animate-spin mb-4" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
              {t.loadingTitle}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t.loadingSubtitle}
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck size={32} />
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
              {t.successTitle}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t.successSubtitle}
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
              {t.errorTitle}
            </h2>
            <p className="text-sm text-red-500 font-medium p-3 bg-red-50 dark:bg-red-950/30 rounded-xl mb-6">
              {errorMessage}
            </p>
            <a
              href={localizedPath("/login")}
              className="w-full block py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors text-sm"
            >
              {t.backToLogin}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyEmailHandler;