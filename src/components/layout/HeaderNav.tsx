import React, { useState, useEffect, useRef } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { useRole } from "../../hooks/useRole";
import { AuthModal } from "@/components/auth/AuthModal";
import { LAW_SCHOOLS } from "@/data/lawSchools";
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
} from "lucide-react";

interface NavItem {
  slug: string;
  path: string;
  ar: string;
  fr: string;
  en: string;
  es: string;
}

// ⚖️ Fields of Law Items
const FIELDS_OF_LAW: NavItem[] = [
  { slug: "family-law", path: "fields/family-law", ar: "قانون الأسرة / المدونة", fr: "Droit de la famille", en: "Family Law", es: "Derecho de familia" },
  { slug: "criminal-law", path: "fields/criminal-law", ar: "القانون الجنائي", fr: "Droit pénal", en: "Criminal Law", es: "Derecho penal" },
  { slug: "commercial-law", path: "fields/commercial-law", ar: "القانون التجاري", fr: "Droit commercial", en: "Commercial Law", es: "Derecho comercial" },
  { slug: "administrative-law", path: "fields/administrative-law", ar: "القانون الإداري", fr: "Droit administratif", en: "Administrative Law", es: "Derecho administrativo" },
  { slug: "constitutional-law", path: "fields/constitutional-law", ar: "القانون الدستوري", fr: "Droit constitutionnel", en: "Constitutional Law", es: "Derecho constitucional" },
];

// 📄 Document Types Items
const DOCUMENT_TYPES: NavItem[] = [
  { slug: "legal-texts", path: "documents/legal-texts", ar: "النصوص القانونية", fr: "Textes juridiques", en: "Legal Texts", es: "Textos legales" },
  { slug: "ministerial-decrees", path: "documents/ministerial-decrees", ar: "المراسيم والقرارات", fr: "Décrets ministériels", en: "Ministerial Decrees", es: "Decretos ministeriales" },
  { slug: "cassation-rulings", path: "documents/cassation-rulings", ar: "قرارات محكمة النقض", fr: "Arrêts de Cassation", en: "Cassation Rulings", es: "Decisiones de Casación" },
  { slug: "official-journals", path: "documents/official-journals", ar: "الجريدة الرسمية", fr: "Journaux officiels", en: "Official Journals", es: "Boletines oficiales" },
];

