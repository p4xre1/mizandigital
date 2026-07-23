"use client";

import { useEffect, useRef, useState } from "react";

interface TurnstileProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: "auto" | "light" | "dark";
  size?: "normal" | "compact" | "flexible";
}

// Official Cloudflare dummy site key for testing (Passes verification in dev mode)
const DEMO_TEST_SITE_KEY = "1x00000000000000000000AA";

export function TurnstileCaptcha({
  onVerify,
  onError,
  onExpire,
  theme = "auto",
  size = "normal",
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Direct static evaluation so Vite / Next.js can resolve env variables at build time
    const siteKey =
      import.meta.env?.VITE_TURNSTILE_SITE_KEY ||
      process.env?.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
      DEMO_TEST_SITE_KEY;

    let isMounted = true;
    let pollInterval: NodeJS.Timeout;
    let pollAttempts = 0;
    const MAX_POLL_ATTEMPTS = 50; // Timeout after 5 seconds if script fails to load

    const renderWidget = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { turnstile } = window as any;

      if (turnstile && containerRef.current && !widgetIdRef.current) {
        try {
          widgetIdRef.current = turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme: theme,
            size: size,
            callback: (token: string) => {
              if (isMounted) onVerify(token);
            },
            "error-callback": () => {
              if (isMounted && onError) onError();
            },
            "expired-callback": () => {
              if (isMounted && onExpire) onExpire();
            },
          });

          if (isMounted) setIsLoaded(true);
        } catch (err) {
          console.error("Cloudflare Turnstile render error:", err);
        }
      }
    };

    // Fast check or poll until Turnstile script is injected by Cloudflare CDN
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).turnstile) {
      renderWidget();
    } else {
      pollInterval = setInterval(() => {
        pollAttempts += 1;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).turnstile) {
          renderWidget();
          clearInterval(pollInterval);
        } else if (pollAttempts >= MAX_POLL_ATTEMPTS) {
          clearInterval(pollInterval);
          console.error("Cloudflare Turnstile script failed to load after 5s.");
        }
      }, 100);
    }

    // Cleanup on unmount or re-render
    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (widgetIdRef.current && (window as any).turnstile) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).turnstile.remove(widgetIdRef.current);
        } catch {
          /* Ignore cleanup errors */
        }
        widgetIdRef.current = null;
      }
    };
  }, [onVerify, onError, onExpire, theme, size]);

  return (
    <div className="my-3 w-full flex flex-col items-center justify-center min-h-[65px] overflow-hidden select-none touch-manipulation">
      {/* Loading Skeleton */}
      {!isLoaded && (
        <div className="w-[300px] h-[65px] rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 animate-pulse flex items-center justify-center text-xs text-slate-400 font-medium">
          🔒 Verifying connection...
        </div>
      )}

      <div
        ref={containerRef}
        className={`transition-opacity duration-300 max-w-full overflow-hidden ${
          isLoaded ? "opacity-100 block" : "opacity-0 absolute"
        }`}
      />
    </div>
  );
}