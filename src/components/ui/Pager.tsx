import { ChevronLeft, ChevronRight } from "lucide-react"

/** أحجام الصفحة المتاحة للقارئ. */
export const PAGE_SIZES = [10, 20, 50] as const
export type PageSize = (typeof PAGE_SIZES)[number]

/**
 * أرقام الصفحات المعروضة: الأولى والأخيرة والصفحة الحالية وجارتاها، والباقي «…».
 * بدونه تصبح قائمة الأرقام طويلة لا يمكن قراءتها على الهاتف.
 */
export function pageWindow(page: number, pageCount: number): (number | "…")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)
  const keep = [1, pageCount, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pageCount)
  const sorted = Array.from(new Set(keep)).sort((a, b) => a - b)
  const out: (number | "…")[] = []
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push("…")
    out.push(n)
  })
  return out
}

interface PageSizeProps {
  value: PageSize
  onChange: (size: PageSize) => void
}

/** اختيار عدد النتائج في الصفحة: 10 أو 20 أو 50. */
export function PageSizeControl({ value, onChange }: PageSizeProps) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label="عدد النتائج في الصفحة">
      <span className="text-sm font-bold text-foreground/80">عرض</span>
      {PAGE_SIZES.map((size) => (
        <button
          key={size}
          type="button"
          aria-pressed={value === size}
          onClick={() => onChange(size)}
          className={`min-h-[40px] min-w-[52px] rounded-lg border px-3 py-1.5 text-base font-bold transition ${
            value === size ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/50"
          }`}
        >
          {size}
        </button>
      ))}
    </div>
  )
}

interface PagerProps {
  page: number
  pageCount: number
  onPage: (page: number) => void
  label?: string
}

/** أزرار الصفحات: السابق والتالي وأرقام الصفحات. لا تظهر إن كانت صفحة واحدة. */
export function Pager({ page, pageCount, onPage, label = "صفحات النتائج" }: PagerProps) {
  if (pageCount <= 1) return null
  return (
    <nav aria-label={label} className="flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-border bg-card px-4 py-2 text-base font-bold disabled:opacity-40"
      >
        <ChevronRight size={18} aria-hidden /> السابق
      </button>
      {pageWindow(page, pageCount).map((item, index) =>
        item === "…" ? (
          <span key={`gap-${index}`} className="px-1 text-base text-foreground/80" aria-hidden>
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-label={`صفحة ${item}`}
            aria-current={item === page ? "page" : undefined}
            onClick={() => onPage(item)}
            className={`min-h-[44px] min-w-[44px] rounded-lg border px-3 py-2 text-base font-bold ${
              item === page ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
            }`}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={page >= pageCount}
        onClick={() => onPage(page + 1)}
        className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-border bg-card px-4 py-2 text-base font-bold disabled:opacity-40"
      >
        التالي <ChevronLeft size={18} aria-hidden />
      </button>
    </nav>
  )
}
