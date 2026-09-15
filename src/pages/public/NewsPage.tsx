import { useState, useEffect, useMemo } from "react"
import { AEOHead } from "../../components/seo/AEOHead"
import { containsText } from "../../lib/utils/search"
import { generateSlug } from "../../lib/utils/generateSlug"
import { supabase } from "../../lib/supabase/client"
import localNews from "../../data/news.json"
import { FilterDropdown } from "../../components/ui/FilterDropdown"
import { ProContentCard, ProContentCardSkeleton } from "../../components/content/ProContentCard"
import { AnimatedSection, StaggerGrid } from "../../components/ui/AnimatedSection"
import { ArticleTranslateWidget } from "../../components/articles/ArticleTranslateWidget"
import {
  Newspaper,
  Search,
  Filter,
  LayoutGrid,
  List,
  Globe,
  Sparkles,
  Flame,
  Clock,
  TrendingUp,
  Zap,
  AlertCircle,
} from "lucide-react"

interface NewsItem {
  id: string
  title: string
  summary?: string | null
  content?: string | null
  source?: string | null
  source_url?: string | null
  image_url?: string | null
  image_alt?: string | null
  is_published?: boolean | null
  published_at?: string | null
  slug: string
  created_at?: string | null
  category?: string | null
  target_keyword?: string | null
}

