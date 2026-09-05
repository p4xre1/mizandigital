import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Calendar, ExternalLink } from "lucide-react"
import { ContentTags } from "./ContentTags"

export interface ContentCardProps {
  /** رابط الصفحة الداخلية (تفاصيل المقال أو الخبر) */
  href: string
  title: string
  image?: string | null
  /** نص بديل للصورة — يقع رجوعاً للعنوان عند غيابه لضمان فهرسة سيو سليمة */
  imageAlt?: string | null
  /** أيقونة ونص الشارة العلوية (تصنيف المقال أو مصدر الخبر) */
  badgeIcon: ReactNode
  badgeLabel?: string | null
  /** تاريخ منسّق جاهز للعرض */
  formattedDate?: string | null
  summary?: string | null
  /** أيقونة ونص أسفل البطاقة على اليمين (مثال: "منصة الميزان") */
  footerIcon: ReactNode
  footerLabel: string
  /** نص زر القراءة (مثال: "قراءة المقال" أو "التفاصيل") */
  ctaLabel: string
  /** رابط خارجي اختياري (مصدر الخبر الأصلي) */
  externalUrl?: string | null
  /** تصنيفات/كلمات مفتاحية تُعرض كأوسمة أسفل الملخص (عرض شبكي فقط) — لتعزيز السيو الدلالي */
  tags?: Array<string | null | undefined>
  /** عرض شبكي (بطاقة كاملة) أو عرض قائمة تفصيلية أفقية */
  variant?: "grid" | "list"
}

/**
 * بطاقة محتوى موحّدة تُستعمل في صفحتي "المقالات" و"الأخبار" العامتين، حتى
 * تظل هويّة العرض (الصورة، الشارات، التذييل، أزرار القراءة...) واحدة تماماً
 * بين القسمين بدل تكرار نفس التصميم يدوياً في كل صفحة على حدة.
 */
export function ContentCard({
  href,
  title,
  image,
  imageAlt,
  badgeIcon,
  badgeLabel,
  formattedDate,
  summary,
  footerIcon,
  footerLabel,
  ctaLabel,
  externalUrl,
  tags,
  variant = "grid",
}: ContentCardProps) {
  const isList = variant === "list"

  return (
    <article
      className={`group rounded-xl border border-border bg-card p-4 md:p-5 shadow-sm transition hover:border-primary/50 hover:shadow-md overflow-hidden ${
        isList
          ? "!flex !flex-row !items-center !justify-between !py-4 gap-4"
          : "flex flex-col justify-between"
      }`}
    >
      {image && !isList && (
        <Link
          to={href}
          title={title}
          className="-mx-4 -mt-4 mb-3 block aspect-[16/9] overflow-hidden bg-muted md:-mx-5 md:-mt-5"
        >
          <img
            src={image}
            alt={imageAlt || title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        </Link>
      )}

      <div className={isList ? "space-y-1 flex-1" : "space-y-2"}>
        <div className="flex items-center gap-2 mb-2 text-xs flex-wrap">
          {badgeLabel && (
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 font-semibold text-primary border border-primary/20">
              {badgeIcon}
              {badgeLabel}
            </span>
          )}
          {formattedDate && !isList && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Calendar size={12} />
              {formattedDate}
            </span>
          )}
        </div>

        <h2 className="text-base font-bold text-foreground group-hover:text-primary transition line-clamp-2 leading-snug">
          <Link to={href} title={title}>
            {title}
          </Link>
        </h2>

        {summary && !isList && (
          <p className="mt-2 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
            {summary}
          </p>
        )}

        {tags && tags.length > 0 && !isList && (
          <ContentTags tags={tags} size="sm" max={4} className="pt-1" />
        )}
      </div>

      <div
        className={
          isList
            ? "shrink-0 flex items-center gap-4"
            : "mt-6 pt-4 border-t border-border flex items-center justify-between gap-2 text-xs"
        }
      >
        {isList ? (
          formattedDate && (
            <div className="hidden sm:flex flex-col text-left text-xs text-muted-foreground">
              <span>{formattedDate}</span>
            </div>
          )
        ) : (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            {footerIcon}
            {footerLabel}
          </span>
        )}

        <div className="flex items-center gap-2">
          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary p-1"
              title="الرابط الأصلي"
            >
              <ExternalLink size={14} />
            </a>
          )}
          <Link
            to={href}
            title={`${ctaLabel}: ${title}`}
            className="inline-flex items-center gap-1 font-bold text-primary hover:underline shrink-0 text-xs py-1 px-2"
          >
            <span>{ctaLabel}</span>
            <ArrowLeft size={14} />
          </Link>
        </div>
      </div>
    </article>
  )
}
