/* eslint-disable */
// noinspection SpellCheckingInspection
/* cspell:disable */

import { useState, SyntheticEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, User, AlertTriangle, KeyRound, Eye, EyeOff, Fingerprint } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { throttle, sanitizeText } from "@/lib/security";
import { adminLogin } from "@/lib/adminAuth";
import { SEOHead } from "@/components/seo/SEOHead";

// Correct path matching your file name in src/constants/
import { ADMIN_TRANSLATIONS, SupportedLang } from "@/constants/adminLoginTranslations";

// Correct path matching src/pages/admin/AdminUIComponents.tsx
import {
  AdminLanguageSwitcher,
  FormInputField,
  AdminSecurityHeader,
  AdminSecurityFooter,
} from "./AdminUIComponents";

const SITE_DOMAIN = import.meta.env.VITE_SITE_URL || import.meta.env.VITE_APP_URL || "https://www.mizan.page";
const ALLOWED_ADMIN_ROLES = new Set(["root", "security_admin", "admin", "marketer", "writer"]);

interface ProfileAuthCheck {
  role: string | null;
  admin_god_mode: boolean | null;
  is_frozen: boolean | null;
}

export default function AdminPages() {
  const { lang, dir, setLang } = useI18n();
  const navigate = useNavigate();

  const currentLang = (lang in ADMIN_TRANSLATIONS ? lang : "en") as SupportedLang;
  const t = ADMIN_TRANSLATIONS[currentLang];

  const [identity, setIdentity] = useState("");
  const [pass, setPass] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (honeypot.trim().length > 0) return;

    const wait = throttle("admin_login_attempt", 4000);
    if (wait) {
      setError(`⚠️ Standby ${wait}s`);
      return;
    }

    const cleanIdentity = sanitizeText(identity.trim(), 150);
    const cleanPass = pass.trim();

    if (!cleanIdentity || !cleanPass) {
      setError(t.emptyFieldsErr);
      return;
    }

    setSubmitting(true);

    try {
      if (adminLogin(cleanIdentity, cleanPass)) {
        setSubmitting(false);
        navigate(`/${currentLang}/admin`);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanIdentity,
        password: cleanPass,
      });

      if (authError || !authData.user) {
        setError(t.authFailedErr);
        return;
      }

      const { data: rawData, error: profileError } = await supabase
          .from("profiles")
          .select("role, admin_god_mode, is_frozen")
          .eq("id", authData.user.id)
          .single();

      const profile = rawData as ProfileAuthCheck | null;

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setError(t.permVerifyErr);
        return;
      }

      if (profile.is_frozen) {
        await supabase.auth.signOut();
        setError(t.accountFrozenErr);
        return;
      }

      const userRole = (profile.role || "").toLowerCase().trim();
      const hasAdminClearance = profile.admin_god_mode === true || ALLOWED_ADMIN_ROLES.has(userRole);

      if (!hasAdminClearance) {
        await supabase.auth.signOut();
        setError(t.accessDeniedErr);
        return;
      }

      navigate(`/${currentLang}/admin`);
    } catch (err) {
      console.error("Login Error:", err);
      setError(t.systemErrorErr);
    } finally {
      setSubmitting(false);
    }
  };

  return (
      <>
        <SEOHead
            title={t.seoTitle}
            description={t.seoDesc}
            canonical={`${SITE_DOMAIN}/${currentLang}/admin/login`}
            noIndex={true}
        />

        <div
            className="min-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-3 sm:p-6 relative overflow-hidden font-mono select-none"
            dir={dir}
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] sm:bg-[size:2rem_2rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

          <AdminLanguageSwitcher currentLang={currentLang} onSelectLang={setLang as (l: SupportedLang) => void} />

          <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-2xl p-5 sm:p-8 shadow-2xl relative z-10 backdrop-blur-xl my-auto">
            <AdminSecurityHeader
                securityZoneText={t.securityZone}
                sysStatusText={t.sysStatus}
                title={t.gatewayTitle}
                subtitle={t.gatewaySubtitle}
                lang={currentLang}
            />

            <form onSubmit={submit} className="space-y-4" noValidate>
              <input
                  type="text"
                  name="website_confirm_field"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  className="sr-only"
                  tabIndex={-1}
                  autoComplete="off"
              />

              <FormInputField label={t.identityLabel}>
                <User
                    size={18}
                    className={`absolute top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none ${
                        dir === "rtl" ? "right-3.5" : "left-3.5"
                    }`}
                />
                <input
                    value={identity}
                    onChange={(e) => setIdentity(e.target.value)}
                    type="text"
                    placeholder={t.identityPlaceholder}
                    autoComplete="username"
                    maxLength={150}
                    required
                    className={`w-full min-h-[44px] h-12 py-3 text-sm font-sans border border-slate-800 rounded-xl bg-slate-950/90 text-slate-100 placeholder:text-slate-600 outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all ${
                        dir === "rtl" ? "pr-11 pl-4 text-right" : "pl-11 pr-4 text-left"
                    }`}
                />
              </FormInputField>

              <FormInputField label={t.passLabel}>
                <Lock
                    size={18}
                    className={`absolute top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none ${
                        dir === "rtl" ? "right-3.5" : "left-3.5"
                    }`}
                />
                <input
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder={t.passPlaceholder}
                    autoComplete="current-password"
                    maxLength={128}
                    required
                    className={`w-full min-h-[44px] h-12 py-3 text-sm font-sans border border-slate-800 rounded-xl bg-slate-950/90 text-slate-100 placeholder:text-slate-600 outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all ${
                        dir === "rtl" ? "pr-11 pl-11 text-right" : "pl-11 pr-11 text-left"
                    }`}
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                    className={`absolute top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 min-w-[44px] min-h-[44px] flex items-center justify-center ${
                        dir === "rtl" ? "left-1" : "right-1"
                    }`}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </FormInputField>

              {error && (
                  <div
                      role="alert"
                      className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in"
                  >
                    <AlertTriangle size={16} className="shrink-0 text-rose-400 mt-0.5" />
                    <span className="leading-relaxed font-sans">{error}</span>
                  </div>
              )}

              <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[44px] h-12 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs sm:text-sm uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(16,185,129,0.25)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
              >
                {submitting ? (
                    <span className="flex items-center gap-2 animate-pulse">
                  <Fingerprint size={18} className="animate-spin" />
                      {t.authenticating}
                </span>
                ) : (
                    <>
                      <KeyRound size={16} />
                      <span>{t.loginBtn}</span>
                    </>
                )}
              </button>
            </form>

            <AdminSecurityFooter
                restrictedText={t.footerRestricted}
                monitoredText={t.footerMonitored}
                backText={t.backToSite}
                lang={currentLang}
                dir={dir}
            />
          </div>
        </div>
      </>
  );
}