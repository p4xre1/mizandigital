"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { useI18n, sansFont, type Lang } from "@/lib/i18n";
import { useRole } from "@/hooks/useRole";

// ----------------------------------------------------------------------
// 1. Environment & SEO Master Constants
// ----------------------------------------------------------------------
const VITE_SITE_URL = import.meta.env.VITE_SITE_URL || "https://www.mizan.page";
const VITE_APP_URL = import.meta.env.VITE_APP_URL || "https://www.mizan.page";
const AD_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT_ID as string) ||
  "ca-pub-1749032173858747";

// ----------------------------------------------------------------------
// 2. Multilingual Dictionary (AR, FR, EN, ES)
// ----------------------------------------------------------------------
type TranslationDict = Record<Lang, string>;

const t4 = (ar: string, fr: string, en: string, es: string): TranslationDict => ({
  ar,
  fr,
  en,
  es,
});

const dict = {
  sponsoredTag: t4(
    "إعلان ممول معتمد",
    "Annonce Sponsorisée Vérifiée",
    "Verified Sponsored Ad",
    "Anuncio Patrocinado Verificado"
  ),
  adTitle: t4(
    "إعلان ميزان التفاعلي | وثائق ودراسات قانونية",
    "Espace Publicitaire Mizan | Documents & Études Juridiques",
    "Mizan Interactive Space | Legal Documents & Research",
    "Espacio Publicitario Mizan | Documentos y Estudios Legales"
  ),
  adBlockerNotice: t4(
    "منصة ميزان الرقمية تقدم محتوى قانوني حر عبر إعلانات آمنة وموثوقة",
    "Mizan propose un contenu juridique gratuit soutenu par des annonces sécurisées",
    "Mizan provides free legal research content supported by secure ads",
    "Mizan ofrece contenido jurídico gratuito apoyado por anuncios seguros"
  ),
  verifiedPublisher: t4(
    "منصة ميزان القانونية - Mizan Legal Platform",
    "Plateforme Juridique Mizan",
    "Mizan Legal Platform",
    "Plataforma Legal Mizan"
  ),
};

// ----------------------------------------------------------------------
// 3. Component Interface & Props
// ----------------------------------------------------------------------
export interface MonetizationWrapperProps {
  children: React.ReactNode;
  /** Google AdSense Slot ID */
  adSlot?: string;
  /** Toggle ad display */
  showAd?: boolean;
  /** Ad unit layout style: banner, in-feed, auto, or sticky mobile bottom bar */
  format?: "auto" | "fluid" | "rectangle" | "horizontal" | "vertical";
  /** Optional custom SEO image URL for Master Photo SEO schema */
  featuredImage?: string;
  /** Optional image description for Search Engine crawler optimization */
  imageAlt?: string;
  /** Custom CSS classes */
  className?: string;
}

