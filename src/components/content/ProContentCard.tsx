import { Link } from "react-router-dom"
import { ArrowLeft, Calendar, Clock, Eye, BookOpen, Sparkles, TrendingUp, GraduationCap } from "lucide-react"
import type { ReactNode } from "react"

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

const badgeColors = {
  blue: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300",
  violet: "bg-violet-500/10 text-violet-700 border-violet-500/20 dark:bg-violet-500/20 dark:text-violet-300",
  emerald: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300",
  amber: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300",
  rose: "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-300",
  primary: "bg-primary/10 text-primary border-primary/20",
}

export function ProContentCard({
  href,
  title,
  image,
  imageAlt,
  badgeLabel,
  badgeColor = "primary",
  formattedDate,
  summary,
  readingTime,
  views,
  isFeatured,
  isTrending,
  isNew,
  tags,
  index = 0,
  variant = "default"
}: ProContentCardProps) {
  const isHero = variant === "hero"
  const isFeaturedVariant = variant === "featured" || isFeatured

  return (
    <article
      className={`
        group relative flex flex-col overflow-hidden rounded-[20px] border border-border/60 bg-card 
        transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
        hover:border-primary/30 hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.15),0_0_0_1px_hsl(var(--primary)/0.1)]
        hover:-translate-y-1.5
        ${isHero ? "sm:col-span-2 lg:col-span-2 lg:row-span-2 min-h-[380px]" : ""}
        ${isFeaturedVariant ? "ring-1 ring-amber-500/20 shadow-[0_0_0_1px_hsl(40_80%_50%/0.1),0_8px_24px_hsl(40_80%_50%/0.08)]" : "shadow-[0_4px_24px_hsl(0_0%_0%/0.04)]"}
      `}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Gradient accent top */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-primary via-violet-500 to-accent-gold opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Image - Pro fallback with category gradient */}
      <Link to={href} className="relative block overflow-hidden">
        <div className={`relative ${isHero ? "aspect-[16/10]" : "aspect-[16/10]"} overflow-hidden`}>
          {image ? (
            <>
              <img
                src={image}
                alt={imageAlt || title}
                loading="lazy"
                className="h-full w-full object-cover transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05] group-hover:brightness-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-90 group-hover:opacity-70 transition-opacity duration-500" />
              {/* Subtle pattern overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--foreground)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)/0.03)_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </>
          ) : (
            <>
              {/* Pro gradient fallback - category based */}
              <div className={`absolute inset-0 bg-gradient-to-br ${
                badgeColor === "blue" ? "from-blue-600 via-cyan-600 to-blue-700" :
                badgeColor === "violet" ? "from-violet-600 via-purple-600 to-indigo-600" :
                badgeColor === "emerald" ? "from-emerald-600 via-teal-600 to-green-700" :
                badgeColor === "amber" ? "from-amber-600 via-orange-600 to-yellow-600" :
                badgeColor === "rose" ? "from-rose-600 via-pink-600 to-red-600" :
                "from-primary via-violet-600 to-indigo-700"
              }`} />
              {/* Pattern */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,white/10_1px,transparent_1px),linear-gradient(to_bottom,white/10_1px,transparent_1px)] bg-[size:3rem_3rem]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/10" />
              
              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <div className="grid size-16 place-items-center rounded-2xl bg-white/15 backdrop-blur-xl border border-white/20 text-white shadow-[0_8px_24px_hsl(0_0%_0%/0.15)] group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <BookOpen className="size-8" />
                </div>
                <p className="mt-3 text-[11px] font-black tracking-widest text-white/80 uppercase">
                  {badgeLabel || "مقال قانوني"}
                </p>
                {/* Decorative title hint */}
                <p className="mt-2 line-clamp-2 text-[12px] font-bold text-white/60 max-w-[80%]">
                  {title.slice(0, 60)}
                </p>
              </div>

              {/* Floating orbs */}
              <div className="absolute top-4 right-4 size-20 rounded-full bg-white/10 blur-xl group-hover:bg-white/15 transition-colors duration-500" />
              <div className="absolute bottom-4 left-4 size-16 rounded-full bg-black/10 blur-lg" />
            </>
          )}

          {/* Top badges */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            {badgeLabel && (
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold backdrop-blur-xl bg-white/90 dark:bg-black/60 shadow-[0_2px_8px_hsl(0_0%_0%/0.08)] ${badgeColors[badgeColor]} transition-all duration-300 group-hover:shadow-[0_4px_12px_hsl(0_0%_0%/0.12)]`}>
                <span className="size-1.5 rounded-full bg-current animate-pulse" />
                {badgeLabel}
              </span>
            )}
          </div>

          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            {isTrending && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-2.5 py-1 text-[10px] font-black text-white shadow-lg animate-[pulse_2s_ease-in-out_infinite]">
                <TrendingUp className="size-3" /> رائج
              </span>
            )}
            {isNew && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-2.5 py-1 text-[10px] font-black text-white shadow-lg">
                <Sparkles className="size-3" /> جديد
              </span>
            )}
            {isFeaturedVariant && !isTrending && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1 text-[10px] font-black text-white shadow-lg">
                <Sparkles className="size-3" /> مميز
              </span>
            )}
          </div>

          {/* Bottom gradient info for hero */}
          {isHero && (
            <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
              <h3 className="text-xl font-black text-white leading-tight line-clamp-2 drop-shadow-[0_2px_8px_hsl(0_0%_0%/0.5)]">
                {title}
              </h3>
              {summary && (
                <p className="mt-2 line-clamp-2 text-[13px] text-white/80 leading-relaxed">
                  {summary}
                </p>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Content - hide for hero since title is on image */}
      {!isHero && (
        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {formattedDate && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-3" />
                {formattedDate}
              </span>
            )}
            {readingTime && (
              <>
                <span className="size-1 rounded-full bg-border" />
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  {readingTime}
                </span>
              </>
            )}
            {views !== null && views !== undefined && views > 0 && (
              <>
                <span className="size-1 rounded-full bg-border" />
                <span className="inline-flex items-center gap-1">
                  <Eye className="size-3" />
                  {views.toLocaleString("ar-MA")}
                </span>
              </>
            )}
          </div>

          <h3 className="mt-3 line-clamp-2 text-[15px] font-black leading-snug text-foreground transition-colors duration-300 group-hover:text-primary">
            <Link to={href} className="hover:underline decoration-primary/30 underline-offset-4 decoration-2">
              {title}
            </Link>
          </h3>

          {summary && (
            <p className="mt-2 line-clamp-2 text-[13px] leading-6 text-muted-foreground">
              {summary}
            </p>
          )}

          {tags && tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                  #{tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
                  +{tags.length - 3}
                </span>
              )}
            </div>
          )}

          <div className="mt-auto flex items-center justify-between pt-4">
            <div className="flex items-center gap-2">
              <div className="grid size-7 place-items-center rounded-full bg-primary/10 text-primary">
                <GraduationCap className="size-3.5" />
              </div>
              <span className="text-[11px] font-bold text-muted-foreground">ميزان الرقمية</span>
            </div>

            <Link
              to={href}
              className="group/btn inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-[11px] font-black text-background transition-all duration-300 hover:bg-primary hover:shadow-[0_4px_12px_hsl(var(--primary)/0.3)] hover:gap-2"
            >
              اقرأ
              <ArrowLeft className="size-3 transition-transform duration-300 group-hover/btn:-translate-x-0.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Shine effect on hover */}
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)]" />
      </div>
    </article>
  )
}

export function ProContentCardSkeleton({ variant = "default" }: { variant?: "default" | "hero" }) {
  return (
    <div className={`animate-pulse overflow-hidden rounded-[20px] border border-border/60 bg-card ${variant === "hero" ? "sm:col-span-2 lg:col-span-2 lg:row-span-2 min-h-[380px]" : ""}`}>
      <div className={`bg-muted ${variant === "hero" ? "aspect-[16/10]" : "aspect-[16/10]"}`} />
      <div className="p-5 space-y-3">
        <div className="h-3 w-24 rounded-full bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted" />
      </div>
    </div>
  )
}
