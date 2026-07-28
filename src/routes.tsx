import React, { Suspense, lazy, useEffect, useMemo } from "react";
import {
  createBrowserRouter,
  Navigate,
  useParams,
  useLocation,
} from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import { Loader2, ShieldAlert } from "lucide-react";

// ----------------------------------------------------------------------
// CONFIGURATION & SEO CONSTANTS
// ----------------------------------------------------------------------
const SITE_URL = import.meta.env.VITE_SITE_URL || "https://www.mizan.page";
const SUPPORTED_LANGS = ["ar", "fr", "en", "es"] as const;
type Language = (typeof SUPPORTED_LANGS)[number];

const DEFAULT_LANG: Language = "ar";

const SEO_TRANSLATIONS: Record<
    Language,
    { title: string; description: string; dir: "rtl" | "ltr" }
> = {
  ar: {
    title: "منصة ميزان الرقمية | المرجع القانوني والأكاديمي الأول",
    description: "منصة ميزان الرقمية للخدمات والبحوث القانونية والاجتهادات القضائية والأخبار الجامعية.",
    dir: "rtl",
  },
  fr: {
    title: "Mizan Page | Plateforme Juridique et Académique",
    description: "Plateforme digitale pour les services juridiques, la jurisprudence et les actualités universitaires.",
    dir: "ltr",
  },
  en: {
    title: "Mizan Digital Platform | Leading Legal & Academic Portal",
    description: "Digital platform for legal research, court rulings, jurisprudence, and university news.",
    dir: "ltr",
  },
  es: {
    title: "Mizan Digital | Portal Jurídico y Académico",
    description: "Plataforma digital para servicios jurídicos, jurisprudencia y noticias universitarias.",
    dir: "ltr",
  },
};

// ----------------------------------------------------------------------
// LAZY IMPORT HELPER (Supports both Default & Named Exports)
// ----------------------------------------------------------------------
function lazyNamed<T extends Record<string, any>>(
    factory: () => Promise<T>,
    exportName?: keyof T
) {
  return lazy(async () => {
    const module = await factory();
    const component = exportName
        ? module[exportName]
        : module.default || Object.values(module)[0];
    return { default: component };
  });
}

// ----------------------------------------------------------------------
// LAZY-LOADED COMPONENTS (Performance Optimization)
// ----------------------------------------------------------------------
const Layout = lazyNamed(() => import("@/components/layout/Layout"));
const AdminLayout = lazyNamed(() => import("@/components/layout/AdminLayout"));

// Public Pages
const Home = lazyNamed(() => import("@/pages/Home"));
const About = lazyNamed(() => import("@/pages/About"));
const ArticlesList = lazyNamed(() => import("@/pages/ArticlesList"));
const ArticleDetail = lazyNamed(() => import("@/pages/ArticleDetail"));
const Library = lazyNamed(() => import("@/pages/Library"));
const Archive = lazyNamed(() => import("@/pages/Archive"));
const Login = lazyNamed(() => import("@/pages/Login"));
const Profile = lazyNamed(() => import("@/pages/Profile"));
const CourtRulingsCategory = lazyNamed(() => import("@/pages/CourtRulingsCategory"));
const NotFound = lazyNamed(() => import("@/pages/NotFound"));

// Fields
const AdministrativeLaw = lazyNamed(() => import("@/pages/fields/AdministrativeLaw"));
const CommercialLaw = lazyNamed(() => import("@/pages/fields/CommercialLaw"));
const ConstitutionalLaw = lazyNamed(() => import("@/pages/fields/ConstitutionalLaw"));
const CriminalLaw = lazyNamed(() => import("@/pages/fields/CriminalLaw"));
const FamilyLaw = lazyNamed(() => import("@/pages/fields/FamilyLaw"));

// Documents
const CassationRulings = lazyNamed(() => import("@/pages/documents/CassationRulings"));
const LegalTexts = lazyNamed(() => import("@/pages/documents/LegalTexts"));
const MinisterialDecrees = lazyNamed(() => import("@/pages/documents/MinisterialDecrees"));
const OfficialJournals = lazyNamed(() => import("@/pages/documents/OfficialJournals"));

// Schools
const SchoolPage = lazyNamed(() => import("@/pages/schools/SchoolPage"));

// Content Editing
const ArticleEditor = lazyNamed(() => import("@/pages/ArticleEditor"));

