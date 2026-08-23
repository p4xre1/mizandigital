import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { SEOHead } from "../../components/seo/SEOHead"
import { containsText } from "../../lib/utils/search"
import { generateSlug } from "../../lib/utils/generateSlug"
import { supabase } from "../../lib/supabase/client"
import localNews from "../../data/news.json"
import {
  Newspaper,
  Search,
  Calendar,
  ExternalLink,
  ArrowLeft,
  Tag,
  Filter,
  LayoutGrid,
  List,
  Loader2,
  Globe
} from "lucide-react"

interface NewsItem {
  id: string
  title: string
  summary?: string | null
  content?: string | null
  source?: string | null
  source_url?: string | null
  image_url?: string | null
  is_published?: boolean | null
  published_at?: string | null
  slug: string
  created_at?: string | null
}

export function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeSource, setActiveSource] = useState<string>("all")
  
  // View mode state ('grid' or 'list')
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  useEffect(() => {
    fetchNewsItems()
  }, [])

  const fetchNewsItems = async () => {
  setLoading(true)
  try {
    // 1) الأخبار المحلية من news.json (type = "news" فقط)
    //    مع مواءمة أسماء الحقول مع واجهة NewsItem
    const localItems: NewsItem[] = (localNews as any[])
      .filter((n) => n.type === "news")
      .map((n) => ({
        id: n.id,
        title: n.title,
        summary: n.summary,
        content: n.content,
        source: n.author || "منصة الميزان",
        source_url: null,
        image_url: null,
        is_published: true,
        published_at: n.date,
        slug: n.id, // الـ JSON له id صالح كـ slug
        created_at: n.date
      }))

    // 2) أخبار Supabase (إن وُجدت)
    let remoteItems: NewsItem[] = []
    const { data, error } = await (supabase as any).from("news")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false })

    if (!error && data) remoteItems = data

    // 3) الدمج دون تكرار (بالعنوان) ثم الترتيب من الأحدث للأقدم
    const remoteTitles = new Set(remoteItems.map((n) => n.title))
    const merged = [...remoteItems, ...localItems.filter((n) => !remoteTitles.has(n.title))]
    merged.sort((a, b) =>
      new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()
    )

    setItems(merged)
  } catch (err) {
    console.error("خطأ في جلب الأخبار والمستجدات، الاعتماد على البيانات المحلية:", err)
    setItems(
      (localNews as any[])
        .filter((n) => n.type === "news")
        .map((n) => ({
          id: n.id,
          title: n.title,
          summary: n.summary,
          content: n.content,
          source: n.author || "منصة الميزان",
          published_at: n.date,
          slug: n.id,
          created_at: n.date
        }))
    )
  } finally {
    setLoading(false)
  }
}

  // استخراج مصادر الأخبار الفريدة للفلترة
  const availableSources = useMemo(() => {
    const sources = items.map((item) => item.source).filter(Boolean) as string[]
    return Array.from(new Set(sources))
  }, [items])

  // تصفية الأخبار بناءً على البحث والمصدر
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const title = item.title || ""
      const summary = item.summary || ""
      const content = item.content || ""
      const source = item.source || ""

      const matchesSource = activeSource === "all" || source === activeSource

      const matchesSearch =
        !searchQuery ||
        containsText(title, searchQuery) ||
        containsText(summary, searchQuery) ||
        containsText(content, searchQuery) ||
        containsText(source, searchQuery)

      return matchesSource && matchesSearch
    })
  }, [items, searchQuery, activeSource])

  const pageTitle = "الأخبار والمستجدات التشريعية والقضائية"

  // ItemList Schema for Google Search Indexing
  const listSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": pageTitle,
    "description": "تابع أحدث المستجدات والأخبار التشريعية والقضائية الرسمية في المغرب.",
    "itemListElement": filteredItems.slice(0, 30).map((item, index) => {
      const slug = item.slug || generateSlug(item.title) || item.id
      return {
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "NewsArticle",
          "headline": item.title,
          "description": item.summary || "",
          "datePublished": item.published_at || item.created_at || "",
          "url": `https://www.mizan.page/news/${slug}`
        }
      }
    })
  }

  return (
    <>
      <SEOHead
        title={pageTitle}
        description="متابعة مستمرة لأهم المستجدات التشريعية، البلاغات الرسمية، وأخبار الجريدة الرسمية والمحاكم المغربية."
        keywords={[
          "أخبار القانون المغربي",
          "الجريدة الرسمية",
          "مستجدات التشريع",
          "بلاغات وزارة العدل",
          "أخبار المحاكم"
        ]}
        schema={listSchema}
      />

      <main className="container mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 md:py-10 lg:px-10" dir="rtl">
        {/* Header Section */}
        <header className="mb-6 md:mb-8 text-center md:text-right">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary border border-primary/20 mb-3">
            <Newspaper size={16} />
            <span>المرصد الإخباري</span>
          </div>
          <h1 className="text-2xl font-black text-foreground md:text-4xl">
            {pageTitle}
          </h1>
          <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl">
            نافذة تفاعلية على المستجدات القانونية والتشريعية الرسمية، ومتابعة دقيقة لكل ما يُستجد في الساحة القانونية بالمغرب.
          </p>
        </header>

        {/* Filter & Search Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
          {/* Sources Tabs */}
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none [-webkit-overflow-scrolling:touch]">
            <button
              type="button"
              onClick={() => setActiveSource("all")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition shrink-0 min-h-[44px] ${
                activeSource === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Filter size={14} />
              جميع المصادر
            </button>
            {availableSources.map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => setActiveSource(src)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition shrink-0 min-h-[44px] ${
                  activeSource === src
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <Globe size={14} />
                {src}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="ابحث في العناوين أو الملخصات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-background pr-11 pl-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition min-h-[44px]"
            />
          </div>
        </div>

        {/* View Mode Switcher Toolbar */}
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/60 border border-border p-3.5 rounded-2xl backdrop-blur-md">
          <span className="text-xs font-bold text-muted-foreground">
            عدد الأخبار المعروضة: <span className="text-primary">{filteredItems.length} خبر</span>
          </span>

          <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all min-h-[38px] ${
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="عرض شبكي"
            >
              <LayoutGrid size={15} />
              <span>شبكة</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all min-h-[38px] ${
                viewMode === "list"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="قائمة تفصيلية"
            >
              <List size={15} />
              <span>قائمة تفصيلية</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : filteredItems.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
                : "flex flex-col space-y-3"
            }
          >
            {filteredItems.map((item) => {
              const itemSlug = item.slug || generateSlug(item.title) || item.id
              const itemPath = `/news/${itemSlug}`
              const formattedDate = item.published_at
                ? new Date(item.published_at).toLocaleDateString("ar-MA", {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })
                : null

              return (
                <article
                  key={item.id}
                  className={`group rounded-xl border border-border bg-card p-4 md:p-5 shadow-sm transition hover:border-primary/50 hover:shadow-md ${
                    viewMode === "list"
                      ? "!flex !flex-row !items-center !justify-between !py-4 gap-4"
                      : "flex flex-col justify-between"
                  }`}
                >
                  <div className={viewMode === "list" ? "space-y-1 flex-1" : "space-y-2"}>
                    {/* Top Metadata Badge */}
                    <div className="flex items-center gap-2 mb-2 text-xs flex-wrap">
                      {item.source && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 font-semibold text-primary border border-primary/20">
                          <Globe size={12} />
                          {item.source}
                        </span>
                      )}

                      {formattedDate && viewMode === "grid" && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Calendar size={12} />
                          {formattedDate}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h2 className="text-base font-bold text-foreground group-hover:text-primary transition line-clamp-2 leading-snug">
                      <Link to={itemPath}>
                        {item.title}
                      </Link>
                    </h2>

                    {/* Summary */}
                    {item.summary && viewMode === "grid" && (
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {item.summary}
                      </p>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div
                    className={
                      viewMode === "list"
                        ? "shrink-0 flex items-center gap-4"
                        : "mt-6 pt-4 border-t border-border flex items-center justify-between gap-2 text-xs"
                    }
                  >
                    {viewMode === "grid" ? (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Tag size={12} />
                        منصة الميزان
                      </span>
                    ) : (
                      <div className="hidden sm:flex flex-col text-left text-xs text-muted-foreground">
                        {formattedDate && <span>{formattedDate}</span>}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {item.source_url && (
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary p-1"
                          title="الرابط الأصلي للخبر"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <Link
                        to={itemPath}
                        className="inline-flex items-center gap-1 font-bold text-primary hover:underline shrink-0 text-xs py-1 px-2"
                      >
                        <span>التفاصيل</span>
                        <ArrowLeft size={14} />
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Newspaper size={40} className="mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-bold text-foreground">لا توجد أخبار متاحة</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              لا توجد مستجدات مطابقة لبحثك الحالي.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("")
                setActiveSource("all")
              }}
              className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition hover:opacity-90 min-h-[44px]"
            >
              إعادة ضبط البحث
            </button>
          </div>
        )}
      </main>
    </>
  )
}