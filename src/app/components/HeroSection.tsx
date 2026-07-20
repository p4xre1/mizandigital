import React from "react";

interface HeroSectionProps {
  lang: "ar" | "fr" | "en" | "es";
  dir: "rtl" | "ltr";
}

export const HeroSection: React.FC<HeroSectionProps> = ({ lang, dir }) => {
  const content = {
    ar: {
      badge: "منصة ميزان - الأرشيف الأكاديمي المستقل",
      title: "الأرشيف القانوني والفقهي الموحد",
      subtitle:
        "منظومة رقمية شاملة لدراسة المذكرات القضائية، التشريعات الوطنية، والاجتهادات الدستورية بأسلوب أكاديمي موثق.",
      ctaPrimary: "استكشاف الأرشيف الجامعي",
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
      badge: "Mizan Platform - Independent Academic Archive",
      title: "Unified Legal & Judicial Repository",
      subtitle:
        "A comprehensive institutional engine for legal research, constitutional precedents, and academic case commentary.",
      ctaPrimary: "Explore Legal Archive",
      ctaSecondary: "Academic Library",
    },
    es: {
      badge: "Plataforma Mizan - Archivo Académico Independiente",
      title: "Repositorio Jurídico y Jurisprudencial Unificado",
      subtitle:
        "Un sistema digital exhaustivo para la investigación legal, precedentes constitucionales y doctrinas académicas.",
      ctaPrimary: "Explorar Archivo",
      ctaSecondary: "Biblioteca Legal",
    },
  };

  const t = content[lang];

  return (
    <section
      aria-label={t.title}
      className="relative w-full min-h-[580px] flex items-center justify-center overflow-hidden border-b border-border"
      dir={dir}
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-105 transition-transform duration-1000 pointer-events-none"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=2000&q=85')`,
        }}
        aria-hidden="true"
      />

      {/* High-Contrast Dynamic Gradients */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 pointer-events-none" aria-hidden="true" />
      <div
        className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/80 to-background dark:from-background/95 dark:via-background/85 dark:to-background pointer-events-none"
        aria-hidden="true"
      />

      {/* Hero Body Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-20 text-center space-y-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-600/40 bg-amber-500/15 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-bold tracking-wide uppercase shadow-sm backdrop-blur-md">
          <span aria-hidden="true">🏛️</span>
          <span>{t.badge}</span>
        </div>

        {/* Title */}
        <h1
          className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight"
          style={{
            fontFamily: lang === "ar" ? "var(--font-serif-ar)" : "var(--font-serif-en)",
          }}
        >
          {t.title}
        </h1>

        {/* Subtitle */}
        <p className="max-w-3xl mx-auto text-base md:text-lg text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
          {t.subtitle}
        </p>

        {/* Action Buttons (Strict 48px touch targets) */}
        <div className="pt-6 flex flex-wrap justify-center gap-4">
          <a
            href="#archive"
            className="inline-flex items-center justify-center min-h-[48px] px-8 py-3.5 rounded-xl bg-blue-900 dark:bg-blue-600 text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-lg hover:bg-blue-950 dark:hover:bg-blue-700 transition transform active:scale-95"
          >
            {t.ctaPrimary}
          </a>
          <a
            href="#library"
            className="inline-flex items-center justify-center min-h-[48px] px-8 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white font-bold text-xs sm:text-sm uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-sm"
          >
            {t.ctaSecondary}
          </a>
        </div>
      </div>
    </section>
  );
};