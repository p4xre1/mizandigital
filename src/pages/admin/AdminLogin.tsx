import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  User,
  AlertTriangle,
  Activity,
  KeyRound,
  Terminal,
  Eye,
  EyeOff,
  Globe,
  Fingerprint,
  CheckCircle2,
  Cpu,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { useI18n, serifFont, sansFont } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { throttle, sanitizeText } from "@/lib/security";
import { adminLogin } from "@/lib/adminAuth";
import { SEOHead } from "@/components/seo/SEOHead";

// Platform domain reference
const SITE_DOMAIN = import.meta.env.VITE_SITE_URL || "https://www.mizan.page";

// Allowed staff roles for admin gateway clearance
const ALLOWED_ADMIN_ROLES = new Set([
  "root",
  "security_admin",
  "admin",
  "marketer",
  "writer",
  "editor",
  "superadmin",
]);

// Supabase Profile query shape
interface ProfileAuthCheck {
  role: string | null;
  admin_god_mode?: boolean | null;
  is_frozen?: boolean | null;
}

interface ProfileEmailLookup {
  email: string;
}

// Helper for dynamic rate-limit error message
function getRateLimitMessage(lang: string, sec: number): string {
  switch (lang) {
    case "ar":
      return `⚠️ تم تجاوز حد المحاولات. يرجى الانتظار ${sec} ثانية`;
    case "fr":
      return `⚠️ Limite de tentatives dépassée. Attendez ${sec}s`;
    case "es":
      return `⚠️ Límite de intentos superado. Espere ${sec}s`;
    default:
      return `⚠️ Rate limit exceeded. Standby ${sec}s`;
  }
}

