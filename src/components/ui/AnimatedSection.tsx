import { useEffect, useRef, useState, type ReactNode } from "react"

interface AnimatedSectionProps {
  children: ReactNode
  className?: string
  delay?: number
  animation?: "fade" | "slideUp" | "slideIn"
}

export function AnimatedSection({ 
  children, 
  className = "", 
  delay = 0,
  animation = "slideUp",
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    )
    if (ref.current) observer.observe(ref.current)
    const fallback = setTimeout(() => setIsVisible(true), 800 + delay)
    return () => {
      observer.disconnect()
      clearTimeout(fallback)
    }
  }, [delay])

  const animClass = isVisible
    ? animation === "fade" ? "animate-[fadeIn_0.4s_ease_both]"
      : animation === "slideIn" ? "animate-[slideIn_0.4s_ease_both]"
      : "animate-[slideUp_0.4s_ease_both]"
    : "opacity-0"

  return (
    <div ref={ref} className={`${animClass} ${className}`}>
      {children}
    </div>
  )
}

export function StaggerGrid({ children, className = "", delay = 0 }: { children: ReactNode[], className?: string, delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const isContents = className.includes("contents")
    if (isContents) {
      const t = setTimeout(() => setIsVisible(true), delay + 50)
      return () => clearTimeout(t)
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -80px 0px" }
    )
    if (ref.current) observer.observe(ref.current)
    const fallback = setTimeout(() => setIsVisible(true), 800 + delay)
    return () => {
      observer.disconnect()
      clearTimeout(fallback)
    }
  }, [delay, className])

  if (className.includes("contents")) {
    return (
      <>
        <div ref={ref} className="sr-only" aria-hidden />
        {children.map((child, i) => (
          <div
            key={i}
            className={isVisible ? "animate-[slideUp_0.4s_ease_both]" : "opacity-0"}
            style={{ animationDelay: isVisible ? `${i * 40}ms` : "0ms" }}
          >
            {child}
          </div>
        ))}
      </>
    )
  }

  return (
    <div ref={ref} className={className}>
      {children.map((child, i) => (
        <div
          key={i}
          className={isVisible ? "animate-[slideUp_0.4s_ease_both]" : "opacity-0"}
          style={{ animationDelay: isVisible ? `${i * 40}ms` : "0ms" }}
        >
          {child}
        </div>
      ))}
    </div>
  )
}
