import { useEffect, useRef, useState } from "react"

/**
 * عدّاد يعدّ من 0 إلى القيمة حين يدخل العنصر الشاشة.
 *
 * الرقم النهائي هو ما يُكتب في HTML أول مرة، فالزوار الذين لا ينفّذون JS
 * ومحركات البحث (وprerender) يرون القيمة الصحيحة. العدّ يبدأ بعد الترطيب فقط.
 * مع `prefers-reduced-motion` أو غياب IntersectionObserver يبقى الرقم ثابتاً.
 */
export function AnimatedCount({ value, duration = 1400 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof window === "undefined") return
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (reduced || !("IntersectionObserver" in window)) return

    let raf = 0
    let started = false
    setDisplay(0)

    const run = () => {
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        const eased = 1 - Math.pow(1 - t, 3)
        setDisplay(Math.round(value * eased))
        if (t < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          started = true
          io.disconnect()
          run()
        }
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value, duration])

  return (
    <span ref={ref} dir="ltr" className="tabular-nums">
      {display}
    </span>
  )
}
