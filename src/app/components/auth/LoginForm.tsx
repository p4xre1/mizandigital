import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { trackEvent } from "../../lib/analytics";
import { isValidEmail, throttle } from "../../lib/security";
import { useTurnstile } from "../../hooks/useTurnstile";

const TURNSTILE_SITE_KEY = "0x4AAAAAAD3-pbXQ2_GzbNGJ";

interface LoginFormProps {
  onSwitchTab: (tab: "signup" | "forgot") => void;
  onSuccess: () => void;
  setGlobalError: (message: string) => void;
  setGlobalSuccess: (message: string) => void;
}

export function LoginForm({ onSwitchTab, onSuccess, setGlobalError, setGlobalSuccess }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { captchaToken, resetCaptcha, renderTurnstile } = useTurnstile(TURNSTILE_SITE_KEY);

  useEffect(() => {
    setError("");
    setGlobalError("");
    setGlobalSuccess("");
  }, [setGlobalError, setGlobalSuccess]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setGlobalError("");

    if (!isValidEmail(email)) {
      setError("عنوان البريد الإلكتروني غير صالح.");
      return;
    }

    const wait = throttle("login", 3_000);
    if (wait > 0) {
      setError(`الرجاء الانتظار ${wait} ثانية قبل المحاولة مجدداً.`);
      return;
    }

    if (!captchaToken) {
      setError("الرجاء إكمال التحقق الأمني أولاً.");
      return;
    }

    setLoading(true);
    if (!isSupabaseConfigured) {
      setError("Supabase غير مُهيّأ — أضف مفاتيح البيئة لتفعيل تسجيل الدخول.");
      setLoading(false);
      return;
    }

    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken },
      });
      if (err) throw err;
      trackEvent("login", { method: "email" });
      onSuccess();
      navigate("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "حدث خطأ. تحقق من بيانات الدخول.";
      setError(message);
      setGlobalError(message);
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4" dir="rtl">
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
          البريد الإلكتروني
        </label>
        <div className="relative">
          <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            required
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-border rounded-xl bg-gray-50 focus:outline-none focus:border-primary transition-colors"
            dir="ltr"
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="block text-xs font-semibold text-foreground" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
            كلمة المرور
          </label>
          <button
            type="button"
            onClick={() => onSwitchTab("forgot")}
            className="text-[11px] text-primary hover:underline"
            style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}
          >
            نسيت كلمة المرور؟
          </button>
        </div>
        <div className="relative">
          <Lock size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            required
            maxLength={128}
            type={showPass ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full pr-10 pl-10 py-2.5 text-sm border border-border rounded-xl bg-gray-50 focus:outline-none focus:border-primary transition-colors"
            dir="ltr"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <div className="flex justify-center my-4" dir="ltr">
        {renderTurnstile(() => setError("فشل التحقق الأمني. الرجاء المحاولة مجدداً."))}
      </div>

      {(error || null) && <p className="text-xs text-red-500 text-center">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-colors text-sm disabled:opacity-60"
        style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}
      >
        {loading ? "جاري التحميل..." : "دخول"}
      </button>

      <p className="text-center text-xs text-muted-foreground mt-4" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
        ليس لديك حساب؟{' '}
        <button type="button" className="text-primary hover:underline" onClick={() => onSwitchTab("signup")}>إنشاء حساب جديد</button>
      </p>
    </form>
  );
}