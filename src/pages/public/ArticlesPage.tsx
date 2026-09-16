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
import { Search, Clock, BookOpen } from "lucide-react"

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

  const pageTitle = "المقالات والدراسات القانونية"
  const pageDescription = "مقالات ودراسات تحليلية في مختلف فروع القانون المغربي — تصميم تعليمي نظيف مستوحى من EduFlex."

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
      <AEOHead title={pageTitle} description={pageDescription} keywords={["مقالات قانونية", "شرح القانون المغربي"]} schema={[listSchema, breadcrumbSchema]} />

      <main className="min-h-screen bg-white dark:bg-[#0f172a]" dir="rtl">
        {/* Header - EduFlex */}
        <div className="bg-[#f8fafc] dark:bg-[#0f172a] border-b border-[#e2e8f0] dark:border-[#1e293b]">
          <div className="container mx-auto max-w-[1280px] px-6 py-10">
            <div className="max-w-[720px]">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#eff6ff] dark:bg-[#1e293b] border border-[#dbeafe] dark:border-[#334155] px-3 py-1 text-[11px] font-bold text-[#2563eb] dark:text-[#60a5fa]">
                <BookOpen className="size-3.5" />
                {filteredItems.length} مقال
              </span>
              <h1 className="mt-3 text-[28px] md:text-[36px] font-black tracking-[-0.02em] text-[#0f172a] dark:text-white leading-[1.1]">
                {pageTitle}
              </h1>
              <p className="mt-3 text-[14px] leading-7 text-[#475569] dark:text-[#94a3b8]">{pageDescription}</p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-[400px]">
                  <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
                  <input type="text" maxLength={100} autoComplete="off" spellCheck={false} placeholder="ابحث في المقالات..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-10 w-full rounded-full border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] pr-10 pl-4 text-[13px] outline-none focus:border-[#2563eb]/30 focus:ring-2 focus:ring-[#2563eb]/10" />
                </div>
                <FilterDropdown className="w-48" value={activeCategory} onChange={setActiveCategory} allLabel="جميع التصنيفات" options={availableCategories.map((cat) => ({ value: cat, label: cat }))} />
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-[1280px] px-6 py-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-64 rounded-2xl bg-[#f1f5f9] dark:bg-[#1e293b] animate-pulse" />
              ))}
            </div>
          ) : filteredItems.length > 0 ? (
            <>
              {/* Featured hero - EduFlex */}
              {featured && (
                <div className="mb-8 rounded-2xl overflow-hidden border border-[#e2e8f0] dark:border-[#1e293b] bg-white dark:bg-[#1e293b] grid md:grid-cols-2">
                  <div className="aspect-[16/10] md:aspect-auto bg-[#f1f5f9] dark:bg-[#334155] relative overflow-hidden">
                    {featured.image ? <img src={featured.image} alt={featured.title} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center bg-[#dbeafe] dark:bg-[#1e3a5f]"><BookOpen className="size-12 text-[#2563eb]" /></div>}
                    <span className="absolute top-3 right-3 bg-[#2563eb] text-white text-[10px] font-bold px-2.5 py-1 rounded-full">مميز</span>
                  </div>
                  <div className="p-6 flex flex-col">
                    <span className="inline-flex w-fit bg-[#eff6ff] dark:bg-[#1e3a5f] text-[#2563eb] dark:text-[#60a5fa] text-[11px] font-bold px-3 py-1 rounded-full border border-[#dbeafe] dark:border-[#334155]">{featured.category || "قانون"}</span>
                    <h2 className="mt-3 text-[20px] font-black leading-tight text-[#0f172a] dark:text-white">{featured.title}</h2>
                    <p className="mt-2 text-[13px] leading-6 text-[#475569] dark:text-[#94a3b8] line-clamp-3">{featured.summary ? truncateCleanText(featured.summary, 140) : ""}</p>
                    <div className="mt-auto pt-4 flex items-center gap-2 text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                      <Clock className="size-3.5" /> {featured.readingTime} • {featured.date ? new Date(featured.date).toLocaleDateString("ar-MA") : ""}
                    </div>
                    <Link to={`/articles/${featured.slug}`} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#2563eb] text-white px-5 py-2.5 text-[12px] font-bold hover:bg-[#1d4ed8] w-fit">
                      اقرأ المقال →
                    </Link>
                  </div>
                </div>
              )}

              {/* Grid - EduFlex course cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredItems.slice(featured ? 1 : 0).map((item) => (
                  <Link key={item.id} to={`/articles/${item.slug}`} className="group bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] rounded-2xl overflow-hidden hover:border-[#2563eb]/20 hover:shadow-[0_8px_24px_rgba(37,99,235,0.08)] hover:-translate-y-1 transition-all">
                    <div className="aspect-[16/10] bg-[#f1f5f9] dark:bg-[#334155] overflow-hidden relative">
                      {item.image ? <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" /> : <div className="w-full h-full grid place-items-center"><BookOpen className="size-8 text-[#94a3b8]" /></div>}
                      <span className="absolute top-2 right-2 bg-white/90 dark:bg-black/60 backdrop-blur text-[10px] font-bold px-2 py-1 rounded-full border border-black/5">{item.category || "عام"}</span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-[13px] leading-snug line-clamp-2 text-[#0f172a] dark:text-white group-hover:text-[#2563eb] transition-colors">{item.title}</h3>
                      <p className="mt-1 text-[11px] text-[#64748b] dark:text-[#94a3b8] line-clamp-2 leading-5">{item.summary ? truncateCleanText(item.summary, 80) : ""}</p>
                      <div className="mt-3 flex items-center gap-2 text-[10px] text-[#64748b] dark:text-[#94a3b8]">
                        <Clock className="size-3" /> {item.readingTime}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-[#1e293b] border border-dashed border-[#e2e8f0] dark:border-[#334155] rounded-2xl p-12 text-center">
              <BookOpen className="size-10 mx-auto text-[#94a3b8]" />
              <h3 className="mt-3 font-bold">لا توجد مقالات مطابقة</h3>
              <button onClick={() => { setSearchQuery(""); setActiveCategory("all") }} className="mt-4 rounded-full bg-[#2563eb] text-white px-4 py-1.5 text-[12px] font-bold">إعادة ضبط</button>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
