import { useEffect, useRef, useState } from "react"

interface CountUpProps {
  /** الرقم النهائي المطلوب الوصول إليه */
  to: number
  /** مدة الحركة بالميلي ثانية */
  duration?: number
  /** نص يُضاف قبل الرقم (مثال: "+") */
  prefix?: string
  /** نص يُضاف بعد الرقم (مثال: "%") */
  suffix?: string
  className?: string
}

/**
 * يعرض رقماً يتصاعد تلقائياً من 0 إلى القيمة المطلوبة بمجرد ظهوره في
 * الشاشة (باستعمال IntersectionObserver)، بدل عرضه ثابتاً من البداية.
 * يشتغل مرة واحدة فقط لكل عنصر (لا يعيد الحركة عند التمرير جيئة وذهاباً).
 */
export function CountUp({ to, duration = 1400, prefix = "", suffix = "", className }: CountUpProps) {
  const [value, setValue] = useState(0)
  const elementRef = useRef<HTMLSpanElement>(null)
  const hasAnimatedRef = useRef(false)

  useEffect(() => {
    const node = elementRef.current
    if (!node) return

    // من يفضّل تقليل الحركة، نعرض الرقم النهائي مباشرة بلا تحريك
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) {
      setValue(to)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry.isIntersecting || hasAnimatedRef.current) return
        hasAnimatedRef.current = true

        const start = performance.now()
        const animate = (now: number) => {
          const elapsed = now - start
          const progress = Math.min(1, elapsed / duration)
          // تسارع في البداية وتباطؤ قرب النهاية (easeOutCubic) لحركة أنعم
          const eased = 1 - Math.pow(1 - progress, 3)
          setValue(Math.round(eased * to))
          if (progress < 1) requestAnimationFrame(animate)
        }
        requestAnimationFrame(animate)
        observer.disconnect()
      },
      { threshold: 0.4 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [to, duration])

  return (
    <span ref={elementRef} className={className}>
      {prefix}
      {value.toLocaleString("en-US")}
      {suffix}
    </span>
  )
}
