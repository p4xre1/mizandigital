import { Link } from "react-router-dom"
import { MapPin, Calendar, ExternalLink, ArrowUpLeft } from "lucide-react"

export interface ProSchoolCardProps {
  id: string
  name: string
  slug: string
  city?: string | null
  logoUrl?: string | null
  foundedYear?: number | null
  description?: string | null
  websiteUrl?: string | null
  university?: string | null
  isNew?: boolean
  index?: number
}

export function ProSchoolCard({
  name,
  slug,
  city,
  foundedYear,
  description,
  websiteUrl,
  university,
  isNew,
}: ProSchoolCardProps) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[16px] border border-border bg-card p-6 transition-[border-color,transform] duration-200 hover:border-foreground/15 hover:-translate-y-[1px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-[10px] border border-border bg-muted text-[13px] font-bold tracking-tight">
            {name.charAt(0)}
          </div>
          <div>
            {city && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="size-3" />
                {city}
              </div>
            )}
            <h3 className="mt-0.5 line-clamp-1 text-[14px] font-bold leading-tight tracking-[-0.01em]">
              <Link to={`/schools/${slug}`} className="hover:underline underline-offset-4 decoration-border">
                {name}
                <span className="absolute inset-0" aria-hidden />
              </Link>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isNew && (
            <span className="rounded-full bg-foreground px-2 py-1 text-[10px] font-bold text-background tracking-wide">
              جديد
            </span>
          )}
          <span className="grid size-7 place-items-center rounded-full border border-border text-muted-foreground group-hover:border-foreground group-hover:bg-foreground group-hover:text-background transition-colors">
            <ArrowUpLeft className="size-3.5" />
          </span>
        </div>
      </div>

      {university && (
        <p className="mt-3 text-[11px] font-medium text-muted-foreground tracking-wide">
          {university}
        </p>
      )}

      {description && (
        <p className="mt-3 line-clamp-2 text-[13px] leading-[1.6] text-muted-foreground">
          {description}
        </p>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {foundedYear && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3" />
              {foundedYear}
            </span>
          )}
          {city && foundedYear && <span className="size-[2px] rounded-full bg-border" />}
          {city && <span>{city}</span>}
        </div>

        {websiteUrl && (
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground hover:underline underline-offset-4"
            onClick={(e) => e.stopPropagation()}
          >
            الموقع
            <ExternalLink className="size-3" />
          </a>
        )}
      </div>
    </article>
  )
}

export function ProSchoolCardSkeleton() {
  return (
    <div className="rounded-[16px] border border-border bg-card p-6">
      <div className="flex gap-3">
        <div className="size-10 rounded-[10px] bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 rounded bg-muted animate-pulse" />
          <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full rounded bg-muted animate-pulse" />
        <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
      </div>
    </div>
  )
}
