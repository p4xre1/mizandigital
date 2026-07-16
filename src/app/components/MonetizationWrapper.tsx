import React, { useEffect, useState } from "react";
import { Lock, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useI18n } from "../lib/i18n";

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
  const { t, dir } = useI18n();
  const [tier, setTier] = useState<"free" | "premium" | "enterprise" | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch active subscription tier on load
  useEffect(() => {
    async function checkSubscription() {
      if (!isSupabaseConfigured) {
        setTier("free"); // Default to free if database is disconnected
        setLoading(false);
        return;
      }
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from("profiles")
            .select("tier")
            .eq("id", user.id)
            .single();

          if (!error && data?.tier) {
            setTier(data.tier as "free" | "premium" | "enterprise");
          } else {
            setTier("free");
          }
        } else {
          setTier("free"); // Unauthenticated users are treated as free tier
        }
      } catch {
        setTier("free");
      } finally {
        setLoading(false);
      }
    }
    checkSubscription();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[150px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const isPremium = tier === "premium" || tier === "enterprise";

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
            href="/pricing"
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
  if (!lockFeature && !isPremium) {
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
          </div>
        </div>
      </div>
    );
  }

  // --- CASE C: User is Premium/Enterprise ---
  // Core layout renders raw, untouched, and lightning fast. No Ads, No Locks!
  return <>{children}</>;
}