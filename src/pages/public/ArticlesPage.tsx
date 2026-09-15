import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { AEOHead } from "../../components/seo/AEOHead"
import { generateBreadcrumbSchema, SITE_CONFIG } from "../../lib/seo/schema"
import { containsText } from "../../lib/utils/search"
import { generateSlug } from "../../lib/utils/generateSlug"
import { truncateCleanText } from "../../lib/utils/sanitize"
import { supabase } from "../../lib/supabase/client"
import articlesData from "../../data/articles.json"
import { FilterDropdown } from "../../components/ui/FilterDropdown"
import { Search, Clock, Flame, ArrowLeft } from "lucide-react"

interface ArticleItem {
  id: string
  title: string
  slug: string
  summary?: string | null
  category?: string | null
  date?: string | null
  image?: string | null
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
        .select("id, title, slug, excerpt, published_at, created_at, cover_image, category:categories(name, name_fr)")
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
  const editorsPicks = filteredItems.slice(1, 4)
  const trending = filteredItems.slice(4, 9)
  const featuredPosts = filteredItems.slice(1, 5)

  const pageTitle = "المقالات والدراسات القانونية"
  const pageDescription = "مقالات ودراسات تحليلية في مختلف فروع القانون المغربي."

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

      <main className="min-h-screen bg-[#f8f7f4] dark:bg-[#121212]" dir="rtl">
        <div className="container mx-auto max-w-[1280px] px-4 py-6">
          {/* Header - minimal, global header already has nav */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 border-b-2 border-black dark:border-white pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="size-1 h-5 bg-[#dc2626]" />
                <h1 className="text-[24px] font-black tracking-[-0.02em]">{pageTitle}</h1>
                <span className="bg-black dark:bg-white dark:text-black text-white text-[10px] px-2 py-0.5 rounded font-bold">{filteredItems.length} مقال</span>
              </div>
              <p className="text-[12px] text-muted-foreground max-w-[600px]">{pageDescription}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input type="text" placeholder="ابحث..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-9 w-64 rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-[#1e1e1e] pr-9 pl-3 text-[12px] outline-none focus:border-black/20 dark:focus:border-white/20" />
              </div>
              <FilterDropdown className="w-44" value={activeCategory} onChange={setActiveCategory} allLabel="جميع التصنيفات" options={availableCategories.map((cat) => ({ value: cat, label: cat }))} />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-12 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="col-span-4 h-64 bg-white border border-black/5 rounded animate-pulse" />
              ))}
            </div>
          ) : filteredItems.length > 0 ? (
            <>
              {/* Main newspaper grid */}
              <div className="grid grid-cols-12 gap-6">
                {/* Editor's Picks */}
                <div className="col-span-12 lg:col-span-3">
                  <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-2">
                    <span className="size-1 h-4 bg-[#dc2626]" />
                    <h2 className="font-black text-[12px] uppercase">Editor's Picks</h2>
                  </div>
                  <div className="space-y-3">
                    {editorsPicks.map((item) => (
                      <Link key={item.id} to={`/articles/${item.slug}`} className="group flex gap-3 bg-white border border-black/5 rounded p-3 hover:border-black/15 transition-colors">
                        <div className="shrink-0 size-16 rounded bg-[#eee] overflow-hidden">
                          {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="w-full h-full grid place-items-center text-[9px]">IMG</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-bold text-[#dc2626]">{item.category || "قانون"}</span>
                          <h3 className="text-[11px] font-bold leading-snug line-clamp-2 group-hover:text-[#dc2626]">{item.title}</h3>
                          <span className="text-[9px] text-muted-foreground flex items-center gap-1 mt-1"><Clock className="size-3" /> {item.readingTime}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Main */}
                <div className="col-span-12 lg:col-span-6">
                  <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-2">
                    <span className="size-1 h-4 bg-black" />
                    <h2 className="font-black text-[12px] uppercase">Main News</h2>
                    <span className="ms-auto text-[10px] bg-[#dc2626] text-white px-2 py-0.5 rounded font-bold">مميز</span>
                  </div>
                  {featured && (
                    <Link to={`/articles/${featured.slug}`} className="group block bg-white border border-black/5 rounded overflow-hidden hover:border-black/15 transition-colors">
                      <div className="aspect-[16/10] bg-[#111] relative overflow-hidden">
                        {featured.image ? <img src={featured.image} alt={featured.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700" /> : <div className="w-full h-full bg-gradient-to-br from-primary/20 to-violet-500/20" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        <div className="absolute bottom-0 p-4 text-white">
                          <span className="bg-[#dc2626] text-[10px] font-black px-2 py-0.5 rounded">حصري</span>
                          <h2 className="mt-2 text-[18px] font-black leading-tight line-clamp-2">{featured.title}</h2>
                          <p className="mt-1 text-[11px] opacity-80 line-clamp-2">{featured.summary ? truncateCleanText(featured.summary, 100) : ""}</p>
                        </div>
                      </div>
                    </Link>
                  )}
                </div>

                {/* Trending */}
                <div className="col-span-12 lg:col-span-3">
                  <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-2">
                    <span className="size-1 h-4 bg-[#dc2626]" />
                    <h2 className="font-black text-[12px] uppercase">Trending Now</h2>
                  </div>
                  <div className="bg-white border border-black/5 rounded divide-y divide-black/5">
                    {trending.map((item, idx) => (
                      <Link key={item.id} to={`/articles/${item.slug}`} className="group flex gap-2 p-3 hover:bg-[#f8f7f4] transition-colors">
                        <span className="size-5 grid place-items-center rounded-full bg-black text-white text-[10px] font-black shrink-0">{idx + 3}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[11px] font-bold line-clamp-2 group-hover:text-[#dc2626]">{item.title}</h4>
                          <span className="text-[9px] text-muted-foreground">{item.category}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Featured Posts */}
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-2">
                  <span className="size-1 h-4 bg-black" />
                  <h2 className="font-black text-[12px] uppercase">Featured Posts</h2>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {featuredPosts.map((item) => (
                    <Link key={item.id} to={`/articles/${item.slug}`} className="group bg-white border border-black/5 rounded overflow-hidden hover:border-black/15 transition-colors">
                      <div className="aspect-[16/10] bg-[#eee] overflow-hidden">
                        {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" /> : <div className="w-full h-full grid place-items-center text-[10px]">صورة</div>}
                      </div>
                      <div className="p-3">
                        <span className="text-[9px] font-bold text-[#dc2626]">{item.category}</span>
                        <h3 className="text-[12px] font-bold leading-snug line-clamp-2 mt-1 group-hover:text-[#dc2626]">{item.title}</h3>
                        <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3" /> {item.readingTime}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* All grid */}
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-2">
                  <span className="size-1 h-4 bg-black" />
                  <h2 className="font-black text-[12px] uppercase">جميع المقالات • {filteredItems.length}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredItems.slice(4).map((item) => (
                    <Link key={item.id} to={`/articles/${item.slug}`} className="group bg-white border border-black/5 rounded p-3 hover:border-black/15 transition-colors">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
                        <span className="bg-black text-white px-1.5 py-0.5 rounded text-[9px]">{item.category || "عام"}</span>
                        <span>{item.date ? new Date(item.date).toLocaleDateString("ar-MA", { month: "short", day: "numeric" }) : ""}</span>
                      </div>
                      <h3 className="font-bold text-[13px] leading-snug line-clamp-2 group-hover:text-[#dc2626]">{item.title}</h3>
                      <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{item.summary ? truncateCleanText(item.summary, 80) : ""}</p>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-8 bg-[#111] text-white rounded p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 grid place-items-center rounded bg-[#dc2626]"><Flame className="size-5" /></div>
                  <div>
                    <div className="font-black text-[13px]">هل تبحث عن موضوع محدد؟</div>
                    <div className="text-[11px] opacity-60">استخدم البحث أو تصفح حسب التصنيف</div>
                  </div>
                </div>
                <div className="text-[11px] bg-white text-black px-3 py-1.5 rounded-full font-bold">{filteredItems.length} مقال متاح</div>
              </div>
            </>
          ) : (
            <div className="bg-white border border-dashed border-black/10 rounded p-12 text-center">
              <h3 className="font-bold">لا توجد مقالات مطابقة</h3>
              <button onClick={() => { setSearchQuery(""); setActiveCategory("all") }} className="mt-4 rounded-full border border-black/10 px-4 py-1.5 text-[12px] hover:border-black/20">إعادة ضبط</button>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
