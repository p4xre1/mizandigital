import { createBrowserRouter } from "react-router";

// ── 📦 استيراد المغلفات الرئيسية (Layouts) ──
import Layout from "../app/components/Layout";
import AdminLayout from "../app/components/AdminLayout"; // 👈 استيراد الهيكل المطور الخاص بك

// ── 🌐 استيراد صفحات الموقع العام ──
import Home from "../app/pages/Home";
import About from "../app/pages/About";
import Archive from "../app/pages/Archive";
import ArticleDetail from "../app/pages/ArticleDetail";
import Contact from "../app/pages/Contact";
import Legal from "../app/pages/Legal";
import Library from "../app/pages/Library";
import Login from "../app/pages/Login";
import Profile from "../app/pages/Profile";
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

export const router = createBrowserRouter([
  
  // ── 1️⃣ مسارات الموقع العام (تستخدم Layout العام) ──
  {
    path: "/:lang?",
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: "about", element: <About /> },
      { path: "archive", element: <Archive /> },
      { path: "archive/:articleId", element: <ArticleDetail /> },
      { path: "contact", element: <Contact /> },
      { path: "legal", element: <Legal /> },
      { path: "library", element: <Library /> },
      { path: "login", element: <Login /> },
      { path: "profile", element: <Profile /> },
      { path: "pricing", element: <Pricing /> }, 
      { path: "*", element: <NotFound /> }
    ]
  },

  // ── 2️⃣ صفحة تسجيل دخول الإدارة (منفصلة تماماً بدون أي قوائم جانبية) ──
  {
    path: "/admin/login",
    element: <AdminLogin />,
  },

  // ── 3️⃣ مسارات الإدارة المتداخلة (تستخدم AdminLayout والـ Outlet تلقائياً) ──
  {
    path: "/admin",
    element: <AdminLayout />, // 👈 الأب المشترك
    children: [
      { index: true, element: <Dashboard /> },                // يعرض في مسار /admin
      { path: "users", element: <AdminUsers /> },             // يعرض في مسار /admin/users
      { path: "articles", element: <AdminArticles /> },       // يعرض في مسار /admin/articles
      { path: "pages", element: <AdminPages /> },             // يعرض في مسار /admin/pages
      { path: "traffic", element: <AdminTraffic /> },         // يعرض في مسار /admin/traffic
      { path: "seo", element: <AdminSeo /> },                 // يعرض في مسار /admin/seo
      { path: "security", element: <AdminSecurity /> },       // يعرض في مسار /admin/security
    ]
  }
]);