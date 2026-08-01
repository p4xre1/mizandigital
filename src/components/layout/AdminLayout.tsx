"use client";

import React, { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
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
  User,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  Lock,
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
import { useRole } from "@/hooks/useRole";
import AdminLogin from "@/pages/admin/AdminLogin";

interface NavItem {
  to: string;
  end?: boolean;
  icon: LucideIcon;
  key: string;
  /** Function evaluating role permissions to render the link */
  isAllowed?: (roleFlags: ReturnType<typeof useRole>) => boolean;
}

const NAV: NavItem[] = [
  {
    to: "/admin",
    end: true,
    icon: LayoutDashboard,
    key: "admin_overview",
    isAllowed: ({ isStaff }) => isStaff,
  },
  {
    to: "/admin/users",
    icon: Users,
    key: "admin_users",
    isAllowed: ({ canManageUsers }) => canManageUsers,
  },
  {
    to: "/admin/articles",
    icon: FileText,
    key: "admin_articles",
    isAllowed: ({ canWriteContent }) => canWriteContent,
  },
  {
    to: "/admin/pages",
    icon: Files,
    key: "admin_pages",
    isAllowed: ({ canManageUsers, isWriter }) => canManageUsers || isWriter,
  },
  {
    to: "/admin/traffic",
    icon: Activity,
    key: "admin_analytics",
    isAllowed: ({ canManageUsers, isMarketer }) => canManageUsers || isMarketer,
  },
  {
    to: "/admin/seo",
    icon: SearchIcon,
    key: "admin_seo",
    isAllowed: ({ canManageUsers, isMarketer }) => canManageUsers || isMarketer,
  },
  {
    to: "/admin/security",
    icon: ShieldCheck,
    key: "admin_security",
    // Restricted strictly to Security Admins and Root Users
    isAllowed: ({ isSecurityAdmin, isRoot }) => isSecurityAdmin || isRoot,
  },
];

interface SideLinksProps {
  onLinkClick?: () => void;
  lang: Lang;
  t: (key: string) => string;
  localizedPath: ReturnType<typeof useLocalizedPath>;
}

function SideLinks({ onLinkClick, lang, t, localizedPath }: SideLinksProps) {
  const roleFlags = useRole();

  // Filter navigation items based on current role permissions
  const visibleNav = NAV.filter(
    (item) => !item.isAllowed || item.isAllowed(roleFlags)
  ).map((item) => ({ ...item, to: localizedPath(item.to) }));

  return (
    <nav aria-label="Admin Navigation" className="space-y-1.5 select-none">
      {visibleNav.map((item: NavItem) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onLinkClick}
          className={({ isActive }: { isActive: boolean }) =>
            `flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all touch-manipulation active:scale-[0.98] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary/50 ${
              isActive
                ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20"
                : "text-foreground/80 hover:bg-muted hover:text-foreground"
            }`
          }
          style={{ fontFamily: sansFont(lang) }}
        >
          <item.icon size={18} className="shrink-0" aria-hidden="true" />
          <span className="truncate">{t(item.key) || item.key}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function AdminLayout() {
  const { lang, dir, t } = useI18n();
  const localizedPath = useLocalizedPath();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const authed = useAdminAuth();
  const roleFlags = useRole();

  // SEO Guardrail 🛡️: noindex hides internal CMS / Admin panels from indexing engines
  useSeo(
    {
      title: `${t("admin_panel") || "CMS Admin Portal"} — Mizan Digital`,
      noindex: true,
      path: "/admin",
    },
    [lang]
  );

  // Safe Google AdSense Loader for CMS Admin Ads
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && (window as any).adsbygoogle) {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push(
          {}
        );
      }
    } catch (err) {
      console.warn(
        "Google Ads initialization safely handled in Admin Panel:",
        err
      );
    }
  }, []);

  // Lock body scroll when mobile drawer is active
  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  // Mobile UX: Close popovers on ESC keypress
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // Security: Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      setProfileOpen(false);
      await adminLogout();
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (!authed) return <AdminLogin />;

  // User primary role label resolution
  const getUserRoleLabel = () => {
    if (roleFlags.isRoot) return "Super Administrator";
    if (roleFlags.isSecurityAdmin) return "Security Officer";
    if (roleFlags.canManageUsers) return "Manager";
    if (roleFlags.isWriter) return "Content Creator";
    return "Staff Member";
  };

  return (
    <div
      className="min-h-screen bg-muted/40 text-foreground flex flex-col font-sans"
      dir={dir}
    >
      {/* ================= TOP NAVIGATION HEADER ================= */}
      <header className="bg-card/95 backdrop-blur-md border-b border-border sticky top-0 z-40 shadow-xs">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          {/* Left Section: Mobile Drawer Trigger + Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              className="lg:hidden p-2 text-foreground/80 hover:text-foreground rounded-xl hover:bg-muted active:scale-95 transition-all touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-controls="admin-sidebar"
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? (
                <X size={20} aria-hidden="true" />
              ) : (
                <Menu size={20} aria-hidden="true" />
              )}
            </button>

            <Link
                to={localizedPath("/admin")}
              className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-primary rounded-xl p-1 shrink-0 active:scale-98 transition-transform"
            >
              <div
                className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                aria-hidden="true"
              >
                <Scale size={18} className="text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span
                  className="font-bold text-foreground text-xs sm:text-sm tracking-tight leading-none"
                  style={{ fontFamily: serifFont(lang) }}
                >
                  {t("admin_panel") || "CMS Control Center"}
                </span>
                <span className="text-[10px] text-emerald-500 font-mono font-semibold flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  TLS 1.3 Active
                </span>
              </div>
            </Link>
          </div>

          {/* Right Section: Back to Site + Authenticated Profile Icon */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Link back to Public Website */}
            <Link
              to={localizedPath("/")}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-muted active:scale-95 transition-all touch-manipulation rounded-xl px-3 py-2 min-h-[40px]"
              style={{ fontFamily: sansFont(lang) }}
            >
              <ArrowLeft
                size={16}
                className="rtl:rotate-180 transition-transform shrink-0"
                aria-hidden="true"
              />
              <span>{t("admin_back_site") || "View Site"}</span>
            </Link>

            {/* Profile Dropdown Container */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1.5 rounded-2xl border border-border/80 bg-background hover:bg-muted active:scale-95 transition-all touch-manipulation min-h-[44px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                aria-expanded={profileOpen}
                aria-haspopup="true"
                aria-label="User Profile & Account Menu"
              >
                {/* Profile Icon / Avatar with Status Badge */}
                <div className="relative">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                    <User size={18} />
                  </div>
                  <span className="absolute -bottom-0.5 -end-0.5 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full" />
                </div>

                <div className="hidden md:flex flex-col text-start px-1">
                  <span className="text-xs font-bold text-foreground leading-none">
                    Admin Member
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
                    {getUserRoleLabel()}
                  </span>
                </div>

                <ChevronDown
                  size={14}
                  className="text-muted-foreground shrink-0 mx-0.5"
                />
              </button>

              {/* Profile Dropdown Popover */}
              {profileOpen && (
                <div
                  className="absolute end-0 mt-2 w-64 bg-card border border-border rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  role="menu"
                >
                  {/* Account Summary Header */}
                  <div className="px-4 py-2.5 border-b border-border/80">
                    <p className="text-xs font-bold text-foreground">
                      Authenticated Member
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      admin@mizandigital.com
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-semibold px-2 py-0.5 rounded-md border border-emerald-500/20">
                      <Lock size={10} />
                      {getUserRoleLabel()}
                    </div>
                  </div>

                  {/* Quick Action Links with RBAC checks */}
                  <div className="py-1">
                    {(roleFlags.canManageUsers || roleFlags.isMarketer) && (
                      <Link
                        to={localizedPath("/admin/seo")}
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-foreground/80 hover:text-foreground hover:bg-muted transition-colors min-h-[40px] touch-manipulation"
                        role="menuitem"
                      >
                        <Sparkles size={15} className="text-amber-500" />
                        <span>CMS SEO & Keywords</span>
                      </Link>
                    )}

                    {(roleFlags.isSecurityAdmin || roleFlags.isRoot) && (
                      <Link
                        to={localizedPath("/admin/security")}
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-foreground/80 hover:text-foreground hover:bg-muted transition-colors min-h-[40px] touch-manipulation"
                        role="menuitem"
                      >
                        <ShieldCheck size={15} className="text-emerald-500" />
                        <span>Security Dashboard</span>
                      </Link>
                    )}
                  </div>

                  {/* Logout Button */}
                  <div className="border-t border-border/80 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-destructive hover:bg-destructive/10 transition-colors font-semibold min-h-[44px] cursor-pointer touch-manipulation text-start"
                      role="menuitem"
                    >
                      <LogOut size={15} />
                      <span>{t("logout") || "Secure Sign Out"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ================= MAIN CMS DASHBOARD BODY ================= */}
      <div className="flex flex-1 max-w-[1600px] w-full mx-auto">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:block w-64 shrink-0 border-e border-border bg-card p-4 space-y-6">
          <SideLinks lang={lang} t={t} localizedPath={localizedPath} />

          {/* CMS Google AdSense Ad Slot Placeholder */}
          <div className="pt-4 border-t border-border/80">
            <div className="bg-muted/60 border border-border/80 rounded-xl p-2.5 text-center space-y-1.5">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block">
                Google AdSense Banner
              </span>
              <div className="min-h-[100px] flex items-center justify-center bg-background/50 rounded-lg border border-dashed border-border text-[10px] text-muted-foreground">
                <ins
                  className="adsbygoogle"
                  style={{ display: "block", width: "100%" }}
                  data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
                  data-ad-slot="1234567890"
                  data-ad-format="auto"
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Slide-Over Drawer Navigation */}
        {open && (
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          >
            <aside
              id="admin-sidebar"
              role="dialog"
              aria-modal="true"
              aria-label={t("admin_panel")}
              className="absolute top-0 bottom-0 start-0 w-72 max-w-[85vw] bg-card p-4 border-e border-border shadow-2xl transition-transform flex flex-col"
              onClick={(e) => e.stopPropagation()}
              dir={dir}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                    <Scale size={15} className="text-primary-foreground" />
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
                  className="p-2 text-foreground/70 hover:text-foreground rounded-xl active:scale-95 transition-transform cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                  aria-label="Close navigation menu"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Links */}
              <div className="flex-1 overflow-y-auto space-y-4">
                <SideLinks
                  onLinkClick={() => setOpen(false)}
                  lang={lang}
                  t={t}
                  localizedPath={localizedPath}
                />
              </div>

              {/* Mobile Drawer Footer Status */}
              <div className="pt-3 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-1 font-mono text-[10px]">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  CMS v2.4 Active
                </span>
                <Link
                  to={localizedPath("/")}
                  onClick={() => setOpen(false)}
                  className="text-primary font-semibold hover:underline"
                >
                  Public Site →
                </Link>
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

export default AdminLayout;