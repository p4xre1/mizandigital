import { useState } from "react";
import { NavLink, Outlet, Link } from "react-router";
import {
  LayoutDashboard, Users, FileText, Files, ShieldCheck, Search as SearchIcon,
  ArrowLeft, Scale, Menu, X, LogOut, Activity,
} from "lucide-react";
import { useI18n, serifFont, sansFont } from "../lib/i18n";
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
  const [open, setOpen] = useState(false);
  const authed = useAdminAuth();
  useSeo({ title: t("admin_panel"), noindex: true, path: "/admin" }, [lang]);

  if (!authed) return <AdminLogin />;

  const SideLinks = () => (
    <nav className="space-y-1">
      {NAV.map(item => (
        <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isActive ? "bg-primary text-primary-foreground font-semibold" : "text-foreground/70 hover:bg-muted"
            }`}
          style={{ fontFamily: sansFont(lang) }}>
          <item.icon size={17} />{t(item.key)}
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
            <button className="lg:hidden p-2 text-foreground" onClick={() => setOpen(!open)}>
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
            <Link to="/admin" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center"><Scale size={14} className="text-primary-foreground" /></div>
              <span className="font-bold text-foreground text-sm" style={{ fontFamily: serifFont(lang) }}>{t("admin_panel")}</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary" style={{ fontFamily: sansFont(lang) }}>
              <ArrowLeft size={15} className={dir === "rtl" ? "rotate-180" : ""} />{t("admin_back_site")}
            </Link>
            <button onClick={adminLogout} className="flex items-center gap-1.5 text-sm text-destructive hover:opacity-80" style={{ fontFamily: sansFont(lang) }}>
              <LogOut size={15} />{t("logout")}
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
          <div className="lg:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setOpen(false)}>
            <aside className="absolute top-14 bottom-0 w-64 bg-card p-4 border-e border-border" onClick={e => e.stopPropagation()} dir={dir}>
              <SideLinks />
            </aside>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
