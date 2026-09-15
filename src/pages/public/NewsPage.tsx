import { useState, useEffect, useMemo } from "react"
import { AEOHead } from "../../components/seo/AEOHead"
import { containsText } from "../../lib/utils/search"
import { generateSlug } from "../../lib/utils/generateSlug"
import { supabase } from "../../lib/supabase/client"
import localNews from "../../data/news.json"
import { FilterDropdown } from "../../components/ui/FilterDropdown"
import { ProContentCard, ProContentCardSkeleton } from "../../components/content/ProContentCard"
import { AnimatedSection } from "../../components/ui/AnimatedSection"
import { Search, Newspaper, ArrowUpLeft } from "lucide-react"

interface NewsItem {
  id: string
  title: string
  summary?: string | null
  content?: string | null
  source?: string | null
  image_url?: string | null
  image_alt?: string | null
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
          content: n.content,
          source: n.author || "منصة الميزان",
          image_url: null,
          published_at: n.date,
          slug: n.id,
          category: n.category,
        }))

      let remoteItems: NewsItem[] = []
      const { data, error } = await (supabase as any).from("news")
        .select("id, title, summary, source, image_url, image_alt, is_published, published_at, slug, category")
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
  const restNews = filteredItems.slice(1)

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
      <AEOHead
        title={pageTitle}
        description="متابعة لأهم المستجدات التشريعية والقضائية بالمغرب."
        keywords={["أخبار القانون المغربي", "الجريدة الرسمية", "مستجدات التشريع"]}
        schema={listSchema}
      />

      <main className="min-h-screen bg-background" dir="rtl">
        <div className="border-b border-border">
          <div className="container mx-auto max-w-[1200px] px-6 py-10 lg:px-8">
            <AnimatedSection>
              <div className="max-w-[720px] space-y-4">
                <div className="flex items-center gap-2 text-[11px] tracking-wide text-muted-foreground">
                  <span className="h-px w-6 bg-foreground" />
                  <span>الأخبار</span>
                  <span className="size-[2px] rounded-full bg-border" />
                  <span>{filteredItems.length} خبر</span>
                </div>
                <h1 className="text-[28px] font-bold tracking-[-0.03em] leading-[1.1] md:text-[36px]">
                  {pageTitle}
                </h1>
                <p className="text-[14px] leading-[1.7] text-muted-foreground">
                  متابعة دقيقة للمستجدات القانونية والتشريعية الرسمية بالمغرب — بلاغات، جريدة رسمية، وأخبار المحاكم.
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>

        <div className="container mx-auto max-w-[1200px] px-6 py-6 lg:px-8">
          <AnimatedSection delay={50}>
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
              <div className="relative flex-1 max-w-[420px]">
                <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="ابحث في الأخبار..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-full border border-border bg-background pr-10 pl-4 text-[13px] placeholder:text-muted-foreground/60 focus:border-foreground/20 focus:outline-none transition-colors"
                />
              </div>
              <div className="flex items-center gap-2">
                <FilterDropdown
                  className="w-full sm:w-56"
                  value={activeSource}
                  onChange={setActiveSource}
                  allLabel="جميع المصادر"
                  options={availableSources.map((src) => ({ value: src, label: src }))}
                />
                <span className="hidden sm:inline-flex rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground">
                  {filteredItems.length} نتيجة
                </span>
              </div>
            </div>
          </AnimatedSection>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProContentCardSkeleton key={i} variant={i === 0 ? "hero" : "default"} />
              ))}
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="space-y-8">
              {breakingNews && (
                <AnimatedSection>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2">
                      <ProContentCard
                        href={`/news/${breakingNews.slug || breakingNews.id}`}
                        title={breakingNews.title}
                        image={breakingNews.image_url}
                        imageAlt={breakingNews.image_alt}
                        badgeLabel={breakingNews.source || "عاجل"}
                        formattedDate={breakingNews.published_at ? new Date(breakingNews.published_at).toLocaleDateString("ar-MA", { month: "short", day: "numeric" }) : null}
                        summary={breakingNews.summary || ""}
                        isFeatured
                        variant="hero"
                      />
                    </div>
                    <div className="space-y-4">
                      {restNews.slice(0, 2).map((item) => (
                        <ProContentCard
                          key={item.id}
                          href={`/news/${item.slug || item.id}`}
                          title={item.title}
                          image={item.image_url}
                          imageAlt={item.image_alt}
                          badgeLabel={item.source || "خبر"}
                          formattedDate={item.published_at ? new Date(item.published_at).toLocaleDateString("ar-MA", { month: "short", day: "numeric" }) : null}
                          summary={item.summary ? item.summary.slice(0, 70) : ""}
                        />
                      ))}
                    </div>
                  </div>
                </AnimatedSection>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(breakingNews ? restNews.slice(2) : filteredItems).map((item, idx) => (
                  <div key={item.id} className="animate-[slideUp_0.4s_ease_both]" style={{ animationDelay: `${idx * 30}ms` }}>
                    <ProContentCard
                      href={`/news/${item.slug || item.id}`}
                      title={item.title}
                      image={item.image_url}
                      imageAlt={item.image_alt}
                      badgeLabel={item.source || "خبر"}
                      formattedDate={item.published_at ? new Date(item.published_at).toLocaleDateString("ar-MA", { month: "short", day: "numeric" }) : null}
                      summary={item.summary || ""}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-[16px] border border-dashed border-border p-12 text-center">
              <div className="mx-auto grid size-12 place-items-center rounded-full border border-border">
                <Newspaper className="size-5 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-[14px] font-semibold">لا توجد أخبار مطابقة</h3>
              <p className="mt-1 text-[12px] text-muted-foreground">جرب تغيير البحث أو المصدر</p>
              <button onClick={() => { setSearchQuery(""); setActiveSource("all") }} className="mt-4 rounded-full border border-border px-4 py-1.5 text-[12px] font-medium hover:border-foreground/20 transition-colors">
                إعادة ضبط
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
