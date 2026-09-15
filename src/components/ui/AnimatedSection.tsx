import { useEffect, useRef, useState, type ReactNode } from "react"

interface AnimatedSectionProps {
  children: ReactNode
  className?: string
  delay?: number
  animation?: "fadeUp" | "fadeIn" | "scaleIn" | "slideRight" | "slideLeft"
  stagger?: boolean
  staggerDelay?: number
}

export function AnimatedSection({ 
  children, 
  className = "", 
  delay = 0,
  animation = "fadeUp",
  stagger = false,
  staggerDelay = 80
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
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [delay])

  const animations = {
    fadeUp: isVisible ? "animate-[fadeUp_0.6s_cubic-bezier(0.16,1,0.3,1)_forwards]" : "opacity-0 translate-y-6",
    fadeIn: isVisible ? "animate-[fadeIn_0.5s_ease-out_forwards]" : "opacity-0",
    scaleIn: isVisible ? "animate-[scaleIn_0.5s_cubic-bezier(0.16,1,0.3,1)_forwards]" : "opacity-0 scale-95",
    slideRight: isVisible ? "animate-[slideRight_0.6s_cubic-bezier(0.16,1,0.3,1)_forwards]" : "opacity-0 -translate-x-6",
    slideLeft: isVisible ? "animate-[slideLeft_0.6s_cubic-bezier(0.16,1,0.3,1)_forwards]" : "opacity-0 translate-x-6",
  }

  return (
    <div
      ref={ref}
      className={`${animations[animation]} ${className}`}
      style={stagger ? { 
        // @ts-ignore
        "--stagger-delay": `${staggerDelay}ms` 
      } : undefined}
    >
      {children}
    </div>
  )
}

export function StaggerGrid({ children, className = "", delay = 0 }: { children: ReactNode[], className?: string, delay?: number }) {
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
      { threshold: 0.05 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [delay])

  return (
    <div ref={ref} className={className}>
      {children.map((child, i) => (
        <div
          key={i}
          className={isVisible ? "animate-[fadeUp_0.6s_cubic-bezier(0.16,1,0.3,1)_both]" : "opacity-0 translate-y-4"}
          style={{ animationDelay: isVisible ? `${i * 70}ms` : "0ms" }}
        >
          {child}
        </div>
      ))}
    </div>
  )
}
