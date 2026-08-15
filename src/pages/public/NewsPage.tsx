import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { SEOHead } from "../../components/seo/SEOHead"
import newsData from "../../data/news.json"
import { containsText } from "../../lib/utils/search"
import { generateSlug } from "../../lib/utils/generateSlug"
import {
  Newspaper,
  FileText,
  Search,
  Calendar,
  Clock,
  ArrowLeft,
  Tag,
  Filter,
  LayoutGrid,
  List
} from "lucide-react"

interface NewsPageProps {
  initialFilter?: "all" | "article" | "news"
}

export function NewsPage({ initialFilter = "all" }: NewsPageProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<"all" | "article" | "news">(initialFilter)
  
  // View mode state ('grid' or 'list')
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  // Filter items based on active category filter and normalized search
  const filteredItems = useMemo(() => {
    return (newsData as any[]).filter((item) => {
      const title = item.title || ""
      const summary = item.summary || item.excerpt || ""
      const category = item.category || ""
      const itemType = item.type || (item.isArticle ? "article" : "news")

      const matchesType =
        activeFilter === "all" ||
        (activeFilter === "article" && itemType === "article") ||
        (activeFilter === "news" && itemType === "news")

      const matchesSearch =
        !searchQuery ||
        containsText(title, searchQuery) ||
        containsText(summary, searchQuery) ||
        containsText(category, searchQuery)

      return matchesType && matchesSearch
    })
  }, [searchQuery, activeFilter])

  const pageTitle =
    activeFilter === "article"
      ? "المقالات والدراسات القانونية"
      : activeFilter === "news"
      ? "الأخبار والمستجدات التشريعية"
      : "الأخبار والمقالات القانونية"

  // ItemList Schema for Google Search Indexing
  const listSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": pageTitle,
    "description": "تابع أحدث المستجدات والمقالات القانونية والتحليلات للتشريعات المغربية.",
    "itemListElement": filteredItems.map((item, index) => {
      const slug = item.slug || generateSlug(item.title) || item.id
      const basePath = item.type === "article" || item.isArticle ? "/articles" : "/news"
      return {
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "NewsArticle",
          "headline": item.title,
          "description": item.summary || item.excerpt,
          "datePublished": item.date || item.publishedAt,
          "url": `https://www.mizan.page${basePath}/${slug}`
        }
      }
    })
  }

  return (
    <>
      <SEOHead
        title={pageTitle}
        description="تابع أحدث المستجدات القانونية، مستجدات الجريدة الرسمية، والمقالات والتحليلات الأكاديمية للتشريعات المغربية."
        keywords={[
          "مستجدات القانون المغربي",
          "مقالات قانونية",
          "الجريدة الرسمية المغربية",
          "تحليل تشريعي",
          "مستجدات المحاكم"
        ]}
        schema={listSchema}
      />

      <main className="container mx-auto max-w-6xl px-4 py-8 md:py-10" dir="rtl">
        {/* Header Section */}
        <header className="mb-6 md:mb-8 text-center md:text-right">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary border border-primary/20 mb-3">
            <Newspaper size={16} />
            <span>المركز الإخباري والتحليلي</span>
          </div>
          <h1 className="text-2xl font-black text-foreground md:text-4xl">
            {pageTitle}
          </h1>
          <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl">
            متابعة مستمرة لأهم المستجدات القضائية والتشريعية بالمغرب، إلى جانب دراسات ومقالات قانونية معمقة.
          </p>
        </header>

        {/* Filter & Search Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
          {/* Category Tabs - Mobile-First Touch & Momentum Scrolling */}
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none [-webkit-overflow-scrolling:touch]">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition shrink-0 min-h-[44px] ${
                activeFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Filter size={14} />
              الكل
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("news")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition shrink-0 min-h-[44px] ${
                activeFilter === "news"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Newspaper size={14} />
              الأخبار والمستجدات
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("article")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition shrink-0 min-h-[44px] ${
                activeFilter === "article"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <FileText size={14} />
              المقالات والدراسات
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="ابحث في العنوان، المحتوى أو التخصص..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-background pr-11 pl-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition min-h-[44px]"
            />
          </div>
        </div>

        {/* View Mode Switcher Toolbar */}
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/60 border border-border p-3.5 rounded-2xl backdrop-blur-md">
          <span className="text-xs font-bold text-muted-foreground">
            عدد النتائج المعروضة: <span className="text-primary">{filteredItems.length} عنصر</span>
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
              title="عرض شبكي (Grid View)"
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
              title="قائمة مفصلة (List View)"
            >
              <List size={15} />
              <span>قائمة تفصيلية</span>
            </button>
          </div>
        </div>

        {/* Content Grid / List */}
        {filteredItems.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
                : "flex flex-col space-y-3"
            }
          >
            {filteredItems.map((item: any) => {
              const itemSlug = item.slug || generateSlug(item.title) || item.id
              const isArticle = item.type === "article" || item.isArticle
              const itemPath = isArticle ? `/articles/${itemSlug}` : `/news/${itemSlug}`

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
                    <div className="flex items-center gap-2 mb-2 text-xs">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold ${
                        isArticle
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          : "bg-primary/10 text-primary border border-primary/20"
                      }`}>
                        {isArticle ? <FileText size={12} /> : <Newspaper size={12} />}
                        {item.category || (isArticle ? "مقال قانوني" : "خبر")}
                      </span>

                      {item.date && viewMode === "grid" && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Calendar size={12} />
                          {item.date}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h2 className="text-base font-bold text-foreground group-hover:text-primary transition line-clamp-2 leading-snug">
                      <Link to={itemPath}>
                        {item.title}
                      </Link>
                    </h2>

                    {/* Excerpt */}
                    {(item.summary || item.excerpt) && viewMode === "grid" && (
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {item.summary || item.excerpt}
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
                      item.readTime ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Clock size={12} />
                          {item.readTime}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Tag size={12} />
                          منصة الميزان
                        </span>
                      )
                    ) : (
                      <div className="hidden sm:flex flex-col text-left text-xs text-muted-foreground">
                        {item.date && <span>{item.date}</span>}
                        {item.readTime && <span>{item.readTime}</span>}
                      </div>
                    )}

                    <Link
                      to={itemPath}
                      className="inline-flex items-center gap-1 font-bold text-primary hover:underline shrink-0 text-xs py-1 px-2"
                    >
                      <span>قراءة المزيد</span>
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
            <Newspaper size={40} className="mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-bold text-foreground">لم يتم العثور على نتائج</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              لا توجد مقالات أو أخبار تطابق البحث الحالي.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("")
                setActiveFilter("all")
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