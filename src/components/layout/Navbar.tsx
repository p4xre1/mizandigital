import React, { useState, useEffect, useRef } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import { useRole } from "../../hooks/useRole";
import { AuthModal } from "@/components/auth/AuthModal";
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
  Gavel,
  Sun,
  Moon,
  Globe,
  Users,
  ArrowRight,
  ArrowLeft
} from "lucide-react";

const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: "ar", label: "العربية", flag: "🇲🇦" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

export function Navbar() {
  const { lang: rawLang = "ar" } = useParams();
  const lang = (["ar", "fr", "en", "es"].includes(rawLang) ? rawLang : "ar") as Lang;
  const dir = lang === "ar" ? "rtl" : "ltr";
  
  const location = useLocation();
  const navigate = useNavigate();

  const { role, isDeveloper, loading } = useRole();

  // Banner dismiss state
  const [showDisclaimer, setShowDisclaimer] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("hide_legal_disclaimer") !== "true";
    }
    return true;
  });

  const handleDismissDisclaimer = () => {
    setShowDisclaimer(false);
    sessionStorage.setItem("hide_legal_disclaimer", "true");
  };

  // Dark Mode State
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark") || 
             localStorage.getItem("theme") === "dark";
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

  // Desktop Hover Dropdowns State
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  
  // Mobile Menu States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileSectionOpen, setMobileSectionOpen] = useState<string | null>(null);

  const langRef = useRef<HTMLDivElement>(null);

  // Auth state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  // Automatically close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
    setLangMenuOpen(false);
  }, [location.pathname]);

  // Sync user state
  const loadUser = () => {
    try {
      const stored = localStorage.getItem("mizan_user");
      setUser(stored ? JSON.parse(stored) : null);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    loadUser();
    window.addEventListener("storage", loadUser);
    return () => window.removeEventListener("storage", loadUser);
  }, []);

  // Handle outside clicks
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
    } catch {}
    setUser(null);
  };

  const switchLanguage = (newLang: Lang) => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    if (["ar", "fr", "en", "es"].includes(pathSegments[0])) {
      pathSegments[0] = newLang;
    } else {
      pathSegments.unshift(newLang);
    }
    setLangMenuOpen(false);
    navigate("/" + pathSegments.join(""));
  };

  return (
    <header dir={dir} className="w-full font-sans border-b border-border bg-card/95 backdrop-blur-md sticky top-0 z-50 shadow-xs">
      {/* Dismissible Top Banner Notice */}
      {showDisclaimer && (
        <div className="bg-amber-100/90 dark:bg-amber-950/40 border-b border-amber-300 dark:border-amber-800 px-3 py-1.5 text-xs text-amber-950 dark:text-amber-300 font-semibold leading-snug flex items-center justify-between transition-all">
          <div className="flex-1 text-center">
            <span>
              {lang === "ar" && <>⚠️ <strong>تنويه:</strong> محتوى المنصة تعليمي وليس استشارة قانونية.</>}
              {lang === "fr" && <>⚠️ <strong>Avertissement:</strong> Le contenu est éducatif et ne constitue pas un conseil juridique.</>}
              {lang === "en" && <>⚠️ <strong>Disclaimer:</strong> Content is educational and does not constitute legal advice.</>}
              {lang === "es" && <>⚠️ <strong>Aviso:</strong> El contenido es educativo y no constituye asesoramiento legal.</>}
            </span>
          </div>
          <button
            onClick={handleDismissDisclaimer}
            aria-label="Close disclaimer"
            className="p-1 rounded-md hover:bg-amber-200/60 dark:hover:bg-amber-900/60 text-amber-950 dark:text-amber-300 transition cursor-pointer shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Navbar */}
      <div className="px-4 py-2.5 max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <Link to={`/${lang}`} className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-black text-lg shadow-xs">
            M
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-bold text-foreground leading-none tracking-tight">Mizan Digital</h1>
            <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">Modern Legal Library</span>
          </div>
        </Link>

        {/* ================= DESKTOP NAVIGATION ================= */}
        <nav className="hidden md:flex items-center gap-1 text-xs xl:text-sm font-semibold">
          
          {/* 1. Home Link */}
          <Link to={`/${lang}`} className="px-3 py-2 rounded-lg hover:bg-muted hover:text-primary transition-colors flex items-center gap-1.5">
            <Home size={16} />
            <span>{lang === "ar" ? "الرئيسية" : "Home"}</span>
          </Link>

          {/* 2. Digital Library Dropdown - FIXED LINK */}
          <div
            className="relative"
            onMouseEnter={() => setActiveDropdown("library")}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <Link 
              to={`/${lang}/library`} 
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-muted hover:text-primary transition-colors cursor-pointer"
            >
              <BookOpen size={16} />
              <span>{lang === "ar" ? "المكتبة الرقمية" : "Library"}</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === "library" ? "rotate-180" : ""}`} />
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
                      <Link to={`/${lang}/fields/constitutional-law`} className="block hover:text-primary transition-colors">{lang === "ar" ? "القانون الدستوري" : "Constitutional Law"}</Link>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-1 border-b border-border">
                      {lang === "ar" ? "الوثائق" : "DOCUMENTS"}
                    </h4>
                    <div className="space-y-2 text-xs font-medium">
                      <Link to={`/${lang}/documents/legal-texts`} className="block hover:text-primary transition-colors">{lang === "ar" ? "النصوص القانونية" : "Legal Texts"}</Link>
                      <Link to={`/${lang}/documents/ministerial-decrees`} className="block hover:text-primary transition-colors">{lang === "ar" ? "المراسيم والقرارات" : "Ministerial Decrees"}</Link>
                      <Link to={`/${lang}/documents/cassation-rulings`} className="block hover:text-primary transition-colors">{lang === "ar" ? "قرارات محكمة النقض" : "Cassation Rulings"}</Link>
                      <Link to={`/${lang}/documents/official-journals`} className="block hover:text-primary transition-colors">{lang === "ar" ? "الجريدة الرسمية" : "Official Journals"}</Link>
                    </div>
                  </div>
                </div>

                {/* Direct Link to Main Library Page */}
                <div className="pt-3 border-t border-border">
                  <Link 
                    to={`/${lang}/library`} 
                    className="flex items-center justify-between text-xs font-bold text-primary hover:underline"
                  >
                    <span>{lang === "ar" ? "تصفح كل المكتبة الرقمية" : "Browse All Library Resources"}</span>
                    {dir === "rtl" ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* 3. Archive Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setActiveDropdown("archive")}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-muted hover:text-primary transition-colors cursor-pointer">
              <Archive size={16} />
              <span>{lang === "ar" ? "الأرشيف القانوني" : "Archive"}</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === "archive" ? "rotate-180" : ""}`} />
            </button>

            {activeDropdown === "archive" && (
              <div className="absolute top-full rtl:right-0 ltr:left-0 mt-1 w-[460px] bg-card border border-border rounded-2xl shadow-xl p-5 grid grid-cols-2 gap-6 z-50 animate-in fade-in-50 zoom-in-95">
                <div>
                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-1 border-b border-border">
                    {lang === "ar" ? "الفصول الدراسية" : "SEMESTERS"}
                  </h4>
                  <div className="space-y-2 text-xs font-medium">
                    <Link to={`/${lang}/archive?semester=s1`} className="block hover:text-primary transition-colors">Semester S1</Link>
                    <Link to={`/${lang}/archive?semester=s2`} className="block hover:text-primary transition-colors">Semester S2</Link>
                    <Link to={`/${lang}/archive?semester=s3`} className="block hover:text-primary transition-colors">Semester S3</Link>
                    <Link to={`/${lang}/archive?semester=s4`} className="block hover:text-primary transition-colors">Semester S4</Link>
                    <Link to={`/${lang}/archive?semester=s5`} className="block hover:text-primary transition-colors">Semester S5</Link>
                    <Link to={`/${lang}/archive?semester=s6`} className="block hover:text-primary transition-colors">Semester S6</Link>
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-1 border-b border-border">
                    {lang === "ar" ? "كليات الحقوق" : "LAW SCHOOLS"}
                  </h4>
                  <div className="space-y-2 text-xs font-medium">
                    <Link to={`/${lang}/schools`} className="block font-bold text-primary hover:underline">{lang === "ar" ? "الدليل الكامل" : "Full Directory"}</Link>
                    <Link to={`/${lang}/schools/rabat`} className="block hover:text-primary transition-colors">Mohammed V — Rabat</Link>
                    <Link to={`/${lang}/schools/casablanca`} className="block hover:text-primary transition-colors">Hassan II — Casablanca</Link>
                    <Link to={`/${lang}/schools/marrakech`} className="block hover:text-primary transition-colors">Cadi Ayyad — Marrakech</Link>
                    <Link to={`/${lang}/schools/oujda`} className="block hover:text-primary transition-colors">Mohammed I — Oujda</Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Jurisprudence Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setActiveDropdown("jurisprudence")}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-muted hover:text-primary transition-colors cursor-pointer">
              <Gavel size={16} />
              <span>{lang === "ar" ? "الاجتهاد القضائي" : "Jurisprudence"}</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === "jurisprudence" ? "rotate-180" : ""}`} />
            </button>

            {activeDropdown === "jurisprudence" && (
              <div className="absolute top-full rtl:right-0 ltr:left-0 mt-1 w-[440px] bg-card border border-border rounded-2xl shadow-xl p-5 grid grid-cols-2 gap-6 z-50 animate-in fade-in-50 zoom-in-95">
                <div>
                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-1 border-b border-border">
                    {lang === "ar" ? "الأحكام القضائية" : "COURT RULINGS"}
                  </h4>
                  <div className="space-y-2 text-xs font-medium">
                    <Link to={`/${lang}/jurisprudence/cassation`} className="block hover:text-primary transition-colors">Court of Cassation</Link>
                    <Link to={`/${lang}/jurisprudence/appeal`} className="block hover:text-primary transition-colors">Courts of Appeal</Link>
                    <Link to={`/${lang}/jurisprudence/administrative`} className="block hover:text-primary transition-colors">Administrative Courts</Link>
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-1 border-b border-border">
                    {lang === "ar" ? "الفقه والقانون" : "DOCTRINE"}
                  </h4>
                  <div className="space-y-2 text-xs font-medium">
                    <Link to={`/${lang}/jurisprudence/articles`} className="block hover:text-primary transition-colors">Academic Articles</Link>
                    <Link to={`/${lang}/jurisprudence/commentaries`} className="block hover:text-primary transition-colors">Case Commentaries</Link>
                    <Link to={`/${lang}/jurisprudence/studies`} className="block hover:text-primary transition-colors">Comparative Studies</Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. About Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setActiveDropdown("about")}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-muted hover:text-primary transition-colors cursor-pointer">
              <Users size={16} />
              <span>{lang === "ar" ? "عن المنصة" : "About"}</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === "about" ? "rotate-180" : ""}`} />
            </button>

            {activeDropdown === "about" && (
              <div className="absolute top-full rtl:right-0 ltr:left-0 mt-1 w-[220px] bg-card border border-border rounded-2xl shadow-xl p-4 z-50 animate-in fade-in-50 zoom-in-95">
                <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-1 border-b border-border">
                  MIZAN
                </h4>
                <div className="space-y-2.5 text-xs font-medium">
                  <Link to={`/${lang}/about`} className="block hover:text-primary transition-colors">{lang === "ar" ? "من نحن" : "About Us"}</Link>
                  <Link to={`/${lang}/editorial-board`} className="block hover:text-primary transition-colors">{lang === "ar" ? "الهيئة التحريرية" : "Editorial Board"}</Link>
                  <Link to={`/${lang}/academic-partners`} className="block hover:text-primary transition-colors">{lang === "ar" ? "الشركاء الأكاديميون" : "Academic Partners"}</Link>
                  <Link to={`/${lang}/contact`} className="block hover:text-primary transition-colors">{lang === "ar" ? "اتصل بنا" : "Contact"}</Link>
                </div>
              </div>
            )}
          </div>

          {isDeveloper && (
            <Link to={`/${lang}/admin`} className="px-3 py-2 text-purple-700 dark:text-purple-400 font-bold hover:opacity-80 transition-colors">
              🛠️ باني المطور
            </Link>
          )}
        </nav>

        {/* ================= DESKTOP TOOLBAR ================= */}
        <div className="hidden md:flex items-center gap-2">
          
          <button
            onClick={() => setIsDark(!isDark)}
            aria-label="Toggle dark mode"
            className="p-2 rounded-xl border border-border text-foreground hover:bg-muted transition cursor-pointer"
          >
            {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-700" />}
          </button>

          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-muted transition cursor-pointer uppercase"
            >
              <Globe size={15} className="text-primary" />
              <span>{lang}</span>
              <ChevronDown size={12} className={`transition-transform ${langMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {langMenuOpen && (
              <div className="absolute top-full mt-2 rtl:left-0 ltr:right-0 w-36 bg-card border border-border rounded-xl shadow-lg p-1 z-50 animate-in fade-in-50">
                {LANGUAGES.map((item) => (
                  <button
                    key={item.code}
                    onClick={() => switchLanguage(item.code)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition cursor-pointer ${
                      lang === item.code ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="text-sm">{item.flag}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {user ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold bg-muted px-3 py-2 rounded-xl border border-border flex items-center gap-1.5">
                <User size={14} className="text-amber-600" />
                {user.name}
              </span>
              <button onClick={handleLogout} className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <LogIn size={14} />
              <span>{lang === "ar" ? "تسجيل الدخول" : "Sign In"}</span>
            </button>
          )}
        </div>

        {/* ================= MOBILE HEADER CONTROLS ================= */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-xl bg-muted text-foreground border border-border min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
          >
            {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
          </button>

          {!user && (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-3 py-2 text-xs font-bold bg-amber-600 text-white rounded-xl min-h-[40px] flex items-center gap-1 cursor-pointer"
            >
              <LogIn size={14} />
              <span>{lang === "ar" ? "دخول" : "Sign In"}</span>
            </button>
          )}

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-muted text-foreground border border-border transition cursor-pointer"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* ================= MOBILE DRAWER MENU ================= */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-card border-t border-border px-4 py-4 space-y-3.5 animate-in slide-in-from-top-2 duration-200 max-h-[85vh] overflow-y-auto">
          
          {user && (
            <div className="flex items-center justify-between p-3 bg-muted/80 rounded-xl border border-border">
              <div className="flex items-center gap-2 text-xs font-bold">
                <User size={16} className="text-amber-600" />
                <span>{user.name}</span>
              </div>
              <button onClick={handleLogout} className="text-xs font-bold text-destructive hover:bg-destructive/10 px-2 py-1 rounded-md flex items-center gap-1">
                <LogOut size={14} />
                <span>{lang === "ar" ? "خروج" : "Logout"}</span>
              </button>
            </div>
          )}

          {/* Quick Language Selector */}
          <div className="p-2.5 bg-muted/50 border border-border rounded-xl space-y-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase px-1 block">
              {lang === "ar" ? "اختر اللغة" : "Select Language"}
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {LANGUAGES.map((item) => (
                <button
                  key={item.code}
                  onClick={() => switchLanguage(item.code)}
                  className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    lang === item.code ? "bg-primary text-primary-foreground shadow-xs" : "bg-card border border-border text-foreground hover:bg-muted"
                  }`}
                >
                  <span>{item.flag}</span>
                  <span className="uppercase">{item.code}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1 pt-1">
            <Link
              to={`/${lang}`}
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 min-h-[44px] px-3 rounded-xl font-semibold text-sm hover:bg-muted active:bg-muted"
            >
              <Home size={18} className="text-primary" />
              <span>{lang === "ar" ? "الرئيسية" : "Home"}</span>
            </Link>

            {/* Library Accordion */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between min-h-[44px] px-3 font-semibold text-sm bg-card hover:bg-muted">
                <Link
                  to={`/${lang}/library`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 flex-1 py-2"
                >
                  <BookOpen size={18} className="text-primary" />
                  <span>{lang === "ar" ? "المكتبة الرقمية" : "Library"}</span>
                </Link>
                <button
                  onClick={() => setMobileSectionOpen(mobileSectionOpen === "library" ? null : "library")}
                  className="p-2 hover:bg-muted rounded-lg"
                >
                  <ChevronDown size={16} className={`transition-transform ${mobileSectionOpen === "library" ? "rotate-180" : ""}`} />
                </button>
              </div>

              {mobileSectionOpen === "library" && (
                <div className="bg-muted/40 p-3 space-y-3 border-t border-border text-xs">
                  <Link 
                    to={`/${lang}/library`} 
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className="block py-1.5 font-bold text-primary border-b border-border/50"
                  >
                    {lang === "ar" ? "📑 كافة كتب ومستندات المكتبة" : "📑 All Library Documents"}
                  </Link>
                  <div>
                    <span className="font-bold text-primary uppercase block mb-1">FIELDS OF LAW</span>
                    <Link to={`/${lang}/fields/family-law`} onClick={() => setIsMobileMenuOpen(false)} className="block py-1">Family Law</Link>
                    <Link to={`/${lang}/fields/criminal-law`} onClick={() => setIsMobileMenuOpen(false)} className="block py-1">Criminal Law</Link>
                    <Link to={`/${lang}/fields/commercial-law`} onClick={() => setIsMobileMenuOpen(false)} className="block py-1">Commercial Law</Link>
                  </div>
                  <div>
                    <span className="font-bold text-primary uppercase block mb-1">DOCUMENTS</span>
                    <Link to={`/${lang}/documents/legal-texts`} onClick={() => setIsMobileMenuOpen(false)} className="block py-1">Legal Texts</Link>
                    <Link to={`/${lang}/documents/ministerial-decrees`} onClick={() => setIsMobileMenuOpen(false)} className="block py-1">Ministerial Decrees</Link>
                  </div>
                </div>
              )}
            </div>

            {/* Archive Accordion */}
            <div className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setMobileSectionOpen(mobileSectionOpen === "archive" ? null : "archive")}
                className="w-full flex items-center justify-between min-h-[44px] px-3 font-semibold text-sm bg-card hover:bg-muted cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <Archive size={18} className="text-primary" />
                  <span>{lang === "ar" ? "الأرشيف القانوني" : "Archive"}</span>
                </span>
                <ChevronDown size={16} className={`transition-transform ${mobileSectionOpen === "archive" ? "rotate-180" : ""}`} />
              </button>

              {mobileSectionOpen === "archive" && (
                <div className="bg-muted/40 p-3 space-y-3 border-t border-border text-xs">
                  <div>
                    <span className="font-bold text-primary uppercase block mb-1">SEMESTERS</span>
                    <Link to={`/${lang}/archive?semester=s1`} onClick={() => setIsMobileMenuOpen(false)} className="block py-1">Semester S1</Link>
                    <Link to={`/${lang}/archive?semester=s2`} onClick={() => setIsMobileMenuOpen(false)} className="block py-1">Semester S2</Link>
                  </div>
                  <div>
                    <span className="font-bold text-primary uppercase block mb-1">LAW SCHOOLS</span>
                    <Link to={`/${lang}/schools`} onClick={() => setIsMobileMenuOpen(false)} className="block py-1 font-bold">Full Directory</Link>
                  </div>
                </div>
              )}
            </div>

            {/* Jurisprudence Accordion */}
            <div className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setMobileSectionOpen(mobileSectionOpen === "jurisprudence" ? null : "jurisprudence")}
                className="w-full flex items-center justify-between min-h-[44px] px-3 font-semibold text-sm bg-card hover:bg-muted cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <Gavel size={18} className="text-primary" />
                  <span>{lang === "ar" ? "الاجتهاد القضائي" : "Jurisprudence"}</span>
                </span>
                <ChevronDown size={16} className={`transition-transform ${mobileSectionOpen === "jurisprudence" ? "rotate-180" : ""}`} />
              </button>

              {mobileSectionOpen === "jurisprudence" && (
                <div className="bg-muted/40 p-3 space-y-2 border-t border-border text-xs">
                  <Link to={`/${lang}/jurisprudence/cassation`} onClick={() => setIsMobileMenuOpen(false)} className="block py-1">Court of Cassation</Link>
                  <Link to={`/${lang}/jurisprudence/appeal`} onClick={() => setIsMobileMenuOpen(false)} className="block py-1">Courts of Appeal</Link>
                </div>
              )}
            </div>

            {/* About Accordion */}
            <div className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setMobileSectionOpen(mobileSectionOpen === "about" ? null : "about")}
                className="w-full flex items-center justify-between min-h-[44px] px-3 font-semibold text-sm bg-card hover:bg-muted cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <Users size={18} className="text-primary" />
                  <span>{lang === "ar" ? "عن المنصة" : "About"}</span>
                </span>
                <ChevronDown size={16} className={`transition-transform ${mobileSectionOpen === "about" ? "rotate-180" : ""}`} />
              </button>

              {mobileSectionOpen === "about" && (
                <div className="bg-muted/40 p-3 space-y-2 border-t border-border text-xs">
                  <Link to={`/${lang}/about`} onClick={() => setIsMobileMenuOpen(false)} className="block py-1">{lang === "ar" ? "من نحن" : "About Us"}</Link>
                  <Link to={`/${lang}/contact`} onClick={() => setIsMobileMenuOpen(false)} className="block py-1">{lang === "ar" ? "اتصل بنا" : "Contact"}</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        lang={lang}
        dir={dir}
        onSuccess={loadUser}
      />
    </header>
  );
}