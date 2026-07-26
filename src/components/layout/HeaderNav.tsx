import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import { useRole } from "../../hooks/useRole";
import { AuthModal } from "@/components/auth/AuthModal";
import { LAW_SCHOOLS } from "@/data/lawSchools";
import { LEGAL_FIELDS, DOCUMENT_TYPES } from "@/lib/navigation";
import type { Lang } from "@/lib/i18n";
import {
  User,
  LogOut,
  LogIn,
  GraduationCap,
  BookOpen,
  Scale,
  FileText,
  ChevronDown,
  Menu,
  X,
  Home,
  Shield,
  FolderTree,
  Archive,
  Wrench,
  Settings,
  LayoutDashboard,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

// AdSense Client Configuration
const ADSENSE_CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID || "ca-pub-0000000000000000";

/**
 * High-Speed Header Micro Sponsor/Ad Banner (Zero CLS)
 */
function HeaderMicroBanner() {
  const [adFailed, setAdFailed] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch {
      setAdFailed(true);
    }
  }, []);

  if (adFailed) return null;

  return (
    <div className="hidden lg:flex items-center justify-center overflow-hidden max-h-[36px] px-2 py-0.5 bg-slate-900/40 border border-slate-800 rounded-lg text-xs">
      <ins
        className="adsbygoogle"
        style={{ display: "inline-block", width: "250px", height: "28px" }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot="1234567890"
      />
    </div>
  );
}

