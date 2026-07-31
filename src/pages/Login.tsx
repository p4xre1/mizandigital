import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Scale, Mail, ShieldAlert, Sparkles } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useI18n, useLocalizedPath, serifFont, sansFont } from "../lib/i18n";
import { useSeo } from "../lib/seo";

// Component sub-views
import { LoginForm } from "../components/auth/LoginForm";
import { SignupForm } from "../components/auth/SignupForm";
import { ForgotPasswordForm } from "../components/auth/ForgotPasswordForm";
import { ResetPasswordForm } from "../components/auth/ResetPasswordForm";

type AuthTab = "login" | "signup" | "forgot" | "reset";

export default function Login() {
  const [tab, setTab] = useState<AuthTab>("login");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const { lang, dir, t } = useI18n();
  const localizedPath = useLocalizedPath();
  const isRegisterRoute = location.pathname.endsWith("/register");

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
      path: location.pathname,
      lang,
    },
    [lang, tab, t, location.pathname]
  );

  // Clear messages when switching tabs
  useEffect(() => {
    setError("");
    setSuccess("");
  }, [tab]);

  useEffect(() => {
    if (isRegisterRoute) {
      setTab("signup");
    }
  }, [isRegisterRoute]);

  // Auth State Listener & Automatic Redirect
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate(localizedPath("/profile"));
      }
    });

    // Listen to password recovery and login events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setTab("reset");
        setError("");
        setSuccess("");
      } else if (event === "SIGNED_IN" && session) {
        navigate(localizedPath("/profile"));
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, localizedPath]);

  const handleSuccessReset = () => {
    setTimeout(() => {
      setTab("login");
      setSuccess("");
    }, 3000);
  };

  return (
    <div
      className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-background transition-colors duration-200"
      dir={dir}
    >
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <Link
            to={localizedPath("/")}
            className="inline-flex items-center gap-3 mb-4 focus:outline-none focus:ring-2 focus:ring-primary rounded-xl"
            aria-label="Mizan Digital - Home"
          >
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center mx-auto shadow-sm">
              <Scale size={20} className="text-primary-foreground" aria-hidden="true" />
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
                ? "إنشاء حساب مجاني جديد"
                : lang === "fr"
                ? "Créer un compte gratuit"
                : lang === "es"
                ? "Crear una cuenta gratuita"
                : "Create Free Account")}
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

        {/* Free Access Notice Banner */}
        <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-400">
          <Sparkles size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span style={{ fontFamily: sansFont(lang) }}>
            {lang === "ar" && "جميع الحسابات المنشأة مجانية بالكامل ومفتوحة المصادر بدون أي رسوم."}
            {lang === "fr" && "Tous les comptes créés sont 100% gratuits et sans aucun frais."}
            {lang === "en" && "All created accounts are 100% free with full platform access."}
            {lang === "es" && "Todas las cuentas creadas son 100% gratuitas con acceso completo."}
          </span>
        </div>

        {/* Form Card Container */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-sm transition-colors duration-200">
          {(tab === "login" || tab === "signup") && (
            <div
              className="flex border border-border rounded-xl overflow-hidden mb-6 bg-muted/30"
              role="tablist"
              aria-label="Auth tabs"
            >
              {(["login", "signup"] as const).map((tTab) => {
                const isActive = tab === tTab;
                return (
                  <button
                    key={tTab}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setTab(tTab)}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-all min-h-[42px] ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
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
                      ? "حساب مجاني"
                      : lang === "fr"
                      ? "Compte Gratuit"
                      : lang === "es"
                      ? "Cuenta Gratis"
                      : "Free Account"}
                  </button>
                );
              })}
            </div>
          )}

          {success ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Mail size={20} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              </div>
              <p
                className="text-sm text-emerald-700 dark:text-emerald-300 font-medium leading-relaxed"
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
                  className="text-xs text-primary font-semibold mt-4 hover:underline block mx-auto focus:outline-none"
                  style={{ fontFamily: sansFont(lang) }}
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
                <p 
                  className="text-xs text-destructive text-center font-medium mt-4 bg-destructive/10 p-2.5 rounded-lg border border-destructive/20"
                  style={{ fontFamily: sansFont(lang) }}
                >
                  {error}
                </p>
              )}
            </div>
          )}

          {/* Admin Account Restriction Notice */}
          <div className="mt-6 pt-4 border-t border-border flex items-start gap-2 text-[11px] text-muted-foreground leading-normal">
            <ShieldAlert size={14} className="shrink-0 text-amber-500 mt-0.5" />
            <span style={{ fontFamily: sansFont(lang) }}>
              {lang === "ar" && "ملاحظة: لا يمكن إنشاء حسابات المسؤولين (Admin) من هنا. يتم تعيين المسؤولين حصرياً عبر CMS أو Supabase."}
              {lang === "fr" && "Note : Les comptes administrateurs sont créés uniquement via le CMS ou Supabase."}
              {lang === "en" && "Note: Admin accounts cannot be created here. Admins are created solely through CMS or Supabase."}
              {lang === "es" && "Nota: Las cuentas de administrador solo se crean a través de CMS o Supabase."}
            </span>
          </div>
        </div>

        {/* Footer Legal Links */}
        <p
          className="text-center text-xs text-muted-foreground mt-4 leading-relaxed"
          style={{ fontFamily: sansFont(lang) }}
        >
          {lang === "ar" && (
            <>
              بالمتابعة، توافق على{" "}
              <Link
                to={localizedPath("/legal#terms")}
                className="text-primary hover:underline font-medium"
              >
                شروط الاستخدام
              </Link>{" "}
              و{" "}
              <Link
                to={localizedPath("/legal#privacy")}
                className="text-primary hover:underline font-medium"
              >
                سياسة الخصوصية
              </Link>
            </>
          )}
          {lang === "fr" && (
            <>
              En continuant, vous acceptez nos{" "}
              <Link
                to={localizedPath("/legal#terms")}
                className="text-primary hover:underline font-medium"
              >
                Conditions d'utilisation
              </Link>{" "}
              et notre{" "}
              <Link
                to={localizedPath("/legal#privacy")}
                className="text-primary hover:underline font-medium"
              >
                Politique de confidentialité
              </Link>
            </>
          )}
          {lang === "en" && (
            <>
              By continuing, you agree to our{" "}
              <Link
                to={localizedPath("/legal#terms")}
                className="text-primary hover:underline font-medium"
              >
                Terms of Use
              </Link>{" "}
              and{" "}
              <Link
                to={localizedPath("/legal#privacy")}
                className="text-primary hover:underline font-medium"
              >
                Privacy Policy
              </Link>
            </>
          )}
          {lang === "es" && (
            <>
              Al continuar, acepta nuestros{" "}
              <Link
                to={localizedPath("/legal#terms")}
                className="text-primary hover:underline font-medium"
              >
                Términos de uso
              </Link>{" "}
              y nuestra{" "}
              <Link
                to={localizedPath("/legal#privacy")}
                className="text-primary hover:underline font-medium"
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