import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { DeveloperBuilder } from "@/components/common/DeveloperBuilder";
import { Footer } from "@/components/layout/Footer";
import { useI18n, serifFont, sansFont, type Lang } from "@/lib/i18n";
import { COURT_RULINGS_AND_DOCTRINE } from "@/data/courtRulingsData";
import { Scale, BookOpen, ChevronRight, ArrowLeft } from "lucide-react";

// Declare global adsbygoogle type for TypeScript safety
declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

// Multilingual helper type
type L = Record<Lang, string>;
const t4 = (ar: string, fr: string, en: string, es: string): L => ({
  ar,
  fr,
  en,
  es,
});

// Translations for the Home page banner & SEO
const txt = {
  seoTitle: t4(
    "ميزان الرقمية | المنصة القانونية الشاملة للبحوث والخدمات",
    "Mizan Digital | Plateforme Juridique Globale",
    "Mizan Digital | Comprehensive Legal Platform",
    "Mizan Digital | Plataforma Jurídica Integral"
  ),
  seoDesc: t4(
    "المنصة الأولى للخدمات والبحوث القانونية، المكتبة الرقمية، الاجتهادات القضائية ونماذج العقود بالمغرب.",
    "Première plateforme de services et recherches juridiques, bibliothèque numérique et jurisprudence au Maroc.",
    "Leading platform for legal services, research, digital library, and jurisprudence in Morocco.",
    "Plataforma líder en servicios e investigaciones jurídicas, biblioteca digital y jurisprudencia en Marruecos."
  ),
  sectionTitle: t4(
    "🎓 المساحة التعليمية والمنصة",
    "🎓 Espace Éducatif et Plateforme",
    "🎓 Educational Space & Platform",
    "🎓 Espacio Educativo y Plataforma"
  ),
  sectionDesc: t4(
    "أهلاً بك في الواجهة الرئيسية المخصصة للهواتف الذكية والحواسب. كافة المزايا والمحتويات تخضع لشروط الاستخدام وإخلاء المسؤولية القانوني.",
    "Bienvenue sur l'interface principale adaptée aux mobiles et ordinateurs. Tous les contenus sont soumis aux conditions d'utilisation et à la clause de non-responsabilité.",
    "Welcome to the main mobile and desktop portal. All features and content are subject to terms of use and legal disclaimers.",
    "Bienvenido al portal principal para móviles y ordenadores. Todos los contenidos están sujetos a los términos de uso y al aviso legal."
  ),
  rulingsHeader: t4(
    "⚖️ الاجتهادات القضائية والدراسات الفقهية",
    "⚖️ Jurisprudence et Doctrine Juridique",
    "⚖️ Court Rulings & Legal Doctrine",
    "⚖️ Jurisprudencia y Doctrina Legal"
  ),
};

export default function Home(): React.JSX.Element {
  const { lang, dir } = useI18n();

  // 🚀 Update page title & description dynamically on language change
  useEffect(() => {
    document.title = txt.seoTitle[lang];
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", txt.seoDesc[lang]);
    }
  }, [lang]);

  // 💰 Push Google AdSense ad on mount safely
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (err) {
      console.error("AdSense execution error:", err);
    }
  }, []);

  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col justify-between transition-colors duration-300 selection:bg-accent-gold/20 selection:text-accent-gold"
      dir={dir}
    >
      <div>
        <Navbar />
        <main className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
          <DeveloperBuilder />

          {/* ⚖️ Court Rulings & Doctrine Navigation Grid */}
          <section className="space-y-4">
            <h2
              className="text-lg sm:text-xl font-bold text-foreground tracking-tight"
              style={{ fontFamily: serifFont(lang) }}
            >
              {txt.rulingsHeader[lang]}
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              {COURT_RULINGS_AND_DOCTRINE.map((section) => (
                <div
                  key={section.id}
                  className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-4 border-b border-border/50 pb-3">
                    {section.id === "court-rulings" ? (
                      <Scale className="size-6 text-primary shrink-0" />
                    ) : (
                      <BookOpen className="size-6 text-primary shrink-0" />
                    )}
                    <h3
                      className="text-base sm:text-lg font-semibold tracking-wide"
                      style={{ fontFamily: serifFont(lang) }}
                    >
                      {section.title}
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    {section.subcategories.map((sub) => (
                      <Link
                        key={sub.id}
                        to={`/${lang}/category/${sub.slug}`}
                        className="group flex items-start justify-between p-3 rounded-xl hover:bg-muted/60 transition-colors border border-transparent hover:border-border/40"
                      >
                        <div className="space-y-1">
                          <div
                            className="text-sm font-medium text-foreground group-hover:text-primary transition-colors"
                            style={{ fontFamily: sansFont(lang) }}
                          >
                            {sub.title}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {sub.description}
                          </p>
                        </div>
                        {dir === "rtl" ? (
                          <ArrowLeft className="size-4 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-transform shrink-0 mt-1" />
                        ) : (
                          <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-transform shrink-0 mt-1" />
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Educational Space Section */}
          <section
            className="bg-card/90 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-border shadow-sm text-center transition-colors relative overflow-hidden"
            aria-labelledby="educational-space-heading"
          >
            {/* Ambient Background Glow Effect */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-accent-gold/10 dark:bg-accent-gold/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-primary/10 dark:bg-primary/5 rounded-full blur-3xl pointer-events-none" />

            <h2
              id="educational-space-heading"
              className="text-base sm:text-lg font-bold text-foreground mb-2 relative z-10"
              style={{ fontFamily: serifFont(lang) }}
            >
              {txt.sectionTitle[lang]}
            </h2>
            <p
              className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto relative z-10"
              style={{ fontFamily: sansFont(lang) }}
            >
              {txt.sectionDesc[lang]}
            </p>
          </section>

          {/* 💰 Google AdSense Placement Slot */}
          <div className="my-6 text-center overflow-hidden min-h-[90px] rounded-xl border border-border/40 bg-muted/20 flex items-center justify-center">
            <ins
              className="adsbygoogle"
              style={{ display: "block", width: "100%" }}
              data-ad-client="ca-pub-1749032173858747"
              data-ad-slot="auto"
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}