export function Navbar() {
  const { lang: rawLang = "ar" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Strict Language Sanitization
  const validLangs: Lang[] = useMemo(() => ["ar", "fr", "en", "es"], []);
  const lang: Lang = useMemo(() => {
    return validLangs.includes(rawLang as Lang) ? (rawLang as Lang) : "ar";
  }, [rawLang, validLangs]);

  const dir = lang === "ar" ? "rtl" : "ltr";

  // Role Hook Integration
  const { role, loading, isStaff, canManageUsers, isRoot } = useRole();

  // Navigation Dropdowns & Drawers States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileLibraryOpen, setMobileLibraryOpen] = useState(false);
  const [mobileSchoolsOpen, setMobileSchoolsOpen] = useState(false);

  // Desktop Dropdowns
  const [desktopLibraryOpen, setDesktopLibraryOpen] = useState(false);
  const [desktopUserMenuOpen, setDesktopUserMenuOpen] = useState(false);

  const libraryRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Auth state & User Session
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; avatar?: string } | null>(null);

  // Auto-close drawers on route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setMobileLibraryOpen(false);
    setMobileSchoolsOpen(false);
    setDesktopLibraryOpen(false);
    setDesktopUserMenuOpen(false);
  }, [location.pathname]);

  // Secure User Session Hydration from LocalStorage
  const loadUser = () => {
    try {
      const stored = localStorage.getItem("mizan_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object" && parsed.name) {
          setUser(parsed);
          return;
        }
      }
      setUser(null);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    loadUser();
    window.addEventListener("storage", loadUser);
    return () => window.removeEventListener("storage", loadUser);
  }, []);

  // Handle Clicking Outside Dropdowns for Desktop
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (libraryRef.current && !libraryRef.current.contains(event.target as Node)) {
        setDesktopLibraryOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setDesktopUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    try {
      localStorage.removeItem("mizan_user");
      localStorage.removeItem("mizan_token");
    } catch {
      // Ignore storage cleanup issues
    }
    setUser(null);
    setDesktopUserMenuOpen(false);
    setIsMobileMenuOpen(false);
    navigate(`/${lang}`);
  };

  // Translations Map
  const labels = {
    disclaimer: {
      ar: "⚠️ تنبيه أكاديمي: محتوى المنصة تثقيفي وتوثيقي موحد للباحثين والجامعات.",
      fr: "⚠️ Note: Contenu académique et éducatif destiné aux chercheurs et universités.",
      en: "⚠️ Academic Notice: Content is strictly educational and institutional.",
      es: "⚠️ Aviso Académico: El contenido es estrictamente educativo e institucional.",
    },
    brandSub: {
      ar: "الأرشيف والمكتبة الرقمية",
      fr: "Bibliothèque Juridique",
      en: "Digital Legal Repository",
      es: "Repositorio Legal Digital",
    },
    home: { ar: "الرئيسية", fr: "Accueil", en: "Home", es: "Inicio" },
    library: { ar: "المكتبة الرقمية", fr: "Bibliothèque", en: "Digital Library", es: "Biblioteca" },
    archive: { ar: "الأرشيف القانوني", fr: "Archives", en: "Archive", es: "Archivo" },
    schools: { ar: "كليات الحقوق", fr: "Facultés de Droit", en: "Law Schools", es: "Facultades" },
    admin: { ar: "لوحة التحكم", fr: "Administration", en: "Admin Panel", es: "Administración" },
    staff: { ar: "لوحة الإدارة", fr: "Panneau Staff", en: "Staff Panel", es: "Panel de Gestión" },
    login: { ar: "تسجيل الدخول", fr: "Connexion", en: "Sign In", es: "Iniciar Sesión" },
    logout: { ar: "تسجيل الخروج", fr: "Déconnexion", en: "Log Out", es: "Cerrar Sesión" },
    profile: { ar: "الملف الشخصي", fr: "Mon Profil", en: "My Profile", es: "Mi Perfil" },
    settings: { ar: "الإعدادات", fr: "Paramètres", en: "Settings", es: "Configuración" },
    roleLabel: { ar: "الصلاحية", fr: "Rôle", en: "Role", es: "Rol" },
  };

  const getUserInitials = (name: string) => {
    if (!name) return "M";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="w-full font-sans border-b border-border bg-card/95 backdrop-blur-md sticky top-0 z-50 transition-colors" dir={dir}>
      {/* Top Academic Disclaimer & Sponsor Ticker */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 py-1 text-center text-[11px] sm:text-xs text-amber-950 dark:text-amber-200 font-medium flex items-center justify-between max-w-7xl mx-auto">
        <span className="truncate">{labels.disclaimer[lang]}</span>
        <HeaderMicroBanner />
      </div>

      {/* Main Navbar */}
      <div className="px-3 sm:px-6 py-2 max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Brand Logo */}
        <Link to={`/${lang}`} className="flex items-center gap-2.5 active:scale-98 transition-transform">
          <div className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center font-black text-xl shadow-md shrink-0">
            <Scale size={22} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-base sm:text-lg font-black text-foreground leading-none tracking-tight">
              Mizan<span className="text-primary">.Digital</span>
            </h1>
            <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">
              {labels.brandSub[lang]}
            </span>
          </div>
        </Link>

        {/* DESKTOP MENU LINKS */}
        <nav className="hidden md:flex items-center gap-1 text-xs sm:text-sm font-semibold">
          <Link
            to={`/${lang}`}
            className="px-3 py-2 rounded-lg hover:bg-muted text-foreground hover:text-primary transition-all"
          >
            {labels.home[lang]}
          </Link>

          {/* Desktop Library Dropdown */}
          <div
            ref={libraryRef}
            className="relative"
            onMouseEnter={() => setDesktopLibraryOpen(true)}
            onMouseLeave={() => setDesktopLibraryOpen(false)}
          >
            <button
              onClick={() => setDesktopLibraryOpen((prev) => !prev)}
              aria-expanded={desktopLibraryOpen}
              aria-haspopup="true"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-muted text-foreground hover:text-primary transition-all cursor-pointer"
            >
              <BookOpen size={16} className="text-primary" />
              <span>{labels.library[lang]}</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${desktopLibraryOpen ? "rotate-180" : ""}`}
              />
            </button>

            {desktopLibraryOpen && (
              <div className="absolute top-full rtl:right-0 ltr:left-0 w-[680px] bg-card border border-border rounded-2xl shadow-2xl p-5 grid grid-cols-3 gap-5 z-50 animate-in fade-in-50 zoom-in-95">
                {/* Column 1: Fields of Law */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase mb-3 pb-1.5 border-b border-border">
                    <Scale size={14} />
                    <span>{lang === "ar" ? "التخصصات القانونية" : "Fields of Law"}</span>
                  </div>
                  <div className="space-y-1">
                    {LEGAL_FIELDS.map((cat) => (
                      <Link
                        key={cat.slug}
                        to={`/${lang}/library?category=${cat.slug}`}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted text-xs font-medium transition-colors"
                      >
                        <FileText size={14} className="text-muted-foreground shrink-0" />
                        <span>{cat.title[lang as keyof typeof cat.title] || cat.title.ar}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Column 2: Document Types */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase mb-3 pb-1.5 border-b border-border">
                    <FolderTree size={14} />
                    <span>{lang === "ar" ? "أنواع الوثائق" : "Document Types"}</span>
                  </div>
                  <div className="space-y-1">
                    {DOCUMENT_TYPES.map((doc) => (
                      <Link
                        key={doc.slug}
                        to={`/${lang}/library?type=${doc.slug}`}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted text-xs font-medium transition-colors"
                      >
                        <FileText size={14} className="text-muted-foreground shrink-0" />
                        <span>{doc.title[lang as keyof typeof doc.title] || doc.title.ar}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Column 3: Law Schools */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase mb-3 pb-1.5 border-b border-border">
                    <GraduationCap size={14} />
                    <span>{lang === "ar" ? "كليات الحقوق" : "Law Schools"}</span>
                  </div>
                  <div className="space-y-1">
                    {LAW_SCHOOLS.slice(0, 5).map((school) => (
                      <Link
                        key={school.slug}
                        to={`/${lang}/schools/${school.slug}`}
                        className="block p-2 rounded-lg hover:bg-muted text-xs font-medium truncate transition-colors"
                      >
                        {(school.name as Record<string, string>)[lang] || school.name.ar}
                      </Link>
                    ))}
                  </div>
                  <div className="mt-3 pt-2 border-t border-border">
                    <Link to={`/${lang}/schools`} className="text-xs text-primary font-bold hover:underline block">
                      {lang === "ar" ? "عرض جميع الكليات ←" : "View all faculties →"}
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Link
            to={`/${lang}/archive`}
            className="px-3 py-2 rounded-lg hover:bg-muted text-foreground hover:text-primary transition-all flex items-center gap-1.5"
          >
            <Archive size={16} />
            <span>{labels.archive[lang]}</span>
          </Link>

          <Link
            to={`/${lang}/schools`}
            className="px-3 py-2 rounded-lg hover:bg-muted text-foreground hover:text-primary transition-all flex items-center gap-1.5"
          >
            <GraduationCap size={16} />
            <span>{labels.schools[lang]}</span>
          </Link>

          {/* Admin / Staff Panel Quick Access */}
          {isStaff && (
            <Link
              to={`/${lang}/admin`}
              className="px-3 py-2 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold hover:bg-purple-500/20 transition-all flex items-center gap-1.5"
            >
              <Wrench size={15} />
              <span>{canManageUsers || isRoot ? labels.admin[lang] : labels.staff[lang]}</span>
            </Link>
          )}
        </nav>

        {/* ================= DESKTOP USER CONTROLS ================= */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            /* USER LOGGED IN -> Show Profile Dropdown Avatar Button */
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setDesktopUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl bg-muted/80 hover:bg-muted border border-border transition active:scale-95 cursor-pointer shadow-xs"
              >
                <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground font-black text-xs flex items-center justify-center shadow-sm">
                  {getUserInitials(user.name)}
                </div>
                <div className="flex flex-col text-start rtl:text-right">
                  <span className="text-xs font-bold leading-tight max-w-[110px] truncate">{user.name}</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                    <CheckCircle2 size={10} />
                    <span>{role.replace("_", " ")}</span>
                  </span>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-muted-foreground transition-transform duration-200 ${
                    desktopUserMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Desktop Profile Dropdown Box */}
              {desktopUserMenuOpen && (
                <div className="absolute top-full rtl:left-0 ltr:right-0 mt-2 w-64 bg-card border border-border rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in-50 zoom-in-95 space-y-1">
                  <div className="p-3 bg-muted/50 rounded-xl space-y-1 border border-border/50">
                    <p className="text-xs font-bold text-foreground truncate">{user.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                    <div className="pt-1 flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      <Shield size={12} />
                      <span>{labels.roleLabel[lang]}: {role.toUpperCase()}</span>
                    </div>
                  </div>

                  <Link
                    to={`/${lang}/profile`}
                    onClick={() => setDesktopUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-muted text-xs font-semibold text-foreground transition-colors"
                  >
                    <User size={16} className="text-primary" />
                    <span>{labels.profile[lang]}</span>
                  </Link>

                  {isStaff && (
                    <Link
                      to={`/${lang}/admin`}
                      onClick={() => setDesktopUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-purple-500/10 text-xs font-semibold text-purple-700 dark:text-purple-300 transition-colors"
                    >
                      <LayoutDashboard size={16} />
                      <span>{canManageUsers || isRoot ? labels.admin[lang] : labels.staff[lang]}</span>
                    </Link>
                  )}

                  <div className="pt-1 border-t border-border">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    >
                      <LogOut size={16} />
                      <span>{labels.logout[lang]}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* USER NOT LOGGED IN -> Show Log In Button */
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-1.5 min-h-[40px]"
            >
              <LogIn size={15} />
              <span>{labels.login[lang]}</span>
            </button>
          )}
        </div>

        {/* ================= MOBILE CONTROLS & PROFILE ICON ================= */}
        <div className="flex items-center gap-2 md:hidden">
          {user ? (
            /* Mobile Logged In Profile Button */
            <Link
              to={`/${lang}/profile`}
              className="min-h-[44px] min-w-[44px] px-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <div className="w-6 h-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-[10px]">
                {getUserInitials(user.name)}
              </div>
              <span className="max-w-[70px] truncate text-[11px]">{user.name.split(" ")[0]}</span>
            </Link>
          ) : (
            /* Mobile Log In Button */
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-3.5 py-2 text-xs font-bold bg-amber-600 text-white rounded-xl min-h-[44px] flex items-center gap-1 active:scale-95 transition"
            >
              <LogIn size={15} />
              <span>{labels.login[lang]}</span>
            </button>
          )}

          {/* Drawer Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-muted text-foreground border border-border active:scale-95 transition cursor-pointer"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* ================= MOBILE DRAWER MENU ================= */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-card border-t border-border px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200 max-h-[85vh] overflow-y-auto">
          
          {/* Mobile Profile Card Header */}
          {user && (
            <div className="p-3 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-black text-sm flex items-center justify-center shadow-md">
                    {getUserInitials(user.name)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white leading-tight">{user.name}</span>
                    <span className="text-[10px] text-slate-400">{user.email}</span>
                  </div>
                </div>
                <Link
                  to={`/${lang}/profile`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                >
                  <User size={16} />
                </Link>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <ShieldCheck size={14} />
                  <span>{role.toUpperCase()}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 py-1 px-2 rounded-lg bg-rose-500/10"
                >
                  <LogOut size={14} />
                  <span>{labels.logout[lang]}</span>
                </button>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <div className="space-y-1 pt-1">
            <Link
              to={`/${lang}`}
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 min-h-[48px] px-3 rounded-xl font-semibold text-sm hover:bg-muted active:bg-muted"
            >
              <Home size={18} className="text-primary" />
              <span>{labels.home[lang]}</span>
            </Link>

            {/* Mobile Library Accordion */}
            <div className="border border-border rounded-2xl overflow-hidden">
              <button
                onClick={() => setMobileLibraryOpen(!mobileLibraryOpen)}
                className="w-full flex items-center justify-between min-h-[48px] px-3 font-semibold text-sm bg-card hover:bg-muted active:bg-muted cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <BookOpen size={18} className="text-primary" />
                  <span>{labels.library[lang]}</span>
                </span>
                <ChevronDown size={16} className={`transition-transform ${mobileLibraryOpen ? "rotate-180" : ""}`} />
              </button>

              {mobileLibraryOpen && (
                <div className="bg-muted/50 p-2 space-y-3 border-t border-border">
                  <div>
                    <span className="text-[11px] font-bold text-primary uppercase px-2 mb-1 block">
                      {lang === "ar" ? "التخصصات القانونية" : "Fields of Law"}
                    </span>
                    {LEGAL_FIELDS.map((cat) => (
                      <Link
                        key={cat.slug}
                        to={`/${lang}/library?category=${cat.slug}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-2 min-h-[40px] px-3 rounded-lg text-xs font-medium hover:bg-card active:bg-card"
                      >
                        <FileText size={14} className="text-muted-foreground shrink-0" />
                        <span>{cat.title[lang as keyof typeof cat.title] || cat.title.ar}</span>
                      </Link>
                    ))}
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-primary uppercase px-2 mb-1 block">
                      {lang === "ar" ? "أنواع الوثائق" : "Document Types"}
                    </span>
                    {DOCUMENT_TYPES.map((doc) => (
                      <Link
                        key={doc.slug}
                        to={`/${lang}/library?type=${doc.slug}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-2 min-h-[40px] px-3 rounded-lg text-xs font-medium hover:bg-card active:bg-card"
                      >
                        <FileText size={14} className="text-muted-foreground shrink-0" />
                        <span>{doc.title[lang as keyof typeof doc.title] || doc.title.ar}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Schools Accordion */}
            <div className="border border-border rounded-2xl overflow-hidden">
              <button
                onClick={() => setMobileSchoolsOpen(!mobileSchoolsOpen)}
                className="w-full flex items-center justify-between min-h-[48px] px-3 font-semibold text-sm bg-card hover:bg-muted active:bg-muted cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <GraduationCap size={18} className="text-primary" />
                  <span>{labels.schools[lang]}</span>
                </span>
                <ChevronDown size={16} className={`transition-transform ${mobileSchoolsOpen ? "rotate-180" : ""}`} />
              </button>

              {mobileSchoolsOpen && (
                <div className="bg-muted/50 p-2 space-y-1 border-t border-border">
                  {LAW_SCHOOLS.slice(0, 5).map((school) => (
                    <Link
                      key={school.slug}
                      to={`/${lang}/schools/${school.slug}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center min-h-[44px] px-3 rounded-lg text-xs font-medium hover:bg-card active:bg-card truncate"
                    >
                      {(school.name as Record<string, string>)[lang] || school.name.ar}
                    </Link>
                  ))}
                  <Link
                    to={`/${lang}/schools`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center min-h-[44px] px-3 text-xs font-bold text-primary hover:underline"
                  >
                    {lang === "ar" ? "عرض جميع الكليات ←" : "View all faculties →"}
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Admin Link */}
            {isStaff && (
              <Link
                to={`/${lang}/admin`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 min-h-[48px] px-3 rounded-2xl font-bold text-sm text-purple-700 dark:text-purple-300 bg-purple-500/10 border border-purple-500/20"
              >
                <Wrench size={18} />
                <span>{canManageUsers || isRoot ? labels.admin[lang] : labels.staff[lang]}</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Auth Modal Trigger */}
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