"use client";

import { useEffect, useRef, useState } from "react";

interface TurnstileProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: "auto" | "light" | "dark";
  size?: "normal" | "compact" | "flexible";
}

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
  const [loadFailed, setLoadFailed] = useState(false);

  // حفظ الدوال في refs لتفادي إعادة تشغيل useEffect عند كتابة أي حرف في النموذج
  const onVerifyRef = useRef(onVerify);
  const onErrorRef = useRef(onError);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onErrorRef.current = onError;
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    const siteKey =
      import.meta.env?.VITE_TURNSTILE_SITE_KEY ||
      process.env?.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
      DEMO_TEST_SITE_KEY;

    let isMounted = true;
    let pollInterval: any;

    // 1. حقن السكريبت تلقائياً في Head إذا لم يكن موجوداً
    const SCRIPT_ID = "cf-turnstile-script";
    if (!document.getElementById(SCRIPT_ID) && !(window as any).turnstile) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    // 2. دالة عرض الكابتشا
    const renderWidget = () => {
      const { turnstile } = window as any;
      if (turnstile && containerRef.current && !widgetIdRef.current) {
        try {
          widgetIdRef.current = turnstile.render(containerRef.current, {
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

    // 3. الانتظار والتأكد من تحميل السكريبت
    let pollAttempts = 0;
    const MAX_POLL_ATTEMPTS = 50; // 5 ثوانٍ

    if ((window as any).turnstile) {
      renderWidget();
    } else {
      pollInterval = setInterval(() => {
        pollAttempts += 1;
        if ((window as any).turnstile) {
          renderWidget();
          clearInterval(pollInterval);
        } else if (pollAttempts >= MAX_POLL_ATTEMPTS) {
          clearInterval(pollInterval);
          if (isMounted) {
            setLoadFailed(true);
            // في بيئة التطوير المحلية، تمرير التوكن تلقائياً لتفادي تعطيل التجربة
            if (import.meta.env?.DEV || siteKey === DEMO_TEST_SITE_KEY) {
              console.info("Dev mode: Turnstile bypassed for local testing.");
              onVerifyRef.current("dev-dummy-token");
            }
          }
        }
      }, 100);
    }

    // تنظيف المكون عند الخروج
    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
      if (widgetIdRef.current && (window as any).turnstile) {
        try {
          (window as any).turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [theme, size]); // تم سحب onVerify للوقاية من التكرار اللانهائي

  return (
    <div className="my-3 w-full flex flex-col items-center justify-center min-h-[65px] overflow-hidden select-none touch-manipulation">
      {/* هكيل التحميل Skeleton */}
      {!isLoaded && !loadFailed && (
        <div className="w-[300px] h-[65px] rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 animate-pulse flex items-center justify-center text-xs text-slate-400 font-medium">
          🔒 Verifying connection...
        </div>
      )}

      {/* رسالة للتطوير إذا تعذر تحميل الكابتشا */}
      {loadFailed && (
        <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-800 text-center">
          {import.meta.env?.DEV
            ? "⚠️ وضع التطوير: تم تخطي التحقق من الكابتشا بنجاح"
            : "⚠️ تعذر تحميل التحقق الأمني. يرجى إيقاف مانع الإعلانات أو تحديث الصفحة."}
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