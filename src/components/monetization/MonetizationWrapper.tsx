"use client";

import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router";
import { Lock, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  useI18n,
  useLocalizedPath,
  serifFont,
  sansFont,
  type Lang,
} from "@/lib/i18n";
import { useRole } from "@/hooks/useRole";

// Multilingual helper type
type L = Record<Lang, string>;
const t4 = (ar: string, fr: string, en: string, es: string): L => ({
  ar,
  fr,
  en,
  es,
});

// Translations
const txt = {
  lockedTitle: t4(
    "ميزة حصرية للمشتركين",
    "Fonctionnalité exclusive Premium",
    "Premium Exclusive Tool",
    "Función exclusiva Premium"
  ),
  lockedDesc: t4(
    "اشترك في باقة ميزان بريميوم لتحميل مذكرات القانون والقضايا بصيغ قابلة للتعديل وبدون أي قيود.",
    "Abonnez-vous à Mizan Premium pour télécharger les documents et jurisprudences sans aucune restriction.",
    "Upgrade your account to gain instant, unrestricted access to dynamic templates, word file downloads, and annotations.",
    "Suscríbase a Mizan Premium para descargar documentos y jurisprudencia sin ninguna restricción."
  ),
  unlockBtn: t4(
    "ترقية الحساب الآن",
    "Débloquer la version Premium",
    "Unlock Premium Instantly",
    "Desbloquear Premium ahora"
  ),
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
  adSubtitle: t4(
    "تختفي هذه الإعلانات تلقائياً عند الاشتراك.",
    "Ces annonces disparaissent automatiquement avec un abonnement.",
    "Upgrade to Premium to remove all display banners.",
    "Actualice a Premium para eliminar todos los anuncios."
  ),
  adSimulation: t4(
    "محاكاة النقرات على الإعلان",
    "Simulation de clic publicitaire",
    "Ad click simulation",
    "Simulación de clic publicitario"
  ),
  adNotConfigured: t4(
    "لم يتم تكوين AdSense. قم بضبط VITE_GOOGLE_ADSENSE_CLIENT_ID في بيئتك.",
    "AdSense non configuré. Définissez VITE_GOOGLE_ADSENSE_CLIENT_ID dans votre environnement.",
    "AdSense client not configured. Set VITE_GOOGLE_ADSENSE_CLIENT_ID in your environment.",
    "AdSense no configurado. Establezca VITE_GOOGLE_ADSENSE_CLIENT_ID en su entorno."
  ),
};

interface MonetizationWrapperProps {
  children: React.ReactNode;
  /**
   * If true, this wrapper hides the contents behind a blurred wall for free users.
   * If false, it acts as a dynamic ad injector (shows ads to free users, hides them for premium).
   */
  lockFeature?: boolean;
  /** Optional custom placeholder text for locked features */
  featureTitle?: string;
}

