import { useState, useEffect, useMemo } from "react"
import { SEOHead } from "../../components/seo/SEOHead"
import { generateBreadcrumbSchema, SITE_CONFIG } from "../../lib/seo/schema"
import { containsText } from "../../lib/utils/search"
import { generateSlug } from "../../lib/utils/generateSlug"
import { truncateCleanText } from "../../lib/utils/sanitize"
import { supabase } from "../../lib/supabase/client"
import articlesData from "../../data/articles.json"
import { FilterDropdown } from "../../components/ui/FilterDropdown"
import { ContentCard, type ContentCardData } from "../../components/content/ContentCard"
import {
  BookOpen,
  Search,
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
  image?: string | null
  imageAlt?: string | null
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
    image: raw.cover_image || null,
    imageAlt: raw.cover_image_alt || raw.title || null,
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
    image: raw.image || raw.coverImage || null,
    imageAlt: raw.imageAlt || raw.title || null,
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
        .select("*, category:categories(name, name_fr)")
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
    "شرح القانون المغربي بأسلوب منهجي واضح: مقالات ودراسات تحليلية معمّقة في مختلف فروع القانون المغربي (المدني، التجاري، الجنائي، الشغل...)، موجهة لطلبة كليات الحقوق والباحثين."

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
          "شرح القانون المغربي",
          "دراسات قانونية مغربية",
          "تحليل تشريعي",
          "بحوث الطلبة القانونية",
        ]}
        schema={[listSchema, breadcrumbSchema]}
      />

      <main className="container mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 md:py-10 lg:px-10" dir="rtl">
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
        <div className="mb-6 flex flex-col sm:flex-row gap-3 items-stretch bg-card p-4 rounded-xl border border-border shadow-sm">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="ابحث في عناوين وملخصات المقالات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-background pr-11 pl-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition min-h-[44px]"
            />
          </div>

          {/* Category Dropdown */}
          <FilterDropdown
            className="sm:w-64 shrink-0"
            value={activeCategory}
            onChange={setActiveCategory}
            allLabel="جميع التصنيفات"
            icon={<Filter size={14} />}
            options={availableCategories.map((cat) => ({ value: cat, label: cat }))}
          />
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-6">
            {filteredItems.map((item) => {
              const cardData: ContentCardData = {
                id: item.id,
                title: item.title,
                path: `/articles/${item.slug}`,
                summary: item.summary ? truncateCleanText(item.summary, 140) : null,
                image: item.image,
                imageAlt: item.imageAlt,
                date: item.date,
                badgeLabel: item.category,
                badgeIcon: <Tag size={12} />,
                ctaLabel: "قراءة المقال",
              }
              return <ContentCard key={item.id} item={cardData} variant="grid" />
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
