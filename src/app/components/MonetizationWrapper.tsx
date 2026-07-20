import React, { useEffect, useState } from "react";
import { Lock, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { isSupabaseConfigured } from "../lib/supabase";
import { useI18n, useLocalizedPath } from "../lib/i18n";
import { useRole } from "../hooks/useRole";

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
  featureTitle
}: MonetizationWrapperProps) {
  const { dir } = useI18n();
  const localizedPath = useLocalizedPath();
  const { isPremium, isLoading: roleLoading } = useRole();
  const [adClicks, setAdClicks] = useState<number>(0);
  const [hideAds, setHideAds] = useState(false);
  const [adsLoaded, setAdsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const AD_CLIENT_ID = (import.meta.env as any).VITE_GOOGLE_ADSENSE_CLIENT_ID as string | undefined;

  useEffect(() => {
    async function checkLoad() {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }
      setLoading(roleLoading);
    }
    void checkLoad();
  }, [roleLoading]);

  useEffect(() => {
    if (isPremium) {
      setHideAds(true);
    }
  }, [isPremium]);

  useEffect(() => {
    if (adClicks > 2) {
      const timeout = setTimeout(() => setHideAds(true), 10 * 60 * 1000);
      return () => clearTimeout(timeout);
    }
  }, [adClicks]);

  const shouldShowAds = !hideAds && !isPremium;

  useEffect(() => {
    if (!AD_CLIENT_ID || !shouldShowAds || adsLoaded || typeof window === "undefined") return;

    const loadAdsense = () => {
      const existing = document.querySelector<HTMLScriptElement>("script[src*='pagead2.googlesyndication.com/pagead/js/adsbygoogle.js']");
      if (existing) {
        (window as any).adsbygoogle = (window as any).adsbygoogle || [];
        (window as any).adsbygoogle.push({});
        setAdsLoaded(true);
        return;
      }

      const script = document.createElement("script");
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT_ID}`;
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      script.onload = () => {
        (window as any).adsbygoogle = (window as any).adsbygoogle || [];
        (window as any).adsbygoogle.push({});
        setAdsLoaded(true);
      };
      document.head.appendChild(script);
    };

    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(loadAdsense, { timeout: 2000 });
    } else {
      const timeout = window.setTimeout(loadAdsense, 2000);
      return () => window.clearTimeout(timeout);
    }
  }, [AD_CLIENT_ID, shouldShowAds, adsLoaded]);

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[150px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // --- CASE A: Gated Feature Protection (e.g. PDF Downloads, Case Commentaries) ---
  if (lockFeature && !isPremium) {
    return (
      <div className="relative border border-border rounded-2xl overflow-hidden my-6 bg-card">
        {/* Blurred Foreground Preview */}
        <div className="p-6 select-none pointer-events-none filter blur-sm opacity-30 transition-all duration-300">
          {children}
        </div>

        {/* Dynamic Lock Overlay */}
        <div className="absolute inset-0 bg-background/40 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-10">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 animate-pulse">
            <Lock size={20} className="fill-primary/10" />
          </div>
          
          <h3 className="font-extrabold text-lg text-foreground px-4" style={{ fontFamily: "'Playfair Display', 'Noto Serif Arabic', serif" }}>
            {featureTitle || (dir === "rtl" ? "ميزة حصرية للمشتركين" : "Premium Exclusive Tool")}
          </h3>
          
          <p className="text-xs text-muted-foreground mt-2 max-w-sm px-4">
            {dir === "rtl" 
              ? "اشترك في باقة ميزان بريميوم لتحميل مذكرات القانون والقضايا بصيغ قابلة للتعديل وبدون أي قيود."
              : "Upgrade your account to gain instant, unrestricted access to dynamic templates, word file downloads, and annotations."}
          </p>

          <a 
            href={localizedPath("/pricing")}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl shadow hover:opacity-95 transition-opacity"
          >
            <Sparkles size={13} className="fill-current" />
            <span>{dir === "rtl" ? "ترقية الحساب الآن" : "Unlock Premium Instantly"}</span>
            <ArrowRight size={13} className={`transform ${dir === "rtl" ? "rotate-180" : ""}`} />
          </a>
        </div>
      </div>
    );
  }

  // --- CASE B: Dynamic Google Ad Injection (Only displays when on Free tier) ---
  if (!lockFeature && shouldShowAds) {
    return (
      <div className="space-y-4">
        {/* Inject Core Content */}
        {children}

        {/* Inject High-Performance Ad Placement Box */}
        <div className="w-full border border-dashed border-border rounded-xl p-4 bg-muted/40 text-center my-6 relative overflow-hidden">
          <span className="absolute top-1 right-2 text-[9px] font-bold tracking-widest text-muted-foreground/40 uppercase">
            {dir === "rtl" ? "إعلان ممول" : "Sponsored Advertisement"}
          </span>
          <div className="flex flex-col items-center justify-center min-h-[100px] text-muted-foreground">
            <span className="text-xs font-semibold">{dir === "rtl" ? "إعلان غوغل التفاعلي" : "Google Responsive Ad Slot"}</span>
            <span className="text-[10px] text-muted-foreground/60 mt-1">
              {dir === "rtl" ? "تختفي هذه الإعلانات تلقائياً عند الاشتراك." : "Upgrade to Premium to remove all display banners."}
            </span>
            {AD_CLIENT_ID ? (
              <ins
                className="adsbygoogle block mx-auto"
                style={{ display: "block", minHeight: 90 }}
                data-ad-client={AD_CLIENT_ID}
                data-ad-slot="1234567890"
                data-ad-format="auto"
                data-full-width-responsive="true"
              />
            ) : (
              <p className="text-[10px] text-muted-foreground/80 mt-2">AdSense client not configured. Set VITE_GOOGLE_ADSENSE_CLIENT_ID in your environment.</p>
            )}
            <button
              type="button"
              onClick={() => setAdClicks((count) => count + 1)}
              className="mt-3 text-[11px] text-primary hover:underline"
            >
              {dir === "rtl" ? "النقرات على الإعلان" : "Ad click simulation"}: {adClicks}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- CASE C: User is Premium or ads are hidden due to fraud protection ---
  return <>{children}</>;
}