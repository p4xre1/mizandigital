import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Scale, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { trackEvent } from "../lib/analytics";
import { isValidEmail, sanitizeText, throttle } from "../lib/security";

export default function Login() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isValidEmail(email)) { setError("عنوان البريد الإلكتروني غير صالح."); return; }
    // Throttle brute-force login attempts from this browser.
    const wait = throttle("login", 3_000);
    if (wait > 0) { setError(`الرجاء الانتظار ${wait} ثانية قبل المحاولة مجدداً.`); return; }
    setLoading(true);
    if (!isSupabaseConfigured) {
      setError("Supabase غير مُهيّأ — أضف مفاتيح البيئة لتفعيل تسجيل الدخول.");
      setLoading(false);
      return;
    }
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;
      trackEvent("login", { method: "email" });
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ. تحقق من بيانات الدخول.");
    } finally { setLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const cleanName = sanitizeText(name, 120);
    if (cleanName.length < 2) { setError("الرجاء إدخال اسم صحيح."); return; }
    if (!isValidEmail(email)) { setError("عنوان البريد الإلكتروني غير صالح."); return; }
    if (password.length < 8) { setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل."); return; }
    // Throttle to curb automated bulk account creation from one browser.
    const wait = throttle("signup", 60_000);
    if (wait > 0) { setError(`الرجاء الانتظار قبل إنشاء حساب آخر.`); return; }
    setLoading(true);
    if (!isSupabaseConfigured) {
      setError("Supabase غير مُهيّأ — أضف مفاتيح البيئة لتفعيل التسجيل.");
      setLoading(false);
      return;
    }
    try {
      const { error: err } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: cleanName } },
      });
      if (err) throw err;
      trackEvent("sign_up", { method: "email" });
      setSuccess("تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتأكيد التسجيل.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء التسجيل.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center mx-auto">
              <Scale size={20} className="text-white" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Noto Serif Arabic', serif" }}>
            {tab === "login" ? "تسجيل الدخول" : "إنشاء حساب جديد"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>منصة ميزان — المجلة القانونية الرقمية</p>
        </div>

        <div className="bg-white border border-border rounded-2xl p-7 shadow-sm">
          {/* Tabs */}
          <div className="flex border border-border rounded-xl overflow-hidden mb-6" dir="rtl">
            {(["login", "signup"] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(""); setSuccess(""); }}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === t ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
                style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
                {t === "login" ? "تسجيل الدخول" : "حساب جديد"}
              </button>
            ))}
          </div>

          {success ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-3">
                <Mail size={20} className="text-green-600" />
              </div>
              <p className="text-sm text-green-700 font-medium" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>{success}</p>
            </div>
          ) : (
            <form onSubmit={tab === "login" ? handleLogin : handleSignup} className="space-y-4" dir="rtl">
              {tab === "signup" && (
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>الاسم الكامل</label>
                  <input required maxLength={120} value={name} onChange={e => setName(e.target.value)}
                    placeholder="محمد أمين"
                    className="w-full px-4 py-2.5 text-sm border border-border rounded-xl bg-gray-50 focus:outline-none focus:border-primary transition-colors text-right"
                    style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }} />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>البريد الإلكتروني</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-border rounded-xl bg-gray-50 focus:outline-none focus:border-primary transition-colors"
                    dir="ltr" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>كلمة المرور</label>
                <div className="relative">
                  <Lock size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input required minLength={tab === "signup" ? 8 : undefined} maxLength={128} type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-10 py-2.5 text-sm border border-border rounded-xl bg-gray-50 focus:outline-none focus:border-primary transition-colors"
                    dir="ltr" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-xs text-red-500 text-center">{error}</p>}

              <button type="submit" disabled={loading}
                className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-colors text-sm disabled:opacity-60"
                style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
                {loading ? "جاري التحميل..." : tab === "login" ? "دخول" : "إنشاء الحساب"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
          بالمتابعة، توافق على{" "}
          <Link to="/about" className="text-primary hover:underline">شروط الاستخدام</Link>
          {" "}و{" "}
          <Link to="/about" className="text-primary hover:underline">سياسة الخصوصية</Link>
        </p>
      </div>
    </div>
  );
}
