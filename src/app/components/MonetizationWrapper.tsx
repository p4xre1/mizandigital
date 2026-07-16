import React, { useEffect, useState } from 'react';
import { supabase } from '../../app/lib/supabase'; // Fallback to your existing Supabase instance

interface Profile {
  tier: 'free' | 'premium' | 'enterprise';
  tenant_id: string | null;
}

interface MonetizationWrapperProps {
  children: React.ReactNode;
  premiumFeature?: React.ReactNode;
  fallbackAdUnitId: 'div-gpt-ad-mizan-sidebar' | 'div-gpt-ad-mizan-leaderboard';
}

export const MonetizationWrapper: React.FC<MonetizationWrapperProps> = ({
  children,
  premiumFeature,
  fallbackAdUnitId
}) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserTier() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('tier, tenant_id')
            .eq('id', user.id)
            .single();

          if (!error && data) {
            setProfile(data as Profile);
          }
        }
      } catch (err) {
        console.error("Failed to load subscriber details", err);
      } finally {
        setLoading(false);
      }
    }

    fetchUserTier();
  }, []);

  // Hydrate Adsense slots if user is free and DOM is ready
  useEffect(() => {
    if (!loading && profile?.tier !== 'premium' && profile?.tier !== 'enterprise') {
      try {
        const windowWithGpt = window as any;
        if (windowWithGpt.googletag && windowWithGpt.googletag.cmd) {
          windowWithGpt.googletag.cmd.push(function() {
            windowWithGpt.googletag.display(fallbackAdUnitId);
          });
        }
      } catch (adError) {
        console.warn("AdSense layout blocked or deferred.", adError);
      }
    }
  }, [loading, profile, fallbackAdUnitId]);

  if (loading) {
    return <div className="h-24 w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md" />;
  }

  const isUserPremium = profile?.tier === 'premium' || profile?.tier === 'enterprise';

  return (
    <div className="w-full relative transition-all duration-300">
      {isUserPremium ? (
        <>
          {/* Active Premium Features */}
          {premiumFeature && (
            <div className="border border-emerald-500/20 bg-emerald-500/5 p-4 rounded-lg my-4">
              <span className="text-[10px] uppercase font-extrabold text-emerald-600 dark:text-emerald-400 tracking-wider">
                Mizan Premium Access
              </span>
              {premiumFeature}
            </div>
          )}
          {children}
        </>
      ) : (
        <>
          {/* Standard Free Experience with Integrated Google Ad Container */}
          <div className="my-6 py-3 border-y border-border flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60 mb-2">Advertisement</span>
            <div 
              id={fallbackAdUnitId}
              className="min-h-[90px] min-w-[320px] md:min-w-[728px] bg-slate-200/40 dark:bg-slate-800/40 flex items-center justify-center rounded text-xs text-muted-foreground"
              aria-label="Google advertisement container"
            >
              <span className="text-[10px] text-muted-foreground/40">Loading Targeted Academic Ad...</span>
            </div>
          </div>

          <div className="relative">
            {children}
            
            {premiumFeature && (
              <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background via-background/95 to-transparent flex flex-col items-center justify-end pb-4 z-10">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  🎓 This is a premium resource. Upgrade or login through your University email to unlock.
                </p>
                <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-xs font-semibold shadow transition-all">
                  Get Instant Access
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};