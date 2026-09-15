import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { AEOHead } from "../../components/seo/AEOHead"
import { containsText } from "../../lib/utils/search"
import { generateSlug } from "../../lib/utils/generateSlug"
import { supabase } from "../../lib/supabase/client"
import localNews from "../../data/news.json"
import { FilterDropdown } from "../../components/ui/FilterDropdown"
import { Search, Clock, Newspaper } from "lucide-react"

interface NewsItem {
  id: string
  title: string
  summary?: string | null
  source?: string | null
  image_url?: string | null
  published_at?: string | null
  slug: string
  category?: string | null
}

export function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeSource, setActiveSource] = useState<string>("all")

  useEffect(() => {
    fetchNewsItems()
  }, [])

  const fetchNewsItems = async () => {
    setLoading(true)
    try {
      const localItems: NewsItem[] = (localNews as any[])
        .filter((n) => n.type === "news")
        .map((n) => ({
          id: n.id,
          title: n.title,
          summary: n.summary,
          source: n.author || "منصة الميزان",
          image_url: null,
          published_at: n.date,
          slug: n.id,
          category: n.category,
        }))

      let remoteItems: NewsItem[] = []
      const { data, error } = await (supabase as any).from("news")
        .select("id, title, summary, source, image_url, is_published, published_at, slug, category")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(100)

      if (!error && data) remoteItems = data

      const remoteTitles = new Set(remoteItems.map((n) => n.title))
      const merged = [...remoteItems, ...localItems.filter((n) => !remoteTitles.has(n.title))]
      merged.sort((a, b) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime())
      setItems(merged)
    } catch {
      setItems(
        (localNews as any[]).filter((n) => n.type === "news").map((n) => ({
          id: n.id, title: n.title, summary: n.summary, source: n.author || "منصة الميزان",
          published_at: n.date, slug: n.id, category: n.category,
        }))
      )
    } finally {
      setLoading(false)
    }
  }

  const availableSources = useMemo(() => {
    const sources = items.map((item) => item.source).filter(Boolean) as string[]
    return Array.from(new Set(sources))
  }, [items])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSource = activeSource === "all" || item.source === activeSource
      const matchesSearch =
        !searchQuery ||
        containsText(item.title || "", searchQuery) ||
        containsText(item.summary || "", searchQuery) ||
        containsText(item.source || "", searchQuery)
      return matchesSource && matchesSearch
    })
  }, [items, searchQuery, activeSource])

  const featured = filteredItems[0]

  const pageTitle = "الأخبار والمستجدات التشريعية"

  const listSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: pageTitle,
    itemListElement: filteredItems.slice(0, 30).map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "NewsArticle",
        headline: item.title,
        description: item.summary || "",
        datePublished: item.published_at || "",
        url: `https://www.mizan.page/news/${item.slug || generateSlug(item.title) || item.id}`
      }
    }))
  }

  return (
    <>
      <AEOHead title={pageTitle} description="متابعة لأهم المستجدات التشريعية والقضائية بالمغرب." keywords={["أخبار القانون المغربي", "الجريدة الرسمية"]} schema={listSchema} />

      <main className="min-h-screen bg-white dark:bg-[#0f172a]" dir="rtl">
        <div className="bg-[#f8fafc] dark:bg-[#0f172a] border-b border-[#e2e8f0] dark:border-[#1e293b]">
          <div className="container mx-auto max-w-[1280px] px-6 py-10">
            <div className="max-w-[720px]">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#eff6ff] dark:bg-[#1e293b] border border-[#dbeafe] dark:border-[#334155] px-3 py-1 text-[11px] font-bold text-[#2563eb] dark:text-[#60a5fa]">
                <Newspaper className="size-3.5" />
                BREAKING NEWS • {filteredItems.length} خبر
              </span>
              <h1 className="mt-3 text-[28px] md:text-[36px] font-black tracking-[-0.02em] text-[#0f172a] dark:text-white leading-[1.1]">{pageTitle}</h1>
              <p className="mt-3 text-[14px] leading-7 text-[#475569] dark:text-[#94a3b8]">متابعة دقيقة للمستجدات القانونية والتشريعية الرسمية بالمغرب — تصميم تعليمي نظيف.</p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-[400px]">
                  <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
                  <input type="text" placeholder="ابحث في الأخبار..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-10 w-full rounded-full border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] pr-10 pl-4 text-[13px] outline-none focus:border-[#2563eb]/30 focus:ring-2 focus:ring-[#2563eb]/10" />
                </div>
                <FilterDropdown className="w-48" value={activeSource} onChange={setActiveSource} allLabel="جميع المصادر" options={availableSources.map((src) => ({ value: src, label: src }))} />
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
              {featured && (
                <div className="mb-8 rounded-2xl overflow-hidden border border-[#e2e8f0] dark:border-[#1e293b] bg-white dark:bg-[#1e293b] grid md:grid-cols-2">
                  <div className="aspect-[16/10] md:aspect-auto bg-[#0f172a] relative overflow-hidden">
                    {featured.image_url ? <img src={featured.image_url} alt={featured.title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-[#2563eb]/20 to-[#f59e0b]/20 grid place-items-center"><Newspaper className="size-12 text-white/60" /></div>}
                    <span className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full animate-pulse">عاجل</span>
                  </div>
                  <div className="p-6 flex flex-col">
                    <span className="inline-flex w-fit bg-[#fef2f2] dark:bg-[#450a0a] text-red-600 dark:text-red-400 text-[11px] font-bold px-3 py-1 rounded-full border border-red-200 dark:border-red-900/30">{featured.source || "خبر"}</span>
                    <h2 className="mt-3 text-[20px] font-black leading-tight text-[#0f172a] dark:text-white">{featured.title}</h2>
                    <p className="mt-2 text-[13px] leading-6 text-[#475569] dark:text-[#94a3b8] line-clamp-3">{featured.summary}</p>
                    <div className="mt-auto pt-4 flex items-center gap-2 text-[11px] text-[#94a3b8]">
                      <Clock className="size-3.5" /> {featured.published_at ? new Date(featured.published_at).toLocaleDateString("ar-MA") : ""}
                    </div>
                    <Link to={`/news/${featured.slug || featured.id}`} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#2563eb] text-white px-5 py-2.5 text-[12px] font-bold hover:bg-[#1d4ed8] w-fit">
                      اقرأ الخبر →
                    </Link>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredItems.slice(featured ? 1 : 0).map((item) => (
                  <Link key={item.id} to={`/news/${item.slug || item.id}`} className="group bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] rounded-2xl overflow-hidden hover:border-[#2563eb]/20 hover:shadow-[0_8px_24px_rgba(37,99,235,0.08)] hover:-translate-y-1 transition-all">
                    <div className="aspect-[16/10] bg-[#f1f5f9] dark:bg-[#334155] overflow-hidden relative">
                      {item.image_url ? <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" /> : <div className="w-full h-full grid place-items-center"><Newspaper className="size-8 text-[#94a3b8]" /></div>}
                      <span className="absolute top-2 right-2 bg-white/90 dark:bg-black/60 backdrop-blur text-[10px] font-bold px-2 py-1 rounded-full border border-black/5">{item.source || "خبر"}</span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-[13px] leading-snug line-clamp-2 text-[#0f172a] dark:text-white group-hover:text-[#2563eb] transition-colors">{item.title}</h3>
                      <p className="mt-1 text-[11px] text-[#64748b] dark:text-[#94a3b8] line-clamp-2 leading-5">{item.summary}</p>
                      <div className="mt-3 flex items-center gap-2 text-[10px] text-[#94a3b8]">
                        <Clock className="size-3" /> {item.published_at ? new Date(item.published_at).toLocaleDateString("ar-MA") : ""}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-[#1e293b] border border-dashed border-[#e2e8f0] dark:border-[#334155] rounded-2xl p-12 text-center">
              <Newspaper className="size-10 mx-auto text-[#94a3b8]" />
              <h3 className="mt-3 font-bold">لا توجد أخبار مطابقة</h3>
              <button onClick={() => { setSearchQuery(""); setActiveSource("all") }} className="mt-4 rounded-full bg-[#2563eb] text-white px-4 py-1.5 text-[12px] font-bold">إعادة ضبط</button>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