// Master 4-Language Dictionary for Admin Gateway
const TRANSLATIONS = {
  ar: {
    seoTitle: "بوابة الإدارة المشفرة | منصة ميزان القانونية",
    seoDesc: "بوابة الدخول الآمنة للوحة التحكم والإدارة لمنصة ميزان الرقمية.",
    securityZone: "منطقة أمنية :: المستوى 4",
    sysStatus: "النظام محمي",
    gatewayTitle: "لوحة تحكم الإدارة",
    gatewaySubtitle: "بوابة ميزان المشفرة لإدارة المحتوى والأمن",
    identityPlaceholder: "اسم المستخدم أو البريد الإلكتروني",
    identityLabel: "اسم المستخدم أو البريد الإلكتروني",
    passPlaceholder: "مفتاح المرور المشفر",
    passLabel: "كلمة المرور",
    loginBtn: "تسجيل الدخول الآمن",
    authenticating: "جاري المصادقة والتشفير...",
    emptyFieldsErr: "يرجى تقديم بيانات الاعتماد كاملة والصالحة.",
    authFailedErr: "فشل في المصادقة. البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    permVerifyErr: "فشل في التحقق من صلاحيات المشغل.",
    accountFrozenErr: "هذا الحساب مجمد حالياً. يرجى مراجعة مسؤول الأمن السيبراني.",
    accessDeniedErr: "عذراً، لا تملك الصلاحيات الإدارية المطلوبة للوصول.",
    systemErrorErr: "حدث خطأ غير متوقع في النظام. حاول لاحقاً.",
    footerRestricted: "وصول مقيد · للأشخاص المصرح لهم فقط",
    footerMonitored: "جميع محاولات الدخول مسجلة ومراقبة بأعلى درجات التشفير",
    backToSite: "العودة للموقع الرئيسي",
  },
  fr: {
    seoTitle: "Portail d'Administration Chiffré | Plateforme Mizan",
    seoDesc: "Portail de connexion sécurisé pour le panneau d'administration Mizan.",
    securityZone: "ZONE SEC :: NIVEAU-4",
    sysStatus: "SYS_OK",
    gatewayTitle: "Panneau d'Administration",
    gatewaySubtitle: "PASSERELLE CMS CHIFFRÉE MIZAN",
    identityPlaceholder: "Nom d'utilisateur ou E-mail",
    identityLabel: "Nom d'utilisateur ou E-mail",
    passPlaceholder: "CLÉ D'ACCÈS / MOT DE PASSE",
    passLabel: "Mot de passe",
    loginBtn: "CONNEXION SÉCURISÉE",
    authenticating: "AUTHENTIFICATION EN COURS...",
    emptyFieldsErr: "Veuillez fournir des identifiants valides.",
    authFailedErr: "Échec d'authentification. Identifiants invalides.",
    permVerifyErr: "Impossible de vérifier les autorisations du compte.",
    accountFrozenErr: "Le compte est suspendu. Contactez le support système.",
    accessDeniedErr: "Accès refusé. Privilèges administratifs requis.",
    systemErrorErr: "Une erreur système inattendue s'est produite.",
    footerRestricted: "ACCÈS RESTREINT · PERSONNEL AUTORISÉ UNIQUEMENT",
    footerMonitored: "TOUTES LES TENTATIVES DE CONNEXION SONT ENREGISTRÉES",
    backToSite: "Retour au site principal",
  },
  en: {
    seoTitle: "Encrypted Admin Gateway | Mizan Legal Platform",
    seoDesc: "Secure administrative login portal for Mizan Digital System.",
    securityZone: "SEC-ZONE :: LEVEL-4",
    sysStatus: "SYS_OK",
    gatewayTitle: "Admin Control Center",
    gatewaySubtitle: "MIZAN ENCRYPTED CMS GATEWAY",
    identityPlaceholder: "Username or Email",
    identityLabel: "Username or Email",
    passPlaceholder: "ACCESS_KEY / PASSWORD",
    passLabel: "Password",
    loginBtn: "SECURE LOGIN",
    authenticating: "AUTHENTICATING...",
    emptyFieldsErr: "Please provide valid credentials.",
    authFailedErr: "Authentication failure. Invalid credentials.",
    permVerifyErr: "Failed to verify account permissions.",
    accountFrozenErr: "Account is frozen. Contact system administrator.",
    accessDeniedErr: "Access denied. Administrative privileges required.",
    systemErrorErr: "An unexpected system error occurred.",
    footerRestricted: "RESTRICTED ACCESS · AUTHORIZED PERSONNEL ONLY",
    footerMonitored: "ALL LOGIN ATTEMPTS ARE LOGGED & MONITORED",
    backToSite: "Back to main site",
  },
  es: {
    seoTitle: "Portal de Administración Cifrado | Plataforma Mizan",
    seoDesc: "Portal de inicio de sesión seguro para la administración de Mizan.",
    securityZone: "ZONA-SEC :: NIVEL-4",
    sysStatus: "SISTEMA_OK",
    gatewayTitle: "Panel de Administración",
    gatewaySubtitle: "PASARELA CMS CIFRADA MIZAN",
    identityPlaceholder: "Nombre de usuario o Correo",
    identityLabel: "Usuario o Correo Electrónico",
    passPlaceholder: "CLAVE DE ACCESO / CONTRASEÑA",
    passLabel: "Contraseña",
    loginBtn: "INICIAR SESIÓN SEGURA",
    authenticating: "AUTENTICANDO...",
    emptyFieldsErr: "Por favor proporcione credenciales válidas.",
    authFailedErr: "Fallo de autenticación. Credenciales inválidas.",
    permVerifyErr: "No se pudieron verificar los permisos de la cuenta.",
    accountFrozenErr: "Cuenta congelada. Contacte al administrador del sistema.",
    accessDeniedErr: "Acceso denegado. Se requieren privilegios administrativos.",
    systemErrorErr: "Ocurrió un error inesperado en el sistema.",
    footerRestricted: "ACCESO RESTRINGIDO · SÓLO PERSONAL AUTORIZADO",
    footerMonitored: "TODOS LOS INTENTOS SON REGISTRADOS Y MONITOREADOS",
    backToSite: "Volver al sitio principal",
  },
};

