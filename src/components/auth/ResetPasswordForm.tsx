"use client";

import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
} from "react";

// ─── Types ─────────────────────────────────────────────
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
  }
}

interface TurnstileProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: "auto" | "light" | "dark";
  size?: "normal" | "compact" | "flexible";
}

export interface TurnstileCaptchaHandle {
  reset: () => void;
}

// ─── Global Script Loader (shared across all instances) ──
const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type LoadState = "idle" | "loading" | "loaded" | "error";

let globalLoadState: LoadState = "idle";
const globalQueue: Array<(success: boolean) => void> = [];

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (globalLoadState === "loaded") {
      resolve();
      return;
    }
    if (globalLoadState === "loading") {
      globalQueue.push((ok) => (ok ? resolve() : reject()));
      return;
    }
    if (globalLoadState === "error") {
      // Remove dead script so we can retry
      const dead = document.getElementById(SCRIPT_ID);
      if (dead) dead.remove();
      globalLoadState = "idle";
    }

    globalLoadState = "loading";
    globalQueue.push((ok) => (ok ? resolve() : reject()));

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;

    script.onload = () => {
      globalLoadState = "loaded";
      globalQueue.forEach((cb) => cb(true));
      globalQueue.length = 0;
    };

    script.onerror = () => {
      globalLoadState = "error";
      globalQueue.forEach((cb) => cb(false));
      globalQueue.length = 0;
    };

    document.head.appendChild(script);
  });
}

// ─── Component ─────────────────────────────────────────
export const TurnstileCaptcha = forwardRef<TurnstileCaptchaHandle, TurnstileProps>(
  function TurnstileCaptcha(
    { onVerify, onError, onExpire, theme = "auto", size = "normal" },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadFailed, setLoadFailed] = useState(false);
    const [retryTick, setRetryTick] = useState(0);

    // Keep callbacks fresh without re-triggering effects
    const onVerifyRef = useRef(onVerify);
    const onErrorRef = useRef(onError);
    const onExpireRef = useRef(onExpire);

    useEffect(() => {
      onVerifyRef.current = onVerify;
      onErrorRef.current = onError;
      onExpireRef.current = onExpire;
    }, [onVerify, onError, onExpire]);

    // Expose imperative reset
    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.reset(widgetIdRef.current);
          } catch (err) {
            console.error("Turnstile reset error:", err);
          }
        }
      },
    }));

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

    const handleRetry = useCallback(() => {
      setLoadFailed(false);
      setIsLoaded(false);
      widgetIdRef.current = null;
      setRetryTick((t) => t + 1);
    }, []);

    useEffect(() => {
      const siteKey = getSiteKey();
      if (!siteKey) {
        console.error(
          "Turnstile Error: Missing Site Key. " +
            "Set VITE_CLOUDFLARE_SITE_KEY or NEXT_PUBLIC_TURNSTILE_SITE_KEY."
        );
        setLoadFailed(true);
        return;
      }

      let isMounted = true;

      const renderWidget = () => {
        if (!isMounted || !containerRef.current || !window.turnstile) return;
        if (widgetIdRef.current) return; // already rendered

        try {
          widgetIdRef.current = window.turnstile.render(
            containerRef.current,
            {
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
            }
          );

          if (isMounted) setIsLoaded(true);
        } catch (err) {
          console.error("Turnstile render error:", err);
          if (isMounted) setLoadFailed(true);
        }
      };

      loadScript()
        .then(() => {
          if (isMounted) renderWidget();
        })
        .catch(() => {
          if (isMounted) setLoadFailed(true);
        });

      return () => {
        isMounted = false;
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            /* ignore */
          }
          widgetIdRef.current = null;
        }
      };
    }, [theme, size, retryTick, getSiteKey]);

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
              ⚠️ Security verification unavailable. Please check your connection
              or disable ad blockers.
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
            isLoaded && !loadFailed
              ? "opacity-100 block"
              : "opacity-0 h-0 overflow-hidden"
          }`}
        />
      </div>
    );
  }
);