import { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { trackEvent } from "../../lib/analytics";
import { isValidEmail, sanitizeText, throttle } from "../../lib/security";
import { useTurnstile } from "../../hooks/useTurnstile";
import { useLocalizedPath } from "../../lib/i18n";

const TURNSTILE_SITE_KEY = "0x4AAAAAAD3-pbXQ2_GzbNGJ";

interface SignupFormProps {
  onSwitchTab: (tab: "login") => void;
  setGlobalError: (message: string) => void;
  setGlobalSuccess: (message: string) => void;
}

export function SignupForm({ onSwitchTab, setGlobalError, setGlobalSuccess }: SignupFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { captchaToken, resetCaptcha, renderTurnstile } = useTurnstile(TURNSTILE_SITE_KEY);
  const localizedPath = useLocalizedPath();

  useEffect(() => {
    setError("");
    setGlobalError("");
  }, [setGlobalError]);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setGlobalError("");

    const cleanName = sanitizeText(name, 120);
    if (cleanName.length < 2) {
      setError("الرجاء إدخال اسم صحيح.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("عنوان البريد الإلكتروني غير صالح.");
      return;
    }

    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
      return;
    }

    if (!acceptedTerms) {
      setError("الرجاء الموافقة على شروط الخدمة وسياسة الخصوصية.");
      return;
    }

    const wait = throttle("signup", 60_000);
    if (wait > 0) {
      setError("الرجاء الانتظار قبل إنشاء حساب آخر.");
      return;
    }

    if (!captchaToken) {
      setError("الرجاء إكمال التحقق الأمني أولاً.");
      return;
    }

    setLoading(true);
    if (!isSupabaseConfigured) {
      setError("Supabase غير مُهيّأ — أضف مفاتيح البيئة لتفعيل التسجيل.");
      setLoading(false);
      return;
    }

    try {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: cleanName },
          captchaToken,
        },
      });
      if (err) throw err;
      trackEvent("sign_up", { method: "email" });
      setGlobalSuccess("تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتأكيد التسجيل.");
      setName("");
      setEmail("");
      setPassword("");
      setAcceptedTerms(false);
      resetCaptcha();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "حدث خطأ أثناء التسجيل.";
      setError(message);
      setGlobalError(message);
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignup} className="space-y-4" dir="rtl">
      {/* Full Name */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          الاسم الكامل
        </label>
        <div className="relative">
          <User size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            required
            maxLength={120}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="الاسم الكامل"
            className="w-full pr-10 pl-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          البريد الإلكتروني
        </label>
        <div className="relative">
          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            required
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
            dir="ltr"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          كلمة المرور
        </label>
        <div className="relative">
          <Lock size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            required
            minLength={8}
            maxLength={128}
            type={showPass ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full pr-10 pl-10 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
            dir="ltr"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Terms & Privacy */}
      <div className="flex items-start gap-2 pt-1">
        <input
          id="terms-checkbox"
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
        />
        <label htmlFor="terms-checkbox" className="text-xs text-slate-600 cursor-pointer">
          أوافق على <a href={localizedPath("/about")} className="text-blue-600 hover:underline font-semibold">شروط الخدمة</a> و <a href={localizedPath("/about")} className="text-blue-600 hover:underline font-semibold">سياسة الخصوصية</a>.
        </label>
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
        {loading ? "جاري التحميل..." : "إنشاء الحساب"}
      </button>

      <p className="text-center text-xs text-slate-500 mt-4">
        لديك حساب بالفعل؟{" "}
        <button
          type="button"
          className="text-blue-600 hover:underline font-bold"
          onClick={() => onSwitchTab("login")}
        >
          تسجيل الدخول
        </button>
      </p>
    </form>
  );
}