// Admin Section
const Dashboard = lazyNamed(() => import("@/pages/admin/Dashboard"));
const AdminArticles = lazyNamed(() => import("@/pages/admin/AdminArticles"));
const AdminUsers = lazyNamed(() => import("@/pages/admin/AdminUsers"));
const AdminSecurity = lazyNamed(() => import("@/pages/admin/AdminSecurity"));
const AdminSeo = lazyNamed(() => import("@/pages/admin/AdminSeo"));
const AdminTraffic = lazyNamed(() => import("@/pages/admin/AdminTraffic"));
const AdminPages = lazyNamed(() => import("@/pages/admin/AdminPages"));
const AdminLogin = lazyNamed(() => import("@/pages/admin/AdminLogin"));

// ----------------------------------------------------------------------
// UTILITY & SECURITY SANITIZER
// ----------------------------------------------------------------------
function sanitizeParam(input?: string): string {
  if (!input) return "";
  return input.replace(/[^\w\s-]/gi, "").trim();
}

// ----------------------------------------------------------------------
// FALLBACK SUSPENSE COMPONENT (Mobile First)
// ----------------------------------------------------------------------
function PageLoadingFallback() {
  return (
      <div className="min-h-[60vh] w-full flex flex-col items-center justify-center p-6 space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <Loader2 className="w-5 h-5 text-primary absolute animate-pulse" />
        </div>
        <p className="text-xs font-semibold text-muted-foreground animate-pulse tracking-wide uppercase">
          Loading Mizan Page...
        </p>
      </div>
  );
}

