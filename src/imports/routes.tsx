import React, { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, useLocation, useParams } from "react-router";
import { Loader2 } from "lucide-react";
import { buildLocalizedPath, getPreferredBrowserLanguage } from "../app/lib/i18n";

// ── 📦 Layout Imports ──
import Layout from "../app/components/Layout";
import AdminLayout from "../app/components/AdminLayout";

// ── 🌐 Public Site Pages (Lazy Loaded for Chunk Optimization) ──
const Home = lazy(() => import("../app/pages/Home"));
const Archive = lazy(() => import("../app/pages/Archive"));
const ArticleDetail = lazy(() => import("../app/pages/ArticleDetail"));
const Library = lazy(() => import("../app/pages/Library"));
const Login = lazy(() => import("../app/pages/Login"));
const Profile = lazy(() => import("../app/pages/Profile"));

// ── 🌐 Static / Fast-Loading Public Pages ──
import About from "../app/pages/About";
import Contact from "../app/pages/Contact";
import Legal from "../app/pages/Legal";
import Pricing from "../app/pages/Pricing";
import NotFound from "../app/pages/NotFound";

// ── 🛡️ Admin Dashboard Pages ──
import Dashboard from "../app/pages/admin/Dashboard";
import AdminUsers from "../app/pages/admin/AdminUsers";
import AdminArticles from "../app/pages/admin/AdminArticles";
import AdminPages from "../app/pages/admin/AdminPages";
import AdminTraffic from "../app/pages/admin/AdminTraffic";
import AdminSeo from "../app/pages/admin/AdminSeo";
import AdminSecurity from "../app/pages/admin/AdminSecurity";
import AdminLogin from "../app/pages/admin/AdminLogin";

// Supported 4-language matrix
const ALLOWED_LANGS = ["ar", "fr", "en", "es"] as const;

/**
 * Universal Dark-Mode & Mobile Compatible Fallback Loader
 */
function PageLoader() {
  return (
    <div 
      className="min-h-[60vh] w-full flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 transition-colors"
      aria-label="Loading page content"
    >
      <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mb-3" />
      <span className="text-xs font-medium tracking-wide animate-pulse">
        Loading...
      </span>
    </div>
  );
}

/**
 * Redirects unlocalized paths (e.g., `/about`) to the browser's preferred language path (e.g., `/ar/about`).
 */
function RedirectToPreferredLang() {
  const location = useLocation();
  const targetLang = getPreferredBrowserLanguage();
  const fullPath = location.pathname + location.search + location.hash;
  const redirectPath = buildLocalizedPath(fullPath, targetLang);

  return <Navigate to={redirectPath} replace />;
}

/**
 * Language Guard: Ensures `:lang` parameter is valid.
 * Redirects invalid language prefixes to auto-detected preferred locale.
 */
function LanguageGuard() {
  const { lang } = useParams<{ lang: string }>();

  if (!lang || !(ALLOWED_LANGS as readonly string[]).includes(lang)) {
    return <RedirectToPreferredLang />;
  }

  return <Layout />;
}

/**
 * React Suspense HOC Wrapper for lazy-loaded route components
 */
function Suspended({ Component }: { Component: React.ComponentType<any> }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

// ── 🚀 App Router Configuration ──
export const router = createBrowserRouter([
  {
    path: "/",
    element: <RedirectToPreferredLang />,
  },
  {
    path: "/admin/login",
    element: <AdminLogin />,
  },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "users", element: <AdminUsers /> },
      { path: "articles", element: <AdminArticles /> },
      { path: "pages", element: <AdminPages /> },
      { path: "traffic", element: <AdminTraffic /> },
      { path: "seo", element: <AdminSeo /> },
      { path: "security", element: <AdminSecurity /> },
    ],
  },
  {
    path: "/:lang",
    element: <LanguageGuard />,
    children: [
      { index: true, element: <Suspended Component={Home} /> },
      { path: "about", element: <About /> },
      { path: "archive", element: <Suspended Component={Archive} /> },
      { path: "article/:slug", element: <Suspended Component={ArticleDetail} /> },
      { path: "contact", element: <Contact /> },
      { path: "legal", element: <Legal /> },
      { path: "library", element: <Suspended Component={Library} /> },
      { path: "login", element: <Suspended Component={Login} /> },
      { path: "profile", element: <Suspended Component={Profile} /> },
      { path: "pricing", element: <Pricing /> },
      { path: "*", element: <NotFound /> },
    ],
  },
  {
    path: "/*",
    element: <RedirectToPreferredLang />,
  },
]);