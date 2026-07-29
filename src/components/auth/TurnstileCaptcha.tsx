"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// Official Cloudflare Turnstile API Types
interface TurnstileRenderOptions {
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
    onloadTurnstileCallback?: () => void;
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
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [loadFailed, setLoadFailed] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);

  // Keep callback references synchronized without triggering effect re-renders
  const onVerifyRef = useRef(onVerify);
  const onErrorRef = useRef(onError);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onErrorRef.current = onError;
    onExpireRef.current = onExpire;
  }, [onVerify, onError, onExpire]);

  // Safe Environment Key Extraction (Supports Vite, Next.js, and process.env safely)
  const getSiteKey = useCallback((): string | undefined => {
    const viteKey =
      import.meta.env?.VITE_CLOUDFLARE_SITE_KEY ||
      import.meta.env?.VITE_TURNSTILE_SITE_KEY;
    if (viteKey) return viteKey;

    if (typeof process !== "undefined" && process.env) {
      return (
        process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
        process.env.VITE_CLOUDFLARE_SITE_KEY ||
        process.env.VITE_TURNSTILE_SITE_KEY
      );
    }
    return undefined;
  }, []);

  const handleRetry = () => {
    setLoadFailed(false);
    setIsLoaded(false);
    setRetryCount((prev) => prev + 1);
  };

  useEffect(() => {
    const siteKey = getSiteKey();

    if (!siteKey) {
      console.error(
        "Turnstile Error: Missing Site Key in environment variables! " +
          "Ensure VITE_CLOUDFLARE_SITE_KEY or VITE_TURNSTILE_SITE_KEY is configured."
      );
      setLoadFailed(true);
      return;
    }

    let isMounted = true;

    // Render Turnstile widget into container
    const renderWidget = () => {
      if (!isMounted || !containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current) return; // Prevent duplicate renders

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
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
    };

    const SCRIPT_ID = "cf-turnstile-script";

    if (window.turnstile) {
      renderWidget();
    } else {
      let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

      window.onloadTurnstileCallback = () => {
        if (isMounted) renderWidget();
      };

      if (!script) {
        script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit";
        script.async = true;
        script.defer = true;
        script.onerror = () => {
          console.error(
            "Cloudflare Turnstile script failed to load (blocked by network or client extension)."
          );
          if (isMounted) setLoadFailed(true);
        };
        document.head.appendChild(script);
      } else {
        // Script already exists in document, poll briefly as fallback
        const checkInterval = setInterval(() => {
          if (window.turnstile) {
            clearInterval(checkInterval);
            if (isMounted) renderWidget();
          }
        }, 100);

        setTimeout(() => {
          clearInterval(checkInterval);
          if (isMounted && !window.turnstile) setLoadFailed(true);
        }, 5000);
      }
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore cleanup errors on unmount
        }
        widgetIdRef.current = null;
      }
    };
  }, [theme, size, retryCount, getSiteKey]);

  return (
    <div className="my-3 w-full flex flex-col items-center justify-center min-h-[65px] overflow-hidden select-none touch-manipulation">
      {!isLoaded && !loadFailed && (
        <div className="w-[300px] h-[65px] rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 animate-pulse flex items-center justify-center text-xs text-slate-400 font-medium">
          🔒 Verifying connection...
        </div>
      )}

      {loadFailed && (
        <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center max-w-sm">
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            ⚠️ Security verification unavailable. Please check your connection or disable ad blockers.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="px-3 py-1 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 active:scale-95"
          >
            Retry Verification
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className={`transition-opacity duration-300 ${
          isLoaded && !loadFailed ? "opacity-100 block" : "opacity-0 h-0 overflow-hidden"
        }`}
      />
    </div>
  );
}
