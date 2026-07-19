import { useState, useEffect } from "react";
import { NavLink, Outlet, Link } from "react-router";
import {
  LayoutDashboard, Users, FileText, Files, ShieldCheck, Search as SearchIcon,
  ArrowLeft, Scale, Menu, X, LogOut, Activity,
} from "lucide-react";
import { useI18n, useLocalizedPath, serifFont, sansFont } from "../lib/i18n";
import { useSeo } from "../lib/seo";
import { useAdminAuth, adminLogout } from "../lib/adminAuth";
import AdminLogin from "../pages/admin/AdminLogin";

const NAV = [
  { to: "/admin", end: true, icon: LayoutDashboard, key: "admin_overview" },
  { to: "/admin/users", icon: Users, key: "admin_users" },
  { to: "/admin/articles", icon: FileText, key: "admin_articles" },
  { to: "/admin/pages", icon: Files, key: "admin_pages" },
  { to: "/admin/traffic", icon: Activity, key: "admin_analytics" },
  { to: "/admin/seo", icon: SearchIcon, key: "admin_seo" },
  { to: "/admin/security", icon: ShieldCheck, key: "admin_security" },
];

export default function AdminLayout() {
  const { lang, dir, t } = useI18n();
  const localizedPath = useLocalizedPath();
  const [open, setOpen] = useState(false);
  const authed = useAdminAuth();
  
  // SEO 🛡️: noindex is crucial here to hide the admin panel from search engines!
  useSeo({ title: t("admin_panel"), noindex: true, path: "/admin" }, [lang]);

  // Security UX 🛡️: Close mobile drawer on Escape key press
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  if (!authed) return <AdminLogin />;

  const SideLinks = () => (
    <nav aria-label="Admin Navigation" className="space-y-1">
      {NAV.map(item => (
        <NavLink 
          key={item.to} 
          to={item.to} 
          end={item.end} 
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
              isActive ? "bg-primary text-primary-foreground font-semibold" : "text-foreground/70 hover:bg-muted"
            }`
          }
          style={{ fontFamily: sansFont(lang) }}
        >
          <item.icon size={17} aria-hidden="true" />
          {t(item.key)}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-muted flex flex-col" dir={dir}>
      {/* Top bar */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              className="lg:hidden p-2 text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary" 
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-controls="admin-sidebar"
              aria-label="Toggle navigation menu"
            >
              {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            </button>
            <Link to="/admin" className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary rounded-md p-1">
              <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center" aria-hidden="true">
                <Scale size={14} className="text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground text-sm" style={{ fontFamily: serifFont(lang) }}>{t("admin_panel")}</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              to={localizedPath("/")} 
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded-md px-2 py-1" 
              style={{ fontFamily: sansFont(lang) }}
            >
              <ArrowLeft size={15} className={dir === "rtl" ? "rotate-180" : ""} aria-hidden="true" />
              {t("admin_back_site")}
            </Link>
            <button 
              onClick={adminLogout} 
              className="flex items-center gap-1.5 text-sm text-destructive hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-destructive rounded-md px-2 py-1 transition-opacity" 
              style={{ fontFamily: sansFont(lang) }}
              aria-label="Secure Logout"
            >
              <LogOut size={15} aria-hidden="true" />
              {t("logout")}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-[1600px] w-full mx-auto">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-60 shrink-0 border-e border-border bg-card p-4">
          <SideLinks />
        </aside>

        {/* Mobile drawer */}
        {open && (
          <div className="lg:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setOpen(false)} aria-hidden="true">
            <aside 
              id="admin-sidebar"
              className="absolute top-14 bottom-0 w-64 bg-card p-4 border-e border-border shadow-2xl transition-transform" 
              onClick={e => e.stopPropagation()} 
              dir={dir}
            >
              <SideLinks />
            </aside>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 min-w-0" role="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}