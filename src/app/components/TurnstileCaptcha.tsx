import { useEffect, useRef } from "react";

interface TurnstileProps {
  onVerify: (token: string) => void;
}

export function TurnstileCaptcha({ onVerify }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // تم استخدام (window as any) لتفادي أي تعارض في أوزان وأنواع البيانات بين المكتبات
    const { turnstile } = window as any;

    if (turnstile && containerRef.current) {
      turnstile.render(containerRef.current, {
        sitekey: "YOUR_CLOUDFLARE_TURNSTILE_SITE_KEY", // 👈 ضع هنا الـ Site Key الخاص بك
        callback: (token: string) => {
          onVerify(token);
        },
      });
    }
  }, [onVerify]);

  return <div ref={containerRef} className="my-4 flex justify-center" />;
}