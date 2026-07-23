import { useState, useEffect } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { throttle } from "../../lib/security";
import { TurnstileCaptcha } from "./TurnstileCaptcha";
import { useI18n, sansFont } from "../../lib/i18n";

interface ResetPasswordFormProps {
  onSuccessReset: () => void;
  setGlobalError: (message: string) => void;
  setGlobalSuccess: (message: string) => void;
}

export function ResetPasswordForm({
  onSuccessReset,
  setGlobalError,
  setGlobalSuccess,
}: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const { lang, dir } = useI18n();

  useEffect(() => {
    setError("");
    setGlobalError("");
    setGlobalSuccess("");
  }, [setGlobalError, setGlobalSuccess]);

  const resetCaptcha = () => {
    setCaptchaToken(null);
    setTurnstileKey((prev) => prev + 1);
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setGlobalError("");

    if (password.length < 8) {
      const msg =
        lang === "ar"
          ? "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل."
          : lang === "fr"
          ? "Le nouveau mot de passe doit contenir au moins 8 caractères."
          : lang === "es"
          ? "La nueva contraseña debe tener al menos 8 caracteres."
          : "New password must be at least 8 characters.";
      setError(msg);
      return;
    }

    if (password !== confirmPassword) {
      const msg =
        lang === "ar"
          ? "كلمتا المرور غير متطابقتين."
          : lang === "fr"
          ? "Les mots de passe ne correspondent pas."
          : lang === "es"
          ? "Las contraseñas no coinciden."
          : "Passwords do not match.";
      setError(msg);
      return;
    }

    const wait = throttle("reset_password", 5_000);
    if (wait > 0) {
      const msg =
        lang === "ar"
          ? `الرجاء الانتظار ${wait} ثانية قبل المحاولة مجدداً.`
          : `Please wait ${wait} seconds before trying again.`;
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
      // updateUser works on an authenticated recovery session and does not accept captchaToken
      const { error: err } = await supabase.auth.updateUser({
        password,
      });

      if (err) throw err;

      const successMsg =
        lang === "ar"
          ? "تم تحديث كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول."
          : lang === "fr"
          ? "Mot de passe mis à jour avec succès ! Vous pouvez maintenant vous connecter."
          : lang === "es"
          ? "¡Contraseña actualizada con éxito! Ahora puedes iniciar sesión."
          : "Password updated successfully! You can now log in.";

      setGlobalSuccess(successMsg);
      setPassword("");
      setConfirmPassword("");
      onSuccessReset();
    } catch (err: unknown) {
      const fallbackMsg =
        lang === "ar"
          ? "فشل تحديث كلمة المرور."
          : "Failed to update password.";
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
      onSubmit={handleResetPassword}
      className="space-y-4"
      dir={dir}
      style={{ fontFamily: sansFont(lang) }}
    >
      {/* New Password */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          {lang === "ar" && "كلمة المرور الجديدة"}
          {lang === "fr" && "Nouveau mot de passe"}
          {lang === "en" && "New Password"}
          {lang === "es" && "Nueva contraseña"}
        </label>
        <div className="relative">
          <Lock
            size={16}
            className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${
              dir === "rtl" ? "right-3.5" : "left-3.5"
            }`}
          />
          <input
            required
            minLength={8}
            maxLength={128}
            type={showPass ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={`w-full py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-colors ${
              dir === "rtl" ? "pr-10 pl-10" : "pl-10 pr-10"
            }`}
            dir="ltr"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ${
              dir === "rtl" ? "left-3.5" : "right-3.5"
            }`}
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Confirm Password */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          {lang === "ar" && "تأكيد كلمة المرور"}
          {lang === "fr" && "Confirmer le mot de passe"}
          {lang === "en" && "Confirm Password"}
          {lang === "es" && "Confirmar contraseña"}
        </label>
        <div className="relative">
          <Lock
            size={16}
            className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${
              dir === "rtl" ? "right-3.5" : "left-3.5"
            }`}
          />
          <input
            required
            minLength={8}
            maxLength={128}
            type={showPass ? "text" : "password"}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className={`w-full py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-colors ${
              dir === "rtl" ? "pr-10 pl-10" : "pl-10 pr-10"
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
          ? "تحديث كلمة المرور"
          : lang === "fr"
          ? "Mettre à jour le mot de passe"
          : lang === "es"
          ? "Actualizar contraseña"
          : "Update Password"}
      </button>
    </form>
  );
}