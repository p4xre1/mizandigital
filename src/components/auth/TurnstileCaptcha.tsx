"use client";

import { useEffect, useRef, useState } from "react";

// Official Cloudflare Turnstile API Types
interface TurnstileRenderOptions {
  // noinspection SpellCheckingInspection
  sitekey: string;
  theme?: "auto" | "light" | "dark";
  size?: "normal" | "compact" | "flexible";
  callback?: (token: string) => void;
  "error-callback"?: () => void;
  "expired-callback"?: () => void;
}

interface TurnstileInstance {
  render: (
      container: string | HTMLElement,
      options: TurnstileRenderOptions
  ) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileInstance;
  }
}

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
  const [loadFailed, setLoadFailed] = useState(false);

  const onVerifyRef = useRef(onVerify);
  const onErrorRef = useRef(onError);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onErrorRef.current = onError;
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    // Multi-environment site key extraction
    const siteKey =
        import.meta.env?.VITE_CLOUDFLARE_SITE_KEY ||
        import.meta.env?.VITE_TURNSTILE_SITE_KEY ||
        process.env?.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

    if (!siteKey) {
      console.error(
          "Turnstile Error: Missing Site Key in environment variables!"
      );
      setLoadFailed(true);
      return;
    }

    let isMounted = true;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    // 1. Inject Cloudflare Turnstile API Script
    const SCRIPT_ID = "cf-turnstile-script";
    if (!document.getElementById(SCRIPT_ID) && !window.turnstile) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    // 2. Render Widget Function
    const renderWidget = () => {
      if (window.turnstile && containerRef.current && !widgetIdRef.current) {
        try {
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            // noinspection SpellCheckingInspection
            sitekey: siteKey,
            theme,
            size,
            callback: (token: string) => {
              if (isMounted) onVerifyRef.current(token);
            },
            "error-callback": () => {
              if (isMounted && onErrorRef.current) onErrorRef.current();
            },
            "expired-callback": () => {
              if (isMounted && onExpireRef.current) onExpireRef.current();
            },
          });

          if (isMounted) {
            setIsLoaded(true);
            setLoadFailed(false);
          }
        } catch (err) {
          console.error("Cloudflare Turnstile render error:", err);
          if (isMounted) setLoadFailed(true);
        }
      }
    };

    // 3. Poll for Turnstile availability
    let pollAttempts = 0;
    const MAX_POLL_ATTEMPTS = 50;

    if (window.turnstile) {
      renderWidget();
    } else {
      pollInterval = setInterval(() => {
        pollAttempts += 1;
        if (window.turnstile) {
          renderWidget();
          if (pollInterval) clearInterval(pollInterval);
        } else if (pollAttempts >= MAX_POLL_ATTEMPTS) {
          if (pollInterval) clearInterval(pollInterval);
          if (isMounted) setLoadFailed(true);
        }
      }, 100);
    }

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore unmount cleanup errors
        }
        widgetIdRef.current = null;
      }
    };
  }, [theme, size]);

  return (
      <div className="my-3 w-full flex flex-col items-center justify-center min-h-[65px] overflow-hidden select-none touch-manipulation">
        {!isLoaded && !loadFailed && (
            <div className="w-[300px] h-[65px] rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 animate-pulse flex items-center justify-center text-xs text-slate-400 font-medium">
              🔒 Verifying connection...
            </div>
        )}

        {loadFailed && (
            <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800 text-center">
              ⚠️ Security verification unavailable. Please check your Cloudflare
              Turnstile setup or disable ad blockers.
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