export function Navbar() {
  const { lang: rawLang = "ar" } = useParams();
  const lang = (["ar", "fr", "en", "es"].includes(rawLang) ? rawLang : "ar") as Lang;
  const location = useLocation();

  const { role, isDeveloper, loading } = useRole();

  // Mobile drawer states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileLibraryOpen, setMobileLibraryOpen] = useState(false);
  const [mobileSchoolsOpen, setMobileSchoolsOpen] = useState(false);

  // Desktop hover/click state & ref for click-outside
  const [desktopLibraryOpen, setDesktopLibraryOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auth modal & user state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  // Automatically close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setMobileLibraryOpen(false);
    setMobileSchoolsOpen(false);
    setDesktopLibraryOpen(false);
  }, [location.pathname]);

  // Load user from localStorage & keep synced
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

  // Handle clicking outside the desktop dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDesktopLibraryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    try {
      localStorage.removeItem("mizan_user");
    } catch {
      // Ignore errors
    }
    setUser(null);
  };

  return (
    <header className="w-full font-sans border-b border-border bg-card sticky top-0 z-50">
      {/* Disclaimer Bar */}
      <div className="bg-amber-100 border-b border-amber-300 px-3 py-1.5 text-center text-xs text-amber-950 font-semibold leading-snug">
        <span>⚠️ <strong>تنويه:</strong> محتوى المنصة تعليمي وتثقيفي بالكامل.</span>
      </div>

      {/* Main Navbar */}
      <div className="px-4 py-2.5 max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <Link to={`/${lang}`} className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-black text-lg shadow-sm shrink-0">
            M
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-bold text-foreground leading-none">Mizan Digital</h1>
            <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">Modern Legal Library</span>
          </div>
        </Link>

        {/* DESKTOP MENU */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-semibold">
          <Link to={`/${lang}`} className="px-3 py-2 hover:text-primary transition-colors">
            {lang === "ar" ? "الرئيسية" : "Home"}
          </Link>

          {/* Desktop Library Dropdown */}
          <div
            ref={dropdownRef}
            className="relative"
            onMouseEnter={() => setDesktopLibraryOpen(true)}
            onMouseLeave={() => setDesktopLibraryOpen(false)}
          >
            <button
              onClick={() => setDesktopLibraryOpen((prev) => !prev)}
              aria-expanded={desktopLibraryOpen}
              aria-haspopup="true"
              className="flex items-center gap-1.5 px-3 py-2 hover:text-primary transition-colors cursor-pointer"
            >
              <BookOpen size={16} />
              <span>{lang === "ar" ? "المكتبة الرقمية" : "Digital Library"}</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${desktopLibraryOpen ? "rotate-180" : ""}`} />
            </button>

            {desktopLibraryOpen && (
              <div className="absolute top-full rtl:right-0 ltr:left-0 w-[680px] bg-card border border-border rounded-xl shadow-xl p-5 grid grid-cols-3 gap-5 z-50 animate-in fade-in-50 zoom-in-95">
                {/* Column 1: Fields of Law */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase mb-3 pb-1 border-b border-border">
                    <Scale size={14} />
                    <span>{lang === "ar" ? "التخصصات القانونية" : "Fields of Law"}</span>
                  </div>
                  <div className="space-y-1">
                    {FIELDS_OF_LAW.map((cat) => (
                      <Link
                        key={cat.slug}
                        to={`/${lang}/${cat.path}`}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted text-xs font-medium transition-colors"
                      >
                        <FileText size={14} className="text-muted-foreground shrink-0" />
                        <span>{cat[lang]}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Column 2: Document Types */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase mb-3 pb-1 border-b border-border">
                    <FolderTree size={14} />
                    <span>{lang === "ar" ? "أنواع الوثائق" : "Document Types"}</span>
                  </div>
                  <div className="space-y-1">
                    {DOCUMENT_TYPES.map((doc) => (
                      <Link
                        key={doc.slug}
                        to={`/${lang}/${doc.path}`}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted text-xs font-medium transition-colors"
                      >
                        <FileText size={14} className="text-muted-foreground shrink-0" />
                        <span>{doc[lang]}</span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Column 3: Law Schools */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase mb-3 pb-1 border-b border-border">
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

          <Link to={`/${lang}/schools`} className="px-3 py-2 hover:text-primary transition-colors flex items-center gap-1.5">
            <GraduationCap size={16} />
            <span>{lang === "ar" ? "كليات الحقوق" : "Law Schools"}</span>
          </Link>

          {isDeveloper && (
            <Link to={`/${lang}/admin`} className="px-3 py-2 text-purple-700 font-bold hover:opacity-80 transition-colors">
              🛠️ باني المطور
            </Link>
          )}
        </nav>

        {/* Desktop User Controls */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-muted px-3 py-1.5 rounded-lg border border-border flex items-center gap-1.5">
                <User size={14} className="text-amber-600" />
                {user.name}
              </span>
              <button onClick={handleLogout} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button onClick={() => setIsAuthOpen(true)} className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1.5">
              <LogIn size={14} />
              <span>{lang === "ar" ? "تسجيل الدخول" : "Sign In"}</span>
            </button>
          )}
        </div>

        {/* MOBILE CONTROLS */}
        <div className="flex items-center gap-2 md:hidden">
          {!user && (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-3 py-2 text-xs font-bold bg-amber-600 text-white rounded-lg min-h-[40px] flex items-center gap-1"
            >
              <LogIn size={14} />
              <span>{lang === "ar" ? "دخول" : "Sign In"}</span>
            </button>
          )}

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-muted text-foreground border border-border transition cursor-pointer"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER MENU */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-card border-t border-border px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200 max-h-[85vh] overflow-y-auto">
          {user && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-xl border border-border">
              <div className="flex items-center gap-2 text-xs font-bold">
                <User size={16} className="text-amber-600" />
                <span>{user.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs font-bold text-destructive hover:bg-destructive/10 px-2 py-1 rounded-md flex items-center gap-1"
              >
                <LogOut size={14} />
                <span>{lang === "ar" ? "خروج" : "Logout"}</span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-between px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-medium">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Shield size={14} className="text-emerald-400" />
              <span>{lang === "ar" ? "الصلاحية" : "Role"}:</span>
            </span>
            <span className="font-bold text-emerald-400">{loading ? "..." : role}</span>
          </div>

          <div className="space-y-1 pt-1">
            <Link
              to={`/${lang}`}
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 min-h-[48px] px-3 rounded-xl font-semibold text-sm hover:bg-muted active:bg-muted"
            >
              <Home size={18} className="text-primary" />
              <span>{lang === "ar" ? "الرئيسية" : "Home"}</span>
            </Link>

            {/* Mobile Library Accordion */}
            <div className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setMobileLibraryOpen(!mobileLibraryOpen)}
                className="w-full flex items-center justify-between min-h-[48px] px-3 font-semibold text-sm bg-card hover:bg-muted active:bg-muted cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <BookOpen size={18} className="text-primary" />
                  <span>{lang === "ar" ? "المكتبة الرقمية" : "Digital Library"}</span>
                </span>
                <ChevronDown size={16} className={`transition-transform ${mobileLibraryOpen ? "rotate-180" : ""}`} />
              </button>

              {mobileLibraryOpen && (
                <div className="bg-muted/50 p-2 space-y-3 border-t border-border">
                  {/* Fields Section */}
                  <div>
                    <span className="text-[11px] font-bold text-primary uppercase px-2 mb-1 block">
                      {lang === "ar" ? "التخصصات القانونية" : "Fields of Law"}
                    </span>
                    {FIELDS_OF_LAW.map((cat) => (
                      <Link
                        key={cat.slug}
                        to={`/${lang}/${cat.path}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-2 min-h-[40px] px-3 rounded-lg text-xs font-medium hover:bg-card active:bg-card"
                      >
                        <FileText size={14} className="text-muted-foreground shrink-0" />
                        <span>{cat[lang]}</span>
                      </Link>
                    ))}
                  </div>

                  {/* Document Types Section */}
                  <div>
                    <span className="text-[11px] font-bold text-primary uppercase px-2 mb-1 block">
                      {lang === "ar" ? "أنواع الوثائق" : "Document Types"}
                    </span>
                    {DOCUMENT_TYPES.map((doc) => (
                      <Link
                        key={doc.slug}
                        to={`/${lang}/${doc.path}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-2 min-h-[40px] px-3 rounded-lg text-xs font-medium hover:bg-card active:bg-card"
                      >
                        <FileText size={14} className="text-muted-foreground shrink-0" />
                        <span>{doc[lang]}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Schools Accordion */}
            <div className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setMobileSchoolsOpen(!mobileSchoolsOpen)}
                className="w-full flex items-center justify-between min-h-[48px] px-3 font-semibold text-sm bg-card hover:bg-muted active:bg-muted cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <GraduationCap size={18} className="text-primary" />
                  <span>{lang === "ar" ? "كليات الحقوق" : "Law Faculties"}</span>
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

            {isDeveloper && (
              <Link
                to={`/${lang}/admin`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 min-h-[48px] px-3 rounded-xl font-bold text-sm text-purple-700 bg-purple-50 dark:bg-purple-950/30"
              >
                <span>🛠️ باني المطور</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        lang={lang}
        dir={lang === "ar" ? "rtl" : "ltr"}
        onSuccess={loadUser}
      />
    </header>
  );
}