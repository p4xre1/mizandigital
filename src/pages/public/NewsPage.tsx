import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { AEOHead } from "../../components/seo/AEOHead"
import { containsText } from "../../lib/utils/search"
import { generateSlug } from "../../lib/utils/generateSlug"
import { supabase } from "../../lib/supabase/client"
import localNews from "../../data/news.json"
import { FilterDropdown } from "../../components/ui/FilterDropdown"
import { Search, Clock, Flame } from "lucide-react"

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

  const breakingNews = filteredItems[0]
  const editorsPicks = filteredItems.slice(1, 4)
  const trending = filteredItems.slice(4, 9)
  const featuredPosts = filteredItems.slice(1, 5)

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

      <main className="min-h-screen bg-[#fffefb] dark:bg-[#1c1917]" dir="rtl">
        <div className="container mx-auto max-w-[1280px] px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 border-b-2 border-[#1e293b] dark:border-white pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="size-1 h-5 bg-[#f59e0b]" />
                <h1 className="text-[24px] font-black tracking-[-0.02em]">{pageTitle}</h1>
                <span className="bg-[#1e293b] dark:bg-white dark:text-black text-white text-[10px] px-2 py-0.5 rounded font-bold">{filteredItems.length} خبر</span>
              </div>
              <p className="text-[12px] text-muted-foreground max-w-[600px]">متابعة دقيقة للمستجدات القانونية والتشريعية الرسمية بالمغرب.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input type="text" placeholder="ابحث..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-9 w-64 rounded-full border border-[#e7e5e4] dark:border-white/10 bg-white dark:bg-[#292524] pr-9 pl-3 text-[12px] outline-none focus:border-[#1e293b]/20 dark:focus:border-white/20" />
              </div>
              <FilterDropdown className="w-44" value={activeSource} onChange={setActiveSource} allLabel="جميع المصادر" options={availableSources.map((src) => ({ value: src, label: src }))} />
            </div>
          </div>

          <div className="bg-[#f59e0b] dark:bg-[#d97706] text-white rounded mb-6">
            <div className="px-4 h-9 flex items-center gap-3 text-[12px]">
              <span className="bg-[#1e293b] dark:bg-white dark:text-black px-3 py-1 rounded text-[10px] font-black shrink-0">BREAKING NEWS</span>
              <div className="flex-1 truncate">{breakingNews && <span>{breakingNews.title}</span>}</div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-12 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="col-span-4 h-64 bg-white border border-[#e7e5e4] rounded animate-pulse" />
              ))}
            </div>
          ) : filteredItems.length > 0 ? (
            <>
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-3">
                  <div className="flex items-center gap-2 mb-4 border-b-2 border-[#1e293b] pb-2">
                    <span className="size-1 h-4 bg-[#f59e0b]" />
                    <h2 className="font-black text-[12px] uppercase">Editor's Picks</h2>
                  </div>
                  <div className="space-y-3">
                    {editorsPicks.map((item) => (
                      <Link key={item.id} to={`/news/${item.slug || item.id}`} className="group flex gap-3 bg-white border border-[#e7e5e4] rounded p-3 hover:border-[#1e293b]/15 transition-colors">
                        <div className="shrink-0 size-16 rounded bg-[#eee] overflow-hidden">
                          {item.image_url ? <img src={item.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-[9px]">IMG</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-bold text-[#f59e0b]">{item.source || "خبر"}</span>
                          <h3 className="text-[11px] font-bold leading-snug line-clamp-2 group-hover:text-[#f59e0b]">{item.title}</h3>
                          <span className="text-[9px] text-muted-foreground flex items-center gap-1 mt-1"><Clock className="size-3" /> {item.published_at ? new Date(item.published_at).toLocaleDateString("ar-MA") : ""}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-6">
                  <div className="flex items-center gap-2 mb-4 border-b-2 border-[#1e293b] pb-2">
                    <span className="size-1 h-4 bg-[#1e293b]" />
                    <h2 className="font-black text-[12px] uppercase">Main News</h2>
                    <span className="ms-auto text-[10px] bg-[#f59e0b] text-white px-2 py-0.5 rounded font-bold">عاجل</span>
                  </div>
                  {breakingNews && (
                    <Link to={`/news/${breakingNews.slug || breakingNews.id}`} className="group block bg-white border border-[#e7e5e4] rounded overflow-hidden hover:border-[#1e293b]/15 transition-colors">
                      <div className="aspect-[16/10] bg-[#334155] relative overflow-hidden">
                        {breakingNews.image_url ? <img src={breakingNews.image_url} alt={breakingNews.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700" /> : <div className="w-full h-full bg-gradient-to-br from-red-500/20 to-orange-500/20" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        <div className="absolute bottom-0 p-4 text-white">
                          <span className="bg-[#f59e0b] text-[10px] font-black px-2 py-0.5 rounded">عاجل</span>
                          <h2 className="mt-2 text-[18px] font-black leading-tight line-clamp-2">{breakingNews.title}</h2>
                          <p className="mt-1 text-[11px] opacity-80 line-clamp-2">{breakingNews.summary}</p>
                        </div>
                      </div>
                    </Link>
                  )}
                </div>

                <div className="col-span-12 lg:col-span-3">
                  <div className="flex items-center gap-2 mb-4 border-b-2 border-[#1e293b] pb-2">
                    <span className="size-1 h-4 bg-[#f59e0b]" />
                    <h2 className="font-black text-[12px] uppercase">Trending Now</h2>
                  </div>
                  <div className="bg-white border border-[#e7e5e4] rounded divide-y divide-black/5">
                    {trending.map((item, idx) => (
                      <Link key={item.id} to={`/news/${item.slug || item.id}`} className="group flex gap-2 p-3 hover:bg-[#fffefb] transition-colors">
                        <span className="size-5 grid place-items-center rounded-full bg-[#1e293b] text-white text-[10px] font-black shrink-0">{idx + 3}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[11px] font-bold line-clamp-2 group-hover:text-[#f59e0b]">{item.title}</h4>
                          <span className="text-[9px] text-muted-foreground">{item.source}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <div className="flex items-center gap-2 mb-4 border-b-2 border-[#1e293b] pb-2">
                  <span className="size-1 h-4 bg-[#1e293b]" />
                  <h2 className="font-black text-[12px] uppercase">Featured Posts</h2>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {featuredPosts.map((item) => (
                    <Link key={item.id} to={`/news/${item.slug || item.id}`} className="group bg-white border border-[#e7e5e4] rounded overflow-hidden hover:border-[#1e293b]/15 transition-colors">
                      <div className="aspect-[16/10] bg-[#eee] overflow-hidden">
                        {item.image_url ? <img src={item.image_url} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" /> : <div className="w-full h-full grid place-items-center text-[10px]">صورة</div>}
                      </div>
                      <div className="p-3">
                        <span className="text-[9px] font-bold text-[#f59e0b]">{item.source || "خبر"}</span>
                        <h3 className="text-[12px] font-bold leading-snug line-clamp-2 mt-1 group-hover:text-[#f59e0b]">{item.title}</h3>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <div className="flex items-center gap-2 mb-4 border-b-2 border-[#1e293b] pb-2">
                  <span className="size-1 h-4 bg-[#1e293b]" />
                  <h2 className="font-black text-[12px] uppercase">جميع الأخبار • {filteredItems.length}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredItems.slice(4).map((item) => (
                    <Link key={item.id} to={`/news/${item.slug || item.id}`} className="group bg-white border border-[#e7e5e4] rounded p-3 hover:border-[#1e293b]/15 transition-colors">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
                        <span className="bg-[#1e293b] text-white px-1.5 py-0.5 rounded text-[9px]">{item.source || "خبر"}</span>
                        <span>{item.published_at ? new Date(item.published_at).toLocaleDateString("ar-MA", { month: "short", day: "numeric" }) : ""}</span>
                      </div>
                      <h3 className="font-bold text-[13px] leading-snug line-clamp-2 group-hover:text-[#f59e0b]">{item.title}</h3>
                      <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{item.summary}</p>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-8 bg-[#334155] text-white rounded p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 grid place-items-center rounded bg-[#f59e0b]"><Flame className="size-5" /></div>
                  <div>
                    <div className="font-black text-[13px]">تنبيهات القوانين الجديدة</div>
                    <div className="text-[11px] opacity-60">اشترك لتصلك المستجدات فور صدورها</div>
                  </div>
                </div>
                <div className="text-[11px] bg-white text-black px-3 py-1.5 rounded-full font-bold">{filteredItems.length} خبر متاح</div>
              </div>
            </>
          ) : (
            <div className="bg-white border border-dashed border-[#e7e5e4] rounded p-12 text-center">
              <h3 className="font-bold">لا توجد أخبار مطابقة</h3>
              <button onClick={() => { setSearchQuery(""); setActiveSource("all") }} className="mt-4 rounded-full border border-[#e7e5e4] px-4 py-1.5 text-[12px] hover:border-[#1e293b]/20">إعادة ضبط</button>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
