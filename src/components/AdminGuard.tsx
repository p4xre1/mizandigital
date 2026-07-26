import React, { useEffect, useState, useMemo } from "react";
import { useI18n, type Lang } from "@/lib/i18n";
import { useRole, type Role } from "@/hooks/useRole";
import { SEOHead } from "@/components/seo/SEOHead";
import { TurnstileCaptcha } from "@/components/auth/TurnstileCaptcha";
import { ShieldCheck, ShieldAlert, Lock, Loader2, ArrowLeft, ArrowRight } from "lucide-react";

const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string) ||
  (import.meta.env.VITE_APP_URL as string) ||
  "https://www.mizan.page";

export interface AdminGuardProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
  requireUserManagement?: boolean;
  requireContentWriting?: boolean;
}

const GUARD_I18N = {
  ar: {
    title: "منطقة الإدارة المشفرة | منصة ميزان القانونية",
    description: "بوابة الإدارة المركزية وحماية البيانات القانونية لمنصة ميزان المغربية",
    verifyingTitle: "جاري الفحص الأمني...",
    verifyingDesc: "يتم التأكد من صلاحيات الجلسة ومشفرات الوصول الرقمية",
    securityTitle: "التحقق الأمني المتقدم",
    securityDesc: "يرجى إكمال التحدي الأمني المعتمد للوصول إلى لوحة التحكم.",
    deniedTitle: "تم رفض الوصول (403)",
    deniedDesc: "حسابك لا يمتلك الصلاحيات الإدارية المطلوبة للوصول إلى هذه الصفحة.",
    backHome: "العودة للرئيسية",
    retry: "إعادة المحاولة",
    badgeSecure: "حماية عسكرية مشفرة 256-bit",
  },
  fr: {
    title: "Zone d'Administration Sécurisée | Plateforme Mizan",
    description: "Portail d'administration centralisé et sécurisé pour la plateforme Mizan",
    verifyingTitle: "Vérification de sécurité en cours...",
    verifyingDesc: "Contrôle des autorisations de session et des clés d'accès numériques.",
    securityTitle: "Vérification de Sécurité Avancée",
    securityDesc: "Veuillez compléter le défi de sécurité pour accéder au panneau d'administration.",
    deniedTitle: "Accès Refusé (403)",
    deniedDesc: "Votre compte ne dispose pas des privilèges administratifs requis.",
    backHome: "Retour à l'accueil",
    retry: "Réessayer",
    badgeSecure: "Protection Militaire Chiffrée 256-bit",
  },
  en: {
    title: "Encrypted Secure Admin Zone | Mizan Legal",
    description: "Centralized admin security & legal data management portal for Mizan",
    verifyingTitle: "Verifying Security Parameters...",
    verifyingDesc: "Checking active session authorizations and digital access tokens.",
    securityTitle: "Advanced Security Verification",
    securityDesc: "Please complete the security challenge below to access the admin portal.",
    deniedTitle: "Access Denied (403)",
    deniedDesc: "Your account lacks the administrative permissions required for this route.",
    backHome: "Back to Home",
    retry: "Retry Verification",
    badgeSecure: "Military Grade 256-bit Security",
  },
  es: {
    title: "Zona de Administración Segura | Mizan Legal",
    description: "Portal centralizado de administración y seguridad legal para Mizan",
    verifyingTitle: "Verificando Parámetros de Seguridad...",
    verifyingDesc: "Comprobando la sesión y los tokens de acceso digital.",
    securityTitle: "Verificación de Seguridad Avanzada",
    securityDesc: "Por favor complete el desafío de seguridad para acceder al panel.",
    deniedTitle: "Acceso Denegado (403)",
    deniedDesc: "Su cuenta no posee los permisos administrativos necesarios.",
    backHome: "Volver al Inicio",
    retry: "Reintentar",
    badgeSecure: "Protección Grado Militar de 256 bits",
  },
} as const;

