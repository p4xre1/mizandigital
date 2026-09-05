import { Link } from "react-router-dom"
import { Tag } from "lucide-react"

interface ContentTagsProps {
  /** التصنيفات/الكلمات المفتاحية المراد عرضها كـ "أوسمة" أسفل المحتوى */
  tags: Array<string | null | undefined>
  /** أقصى عدد من الأوسمة المعروضة (البقية تُخفى لتفادي ازدحام الواجهة) */
  max?: number
  /** حجم أصغر للاستخدام داخل بطاقات القوائم (Archive/News/Articles) */
  size?: "sm" | "md"
  className?: string
}

/**
 * مكوّن قابل لإعادة الاستخدام يعرض التصنيفات القانونية والكلمات المفتاحية
 * كـ "أوسمة" (pills) قابلة للنقر أسفل المقالات، الأخبار، وبطاقات الأرشيف.
 * كل وسم يُحيل إلى نتائج البحث الداخلي لنفس الكلمة، مما يعزز الربط الداخلي
 * (internal linking) وإشارات السيو الدلالي (semantic SEO) عبر المنصة.
 */
export function ContentTags({ tags, max = 8, size = "md", className = "" }: ContentTagsProps) {
  const uniqueTags = Array.from(
    new Set(
      tags
        .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
        .filter((tag) => tag.length > 0)
    )
  ).slice(0, max)

  if (uniqueTags.length === 0) return null

  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-[10px] gap-1"
      : "px-3 py-1 text-xs gap-1.5"

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 ${className}`}
      itemProp="keywords"
      aria-label="التصنيفات والكلمات المفتاحية"
    >
      {uniqueTags.map((tag) => (
        <Link
          key={tag}
          to={`/search?q=${encodeURIComponent(tag)}`}
          title={`تصفّح محتوى ذي صلة بـ «${tag}»`}
          className={`inline-flex items-center rounded-full border border-border bg-muted/50 font-semibold text-muted-foreground transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary ${sizeClasses}`}
        >
          <Tag size={size === "sm" ? 10 : 12} className="shrink-0" />
          <span>{tag}</span>
        </Link>
      ))}
    </div>
  )
}
