"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  onAuthSuccess?: () => void;
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
  onAuthSuccess,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [expandedMobileMenu, setExpandedMobileMenu] = useState<number | null>(null);

  const dir = currentLang === "ar" ? "rtl" : "ltr";
  const getPath = (href: string) => `/${currentLang}${href}`;

  // Lock background scrolling when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

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

  const handleAuthSuccess = () => {
    if (onAuthSuccess) {
      onAuthSuccess();
    } else {
      window.location.reload();
    }
  };

  return (
    <>
      <header
        className="w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-40 shadow-xs select-none"
        dir={dir}
      >
        {/* Top Institutional Utility Bar */}
        <div className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 text-[11px] py-1 px-3 sm:px-8 flex justify-between items-center gap-2">
          <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate">
            <ShieldCheck size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="truncate" style={{ fontFamily: currentLang === "ar" ? "var(--font-serif-ar)" : "inherit" }}>
              {currentLang === "ar" ? "الحق · العدل · الميزان" : "Veritas · Justitia · Libra"}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Language Selector */}
            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md p-0.5">
              <Globe size={12} className="mx-1 text-slate-500 shrink-0 hidden sm:block" />
              {(["ar", "fr", "en", "es"] as Locale[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => onLanguageChange(lang)}
                  className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-extrabold transition-all touch-manipulation active:scale-95 cursor-pointer ${
                    currentLang === lang
                      ? "bg-blue-900 text-white dark:bg-blue-600"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {lang === "ar" ? "ع" : lang.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              className="p-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 active:scale-95 transition touch-manipulation cursor-pointer flex items-center justify-center min-w-[28px] min-h-[28px]"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun size={13} className="text-amber-400" /> : <Moon size={13} />}
            </button>
          </div>
        </div>

        {/* Main Header Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <Link href={getPath("/")} className="flex items-center gap-2.5 group shrink-0 active:scale-95 transition-transform">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-900 dark:bg-blue-700 text-white flex items-center justify-center font-black text-lg shadow-sm">
              ⚖️
            </div>
            <div className="flex flex-col">
              <span
                className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white leading-none"
                style={{ fontFamily: currentLang === "ar" ? "var(--font-serif-ar)" : "var(--font-serif-en)" }}
              >
                {currentLang === "ar" ? "منصة ميزان" : "MIZAN"}
              </span>
              <span className="text-[10px] tracking-wider text-slate-500 dark:text-slate-400 uppercase font-semibold">
                Legal Archive
              </span>
            </div>
          </Link>

          {/* Desktop Links */}
          <div className="hidden lg:flex items-center gap-6">
            <nav className="flex items-center gap-5 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {currentNavItems.map((item, idx) => (
                <div key={idx} className="relative group py-2">
                  <Link
                    href={getPath(item.href)}
                    className="flex items-center gap-1 hover:text-blue-900 dark:hover:text-blue-400 transition-colors"
                  >
                    <span>{item.label}</span>
                    {item.dropdown && <ChevronDown size={14} className="opacity-70 group-hover:rotate-180 transition-transform" />}
                  </Link>

                  {item.dropdown && (
                    <div
                      className={`absolute top-full ${
                        dir === "rtl" ? "right-0" : "left-0"
                      } hidden group-hover:block w-56 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50`}
                    >
                      {item.dropdown.map((sub, sIdx) => (
                        <Link
                          key={sIdx}
                          href={getPath(sub.href)}
                          className="block px-3 py-2 rounded-lg text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* Desktop Auth Button */}
            {isAuthenticated ? (
              <Link
                href={getPath("/profile")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-900 dark:bg-blue-700 text-white text-xs font-bold hover:opacity-95 transition shadow-xs"
              >
                <User size={15} />
                <span>{userName || (currentLang === "ar" ? "حسابي" : "Profile")}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-900 dark:bg-blue-700 text-white text-xs font-bold hover:opacity-95 transition shadow-xs cursor-pointer"
              >
                <User size={15} />
                <span>{currentLang === "ar" ? "تسجيل الدخول" : "Sign In"}</span>
              </button>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 active:scale-90 transition-transform touch-manipulation cursor-pointer flex items-center justify-center min-w-[42px] min-h-[42px]"
            aria-label="Open Mobile Menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* MOBILE OFF-CANVAS SLIDE DRAWER & BACKDROP */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" dir={dir}>
          {/* Semi-transparent Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Sidebar */}
          <aside
            className={`fixed top-0 bottom-0 ${
              dir === "rtl" ? "right-0" : "left-0"
            } w-[82%] max-w-sm bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-${
              dir === "rtl" ? "right" : "left"
            } duration-200`}
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center text-base">
                  ⚖️
                </div>
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {currentLang === "ar" ? "القائمة الرئيسية" : "Menu"}
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 touch-manipulation cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Nav Items Accordion */}
            <div className="p-4 space-y-2 flex-1">
              {currentNavItems.map((item, idx) => (
                <div key={idx} className="border-b border-slate-100 dark:border-slate-800/60 pb-2">
                  <div className="flex items-center justify-between">
                    <Link
                      href={getPath(item.href)}
                      onClick={() => setMobileMenuOpen(false)}
                      className="font-bold text-sm text-slate-800 dark:text-slate-200 py-1.5 block hover:text-blue-600"
                    >
                      {item.label}
                    </Link>
                    {item.dropdown && (
                      <button
                        onClick={() =>
                          setExpandedMobileMenu(expandedMobileMenu === idx ? null : idx)
                        }
                        className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white touch-manipulation"
                      >
                        <ChevronDown
                          size={16}
                          className={`transition-transform duration-200 ${
                            expandedMobileMenu === idx ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    )}
                  </div>

                  {/* Submenu Dropdown */}
                  {item.dropdown && expandedMobileMenu === idx && (
                    <div className="mt-1 space-y-1 ltr:pl-3 rtl:pr-3 border-l-2 rtl:border-r-2 rtl:border-l-0 border-blue-600/30">
                      {item.dropdown.map((sub, sIdx) => (
                        <Link
                          key={sIdx}
                          href={getPath(sub.href)}
                          onClick={() => setMobileMenuOpen(false)}
                          className="block text-xs font-medium text-slate-600 dark:text-slate-400 py-1.5 hover:text-blue-600"
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Drawer Bottom Actions */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-3">
              {isAuthenticated ? (
                <Link
                  href={getPath("/profile")}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-900 dark:bg-blue-700 text-white text-xs font-bold shadow-sm touch-manipulation"
                >
                  <User size={16} />
                  <span>{userName || (currentLang === "ar" ? "الملف الشخصي" : "Profile")}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsAuthModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-900 dark:bg-blue-700 text-white text-xs font-bold shadow-sm touch-manipulation cursor-pointer active:scale-95 transition-transform"
                >
                  <User size={16} />
                  <span>{currentLang === "ar" ? "تسجيل الدخول" : "Sign In"}</span>
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        lang={currentLang}
        dir={dir}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
};