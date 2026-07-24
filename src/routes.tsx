import { useEffect, lazy, Suspense, ComponentType } from "react";
import { createBrowserRouter, Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

// Layout Shell (Named Import)
import { Layout } from "@/components/layout/Layout";

// ⚡ Lazy Loaded Core Pages
const Home = lazy(() => import("@/pages/Home"));
const About = lazy(() => import("@/pages/About"));
const Archive = lazy(() => import("@/pages/Archive"));
const ArticleDetail = lazy(() => import("@/pages/ArticleDetail"));

// 🟢 UPDATED: Import Library as Default Export
const Library = lazy(() => import("@/pages/Library"));

// 🎓 Law Schools Page
const SchoolPage = lazy(() => import("@/pages/schools/SchoolPage"));

const Jurisprudence = lazy(() => import("@/pages/Jurisprudence").then((module) => ({ default: module.Jurisprudence })));
const CourtRulingsCategory = lazy(() => import("@/pages/CourtRulingsCategory").then((module) => ({ default: module.CourtRulingsCategory })));
const Login = lazy(() => import("@/pages/Login"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Profile = lazy(() => import("@/pages/Profile"));

// ⚖️ Fields of Law Pages
const FamilyLaw = lazy(() => import("@/pages/fields/FamilyLaw"));
const CriminalLaw = lazy(() => import("@/pages/fields/CriminalLaw"));
const CommercialLaw = lazy(() => import("@/pages/fields/CommercialLaw"));
const AdministrativeLaw = lazy(() => import("@/pages/fields/AdministrativeLaw"));
const ConstitutionalLaw = lazy(() => import("@/pages/fields/ConstitutionalLaw"));

// 📄 Document Types Pages
const LegalTexts = lazy(() => import("@/pages/documents/LegalTexts"));
const MinisterialDecrees = lazy(() => import("@/pages/documents/MinisterialDecrees"));
const CassationRulings = lazy(() => import("@/pages/documents/CassationRulings"));
const OfficialJournals = lazy(() => import("@/pages/documents/OfficialJournals"));

// 🔒 Admin Pages
const Dashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminArticles = lazy(() => import("@/pages/admin/AdminArticles"));
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const AdminPages = lazy(() => import("@/pages/admin/AdminPages"));
const AdminSecurity = lazy(() => import("@/pages/admin/AdminSecurity"));
const AdminSeo = lazy(() => import("@/pages/admin/AdminSeo"));
const AdminTraffic = lazy(() => import("@/pages/admin/AdminTraffic"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));

export type Lang = "ar" | "fr" | "en" | "es";

// 🌐 Dynamic Layout Wrapper that extracts route params
function LocalizedLayoutWrapper(): React.JSX.Element {
  const { lang } = useParams<{ lang: string }>();
  const validLang: Lang = ["ar", "fr", "en", "es"].includes(lang || "")
    ? (lang as Lang)
    : "ar";
  const dir = validLang === "ar" ? "rtl" : "ltr";

  return <Layout lang={validLang} dir={dir} />;
}

// Ambient declaration to prevent TypeScript dataLayer conflicts
declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

// 🚀 Analytics & Scroll Helper Wrapper
function RouteTrackingWrapper(): React.JSX.Element {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    window.dataLayer = window.dataLayer || [];
    const langMatch = pathname.match(/^\/(ar|fr|en|es)(\/|$)/);
    const currentLang = langMatch ? langMatch[1] : "ar";

    window.dataLayer.push({
      event: "page_view",
      page_path: pathname + search,
      page_location: window.location.href,
      page_title: document.title,
      page_language: currentLang,
    });
  }, [pathname, search]);

  return <Outlet />;
}

// Loading Fallback
function PageFallback(): React.JSX.Element {
  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto mt-6">
      <Skeleton className="h-8 w-2/3 rounded-lg" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-4 w-1/2 rounded-md" />
    </div>
  );
}

const withSuspense = (Component: ComponentType): React.JSX.Element => (
  <Suspense fallback={<PageFallback />}>
    <Component />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RouteTrackingWrapper />,
    errorElement: withSuspense(NotFound),
    children: [
      // 1. Root redirect: "/" -> "/ar"
      {
        index: true,
        element: <Navigate to="/ar" replace />,
      },
      // 2. Multilingual Prefix Routes (:lang = "ar", "fr", "en", "es")
      {
        path: ":lang",
        element: <LocalizedLayoutWrapper />,
        children: [
          { index: true, element: withSuspense(Home) },
          { path: "about", element: withSuspense(About) },
          { path: "archive", element: withSuspense(Archive) },
          { path: "article/:id", element: withSuspense(ArticleDetail) },

          // 📚 Court Rulings & Doctrine Dynamic Category Routes
          { path: "category/:slug", element: withSuspense(CourtRulingsCategory) },
          { path: "rulings/:slug", element: withSuspense(CourtRulingsCategory) },
          { path: "doctrine/:slug", element: withSuspense(CourtRulingsCategory) },

          // 📚 Library Core Routes
          { path: "library", element: withSuspense(Library) },
          { path: "library/:category", element: withSuspense(Library) },

          // ⚖️ Fields of Law Routes
          { path: "fields/family-law", element: withSuspense(FamilyLaw) },
          { path: "fields/criminal-law", element: withSuspense(CriminalLaw) },
          { path: "fields/commercial-law", element: withSuspense(CommercialLaw) },
          { path: "fields/administrative-law", element: withSuspense(AdministrativeLaw) },
          { path: "fields/constitutional-law", element: withSuspense(ConstitutionalLaw) },

          // 📑 Document Types Routes
          { path: "documents/legal-texts", element: withSuspense(LegalTexts) },
          { path: "documents/ministerial-decrees", element: withSuspense(MinisterialDecrees) },
          { path: "documents/cassation-rulings", element: withSuspense(CassationRulings) },
          { path: "documents/official-journals", element: withSuspense(OfficialJournals) },

          // ⚖️ Jurisprudence Routes
          { path: "jurisprudence", element: withSuspense(Jurisprudence) },
          { path: "jurisprudence/:category", element: withSuspense(Jurisprudence) },

          // 🎓 Law Schools Routes
          { path: "schools", element: withSuspense(SchoolPage) },
          { path: "schools/:slug", element: withSuspense(SchoolPage) },

          { path: "login", element: withSuspense(Login) },
          { path: "profile", element: withSuspense(Profile) },

          // 🔒 Admin Routes
          {
            path: "admin",
            children: [
              { index: true, element: withSuspense(Dashboard) },
              { path: "articles", element: withSuspense(AdminArticles) },
              { path: "login", element: withSuspense(AdminLogin) },
              { path: "pages", element: withSuspense(AdminPages) },
              { path: "security", element: withSuspense(AdminSecurity) },
              { path: "seo", element: withSuspense(AdminSeo) },
              { path: "traffic", element: withSuspense(AdminTraffic) },
              { path: "users", element: withSuspense(AdminUsers) },
            ],
          },
        ],
      },
      // 3. Catch-all 404
      { path: "*", element: withSuspense(NotFound) },
    ],
  },
]);