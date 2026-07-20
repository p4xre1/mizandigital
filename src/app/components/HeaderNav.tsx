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
        className="w-full border-b border-border bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-40 shadow-xs"
        dir={dir}
      >
        {/* ── Top Institutional Utility Bar ───────────────────────────────── */}
        <div className="border-b border-border/60 bg-slate-50 dark:bg-slate-800/50 text-xs py-1.5 px-4 md:px-8 flex justify-between items-center">
          <div className="font-bold text-muted-foreground flex items-center gap-2 text-[11px]">
            <ShieldCheck size={14} className="text-amber-600 dark:text-amber-500" />
            <span style={{ fontFamily: currentLang === "ar" ? "var(--font-serif-ar)" : "inherit" }}>
              {currentLang === "ar" ? "الحق · العدل · الميزان" : "Veritas · Justitia · Libra"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-0.5 shadow-xs">
              <Globe size={12} className="mx-1 text-muted-foreground" />
              {(["ar", "fr", "en", "es"] as Locale[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => onLanguageChange(lang)}
                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all cursor-pointer ${
                    currentLang === lang
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lang === "ar" ? "العربية" : lang === "fr" ? "FR" : lang === "en" ? "EN" : "ES"}
                </button>
              ))}
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              className="p-1.5 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground transition shadow-xs cursor-pointer"
              aria-label="Toggle Theme"
            >
              {isDarkMode ? <Sun size={13} className="text-amber-400" /> : <Moon size={13} />}
            </button>
          </div>
        </div>

        {/* ── Main Navigation Header ────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <a href={getPath("/")} className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-xl shadow-md group-hover:scale-105 transition-transform">
              ⚖️
            </div>
            <div className="flex flex-col">
              <span
                className="text-lg font-black tracking-tight text-foreground leading-tight"
                style={{ fontFamily: currentLang === "ar" ? "var(--font-serif-ar)" : "var(--font-serif-en)" }}
              >
                {currentLang === "ar" ? "منصة ميزان" : "MIZAN PLATFORM"}
              </span>
              <span className="text-[9px] tracking-widest text-muted-foreground uppercase font-bold">
                Digital Legal Archive
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links & User Profile */}
          <div className="hidden lg:flex items-center gap-6">
            <nav className="flex items-center gap-5 text-xs font-semibold text-muted-foreground">
              {currentNavItems.map((item, idx) => (
                <div key={idx} className="relative group py-2">
                  <a
                    href={getPath(item.href)}
                    className="flex items-center gap-1 hover:text-primary transition-colors py-1"
                  >
                    <span>{item.label}</span>
                    {item.dropdown && (
                      <ChevronDown
                        size={12}
                        className="opacity-70 group-hover:rotate-180 transition-transform"
                      />
                    )}
                  </a>

                  {item.dropdown && (
                    <div
                      className={`absolute top-full ${
                        dir === "rtl" ? "right-0" : "left-0"
                      } hidden group-hover:block w-56 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-1`}
                    >
                      <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground px-3 py-1 border-b border-border/50 mb-1">
                        {item.label}
                      </div>
                      {item.dropdown.map((subItem, subIdx) => (
                        <a
                          key={subIdx}
                          href={getPath(subItem.href)}
                          className="block px-3 py-2 rounded-lg text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary font-medium transition-colors"
                        >
                          {subItem.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* User Sign-In Button Trigger */}
            {isAuthenticated ? (
              <a
                href={getPath("/profile")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-95 transition shadow-xs"
              >
                <User size={14} />
                <span>{userName || (currentLang === "ar" ? "حسابي" : "My Profile")}</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-95 transition shadow-xs cursor-pointer"
              >
                <User size={14} />
                <span>{currentLang === "ar" ? "تسجيل الدخول" : "Sign In"}</span>
              </button>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* ── Mobile Navigation Drawer ──────────────────────────────────────── */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-white dark:bg-slate-900 px-6 py-4 space-y-4 shadow-xl">
            <nav className="space-y-3">
              {currentNavItems.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <a
                    href={getPath(item.href)}
                    className="block font-bold text-sm text-foreground hover:text-primary"
                  >
                    {item.label}
                  </a>
                  {item.dropdown && (
                    <div className={`space-y-1 ${dir === "rtl" ? "pr-4" : "pl-4"}`}>
                      {item.dropdown.map((sub, sIdx) => (
                        <a
                          key={sIdx}
                          href={getPath(sub.href)}
                          className="block text-xs text-muted-foreground hover:text-foreground py-1"
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
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
              >
                <User size={14} />
                <span>{userName || (currentLang === "ar" ? "حسابي" : "My Profile")}</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsAuthModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
              >
                <User size={14} />
                <span>{currentLang === "ar" ? "تسجيل الدخول" : "Sign In"}</span>
              </button>
            )}
          </div>
        )}
      </header>

      {/* Auth Modal Trigger */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        lang={currentLang}
        dir={dir}
      />
    </>
  );
};