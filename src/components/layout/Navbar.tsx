/* eslint-disable */
// noinspection SpellCheckingInspection
/* cspell:disable */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import type { Lang } from "@/lib/i18n";
import {
  User,
  LogOut,
  LogIn,
  GraduationCap,
  BookOpen,
  ChevronDown,
  Menu,
  X,
  Home,
  Archive,
  Newspaper,
  Landmark,
  Globe2,
  Sun,
  Moon,
  Globe,
  Users,
  ArrowRight,
  ArrowLeft,
  PenTool,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import { AuthModal } from "../auth/AuthModal";// ← تأكد من المسار الصحيح
import { supabase } from "@/lib/supabase";

// Security Whitelist
const ALLOWED_LANGS: Lang[] = ["ar", "fr", "en", "es"];

const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: "ar", label: "العربية", flag: "🇲🇦" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

export function Navbar() {
  const { lang: rawLang = "ar" } = useParams();
  const lang: Lang = ALLOWED_LANGS.includes(rawLang as Lang) ? (rawLang as Lang) : "ar";
  const dir = lang === "ar" ? "rtl" : "ltr";

  const location = useLocation();
  const navigate = useNavigate();
  const { isRoot, canManageUsers, canWriteContent } = useRole();

  // ─── Auth Modal State ─────────────────────────────────────
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "signup">("login");

  // ─── User State (من Supabase مباشرة، ليس localStorage فقط) ─
  const [user, setUser] = useState<{ id: string; name: string; email: string; avatar?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ─── UI States ────────────────────────────────────────────
  const [showDisclaimer, setShowDisclaimer] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("mizan_hide_disclaimer") !== "true";
    }
    return true;
  });
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark") || localStorage.getItem("theme") === "dark";
    }
    return false;
  });
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileSectionOpen, setMobileSectionOpen] = useState<string | null>(null);

  const langRef = useRef<HTMLDivElement>(null);

  // ─── 1. Sync Dark Mode ─────────────────────────────────────
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  // ─── 2. Sync User from Supabase (الحل الجذري) ──────────────
  useEffect(() => {
    const loadUser = async () => {
      setAuthLoading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser) {
        // جلب الاسم من profiles أو من user_metadata
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", authUser.id)
          .single();

        setUser({
          id: authUser.id,
          name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "User",
          email: authUser.email || "",
          avatar: profile?.avatar_url || undefined,
        });

        // حدّث localStorage للتوافق
        localStorage.setItem("mizan_user", JSON.stringify({
          id: authUser.id,
          email: authUser.email,
          name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email?.split("@")[0],
        }));
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    };

    loadUser();

    // استمع للتغييرات في الـ Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
          email: session.user.email || "",
          avatar: session.user.user_metadata?.avatar_url,
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ─── 3. Lock scroll + cleanup ─────────────────────────────
  useEffect(() => {
    if (isMobileMenuOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
    setLangMenuOpen(false);
  }, [location.pathname]);

  // ─── 4. Outside click for lang menu ────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── Handlers ─────────────────────────────────────────────
  const handleDismissDisclaimer = () => {
    setShowDisclaimer(false);
    sessionStorage.setItem("mizan_hide_disclaimer", "true");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("mizan_user");
    sessionStorage.clear();
    setUser(null);
    window.location.reload(); // ← أعد تحميل الصفحة لتنظيف كل شيء
  };

  const openLogin = () => {
    setAuthModalTab("login");
    setAuthModalOpen(true);
  };

  const openSignup = () => {
    setAuthModalTab("signup");
    setAuthModalOpen(true);
  };

  const switchLanguage = (newLang: Lang) => {
    if (!ALLOWED_LANGS.includes(newLang)) return;
    const pathSegments = location.pathname.split("/").filter(Boolean);
    if (ALLOWED_LANGS.includes(pathSegments[0] as Lang)) pathSegments[0] = newLang;
    else pathSegments.unshift(newLang);
    setLangMenuOpen(false);
    setIsMobileMenuOpen(false);
    navigate("/" + pathSegments.join("/"));
  };

  const isActiveRoute = (path: string) => location.pathname.includes(path);

  // ─── Render ───────────────────────────────────────────────
  return (
    <>
      <header
        dir={dir}
        role="banner"
        className="w-full font-sans border-b border-border/80 bg-background/90 dark:bg-background/95 backdrop-blur-xl sticky top-0 z-50 transition-colors duration-200"
      >
        {/* Disclaimer */}
        {showDisclaimer && (
          <div className="bg-amber-500/10 dark:bg-amber-500/15 border-b border-amber-500/20 px-3 py-1.5 text-xs text-amber-900 dark:text-amber-200 font-medium leading-snug flex items-center justify-between">
            <div className="flex-1 text-center text-[11px] sm:text-xs">
              {lang === "ar" && <>⚠️ <strong>تنويه:</strong> المحتوى تعليمي وأكاديمي ولا يُعد استشارة قانونية.</>}
              {lang === "fr" && <>⚠️ <strong>Avertissement:</strong> Le contenu est éducatif et ne constitue pas un conseil juridique.</>}
              {lang === "en" && <>⚠️ <strong>Disclaimer:</strong> Content is educational and does not constitute legal advice.</>}
              {lang === "es" && <>⚠️ <strong>Aviso:</strong> El contenido es educativo y no constituye asesoramiento legal.</>}
            </div>
            <button onClick={handleDismissDisclaimer} className="p-1 rounded-lg hover:bg-amber-500/20 shrink-0">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Main Header */}
        <div className="px-3 sm:px-6 py-2.5 max-w-7xl mx-auto flex items-center justify-between gap-2">
          
          {/* Logo */}
          <Link to={`/${lang}`} className="flex items-center gap-2 shrink-0 group active:scale-98 transition-transform">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-black text-lg shadow-sm">
              ⚖️
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm sm:text-base font-bold text-foreground leading-none tracking-tight">
                Mizan <span className="text-primary font-extrabold">Digital</span>
              </h1>
              <span className="text-[9px] text-muted-foreground font-medium hidden sm:inline mt-0.5">
                {lang === "ar" ? "منصة العلوم القانونية" : "Legal Tech Platform"}
              </span>
            </div>
          </Link>

          {/* ─── DESKTOP NAV ─── */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
            <Link to={`/${lang}`} className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${isActiveRoute(`/${lang}`) && location.pathname === `/${lang}` ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted hover:text-primary text-foreground"}`}>
              <Home size={15} />
              <span>{lang === "ar" ? "الرئيسية" : "Home"}</span>
            </Link>

            {/* News Dropdown */}
            <div className="relative" onMouseEnter={() => setActiveDropdown("news")} onMouseLeave={() => setActiveDropdown(null)}>
              <Link to={`/${lang}/news`} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors ${isActiveRoute("/news") ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted hover:text-primary text-foreground"}`}>
                <Newspaper size={15} />
                <span>{lang === "ar" ? "الأخبار" : "News"}</span>
                <ChevronDown size={13} className={`transition-transform ${activeDropdown === "news" ? "rotate-180" : ""}`} />
              </Link>
              {activeDropdown === "news" && (
                <div className="absolute top-full rtl:right-0 ltr:left-0 mt-1 w-[400px] bg-card border border-border rounded-2xl shadow-xl p-4 z-50">
                  {/* ... نفس محتوى الـ dropdown السابق ... */}
                  <div className="space-y-1">
                    <Link to={`/${lang}/news/category/schools`} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors">
                      <GraduationCap size={17} className="text-blue-500 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold">{lang === "ar" ? "أخبار الكليات" : "University News"}</h4>
                        <p className="text-[10px] text-muted-foreground">{lang === "ar" ? "مباريات ونتائج" : "Exams & Results"}</p>
                      </div>
                    </Link>
                    <Link to={`/${lang}/news/category/government`} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors">
                      <Landmark size={17} className="text-amber-500 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold">{lang === "ar" ? "المستجدات التشريعية" : "Government Updates"}</h4>
                        <p className="text-[10px] text-muted-foreground">{lang === "ar" ? "قوانين ومراسيم" : "Laws & Decrees"}</p>
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Library Dropdown */}
            <div className="relative" onMouseEnter={() => setActiveDropdown("library")} onMouseLeave={() => setActiveDropdown(null)}>
              <Link to={`/${lang}/library`} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors ${isActiveRoute("/library") ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted hover:text-primary text-foreground"}`}>
                <BookOpen size={15} />
                <span>{lang === "ar" ? "المكتبة" : "Library"}</span>
                <ChevronDown size={13} className={`transition-transform ${activeDropdown === "library" ? "rotate-180" : ""}`} />
              </Link>
            </div>

            {/* Archive Dropdown */}
            <div className="relative" onMouseEnter={() => setActiveDropdown("archive")} onMouseLeave={() => setActiveDropdown(null)}>
              <Link
  to={`/${lang}/archive`}
  className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-muted hover:text-primary transition-colors text-foreground"
>
                <Archive size={15} />
                <span>{lang === "ar" ? "الأرشيف" : "Archive"}</span>
                <ChevronDown size={13} className={`transition-transform ${activeDropdown === "archive" ? "rotate-180" : ""}`} />
              </Link>
            </div>

            {/* RBAC Badges */}
            {canWriteContent && (
              <Link to={`/${lang}/writer/editor`} className="px-3 py-2 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-500/10 rounded-xl flex items-center gap-1.5">
                <PenTool size={14} />
                <span>{lang === "ar" ? "المحرر" : "Editor"}</span>
              </Link>
            )}
            {canManageUsers && (
              <Link to={`/${lang}/admin`} className="px-3 py-2 text-amber-600 dark:text-amber-400 font-bold hover:bg-amber-500/10 rounded-xl flex items-center gap-1.5">
                <LayoutDashboard size={14} />
                <span>{lang === "ar" ? "الإدارة" : "Admin"}</span>
              </Link>
            )}
            {isRoot && (
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-purple-500/15 text-purple-600 rounded-md border border-purple-500/20">Root</span>
            )}
          </nav>

          {/* ─── DESKTOP TOOLBAR ─── */}
          <div className="hidden md:flex items-center gap-2">
            <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-xl border border-border hover:bg-muted transition">
              {isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
            </button>

            <div className="relative" ref={langRef}>
              <button onClick={() => setLangMenuOpen(!langMenuOpen)} className="flex items-center gap-1 px-2.5 py-2 rounded-xl border border-border text-xs font-bold hover:bg-muted transition uppercase">
                <Globe size={14} className="text-primary" />
                <span>{lang}</span>
              </button>
              {langMenuOpen && (
                <div className="absolute top-full mt-2 rtl:left-0 ltr:right-0 w-32 bg-card border border-border rounded-xl shadow-xl p-1 z-50">
                  {LANGUAGES.map((item) => (
                    <button key={item.code} onClick={() => switchLanguage(item.code)} className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold rounded-lg transition ${lang === item.code ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                      <span>{item.label}</span>
                      <span>{item.flag}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ✅ DESKTOP: Auth Buttons أو Profile */}
            {authLoading ? (
              <div className="w-8 h-8 rounded-xl bg-muted animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-1.5">
                <Link to={`/${lang}/profile`} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all">
                  <div className="w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full rounded-md object-cover" /> : <User size={13} />}
                  </div>
                  <span className="text-xs font-bold max-w-[90px] truncate">{user.name}</span>
                </Link>
                <button onClick={handleLogout} className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition">
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <button
                onClick={openLogin}
                className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition flex items-center gap-1.5"
              >
                <LogIn size={14} />
                <span>{lang === "ar" ? "دخول" : "Sign In"}</span>
              </button>
            )}
          </div>

          {/* ─── MOBILE CONTROLS ─── */}
          <div className="flex items-center gap-1.5 md:hidden">
            <button onClick={() => setIsDark(!isDark)} className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg bg-muted/70 border border-border/80">
              {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
            </button>

            {/* ✅ MOBILE: زر واحد فقط — دخول أو بروفايل */}
            {authLoading ? (
              <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
            ) : user ? (
              <Link
                to={`/${lang}/profile`}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 relative"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-7 h-7 rounded-md object-cover" />
                ) : (
                  <User size={18} />
                )}
                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-emerald-500 rounded-full ring-1 ring-background" />
              </Link>
            ) : (
              <button
                onClick={openLogin}
                className="min-h-[40px] px-3 text-xs font-bold bg-primary text-primary-foreground rounded-lg flex items-center gap-1"
              >
                <LogIn size={14} />
                <span>{lang === "ar" ? "دخول" : "Sign In"}</span>
              </button>
            )}

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg bg-muted border border-border/80"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* ─── MOBILE DRAWER ─── */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-x-0 top-[100%] bottom-0 h-[calc(100vh-100%)] z-50 flex flex-col bg-background/98 backdrop-blur-2xl border-t border-border">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              
              {/* User info */}
              {user && (
                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/20">
                  <Link to={`/${lang}/profile`} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                      {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : <User size={16} />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground">{user.name}</span>
                      <span className="text-[10px] text-muted-foreground">{user.email}</span>
                    </div>
                  </Link>
                  <button onClick={handleLogout} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg">
                    <LogOut size={15} />
                  </button>
                </div>
              )}

              {/* ✅ MOBILE: إنشاء حساب — داخل الدرور فقط */}
              {!user && (
                <button
                  onClick={() => { setIsMobileMenuOpen(false); openSignup(); }}
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 p-3 bg-muted rounded-xl font-bold text-sm border border-border hover:bg-muted/80 transition"
                >
                  <User size={16} />
                  <span>{lang === "ar" ? "إنشاء حساب جديد" : "Create Account"}</span>
                </button>
              )}

              {/* Language */}
              <div className="p-2.5 bg-muted/40 rounded-xl">
                <span className="text-[10px] font-bold text-muted-foreground uppercase px-1 block mb-1.5">
                  {lang === "ar" ? "اللغة" : "Language"}
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {LANGUAGES.map((item) => (
                    <button
                      key={item.code}
                      onClick={() => switchLanguage(item.code)}
                      className={`min-h-[36px] rounded-lg text-xs font-bold flex items-center justify-center gap-1 ${lang === item.code ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}
                    >
                      <span>{item.flag}</span>
                      <span className="uppercase">{item.code}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nav Links */}
              <div className="space-y-1.5">
                <Link to={`/${lang}`} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 min-h-[44px] px-3 rounded-xl bg-card border border-border font-bold text-sm">
                  <Home size={17} className="text-primary" />
                  {lang === "ar" ? "الرئيسية" : "Home"}
                </Link>
                <Link to={`/${lang}/news`} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 min-h-[44px] px-3 rounded-xl bg-card border border-border font-bold text-sm">
                  <Newspaper size={17} className="text-primary" />
                  {lang === "ar" ? "الأخبار" : "News"}
                </Link>
                <Link to={`/${lang}/library`} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 min-h-[44px] px-3 rounded-xl bg-card border border-border font-bold text-sm">
                  <BookOpen size={17} className="text-primary" />
                  {lang === "ar" ? "المكتبة" : "Library"}
                </Link>
                <Link to={`/${lang}/archive`} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 min-h-[44px] px-3 rounded-xl bg-card border border-border font-bold text-sm">
                  <Archive size={17} className="text-primary" />
                  {lang === "ar" ? "الأرشيف" : "Archive"}
                </Link>
                <Link to={`/${lang}/about`} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 min-h-[44px] px-3 rounded-xl bg-card border border-border font-bold text-sm">
                  <Users size={17} className="text-primary" />
                  {lang === "ar" ? "عن المنصة" : "About"}
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ─── Auth Modal ─── */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        lang={lang}
        dir={dir}
        initialTab={authModalTab}
        onSuccess={() => {
          setAuthModalOpen(false);
          window.location.reload(); // ← أعد تحميل لتحديث الـ user state
        }}
      />
    </>
  );
}

export default Navbar;
