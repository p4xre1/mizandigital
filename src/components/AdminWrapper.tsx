import React, { useState, useMemo, useCallback } from "react";
import { useI18n, type Lang } from "@/lib/i18n";
import { useRole, type Role } from "@/hooks/useRole";
import { AdminGuard } from "@/components/AdminGuard";
import { SEOHead } from "@/components/seo/SEOHead";
import { adminLogout } from "@/lib/adminAuth";
import {
  LayoutDashboard,
  FileText,
  Users,
  Search,
  ShieldCheck,
  BarChart3,
  Layers,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Shield,
  User,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string) ||
  (import.meta.env.VITE_APP_URL as string) ||
  "https://www.mizan.page";

export interface AdminWrapperProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  allowedRoles?: Role[];
  requireUserManagement?: boolean;
  requireContentWriting?: boolean;
}

const ADMIN_I18N = {
  ar: {
    dashboard: "لوحة التحكم",
    articles: "إدارة المقالات",
    users: "المستخدمون والصلحيات",
    seo: "محركات البحث SEO",
    security: "الأمن والرقابة",
    traffic: "الزيارات والتحليلات",
    pages: "إدارة الصفحات",
    logout: "تسجيل الخروج",
    backToSite: "العودة للموقع",
    seoTitle: "لوحة تحكم الإدارة المشفرة | منصة ميزان القانونية",
    seoDesc: "مركـز الإدارة المركزي وحماية البيانات والوثائق القانونية لمنصة ميزان",
    keywords: [
      "لوحة التحكم ميزان",
      "إدارة المقالات القانونية",
      "الأمن والرقابة المشفرة",
      "تحليلات محركات البحث",
      "الوثائق والجريدة الرسمية",
    ],
    roleBadges: {
      root: "مالك النظام (Root)",
      security_admin: "مسؤول الأمن الرقمي",
      admin: "مدير النظام",
      marketer: "مسؤول التسويق",
      writer: "محرر قانوني",
      member: "عضو",
      guest: "زائر",
    },
    navGroupMain: "الرئيسية والإدارة",
    navGroupContent: "المحتوى والوثائق",
    navGroupSystem: "النظام والأمان",
  },
  fr: {
    dashboard: "Tableau de Bord",
    articles: "Gestion des Articles",
    users: "Utilisateurs & Rôles",
    seo: "Contrôle SEO",
    security: "Sécurité & Audit",
    traffic: "Trafic & Analytique",
    pages: "Gestion des Pages",
    logout: "Déconnexion",
    backToSite: "Retour au site",
    seoTitle: "Panneau d'Administration Sécurisé | Mizan Legal",
    seoDesc: "Centre d'administration centralisé et sécurisé pour la plateforme juridique Mizan",
    keywords: [
      "administration Mizan",
      "tableau de bord juridique",
      "sécurité des données",
      "référencement SEO",
      "gestion de contenu",
    ],
    roleBadges: {
      root: "Propriétaire (Root)",
      security_admin: "Admin Sécurité",
      admin: "Administrateur",
      marketer: "Responsable Marketing",
      writer: "Rédacteur Juridique",
      member: "Membre",
      guest: "Invité",
    },
    navGroupMain: "Principale & Admin",
    navGroupContent: "Contenu & Documents",
    navGroupSystem: "Système & Sécurité",
  },
  en: {
    dashboard: "Dashboard",
    articles: "Manage Articles",
    users: "Users & Roles",
    seo: "SEO Control",
    security: "Security & Audit",
    traffic: "Traffic & Analytics",
    pages: "Manage Pages",
    logout: "Log Out",
    backToSite: "Back to Site",
    seoTitle: "Encrypted Admin Dashboard | Mizan Legal Platform",
    seoDesc: "Centralized admin security & legal data management portal for Mizan",
    keywords: [
      "Mizan Admin Dashboard",
      "Legal Content Management",
      "Encrypted Security Portal",
      "SEO Analytics",
      "Legal Documents",
    ],
    roleBadges: {
      root: "System Owner (Root)",
      security_admin: "Security Admin",
      admin: "Administrator",
      marketer: "Marketing Lead",
      writer: "Legal Editor",
      member: "Member",
      guest: "Guest",
    },
    navGroupMain: "Main & Control",
    navGroupContent: "Content & Media",
    navGroupSystem: "System & Security",
  },
  es: {
    dashboard: "Panel de Control",
    articles: "Gestión de Artículos",
    users: "Usuarios y Roles",
    seo: "Control SEO",
    security: "Seguridad y Auditoría",
    traffic: "Tráfico y Analítica",
    pages: "Páginas del Sitio",
    logout: "Cerrar Sesión",
    backToSite: "Volver al Sitio",
    seoTitle: "Panel de Administración Segura | Mizan Legal",
    seoDesc: "Portal centralizado de administración y seguridad legal para Mizan",
    keywords: [
      "Panel de administración Mizan",
      "Gestión de contenido legal",
      "Seguridad cifrada",
      "Control SEO",
      "Documentos legales",
    ],
    roleBadges: {
      root: "Propietario (Root)",
      security_admin: "Admin Seguridad",
      admin: "Administrador",
      marketer: "Líder de Marketing",
      writer: "Redactor Legal",
      member: "Miembro",
      guest: "Invitado",
    },
    navGroupMain: "Principal y Control",
    navGroupContent: "Contenido y Archivos",
    navGroupSystem: "Sistema y Seguridad",
  },
} as const;

