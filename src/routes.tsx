import { useEffect, lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, Outlet, useLocation } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

// Layout Shell
import Layout from "@/components/layout/Layout";

// ⚡ Lazy Loaded Pages
const Home = lazy(() => import("@/pages/Home"));
const About = lazy(() => import("@/pages/About"));
const Archive = lazy(() => import("@/pages/Archive"));
const ArticleDetail = lazy(() => import("@/pages/ArticleDetail"));
const Library = lazy(() => import("@/pages/Library").then((module) => ({ default: module.Library })));
const Jurisprudence = lazy(() => import("@/pages/Jurisprudence").then((module) => ({ default: module.Jurisprudence })));
const Login = lazy(() => import("@/pages/Login"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Profile = lazy(() => import("@/pages/Profile"));

// Admin Pages
const Dashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminArticles = lazy(() => import("@/pages/admin/AdminArticles"));
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const AdminPages = lazy(() => import("@/pages/admin/AdminPages"));
const AdminSecurity = lazy(() => import("@/pages/admin/AdminSecurity"));
const AdminSeo = lazy(() => import("@/pages/admin/AdminSeo"));
const AdminTraffic = lazy(() => import("@/pages/admin/AdminTraffic"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));

// Ambient declaration to prevent TypeScript dataLayer conflicts
declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

// 🚀 Analytics & Scroll Helper Wrapper
function RouteTrackingWrapper() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // 1. Scroll to top on route change
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    // 2. Push full URL path, query params, and language to GTM
    window.dataLayer = window.dataLayer || [];

    // Extract language prefix (ar, fr, en, es)
    const langMatch = pathname.match(/^\/(ar|fr|en|es)(\/|$)/);
    const currentLang = langMatch ? langMatch[1] : "ar";

    window.dataLayer.push({
      event: "page_view",
      page_path: pathname + search, // Captures full URL e.g. /ar/library?category=family-law
      page_location: window.location.href,
      page_title: document.title,
      page_language: currentLang,
    });
  }, [pathname, search]);

  return <Outlet />;
}

// Loading Fallback
function PageFallback() {
  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto mt-6">
      <Skeleton className="h-8 w-2/3 rounded-lg" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-4 w-1/2 rounded-md" />
    </div>
  );
}

const withSuspense = (Component: React.LazyExoticComponent<any>) => (
  <Suspense fallback={<PageFallback />}>
    <Component />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: withSuspense(NotFound),
    children: [
      {
        element: <RouteTrackingWrapper />,
        children: [
          // 1. Root redirect: "/" -> "/ar"
          {
            index: true,
            element: <Navigate to="/ar" replace />,
          },
          // 2. Multilingual Prefix Routes (:lang = "ar", "fr", "en", "es")
          {
            path: ":lang",
            element: <Outlet />,
            children: [
              { index: true, element: withSuspense(Home) },
              { path: "about", element: withSuspense(About) },
              { path: "archive", element: withSuspense(Archive) },
              { path: "article/:id", element: withSuspense(ArticleDetail) },
              
              // 📚 Library Routes
              { path: "library", element: withSuspense(Library) },
              { path: "library/:category", element: withSuspense(Library) },
              
              // ⚖️ Jurisprudence Routes
              { path: "jurisprudence", element: withSuspense(Jurisprudence) },
              { path: "jurisprudence/:category", element: withSuspense(Jurisprudence) },

              // 🎓 Law Schools Routes
              { path: "schools", element: withSuspense(Library) },
              { path: "schools/:schoolSlug", element: withSuspense(Library) },

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
    ],
  },
]);