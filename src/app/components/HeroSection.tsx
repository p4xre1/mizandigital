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
      subtitle: "منظومة رقمية شاملة لدراسة المذكرات القضائية، التشريعات الوطنية، والاجتهادات الدستورية بأسلوب أكاديمي موثق.",
      ctaPrimary: "استكشاف الأرشيف الجامعي",
      ctaSecondary: "المكتبة القانونية",
    },
    fr: {
      badge: "Plateforme Mizan - Archives Académiques",
      title: "Archives Juridiques & Jurisprudence Unifiées",
      subtitle: "Un système numérique exhaustif dédié à l'étude des mémoires judiciaires, des textes législatifs et des doctrines.",
      ctaPrimary: "Consulter les Archives",
      ctaSecondary: "Bibliothèque Juridique",
    },
    en: {
      badge: "Mizan Platform - Independent Academic Archive",
      title: "Unified Legal & Judicial Repository",
      subtitle: "A comprehensive institutional engine for legal research, constitutional precedents, and academic case commentary.",
      ctaPrimary: "Explore Legal Archive",
      ctaSecondary: "Academic Library",
    },
    es: {
      badge: "Plataforma Mizan - Archivo Académico Independiente",
      title: "Repositorio Jurídico y Jurisprudencial Unificado",
      subtitle: "Un sistema digital exhaustivo para la investigación legal, precedentes constitucionales y doctrinas académicas.",
      ctaPrimary: "Explorar Archivo",
      ctaSecondary: "Biblioteca Legal",
    },
  };

  const t = content[lang];

  return (
    <section className="relative w-full min-h-[580px] flex items-center justify-center overflow-hidden border-b border-border" dir={dir}>
      {/* High-Resolution Yale/Institutional Law Library Photo Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-105 transition-transform duration-1000"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=2000&q=85')`
        }}
        aria-hidden="true"
      />

      {/* High-Contrast Radial Overlay Engine */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/80 to-background dark:from-background/95 dark:via-background/85 dark:to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/15 via-primary/25 to-background/95 dark:from-amber-400/10 dark:via-primary/40 dark:to-background/98" />

      {/* Hero Body Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-24 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-semibold tracking-wide uppercase shadow-sm backdrop-blur-sm">
          <span className="text-sm">🏛️</span>
          <span>{t.badge}</span>
        </div>

        <h1 
          className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight"
          style={{ fontFamily: lang === "ar" ? "var(--font-serif-ar)" : "var(--font-serif-en)" }}
        >
          {t.title}
        </h1>

        <p className="max-w-3xl mx-auto text-base md:text-lg text-muted-foreground leading-relaxed font-normal">
          {t.subtitle}
        </p>

        <div className="pt-6 flex flex-wrap justify-center gap-4">
          <a
            href="#archive"
            className="px-7 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider shadow-lg hover:opacity-95 transition transform active:scale-95"
          >
            {t.ctaPrimary}
          </a>
          <a
            href="#library"
            className="px-7 py-3.5 rounded-xl border border-border bg-card/80 backdrop-blur text-foreground font-bold text-xs uppercase tracking-wider hover:bg-muted transition shadow-sm"
          >
            {t.ctaSecondary}
          </a>
        </div>
      </div>
    </section>
  );
};