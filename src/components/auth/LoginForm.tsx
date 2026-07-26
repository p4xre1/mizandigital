import { useState } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { isValidEmail } from "../../lib/security";
import { TurnstileCaptcha } from "./TurnstileCaptcha";
import { useI18n, sansFont } from "../../lib/i18n";

interface LoginFormProps {
  onSwitchTab: (tab: "signup" | "forgot") => void;
  onSuccess: () => void;
  setGlobalError: (message: string) => void;
  setGlobalSuccess: (message: string) => void;
}

export function LoginForm({
  onSwitchTab,
  onSuccess,
  setGlobalError,
  setGlobalSuccess,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const { lang, dir } = useI18n();

  const resetCaptcha = () => {
    setCaptchaToken(null);
    setTurnstileKey((prev) => prev + 1); // Triggers clean re-render of Turnstile
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
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

    if (!isSupabaseConfigured) {
      const msg =
        lang === "ar"
          ? "Supabase غير مُهيّأ — أضف مفاتيح البيئة لتفعيل تسجيل الدخول."
          : "Supabase configuration is missing environment keys.";
      setError(msg);
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken },
      });

      if (err) throw err;

      // Ensure profile exists with 'member' role fallback
      if (authData?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", authData.user.id)
          .maybeSingle();

        // If profile doesn't exist, create it with 'member' role
        if (!profile) {
          await supabase.from("profiles").upsert(
            {
              id: authData.user.id,
              email: authData.user.email,
              role: "member",
            },
            { onConflict: "id" }
          );
        }

        // Store active user in local state
        localStorage.setItem(
          "mizan_user",
          JSON.stringify({
            id: authData.user.id,
            email: authData.user.email,
            name: authData.user.user_metadata?.full_name || authData.user.email?.split("@")[0] || "Member",
          })
        );
      }

      setGlobalSuccess(
        lang === "ar"
          ? "تم تسجيل الدخول بنجاح!"
          : lang === "fr"
          ? "Connexion réussie !"
          : lang === "es"
          ? "¡Inicio de sesión exitoso!"
          : "Signed in successfully!"
      );
      onSuccess();
    } catch (err: unknown) {
      const fallbackMsg =
        lang === "ar"
          ? "فشل تسجيل الدخول. تحقق من بياناتك وحاول مجدداً."
          : lang === "fr"
          ? "Échec de la connexion. Vérifiez vos identifiants."
          : lang === "es"
          ? "Error al iniciar sesión. Verifique sus credenciales."
          : "Failed to sign in. Check your credentials.";

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
      onSubmit={handleLogin}
      className="space-y-4"
      dir={dir}
      style={{ fontFamily: sansFont(lang) }}
    >
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
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
            required
            type="email"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className={`w-full py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-colors ${
              dir === "rtl" ? "pr-10 pl-3.5" : "pl-10 pr-3.5"
            }`}
            dir="ltr"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {lang === "ar" && "كلمة المرور"}
            {lang === "fr" && "Mot de passe"}
            {lang === "en" && "Password"}
            {lang === "es" && "Contraseña"}
          </label>
          <button
            type="button"
            onClick={() => onSwitchTab("forgot")}
            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            {lang === "ar" && "نسيت كلمة المرور؟"}
            {lang === "fr" && "Mot de passe oublié ?"}
            {lang === "en" && "Forgot password?"}
            {lang === "es" && "¿Olvidaste tu contraseña?"}
          </button>
        </div>
        <div className="relative">
          <Lock
            size={16}
            className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${
              dir === "rtl" ? "right-3.5" : "left-3.5"
            }`}
          />
          <input
            required
            type={showPass ? "text" : "password"}
            value={password}
            autoComplete="current-password"
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
            ? "جاري تسجيل الدخول..."
            : lang === "fr"
            ? "Connexion en cours..."
            : lang === "es"
            ? "Iniciando sesión..."
            : "Signing in..."
          : lang === "ar"
          ? "تسجيل الدخول"
          : lang === "fr"
          ? "Se connecter"
          : lang === "es"
          ? "Iniciar sesión"
          : "Sign In"}
      </button>

      <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
        {lang === "ar" && (
          <>
            ليس لديك حساب؟{" "}
            <button
              type="button"
              className="text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
              onClick={() => onSwitchTab("signup")}
            >
              إنشاء حساب جديد
            </button>
          </>
        )}
        {lang === "fr" && (
          <>
            Vous n'avez pas de compte ?{" "}
            <button
              type="button"
              className="text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
              onClick={() => onSwitchTab("signup")}
            >
              S'inscrire
            </button>
          </>
        )}
        {lang === "en" && (
          <>
            Don't have an account?{" "}
            <button
              type="button"
              className="text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
              onClick={() => onSwitchTab("signup")}
            >
              Create account
            </button>
          </>
        )}
        {lang === "es" && (
          <>
            ¿No tienes una cuenta?{" "}
            <button
              type="button"
              className="text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
              onClick={() => onSwitchTab("signup")}
            >
              Crear cuenta
            </button>
          </>
        )}
      </p>
    </form>
  );
}