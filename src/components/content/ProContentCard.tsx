import { Link } from "react-router-dom"
import { ArrowLeft, Calendar, Clock, Eye, BookOpen, Star, BadgeCheck, TrendingUp, GraduationCap } from "lucide-react"
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
  violet: "bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary",
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
        group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card 
        transition-colors duration-200 ease-out
        hover:border-primary/30 
        
        ${isHero ? "sm:col-span-2 lg:col-span-2 lg:row-span-2 min-h-[380px]" : ""}
        ${isFeaturedVariant ? "ring-1 ring-amber-500/20 shadow-sm" : "shadow-sm"}
      `}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Gradient accent top */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-primary opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* الصورة — وإن غابت، سطح بلون القسم */}
      <Link to={href} className="relative block overflow-hidden">
        <div className={`relative ${isHero ? "aspect-[16/10]" : "aspect-[16/10]"} overflow-hidden`}>
          {image ? (
            <>
              <img
                src={image}
                alt={imageAlt || title}
                loading="lazy"
                className="h-full w-full object-cover transition-colors duration-200 ease-out group-] group-hover:brightness-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-90 group-hover:opacity-70 transition-opacity duration-500" />
              {/* Subtle pattern overlay */}
            </>
          ) : (
            <>
              {/* سطح بديل بلون القسم */}
              <div className={`absolute inset-0 ${
                badgeColor === "blue" ? "bg-[#1d4ed8]" :
                badgeColor === "violet" ? "bg-primary" :
                badgeColor === "emerald" ? "bg-[#047857]" :
                badgeColor === "amber" ? "bg-[#b45309]" :
                badgeColor === "rose" ? "bg-[#be123c]" :
                "bg-primary"
              }`} />
              
              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <div className="grid size-16 place-items-center rounded-2xl bg-white/15 border border-white/20 text-white shadow-sm group- group-hover:rotate-3 transition-colors duration-200">
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
              <div className="absolute top-4 right-4 size-20 rounded-full bg-white/10 blur-xl group-hover:bg-white/15 transition-colors duration-200" />
              <div className="absolute bottom-4 left-4 size-16 rounded-full bg-black/10 blur-lg" />
            </>
          )}

          {/* Top badges */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            {badgeLabel && (
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold  bg-white/90 dark:bg-black/60 shadow-sm ${badgeColors[badgeColor]} transition-colors duration-300 group-`}>
                <span className="size-1.5 rounded-full bg-current" />
                {badgeLabel}
              </span>
            )}
          </div>

          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            {isTrending && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#c2410c] px-2.5 py-1 text-[10px] font-black text-white">
                <TrendingUp className="size-3" /> رائج
              </span>
            )}
            {isNew && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#047857] px-2.5 py-1 text-[10px] font-black text-white">
                <Star className="size-3" /> جديد
              </span>
            )}
            {isFeaturedVariant && !isTrending && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#b45309] px-2.5 py-1 text-[10px] font-black text-white">
                <BadgeCheck className="size-3" /> مميز
              </span>
            )}
          </div>

          {/* شريط معلومات أسفل الصورة البارزة */}
          {isHero && (
            <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
              <h3 className="text-xl font-black text-white leading-tight line-clamp-2 drop-shadow-sm">
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
              className="group/btn inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-[11px] font-black text-background transition-colors duration-300 hover:bg-primary hover:gap-2"
            >
              اقرأ
              <ArrowLeft className="size-3 transition-transform duration-300 group-hover/btn:-translate-x-0.5" />
            </Link>
          </div>
        </div>
      )}

    </article>
  )
}

export function ProContentCardSkeleton({ variant = "default" }: { variant?: "default" | "hero" }) {
  return (
    <div className={`animate-pulse overflow-hidden rounded-2xl border border-border/60 bg-card ${variant === "hero" ? "sm:col-span-2 lg:col-span-2 lg:row-span-2 min-h-[380px]" : ""}`}>
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