export function AdminWrapper({
  title,
  description,
  children,
  allowedRoles,
  requireUserManagement = false,
  requireContentWriting = false,
}: AdminWrapperProps) {
  const { lang, dir } = useI18n();
  const { role, isRoot, isSecurityAdmin, isAdmin, canManageUsers, canWriteContent } = useRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const strings = useMemo(() => ADMIN_I18N[lang as Lang] || ADMIN_I18N.en, [lang]);
  const pageTitle = title || strings.dashboard;

  const handleLogout = useCallback(async () => {
    try {
      await adminLogout();
    } finally {
      if (typeof window !== "undefined") {
        window.location.replace(`/${lang}/admin/login`);
      }
    }
  }, [lang]);

  // Navigation Links Filtered by Permissions
  const navItems = useMemo(() => {
    const items = [
      {
        href: `/${lang}/admin`,
        label: strings.dashboard,
        icon: LayoutDashboard,
        show: true,
        group: "main",
      },
      {
        href: `/${lang}/admin/articles`,
        label: strings.articles,
        icon: FileText,
        show: canWriteContent || isAdmin,
        group: "content",
      },
      {
        href: `/${lang}/admin/pages`,
        label: strings.pages,
        icon: Layers,
        show: isAdmin || isRoot,
        group: "content",
      },
      {
        href: `/${lang}/admin/users`,
        label: strings.users,
        icon: Users,
        show: canManageUsers,
        group: "system",
      },
      {
        href: `/${lang}/admin/seo`,
        label: strings.seo,
        icon: Search,
        show: isAdmin || isRoot,
        group: "system",
      },
      {
        href: `/${lang}/admin/security`,
        label: strings.security,
        icon: ShieldCheck,
        show: isSecurityAdmin || isRoot,
        group: "system",
      },
      {
        href: `/${lang}/admin/traffic`,
        label: strings.traffic,
        icon: BarChart3,
        show: isAdmin || isRoot,
        group: "system",
      },
    ];

    return items.filter((item) => item.show);
  }, [lang, strings, canWriteContent, isAdmin, isRoot, canManageUsers, isSecurityAdmin]);

  // Structured Data Schema for Master SEO (Photo & Document Search Engines)
  const adminSchemaGraph = useMemo(() => {
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": `${SITE_URL}/${lang}/admin#webpage`,
          url: `${SITE_URL}/${lang}/admin`,
          name: pageTitle,
          description: description || strings.seoDesc,
          inLanguage: lang,
          isPartOf: {
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website`,
            url: SITE_URL,
            name: "Mizan Digital Platform",
            publisher: {
              "@type": "Organization",
              name: "Mizan Legal",
              logo: {
                "@type": "ImageObject",
                url: `${SITE_URL}/Logo.svg`,
              },
            },
          },
          primaryImageOfPage: {
            "@type": "ImageObject",
            "@id": `${SITE_URL}/Logo.svg#primaryimage`,
            url: `${SITE_URL}/Logo.svg`,
            caption: "Mizan Digital Legal Portal Logo",
          },
        },
      ],
    };
  }, [lang, pageTitle, description, strings]);

  const currentRoleLabel = strings.roleBadges[role] || strings.roleBadges.guest;

  return (
    <AdminGuard
      allowedRoles={allowedRoles}
      requireUserManagement={requireUserManagement}
      requireContentWriting={requireContentWriting}
    >
      <SEOHead
        title={`${pageTitle} | ${strings.seoTitle}`}
        description={description || strings.seoDesc}
        canonical={`${SITE_URL}/${lang}/admin`}
        noIndex={true}
        ogImage={`${SITE_URL}/Logo.svg`}
        keywords={[...strings.keywords, "Mizan Page", "Law Portal Morocco"]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(adminSchemaGraph) }}
      />

      <div
        dir={dir}
        className="min-h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-primary selection:text-primary-foreground"
      >
        {/* TOP MOBILE & DESKTOP HEADER */}
        <header className="sticky top-0 z-40 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            {/* Left Section: Mobile Toggle & Brand */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="lg:hidden p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700/50"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <a
                href={`/${lang}/admin`}
                className="flex items-center gap-2.5 text-foreground hover:opacity-90 transition-opacity"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-amber-500 p-0.5 shadow-md shadow-primary/20 flex items-center justify-center">
                  <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <span className="font-bold text-base sm:text-lg tracking-tight hidden sm:inline-block">
                  ميزان <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">Admin</span>
                </span>
              </a>
            </div>

            {/* Middle Section: Page Title */}
            <div className="hidden md:block text-center flex-1 max-w-md truncate">
              <h1 className="text-sm font-bold text-slate-200 truncate">{pageTitle}</h1>
            </div>

            {/* Right Section: User Badge & Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Role Pill */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs font-medium">
                <User className="w-3.5 h-3.5 text-primary" />
                <span className="text-slate-300">{currentRoleLabel}</span>
              </div>

              {/* Back to Public Site */}
              <a
                href={`/${lang}`}
                className="p-2 sm:px-3 sm:py-2 min-h-[44px] flex items-center gap-1.5 rounded-xl bg-slate-800/80 text-slate-300 text-xs font-semibold hover:bg-slate-700 hover:text-white transition-all border border-slate-700/50"
                title={strings.backToSite}
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden md:inline">{strings.backToSite}</span>
              </a>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 sm:px-3 sm:py-2 min-h-[44px] flex items-center gap-1.5 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 text-xs font-semibold hover:bg-destructive hover:text-destructive-foreground transition-all active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{strings.logout}</span>
              </button>
            </div>
          </div>
        </header>

        {/* MAIN BODY CONTAINER WITH RESPONSIVE SIDEBAR */}
        <div className="flex-1 max-w-7xl w-full mx-auto flex">
          {/* DESKTOP SIDEBAR NAVIGATION */}
          <aside className="hidden lg:block w-64 border-r rtl:border-r-0 rtl:border-l border-slate-800/80 bg-slate-900/40 p-4 space-y-6 shrink-0">
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {strings.navGroupMain}
              </p>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = typeof window !== "undefined" && window.location.pathname === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </div>
          </aside>

          {/* MOBILE SLIDE-OUT DRAWER OVERLAY */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden flex">
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={() => setMobileMenuOpen(false)}
              />

              {/* Drawer Content */}
              <div className="relative w-4/5 max-w-xs bg-slate-900 border-r rtl:border-r-0 rtl:border-l border-slate-800 p-5 shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-start duration-200">
                <div className="space-y-6">
                  {/* Drawer Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      <span className="font-bold text-sm text-slate-100">ميزان Admin</span>
                    </div>
                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg bg-slate-800/50"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Navigation Links */}
                  <nav className="space-y-1.5">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const active = typeof window !== "undefined" && window.location.pathname === item.href;
                      return (
                        <a
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all min-h-[44px] ${
                            active
                              ? "bg-primary text-primary-foreground shadow-md"
                              : "text-slate-300 hover:bg-slate-800 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </div>
                          {dir === "rtl" ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </a>
                      );
                    })}
                  </nav>
                </div>

                {/* Drawer Footer */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <div className="px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs">
                    <p className="text-[10px] text-slate-400">الصفة الحالية:</p>
                    <p className="font-bold text-primary mt-0.5">{currentRoleLabel}</p>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-destructive/20 text-destructive border border-destructive/30 font-bold text-xs hover:bg-destructive hover:text-white transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{strings.logout}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MAIN WORKSPACE CONTENT CONTAINER */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-auto w-full pb-20 lg:pb-8">
            <div className="space-y-6">{children}</div>
          </main>
        </div>

        {/* MOBILE PHONES-FIRST QUICK BOTTOM BAR */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/80 px-2 py-1.5">
          <div className="flex items-center justify-around max-w-md mx-auto">
            {navItems.slice(0, 4).map((item) => {
              const Icon = item.icon;
              const active = typeof window !== "undefined" && window.location.pathname === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl min-h-[44px] transition-all ${
                    active ? "text-primary font-bold bg-primary/10" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] mt-0.5 max-w-[64px] truncate">{item.label}</span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}