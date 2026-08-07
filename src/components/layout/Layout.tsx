/* eslint-disable */
// noinspection SpellCheckingInspection
/* cspell:disable */

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/lib/supabase";

export type SupportedLang = "ar" | "fr" | "en" | "es";

// ─── Constants (move outside component) ───────────────────────
const SITE_URL = import.meta.env.VITE_SITE_URL || "https://www.mizan.page";
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_ID;
const ADSENSE_CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID;

// ─── AdSlot Component ────────────────────────────────────────
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
      if (typeof window !== "undefined" && (window as any).adsbygoogle) {
        (window as any).adsbygoogle.push({});
      }
    } catch {
      setAdFailed(true);
    }
  }, [slotId]); // ← re-run when slot changes only

  if (adFailed || !ADSENSE_CLIENT_ID) return null;

  return (
    <aside
      aria-label={ariaLabel}
      className={`w-full overflow-hidden flex flex-col items-center justify-center my-3 ${className}`}
    >
      <span className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase mb-1 opacity-50 select-none">
        إعلان - Advertisement
      </span>
      <div className="w-full bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl min-h-[90px] flex items-center justify-center overflow-hidden">
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

// ─── Google Scripts (load once globally) ─────────────────────
const GoogleScripts: React.FC = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // GA4
    if (GA_MEASUREMENT_ID && !document.getElementById("ga-script")) {
      const gaScript = document.createElement("script");
      gaScript.id = "ga-script";
      gaScript.async = true;
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      document.head.appendChild(gaScript);

      const gaConfig = document.createElement("script");
      gaConfig.id = "ga-config";
      gaConfig.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GA_MEASUREMENT_ID}', { page_path: window.location.pathname });
      `;
      document.head.appendChild(gaConfig);
    }

    // AdSense
    if (ADSENSE_CLIENT_ID && !document.getElementById("adsense-script")) {
      const adScript = document.createElement("script");
      adScript.id = "adsense-script";
      adScript.async = true;
      adScript.crossOrigin = "anonymous";
      adScript.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
      document.head.appendChild(adScript);
    }
  }, []);

  return null;
};

// ─── Main Layout ─────────────────────────────────────────────
export function Layout({ lang: propLang, dir: propDir }: { lang?: SupportedLang; dir?: "rtl" | "ltr" }) {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showMobileStickyAd, setShowMobileStickyAd] = useState(true);
  const [authUser, setAuthUser] = useState<any>(null);

  const { lang: urlLang } = useParams<{ lang: string }>();
  const location = useLocation();
  const { role, isStaff } = useRole();

  // Language detection
  const validLangs: SupportedLang[] = useMemo(() => ["ar", "fr", "en", "es"], []);
  const lang: SupportedLang = useMemo(() => {
    if (propLang && validLangs.includes(propLang)) return propLang;
    if (urlLang && validLangs.includes(urlLang as SupportedLang)) return urlLang as SupportedLang;
    return "ar";
  }, [propLang, urlLang, validLangs]);

  const dir: "rtl" | "ltr" = propDir || (lang === "ar" ? "rtl" : "ltr");

  // ─── Auth State (shared with Navbar via context or props) ─
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setAuthUser(user));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ─── Scroll Listener ──────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 350);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // ─── Helpers ──────────────────────────────────────────────
  const localizedPath = useCallback((path: string) => {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return cleanPath === "/" ? `/${lang}` : `/${lang}${cleanPath}`;
  }, [lang]);

  // ─── Translations ─────────────────────────────────────────
  const t = useCallback((key: string) => {
    const dict: Record<string, Record<SupportedLang, string>> = {
      brand: {
        ar: "منصة ميزان الرقمية",
        fr: "Plateforme Numérique Mizan",
        en: "Mizan Digital Platform",
        es: "Plataforma Digital Mizan",
      },
      description: {
        ar: "المكتبة القانونية والأرشيف الأكاديمي الموحد للقرارات القضائية والبحوث الجامعية.",
        fr: "Bibliothèque juridique et archives académiques unifiées.",
        en: "Unified legal library and academic archives for court decisions and law research.",
        es: "Biblioteca legal unificada y archivos académico para resoluciones judiciales.",
      },
      keywords: {
        ar: "قانون, ميزان, أرشيف قضائي, قرارات محكمة النقض, مذكرات قانونية, المغرب",
        fr: "droit, mizan, archives judiciaires, cour de cassation, mémoires juridiques, maroc",
        en: "law, mizan, judicial archives, supreme court rulings, legal briefs, morocco",
        es: "derecho, mizan, archivos judiciales, jurisprudencia, memorandos legales, marruecos",
      },
      security_badge: {
        ar: "حماية مشفرة وفق معايير SSL 256-Bit",
        fr: "Protection chiffrée SSL 256-Bit",
        en: "Encrypted protection with SSL 256-Bit",
        es: "Protección cifrada con SSL 256-Bit",
      },
      sponsor_title: {
        ar: "الأرشيف الرقمي والاجتهادات القضائية",
        fr: "Archives Numériques & Jurisprudence",
        en: "Unified Digital Archives & Legal Precedents",
        es: "Archivos Digitales Unificados y Jurisprudencia",
      },
      sponsor_desc: {
        ar: "وصول سريع لأحدث أبحاث الماستر والقرارات القضائية بصيغ PDF.",
        fr: "Accès rapide aux recherches de master et décisions de justice en PDF.",
        en: "Fast access to master's research and court rulings in PDF format.",
        es: "Acceso rápido a tesis de máster y resoluciones judiciales en PDF.",
      },
      browse_archive: { ar: "تصفح الأرشيف", fr: "Explorer", en: "Browse", es: "Explorar" },
      close_ad: { ar: "إغلاق", fr: "Fermer", en: "Close", es: "Cerrar" },
      top_banner_ad: { ar: "إعلان", fr: "Publicité", en: "Advertisement", es: "Anuncio" },
    };
    return dict[key]?.[lang] || key;
  }, [lang]);

  // ─── Schema.org ───────────────────────────────────────────
  const schemaData = useMemo(() => {
    const pathWithoutLang = location.pathname.replace(/^\/(ar|fr|en|es)/, "") || "/";
    const currentUrl = `${SITE_URL}/${lang}${pathWithoutLang}`;
    
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          url: SITE_URL,
          name: "Mizan Digital",
          inLanguage: lang,
        },
        {
          "@type": "WebPage",
          url: currentUrl,
          name: t("brand"),
        },
      ],
    };
  }, [lang, location.pathname, t]);

  // ─── Footer Data ──────────────────────────────────────────
  const footerCols = useMemo(() => [
    {
      heading: { ar: "الأقسام", fr: "Sections", en: "Sections", es: "Secciones" },
      links: [
        { href: "/archive", label: { ar: "الأرشيف", fr: "Archives", en: "Archive", es: "Archivo" } },
        { href: "/library", label: { ar: "المكتبة", fr: "Bibliothèque", en: "Library", es: "Biblioteca" } },
        { href: "/schools", label: { ar: "الكليات", fr: "Facultés", en: "Schools", es: "Facultades" } },
      ],
    },
    {
      heading: { ar: "المنصة", fr: "Plateforme", en: "Platform", es: "Plataforma" },
      links: [
        { href: "/about", label: { ar: "عن المنصة", fr: "À Propos", en: "About", es: "Acerca de" } },
        { href: "/legal-qa", label: { ar: "استشارات", fr: "Consultations", en: "Legal Q&A", es: "Consultas" } },
      ],
    },
  ], []);

  return (
    <div
      dir={dir}
      className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-primary selection:text-primary-foreground font-sans transition-colors duration-200"
    >
      {/* Google Scripts (load once) */}
      <GoogleScripts />

      {/* SEO Head */}
      <Helmet>
        <html lang={lang} dir={dir} />
        <title>{t("brand")}</title>
        <meta name="description" content={t("description")} />
        <meta name="keywords" content={t("keywords")} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        
        <link rel="canonical" href={`${SITE_URL}${location.pathname}`} />
        {validLangs.map((l) => (
          <link 
            key={l} 
            rel="alternate" 
            hrefLang={l} 
            href={`${SITE_URL}/${l}${location.pathname.replace(/^\/(ar|fr|en|es)/, "")}`} 
          />
        ))}

        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}${location.pathname}`} />
        <meta property="og:title" content={t("brand")} />
        <meta property="og:description" content={t("description")} />
        <meta property="og:locale" content={lang === "ar" ? "ar_MA" : lang === "fr" ? "fr_FR" : lang === "es" ? "es_ES" : "en_US"} />

        <script type="application/ld+json">{JSON.stringify(schemaData)}</script>
      </Helmet>

      {/* Navbar (has its own AuthModal) */}
      <Navbar />

      {/* Top Ad */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 w-full pt-3">
        <AdSlot slotId="1020304050" format="horizontal" className="max-h-[100px]" />
      </div>

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className="flex-1 w-full relative outline-none">
        <Outlet />
      </main>

      {/* Mid Ad */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 w-full my-6">
        <AdSlot slotId="6070809001" format="auto" />
      </div>

      {/* Footer */}
      <footer className="w-full bg-slate-100 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 pt-10 pb-28 sm:pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Sponsor CTA */}
          <div className="mb-10 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-slate-950 border border-blue-500/30 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="space-y-1.5 text-center sm:text-start">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                  <Megaphone size={12} />
                  {lang === "ar" ? "الأبحاث" : "Research"}
                </span>
                {isStaff && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {role}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">{t("sponsor_title")}</h2>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xl">{t("sponsor_desc")}</p>
            </div>
            <Link
              to={localizedPath("/archive")}
              className="flex-1 sm:flex-none min-h-[48px] px-5 py-2.5 flex items-center justify-center text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl active:scale-95 transition shadow-lg"
            >
              {t("browse_archive")}
            </Link>
          </div>

          {/* Footer Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-slate-200 dark:border-slate-800">
            <div className="lg:col-span-2 space-y-4">
              <Link to={localizedPath("/")} className="flex items-center gap-3 active:scale-98 transition-transform">
                <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-black shadow-md">
                  <Scale size={22} />
                </div>
                <span className="font-extrabold text-slate-900 dark:text-slate-100 text-lg leading-tight">
                  {t("brand")}
                </span>
              </Link>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm">
                {t("description")}
              </p>
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

          {/* Copyright */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Lock size={13} className="text-slate-400" />
              <span>&copy; {new Date().getFullYear()} Mizan Page. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Scroll to Top */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className="fixed bottom-20 sm:bottom-8 rtl:left-4 ltr:right-4 z-40 min-h-[48px] min-w-[48px] bg-primary text-primary-foreground rounded-2xl shadow-xl flex items-center justify-center active:scale-90 transition-all"
        >
          <ArrowUp size={20} />
        </button>
      )}

      {/* Mobile Sticky Ad */}
      {showMobileStickyAd && (
        <aside className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border shadow-2xl p-1.5 flex flex-col items-center">
          <div className="w-full flex items-center justify-between px-2 pb-1">
            <span className="text-[9px] font-bold text-muted-foreground uppercase">Sponsor</span>
            <button
              onClick={() => setShowMobileStickyAd(false)}
              className="p-1 min-h-[32px] min-w-[32px] rounded-lg text-muted-foreground hover:bg-muted"
            >
              <X size={14} />
            </button>
          </div>
          <div className="w-full max-h-[60px] overflow-hidden">
            <AdSlot slotId="9988776655" format="horizontal" className="my-0" />
          </div>
        </aside>
      )}
    </div>
  );
}

export default Layout;