export function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeSource, setActiveSource] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

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
          source_url: null,
          image_url: null,
          is_published: true,
          published_at: n.date,
          slug: n.id,
          created_at: n.date,
          category: n.category,
        }))

      let remoteItems: NewsItem[] = []
      const { data, error } = await (supabase as any).from("news")
        .select("id, title, summary, source, source_url, image_url, image_alt, is_published, published_at, slug, created_at, category")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(100)

      if (!error && data) remoteItems = data

      const remoteTitles = new Set(remoteItems.map((n) => n.title))
      const merged = [...remoteItems, ...localItems.filter((n) => !remoteTitles.has(n.title))]
      merged.sort((a, b) =>
        new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()
      )

      setItems(merged)
    } catch (err) {
      console.error("خطأ في جلب الأخبار:", err)
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
            created_at: n.date,
            category: n.category,
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

  const breakingNews = filteredItems[0]
  const restNews = filteredItems.slice(1)

  const pageTitle = "الأخبار والمستجدات التشريعية والقضائية"

  const listSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: pageTitle,
    description: "تابع أحدث المستجدات والأخبار التشريعية والقضائية الرسمية في المغرب.",
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
      <AEOHead
        title={pageTitle}
        description="متابعة مستمرة لأهم المستجدات التشريعية والقضائية بالمغرب: البلاغات الرسمية، منشورات الجريدة الرسمية، وأخبار المحاكم والمؤسسات القانونية والأكاديمية."
        directAnswer="أخبار تشريعية وقضائية مغربية: مستجدات القوانين، قرارات المحكمة الدستورية، ومدونة الأسرة والشغل."
        breadcrumbs={[{ name: "الرئيسية", url: "https://www.mizan.page/" }, { name: "الأخبار", url: "https://www.mizan.page/news" }]}
        canonicalUrl="https://www.mizan.page/news"
        keywords={[
          "أخبار القانون المغربي",
          "الجريدة الرسمية",
          "مستجدات التشريع",
          "بلاغات وزارة العدل",
          "أخبار المحاكم"
        ]}
        schema={listSchema}
      />

      <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_hsl(25_90%_60%/0.06),transparent_60%),radial-gradient(ellipse_at_bottom_left,_hsl(200_90%_60%/0.05),transparent_60%)]" dir="rtl">
        {/* Hero Header - News Style */}
        <div className="relative overflow-hidden border-b border-border/50">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/[0.04] via-red-500/[0.03] to-transparent" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
          
          <div className="container relative mx-auto max-w-screen-2xl px-4 py-12 sm:px-6 md:py-16 lg:px-10">
            <AnimatedSection animation="fadeUp">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-1.5 text-xs font-bold text-red-700 backdrop-blur dark:text-red-300">
                        <span className="relative flex size-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex size-2 rounded-full bg-red-500"></span>
                        </span>
                        <Newspaper className="size-4" />
                        <span>المرصد الإخباري المباشر</span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[11px] font-bold text-amber-700">
                        <Flame className="size-3.5" />
                        {filteredItems.length} خبر جديد
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <h1 className="text-3xl font-black tracking-tight text-foreground md:text-5xl lg:text-[2.75rem] leading-[1.1]">
                        <span className="bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 bg-clip-text text-transparent">الأخبار</span> والمستجدات
                        <span className="block text-[0.6em] font-bold text-muted-foreground mt-1">التشريعية والقضائية</span>
                      </h1>
                      <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-[15px]">
                        نافذة تفاعلية على المستجدات القانونية والتشريعية الرسمية، ومتابعة دقيقة لكل ما يُستجد في الساحة القانونية بالمغرب مع تنبيهات فورية.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ArticleTranslateWidget />
                    <div className="hidden sm:flex items-center gap-1 rounded-xl bg-card border border-border p-1">
                      <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition ${viewMode === "grid" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
                        <LayoutGrid className="size-4" />
                      </button>
                      <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg transition ${viewMode === "list" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
                        <List className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Breaking ticker */}
                {breakingNews && (
                  <div className="relative overflow-hidden rounded-xl border border-red-500/20 bg-gradient-to-r from-red-500/10 via-orange-500/5 to-transparent p-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-[11px] font-black text-white animate-pulse shrink-0">
                        <Zap className="size-3" /> عاجل
                      </span>
                      <p className="truncate text-[13px] font-bold text-foreground">{breakingNews.title}</p>
                      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                        <Clock className="size-3" />
                        {breakingNews.published_at ? new Date(breakingNews.published_at).toLocaleDateString("ar-MA") : "الآن"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </AnimatedSection>
          </div>
        </div>

        <div className="container mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-10">
          {/* Search & Filters */}
          <AnimatedSection animation="fadeUp" delay={100}>
            <div className="mb-8 flex flex-col gap-4 rounded-[20px] border border-border/50 bg-card/70 p-4 backdrop-blur-xl shadow-[0_8px_32px_hsl(0_0%_0%/0.04)] sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="ابحث في الأخبار: مدونة الأسرة، الجريدة الرسمية، وزارة العدل..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background/50 pr-12 pl-4 text-sm font-medium focus:border-primary/50 focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
              <FilterDropdown
                className="w-full sm:w-64"
                value={activeSource}
                onChange={setActiveSource}
                allLabel="جميع المصادر"
                icon={<Filter size={14} />}
                options={availableSources.map((src) => ({ value: src, label: src }))}
              />
              <div className="hidden lg:flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
                <span className="flex items-center gap-1"><TrendingUp className="size-3.5 text-emerald-600" />{filteredItems.length} خبر</span>
              </div>
            </div>
          </AnimatedSection>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProContentCardSkeleton key={i} variant={i === 0 ? "hero" : "default"} />
              ))}
            </div>
          ) : filteredItems.length > 0 ? (
            <>
              <div className="space-y-6">
                {breakingNews && (
                  <AnimatedSection animation="scaleIn">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2">
                        <ProContentCard
                          href={`/news/${breakingNews.slug || breakingNews.id}`}
                          title={breakingNews.title}
                          image={breakingNews.image_url}
                          imageAlt={breakingNews.image_alt}
                          badgeLabel={breakingNews.source || "عاجل"}
                          badgeColor="rose"
                          formattedDate={breakingNews.published_at ? new Date(breakingNews.published_at).toLocaleDateString("ar-MA", { month: "short", day: "numeric" }) : null}
                          summary={breakingNews.summary || ""}
                          isFeatured
                          isTrending
                          tags={breakingNews.category ? [breakingNews.category, breakingNews.source || ""] : undefined}
                          variant="hero"
                          index={0}
                        />
                      </div>
                      <div className="space-y-4">
                        {restNews.slice(0, 2).map((item, idx) => (
                          <ProContentCard
                            key={item.id}
                            href={`/news/${item.slug || item.id}`}
                            title={item.title}
                            image={item.image_url}
                            imageAlt={item.image_alt}
                            badgeLabel={item.source || item.category || "خبر"}
                            badgeColor="amber"
                            formattedDate={item.published_at ? new Date(item.published_at).toLocaleDateString("ar-MA", { month: "short", day: "numeric" }) : null}
                            summary={item.summary ? item.summary.slice(0, 80) : ""}
                            isNew
                            index={idx + 1}
                          />
                        ))}
                      </div>
                    </div>
                  </AnimatedSection>
                )}

                <div className={viewMode === "grid" ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "flex flex-col gap-3"}>
                  {viewMode === "grid" ? (
                    (breakingNews ? restNews.slice(2) : filteredItems).map((item, idx) => {
                      const isNew = item.published_at ? (Date.now() - new Date(item.published_at).getTime()) < 2 * 24 * 3600000 : false
                      const isTrending = idx < 3
                      return (
                        <div key={item.id} className="animate-[fadeUp_0.6s_cubic-bezier(0.16,1,0.3,1)_both]" style={{ animationDelay: `${(idx + 3) * 60}ms` }}>
                          <ProContentCard
                            href={`/news/${item.slug || item.id}`}
                            title={item.title}
                            image={item.image_url}
                            imageAlt={item.image_alt}
                            badgeLabel={item.source || item.category || "خبر"}
                            badgeColor={isTrending ? "rose" : "amber"}
                            formattedDate={item.published_at ? new Date(item.published_at).toLocaleDateString("ar-MA", { month: "short", day: "numeric" }) : null}
                            summary={item.summary || ""}
                            isNew={isNew}
                            isTrending={isTrending}
                            tags={item.category ? [item.category] : undefined}
                            index={idx + 3}
                          />
                        </div>
                      )
                    })
                  ) : (
                    (breakingNews ? restNews : filteredItems).map((item, idx) => (
                      <AnimatedSection key={item.id} animation="slideRight" delay={idx * 40}>
                        <div className="group flex gap-4 rounded-2xl border border-border bg-card p-4 hover:border-primary/20 hover:shadow-lg transition-all">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span className="rounded-full bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-700">{item.source || "خبر"}</span>
                              {item.published_at && <span>{new Date(item.published_at).toLocaleDateString("ar-MA")}</span>}
                            </div>
                            <h3 className="mt-2 font-bold text-foreground group-hover:text-primary line-clamp-1">{item.title}</h3>
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{item.summary}</p>
                          </div>
                          <div className="shrink-0 grid place-items-center size-10 rounded-xl bg-muted group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <Globe className="size-5" />
                          </div>
                        </div>
                      </AnimatedSection>
                    ))
                  )}
                </div>
              </div>

              <AnimatedSection animation="fadeUp" delay={400} className="mt-12">
                <div className="relative overflow-hidden rounded-[24px] border border-orange-500/10 bg-gradient-to-br from-orange-500/[0.06] via-red-500/[0.04] to-transparent p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-red-600 to-orange-600 text-white shadow-[0_8px_20px_hsl(0_84%_60%/0.25)]">
                        <AlertCircle className="size-6" />
                      </div>
                      <div>
                        <h3 className="text-[14px] font-black">تنبيهات القوانين الجديدة</h3>
                        <p className="text-[12px] text-muted-foreground">اشترك لتصلك المستجدات التشريعية فور صدورها</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-card border border-border px-3 py-1.5 text-[11px] font-bold flex items-center gap-1">
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" /> مباشر
                      </span>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            </>
          ) : (
            <AnimatedSection animation="scaleIn">
              <div className="rounded-[24px] border border-dashed border-border bg-card p-12 text-center">
                <div className="mx-auto grid size-20 place-items-center rounded-[20px] bg-muted text-muted-foreground/50">
                  <Newspaper className="size-10" />
                </div>
                <h3 className="mt-4 text-lg font-black">لا توجد أخبار مطابقة</h3>
                <p className="mt-1 text-sm text-muted-foreground">جرب تغيير البحث أو المصدر</p>
                <button onClick={() => { setSearchQuery(""); setActiveSource("all") }} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground">
                  <Sparkles className="size-4" /> إعادة ضبط
                </button>
              </div>
            </AnimatedSection>
          )}
        </div>
      </main>
    </>
  )
}
