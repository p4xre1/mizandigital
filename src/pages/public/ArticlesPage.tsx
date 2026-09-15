import { useState, useEffect, useMemo } from "react"
import { AEOHead } from "../../components/seo/AEOHead"
import { generateBreadcrumbSchema, SITE_CONFIG } from "../../lib/seo/schema"
import { containsText } from "../../lib/utils/search"
import { generateSlug } from "../../lib/utils/generateSlug"
import { truncateCleanText } from "../../lib/utils/sanitize"
import { supabase } from "../../lib/supabase/client"
import articlesData from "../../data/articles.json"
import { FilterDropdown } from "../../components/ui/FilterDropdown"
import { ProContentCard, ProContentCardSkeleton } from "../../components/content/ProContentCard"
import { AnimatedSection } from "../../components/ui/AnimatedSection"
import { Search, BookOpen } from "lucide-react"

interface ArticleItem {
  id: string
  title: string
  slug: string
  summary?: string | null
  category?: string | null
  date?: string | null
  image?: string | null
  imageAlt?: string | null
  readingTime?: string | null
}

function normalizeCmsArticle(raw: any): ArticleItem {
  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug || generateSlug(raw.title),
    summary: raw.excerpt || "",
    category: raw.category?.name || raw.category?.name_fr || null,
    date: raw.published_at || raw.created_at || null,
    image: raw.cover_image || null,
    imageAlt: raw.cover_image_alt || null,
    readingTime: "5 دقائق",
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
    imageAlt: raw.imageAlt || raw.coverImageAlt || null,
    readingTime: raw.readingTime || "4 دقائق",
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
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, slug, excerpt, published_at, created_at, cover_image, cover_image_alt, category:categories(name, name_fr)")
        .eq("status", "published")
        .order("published_at", { ascending: false })

      if (error) throw error
      const cmsItems = (data || []).map(normalizeCmsArticle)
      const localItems = (articlesData as any[]).map(normalizeLocalArticle)
      const merged = Array.from(
        new Map([...localItems, ...cmsItems].map((item) => [item.slug, item])).values()
      ).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      setItems(merged)
    } catch (err) {
      console.error(err)
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

  const featured = filteredItems[0]
  const rest = filteredItems.slice(1)

  const pageTitle = "المقالات والدراسات القانونية"
  const pageDescription =
    "مقالات ودراسات تحليلية في مختلف فروع القانون المغربي، موجهة لطلبة كليات الحقوق والباحثين."

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
      <AEOHead
        title={pageTitle}
        description={pageDescription}
        keywords={["مقالات قانونية", "شرح القانون المغربي", "دراسات قانونية مغربية"]}
        schema={[listSchema, breadcrumbSchema]}
      />

      <main className="min-h-screen bg-background" dir="rtl">
        {/* Header - minimal editorial */}
        <div className="border-b border-border">
          <div className="container mx-auto max-w-[1200px] px-6 py-10 lg:px-8">
            <AnimatedSection>
              <div className="max-w-[720px] space-y-4">
                <div className="flex items-center gap-2 text-[11px] tracking-wide text-muted-foreground">
                  <span className="h-px w-6 bg-foreground" />
                  <span>المقالات والدراسات</span>
                  <span className="size-[2px] rounded-full bg-border" />
                  <span>{filteredItems.length} مقال</span>
                </div>
                <h1 className="text-[28px] font-bold tracking-[-0.03em] leading-[1.1] md:text-[36px]">
                  {pageTitle}
                </h1>
                <p className="text-[14px] leading-[1.7] text-muted-foreground">
                  {pageDescription} محتوى موثوق، منهجي، ومراجع — مصمم لمساعدة الطلبة على الفهم العميق.
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>

        <div className="container mx-auto max-w-[1200px] px-6 py-6 lg:px-8">
          {/* Filters - minimal */}
          <AnimatedSection delay={50}>
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
              <div className="relative flex-1 max-w-[420px]">
                <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="ابحث في المقالات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-full border border-border bg-background pr-10 pl-4 text-[13px] placeholder:text-muted-foreground/60 focus:border-foreground/20 focus:outline-none transition-colors"
                />
              </div>
              <div className="flex items-center gap-2">
                <FilterDropdown
                  className="w-full sm:w-56"
                  value={activeCategory}
                  onChange={setActiveCategory}
                  allLabel="جميع التصنيفات"
                  options={availableCategories.map((cat) => ({ value: cat, label: cat }))}
                />
                <span className="hidden sm:inline-flex rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground">
                  {filteredItems.length} نتيجة
                </span>
              </div>
            </div>
          </AnimatedSection>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProContentCardSkeleton key={i} variant={i === 0 ? "hero" : "default"} />
              ))}
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="space-y-8">
              {featured && (
                <AnimatedSection>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2">
                      <ProContentCard
                        href={`/articles/${featured.slug}`}
                        title={featured.title}
                        image={featured.image}
                        imageAlt={featured.imageAlt}
                        badgeLabel={featured.category || "مميز"}
                        formattedDate={featured.date ? new Date(featured.date).toLocaleDateString("ar-MA", { year: "numeric", month: "short", day: "numeric" }) : null}
                        summary={featured.summary ? truncateCleanText(featured.summary, 140) : null}
                        readingTime={featured.readingTime || "5 دقائق"}
                        isFeatured
                        variant="hero"
                      />
                    </div>
                    <div className="space-y-4">
                      {rest.slice(0, 2).map((item) => (
                        <ProContentCard
                          key={item.id}
                          href={`/articles/${item.slug}`}
                          title={item.title}
                          image={item.image}
                          imageAlt={item.imageAlt}
                          badgeLabel={item.category}
                          formattedDate={item.date ? new Date(item.date).toLocaleDateString("ar-MA", { month: "short", day: "numeric" }) : null}
                          summary={item.summary ? truncateCleanText(item.summary, 70) : null}
                          readingTime={item.readingTime || "4 د"}
                        />
                      ))}
                    </div>
                  </div>
                </AnimatedSection>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(featured ? rest.slice(2) : filteredItems).map((item, idx) => (
                  <div key={item.id} className="animate-[slideUp_0.4s_ease_both]" style={{ animationDelay: `${idx * 30}ms` }}>
                    <ProContentCard
                      href={`/articles/${item.slug}`}
                      title={item.title}
                      image={item.image}
                      imageAlt={item.imageAlt}
                      badgeLabel={item.category}
                      formattedDate={item.date ? new Date(item.date).toLocaleDateString("ar-MA", { month: "short", day: "numeric" }) : null}
                      summary={item.summary ? truncateCleanText(item.summary, 100) : null}
                      readingTime={item.readingTime || "4 د"}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-[16px] border border-dashed border-border p-12 text-center">
              <div className="mx-auto grid size-12 place-items-center rounded-full border border-border">
                <BookOpen className="size-5 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-[14px] font-semibold">لا توجد مقالات مطابقة</h3>
              <p className="mt-1 text-[12px] text-muted-foreground">جرب تغيير كلمات البحث أو التصنيف</p>
              <button
                onClick={() => { setSearchQuery(""); setActiveCategory("all") }}
                className="mt-4 rounded-full border border-border px-4 py-1.5 text-[12px] font-medium hover:border-foreground/20 transition-colors"
              >
                إعادة ضبط
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
