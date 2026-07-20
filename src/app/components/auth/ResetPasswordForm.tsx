import { useState, useEffect } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { throttle } from "../../lib/security";

interface ResetPasswordFormProps {
  onSuccessReset: () => void;
  setGlobalError: (message: string) => void;
  setGlobalSuccess: (message: string) => void;
}

export function ResetPasswordForm({ onSuccessReset, setGlobalError, setGlobalSuccess }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    setGlobalError("");
    setGlobalSuccess("");
  }, [setGlobalError, setGlobalSuccess]);

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setGlobalError("");

    if (password.length < 8) {
      setError("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.");
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }

    const wait = throttle("reset_password", 5_000);
    if (wait > 0) {
      setError(`الرجاء الانتظار ${wait} ثانية قبل المحاولة مجدداً.`);
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setGlobalSuccess("تم تحديث كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول.");
      setPassword("");
      setConfirmPassword("");
      onSuccessReset();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "فشل تحديث كلمة المرور.";
      setError(message);
      setGlobalError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleResetPassword} className="space-y-4" dir="rtl">
      {/* New Password */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          كلمة المرور الجديدة
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

      {/* Confirm Password */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          تأكيد كلمة المرور
        </label>
        <div className="relative">
          <Lock size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            required
            minLength={8}
            maxLength={128}
            type={showPass ? "text" : "password"}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full pr-10 pl-10 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
            dir="ltr"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-500 text-center font-medium">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors text-sm disabled:opacity-60 shadow-sm active:scale-[0.99]"
      >
        {loading ? "جاري التحميل..." : "تحديث كلمة المرور"}
      </button>
    </form>
  );
}