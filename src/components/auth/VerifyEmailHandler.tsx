import { useEffect, useState, useRef } from "react";
import { ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useI18n, sansFont, useLocalizedPath } from "../../lib/i18n";

export function VerifyEmailHandler() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const { lang, dir } = useI18n();
  const localizedPath = useLocalizedPath();
  
  // 🛡️ Prevent React strict-mode double firing which can invalidate single-use tokens
  const hasAttempted = useRef(false);

  useEffect(() => {
    const handleEmailVerification = async () => {
      if (hasAttempted.current) return;
      hasAttempted.current = true;

      try {
        // 🛡️ Securely parse the URL to find the PKCE code or hash fragment
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");

        if (error) {
          throw new Error(errorDescription || "Verification link is invalid or expired.");
        }

        if (code) {
          // Exchange the secure code for a session
          const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
          if (sessionError) throw sessionError;
        }

        // Verify the user object actually reflects a confirmed email
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          throw new Error("Unable to verify user session.");
        }

        if (!user.email_confirmed_at) {
          throw new Error("Email verification failed. Please try again.");
        }

        setStatus("success");

        // 🛡️ Clean the URL to remove the sensitive code from browser history
        window.history.replaceState({}, document.title, localizedPath("/dashboard"));
        
        // Auto-redirect after short delay
        setTimeout(() => {
          window.location.href = localizedPath("/dashboard");
        }, 2000);

      } catch (err: unknown) {
        const fallbackMsg = 
          lang === "ar" ? "رابط التحقق غير صالح أو منتهي الصلاحية." : "Verification link is invalid or expired.";
        const message = err instanceof Error ? err.message : fallbackMsg;
        
        setErrorMessage(message);
        setStatus("error");
        
        // 🛡️ Clean the URL even on error to prevent link sharing
        window.history.replaceState({}, document.title, localizedPath("/login"));
      }
    };

    handleEmailVerification();
  }, [lang, localizedPath]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center" dir={dir} style={{ fontFamily: sansFont(lang) }}>
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 max-w-md w-full">
        
        {status === "loading" && (
          <div className="flex flex-col items-center animate-pulse">
            <Loader2 size={48} className="text-blue-600 animate-spin mb-4" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
              {lang === "ar" ? "جاري التحقق من بريدك الإلكتروني..." : "Verifying your email..."}
            </h2>
            <p className="text-sm text-slate-500">
              {lang === "ar" ? "يرجى الانتظار بينما نقوم بتأمين حسابك." : "Please wait while we secure your account."}
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck size={32} />
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
              {lang === "ar" ? "تم التحقق بنجاح!" : "Verification Successful!"}
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              {lang === "ar" ? "تم تأكيد بريدك الإلكتروني. جاري تحويلك..." : "Your email is confirmed. Redirecting..."}
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
              {lang === "ar" ? "فشل التحقق" : "Verification Failed"}
            </h2>
            <p className="text-sm text-red-500 font-medium p-3 bg-red-50 dark:bg-red-950/30 rounded-xl mb-6">
              {errorMessage}
            </p>
            <a
              href={localizedPath("/login")}
              className="w-full block py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors text-sm"
            >
              {lang === "ar" ? "العودة لتسجيل الدخول" : "Return to Login"}
            </a>
          </div>
        )}

      </div>
    </div>
  );
}