// ----------------------------------------------------------------------
// SEO & HEAD MANAGEMENT WRAPPER
// ----------------------------------------------------------------------
function RootLayoutWrapper() {
  const { lang } = useParams<{ lang?: string }>();
  const location = useLocation();

  const currentLang = useMemo<Language>(() => {
    const cleanLang = sanitizeParam(lang) as Language;
    return SUPPORTED_LANGS.includes(cleanLang) ? cleanLang : DEFAULT_LANG;
  }, [lang]);

  useEffect(() => {
    const config = SEO_TRANSLATIONS[currentLang];

    // 1. Update HTML document direction & language
    document.documentElement.lang = currentLang;
    document.documentElement.dir = config.dir;
    document.title = config.title;

    // 2. Canonical Link Injection
    const canonicalUrl = `${SITE_URL}${location.pathname}`;
    let canonicalElement = document.querySelector<HTMLLinkElement>("link[rel='canonical']");
    if (!canonicalElement) {
      canonicalElement = document.createElement("link");
      canonicalElement.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalElement);
    }
    canonicalElement.setAttribute("href", canonicalUrl);

    // 3. Inject Master JSON-LD Schema (Google SEO)
    const jsonLdData = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Mizan Digital Platform",
      "alternateName": ["ميزان الرقمية", "Mizan Page"],
      "url": SITE_URL,
      "inLanguage": currentLang,
      "potentialAction": {
        "@type": "SearchAction",
        "target": `${SITE_URL}/${currentLang}/news?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    };

    let scriptElement = document.querySelector<HTMLScriptElement>("#mizan-jsonld");
    if (!scriptElement) {
      scriptElement = document.createElement("script");
      scriptElement.id = "mizan-jsonld";
      scriptElement.type = "application/ld+json";
      document.head.appendChild(scriptElement);
    }
    scriptElement.text = JSON.stringify(jsonLdData);
  }, [currentLang, location.pathname]);

  if (lang && !SUPPORTED_LANGS.includes(lang as Language)) {
    return <Navigate to={`/${DEFAULT_LANG}`} replace />;
  }

  return (
      <Suspense fallback={<PageLoadingFallback />}>
        <Layout />
      </Suspense>
  );
}

// ----------------------------------------------------------------------
// MILITARY-GRADE SECURITY ROUTE GUARDS
// ----------------------------------------------------------------------

/** Requires logged-in user */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isGuest, loading } = useRole();
  const location = useLocation();
  const { lang = DEFAULT_LANG } = useParams();

  if (loading) return <PageLoadingFallback />;

  if (isGuest) {
    return <Navigate to={`/${lang}/login`} state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

/** Requires Content Writer, Admin, or Root permissions */
function WriterGuard({ children }: { children: React.ReactNode }) {
  const { canWriteContent, loading } = useRole();

  if (loading) return <PageLoadingFallback />;

  if (!canWriteContent) {
    return (
        <div className="max-w-md mx-auto my-12 p-6 bg-destructive/10 border border-destructive/20 rounded-2xl text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-lg font-bold text-foreground">Access Denied / غير مصرح</h2>
          <p className="text-xs text-muted-foreground">
            You lack the required permissions to access the content editor.
          </p>
        </div>
    );
  }

  return <>{children}</>;
}

/** Requires Staff / Admin / Security access */
function AdminAccessGuard({ children }: { children: React.ReactNode }) {
  const { isStaff, loading } = useRole();
  const { lang = DEFAULT_LANG } = useParams();

  if (loading) return <PageLoadingFallback />;

  if (!isStaff) {
    return <Navigate to={`/${lang}/admin/login`} replace />;
  }

  return <>{children}</>;
}

/** Requires User Management capability (Admin, Security Admin, Root) */
function UserManagementGuard({ children }: { children: React.ReactNode }) {
  const { canManageUsers, loading } = useRole();

  if (loading) return <PageLoadingFallback />;

  if (!canManageUsers) {
    return (
        <div className="p-8 text-center space-y-2">
          <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="font-bold text-foreground">Restricted Module</h3>
          <p className="text-xs text-muted-foreground">
            User Management is restricted to Security Admins and System Root.
          </p>
        </div>
    );
  }

  return <>{children}</>;
}

// ----------------------------------------------------------------------
// ROUTE DEFINITIONS
// ----------------------------------------------------------------------
export const router = createBrowserRouter([
  // Root Redirect to default language
  {
    path: "/",
    element: <Navigate to={`/${DEFAULT_LANG}`} replace />,
  },

  // Main Dynamic Multi-Language Layout Container
  {
    path: "/:lang",
    element: <RootLayoutWrapper />,
    children: [
      // Home
      { index: true, element: <Home /> },

      // Static Public Pages
      { path: "about", element: <About /> },
      { path: "login", element: <Login /> },

      // User Profile (Protected)
      {
        path: "profile",
        element: (
            <AuthGuard>
              <Profile />
            </AuthGuard>
        ),
      },

      // News & Articles
      { path: "news", element: <ArticlesList /> },
      { path: "news/:category", element: <ArticlesList /> },
      { path: "article/:slug", element: <ArticleDetail /> },

      // Legal Library & Archives
      { path: "library", element: <Library /> },
      { path: "archive", element: <Archive /> },
      { path: "court-rulings/:category", element: <CourtRulingsCategory /> },

      // Specialized Legal Fields
      { path: "fields/family-law", element: <FamilyLaw /> },
      { path: "fields/criminal-law", element: <CriminalLaw /> },
      { path: "fields/commercial-law", element: <CommercialLaw /> },
      { path: "fields/administrative-law", element: <AdministrativeLaw /> },
      { path: "fields/constitutional-law", element: <ConstitutionalLaw /> },

      // Official Legal Documents
      { path: "documents/cassation-rulings", element: <CassationRulings /> },
      { path: "documents/legal-texts", element: <LegalTexts /> },
      { path: "documents/ministerial-decrees", element: <MinisterialDecrees /> },
      { path: "documents/official-journals", element: <OfficialJournals /> },

      // Schools & Universities
      { path: "schools", element: <SchoolPage /> },
      { path: "schools/:schoolSlug", element: <SchoolPage /> },

      // Writer Article Editor (Protected)
      {
        path: "writer/editor",
        element: (
            <WriterGuard>
              <ArticleEditor />
            </WriterGuard>
        ),
      },
      {
        path: "writer/editor/:id",
        element: (
            <WriterGuard>
              <ArticleEditor />
            </WriterGuard>
        ),
      },

      // Admin Login
      { path: "admin/login", element: <AdminLogin /> },

      // Protected Admin Section
      {
        path: "admin",
        element: (
            <AdminAccessGuard>
              <Suspense fallback={<PageLoadingFallback />}>
                <AdminLayout />
              </Suspense>
            </AdminAccessGuard>
        ),
        children: [
          { index: true, element: <Dashboard /> },
          { path: "articles", element: <AdminArticles /> },
          { path: "seo", element: <AdminSeo /> },
          { path: "traffic", element: <AdminTraffic /> },
          { path: "pages", element: <AdminPages /> },
          { path: "security", element: <AdminSecurity /> },
          {
            path: "users",
            element: (
                <UserManagementGuard>
                  <AdminUsers />
                </UserManagementGuard>
            ),
          },
        ],
      },

      // 404 Not Found Fallback under language route
      { path: "*", element: <NotFound /> },
    ],
  },

  // Global Wildcard Redirect
  {
    path: "*",
    element: <Navigate to={`/${DEFAULT_LANG}`} replace />,
  },
]);