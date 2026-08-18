import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { SEOHead } from "../../components/seo/SEOHead"
import { generateBreadcrumbSchema, SITE_CONFIG } from "../../lib/seo/schema"
import { containsText } from "../../lib/utils/search"
import { generateSlug } from "../../lib/utils/generateSlug"
import { truncateCleanText } from "../../lib/utils/sanitize"
import { supabase } from "../../lib/supabase/client"
import articlesData from "../../data/articles.json"
import {
  BookOpen,
  Search,
  Calendar,
  ArrowLeft,
  Tag,
  Filter,
  Loader2,
} from "lucide-react"

interface ArticleItem {
  id: string
  title: string
  slug: string
  summary?: string | null
  category?: string | null
  date?: string | null
}

// توحيد بيانات المقالات القادمة من جدول "articles" في Supabase مع ملف articles.json المحلي
function normalizeCmsArticle(raw: any): ArticleItem {
  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug || generateSlug(raw.title),
    summary: raw.excerpt || "",
    category: raw.category?.name || raw.category?.name_fr || null,
    date: raw.published_at || raw.created_at || null,
  }
}

function normalizeLocalArticle(raw: any): ArticleItem {
  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug || generateSlug(raw.title),
    summary: raw.excerpt || raw.summary || "",
    category: raw.category || null,
    date: raw.publishedAt || raw.date || null,
  }
}

export function ArticlesPage() {
  const [items, setItems] = useState<ArticleItem[]>(
    (articlesData as any[]).map(normalizeLocalArticle)
  )
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("all")

  useEffect(() => {
    fetchArticles()
  }, [])

  const fetchArticles = async () => {
    setLoading(true)
    try {
      // مقالات لوحة التحكم المنشورة فقط (status = published)، مع اسم التصنيف عبر join
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, slug, excerpt, published_at, created_at, category:categories(name, name_fr)")
        .eq("status", "published")
        .order("published_at", { ascending: false })

      if (error) throw error

      const cmsItems = (data || []).map(normalizeCmsArticle)
      const localItems = (articlesData as any[]).map(normalizeLocalArticle)

      // إزالة التكرار (بالأولوية لمحتوى لوحة التحكم الحي) عند تطابق الـ slug
      const merged = Array.from(
        new Map([...localItems, ...cmsItems].map((item) => [item.slug, item])).values()
      ).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())

      setItems(merged)
    } catch (err) {
      console.error("خطأ في جلب المقالات:", err)
    } finally {
      setLoading(false)
    }
  }

  const availableCategories = useMemo(() => {
    const cats = items.map((item) => item.category).filter(Boolean) as string[]
    return Array.from(new Set(cats))
  }, [items])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = activeCategory === "all" || item.category === activeCategory
      const matchesSearch =
        !searchQuery ||
        containsText(item.title, searchQuery) ||
        containsText(item.summary || "", searchQuery)
      return matchesCategory && matchesSearch
    })
  }, [items, searchQuery, activeCategory])

  const pageTitle = "المقالات والدراسات القانونية"
  const pageDescription =
    "مقالات ودراسات تحليلية معمّقة في مختلف فروع القانون المغربي، بأسلوب منهجي موجه لطلبة كليات الحقوق."

  const listSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: pageTitle,
    description: pageDescription,
    itemListElement: filteredItems.slice(0, 30).map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Article",
        headline: item.title,
        description: truncateCleanText(item.summary || "", 160),
        datePublished: item.date || undefined,
        url: `${SITE_CONFIG.url}/articles/${item.slug}`,
      },
    })),
  }

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "الرئيسية", url: "/" },
    { name: pageTitle, url: "/articles" },
  ])

  return (
    <>
      <SEOHead
        title={pageTitle}
        description={pageDescription}
        keywords={[
          "مقالات قانونية",
          "دراسات قانونية مغربية",
          "تحليل تشريعي",
          "بحوث الطلبة القانونية",
        ]}
        schema={[listSchema, breadcrumbSchema]}
      />

      <main className="container mx-auto max-w-6xl px-4 py-8 md:py-10" dir="rtl">
        {/* Header Section */}
        <header className="mb-6 md:mb-8 text-center md:text-right">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary border border-primary/20 mb-3">
            <BookOpen size={16} />
            <span>المقالات والدراسات</span>
          </div>
          <h1 className="text-2xl font-black text-foreground md:text-4xl">{pageTitle}</h1>
          <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl">
            {pageDescription}
          </p>
        </header>

        {/* Filter & Search Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none [-webkit-overflow-scrolling:touch]">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition shrink-0 min-h-[44px] ${
                activeCategory === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Filter size={14} />
              جميع التصنيفات
            </button>
            {availableCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition shrink-0 min-h-[44px] ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <Tag size={14} />
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="ابحث في عناوين وملخصات المقالات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-background pr-11 pl-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition min-h-[44px]"
            />
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6 flex items-center justify-between gap-4 bg-card/60 border border-border p-3.5 rounded-2xl backdrop-blur-md">
          <span className="text-xs font-bold text-muted-foreground">
            عدد المقالات: <span className="text-primary">{filteredItems.length} مقال</span>
          </span>
        </div>

        {/* Content Grid */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredItems.map((item) => {
              const formattedDate = item.date
                ? new Date(item.date).toLocaleDateString("ar-MA", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : null

              return (
                <article
                  key={item.id}
                  className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 md:p-5 shadow-sm transition hover:border-primary/50 hover:shadow-md"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2 text-xs flex-wrap">
                      {item.category && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 font-semibold text-primary border border-primary/20">
                          <Tag size={12} />
                          {item.category}
                        </span>
                      )}
                      {formattedDate && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Calendar size={12} />
                          {formattedDate}
                        </span>
                      )}
                    </div>

                    <h2 className="text-base font-bold text-foreground group-hover:text-primary transition line-clamp-2 leading-snug">
                      <Link to={`/articles/${item.slug}`}>{item.title}</Link>
                    </h2>

                    {item.summary && (
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {truncateCleanText(item.summary, 140)}
                      </p>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-border flex items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <BookOpen size={12} />
                      منصة الميزان
                    </span>
                    <Link
                      to={`/articles/${item.slug}`}
                      className="inline-flex items-center gap-1 font-bold text-primary hover:underline shrink-0"
                    >
                      <span>قراءة المقال</span>
                      <ArrowLeft size={14} />
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <BookOpen size={40} className="mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-bold text-foreground">لا توجد مقالات متاحة</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              لا توجد مقالات مطابقة لبحثك الحالي.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("")
                setActiveCategory("all")
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
