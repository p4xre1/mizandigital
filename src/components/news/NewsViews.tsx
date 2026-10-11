import { Link } from "react-router-dom"
import { Clock, Newspaper } from "lucide-react"

export type NewsViewMode = "grid" | "list" | "timeline"

export interface NewsViewItem {
  id: string
  title: string
  summary?: string | null
  source?: string | null
  image_url?: string | null
  published_at?: string | null
  slug: string
}

const VIEW_LABELS: Record<NewsViewMode, string> = {
  grid: "بطاقات",
  list: "قائمة",
  timeline: "حسب الشهر",
}

/** أزرار تبديل العرض. كل زر له نص واضح، ولا يعتمد على أيقونة وحدها. */
export function NewsViewSwitch({
  value,
  onChange,
  label = "طريقة عرض الأخبار",
}: {
  value: NewsViewMode
  onChange: (mode: NewsViewMode) => void
  /** وصف المجموعة لقارئ الشاشة: «طريقة عرض الأخبار»، «طريقة عرض المقالات»... */
  label?: string
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {(Object.keys(VIEW_LABELS) as NewsViewMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          aria-pressed={value === mode}
          onClick={() => onChange(mode)}
          className={`min-h-[44px] rounded-full border px-4 py-2 text-base font-bold transition ${
            value === mode
              ? "border-[#2563eb] bg-[#2563eb] text-white"
              : "border-[#e2e8f0] bg-white text-[#0f172a] hover:border-[#2563eb]/40 dark:border-[#334155] dark:bg-[#1e293b] dark:text-white"
          }`}
        >
          {VIEW_LABELS[mode]}
        </button>
      ))}
    </div>
  )
}

function formatDate(value?: string | null): string {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("ar-MA")
}

/** تجميع الأخبار حسب الشهر، بالترتيب الذي وصلت به (الأحدث أولاً). الأخبار بلا تاريخ في مجموعة خاصة. */
export function groupNewsByMonth<T extends { published_at?: string | null }>(items: T[]): { key: string; label: string; items: T[] }[] {
  const groups = new Map<string, { key: string; label: string; items: T[] }>()
  for (const item of items) {
    const date = item.published_at ? new Date(item.published_at) : null
    const valid = date && !Number.isNaN(date.getTime())
    const key = valid ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` : "undated"
    if (!groups.has(key)) {
      const label = valid
        ? date.toLocaleDateString("ar-MA", { month: "long", year: "numeric" })
        : "بدون تاريخ"
      groups.set(key, { key, label, items: [] })
    }
    groups.get(key)!.items.push(item)
  }
  return Array.from(groups.values())
}

interface ViewProps {
  items: NewsViewItem[]
  /** المسار الأساسي للروابط: /news للأخبار، /articles للمقالات. */
  basePath?: string
  /** كلمة العدد في العناوين: «خبر» أو «مقال». */
  countNoun?: string
}

/** عرض قائمة: صف لكل عنصر، بتاريخه ومصدره وملخصه في سطر واحد. */
export function NewsListView({ items, basePath = "/news" }: ViewProps) {
  return (
    <ul className="divide-y divide-[#e2e8f0] overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white dark:divide-[#334155] dark:border-[#334155] dark:bg-[#1e293b]">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            to={`${basePath}/${item.slug || item.id}`}
            className="group flex flex-col gap-2 p-4 hover:bg-[#f8fafc] sm:flex-row sm:items-center sm:gap-5 dark:hover:bg-[#263449]"
          >
            <span className="flex shrink-0 items-center gap-2 text-base font-bold text-[#2563eb] dark:text-[#60a5fa] sm:w-40">
              <Clock className="size-4" aria-hidden />
              {formatDate(item.published_at) || "بدون تاريخ"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold leading-snug text-[#0f172a] group-hover:text-[#2563eb] dark:text-white">
                {item.title}
              </span>
              {item.summary && (
                <span className="mt-1 block truncate text-base text-[#475569] dark:text-[#cbd5e1]">{item.summary}</span>
              )}
            </span>
            {item.source && (
              <span className="w-fit shrink-0 rounded-full border border-[#dbeafe] bg-[#eff6ff] px-3 py-1 text-sm font-bold text-[#1d4ed8] dark:border-[#334155] dark:bg-[#1e3a5f] dark:text-[#bfdbfe]">
                {item.source}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** عرض حسب الشهر: خط زمني، ولكل شهر عنوان وعدد أخبار، ثم صفوف مختصرة. */
export function NewsTimelineView({ items, basePath = "/news", countNoun = "خبر" }: ViewProps) {
  const groups = groupNewsByMonth(items)
  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`news-month-${group.key}`}>
          <h2 id={`news-month-${group.key}`} className="mb-4 flex flex-wrap items-center gap-3 text-xl font-black text-[#0f172a] dark:text-white">
            <Newspaper className="size-5 text-[#2563eb]" aria-hidden />
            {group.label}
            <span className="rounded-full bg-[#eff6ff] px-3 py-0.5 text-base font-bold text-[#1d4ed8] dark:bg-[#1e3a5f] dark:text-[#bfdbfe]">
              {group.items.length} {countNoun}
            </span>
          </h2>
          <ol className="relative space-y-4 border-s-2 border-[#dbeafe] ps-6 dark:border-[#334155]">
            {group.items.map((item) => (
              <li key={item.id} className="relative">
                <span className="absolute -start-[31px] top-2 size-3.5 rounded-full border-2 border-[#2563eb] bg-white dark:bg-[#0f172a]" aria-hidden />
                <Link
                  to={`${basePath}/${item.slug || item.id}`}
                  className="block rounded-xl border border-[#e2e8f0] bg-white p-4 hover:border-[#2563eb]/40 dark:border-[#334155] dark:bg-[#1e293b]"
                >
                  <span className="text-sm font-bold text-[#2563eb] dark:text-[#60a5fa]">{formatDate(item.published_at)}</span>
                  <span className="mt-1 block text-lg font-bold leading-snug text-[#0f172a] dark:text-white">{item.title}</span>
                  {item.summary && <span className="mt-1 block line-clamp-2 text-base text-[#475569] dark:text-[#cbd5e1]">{item.summary}</span>}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
