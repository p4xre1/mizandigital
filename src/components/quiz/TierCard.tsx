import type { LucideIcon } from "lucide-react"
import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"

/** بطاقة مسار اختبار في صفحة مركز الاختبارات. */
export function TierCard({
  to,
  icon: Icon,
  title,
  tagline,
  description,
  features,
  questionCount,
  accent,
  badge,
}: {
  to: string
  icon: LucideIcon
  title: string
  tagline: string
  description: string
  features: string[]
  questionCount: number
  accent: string
  badge?: string
}) {
  return (
    <Link
      to={to}
      className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${accent}`}>
          <Icon className="size-5" strokeWidth={2.2} />
        </span>
        {badge && (
          <span className="rounded-full border border-accent-gold/40 bg-accent-gold/10 px-2.5 py-0.5 text-[10px] font-extrabold text-accent-gold">
            {badge}
          </span>
        )}
      </div>

      <h3 className="text-base font-extrabold text-foreground">{title}</h3>
      <p className="mt-0.5 text-[11px] font-bold text-primary">{tagline}</p>
      <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{description}</p>

      <ul className="mt-3 space-y-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-[12px] font-semibold text-muted-foreground">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-gold" aria-hidden="true" />
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <span className="text-[11px] font-bold text-muted-foreground">
          {questionCount > 0 ? `${questionCount} سؤالاً متاحاً` : "سيتوفر قريباً"}
        </span>
        <span className="flex items-center gap-1 text-[12px] font-extrabold text-primary transition group-hover:gap-2">
          ابدأ الآن
          <ArrowLeft className="size-3.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}
