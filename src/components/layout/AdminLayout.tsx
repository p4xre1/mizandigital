"use client";

import { useState, useEffect } from "react";
import { NavLink, Outlet, Link } from "react-router";
import {
  LayoutDashboard,
  Users,
  FileText,
  Files,
  ShieldCheck,
  Search as SearchIcon,
  ArrowLeft,
  Scale,
  Menu,
  X,
  LogOut,
  Activity,
  type LucideIcon,
} from "lucide-react";

import {
  useI18n,
  useLocalizedPath,
  serifFont,
  sansFont,
  type Lang,
} from "@/lib/i18n";
import { useSeo } from "@/lib/seo";
import { useAdminAuth, adminLogout } from "@/lib/adminAuth";
import AdminLogin from "@/pages/admin/AdminLogin";

interface NavItem {
  to: string;
  end?: boolean;
  icon: LucideIcon;
  key: string;
}

const NAV: NavItem[] = [
  { to: "/admin", end: true, icon: LayoutDashboard, key: "admin_overview" },
  { to: "/admin/users", icon: Users, key: "admin_users" },
  { to: "/admin/articles", icon: FileText, key: "admin_articles" },
  { to: "/admin/pages", icon: Files, key: "admin_pages" },
  { to: "/admin/traffic", icon: Activity, key: "admin_analytics" },
  { to: "/admin/seo", icon: SearchIcon, key: "admin_seo" },
  { to: "/admin/security", icon: ShieldCheck, key: "admin_security" },
];

interface SideLinksProps {
  onLinkClick?: () => void;
  lang: Lang;
  t: (key: string) => string;
}

function SideLinks({ onLinkClick, lang, t }: SideLinksProps) {
  return (
    <nav aria-label="Admin Navigation" className="space-y-1 select-none">
      {NAV.map((item: NavItem) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onLinkClick}
          className={({ isActive }: { isActive: boolean }) =>
            `flex items-center gap-3 px-3 py-3 rounded-xl text-xs sm:text-sm font-medium transition-all touch-manipulation active:scale-[0.98] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary ${
              isActive
                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                : "text-foreground/75 hover:bg-muted hover:text-foreground"
            }`
          }
          style={{ fontFamily: sansFont(lang) }}
        >
          <item.icon size={18} className="shrink-0" aria-hidden="true" />
          <span className="truncate">{t(item.key)}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default function AdminLayout() {
  const { lang, dir, t } = useI18n();
  const localizedPath = useLocalizedPath();
  const [open, setOpen] = useState(false);
  const authed = useAdminAuth();

  // SEO 🛡️: noindex hides the admin panel from search engines
  useSeo({ title: t("admin_panel"), noindex: true, path: "/admin" }, [lang]);

  // Security & Mobile UX: Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close mobile drawer on Escape key press
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const handleLogout = async () => {
    try {
      await adminLogout();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (!authed) return <AdminLogin />;

  return (
    <div className="min-h-screen bg-muted/50 flex flex-col" dir={dir}>
      {/* Top Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40 shadow-2xs">
        <div className="px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
          {/* Left section: Hamburger + Brand */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              className="lg:hidden p-2 text-foreground/80 hover:text-foreground rounded-lg hover:bg-muted active:scale-95 transition-transform touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-controls="admin-sidebar"
              aria-label={
                open ? "Close navigation menu" : "Open navigation menu"
              }
            >
              {open ? (
                <X size={20} aria-hidden="true" />
              ) : (
                <Menu size={20} aria-hidden="true" />
              )}
            </button>

            <Link
              to="/admin"
              className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary rounded-lg p-1 shrink-0"
            >
              <div
                className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center shrink-0 shadow-xs"
                aria-hidden="true"
              >
                <Scale size={15} className="text-primary-foreground" />
              </div>
              <span
                className="font-bold text-foreground text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none"
                style={{ fontFamily: serifFont(lang) }}
              >
                {t("admin_panel")}
              </span>
            </Link>
          </div>

          {/* Right section: Back to site + Logout */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <Link
              to={localizedPath("/")}
              className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-primary active:scale-95 transition-all touch-manipulation rounded-lg px-2.5 py-1.5 min-h-[38px]"
              style={{ fontFamily: sansFont(lang) }}
            >
              <ArrowLeft
                size={16}
                className="rtl:rotate-180 transition-transform shrink-0"
                aria-hidden="true"
              />
              <span className="hidden sm:inline font-medium">
                {t("admin_back_site")}
              </span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs sm:text-sm text-destructive hover:opacity-80 active:scale-95 transition-all touch-manipulation rounded-lg px-2.5 py-1.5 min-h-[38px] font-medium cursor-pointer"
              style={{ fontFamily: sansFont(lang) }}
              aria-label="Secure Logout"
            >
              <LogOut size={16} className="shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">{t("logout")}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-[1600px] w-full mx-auto">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-60 shrink-0 border-e border-border bg-card p-4">
          <SideLinks lang={lang} t={t} />
        </aside>

        {/* Mobile Slide-over Drawer */}
        {open && (
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          >
            <aside
              id="admin-sidebar"
              role="dialog"
              aria-modal="true"
              aria-label={t("admin_panel")}
              className="absolute top-0 bottom-0 start-0 w-68 max-w-[80vw] bg-card p-4 border-e border-border shadow-2xl transition-transform flex flex-col"
              onClick={(e) => e.stopPropagation()}
              dir={dir}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                    <Scale size={13} className="text-primary-foreground" />
                  </div>
                  <span
                    className="font-bold text-xs text-foreground"
                    style={{ fontFamily: serifFont(lang) }}
                  >
                    {t("admin_panel")}
                  </span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 text-foreground/70 hover:text-foreground rounded-lg"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Nav Links */}
              <div className="flex-1 overflow-y-auto">
                <SideLinks
                  onLinkClick={() => setOpen(false)}
                  lang={lang}
                  t={t}
                />
              </div>
            </aside>
          </div>
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 p-3 sm:p-6 md:p-8 min-w-0" role="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}