export default function AdminLogin() {
  const { lang, dir, setLang } = useI18n();
  const navigate = useNavigate();

  const t = TRANSLATIONS[lang as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;

  // Form State
  const [identity, setIdentity] = useState("");
  const [pass, setPass] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Submit Handler
  const submit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    // 1. Anti-Spam Bot Trap Check
    if (honeypot.trim().length > 0) {
      console.warn("Security Alert: Spam bot honeypot triggered.");
      return;
    }

    // 2. Throttle Login Attempts (Rate Limiting)
    const wait = throttle("admin_login_attempt", 4000);
    if (wait) {
      setError(getRateLimitMessage(lang, wait));
      return;
    }

    // 3. Input Sanitization (Keep exact password intact)
    const cleanIdentity = sanitizeText(identity.trim(), 150);
    const rawPass = pass;

    if (!cleanIdentity || !rawPass) {
      setError(t.emptyFieldsErr);
      return;
    }

    setSubmitting(true);

    try {
      // 4. Local CMS fallback check
      const localAuthSuccess = adminLogin(cleanIdentity, rawPass);
      if (localAuthSuccess) {
        setSubmitting(false);
        navigate(`/${lang}/admin`);
        return;
      }

      // 5. Username to Email Resolution
      let targetEmail = cleanIdentity;

      if (!cleanIdentity.includes("@")) {
        const { data: rawUserProfile, error: lookupError } = await supabase
          .from("profiles")
          .select("email")
          .eq("username", cleanIdentity)
          .maybeSingle();

        const userProfile = rawUserProfile as ProfileEmailLookup | null;

        if (lookupError || !userProfile?.email) {
          setError(t.authFailedErr);
          setSubmitting(false);
          return;
        }

        targetEmail = userProfile.email;
      }

      // 6. Authenticate via Supabase Auth Engine using resolved email
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: rawPass,
      });

      if (authError || !authData.user) {
        setError(t.authFailedErr);
        setSubmitting(false);
        return;
      }

      // 7. Role & Account Freeze Verification (Defensive multi-step query)
      let profile: ProfileAuthCheck | null = null;

      const { data: rawData, error: profileError } = await supabase
        .from("profiles")
        .select("role, admin_god_mode, is_frozen")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (profileError) {
        // Safe Fallback: If custom schema columns (admin_god_mode/is_frozen) don't exist yet
        const { data: basicData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authData.user.id)
          .maybeSingle();

        if (basicData) {
          profile = basicData as ProfileAuthCheck;
        }
      } else {
        profile = rawData as ProfileAuthCheck | null;
      }

      // Account Suspension Check
      if (profile?.is_frozen) {
        await supabase.auth.signOut();
        setError(t.accountFrozenErr);
        setSubmitting(false);
        return;
      }

      // Multi-tier Role Clearance (Checks profile table + auth metadata)
      const userRole = (
        profile?.role ||
        (authData.user.app_metadata?.role as string) ||
        (authData.user.user_metadata?.role as string) ||
        ""
      )
        .toLowerCase()
        .trim();

      const hasAdminClearance =
        profile?.admin_god_mode === true || ALLOWED_ADMIN_ROLES.has(userRole);

      if (!hasAdminClearance) {
        await supabase.auth.signOut();
        setError(t.accessDeniedErr);
        setSubmitting(false);
        return;
      }

      // Clearance Granted -> Redirect to CMS Admin Suite
      navigate(`/${lang}/admin`);
    } catch (err) {
      console.error("Critical Login Exception:", err);
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
        canonical={`${SITE_DOMAIN}/${lang}/admin/login`}
        noIndex={true}
      />

      <div
        className="min-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-3 sm:p-6 relative overflow-hidden font-mono select-none"
        dir={dir}
      >
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] sm:bg-[size:2rem_2rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

        {/* Radar Effect */}
        <div className="absolute w-[500px] h-[500px] sm:w-[800px] sm:h-[800px] rounded-full border border-emerald-500/10 animate-ping pointer-events-none opacity-20" />

        {/* Language Switcher */}
        <div className="absolute top-3 sm:top-6 z-20 flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-full px-2 py-1 shadow-md text-xs">
          <Globe size={14} className="text-emerald-400 ml-1 rtl:mr-1" />
          {(["ar", "fr", "en", "es"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`px-2 py-1 rounded-full text-[11px] font-bold uppercase transition-all ${
                lang === l
                  ? "bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Login Card */}
        <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-2xl p-5 sm:p-8 shadow-2xl relative z-10 backdrop-blur-xl my-auto transition-all">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-6 text-[10px] sm:text-[11px] tracking-wider text-emerald-500 uppercase font-bold">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {t.securityZone}
            </span>
            <span className="text-slate-500 flex items-center gap-1">
              <Terminal size={12} /> {t.sysStatus}
            </span>
          </div>

          <div className="flex flex-col items-center mb-6 text-center">
            <div className="w-16 h-16 sm:w-18 sm:h-18 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl flex items-center justify-center mb-3 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              {!logoError ? (
                <img
                  src="/Logo.svg"
                  alt="Mizan Logo"
                  width={40}
                  height={40}
                  className="w-10 h-10 object-contain filter drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  loading="eager"
                  decoding="async"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <ShieldCheck size={32} />
              )}
            </div>

            <h1
              className="font-extrabold text-slate-100 text-xl sm:text-2xl tracking-tight"
              style={{ fontFamily: serifFont(lang) }}
            >
              {t.gatewayTitle}
            </h1>

            <p
              className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider flex items-center justify-center gap-1"
              style={{ fontFamily: sansFont(lang) }}
            >
              <Activity size={12} className="text-emerald-500 shrink-0" />
              <span>{t.gatewaySubtitle}</span>
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4" noValidate>
            <input
              type="text"
              name="website_confirm_field"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="sr-only"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            <div className="space-y-1">
              <label
                htmlFor="admin-identity"
                className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block"
              >
                {t.identityLabel}
              </label>
              <div className="relative">
                <User
                  size={18}
                  className={`absolute top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none ${
                    dir === "rtl" ? "right-3.5" : "left-3.5"
                  }`}
                />
                <input
                  id="admin-identity"
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  type="text"
                  placeholder={t.identityPlaceholder}
                  autoComplete="username"
                  maxLength={150}
                  required
                  className={`w-full h-12 py-3 text-sm font-sans border border-slate-800 rounded-xl bg-slate-950/90 text-slate-100 placeholder:text-slate-600 outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all ${
                    dir === "rtl" ? "pr-11 pl-4 text-right" : "pl-11 pr-4 text-left"
                  }`}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="admin-password"
                className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block"
              >
                {t.passLabel}
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className={`absolute top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none ${
                    dir === "rtl" ? "right-3.5" : "left-3.5"
                  }`}
                />
                <input
                  id="admin-password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  placeholder={t.passPlaceholder}
                  autoComplete="current-password"
                  maxLength={128}
                  required
                  className={`w-full h-12 py-3 text-sm font-sans border border-slate-800 rounded-xl bg-slate-950/90 text-slate-100 placeholder:text-slate-600 outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all ${
                    dir === "rtl" ? "pr-11 pl-11 text-right" : "pl-11 pr-11 text-left"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                  className={`absolute top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center ${
                    dir === "rtl" ? "left-1" : "right-1"
                  }`}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in zoom-in-95 duration-150"
              >
                <AlertTriangle size={16} className="shrink-0 text-rose-400 mt-0.5" />
                <span className="leading-relaxed font-sans">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs sm:text-sm uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(16,185,129,0.25)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
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

          <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5 bg-slate-950/50 p-2 rounded-lg border border-slate-800/50">
              <Cpu size={12} className="text-emerald-400 shrink-0" />
              <span className="truncate">TLS 1.3 · AES-256</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-950/50 p-2 rounded-lg border border-slate-800/50">
              <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
              <span className="truncate">Zero-Trust Active</span>
            </div>
          </div>

          <div className="mt-4 text-center space-y-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-tight">
              {t.footerRestricted}
            </p>
            <p className="text-[9px] text-slate-600">{t.footerMonitored}</p>

            <div className="pt-2">
              <Link
                to={`/${lang}`}
                className="inline-flex items-center gap-1 text-[11px] text-emerald-400/80 hover:text-emerald-300 transition-colors font-sans"
              >
                {dir === "rtl" ? <ArrowRight size={12} /> : <ArrowLeft size={12} />}
                <span>{t.backToSite}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}