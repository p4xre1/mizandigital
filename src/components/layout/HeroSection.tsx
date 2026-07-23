import React from "react";
import { Link } from "react-router-dom";

interface HeroSectionProps {
  lang: "ar" | "fr" | "en" | "es";
  dir: "rtl" | "ltr";
}

export const HeroSection: React.FC<HeroSectionProps> = ({ lang, dir }) => {
  const content = {
    ar: {
      badge: "منصة ميزان - الأرشيف الأكاديمي",
      title: "الأرشيف القانوني والفقهي الموحد",
      subtitle:
        "منظومة رقمية شاملة لدراسة المذكرات القضائية، التشريعات الوطنية، والاجتهادات الدستورية بأسلوب أكاديمي موثق.",
      ctaPrimary: "استكشاف الأرشيف",
      ctaSecondary: "المكتبة القانونية",
    },
    fr: {
      badge: "Plateforme Mizan - Archives Académiques",
      title: "Archives Juridiques & Jurisprudence Unifiées",
      subtitle:
        "Un système numérique exhaustif dédié à l'étude des mémoires judiciaires, des textes législatifs et des doctrines.",
      ctaPrimary: "Consulter les Archives",
      ctaSecondary: "Bibliothèque Juridique",
    },
    en: {
      badge: "Mizan Platform - Academic Archive",
      title: "Unified Legal & Judicial Repository",
      subtitle:
        "A comprehensive institutional engine for legal research, constitutional precedents, and academic case commentary.",
      ctaPrimary: "Explore Archive",
      ctaSecondary: "Academic Library",
    },
    es: {
      badge: "Plataforma Mizan - Archivo Académico",
      title: "Repositorio Jurídico y Jurisprudencial",
      subtitle:
        "Un sistema digital exhaustivo para la investigación legal, precedentes constitucionales y doctrinas académicas.",
      ctaPrimary: "Explorar Archivo",
      ctaSecondary: "Biblioteca Legal",
    },
  };

  const t = content[lang];
  const getPath = (href: string) => `/${lang}${href}`;

  return (
    <section
      aria-label={t.title}
      className="relative w-full min-h-[440px] sm:min-h-[540px] flex items-center justify-center overflow-hidden border-b border-slate-200 dark:border-slate-800 bg-slate-900 text-white select-none"
      dir={dir}
    >
      {/* Ultra-Fast Modern Gradient Background (Zero network requests) */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/60 via-slate-900 to-slate-950 pointer-events-none"
        aria-hidden="true"
      />

      {/* Subtle Grid Pattern Overlay */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,#33415515_1px,transparent_1px),linear-gradient(to_bottom,#33415515_1px,transparent_1px)] bg-[size:1.75rem_1.75rem] pointer-events-none"
        aria-hidden="true"
      />

      {/* Hero Body Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 text-center space-y-4 sm:space-y-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300 text-[11px] sm:text-xs font-bold tracking-wide uppercase shadow-xs">
          <span aria-hidden="true">🏛️</span>
          <span className="truncate max-w-[260px] sm:max-w-none">{t.badge}</span>
        </div>

        {/* Title */}
        <h1
          className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight sm:leading-tight"
          style={{
            fontFamily: lang === "ar" ? "var(--font-serif-ar)" : "var(--font-serif-en)",
          }}
        >
          {t.title}
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl mx-auto text-xs sm:text-base md:text-lg text-slate-300 leading-relaxed font-normal px-2">
          {t.subtitle}
        </p>

        {/* Action Buttons */}
        <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-xs sm:max-w-none mx-auto">
          <Link
            to={getPath("/archive")}
            className="inline-flex items-center justify-center min-h-[48px] px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-md active:scale-95 transition-transform touch-manipulation"
          >
            {t.ctaPrimary}
          </Link>
          <Link
            to={getPath("/fields/family-law")}
            className="inline-flex items-center justify-center min-h-[48px] px-6 py-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-bold text-xs sm:text-sm uppercase tracking-wider active:scale-95 transition-transform touch-manipulation"
          >
            {t.ctaSecondary}
          </Link>
        </div>
      </div>
    </section>
  );
};