export function AdminGuard({
  children,
  allowedRoles,
  requireUserManagement = false,
  requireContentWriting = false,
}: AdminGuardProps) {
  const { lang, dir } = useI18n();
  const { role, loading, isStaff, canManageUsers, canWriteContent, isGuest } = useRole();
  const [turnstileVerified, setTurnstileVerified] = useState<boolean>(false);

  const strings = useMemo(() => GUARD_I18N[lang as Lang] || GUARD_I18N.en, [lang]);

  // Fast Memoized Evaluation of Role Capabilities
  const hasAuthorizedRole = useMemo(() => {
    if (isGuest) return false;
    
    // Explicit role checks if array provided
    if (allowedRoles && allowedRoles.length > 0) {
      return allowedRoles.includes(role);
    }

    if (requireUserManagement && !canManageUsers) return false;
    if (requireContentWriting && !canWriteContent) return false;

    // Default: Must be staff member (writer, marketer, admin, security_admin, root)
    return isStaff;
  }, [role, isGuest, allowedRoles, requireUserManagement, canManageUsers, requireContentWriting, canWriteContent, isStaff]);

  useEffect(() => {
    // Hard redirect to login for unauthenticated guest users
    if (!loading && isGuest && typeof window !== "undefined") {
      window.location.replace(`/${lang}/admin/login`);
    }
  }, [loading, isGuest, lang]);

  // ---------------------------------------------------------------------------
  // 1. Loading State (Fast render, Phones-First viewport & Security Meta)
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background text-foreground p-4 sm:p-6 transition-all duration-300">
        <SEOHead
          title={strings.title}
          description={strings.description}
          canonical={`${SITE_URL}/${lang}/admin`}
          noIndex={true}
          ogImage={`${SITE_URL}/Logo.svg`}
          ogImageAlt="Mizan Security Shield"
          fileUrl={`${SITE_URL}/Logo.svg`}
          fileType="image/svg+xml"
          keywords={["Mizan Admin", "Security Guard", "Legal Portal Admin"]}
        />
        <div className="w-full max-w-sm sm:max-w-md bg-card/80 backdrop-blur-xl border border-border/80 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 mx-auto flex items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
            <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 animate-spin" />
            <Lock className="w-3.5 h-3.5 absolute text-primary" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              {strings.verifyingTitle}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {strings.verifyingDesc}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. Access Denied State (403 Forbidden Shield)
  // ---------------------------------------------------------------------------
  if (!hasAuthorizedRole) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background text-foreground p-4 sm:p-6">
        <SEOHead
          title={`${strings.deniedTitle} | Mizan`}
          description={strings.deniedDesc}
          canonical={`${SITE_URL}/${lang}/admin`}
          noIndex={true}
          ogImage={`${SITE_URL}/Logo.svg`}
          ogImageAlt="Mizan Access Denied Shield"
        />
        <div className="w-full max-w-sm sm:max-w-md bg-card/90 backdrop-blur-2xl border border-destructive/30 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto flex items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 shadow-inner">
            <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
              <Lock className="w-3 h-3" />
              {strings.badgeSecure}
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">
              {strings.deniedTitle}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {strings.deniedDesc}
            </p>
          </div>

          <a
            href={`/${lang}`}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm hover:opacity-95 transition-all shadow-md active:scale-95"
          >
            {dir === "rtl" ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{strings.backHome}</span>
          </a>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. Cloudflare Turnstile Captcha Security Challenge
  // ---------------------------------------------------------------------------
  if (!turnstileVerified) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background text-foreground p-4 sm:p-6">
        <SEOHead
          title={`${strings.securityTitle} | Mizan Portal`}
          description={strings.securityDesc}
          canonical={`${SITE_URL}/${lang}/admin`}
          noIndex={true}
          ogImage={`${SITE_URL}/Logo.svg`}
          ogImageAlt="Mizan Turnstile Protection"
          fileUrl={`${SITE_URL}/Logo.svg`}
          fileType="image/svg+xml"
          keywords={["Security Verification", "Turnstile", "Mizan Legal"]}
        />

        <div className="w-full max-w-sm sm:max-w-md bg-card/90 backdrop-blur-2xl border border-border rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto flex items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
            <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>

          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {strings.badgeSecure}
            </span>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              {strings.securityTitle}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {strings.securityDesc}
            </p>
          </div>

          <div className="flex items-center justify-center pt-2 pb-1 overflow-x-auto min-h-[65px]">
            <TurnstileCaptcha
              onVerify={(token) => {
                if (token) setTurnstileVerified(true);
              }}
              onError={() => setTurnstileVerified(false)}
              onExpire={() => setTurnstileVerified(false)}
            />
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 4. Authenticated, Authorized, and Captcha-Verified Render
  // ---------------------------------------------------------------------------
  return (
    <>
      <SEOHead
        title={strings.title}
        description={strings.description}
        canonical={`${SITE_URL}/${lang}/admin`}
        noIndex={true}
        ogImage={`${SITE_URL}/Logo.svg`}
        ogImageAlt="Mizan Admin Dashboard"
      />
      {children}
    </>
  );
}