import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Lock, User, AlertTriangle, Activity, KeyRound, Terminal } from "lucide-react";
import { useI18n, serifFont, sansFont } from "../../lib/i18n";
import { supabase } from "@/lib/supabase";
import { throttle, sanitizeText } from "../../lib/security";
import { adminLogin } from "../../lib/adminAuth";

export default function AdminLogin() {
  const { lang, dir, t } = useI18n();
  const navigate = useNavigate();
  const [identity, setIdentity] = useState(""); // Email or Username
  const [pass, setPass] = useState("");
  const [honeypot, setHoneypot] = useState(""); // Anti-bot honeypot field
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 1. Anti-Spam Bot Trap (Honeypot Check)
    if (honeypot.trim().length > 0) {
      console.warn("Spam bot submission blocked.");
      return;
    }

    // 2. Throttle Login Attempts (Rate Limiting)
    const wait = throttle("admin_login", 4000);
    if (wait) {
      setError(
        lang === "ar"
          ? `⚠️ تم تجاوز حد المحاولات. انتظر ${wait} ثانية`
          : `⚠️ Rate limit exceeded. Standby ${wait}s`
      );
      return;
    }

    // 3. Input Sanitization (Anti-Injection / XSS Prevention)
    const cleanIdentity = sanitizeText(identity.trim(), 150);
    const cleanPass = pass.trim();

    if (!cleanIdentity || !cleanPass) {
      setError(
        lang === "ar"
          ? "الرجاء إدخال اسم المستخدم وكلمة المرور."
          : "Please provide valid credentials."
      );
      return;
    }

    setSubmitting(true);

    try {
      // 4. Check Local Fallback Credentials (VITE_ADMIN_USER / VITE_ADMIN_PASS)
      const envAuthSuccess = adminLogin(cleanIdentity, cleanPass);
      if (envAuthSuccess) {
        setSubmitting(false);
        navigate("/admin");
        return;
      }

      // 5. Authenticate via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanIdentity,
        password: cleanPass,
      });

      if (authError || !authData.user) {
        setError(
          lang === "ar"
            ? "خطأ في الاعتماد. البريد الإلكتروني أو كلمة المرور غير صحيحة."
            : lang === "fr"
            ? "Échec d'authentification. Identifiants invalides."
            : lang === "es"
            ? "Fallo de autenticación. Credenciales inválidas."
            : "Authentication failure. Invalid credentials."
        );
        return;
      }

      // 6. Query DB profiles table to check Admin Role & Frozen Status
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, admin_god_mode, is_frozen")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setError(
          lang === "ar"
            ? "فشل في التحقق من صلاحيات الحساب."
            : "Failed to verify account permissions."
        );
        return;
      }

      // Account Suspension Check
      if (profile.is_frozen) {
        await supabase.auth.signOut();
        setError(
          lang === "ar"
            ? "تم تجميد هذا الحساب. يرجى الاتصال بمسؤول النظام."
            : "Account is frozen. Contact system support."
        );
        return;
      }

      // Role Check (Accepts 'admin' role OR admin_god_mode)
      const isAdmin = profile.role === "admin" || profile.admin_god_mode === true;

      if (!isAdmin) {
        await supabase.auth.signOut();
        setError(
          lang === "ar"
            ? "عذراً، لا تملك صلاحية الوصول إلى لوحة التحكم."
            : "Access denied. Admin privileges required."
        );
        return;
      }

      // Authorized -> Redirect to CMS Admin Panel
      navigate("/admin");
    } catch (err) {
      console.error("Login exception:", err);
      setError("An unexpected system error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-mono select-none"
      dir={dir}
    >
      {/* Background Military Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:2rem_2rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

      {/* Military Radar Scan Effect */}
      <div className="absolute w-[800px] h-[800px] rounded-full border border-emerald-500/10 animate-ping pointer-events-none opacity-20" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-xl p-8 shadow-2xl relative z-10 backdrop-blur-md">
        {/* Top Status Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6 text-[10px] tracking-widest text-emerald-500 uppercase">
          <span className="flex items-center gap-1.5 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            SEC-ZONE :: LEVEL-4
          </span>
          <span className="text-slate-500 flex items-center gap-1">
            <Terminal size={12} /> SYS_OK
          </span>
        </div>

        {/* Brand & Security Clearance Badge */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-14 h-14 bg-emerald-950/80 border border-emerald-500/40 rounded-xl flex items-center justify-center mb-3 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <ShieldCheck size={28} />
          </div>
          <h1
            className="font-extrabold text-slate-100 text-xl tracking-tight"
            style={{ fontFamily: serifFont(lang) }}
          >
            {t("admin_panel")}
          </h1>
          <p
            className="text-[11px] text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-1"
            style={{ fontFamily: sansFont(lang) }}
          >
            <Activity size={12} className="text-emerald-500" /> MIZAN ENCRYPTED CMS GATEWAY
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={submit} className="space-y-4">
          {/* Honeypot field - Hidden from real users to catch automated bots */}
          <input
            type="text"
            name="website_confirm_field"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            style={{ display: "none" }}
            tabIndex={-1}
            autoComplete="off"
          />

          <div className="relative">
            <User
              size={16}
              className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${
                dir === "rtl" ? "right-3" : "left-3"
              }`}
            />
            <input
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              type="text"
              placeholder="OPERATOR_ID / USERNAME / EMAIL"
              autoComplete="username"
              maxLength={150}
              required
              className={`w-full py-2.5 text-xs font-sans border border-slate-800 rounded-lg bg-slate-950/80 text-slate-100 placeholder:text-slate-600 outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all ${
                dir === "rtl" ? "pr-9 pl-3 text-right" : "pl-9 pr-3 text-left"
              }`}
            />
          </div>

          <div className="relative">
            <Lock
              size={16}
              className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${
                dir === "rtl" ? "right-3" : "left-3"
              }`}
            />
            <input
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              type="password"
              placeholder="ACCESS_KEY / PASSWORD"
              autoComplete="current-password"
              maxLength={128}
              required
              className={`w-full py-2.5 text-xs font-sans border border-slate-800 rounded-lg bg-slate-950/80 text-slate-100 placeholder:text-slate-600 outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all ${
                dir === "rtl" ? "pr-9 pl-3 text-right" : "pl-9 pr-3 text-left"
              }`}
            />
          </div>

          {/* Security Alert Banner */}
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-400 text-[11px] flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-slate-950 font-black rounded-lg text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <span className="animate-pulse">AUTHENTICATING...</span>
            ) : (
              <>
                <KeyRound size={14} /> {t("login")}
              </>
            )}
          </button>
        </form>

        {/* Security Warning Footnote */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-tight">
            RESTRICTED ACCESS · AUTHORIZED PERSONNEL ONLY
          </p>
          <p className="text-[9px] text-slate-600 mt-0.5">
            ALL LOGIN ATTEMPTS ARE LOGGED & MONITORED
          </p>
        </div>
      </div>
    </div>
  );
}