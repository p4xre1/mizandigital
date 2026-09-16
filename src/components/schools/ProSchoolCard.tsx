import { Link } from "react-router-dom"
import { MapPin, Building2, ExternalLink, GraduationCap, Users, Calendar, ArrowLeft, Sparkles } from "lucide-react"

interface ProSchoolCardProps {
  id: string
  name: string
  slug: string
  city: string
  logoUrl?: string | null
  foundedYear?: number | null
  description?: string | null
  websiteUrl?: string | null
  university?: string | null
  studentsCount?: number
  isNew?: boolean
  index?: number
}

const cityColors: Record<string, string> = {
  "الرباط": "from-blue-500 to-cyan-500",
  "الدار البيضاء": "from-violet-500 to-purple-500",
  "مراكش": "from-amber-500 to-orange-500",
  "فاس": "from-emerald-500 to-teal-500",
  "طنجة": "from-rose-500 to-pink-500",
  "أكادير": "from-blue-500 to-indigo-500",
  "وجدة": "from-orange-500 to-red-500",
  "تطوان": "from-teal-500 to-cyan-500",
}

export function ProSchoolCard({ 
  name, 
  slug, 
  city, 
  logoUrl, 
  foundedYear, 
  description, 
  websiteUrl,
  university,
  isNew,
  index = 0 
}: ProSchoolCardProps) {
  const gradient = cityColors[city] || "from-primary to-violet-600"

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-[20px] border border-border/60 bg-card p-5 shadow-[0_4px_24px_hsl(0_0%_0%/0.04)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-primary/20 hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.12),0_0_0_1px_hsl(var(--primary)/0.08)] hover:-translate-y-1"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Top accent */}
      <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <div className="relative">
              <img src={logoUrl} alt={name} className="size-12 rounded-xl border border-border object-cover shadow-sm group-hover:shadow-md transition-shadow" />
              <div className={`absolute -bottom-1 -right-1 size-4 rounded-full bg-gradient-to-r ${gradient} grid place-items-center shadow`}>
                <GraduationCap className="size-2.5 text-white" />
              </div>
            </div>
          ) : (
            <div className={`grid size-12 place-items-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-[0_4px_12px_hsl(var(--primary)/0.2)] group-hover:shadow-[0_8px_20px_hsl(var(--primary)/0.3)] group-hover:scale-105 transition-all duration-500`}>
              <Building2 className="size-6" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="line-clamp-1 text-[14px] font-black leading-tight text-foreground group-hover:text-primary transition-colors">
              {name}
            </h3>
            {university && (
              <p className="line-clamp-1 text-[11px] text-muted-foreground mt-0.5">{university}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground border border-border/50">
            <MapPin className="size-3" />
            {city}
          </span>
          {isNew && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-2 py-1 text-[9px] font-black text-white shadow">
              <Sparkles className="size-2.5" /> جديد
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="mt-4 line-clamp-2 text-[12px] leading-6 text-muted-foreground">
          {description}
        </p>
      )}

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-muted/50 p-2.5 border border-border/30">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar className="size-3" />
            التأسيس
          </div>
          <p className="mt-1 text-[12px] font-black text-foreground">{foundedYear || "—"}</p>
        </div>
        <div className="rounded-xl bg-muted/50 p-2.5 border border-border/30">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Users className="size-3" />
            المدينة
          </div>
          <p className="mt-1 text-[12px] font-black text-foreground line-clamp-1">{city}</p>
        </div>
        <div className="rounded-xl bg-primary/5 p-2.5 border border-primary/10 group-hover:bg-primary/10 transition-colors">
          <div className="flex items-center gap-1 text-[10px] text-primary">
            <GraduationCap className="size-3" />
            FSJES
          </div>
          <p className="mt-1 text-[12px] font-black text-primary">حقوق</p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-5 flex items-center gap-2">
        <Link
          to={`/schools/${slug}`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-2.5 text-[12px] font-black text-background transition-all hover:bg-primary hover:shadow-[0_4px_12px_hsl(var(--primary)/0.25)] group/btn"
        >
          عرض التفاصيل
          <ArrowLeft className="size-3.5 transition-transform group-hover/btn:-translate-x-0.5" />
        </Link>
        {websiteUrl && (
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="grid size-10 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="الموقع الرسمي"
          >
            <ExternalLink className="size-4" />
          </a>
        )}
      </div>

      {/* Hover shine */}
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)]" />
      </div>
    </article>
  )
}

export function ProSchoolCardSkeleton() {
  return (
    <div className="animate-pulse rounded-[20px] border border-border/60 bg-card p-5">
      <div className="flex gap-3">
        <div className="size-12 rounded-xl bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-2/3 rounded bg-muted" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="h-14 rounded-xl bg-muted" />
        <div className="h-14 rounded-xl bg-muted" />
        <div className="h-14 rounded-xl bg-muted" />
      </div>
    </div>
  )
}