export default function MonetizationWrapper({
  children,
  lockFeature = false,
  featureTitle,
}: MonetizationWrapperProps) {
  const { lang, dir } = useI18n();
  const localizedPath = useLocalizedPath();
  const { isPremium, isLoading: roleLoading } = useRole();
  const [adClicks, setAdClicks] = useState<number>(0);
  const [hideAds, setHideAds] = useState(false);
  const adPushedRef = useRef(false);

  const AD_CLIENT_ID = import.meta.env
    .VITE_GOOGLE_ADSENSE_CLIENT_ID as string | undefined;

  // Determine if loading indicator should be shown
  const isLoading = isSupabaseConfigured && roleLoading;

  // Automatically hide ads if user has premium status
  useEffect(() => {
    if (isPremium) {
      setHideAds(true);
    }
  }, [isPremium]);

  // Fraud protection / Anti-spam timeout simulation
  useEffect(() => {
    if (adClicks > 2) {
      const timeout = setTimeout(() => setHideAds(true), 10 * 60 * 1000); // 10 minutes temporary hide
      return () => clearTimeout(timeout);
    }
  }, [adClicks]);

  const shouldShowAds = !hideAds && !isPremium;

  // Safe Google AdSense Injection
  useEffect(() => {
    if (
      !AD_CLIENT_ID ||
      !shouldShowAds ||
      adPushedRef.current ||
      typeof window === "undefined"
    )
      return;

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
  }, [AD_CLIENT_ID, shouldShowAds]);

  // Loading indicator
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center p-8 min-h-[150px]"
        aria-label="Loading content status"
      >
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  // ── CASE A: Gated Feature Protection (PDF Downloads, Case Commentaries, etc.) ──
  if (lockFeature && !isPremium) {
    return (
      <div
        className="relative border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden my-6 bg-white dark:bg-slate-900 shadow-xs transition-colors"
        dir={dir}
      >
        {/* Blurred Foreground Preview (Hidden from screen readers) */}
        <div
          aria-hidden="true"
          className="p-6 select-none pointer-events-none filter blur-md opacity-25 dark:opacity-20 transition-all duration-300"
        >
          {children}
        </div>

        {/* Dynamic Lock Overlay */}
        <div className="absolute inset-0 bg-white/60 dark:bg-slate-950/70 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-10">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 animate-pulse">
            <Lock size={20} className="fill-current" />
          </div>

          <h3
            className="font-extrabold text-lg text-slate-900 dark:text-slate-100 px-4"
            style={{ fontFamily: serifFont(lang) }}
          >
            {featureTitle || txt.lockedTitle[lang]}
          </h3>

          <p
            className="text-xs text-slate-600 dark:text-slate-400 mt-2 max-w-sm px-4 leading-relaxed"
            style={{ fontFamily: sansFont(lang) }}
          >
            {txt.lockedDesc[lang]}
          </p>

          <Link
            to={localizedPath("/pricing")}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all touch-manipulation min-h-[42px]"
            style={{ fontFamily: sansFont(lang) }}
          >
            <Sparkles
              size={13}
              className="fill-current animate-pulse shrink-0"
              aria-hidden="true"
            />
            <span>{txt.unlockBtn[lang]}</span>
            <ArrowRight
              size={13}
              className="shrink-0 rtl:rotate-180"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    );
  }

  // ── CASE B: Dynamic Google Ad Injection (Displays for Free Tier Users) ──
  if (!lockFeature && shouldShowAds) {
    return (
      <div className="space-y-4" dir={dir}>
        {/* Core Content */}
        {children}

        {/* High-Performance Ad Placement Box */}
        <div className="w-full border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 bg-slate-50/70 dark:bg-slate-900/40 text-center my-6 relative overflow-hidden transition-colors">
          <span className="absolute top-1.5 right-3 text-[9px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase select-none">
            {txt.sponsoredTag[lang]}
          </span>
          <div className="flex flex-col items-center justify-center min-h-[100px] text-slate-500 dark:text-slate-400">
            <span
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              style={{ fontFamily: sansFont(lang) }}
            >
              {txt.adTitle[lang]}
            </span>
            <span
              className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5"
              style={{ fontFamily: sansFont(lang) }}
            >
              {txt.adSubtitle[lang]}
            </span>

            {AD_CLIENT_ID ? (
              <ins
                className="adsbygoogle block mx-auto my-2"
                style={{ display: "block", minHeight: 90 }}
                data-ad-client={AD_CLIENT_ID}
                data-ad-slot="1234567890"
                data-ad-format="auto"
                data-full-width-responsive="true"
              />
            ) : (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 px-4 max-w-md">
                {txt.adNotConfigured[lang]}
              </p>
            )}

            <button
              type="button"
              onClick={() => setAdClicks((count) => count + 1)}
              className="mt-3 text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer touch-manipulation min-h-[32px] px-2 py-1"
            >
              {txt.adSimulation[lang]}: {adClicks}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── CASE C: Premium Tier or Ads Hidden ──
  return <>{children}</>;
}