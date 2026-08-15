import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { SEOHead } from "../../components/seo/SEOHead"
import eventsData from "../../data/events.json"
import { containsText } from "../../lib/utils/search"
import {
  Calendar,
  MapPin,
  Building2,
  Search,
  Clock,
  ArrowLeft,
  Sparkles,
  Tag,
  CheckCircle2,
  AlertCircle
} from "lucide-react"

export function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "past">("all")

  // Dynamic categories from data
  const categories = useMemo(() => {
    const set = new Set<string>()
    ;(eventsData as any[]).forEach((event) => {
      if (event.category) set.add(event.category)
    })
    return Array.from(set)
  }, [])

  // Filter events by text, category, and upcoming/past date
  const filteredEvents = useMemo(() => {
    const todayStr = "2026-08-15"

    return (eventsData as any[]).filter((event) => {
      const title = event.title || ""
      const description = event.description || event.summary || ""
      const organizer = event.organizer || event.university || ""
      const location = event.location || event.city || ""
      const category = event.category || ""
      const eventDate = event.date || ""

      const isUpcoming = eventDate >= todayStr

      // Filter by status (upcoming / past)
      if (statusFilter === "upcoming" && !isUpcoming) return false
      if (statusFilter === "past" && isUpcoming) return false

      // Filter by category
      if (selectedCategory !== "all" && category !== selectedCategory) return false

      // Filter by search term
      if (!searchQuery) return true

      return (
        containsText(title, searchQuery) ||
        containsText(description, searchQuery) ||
        containsText(organizer, searchQuery) ||
        containsText(location, searchQuery) ||
        containsText(category, searchQuery)
      )
    })
  }, [searchQuery, selectedCategory, statusFilter])

  // Schema.org Structured Data for Legal/Academic Events
  const eventsSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "الندوات والفعاليات الأكاديمية المغربية",
    "description": "دليل الندوات العلمية، الأيام الدراسية، والملتقيات القانونية في مختلف الكليات والجامعات المغربية.",
    "url": "https://www.mizan.page/events",
    "itemListElement": filteredEvents.slice(0, 15).map((event: any, index: number) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "EducationEvent",
        "name": event.title,
        "startDate": event.date,
        "location": {
          "@type": "Place",
          "name": event.location || event.city || "المغرب",
          "address": event.location || event.city || "المغرب"
        },
        "organizer": {
          "@type": "Organization",
          "name": event.organizer || event.university || "جامعة مغربية"
        },
        "description": event.description || event.summary,
        "url": `https://www.mizan.page/events/${event.id}`
      }
    }))
  }

  return (
    <>
      <SEOHead
        title="الندوات والفعاليات الأكاديمية القانونية بالمغرب"
        description="دليل الندوات العلمية، الأيام الدراسية، والمؤتمرات القانونية في مختلف كليات الحقوق والجامعات المغربية."
        keywords={[
          "ندوات قانونية بالمغرب",
          "مؤتمرات كليات الحقوق",
          "أيام دراسية قانونية",
          "فعاليات FSJES",
          "أجندة الندوات الأكاديمية"
        ]}
        schema={eventsSchema}
      />

      <main className="container mx-auto max-w-6xl px-4 py-10" dir="rtl">
        {/* Header */}
        <header className="mb-8 text-center md:text-right">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary border border-primary/20 mb-3">
            <Calendar size={16} />
            <span>الأجندة الأكاديمية الموحدة</span>
          </div>
          <h1 className="text-3xl font-black text-foreground md:text-4xl">
            الندوات والفعاليات الأكاديمية
          </h1>
          <p className="mt-2 text-base text-muted-foreground max-w-2xl">
            متابعة حية للمؤتمرات العلمية، الندوات الوطنية، والأيام الدراسية المنظمة بكليات العلوم القانونية بالمغرب.
          </p>
        </header>

        {/* Filter & Search Bar */}
        <div className="mb-8 flex flex-col gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full sm:w-96">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="text"
                placeholder="ابحث عن ندوات (عنوان، كلية، أو مدينة)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-background pr-10 pl-4 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition"
              />
            </div>

            {/* Status Filter Toggle */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg w-full sm:w-auto shrink-0 justify-center">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                  statusFilter === "all"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                الكل ({eventsData.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("upcoming")}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                  statusFilter === "upcoming"
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                الندوات القادمة
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("past")}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                  statusFilter === "past"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                الأرشيف المنتهي
              </button>
            </div>
          </div>

          {/* Category Pills */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-border/50 pb-1">
              <span className="text-xs font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
                <Tag size={12} />
                التصنيف:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition shrink-0 ${
                  selectedCategory === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                جميع التصنيفات
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition shrink-0 ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Events Grid */}
        {filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredEvents.map((event: any) => {
              const isUpcoming = (event.date || "") >= "2026-08-15"

              return (
                <article
                  key={event.id}
                  className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:border-primary/50 hover:shadow-md"
                >
                  <div>
                    {/* Top Metadata */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        {event.category && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary border border-primary/20">
                            {event.category}
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold ${
                            isUpcoming
                              ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isUpcoming ? (
                            <>
                              <Sparkles size={12} />
                              فعالية قادمة
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={12} />
                              منتهية
                            </>
                          )}
                        </span>
                      </div>

                      {event.date && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md">
                          <Calendar size={13} className="text-primary" />
                          <span>{event.date}</span>
                        </div>
                      )}
                    </div>

                    {/* Event Title */}
                    <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition leading-snug mb-3">
                      <Link to={`/events/${event.id}`}>{event.title}</Link>
                    </h2>

                    {/* Summary */}
                    {event.summary && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-4">
                        {event.summary}
                      </p>
                    )}

                    {/* Details Info Pills */}
                    <div className="space-y-2 pt-3 border-t border-border text-xs text-muted-foreground">
                      {event.organizer && (
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="shrink-0 text-primary" />
                          <span className="truncate">{event.organizer}</span>
                        </div>
                      )}

                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="shrink-0 text-primary" />
                          <span>{event.location}</span>
                        </div>
                      )}

                      {event.time && (
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="shrink-0 text-primary" />
                          <span>الساعة: {event.time}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Action Link */}
                  <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                    <Link
                      to={`/events/${event.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                    >
                      <span>تفاصيل الفعالية والرابط</span>
                      <ArrowLeft size={14} />
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <AlertCircle size={40} className="mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-bold text-foreground">لم يتم العثور على أي ندوة</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              حاول تغيير كلمات البحث أو إلغاء تصفية الحالة والتصنيف.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("")
                setSelectedCategory("all")
                setStatusFilter("all")
              }}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90"
            >
              إعادة ضبط الفلاتر
            </button>
          </div>
        )}
      </main>
    </>
  )
}