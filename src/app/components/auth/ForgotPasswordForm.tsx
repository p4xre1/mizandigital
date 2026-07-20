import { useState, useEffect } from "react";
import { Mail } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { isValidEmail, throttle } from "../../lib/security";
import { useTurnstile } from "../../hooks/useTurnstile";

const TURNSTILE_SITE_KEY = "0x4AAAAAAD3-pbXQ2_GzbNGJ";

interface ForgotPasswordFormProps {
  onSwitchTab: (tab: "login") => void;
  setGlobalError: (message: string) => void;
  setGlobalSuccess: (message: string) => void;
}

export function ForgotPasswordForm({ onSwitchTab, setGlobalError, setGlobalSuccess }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { captchaToken, resetCaptcha, renderTurnstile } = useTurnstile(TURNSTILE_SITE_KEY);

  useEffect(() => {
    setError("");
    setGlobalError("");
  }, [setGlobalError]);

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setGlobalError("");

    if (!isValidEmail(email)) {
      setError("عنوان البريد الإلكتروني غير صالح.");
      return;
    }

    const wait = throttle("forgot_password", 30_000);
    if (wait > 0) {
      setError(`الرجاء الانتظار قليلاً قبل طلب رابط آخر.`);
      return;
    }

    if (!captchaToken) {
      setError("الرجاء إكمال التحقق الأمني أولاً.");
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname,
        captchaToken,
      });
      if (err) throw err;
      setGlobalSuccess("تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني بنجاح! ✉️");
      setEmail("");
      resetCaptcha();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "حدث خطأ أثناء إرسال الرابط.";
      setError(message);
      setGlobalError(message);
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleForgotPassword} className="space-y-4" dir="rtl">
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          البريد الإلكتروني
        </label>
        <div className="relative">
          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
            dir="ltr"
          />
        </div>
      </div>

      {/* Cloudflare Turnstile */}
      <div className="flex justify-center my-3 min-h-[65px]" dir="ltr">
        {renderTurnstile(() => setError("فشل التحقق الأمني. الرجاء المحاولة مجدداً."))}
      </div>

      {error && <p className="text-xs text-red-500 text-center font-medium">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors text-sm disabled:opacity-60 shadow-sm active:scale-[0.99]"
      >
        {loading ? "جاري التحميل..." : "إرسال رابط الاستعادة"}
      </button>

      <button
        type="button"
        onClick={() => onSwitchTab("login")}
        className="w-full text-center text-xs text-slate-500 hover:text-slate-800 transition-colors mt-2 block font-medium"
      >
        إلغاء والعودة لتسجيل الدخول
      </button>
    </form>
  );
}