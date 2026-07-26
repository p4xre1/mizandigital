import { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { throttle } from "../../lib/security";
import { TurnstileCaptcha } from "./TurnstileCaptcha";
import { useI18n, sansFont } from "../../lib/i18n";

interface ResetPasswordFormProps {
  onSuccessReset: () => void;
  setGlobalError: (message: string) => void;
  setGlobalSuccess: (message: string) => void;
}

// 🛡️ Strict Password Validation (8+ chars, Upper, Lower, Number, Special)
// Defends against dictionary attacks and weak credentials
const isStrongPassword = (pass: string) => {
  const minLength = 8;
  const hasUpper = /[A-Z]/.test(pass);
  const hasLower = /[a-z]/.test(pass);
  const hasNumber = /[0-9]/.test(pass);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_\+=\/\[\]\\]/.test(pass);
  return pass.length >= minLength && hasUpper && hasLower && hasNumber && hasSpecial;
};

export function ResetPasswordForm({
  onSuccessReset,
  setGlobalError,
  setGlobalSuccess,
}: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  
  // Security & Loading States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const { lang, dir } = useI18n();

  // 🛡️ Lockout Mechanism to stop scripts and brute force
  const MAX_ATTEMPTS = 5;
  const isLockedOut = failedAttempts >= MAX_ATTEMPTS;

  useEffect(() => {
    setError("");
    setGlobalError("");
    setGlobalSuccess("");
  }, [setGlobalError, setGlobalSuccess]);

  const resetCaptcha = () => {
    setCaptchaToken(null);
    setTurnstileKey((prev) => prev + 1); // Forces clean reload of widget to stop token reuse
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setGlobalError("");

    if (isLockedOut) {
      setError(
        lang === "ar"
          ? "تم حظر النموذج مؤقتاً لدواعٍ أمنية."
          : "Form locked temporarily due to suspicious activity."
      );
      return;
    }

    if (!isStrongPassword(password)) {
      const msg =
        lang === "ar"
          ? "كلمة المرور ضعيفة: يجب أن تكون 8 أحرف على الأقل، وتحتوي على حرف كبير، حرف صغير، رقم، ورمز خاص."
          : lang === "fr"
          ? "Mot de passe faible : 8 car. min, majuscule, minuscule, chiffre et symbole requis."
          : lang === "es"
          ? "Contraseña débil: mín. 8 caracteres, mayúscula, minúscula, número y símbolo."
          : "Weak password: Must be at least 8 characters, include uppercase, lowercase, number, and special character.";
      setError(msg);
      setFailedAttempts((prev) => prev + 1);
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

    // 🛡️ Aggressive Throttle (30 seconds between attempts) to stop automated spam
    const wait = throttle("reset_password", 30_000);
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
      // updateUser works on an authenticated recovery session and does not accept captchaToken directly
      const { error: err } = await supabase.auth.updateUser({
        password,
      });

      if (err) throw err;

      const successMsg =
        lang === "ar"
          ? "تم تحديث كلمة المرور بأمان! يمكنك الآن تسجيل الدخول."
          : lang === "fr"
          ? "Mot de passe sécurisé et mis à jour ! Vous pouvez vous connecter."
          : lang === "es"
          ? "¡Contraseña asegurada y actualizada! Ahora puedes iniciar sesión."
          : "Password secured and updated successfully! You can now log in.";

      setGlobalSuccess(successMsg);
      setPassword("");
      setConfirmPassword("");
      setFailedAttempts(0); // Reset attempts on success
      onSuccessReset();
    } catch (err: unknown) {
      const fallbackMsg =
        lang === "ar"
          ? "فشل تحديث كلمة المرور."
          : "Failed to update password.";
      const message = err instanceof Error ? err.message : fallbackMsg;

      setFailedAttempts((prev) => prev + 1);
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
      {isLockedOut && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-red-700 dark:text-red-400 text-xs font-bold mb-4">
          <ShieldAlert size={16} className="shrink-0" />
          {lang === "ar"
            ? "تم قفل النموذج مؤقتاً بسبب محاولات متكررة. يرجى تحديث الصفحة لاحقاً."
            : "Form locked due to multiple failed attempts. Please refresh to try again."}
        </div>
      )}

      {/* New Password */}
      <div>
        <label 
          htmlFor="new-password" 
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 cursor-pointer"
        >
          {lang === "ar" && "كلمة المرور الجديدة (8+ أحرف، أرقام، رموز)"}
          {lang === "fr" && "Nouveau mot de passe (8+ car., chiffres, symboles)"}
          {lang === "en" && "New Password (8+ chars, nums, symbols)"}
          {lang === "es" && "Nueva contraseña (8+ car., núm., símbolos)"}
        </label>
        <div className="relative">
          <Lock
            size={16}
            className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${
              dir === "rtl" ? "right-3.5" : "left-3.5"
            }`}
          />
          <input
            id="new-password"
            required
            disabled={isLockedOut || loading}
            minLength={8}
            maxLength={128} // Strict length limit to prevent buffer/memory injection
            type={showPass ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={`w-full py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              dir === "rtl" ? "pr-10 pl-10" : "pl-10 pr-10"
            }`}
            dir="ltr"
          />
          <button
            type="button"
            disabled={isLockedOut || loading}
            onClick={() => setShowPass(!showPass)}
            className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50 ${
              dir === "rtl" ? "left-3.5" : "right-3.5"
            }`}
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Confirm Password */}
      <div>
        <label 
          htmlFor="confirm-password" 
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 cursor-pointer"
        >
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
            id="confirm-password"
            required
            disabled={isLockedOut || loading}
            minLength={8}
            maxLength={128}
            type={showPass ? "text" : "password"}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className={`w-full py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              dir === "rtl" ? "pr-10 pl-10" : "pl-10 pr-10"
            }`}
            dir="ltr"
          />
        </div>
      </div>

      {/* Cloudflare Turnstile */}
      {!isLockedOut && (
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
      )}

      {error && (
        <p className="text-xs text-red-500 text-center font-bold px-2 py-1 bg-red-50 dark:bg-red-950/30 rounded-lg">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !captchaToken || isLockedOut}
        className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
      >
        {loading
          ? lang === "ar"
            ? "جاري التشفير والتحديث..."
            : lang === "fr"
            ? "Chiffrement en cours..."
            : lang === "es"
            ? "Cifrando y actualizando..."
            : "Encrypting & Updating..."
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