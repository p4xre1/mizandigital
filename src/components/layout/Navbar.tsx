import React, { useState, useEffect, useRef } from "react";
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
  Shield,
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
  Search,
  Check,
  Mail
} from "lucide-react";

// Security Whitelist for supported languages
const ALLOWED_LANGS: Lang[] = ["ar", "fr", "en", "es"];

const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: "ar", label: "العربية", flag: "🇲🇦" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

export function Navbar() {
  const { lang: rawLang = "ar" } = useParams();
  
  // Security: Sanitize dynamic route language parameter
  const lang: Lang = ALLOWED_LANGS.includes(rawLang as Lang) ? (rawLang as Lang) : "ar";
  const dir = lang === "ar" ? "rtl" : "ltr";

  const location = useLocation();
  const navigate = useNavigate();

  const { isRoot, canManageUsers, canWriteContent } = useRole();

  // Legal Disclaimer State
  const [showDisclaimer, setShowDisclaimer] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("mizan_hide_disclaimer") !== "true";
    }
    return true;
  });

  const handleDismissDisclaimer = () => {
    setShowDisclaimer(false);
    sessionStorage.setItem("mizan_hide_disclaimer", "true");
  };

  // Dark Mode State
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return (
        document.documentElement.classList.contains("dark") ||
        localStorage.getItem("theme") === "dark"
      );
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  // Dynamic Navigation States
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileSectionOpen, setMobileSectionOpen] = useState<string | null>(null);

  const langRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<{ name: string; email: string; avatar?: string } | null>(null);

  // Safe Google AdSense Initializer (Military-Grade Fault Tolerance)
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch (err) {
      // Prevents AdSense script execution errors from breaking UI thread
      console.warn("Google Ads initialization bypassed:", err);
    }
  }, [location.pathname]);

  // Lock background scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Reset dropdowns on route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
    setLangMenuOpen(false);
  }, [location.pathname]);

  // Secure User Session Sanitization
  const loadUser = () => {
    try {
      const stored = localStorage.getItem("mizan_user");
      if (!stored) {
        setUser(null);
        return;
      }
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object" && typeof parsed.name === "string") {
        setUser({
          name: String(parsed.name).slice(0, 50),
          email: parsed.email ? String(parsed.email).slice(0, 100) : "",
          avatar: parsed.avatar ? String(parsed.avatar) : undefined,
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    loadUser();
    window.addEventListener("storage", loadUser);
    return () => window.removeEventListener("storage", loadUser);
  }, []);

  // Outside click listener for language menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    try {
      localStorage.removeItem("mizan_user");
      sessionStorage.clear();
    } catch {}
    setUser(null);
  };

  const switchLanguage = (newLang: Lang) => {
    if (!ALLOWED_LANGS.includes(newLang)) return;
    const pathSegments = location.pathname.split("/").filter(Boolean);
    if (ALLOWED_LANGS.includes(pathSegments[0] as Lang)) {
      pathSegments[0] = newLang;
    } else {
      pathSegments.unshift(newLang);
    }
    setLangMenuOpen(false);
    setIsMobileMenuOpen(false);
    navigate("/" + pathSegments.join("/"));
  };

  // Helper for active navigation link styling
  const isActiveRoute = (path: string) => location.pathname.includes(path);

  return (
    <header
      dir={dir}
      role="banner"
      className="w-full font-sans border-b border-border/80 bg-background/90 dark:bg-background/95 backdrop-blur-xl sticky top-0 z-50 transition-colors duration-200"
    >
      {/* ================= 1. GOOGLE ADS top slot ================= */}
      <div className="w-full bg-muted/30 border-b border-border/40 py-1 px-3 text-center text-[10px] text-muted-foreground flex items-center justify-between gap-2 overflow-hidden min-h-[26px]">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 font-semibold text-[10px] text-amber-600 dark:text-amber-400 shrink-0">
            <Sparkles size={11} />
            {lang === "ar" ? "رعاية قانونية" : "Sponsored"}
          </span>
          
          {/* AdSense Unit Slot */}
          <div className="flex-1 max-w-lg mx-auto overflow-hidden hidden sm:block">
            <ins
              className="adsbygoogle"
              style={{ display: "block", height: "18px", textAlign: "center" }}
              data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
              data-ad-slot="1234567890"
              data-ad-format="horizontal"
              data-full-width-responsive="true"
            />
          </div>

          <span className="text-[9px] text-muted-foreground/70 shrink-0 font-mono">
            Mizan Digital Secure Engine ⚡
          </span>
        </div>
      </div>

      {/* ================= 2. DISCLAIMER BANNER ================= */}
      {showDisclaimer && (
        <div className="bg-amber-500/10 dark:bg-amber-500/15 border-b border-amber-500/20 px-3 py-1.5 text-xs text-amber-900 dark:text-amber-200 font-medium leading-snug flex items-center justify-between transition-all">
          <div className="flex-1 text-center text-[11px] sm:text-xs">
            <span>
              {lang === "ar" && <>⚠️ <strong>تنويه:</strong> المحتوى تعليمي وأكاديمي ولا يُعد استشارة قانونية.</>}
              {lang === "fr" && <>⚠️ <strong>Avertissement:</strong> Le contenu est éducatif et ne constitue pas un conseil juridique.</>}
              {lang === "en" && <>⚠️ <strong>Disclaimer:</strong> Content is educational and does not constitute legal advice.</>}
              {lang === "es" && <>⚠️ <strong>Aviso:</strong> El contenido es educativo y no constituye asesoramiento legal.</>}
            </span>
          </div>
          <button
            onClick={handleDismissDisclaimer}
            aria-label="Close disclaimer"
            className="p-1 rounded-lg hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 transition active:scale-95 cursor-pointer shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ================= 3. MAIN NAVBAR HEADER ================= */}
      <div className="px-3.5 sm:px-6 py-2.5 max-w-7xl mx-auto flex items-center justify-between gap-3">
        
        {/* Brand Logo */}
        <Link
          to={`/${lang}`}
          className="flex items-center gap-2.5 shrink-0 group active:scale-98 transition-transform"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-black text-lg shadow-sm group-hover:bg-primary/90 transition-colors">
            ⚖️
          </div>
          <div className="flex flex-col">
            <h1 className="text-base sm:text-lg font-bold text-foreground leading-none tracking-tight flex items-center gap-1">
              Mizan <span className="text-primary font-extrabold">Digital</span>
            </h1>
            <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline mt-0.5">
              {lang === "ar" ? "منصة العلوم والتشريعات القانونية" : "Modern Legal Tech Platform"}
            </span>
          </div>
        </Link>

        {/* ================= 4. DESKTOP NAVIGATION ================= */}
        <nav className="hidden md:flex items-center gap-1 text-xs xl:text-sm font-semibold">
          
          {/* Home Link */}
          <Link
            to={`/${lang}`}
            className={`px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
              isActiveRoute(`/${lang}`) && location.pathname === `/${lang}`
                ? "bg-primary/10 text-primary font-bold"
                : "hover:bg-muted hover:text-primary text-foreground"
            }`}
          >
            <Home size={16} />
            <span>{lang === "ar" ? "الرئيسية" : "Home"}</span>
          </Link>

          {/* News Mega Menu */}
          <div
            className="relative"
            onMouseEnter={() => setActiveDropdown("news")}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <Link
              to={`/${lang}/news`}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                isActiveRoute("/news")
                  ? "bg-primary/10 text-primary font-bold"
                  : "hover:bg-muted hover:text-primary text-foreground"
              }`}
            >
              <Newspaper size={16} />
              <span>{lang === "ar" ? "الأخبار" : "News"}</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${
                  activeDropdown === "news" ? "rotate-180" : ""
                }`}
              />
            </Link>

            {activeDropdown === "news" && (
              <div className="absolute top-full rtl:right-0 ltr:left-0 mt-1 w-[420px] bg-card border border-border rounded-2xl shadow-xl p-4 z-50 animate-in fade-in-50 zoom-in-95">
                <div className="space-y-1">
                  <Link
                    to={`/${lang}/news/schools`}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors group"
                  >
                    <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg group-hover:scale-105 transition-transform">
                      <GraduationCap size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                        {lang === "ar" ? "أخبار الكليات والجامعات" : "University & Law School News"}
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {lang === "ar" ? "مباريات الماستر، النتائج والأنشطة الأكاديمية" : "Master entrance exams & faculty updates"}
                      </p>
                    </div>
                  </Link>

                  <Link
                    to={`/${lang}/news/government`}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors group"
                  >
                    <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg group-hover:scale-105 transition-transform">
                      <Landmark size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                        {lang === "ar" ? "المستجدات التشريعية والحكومية" : "Government & Legal Updates"}
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {lang === "ar" ? "مشاريع القوانين، المراسيم والجريدة الرسمية" : "Bills, decrees, and official announcements"}
                      </p>
                    </div>
                  </Link>

                  <Link
                    to={`/${lang}/news/general`}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors group"
                  >
                    <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:scale-105 transition-transform">
                      <Globe2 size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                        {lang === "ar" ? "أخبار قانونية عامة" : "General Legal News"}
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {lang === "ar" ? "مستجدات الساحة القضائية والقوانين" : "Judicial sector updates & articles"}
                      </p>
                    </div>
                  </Link>
                </div>

                <div className="pt-3 mt-2 border-t border-border">
                  <Link
                    to={`/${lang}/news`}
                    className="flex items-center justify-between text-xs font-bold text-primary hover:underline px-1"
                  >
                    <span>{lang === "ar" ? "مركز الأخبار الكامل" : "Visit Full News Center"}</span>
                    {dir === "rtl" ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Library Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setActiveDropdown("library")}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <Link
              to={`/${lang}/library`}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                isActiveRoute("/library")
                  ? "bg-primary/10 text-primary font-bold"
                  : "hover:bg-muted hover:text-primary text-foreground"
              }`}
            >
              <BookOpen size={16} />
              <span>{lang === "ar" ? "المكتبة الرقمية" : "Library"}</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${
                  activeDropdown === "library" ? "rotate-180" : ""
                }`}
              />
            </Link>

            {activeDropdown === "library" && (
              <div className="absolute top-full rtl:right-0 ltr:left-0 mt-1 w-[460px] bg-card border border-border rounded-2xl shadow-xl p-5 z-50 animate-in fade-in-50 zoom-in-95">
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-1 border-b border-border">
                      {lang === "ar" ? "التخصصات القانونية" : "FIELDS OF LAW"}
                    </h4>
                    <div className="space-y-2 text-xs font-medium">
                      <Link to={`/${lang}/fields/family-law`} className="block hover:text-primary transition-colors">{lang === "ar" ? "قانون الأسرة" : "Family Law"}</Link>
                      <Link to={`/${lang}/fields/criminal-law`} className="block hover:text-primary transition-colors">{lang === "ar" ? "القانون الجنائي" : "Criminal Law"}</Link>
                      <Link to={`/${lang}/fields/commercial-law`} className="block hover:text-primary transition-colors">{lang === "ar" ? "القانون التجاري" : "Commercial Law"}</Link>
                      <Link to={`/${lang}/fields/administrative-law`} className="block hover:text-primary transition-colors">{lang === "ar" ? "القانون الإداري" : "Administrative Law"}</Link>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-1 border-b border-border">
                      {lang === "ar" ? "الوثائق" : "DOCUMENTS"}
                    </h4>
                    <div className="space-y-2 text-xs font-medium">
                      <Link to={`/${lang}/documents/legal-texts`} className="block hover:text-primary transition-colors">{lang === "ar" ? "النصوص القانونية" : "Legal Texts"}</Link>
                      <Link to={`/${lang}/documents/ministerial-decrees`} className="block hover:text-primary transition-colors">{lang === "ar" ? "المراسيم والقرارات" : "Ministerial Decrees"}</Link>
                      <Link to={`/${lang}/documents/official-journals`} className="block hover:text-primary transition-colors">{lang === "ar" ? "الجريدة الرسمية" : "Official Journals"}</Link>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border">
                  <Link
                    to={`/${lang}/library`}
                    className="flex items-center justify-between text-xs font-bold text-primary hover:underline"
                  >
                    <span>{lang === "ar" ? "تصفح كافة المكتبة" : "Browse All Library Resources"}</span>
                    {dir === "rtl" ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Archive Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setActiveDropdown("archive")}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-muted hover:text-primary transition-colors cursor-pointer text-foreground">
              <Archive size={16} />
              <span>{lang === "ar" ? "الأرشيف الجامعي" : "Archive"}</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${
                  activeDropdown === "archive" ? "rotate-180" : ""
                }`}
              />
            </button>

            {activeDropdown === "archive" && (
              <div className="absolute top-full rtl:right-0 ltr:left-0 mt-1 w-[420px] bg-card border border-border rounded-2xl shadow-xl p-5 grid grid-cols-2 gap-6 z-50 animate-in fade-in-50 zoom-in-95">
                <div>
                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-1 border-b border-border">
                    {lang === "ar" ? "الفصول" : "SEMESTERS"}
                  </h4>
                  <div className="grid grid-cols-2 gap-1.5 text-xs font-semibold">
                    {["s1", "s2", "s3", "s4", "s5", "s6"].map((sem) => (
                      <Link
                        key={sem}
                        to={`/${lang}/archive?semester=${sem}`}
                        className="p-1.5 rounded-lg bg-muted/60 text-center hover:bg-primary hover:text-primary-foreground transition-colors uppercase"
                      >
                        {sem}
                      </Link>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-1 border-b border-border">
                    {lang === "ar" ? "الكليات" : "SCHOOLS"}
                  </h4>
                  <div className="space-y-2 text-xs font-medium">
                    <Link to={`/${lang}/schools`} className="block font-bold text-primary hover:underline">{lang === "ar" ? "الدليل الكامل" : "Directory"}</Link>
                    <Link to={`/${lang}/schools/rabat`} className="block hover:text-primary transition-colors">FSJES Rabat</Link>
                    <Link to={`/${lang}/schools/casablanca`} className="block hover:text-primary transition-colors">FSJES Casablanca</Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Role Protected Badges & Editors */}
          {canWriteContent && (
            <Link
              to={`/${lang}/writer/editor`}
              className="px-3 py-2 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-500/10 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <PenTool size={15} />
              <span>{lang === "ar" ? "المحرر" : "Editor"}</span>
            </Link>
          )}

          {canManageUsers && (
            <Link
              to={`/${lang}/admin`}
              className="px-3 py-2 text-amber-600 dark:text-amber-400 font-bold hover:bg-amber-500/10 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <LayoutDashboard size={15} />
              <span>{lang === "ar" ? "الإدارة" : "Admin"}</span>
            </Link>
          )}

          {isRoot && (
            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-purple-500/15 text-purple-600 dark:text-purple-400 rounded-md border border-purple-500/20">
              Root
            </span>
          )}
        </nav>

        {/* ================= 5. DESKTOP TOOLBAR ================= */}
        <div className="hidden md:flex items-center gap-2">
          
          {/* Theme Toggle Button */}
          <button
            onClick={() => setIsDark(!isDark)}
            aria-label="Toggle dark mode"
            className="p-2.5 rounded-xl border border-border text-foreground hover:bg-muted active:scale-95 transition cursor-pointer"
          >
            {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-700" />}
          </button>

          {/* Language Switcher */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              aria-label="Change language"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-muted transition cursor-pointer uppercase"
            >
              <Globe size={15} className="text-primary" />
              <span>{lang}</span>
              <ChevronDown size={12} className={`transition-transform ${langMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {langMenuOpen && (
              <div className="absolute top-full mt-2 rtl:left-0 ltr:right-0 w-36 bg-card border border-border rounded-2xl shadow-xl p-1.5 z-50 animate-in fade-in-50">
                {LANGUAGES.map((item) => (
                  <button
                    key={item.code}
                    onClick={() => switchLanguage(item.code)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
                      lang === item.code ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="text-sm">{item.flag}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User Auth Info (MEMBER ICON PROFILE OR SIGN IN) */}
          {user ? (
            <div className="flex items-center gap-1.5">
              <Link
                to={`/${lang}/profile`}
                title={user.name}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-foreground transition-all active:scale-95"
              >
                <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold relative">
                  <User size={15} />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-background" />
                </div>
                <span className="text-xs font-bold max-w-[110px] truncate">{user.name}</span>
              </Link>

              <button
                onClick={handleLogout}
                aria-label="Logout"
                title={lang === "ar" ? "تسجيل الخروج" : "Logout"}
                className="p-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition active:scale-95 cursor-pointer"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to={`/${lang}/register`}
                className="px-4 py-2 text-xs font-bold bg-muted hover:bg-muted/80 text-foreground rounded-xl border border-border transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <User size={14} />
                <span>{lang === "ar" ? "حساب جديد" : "Register"}</span>
              </Link>
              <Link
                to={`/${lang}/login`}
                className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <LogIn size={14} />
                <span>{lang === "ar" ? "تسجيل الدخول" : "Sign In"}</span>
              </Link>
            </div>
          )}
        </div>

        {/* ================= 6. MOBILE CONTROLS (ALWAYS TOUCH TARGET >= 44px) ================= */}
        <div className="flex items-center gap-2 md:hidden">
          
          {/* Mobile Theme Toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            aria-label="Toggle Theme"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-muted/70 text-foreground border border-border/80 active:scale-95 transition cursor-pointer"
          >
            {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
          </button>

          {/* Member Profile Icon OR Sign In Button on Mobile Header */}
          {user ? (
            <Link
              to={`/${lang}/profile`}
              aria-label="User Profile"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 active:scale-95 transition cursor-pointer relative"
            >
              <User size={20} />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-background" />
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to={`/${lang}/register`}
                className="min-h-[44px] px-3.5 text-xs font-bold bg-muted text-foreground rounded-xl border border-border active:scale-95 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <User size={15} />
                <span>{lang === "ar" ? "جديد" : "Register"}</span>
              </Link>
              <Link
                to={`/${lang}/login`}
                className="min-h-[44px] px-3.5 text-xs font-bold bg-primary text-primary-foreground rounded-xl active:scale-95 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <LogIn size={15} />
                <span>{lang === "ar" ? "دخول" : "Sign In"}</span>
              </Link>
            </div>
          )}

          {/* Mobile Menu Drawer Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-muted text-foreground border border-border/80 active:scale-95 transition cursor-pointer"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* ================= 7. MOBILE NAVIGATION DRAWER ================= */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[100%] bottom-0 h-[calc(100vh-100%)] z-50 flex flex-col bg-background/98 backdrop-blur-2xl border-t border-border animate-in slide-in-from-top-3 duration-200">
          
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            
            {/* User Profile Bar on Mobile Drawer */}
            {user && (
              <div className="flex items-center justify-between p-3.5 bg-primary/5 rounded-2xl border border-primary/20 shadow-xs">
                <Link
                  to={`/${lang}/profile`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 text-xs font-bold hover:underline"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-black">
                    <User size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-foreground text-sm">{user.name}</span>
                    <span className="text-[10px] text-muted-foreground">{user.email}</span>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/10 rounded-xl flex items-center gap-1 cursor-pointer active:scale-95 transition"
                >
                  <LogOut size={14} />
                  <span>{lang === "ar" ? "خروج" : "Logout"}</span>
                </button>
              </div>
            )}

            {/* Google Mobile Ad Placeholder */}
            <div className="p-2 bg-muted/30 border border-border/60 rounded-xl text-center">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-1">
                {lang === "ar" ? "إعلان" : "Advertisement"}
              </span>
              <ins
                className="adsbygoogle"
                style={{ display: "block" }}
                data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
                data-ad-slot="9876543210"
                data-ad-format="auto"
                data-full-width-responsive="true"
              />
            </div>

            {/* Quick RBAC Mobile Badges */}
            {(canWriteContent || canManageUsers) && (
              <div className="grid grid-cols-2 gap-2">
                {canWriteContent && (
                  <Link
                    to={`/${lang}/writer/editor`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="min-h-[44px] flex items-center justify-center gap-2 p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl font-bold text-xs border border-blue-500/20 active:scale-98 transition"
                  >
                    <PenTool size={16} />
                    <span>{lang === "ar" ? "محرر المقالات" : "Editor Workspace"}</span>
                  </Link>
                )}
                {canManageUsers && (
                  <Link
                    to={`/${lang}/admin`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="min-h-[44px] flex items-center justify-center gap-2 p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl font-bold text-xs border border-amber-500/20 active:scale-98 transition"
                  >
                    <LayoutDashboard size={16} />
                    <span>{lang === "ar" ? "لوحة الإدارة" : "Admin Panel"}</span>
                  </Link>
                )}
              </div>
            )}

            {/* Touch-Friendly Language Segment Switcher */}
            <div className="p-3 bg-muted/40 border border-border rounded-2xl space-y-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase px-1 block">
                {lang === "ar" ? "اختر لغة المنصة" : "Select Platform Language"}
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {LANGUAGES.map((item) => (
                  <button
                    key={item.code}
                    onClick={() => switchLanguage(item.code)}
                    className={`min-h-[40px] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                      lang === item.code
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-card border border-border/80 text-foreground"
                    }`}
                  >
                    <span>{item.flag}</span>
                    <span className="uppercase">{item.code}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Accordion Navigation Links */}
            <div className="space-y-2">
              
              {/* 1. Home */}
              <Link
                to={`/${lang}`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between min-h-[48px] px-4 rounded-2xl font-bold text-sm bg-card border border-border/80 text-foreground active:bg-muted transition"
              >
                <div className="flex items-center gap-3">
                  <Home size={18} className="text-primary" />
                  <span>{lang === "ar" ? "الرئيسية" : "Home"}</span>
                </div>
                {dir === "rtl" ? <ArrowLeft size={16} className="text-muted-foreground" /> : <ArrowRight size={16} className="text-muted-foreground" />}
              </Link>

              {/* 2. News Accordion */}
              <div className="border border-border/80 rounded-2xl overflow-hidden bg-card">
                <div className="flex items-center justify-between min-h-[48px] px-4 font-bold text-sm">
                  <Link
                    to={`/${lang}/news`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 flex-1 py-2"
                  >
                    <Newspaper size={18} className="text-primary" />
                    <span>{lang === "ar" ? "الأخبار والمستجدات" : "News & Updates"}</span>
                  </Link>
                  <button
                    onClick={() => setMobileSectionOpen(mobileSectionOpen === "news" ? null : "news")}
                    aria-label="Expand news"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground"
                  >
                    <ChevronDown size={18} className={`transition-transform duration-200 ${mobileSectionOpen === "news" ? "rotate-180" : ""}`} />
                  </button>
                </div>

                {mobileSectionOpen === "news" && (
                  <div className="bg-muted/40 p-3.5 space-y-2 border-t border-border text-xs font-medium">
                    <Link
                      to={`/${lang}/news/schools`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="min-h-[40px] flex items-center gap-2 px-3 rounded-xl bg-card border border-border/60 hover:text-primary"
                    >
                      <GraduationCap size={16} className="text-blue-500" />
                      <span>{lang === "ar" ? "أخبار الكليات والجامعات" : "Universities & Schools"}</span>
                    </Link>
                    <Link
                      to={`/${lang}/news/government`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="min-h-[40px] flex items-center gap-2 px-3 rounded-xl bg-card border border-border/60 hover:text-primary"
                    >
                      <Landmark size={16} className="text-amber-500" />
                      <span>{lang === "ar" ? "المستجدات التشريعية" : "Government Decrees"}</span>
                    </Link>
                    <Link
                      to={`/${lang}/news/general`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="min-h-[40px] flex items-center gap-2 px-3 rounded-xl bg-card border border-border/60 hover:text-primary"
                    >
                      <Globe2 size={16} className="text-emerald-500" />
                      <span>{lang === "ar" ? "أخبار قانونية عامة" : "General Sector News"}</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* 3. Library Accordion */}
              <div className="border border-border/80 rounded-2xl overflow-hidden bg-card">
                <div className="flex items-center justify-between min-h-[48px] px-4 font-bold text-sm">
                  <Link
                    to={`/${lang}/library`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 flex-1 py-2"
                  >
                    <BookOpen size={18} className="text-primary" />
                    <span>{lang === "ar" ? "المكتبة الرقمية" : "Legal Library"}</span>
                  </Link>
                  <button
                    onClick={() => setMobileSectionOpen(mobileSectionOpen === "library" ? null : "library")}
                    aria-label="Expand library"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground"
                  >
                    <ChevronDown size={18} className={`transition-transform duration-200 ${mobileSectionOpen === "library" ? "rotate-180" : ""}`} />
                  </button>
                </div>

                {mobileSectionOpen === "library" && (
                  <div className="bg-muted/40 p-3.5 space-y-2 border-t border-border text-xs font-medium">
                    <Link to={`/${lang}/fields/family-law`} onClick={() => setIsMobileMenuOpen(false)} className="min-h-[38px] flex items-center px-3 rounded-xl bg-card border border-border/60">
                      {lang === "ar" ? "قانون الأسرة" : "Family Law"}
                    </Link>
                    <Link to={`/${lang}/fields/criminal-law`} onClick={() => setIsMobileMenuOpen(false)} className="min-h-[38px] flex items-center px-3 rounded-xl bg-card border border-border/60">
                      {lang === "ar" ? "القانون الجنائي" : "Criminal Law"}
                    </Link>
                    <Link to={`/${lang}/documents/legal-texts`} onClick={() => setIsMobileMenuOpen(false)} className="min-h-[38px] flex items-center px-3 rounded-xl bg-card border border-border/60">
                      {lang === "ar" ? "النصوص القانونية" : "Legal Texts"}
                    </Link>
                  </div>
                )}
              </div>

              {/* 4. Archive Accordion */}
              <div className="border border-border/80 rounded-2xl overflow-hidden bg-card">
                <div className="flex items-center justify-between min-h-[48px] px-4 font-bold text-sm">
                  <Link
                    to={`/${lang}/schools`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 flex-1 py-2"
                  >
                    <Archive size={18} className="text-primary" />
                    <span>{lang === "ar" ? "الأرشيف الجامعي" : "University Archive"}</span>
                  </Link>
                  <button
                    onClick={() => setMobileSectionOpen(mobileSectionOpen === "archive" ? null : "archive")}
                    aria-label="Expand archive"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground"
                  >
                    <ChevronDown size={18} className={`transition-transform duration-200 ${mobileSectionOpen === "archive" ? "rotate-180" : ""}`} />
                  </button>
                </div>

                {mobileSectionOpen === "archive" && (
                  <div className="bg-muted/40 p-3.5 border-t border-border space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase px-1 block">
                      {lang === "ar" ? "اختر الفصل الدراسي" : "Select Semester"}
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
                      {["s1", "s2", "s3", "s4", "s5", "s6"].map((sem) => (
                        <Link
                          key={sem}
                          to={`/${lang}/archive?semester=${sem}`}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="min-h-[40px] flex items-center justify-center rounded-xl bg-card border border-border/80 uppercase hover:bg-primary hover:text-primary-foreground transition"
                        >
                          {sem}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. About Link */}
              <Link
                to={`/${lang}/about`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between min-h-[48px] px-4 rounded-2xl font-bold text-sm bg-card border border-border/80 text-foreground active:bg-muted transition"
              >
                <div className="flex items-center gap-3">
                  <Users size={18} className="text-primary" />
                  <span>{lang === "ar" ? "عن منصة ميزان" : "About Mizan"}</span>
                </div>
                {dir === "rtl" ? <ArrowLeft size={16} className="text-muted-foreground" /> : <ArrowRight size={16} className="text-muted-foreground" />}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}