import { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { trackEvent } from "../../lib/analytics";
import { isValidEmail, sanitizeText, throttle } from "../../lib/security";
import { TurnstileCaptcha } from "./TurnstileCaptcha";
import { useI18n, sansFont, useLocalizedPath } from "../../lib/i18n";

interface SignupFormProps {
  onSwitchTab: (tab: "login") => void;
  setGlobalError: (message: string) => void;
  setGlobalSuccess: (message: string) => void;
}

export function SignupForm({
  onSwitchTab,
  setGlobalError,
  setGlobalSuccess,
}: SignupFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const { lang, dir } = useI18n();
  const localizedPath = useLocalizedPath();

  useEffect(() => {
    setError("");
    setGlobalError("");
  }, [setGlobalError]);

  const resetCaptcha = () => {
    setCaptchaToken(null);
    setTurnstileKey((prev) => prev + 1); // Forces clean reload of Turnstile widget
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setGlobalError("");

    const cleanName = sanitizeText(name, 120);
    if (cleanName.length < 2) {
      const msg =
        lang === "ar"
          ? "الرجاء إدخال اسم صحيح."
          : lang === "fr"
          ? "Veuillez entrer un nom valide."
          : lang === "es"
          ? "Por favor ingrese un nombre válido."
          : "Please enter a valid name.";
      setError(msg);
      return;
    }

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

    if (password.length < 8) {
      const msg =
        lang === "ar"
          ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل."
          : lang === "fr"
          ? "Le mot de passe doit contenir au moins 8 caractères."
          : lang === "es"
          ? "La contraseña debe tener al menos 8 caracteres."
          : "Password must be at least 8 characters.";
      setError(msg);
      return;
    }

    if (!acceptedTerms) {
      const msg =
        lang === "ar"
          ? "الرجاء الموافقة على شروط الخدمة وسياسة الخصوصية."
          : lang === "fr"
          ? "Veuillez accepter les conditions d'utilisation."
          : lang === "es"
          ? "Acepte los términos de servicio."
          : "Please accept the Terms of Service and Privacy Policy.";
      setError(msg);
      return;
    }

    const wait = throttle("signup", 60_000);
    if (wait > 0) {
      const msg =
        lang === "ar"
          ? "الرجاء الانتظار قبل إنشاء حساب آخر."
          : "Please wait before creating another account.";
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
          ? "Supabase غير مُهيّأ — أضف مفاتيح البيئة لتفعيل التسجيل."
          : "Supabase configuration is missing environment keys.";
      setError(msg);
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

      const successMsg =
        lang === "ar"
          ? "تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتأكيد التسجيل."
          : lang === "fr"
          ? "Compte créé ! Vérifiez votre e-mail pour confirmer l'inscription."
          : lang === "es"
          ? "¡Cuenta creada! Revisa tu correo electrónico para confirmar."
          : "Account created! Check your email to confirm registration.";

      setGlobalSuccess(successMsg);
      setName("");
      setEmail("");
      setPassword("");
      setAcceptedTerms(false);
      resetCaptcha();
    } catch (err: unknown) {
      const fallbackMsg =
        lang === "ar"
          ? "حدث خطأ أثناء التسجيل."
          : "An error occurred during registration.";
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
      onSubmit={handleSignup}
      className="space-y-4"
      dir={dir}
      style={{ fontFamily: sansFont(lang) }}
    >
      {/* Full Name */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          {lang === "ar" && "الاسم الكامل"}
          {lang === "fr" && "Nom complet"}
          {lang === "en" && "Full Name"}
          {lang === "es" && "Nombre completo"}
        </label>
        <div className="relative">
          <User
            size={16}
            className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${
              dir === "rtl" ? "right-3.5" : "left-3.5"
            }`}
          />
          <input
            required
            maxLength={120}
            autoComplete="name" // 👈 ممتاز، كما هو
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              lang === "ar" ? "الاسم الكامل" : "John Doe"
            }
            className={`w-full py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-colors ${
              dir === "rtl" ? "pr-10 pl-3.5" : "pl-10 pr-3.5"
            }`}
          />
        </div>
      </div>

      {/* Email */}
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
            autoComplete="email" // 👈 تم التعديل من username إلى email لتوحيد المعايير
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

      {/* Password */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          {lang === "ar" && "كلمة المرور"}
          {lang === "fr" && "Mot de passe"}
          {lang === "en" && "Password"}
          {lang === "es" && "Contraseña"}
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
            autoComplete="new-password" // 👈 ممتاز، يمنع تعبئة كلمة المرور القديمة بالخطأ
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

      {/* Terms & Privacy Checkbox */}
      <div className="flex items-start gap-2 pt-1">
        <input
          id="terms-checkbox"
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-700 focus:ring-blue-500 cursor-pointer"
        />
        <label
          htmlFor="terms-checkbox"
          className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer"
        >
          {lang === "ar" && (
            <>
              أوافق على{" "}
              <a
                href={localizedPath("/about")}
                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                شروط الخدمة
              </a>{" "}
              و{" "}
              <a
                href={localizedPath("/about")}
                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                سياسة الخصوصية
              </a>
              .
            </>
          )}
          {lang === "fr" && (
            <>
              J'accepte les{" "}
              <a
                href={localizedPath("/about")}
                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                Conditions d'utilisation
              </a>{" "}
              et la{" "}
              <a
                href={localizedPath("/about")}
                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                Politique de confidentialité
              </a>
              .
            </>
          )}
          {lang === "en" && (
            <>
              I agree to the{" "}
              <a
                href={localizedPath("/about")}
                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href={localizedPath("/about")}
                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                Privacy Policy
              </a>
              .
            </>
          )}
          {lang === "es" && (
            <>
              Acepto los{" "}
              <a
                href={localizedPath("/about")}
                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                Términos del servicio
              </a>{" "}
              y la{" "}
              <a
                href={localizedPath("/about")}
                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                Política de privacidad
              </a>
              .
            </>
          )}
        </label>
      </div>

      {/* Cloudflare Turnstile Captcha Widget */}
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
        disabled={loading || !captchaToken || !acceptedTerms} // 👈 إضافة أمان إضافية لزر الإرسال للتأكد من الشروط
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
          ? "إنشاء الحساب"
          : lang === "fr"
          ? "S'inscrire"
          : lang === "es"
          ? "Crear cuenta"
          : "Create Account"}
      </button>

      <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
        {lang === "ar" && (
          <>
            لديك حساب بالفعل؟{" "}
            <button
              type="button"
              className="text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
              onClick={() => onSwitchTab("login")}
            >
              تسجيل الدخول
            </button>
          </>
        )}
        {lang === "fr" && (
          <>
            Vous avez déjà un compte ?{" "}
            <button
              type="button"
              className="text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
              onClick={() => onSwitchTab("login")}
            >
              Se connecter
            </button>
          </>
        )}
        {lang === "en" && (
          <>
            Already have an account?{" "}
            <button
              type="button"
              className="text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
              onClick={() => onSwitchTab("login")}
            >
              Sign In
            </button>
          </>
        )}
        {lang === "es" && (
          <>
            ¿Ya tienes una cuenta?{" "}
            <button
              type="button"
              className="text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
              onClick={() => onSwitchTab("login")}
            >
              Iniciar sesión
            </button>
          </>
        )}
      </p>
    </form>
  );
}