export default function MonetizationWrapper({
  children,
  adSlot = "1234567890",
  showAd = true,
  format = "auto",
  featuredImage,
  imageAlt,
  className = "",
}: MonetizationWrapperProps) {
  const { lang, dir } = useI18n();
  const { isAdmin, isRoot } = useRole();

  const adPushedRef = useRef(false);
  const [isAdBlocked, setIsAdBlocked] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Exempt internal staff or admins if needed from viewing live ads
  const isExempt = useMemo(() => {
    return isRoot || isAdmin;
  }, [isRoot, isAdmin]);

  // --------------------------------------------------------------------
  // 4. AdSense Loader & Protection Engine
  // --------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    if (!showAd || isExempt || typeof window === "undefined") {
      return;
    }

    // Reset reference state when slot parameters change
    adPushedRef.current = false;

    // Secure execution wrapper for Google Ads push
    const executeAdPush = () => {
      if (adPushedRef.current) return;
      try {
        const win = window as unknown as { adsbygoogle?: unknown[] };
        win.adsbygoogle = win.adsbygoogle || [];
        win.adsbygoogle.push({});
        adPushedRef.current = true;
        if (isMounted) setIsLoaded(true);
      } catch (err) {
        console.warn("[Mizan Security/AdSense] Script push intercepted or blocked:", err);
        if (isMounted) setIsAdBlocked(true);
      }
    };

    // Subresource-safe script loader with cross-origin sandboxing
    const injectAdsenseScript = () => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]`
      );

      if (existingScript) {
        executeAdPush();
        return;
      }

      const script = document.createElement("script");
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT_ID}`;
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      script.referrerPolicy = "no-referrer-when-downgrade";

      script.onload = () => executeAdPush();
      script.onerror = () => {
        if (isMounted) setIsAdBlocked(true);
        console.warn("[Mizan Protection] AdBlocker or Network security active.");
      };

      document.head.appendChild(script);
    };

    // Performance Optimization: Push heavy ad initialization to idle frame
    const win = window as unknown as {
      requestIdleCallback?: (
        cb: () => void,
        opts?: { timeout: number }
      ) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof win.requestIdleCallback === "function") {
      const idleId = win.requestIdleCallback(injectAdsenseScript, { timeout: 1500 });
      return () => {
        isMounted = false;
        win.cancelIdleCallback?.(idleId);
      };
    } else {
      const timeoutId = window.setTimeout(injectAdsenseScript, 1000);
      return () => {
        isMounted = false;
        window.clearTimeout(timeoutId);
      };
    }
  }, [showAd, isExempt, adSlot, format]);

  // --------------------------------------------------------------------
  // 5. Master SEO Structured Data (JSON-LD) with Safe Script Escaping
  // --------------------------------------------------------------------
  const masterSeoSchema = useMemo(() => {
    const defaultImg = `${VITE_SITE_URL}/Logo.svg`;
    const targetImg = featuredImage
      ? featuredImage.startsWith("http")
        ? featuredImage
        : `${VITE_SITE_URL}${featuredImage}`
      : defaultImg;

    const rawSchema = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": `${VITE_APP_URL}/#webpage`,
          url: VITE_APP_URL,
          name: "Mizan Digital Legal Platform | منصة ميزان الرقمية",
          inLanguage: lang,
          publisher: {
            "@type": "Organization",
            name: "Mizan Page",
            url: VITE_SITE_URL,
            logo: {
              "@type": "ImageObject",
              url: `${VITE_SITE_URL}/Logo.svg`,
            },
          },
        },
        {
          "@type": "ImageObject",
          "@id": `${targetImg}#primaryimage`,
          url: targetImg,
          contentUrl: targetImg,
          caption: imageAlt || dict.adTitle[lang],
          inLanguage: lang,
          creditText: "Mizan Legal Media",
        },
      ],
    });

    // Escape < characters to prevent XSS script breakouts
    return rawSchema.replace(/</g, "\\u003c");
  }, [lang, featuredImage, imageAlt]);

  return (
    <div className={`w-full space-y-4 ${className}`} dir={dir}>
      {/* Master Image & Page SEO Injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: masterSeoSchema }}
      />

      {/* Main App Content */}
      <div className="w-full relative z-0">{children}</div>

      {/* --------------------------------------------------------------------
          6. Mobile-First Responsive Ad Container
         -------------------------------------------------------------------- */}
      {showAd && !isExempt && (
        <aside
          aria-label={dict.sponsoredTag[lang]}
          className="w-full my-4 md:my-6 relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-b from-slate-50/90 to-slate-100/50 dark:from-slate-900/60 dark:to-slate-950/40 p-3 sm:p-4 shadow-sm transition-all duration-300"
        >
          {/* Top Bar Label */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/50 dark:border-slate-800/50 text-[10px] sm:text-xs">
            <span className="font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {dict.sponsoredTag[lang]}
            </span>
            <span
              className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[180px] sm:max-w-none"
              style={{ fontFamily: sansFont(lang) }}
            >
              {dict.verifiedPublisher[lang]}
            </span>
          </div>

          {/* Ad Slot & Visual Frame */}
          <div className="flex flex-col items-center justify-center min-h-[100px] sm:min-h-[120px] w-full relative">
            {!isAdBlocked ? (
              <>
                {!isLoaded && (
                  <div className="absolute inset-0 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl animate-pulse flex items-center justify-center">
                    <span className="text-[11px] text-slate-400">Loading ad...</span>
                  </div>
                )}
                <ins
                  className="adsbygoogle block w-full mx-auto"
                  style={{
                    display: "block",
                    minHeight: "90px",
                    overflow: "hidden",
                  }}
                  data-ad-client={AD_CLIENT_ID}
                  data-ad-slot={adSlot}
                  data-ad-format={format}
                  data-full-width-responsive="true"
                />
              </>
            ) : (
              /* Fallback UI when AdBlocker is active to prevent CLS layout collapse */
              <div className="py-4 px-3 text-center text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                <p style={{ fontFamily: sansFont(lang) }} className="leading-relaxed font-medium">
                  {dict.adBlockerNotice[lang]}
                </p>
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}