import { useEffect, useRef } from "react";

interface TurnstileProps {
  onVerify: (token: string) => void;
}

export function TurnstileCaptcha({ onVerify }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { turnstile } = window as any;

    // قراءة المفتاح بأمان من ملف الـ .env التابع لـ Vite
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

    if (turnstile && containerRef.current && siteKey) {
      turnstile.render(containerRef.current, {
        sitekey: siteKey, // 🚀 يتم تمريره هنا تلقائياً
        callback: (token: string) => {
          onVerify(token); // تمرير التوكن عند نجاح المستخدم في التحدي
        },
      });
    }
  }, [onVerify]);

  return <div ref={containerRef} className="my-4 flex justify-center" />;
}