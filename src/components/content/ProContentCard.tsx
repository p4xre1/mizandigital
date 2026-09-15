import { Link } from "react-router-dom"
import { ArrowUpLeft, Calendar, Clock } from "lucide-react"

export interface ProContentCardProps {
  href: string
  title: string
  image?: string | null
  imageAlt?: string | null
  badgeLabel?: string | null
  badgeColor?: "blue" | "violet" | "emerald" | "amber" | "rose" | "primary"
  formattedDate?: string | null
  summary?: string | null
  readingTime?: string | null
  views?: number | null
  isFeatured?: boolean
  isTrending?: boolean
  isNew?: boolean
  tags?: string[]
  index?: number
  variant?: "default" | "featured" | "compact" | "hero"
}

export function ProContentCard({
  href,
  title,
  image,
  imageAlt,
  badgeLabel,
  formattedDate,
  summary,
  readingTime,
  isFeatured,
  isNew,
  variant = "default"
}: ProContentCardProps) {
  const isHero = variant === "hero"

  return (
    <article
      className={`
        group relative flex flex-col overflow-hidden rounded-[16px] border border-border bg-card
        transition-[border-color,transform] duration-200 ease-out
        hover:border-foreground/15 hover:-translate-y-[1px]
        ${isHero ? "sm:col-span-2 lg:col-span-2" : ""}
        ${isFeatured ? "border-foreground/10" : ""}
      `}
    >
      {/* Image - minimal */}
      <Link to={href} className="relative block overflow-hidden bg-muted">
        <div className={`relative ${isHero ? "aspect-[16/9]" : "aspect-[16/10]"} overflow-hidden bg-[#f5f5f5] dark:bg-[#111]`}>
          {image ? (
            <img
              src={image}
              alt={imageAlt || title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-[1px] w-12 bg-border" />
                <span className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
                  {badgeLabel || "مقال"}
                </span>
                <div className="h-[1px] w-12 bg-border" />
              </div>
            </div>
          )}

          {/* Top minimal meta */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            {badgeLabel && (
              <span className="inline-flex items-center rounded-full bg-white/95 dark:bg-black/80 px-2.5 py-1 text-[10px] font-bold tracking-wide text-foreground border border-black/5 shadow-sm backdrop-blur">
                {badgeLabel}
              </span>
            )}
          </div>

          {isNew && (
            <span className="absolute top-3 left-3 inline-flex rounded-full bg-foreground px-2.5 py-1 text-[10px] font-bold tracking-wide text-background">
              جديد
            </span>
          )}
        </div>
      </Link>

      {/* Content - editorial minimal */}
      <div className="flex flex-1 flex-col p-5">
        {/* Date line */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {formattedDate && (
            <span className="inline-flex items-center gap-1.5 tracking-wide">
              <Calendar className="size-3" />
              {formattedDate}
            </span>
          )}
          {readingTime && (
            <>
              <span className="size-[2px] rounded-full bg-border" />
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" />
                {readingTime}
              </span>
            </>
          )}
        </div>

        <h3 className="mt-3 line-clamp-2 text-[15px] font-bold leading-[1.4] tracking-[-0.01em] text-foreground group-hover:text-foreground/80 transition-colors">
          <Link to={href}>
            {title}
            <span className="absolute inset-0" aria-hidden />
          </Link>
        </h3>

        {summary && (
          <p className="mt-2 line-clamp-2 text-[13px] leading-[1.6] text-muted-foreground">
            {summary}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground">
            ميزان الرقمية
          </span>
          <span className="inline-flex size-7 items-center justify-center rounded-full border border-border text-muted-foreground group-hover:border-foreground group-hover:bg-foreground group-hover:text-background transition-all duration-200">
            <ArrowUpLeft className="size-3.5" />
          </span>
        </div>
      </div>
    </article>
  )
}

export function ProContentCardSkeleton({ variant = "default" }: { variant?: "default" | "hero" }) {
  return (
    <div className={`overflow-hidden rounded-[16px] border border-border bg-card ${variant === "hero" ? "sm:col-span-2 lg:col-span-2" : ""}`}>
      <div className={`bg-muted ${variant === "hero" ? "aspect-[16/9]" : "aspect-[16/10]"} animate-pulse`} />
      <div className="p-5 space-y-3">
        <div className="h-3 w-20 rounded bg-muted animate-pulse" />
        <div className="h-4 w-full rounded bg-muted animate-pulse" />
        <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
      </div>
    </div>
  )
}
