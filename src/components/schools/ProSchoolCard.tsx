import { Link } from "react-router-dom"
import { MapPin, Building2, ExternalLink, GraduationCap, Users, Calendar, ArrowLeft, Star } from "lucide-react"

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

// لون واحد هادئ لكل مدينة (بلا تدرّجات) — يُستعمل في خلفية الأيقونة.
const cityColors: Record<string, string> = {
  "الرباط": "bg-[#1d4ed8]/10 text-[#1d4ed8]",
  "الدار البيضاء": "bg-[#0f766e]/10 text-[#0f766e]",
  "مراكش": "bg-[#b45309]/10 text-[#b45309]",
  "فاس": "bg-[#047857]/10 text-[#047857]",
  "طنجة": "bg-[#be123c]/10 text-[#be123c]",
  "أكادير": "bg-[#0369a1]/10 text-[#0369a1]",
  "وجدة": "bg-[#c2410c]/10 text-[#c2410c]",
  "تطوان": "bg-[#0e7490]/10 text-[#0e7490]",
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
  const tone = cityColors[city] || "bg-primary/10 text-primary"

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-colors duration-200 ease-out hover:border-primary/20"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <div className="relative">
              <img src={logoUrl} alt={name} className="size-12 rounded-xl border border-border object-cover shadow-sm group-hover:shadow-md transition-shadow" />
              <div className="absolute -bottom-1 -right-1 size-4 rounded-full bg-primary grid place-items-center">
                <GraduationCap className="size-2.5 text-white" />
              </div>
            </div>
          ) : (
            <div className={`grid size-12 place-items-center rounded-xl ${tone}`}>
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
            <span className="inline-flex items-center gap-1 rounded-full bg-[#047857] px-2 py-1 text-[9px] font-black text-white">
              <Star className="size-2.5" /> جديد
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
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-2.5 text-[12px] font-black text-background transition-colors hover:bg-primary group/btn"
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

    </article>
  )
}

export function ProSchoolCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border/60 bg-card p-5">
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
