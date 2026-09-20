import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Reveal — دخول لمرة واحدة عند وصول العنصر إلى الشاشة.
 *
 * لماذا لا يبدأ العنصر مخفياً في HTML؟ لأن الصفحة تُبنى مسبقاً (prerender)
 * ويجب أن يكون محتواها ظاهراً للزائر وللزاحف حتى قبل تشغيل JavaScript.
 * لذلك: ما هو داخل الشاشة يظهر بالحركة فوراً، وما هو أسفلها يُخفى ثم يُكشف
 * عند التمرير. ومن يطلب تقليل الحركة في نظامه يرى المحتوى بلا حركة أصلاً.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  /** تأخير الحركة بالمللي ثانية (للتتابع بين البطاقات). */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "hidden" | "in">("idle");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      setState("in");
      return;
    }
    const belowFold = node.getBoundingClientRect().top > window.innerHeight;
    setState(belowFold ? "hidden" : "in");
    if (!belowFold) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState("in");
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${state === "hidden" ? "opacity-0" : ""} ${state === "in" ? "rise" : ""} ${className}`}
      style={state === "in" && delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/**
 * CountUp — عدّ تصاعدي للأرقام عند ظهورها. يقبل النصوص المركّبة
 * (مثل «S1-S6») فيُظهرها كما هي بلا عدّ، وبلا حركة لمن يطلب تقليلها.
 */
export function CountUp({
  value,
  suffix = "",
  duration = 900,
  className = "",
}: {
  value: string | number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const target = typeof value === "number" ? value : Number(String(value).replace(/[^\d]/g, ""));
  const animatable = Number.isFinite(target) && target > 0 && String(value).trim() !== "";
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(animatable ? 0 : NaN);

  useEffect(() => {
    if (!animatable) return;
    const node = ref.current;
    const reduce =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = () => setShown(target);
    if (reduce || typeof IntersectionObserver === "undefined") {
      finish();
      return;
    }
    let frame = 0;
    let started = false;
    const start = () => {
      started = true;
      const t0 = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - t0) / duration);
        // easeOutCubic: سريع في البداية ثم يستقرّ على الرقم النهائي.
        setShown(Math.round(target * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !started) {
          start();
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    if (node) observer.observe(node);
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [animatable, duration, target]);

  if (!animatable) return <span className={className}>{value}{suffix}</span>;
  return (
    <span ref={ref} className={className}>
      {Number.isFinite(shown) ? shown : 0}
      {suffix}
    </span>
  );
}
