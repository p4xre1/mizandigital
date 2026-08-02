import React, { useState, useEffect, useMemo } from "react";
import { Link, Outlet, useParams, useLocation } from "react-router-dom";
import {
  Scale,
  ShieldCheck,
  ArrowUp,
  X,
  Megaphone,
  Lock,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Navbar } from "./Navbar";
import { AuthModal } from "@/components/auth/AuthModal";
import { useRole } from "@/hooks/useRole";

export type SupportedLang = "ar" | "fr" | "en" | "es";

interface LayoutProps {
  lang?: SupportedLang;
  dir?: "rtl" | "ltr";
}

// Environment Variables & Constants
const SITE_URL = import.meta.env.VITE_SITE_URL || "https://www.mizan.page";
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_ID || "G-XXXXXXXXXX";
const ADSENSE_CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID || "ca-pub-0000000000000000";

/**
 * Mobile-First High-Performance Safe Ad Slot (Zero CLS)
 */
function AdSlot({
  slotId,
  format = "auto",
  className = "",
  ariaLabel = "إعلان - Advertisement",
}: {
  slotId: string;
  format?: "auto" | "rectangle" | "horizontal";
  className?: string;
  ariaLabel?: string;
}) {
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
    <aside
      aria-label={ariaLabel}
      className={`w-full overflow-hidden flex flex-col items-center justify-center my-3 ${className}`}
    >
      <span className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase mb-1 opacity-50 select-none">
        إعلان - Advertisement
      </span>
      <div className="w-full bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl min-h-[90px] flex items-center justify-center overflow-hidden transition-all">
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%" }}
          data-ad-client={ADSENSE_CLIENT_ID}
          data-ad-slot={slotId}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      </div>
    </aside>
  );
}

