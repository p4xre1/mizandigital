import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Scale, Mail } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useI18n, useLocalizedPath } from "../lib/i18n";
import { LoginForm } from "../components/auth/LoginForm";
import { SignupForm } from "../components/auth/SignupForm";
import { ForgotPasswordForm } from "../components/auth/ForgotPasswordForm";
import { ResetPasswordForm } from "../components/auth/ResetPasswordForm";

type AuthTab = "login" | "signup" | "forgot" | "reset";

export default function Login() {
  const [tab, setTab] = useState<AuthTab>("login");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setError("");
    setSuccess("");
  }, [tab]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
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

  const localizedPath = useLocalizedPath();

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to={localizedPath("/")} className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center mx-auto">
              <Scale size={20} className="text-white" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Noto Serif Arabic', serif" }}>
            {tab === "login" && "تسجيل الدخول"}
            {tab === "signup" && "إنشاء حساب جديد"}
            {tab === "forgot" && "استعادة كلمة المرور"}
            {tab === "reset" && "تعيين كلمة مرور جديدة"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
            منصة ميزان — المجلة القانونية الرقمية
          </p>
        </div>

        <div className="bg-white border border-border rounded-2xl p-7 shadow-sm">
          {(tab === "login" || tab === "signup") && (
            <div className="flex border border-border rounded-xl overflow-hidden mb-6" dir="rtl">
              {(["login", "signup"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === t ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
                  style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}
                >
                  {t === "login" ? "تسجيل الدخول" : "حساب جديد"}
                </button>
              ))}
            </div>
          )}

          {success ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-3">
                <Mail size={20} className="text-green-600" />
              </div>
              <p className="text-sm text-green-700 font-medium" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
                {success}
              </p>
              {tab === "forgot" && (
                <button
                  onClick={() => {
                    setSuccess("");
                    setTab("login");
                  }}
                  className="text-xs text-primary mt-4 hover:underline"
                  dir="rtl"
                >
                  العودة للدخول
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

              {error && <p className="text-xs text-red-500 text-center mt-4">{error}</p>}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
          بالمتابعة، توافق على{' '}
          <Link to={localizedPath("/about")} className="text-primary hover:underline">شروط الاستخدام</Link>
          {' '}و{' '}
          <Link to={localizedPath("/about")} className="text-primary hover:underline">سياسة الخصوصية</Link>
        </p>
      </div>
    </div>
  );
}
