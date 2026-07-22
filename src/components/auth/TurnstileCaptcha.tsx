"use client";

import React, { useEffect, useRef, useState } from "react";

interface TurnstileProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: "auto" | "light" | "dark";
  size?: "normal" | "compact" | "flexible";
}

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
    // Universal Env Variable Resolution (Next.js & Vite compatible)
    const siteKey =
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
      (typeof import.meta !== "undefined" &&
        import.meta.env?.VITE_TURNSTILE_SITE_KEY) ||
      "";

    if (!siteKey) {
      console.warn("Turnstile Site Key is missing in environment variables.");
      return;
    }

    let isMounted = true;
    let pollInterval: NodeJS.Timeout;

    const renderWidget = () => {
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

    // Fast check or poll until script is ready on mobile network connection
    if ((window as any).turnstile) {
      renderWidget();
    } else {
      pollInterval = setInterval(() => {
        if ((window as any).turnstile) {
          renderWidget();
          clearInterval(pollInterval);
        }
      }, 100);
    }

    // Cleanup on component unmount
    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
      if (widgetIdRef.current && (window as any).turnstile) {
        try {
          (window as any).turnstile.remove(widgetIdRef.current);
        } catch (_) {}
        widgetIdRef.current = null;
      }
    };
  }, [onVerify, onError, onExpire, theme, size]);

  return (
    <div className="my-3 w-full flex flex-col items-center justify-center min-h-[65px] overflow-hidden select-none touch-manipulation">
      {/* Loading Skeleton for Slow Mobile Connections */}
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