export function Layout({ lang: propLang, dir: propDir }: LayoutProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showMobileStickyAd, setShowMobileStickyAd] = useState(true);

  const { lang: urlLang } = useParams<{ lang: string }>();
  const location = useLocation();
  const { role, isStaff } = useRole();

  // Strict whitelist check against XSS & Path manipulation
  const validLangs: SupportedLang[] = useMemo(() => ["ar", "fr", "en", "es"], []);
  
  const lang: SupportedLang = useMemo(() => {
    if (propLang && validLangs.includes(propLang)) return propLang;
    if (urlLang && validLangs.includes(urlLang as SupportedLang)) return urlLang as SupportedLang;
    return "ar";
  }, [propLang, urlLang, validLangs]);

  const dir: "rtl" | "ltr" = propDir || (lang === "ar" ? "rtl" : "ltr");

  // Dynamic Scroll Listener for Scroll-to-Top Button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 350);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const localizedPath = (path: string) => {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return cleanPath === "/" ? `/${lang}` : `/${lang}${cleanPath}`;
  };

  // Translations Map across 4 Languages
  const t = (key: string) => {
    const dict: Record<string, Record<SupportedLang, string>> = {
      brand: {
        ar: "منصة ميزان الرقمية - العلوم القانونية والاجتهاد القضائي",
        fr: "Plateforme Numérique Mizan - Sciences Juridiques & Jurisprudence",
        en: "Mizan Digital Platform - Legal Sciences & Jurisprudence",
        es: "Plataforma Digital Mizan - Ciencias Jurídicas y Jurisprudencia",
      },
      description: {
        ar: "المكتبة القانونية والأرشيف الأكاديمي الموحد للقرارات القضائية، المستندات الرسمية، والبحوث الجامعية المغربية والدولية.",
        fr: "Bibliothèque juridique et archives académiques unifiées des décisions de justice, documents officiels et recherches universitaires.",
        en: "Unified legal library and academic archives for court decisions, official documents, and law research.",
        es: "Biblioteca legal unificada y archivos académicos para decisiones judiciales, documentos oficiales y estudios legales.",
      },
      keywords: {
        ar: "قانون, ميزان, أرشيف قضائي, قرارات محكمة النقض, مذكرات قانونية, المغرب, كليات الحقوق, الماستر, نصوص قانونية, pdf, صور الوثائق",
        fr: "droit, mizan, archives judiciaires, cour de cassation, mémoires juridiques, maroc, facultés de droit, master, textes de loi, pdf",
        en: "law, mizan, judicial archives, supreme court rulings, legal briefs, morocco, law schools, master degree, legal texts, pdf, legal images",
        es: "derecho, mizan, archivos judiciales, jurisprudencia, memorandos legales, marruecos, facultades de derecho, textos legales, pdf",
      },
      security_badge: {
        ar: "حماية عسكرية ومشفرة وفق معايير SSL 256-Bit TLS 1.3",
        fr: "Protection de niveau militaire chiffrée SSL 256-Bit TLS 1.3",
        en: "Military-grade encrypted protection with SSL 256-Bit TLS 1.3",
        es: "Protección de nivel militar cifrada con SSL 256-Bit TLS 1.3",
      },
      sponsor_title: {
        ar: "الأرشيف الرقمي الموحد والاجتهادات القضائية",
        fr: "Archives Numériques Unifiées & Jurisprudence",
        en: "Unified Digital Archives & Legal Precedents",
        es: "Archivos Digitales Unificados y Jurisprudencia",
      },
      sponsor_desc: {
        ar: "وصول سريع وآمن لأحدث أبحاث الماستر والقرارات القضائية بصيغ PDF وصور عالية الجودة.",
        fr: "Accès rapide et sécurisé aux recherches de master et décisions de justice en PDF et images haute définition.",
        en: "Fast, secure access to master's research and court rulings in high-res PDF and image formats.",
        es: "Acceso rápido y seguro a tesis de máster y resoluciones judiciales en PDF e imágenes de alta definición.",
      },
      browse_archive: { ar: "تصفح الأرشيف", fr: "Explorer l'Archive", en: "Browse Archive", es: "Explorar Archivos" },
      close_ad: { ar: "إغلاق الإعلان", fr: "Fermer l'annonce", en: "Close advertisement", es: "Cerrar anuncio" },
      top_banner_ad: { ar: "إعلان أعلى الصفحة", fr: "Bannière publicitaire supérieure", en: "Top Banner Advertisement", es: "Anuncio superior" },
    };
    return dict[key]?.[lang] || key;
  };

  // Structured Data / Schema.org (Google Master SEO)
  const schemaData = useMemo(() => {
    const currentUrl = `${SITE_URL}/${lang}${location.pathname.replace(/^\/(ar|fr|en|es)/, "")}`;
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": `${SITE_URL}/#website`,
          "url": SITE_URL,
          "name": "Mizan Digital Platform",
          "description": t("description"),
          "inLanguage": ["ar", "fr", "en", "es"],
          "potentialAction": {
            "@type": "SearchAction",
            "target": `${SITE_URL}/${lang}/search?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        },
        {
          "@type": "Organization",
          "@id": `${SITE_URL}/#organization`,
          "name": "Mizan Digital Legal Platform",
          "url": SITE_URL,
          "logo": {
            "@type": "ImageObject",
            "url": `${SITE_URL}/Logo.svg`,
            "width": "512",
            "height": "512",
            "caption": "Mizan Legal Platform Official Logo",
          },
          "sameAs": [
            "https://facebook.com/mizanpage",
            "https://twitter.com/mizanpage",
            "https://linkedin.com/company/mizanpage",
          ],
        },
        {
          "@type": "WebPage",
          "@id": `${currentUrl}/#webpage`,
          "url": currentUrl,
          "name": t("brand"),
          "isPartOf": { "@id": `${SITE_URL}/#website` },
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": lang === "ar" ? "الرئيسية" : "Home",
                "item": `${SITE_URL}/${lang}`,
              },
            ],
          },
        },
      ],
    };
  }, [lang, location.pathname]);

  const footerCols = [
    {
      heading: { ar: "الأقسام والبحوث", fr: "Sections & Recherche", en: "Sections & Research", es: "Secciones e Investigación" },
      links: [
        { href: "/archive", label: { ar: "الأرشيف القانوني", fr: "Archives Juridiques", en: "Legal Archive", es: "Archivo Legal" } },
        { href: "/library", label: { ar: "المكتبة الرقمية", fr: "Bibliothèque Numérique", en: "Digital Library", es: "Biblioteca Digital" } },
        { href: "/schools", label: { ar: "كليات الحقوق", fr: "Facultés de Droit", en: "Law Faculties", es: "Facultades de Derecho" } },
      ],
    },
    {
      heading: { ar: "المنصة والمؤسسة", fr: "Plateforme & Institution", en: "Platform & Institution", es: "Plataforma e Institución" },
      links: [
        { href: "/about", label: { ar: "عن منصة ميزان", fr: "À Propos de Mizan", en: "About Mizan", es: "Acerca de Mizan" } },
      ],
    },
  ];

  return (
    <div
      dir={dir}
      className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-primary selection:text-primary-foreground font-sans transition-colors duration-200"
    >
      {/* ================= MILITARY-GRADE SECURITY & MASTER GOOGLE SEO HEADERS ================= */}
      <Helmet>
        <html lang={lang} dir={dir} />
        <title>{t("brand")}</title>
        <meta name="description" content={t("description")} />
        <meta name="keywords" content={t("keywords")} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover" />

        {/* Security Meta Tags */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />

        {/* Canonical & Multilingual Hreflang Tags */}
        <link rel="canonical" href={`${SITE_URL}/${lang}${location.pathname.replace(/^\/(ar|fr|en|es)/, "")}`} />
        <link rel="alternate" hrefLang="ar" href={`${SITE_URL}/ar${location.pathname.replace(/^\/(ar|fr|en|es)/, "")}`} />
        <link rel="alternate" hrefLang="fr" href={`${SITE_URL}/fr${location.pathname.replace(/^\/(ar|fr|en|es)/, "")}`} />
        <link rel="alternate" hrefLang="en" href={`${SITE_URL}/en${location.pathname.replace(/^\/(ar|fr|en|es)/, "")}`} />
        <link rel="alternate" hrefLang="es" href={`${SITE_URL}/es${location.pathname.replace(/^\/(ar|fr|en|es)/, "")}`} />
        <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}/ar${location.pathname.replace(/^\/(ar|fr|en|es)/, "")}`} />

        {/* OpenGraph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/${lang}`} />
        <meta property="og:title" content={t("brand")} />
        <meta property="og:description" content={t("description")} />
        <meta property="og:image" content={`${SITE_URL}/Logo.svg`} />
        <meta property="og:image:alt" content="Mizan Digital Legal Platform Header" />
        <meta property="og:locale" content={lang === "ar" ? "ar_MA" : lang === "fr" ? "fr_FR" : lang === "es" ? "es_ES" : "en_US"} />

        {/* Twitter Cards */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={t("brand")} />
        <meta name="twitter:description" content={t("description")} />
        <meta name="twitter:image" content={`${SITE_URL}/Logo.svg`} />

        {/* Preconnect for Google Fast Asset Delivery */}
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* JSON-LD Master Schema */}
        <script type="application/ld+json">{JSON.stringify(schemaData)}</script>

        {/* Google Analytics 4 (GA4) */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
        <script>
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', { page_path: window.location.pathname });
          `}
        </script>

        {/* Google AdSense Asynchronous Loader */}
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
          crossOrigin="anonymous"
        />
      </Helmet>

      {/* Primary Header Nav Landmark */}
      <Navbar />

      {/* Top Universal Banner Ad Slot */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 w-full pt-3">
        <AdSlot slotId="1020304050" format="horizontal" ariaLabel={t("top_banner_ad")} className="max-h-[100px]" />
      </div>

      {/* Main Page Dynamic Outlet Content */}
      <main id="main-content" tabIndex={-1} className="flex-1 w-full relative outline-none">
        <Outlet />
      </main>

      {/* Mid-Content Ad Unit */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 w-full my-6">
        <AdSlot slotId="6070809001" format="auto" />
      </div>

      {/* Main Footer Section */}
      <footer className="w-full bg-slate-100 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 pt-10 pb-28 sm:pb-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Academic Sponsor & Research High-Converting CTA */}
          <div className="mb-10 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-slate-950 border border-blue-500/30 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="space-y-1.5 text-center sm:text-start rtl:sm:text-right">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                  <Megaphone size={12} />
                  {lang === "ar" ? "مركز الأبحاث والوثائق" : "Research & Media"}
                </span>
                {isStaff && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Role: {role}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {t("sponsor_title")}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                {t("sponsor_desc")}
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
              <Link
                to={localizedPath("/archive")}
                className="flex-1 sm:flex-none min-h-[48px] px-5 py-2.5 flex items-center justify-center text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl active:scale-95 transition shadow-lg shadow-blue-900/40"
              >
                {t("browse_archive")}
              </Link>
            </div>
          </div>

          {/* Footer Navigation Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-slate-200 dark:border-slate-800">
            <div className="lg:col-span-2 space-y-4">
              <Link to={localizedPath("/")} className="flex items-center gap-3 active:scale-98 transition-transform">
                <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-black shadow-md">
                  <Scale size={22} />
                </div>
                <span className="font-extrabold text-slate-900 dark:text-slate-100 text-lg leading-tight tracking-tight">
                  {t("brand")}
                </span>
              </Link>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm">
                {t("description")}
              </p>

              {/* Security Shield Indicator */}
              <div className="pt-2 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                <ShieldCheck size={16} />
                <span>{t("security_badge")}</span>
              </div>
            </div>

            {footerCols.map((col, idx) => (
              <div key={idx} className="space-y-3">
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-200 tracking-wider uppercase">
                  {col.heading[lang]}
                </h3>
                <ul className="space-y-2">
                  {col.links.map((lnk) => (
                    <li key={lnk.href}>
                      <Link
                        to={localizedPath(lnk.href)}
                        className="text-xs text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors py-1 inline-block"
                      >
                        {lnk.label[lang]}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Copyright Bar */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Lock size={13} className="text-slate-400" />
              <span>&copy; {new Date().getFullYear()} Mizan Page ({SITE_URL}). All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ================= FLOATING MOBILE-FIRST CONTROLS & STICKY ADS ================= */}

      {/* Mobile Back-To-Top Button (Minimum Touch Target size 48px) */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          aria-label={lang === "ar" ? "الرجوع إلى أعلى الصفحة" : "Scroll to top"}
          className="fixed bottom-20 sm:bottom-8 rtl:left-4 ltr:right-4 z-40 min-h-[48px] min-w-[48px] bg-primary text-primary-foreground rounded-2xl shadow-xl border border-primary/20 flex items-center justify-center active:scale-90 transition-all duration-200 cursor-pointer"
        >
          <ArrowUp size={20} />
        </button>
      )}

      {/* Mobile Sticky Bottom Floating Ad Sheet */}
      {showMobileStickyAd && (
        <aside
          aria-label={t("sponsor_title")}
          className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border shadow-2xl p-1.5 flex flex-col items-center animate-in slide-in-from-bottom duration-300"
        >
          <div className="w-full flex items-center justify-between px-2 pb-1">
            <span className="text-[9px] font-bold text-muted-foreground uppercase">إعلان راعي - Sponsor</span>
            <button
              onClick={() => setShowMobileStickyAd(false)}
              aria-label={t("close_ad")}
              className="p-1 min-h-[32px] min-w-[32px] rounded-lg text-muted-foreground hover:bg-muted active:scale-95 transition flex items-center justify-center"
            >
              <X size={14} />
            </button>
          </div>
          <div className="w-full max-h-[60px] flex items-center justify-center overflow-hidden">
            <AdSlot slotId="9988776655" format="horizontal" ariaLabel="Mobile Sticky Advertisement" className="my-0" />
          </div>
        </aside>
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        lang={lang}
        dir={dir}
      />
    </div>
  );
}