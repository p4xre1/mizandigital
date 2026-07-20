import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Scale, Mail } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useI18n, useLocalizedPath, serifFont, sansFont } from "../lib/i18n";
import { useSeo } from "../lib/seo";

// ✅ Named imports (curly braces) match the component exports
import { LoginForm } from "../components/auth/LoginForm";
import { SignupForm } from "../components/auth/SignupForm";
import { ForgotPasswordForm } from "../components/auth/ForgotPasswordForm";
import { ResetPasswordForm } from "../components/auth/ResetPasswordForm";

type AuthTab = "login" | "signup" | "forgot" | "reset";

export default function Login() {
  const [tab, setTab] = useState<AuthTab>("login");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { lang, dir, t } = useI18n();
  const localizedPath = useLocalizedPath();

  const titleKeyMap: Record<AuthTab, string> = {
    login: "login",
    signup: "signUp",
    forgot: "forgotPassword",
    reset: "resetPassword",
  };

  useSeo(
    {
      title: t(titleKeyMap[tab]),
      description: "منصة ميزان — المجلة القانونية الرقمية",
      path: "/login",
      lang,
    },
    [lang, tab, t]
  );

  useEffect(() => {
    setError("");
    setSuccess("");
  }, [tab]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setTab("reset");
        setError("");
        setSuccess("");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSuccessReset = () => {
    setTimeout(() => {
      setTab("login");
      setSuccess("");
    }, 3000);
  };

  return (
    <div
      className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gray-50"
      dir={dir}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            to={localizedPath("/")}
            className="inline-flex items-center gap-3 mb-4"
          >
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center mx-auto">
              <Scale size={20} className="text-white" />
            </div>
          </Link>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: serifFont(lang) }}
          >
            {tab === "login" &&
              (lang === "ar"
                ? "تسجيل الدخول"
                : lang === "fr"
                ? "Connexion"
                : lang === "es"
                ? "Iniciar sesión"
                : "Sign In")}
            {tab === "signup" &&
              (lang === "ar"
                ? "إنشاء حساب جديد"
                : lang === "fr"
                ? "Créer un compte"
                : lang === "es"
                ? "Crear una cuenta"
                : "Create Account")}
            {tab === "forgot" &&
              (lang === "ar"
                ? "استعادة كلمة المرور"
                : lang === "fr"
                ? "Mot de passe oublié"
                : lang === "es"
                ? "Contraseña olvidada"
                : "Reset Password")}
            {tab === "reset" &&
              (lang === "ar"
                ? "تعيين كلمة مرور جديدة"
                : lang === "fr"
                ? "Nouveau mot de passe"
                : lang === "es"
                ? "Nueva contraseña"
                : "Set New Password")}
          </h1>
          <p
            className="text-sm text-muted-foreground mt-1"
            style={{ fontFamily: sansFont(lang) }}
          >
            {lang === "ar" && "منصة ميزان — المجلة القانونية الرقمية"}
            {lang === "fr" && "Plateforme Mizan — Revue Juridique Numérique"}
            {lang === "en" && "Mizan Platform — Digital Legal Journal"}
            {lang === "es" && "Plataforma Mizan — Revista Jurídica Digital"}
          </p>
        </div>

        <div className="bg-white border border-border rounded-2xl p-7 shadow-sm">
          {(tab === "login" || tab === "signup") && (
            <div className="flex border border-border rounded-xl overflow-hidden mb-6">
              {(["login", "signup"] as const).map((tTab) => (
                <button
                  key={tTab}
                  onClick={() => setTab(tTab)}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                    tab === tTab
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  style={{ fontFamily: sansFont(lang) }}
                >
                  {tTab === "login"
                    ? lang === "ar"
                      ? "تسجيل الدخول"
                      : lang === "fr"
                      ? "Connexion"
                      : lang === "es"
                      ? "Iniciar sesión"
                      : "Sign In"
                    : lang === "ar"
                    ? "حساب جديد"
                    : lang === "fr"
                    ? "Nouveau compte"
                    : lang === "es"
                    ? "Nueva cuenta"
                    : "New Account"}
                </button>
              ))}
            </div>
          )}

          {success ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-3">
                <Mail size={20} className="text-green-600" />
              </div>
              <p
                className="text-sm text-green-700 font-medium"
                style={{ fontFamily: sansFont(lang) }}
              >
                {success}
              </p>
              {tab === "forgot" && (
                <button
                  onClick={() => {
                    setSuccess("");
                    setTab("login");
                  }}
                  className="text-xs text-primary mt-4 hover:underline block mx-auto"
                >
                  {lang === "ar"
                    ? "العودة للدخول"
                    : lang === "fr"
                    ? "Retour à la connexion"
                    : lang === "es"
                    ? "Volver al inicio"
                    : "Back to login"}
                </button>
              )}
            </div>
          ) : (
            <div>
              {tab === "login" && (
                <LoginForm
                  onSwitchTab={setTab}
                  onSuccess={() => setSuccess("")}
                  setGlobalError={setError}
                  setGlobalSuccess={setSuccess}
                />
              )}

              {tab === "signup" && (
                <SignupForm
                  onSwitchTab={() => setTab("login")}
                  setGlobalError={setError}
                  setGlobalSuccess={setSuccess}
                />
              )}

              {tab === "forgot" && (
                <ForgotPasswordForm
                  onSwitchTab={() => setTab("login")}
                  setGlobalError={setError}
                  setGlobalSuccess={setSuccess}
                />
              )}

              {tab === "reset" && (
                <ResetPasswordForm
                  onSuccessReset={handleSuccessReset}
                  setGlobalError={setError}
                  setGlobalSuccess={setSuccess}
                />
              )}

              {error && (
                <p className="text-xs text-red-500 text-center mt-4">{error}</p>
              )}
            </div>
          )}
        </div>

        <p
          className="text-center text-xs text-muted-foreground mt-4"
          style={{ fontFamily: sansFont(lang) }}
        >
          {lang === "ar" && (
            <>
              بالمتابعة، توافق على{" "}
              <Link
                to={localizedPath("/legal/terms")}
                className="text-primary hover:underline"
              >
                شروط الاستخدام
              </Link>{" "}
              و{" "}
              <Link
                to={localizedPath("/legal/privacy")}
                className="text-primary hover:underline"
              >
                سياسة الخصوصية
              </Link>
            </>
          )}
          {lang === "fr" && (
            <>
              En continuant, vous acceptez nos{" "}
              <Link
                to={localizedPath("/legal/terms")}
                className="text-primary hover:underline"
              >
                Conditions d'utilisation
              </Link>{" "}
              et notre{" "}
              <Link
                to={localizedPath("/legal/privacy")}
                className="text-primary hover:underline"
              >
                Politique de confidentialité
              </Link>
            </>
          )}
          {lang === "en" && (
            <>
              By continuing, you agree to our{" "}
              <Link
                to={localizedPath("/legal/terms")}
                className="text-primary hover:underline"
              >
                Terms of Use
              </Link>{" "}
              and{" "}
              <Link
                to={localizedPath("/legal/privacy")}
                className="text-primary hover:underline"
              >
                Privacy Policy
              </Link>
            </>
          )}
          {lang === "es" && (
            <>
              Al continuar, acepta nuestros{" "}
              <Link
                to={localizedPath("/legal/terms")}
                className="text-primary hover:underline"
              >
                Términos de uso
              </Link>{" "}
              y nuestra{" "}
              <Link
                to={localizedPath("/legal/privacy")}
                className="text-primary hover:underline"
              >
                Política de privacidad
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
} 