import React, { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, useLocation } from "react-router";
import { buildLocalizedPath, getPreferredBrowserLanguage } from "../app/lib/i18n";

// ── 📦 استيراد المغلفات الرئيسية (Layouts) ──
import Layout from "../app/components/Layout";
import AdminLayout from "../app/components/AdminLayout";

// ── 🌐 استيراد صفحات الموقع العام ──
const Home = lazy(() => import("../app/pages/Home"));
import About from "../app/pages/About";
const Archive = lazy(() => import("../app/pages/Archive"));
const ArticleDetail = lazy(() => import("../app/pages/ArticleDetail"));
import Contact from "../app/pages/Contact";
import Legal from "../app/pages/Legal";
const Library = lazy(() => import("../app/pages/Library"));
const Login = lazy(() => import("../app/pages/Login"));
const Profile = lazy(() => import("../app/pages/Profile"));
import Pricing from "../app/pages/Pricing";
import NotFound from "../app/pages/NotFound";

// ── 🛡️ استيراد صفحات لوحة التحكم ──
import Dashboard from "../app/pages/admin/Dashboard";
import AdminUsers from "../app/pages/admin/AdminUsers";
import AdminArticles from "../app/pages/admin/AdminArticles";
import AdminPages from "../app/pages/admin/AdminPages";
import AdminTraffic from "../app/pages/admin/AdminTraffic";
import AdminSeo from "../app/pages/admin/AdminSeo";
import AdminSecurity from "../app/pages/admin/AdminSecurity";
import AdminLogin from "../app/pages/admin/AdminLogin";

const DEFAULT_LANG = "ar";

function RedirectToPreferredLang() {
  const location = useLocation();
  const targetLang = getPreferredBrowserLanguage();
  const redirectPath = buildLocalizedPath(location.pathname + location.search + location.hash, targetLang);

  return <Navigate to={redirectPath} replace />;
}

function Suspended({ Component }: { Component: React.LazyExoticComponent<React.ComponentType<any>> }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">جارٍ تحميل الصفحة...</div>}>
      <Component />
    </Suspense>
  );
}

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
    path: "/:lang(ar|fr|en|es)",
    element: <Layout />,
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
    path: "/:lang(/*)",
    element: <RedirectToPreferredLang />,
  },
  {
    path: "/*",
    element: <RedirectToPreferredLang />,
  },
]);
