import { Link } from "react-router-dom"
import { BookOpen, Calendar, Tag, ArrowLeft, ExternalLink } from "lucide-react"

export interface ContentCardData {
  id: string
  title: string
  path: string
  summary?: string | null
  image?: string | null
  imageAlt?: string | null
  badgeLabel?: string | null
  badgeIcon?: React.ReactNode
  date?: string | null
  externalUrl?: string | null
  ctaLabel?: string
  footerLabel?: string
}

interface ContentCardProps {
  item: ContentCardData
  variant?: "grid" | "list"
}

// بطاقة محتوى موحدة يشترك فيها كل من المقالات والأخبار في الواجهة العامة،
// بحيث يرث قسم الأخبار نفس تصميم بطاقة المقالات الاحترافي فعلياً بدل تكرار
// نفس التنسيق بشكل منفصل ومستقل في كل صفحة.
export function ContentCard({ item, variant = "grid" }: ContentCardProps) {
  const formattedDate = item.date
    ? new Date(item.date).toLocaleDateString("ar-MA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null

  if (variant === "list") {
    return (
      <article className="group flex !flex-row items-center justify-between gap-4 rounded-xl border border-border bg-card !py-4 px-4 shadow-sm transition hover:border-primary/50 hover:shadow-md md:px-5">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
            {item.badgeLabel && (
              <span className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 font-semibold text-primary">
                {item.badgeIcon}
                {item.badgeLabel}
              </span>
            )}
          </div>
          <h2 className="line-clamp-2 text-base font-bold leading-snug text-foreground transition group-hover:text-primary">
            <Link to={item.path} title={item.title}>
              {item.title}
            </Link>
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <div className="hidden flex-col text-left text-xs text-muted-foreground sm:flex">
            {formattedDate && <span>{formattedDate}</span>}
          </div>
          {item.externalUrl && (
            <a
              href={item.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 p-1 text-muted-foreground hover:text-primary"
              title="الرابط الأصلي"
            >
              <ExternalLink size={14} />
            </a>
          )}
          <Link
            to={item.path}
            title={item.title}
            className="inline-flex shrink-0 items-center gap-1 px-2 py-1 text-xs font-bold text-primary hover:underline"
          >
            <span>{item.ctaLabel || "التفاصيل"}</span>
            <ArrowLeft size={14} />
          </Link>
        </div>
      </article>
    )
  }

  return (
    <article className="group flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/50 hover:shadow-md md:p-5">
      {item.image && (
        <Link
          to={item.path}
          title={item.title}
          className="-mx-4 -mt-4 mb-3 block aspect-[16/9] overflow-hidden bg-muted md:-mx-5 md:-mt-5"
        >
          <img
            src={item.image}
            alt={item.imageAlt || item.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        </Link>
      )}
      <div className="space-y-2">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          {item.badgeLabel && (
            <span className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 font-semibold text-primary">
              {item.badgeIcon}
              {item.badgeLabel}
            </span>
          )}
          {formattedDate && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Calendar size={12} />
              {formattedDate}
            </span>
          )}
        </div>

        <h2 className="line-clamp-2 text-base font-bold leading-snug text-foreground transition group-hover:text-primary">
          <Link to={item.path} title={item.title}>
            {item.title}
          </Link>
        </h2>

        {item.summary && (
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{item.summary}</p>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-2 border-t border-border pt-4 text-xs">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <BookOpen size={12} />
          {item.footerLabel || "منصة الميزان"}
        </span>
        <div className="flex items-center gap-2">
          {item.externalUrl && (
            <a
              href={item.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 p-1 text-muted-foreground hover:text-primary"
              title="الرابط الأصلي"
            >
              <ExternalLink size={14} />
            </a>
          )}
          <Link
            to={item.path}
            title={`قراءة المزيد: ${item.title}`}
            className="inline-flex shrink-0 items-center gap-1 font-bold text-primary hover:underline"
          >
            <span>{item.ctaLabel || "قراءة المزيد"}</span>
            <ArrowLeft size={14} />
          </Link>
        </div>
      </div>
    </article>
  )
}

export default ContentCard
