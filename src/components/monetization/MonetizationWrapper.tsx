"use client";

import React, { useEffect, useRef } from "react";
import { useI18n, sansFont, type Lang } from "@/lib/i18n";

// Helper for multilingual translations
type L = Record<Lang, string>;
const t4 = (ar: string, fr: string, en: string, es: string): L => ({
  ar,
  fr,
  en,
  es,
});

// Cleaned Translations (Ads only)
const txt = {
  sponsoredTag: t4(
    "إعلان ممول",
    "Annonce sponsorisée",
    "Sponsored Advertisement",
    "Anuncio patrocinado"
  ),
  adTitle: t4(
    "إعلان غوغل التفاعلي",
    "Espace publicitaire interactif Google",
    "Google Responsive Ad Slot",
    "Espacio publicitario interactivo de Google"
  ),
};

interface MonetizationWrapperProps {
  children: React.ReactNode;
  /** Optional custom placement slot ID if needed */
  adSlot?: string;
  /** Option to disable ads on specific pages */
  showAd?: boolean;
}

export default function MonetizationWrapper({
  children,
  adSlot = "1234567890",
  showAd = true,
}: MonetizationWrapperProps) {
  const { lang, dir } = useI18n();
  const adPushedRef = useRef(false);

  // Fallback to client ID if env variable is missing
  const AD_CLIENT_ID =
    (import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT_ID as string) ||
    "ca-pub-1749032173858747";

  // Safe Google AdSense Script Injection & Push
  useEffect(() => {
    if (!showAd || adPushedRef.current || typeof window === "undefined") return;

    const pushAd = () => {
      try {
        const win = window as unknown as { adsbygoogle?: unknown[] };
        win.adsbygoogle = win.adsbygoogle || [];
        win.adsbygoogle.push({});
        adPushedRef.current = true;
      } catch (err) {
        console.warn("AdSense push failed:", err);
      }
    };

    const loadAdsenseScript = () => {
      const existing = document.querySelector<HTMLScriptElement>(
        "script[src*='pagead2.googlesyndication.com/pagead/js/adsbygoogle.js']"
      );
      if (existing) {
        pushAd();
        return;
      }

      const script = document.createElement("script");
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT_ID}`;
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      script.onload = () => pushAd();
      document.head.appendChild(script);
    };

    const win = window as unknown as {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number }
      ) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof win.requestIdleCallback === "function") {
      const idleId = win.requestIdleCallback(loadAdsenseScript, {
        timeout: 2000,
      });
      return () => win.cancelIdleCallback?.(idleId);
    } else {
      const timeoutId = window.setTimeout(loadAdsenseScript, 2000);
      return () => window.clearTimeout(timeoutId);
    }
  }, [AD_CLIENT_ID, showAd]);

  return (
    <div className="space-y-4" dir={dir}>
      {/* Dynamic Content */}
      {children}

      {/* Optimized AdSense Display Box */}
      {showAd && (
        <div className="w-full border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 bg-slate-50/70 dark:bg-slate-900/40 text-center my-6 relative overflow-hidden transition-colors">
          <span className="absolute top-1.5 right-3 text-[9px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase select-none">
            {txt.sponsoredTag[lang]}
          </span>
          <div className="flex flex-col items-center justify-center min-h-[100px] text-slate-500 dark:text-slate-400">
            <span
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2"
              style={{ fontFamily: sansFont(lang) }}
            >
              {txt.adTitle[lang]}
            </span>

            <ins
              className="adsbygoogle block mx-auto w-full"
              style={{ display: "block", minHeight: 90 }}
              data-ad-client={AD_CLIENT_ID}
              data-ad-slot={adSlot}
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          </div>
        </div>
      )}
    </div>
  );
}