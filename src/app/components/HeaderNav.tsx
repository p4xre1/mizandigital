import React, { useState } from "react";
import {
  Globe,
  Moon,
  Sun,
  User,
  ShieldCheck,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { AuthModal } from "./AuthModal";

type Locale = "ar" | "fr" | "en" | "es";

interface HeaderNavProps {
  currentLang: Locale;
  onLanguageChange: (lang: Locale) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  isAuthenticated: boolean;
  userName?: string;
}

interface NavItem {
  label: string;
  href: string;
  dropdown?: { label: string; href: string }[];
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentLang,
  onLanguageChange,
  isDarkMode,
  onToggleTheme,
  isAuthenticated,
  userName,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const dir = currentLang === "ar" ? "rtl" : "ltr";

  // Dynamic route helper
  const getPath = (href: string) => `/${currentLang}${href}`;

  // Multi-lingual navigation configuration
  const navStructure: Record<Locale, NavItem[]> = {
    ar: [
      {
        label: "الأرشيف الجامعي",
        href: "/archive",
        dropdown: [
          { label: "الفصل الأول (S1)", href: "/archive/s1" },
          { label: "الفصل الثاني (S2)", href: "/archive/s2" },
          { label: "الفصل الثالث (S3)", href: "/archive/s3" },
          { label: "الفصل الرابع (S4)", href: "/archive/s4" },
          { label: "الفصل الخامس (S5)", href: "/archive/s5" },
          { label: "الفصل السادس (S6)", href: "/archive/s6" },
        ],
      },
      { label: "المكتبة القانونية", href: "/library" },
      { label: "الاجتهاد القضائي", href: "/jurisprudence" },
      {
        label: "كليات الحقوق",
        href: "/schools",
        dropdown: [
          { label: "دليل الكليات بالمغرب", href: "/schools" },
          { label: "جامعة محمد الخامس - الرباط", href: "/schools/rabat" },
          { label: "جامعة الحسن الثاني - البيضاء", href: "/schools/casablanca" },
          { label: "جامعة القاضي عياض - مراكش", href: "/schools/marrakech" },
        ],
      },
      { label: "الندوات العلمية", href: "/symposiums" },
    ],
    fr: [
      {
        label: "Archives Universitaires",
        href: "/archive",
        dropdown: [
          { label: "Semestre 1 (S1)", href: "/archive/s1" },
          { label: "Semestre 2 (S2)", href: "/archive/s2" },
          { label: "Semestre 3 (S3)", href: "/archive/s3" },
          { label: "Semestre 4 (S4)", href: "/archive/s4" },
          { label: "Semestre 5 (S5)", href: "/archive/s5" },
          { label: "Semestre 6 (S6)", href: "/archive/s6" },
        ],
      },
      { label: "Bibliothèque", href: "/library" },
      { label: "Jurisprudence", href: "/jurisprudence" },
      { label: "Facultés de Droit", href: "/schools" },
      { label: "Colloques", href: "/symposiums" },
    ],
    en: [
      {
        label: "Academic Archive",
        href: "/archive",
        dropdown: [
          { label: "Semester 1 (S1)", href: "/archive/s1" },
          { label: "Semester 2 (S2)", href: "/archive/s2" },
          { label: "Semester 3 (S3)", href: "/archive/s3" },
          { label: "Semester 4 (S4)", href: "/archive/s4" },
          { label: "Semester 5 (S5)", href: "/archive/s5" },
          { label: "Semester 6 (S6)", href: "/archive/s6" },
        ],
      },
      { label: "Legal Library", href: "/library" },
      { label: "Case Law", href: "/jurisprudence" },
      { label: "Law Schools", href: "/schools" },
      { label: "Symposiums", href: "/symposiums" },
    ],
    es: [
      {
        label: "Archivo Académico",
        href: "/archive",
        dropdown: [
          { label: "Semestre 1 (S1)", href: "/archive/s1" },
          { label: "Semestre 2 (S2)", href: "/archive/s2" },
          { label: "Semestre 3 (S3)", href: "/archive/s3" },
          { label: "Semestre 4 (S4)", href: "/archive/s4" },
          { label: "Semestre 5 (S5)", href: "/archive/s5" },
          { label: "Semestre 6 (S6)", href: "/archive/s6" },
        ],
      },
      { label: "Biblioteca Jurídica", href: "/library" },
      { label: "Jurisprudencia", href: "/jurisprudence" },
      { label: "Facultades", href: "/schools" },
      { label: "Simposios", href: "/symposiums" },
    ],
  };

  const currentNavItems = navStructure[currentLang] || navStructure.ar;

  return (
    <>
      <header
        className="w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-40 shadow-xs"
        dir={dir}
      >
        {/* Top Institutional Utility Bar */}
        <div className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 text-xs py-1.5 px-4 md:px-8 flex justify-between items-center">
          <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 text-xs">
            <ShieldCheck size={16} className="text-amber-700 dark:text-amber-400" />
            <span style={{ fontFamily: currentLang === "ar" ? "var(--font-serif-ar)" : "inherit" }}>
              {currentLang === "ar" ? "الحق · العدل · الميزان" : "Veritas · Justitia · Libra"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-0.5 shadow-xs">
              <Globe size={14} className="mx-1 text-slate-600 dark:text-slate-400" aria-hidden="true" />
              {(["ar", "fr", "en", "es"] as Locale[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => onLanguageChange(lang)}
                  className={`px-2 py-0.5 rounded text-xs uppercase font-bold transition-all cursor-pointer ${
                    currentLang === lang
                      ? "bg-blue-900 text-white dark:bg-blue-600 shadow-xs"
                      : "text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
                  }`}
                  aria-label={`Switch to ${lang}`}
                >
                  {lang === "ar" ? "العربية" : lang === "fr" ? "FR" : lang === "en" ? "EN" : "ES"}
                </button>
              ))}
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 transition shadow-xs cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} />}
            </button>
          </div>
        </div>

        {/* Main Navigation Header */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <a href={getPath("/")} className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-blue-900 dark:bg-blue-700 text-white flex items-center justify-center font-black text-xl shadow-md group-hover:scale-105 transition-transform">
              ⚖️
            </div>
            <div className="flex flex-col">
              <span
                className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-tight"
                style={{ fontFamily: currentLang === "ar" ? "var(--font-serif-ar)" : "var(--font-serif-en)" }}
              >
                {currentLang === "ar" ? "منصة ميزان" : "MIZAN PLATFORM"}
              </span>
              <span className="text-xs tracking-wider text-slate-600 dark:text-slate-400 uppercase font-semibold">
                Digital Legal Archive
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links & User Profile */}
          <div className="hidden lg:flex items-center gap-6">
            <nav aria-label="Main Navigation" className="flex items-center gap-6 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {currentNavItems.map((item, idx) => (
                <div key={idx} className="relative group py-2">
                  <a
                    href={getPath(item.href)}
                    className="flex items-center gap-1 hover:text-blue-900 dark:hover:text-blue-400 transition-colors py-1"
                  >
                    <span>{item.label}</span>
                    {item.dropdown && (
                      <ChevronDown
                        size={14}
                        className="opacity-80 group-hover:rotate-180 transition-transform"
                      />
                    )}
                  </a>

                  {item.dropdown && (
                    <div
                      className={`absolute top-full ${
                        dir === "rtl" ? "right-0" : "left-0"
                      } hidden group-hover:block w-60 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-1`}
                    >
                      <div className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 px-3 py-1 border-b border-slate-200 dark:border-slate-800 mb-1">
                        {item.label}
                      </div>
                      {item.dropdown.map((subItem, subIdx) => (
                        <a
                          key={subIdx}
                          href={getPath(subItem.href)}
                          className="block px-3 py-2 rounded-lg text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-900 dark:hover:text-blue-400 font-medium transition-colors"
                        >
                          {subItem.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* User Sign-In Button */}
            {isAuthenticated ? (
              <a
                href={getPath("/profile")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-900 dark:bg-blue-700 text-white text-xs font-bold hover:opacity-95 transition shadow-xs min-h-[44px]"
              >
                <User size={16} />
                <span>{userName || (currentLang === "ar" ? "حسابي" : "My Profile")}</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-900 dark:bg-blue-700 text-white text-xs font-bold hover:opacity-95 transition shadow-xs cursor-pointer min-h-[44px]"
              >
                <User size={16} />
                <span>{currentLang === "ar" ? "تسجيل الدخول" : "Sign In"}</span>
              </button>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer min-h-[48px] min-w-[48px] flex items-center justify-center"
            aria-label={mobileMenuOpen ? "Close Menu" : "Open Menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-header-nav"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            id="mobile-header-nav"
            className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 space-y-4 shadow-xl"
          >
            <nav className="space-y-3">
              {currentNavItems.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <a
                    href={getPath(item.href)}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block font-bold text-sm text-slate-900 dark:text-white hover:text-blue-900 py-1"
                  >
                    {item.label}
                  </a>
                  {item.dropdown && (
                    <div className={`space-y-1 ${dir === "rtl" ? "pr-4" : "pl-4"}`}>
                      {item.dropdown.map((sub, sIdx) => (
                        <a
                          key={sIdx}
                          href={getPath(sub.href)}
                          onClick={() => setMobileMenuOpen(false)}
                          className="block text-xs text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white py-1.5"
                        >
                          • {sub.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {isAuthenticated ? (
              <a
                href={getPath("/profile")}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-900 dark:bg-blue-700 text-white text-xs font-bold min-h-[48px]"
              >
                <User size={16} />
                <span>{userName || (currentLang === "ar" ? "حسابي" : "My Profile")}</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsAuthModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-900 dark:bg-blue-700 text-white text-xs font-bold cursor-pointer min-h-[48px]"
              >
                <User size={16} />
                <span>{currentLang === "ar" ? "تسجيل الدخول" : "Sign In"}</span>
              </button>
            )}
          </div>
        )}
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        lang={currentLang}
        dir={dir}
      />
    </>
  );
};