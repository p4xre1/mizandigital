import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { AEOHead } from "../../components/seo/AEOHead"
import counts from "../../data/counts.json"
import { diversifyByCategory } from "../../lib/utils/diversify"
import { generateSlug } from "../../lib/utils/generateSlug"
import { CountUp } from "../../components/ui/CountUp"
import { HomeFaqSection } from "../../components/home/HomeFaqSection"
import {
  Search, Clock, Flame, ArrowLeft, Play, TrendingUp
} from "lucide-react"

interface FeedCard {
  id: string
  slug: string
  title: string
  summary?: string | null
  category?: string | null
  date?: string | null
  image?: string | null
}

export function HomePage() {
  const [latestArticles, setLatestArticles] = useState<FeedCard[]>([])
  const [latestNews, setLatestNews] = useState<FeedCard[]>([])
  const [schoolsCount, setSchoolsCount] = useState<number>(counts.schools)
  const [articlesCount, setArticlesCount] = useState<number>(counts.articles)
  const [feedLoading, setFeedLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchHomeFeed = async () => {
      try {
        const { supabase } = await import("../../lib/supabase/client")
        const [articlesRes, newsRes] = await Promise.all([
          supabase.from("articles").select("id, title, slug, excerpt, published_at, created_at, cover_image, category:categories(name)").eq("status", "published").order("published_at", { ascending: false }).limit(20),
          supabase.from("news").select("id, title, slug, summary, published_at, created_at, image_url").eq("is_published", true).order("published_at", { ascending: false }).limit(20),
        ])

        const [{ default: articlesData }, { default: newsData }] = await Promise.all([
          import("../../data/articles.json"),
          import("../../data/news.json"),
        ])

        const remoteArticles: FeedCard[] = (articlesRes.data || []).map((item: any) => ({ id: item.id, slug: item.slug, title: item.title, summary: item.excerpt, category: Array.isArray(item.category) ? item.category[0]?.name : item.category?.name, date: item.published_at || item.created_at, image: item.cover_image }))
        const localArticles: FeedCard[] = (articlesData as any[]).map((item) => ({ id: item.id, slug: item.slug, title: item.title, summary: item.excerpt, category: item.category, date: item.publishedAt, image: item.coverImage || item.image }))
        const combinedArticles = Array.from(new Map([...remoteArticles, ...localArticles].map((a) => [a.slug, a])).values())
        setLatestArticles(diversifyByCategory(combinedArticles, 12))

        const remoteNews: FeedCard[] = (newsRes.data || []).map((item: any) => ({ id: item.id, slug: item.slug || item.id, title: item.title, summary: item.summary, category: null, date: item.published_at || item.created_at, image: item.image_url }))
        const localNews: FeedCard[] = (newsData as any[]).filter((item) => item.type === "news").map((item) => ({ id: item.id, slug: item.id, title: item.title, summary: item.summary, category: item.category, date: item.date }))
        const combinedNews = Array.from(new Map([...remoteNews, ...localNews].map((n) => [n.slug, n])).values())
        setLatestNews(diversifyByCategory(combinedNews, 12))
      } catch (err) {
        console.error(err)
      } finally {
        setFeedLoading(false)
      }
    }
    fetchHomeFeed()

    const fetchCounts = async () => {
      try {
        const { supabase } = await import("../../lib/supabase/client")
        const [schoolsCountRes, articlesCountRes] = await Promise.all([
          supabase.from("schools").select("id", { count: "exact", head: true }),
          supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "published"),
        ])
        if (typeof schoolsCountRes.count === "number" && schoolsCountRes.count > 0) setSchoolsCount(schoolsCountRes.count)
        if (typeof articlesCountRes.count === "number" && articlesCountRes.count > 0) setArticlesCount(articlesCountRes.count)
      } catch {}
    }
    fetchCounts()
  }, [])

  const mainArticle = latestArticles[0]
  const editorsPicks = latestArticles.slice(1, 4)
  const trending = [...latestNews.slice(0, 5), ...latestArticles.slice(4, 7)].slice(0, 5)
  const featuredPosts = [...latestArticles.slice(4, 8)]
  const expressLeft = latestNews[0]
  const expressRight = latestNews.slice(1, 5)
  const bottomLeft = latestArticles[8]
  const bottomRight = latestArticles[9]

  const today = new Date().toLocaleDateString("ar-MA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })

  return (
    <>
      <AEOHead
        title="المعرفة القانونية للطلبة بالمغرب"
        description="ميزان الرقمية منصة مغربية مجانية لطلبة القانون، تضم ملخصات دراسية، قاموساً قانونياً، أخباراً، ندوات ودليل كليات الحقوق."
        directAnswer="ميزان الرقمية منصة مغربية مجانية لطلبة كليات الحقوق، تضم 304 سجلاً: 8 مقالات قانونية، 13 خبراً تشريعياً، 250 مصطلحاً قانونياً، 21 كلية حقوق."
        keywords={["القانون المغربي", "منصة الميزان الرقمية", "الأرشيف القانوني المغربي"]}
      />
      <main className="min-h-screen bg-[#f8f7f4] dark:bg-[#121212] text-foreground" dir="rtl">
        {/* Breaking News Ticker - only this stays, top bars removed since global header has them */}
        <div className="bg-[#dc2626] dark:bg-[#991b1b] text-white">
          <div className="container mx-auto max-w-[1280px] px-4 h-9 flex items-center gap-3 text-[12px]">
            <span className="bg-black dark:bg-white dark:text-black px-3 py-1 rounded text-[10px] font-black tracking-wide shrink-0 flex items-center gap-1">
              <span className="size-2 rounded-full bg-red-500 animate-pulse" />
              BREAKING NEWS
            </span>
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center gap-6 whitespace-nowrap">
                {[...latestNews.slice(0, 3), ...latestArticles.slice(0, 2)].map((item, i) => (
                  <span key={i} className="flex items-center gap-2">
                    <span className="opacity-60">•</span>
                    <Link to={item.slug.includes("news") || item.id.length > 10 ? `/news/${item.slug}` : `/articles/${item.slug}`} className="hover:underline font-medium">
                      {item.title}
                    </Link>
                  </span>
                ))}
              </div>
            </div>
            <span className="hidden md:block text-[10px] bg-white/20 px-2 py-1 rounded shrink-0">مباشر</span>
          </div>
        </div>

        <div className="container mx-auto max-w-[1280px] px-4 py-6">
          {feedLoading ? (
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 h-96 animate-pulse bg-white border border-black/5 rounded" />
            </div>
          ) : (
            <>
              {/* Main Grid: Editor's Picks | Main News | Trending Now */}
              <div className="grid grid-cols-12 gap-6">
                {/* Editor's Picks - Left */}
                <div className="col-span-12 lg:col-span-3">
                  <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-2">
                    <span className="size-1 h-4 bg-[#dc2626]" />
                    <h2 className="font-black text-[13px] tracking-wide uppercase">Editor's Picks</h2>
                  </div>
                  <div className="space-y-4">
                    {editorsPicks.map((item) => (
                      <Link key={item.id} to={`/articles/${item.slug}`} className="group block bg-white border border-black/5 rounded overflow-hidden hover:border-black/15 transition-colors">
                        <div className="aspect-[16/10] bg-[#eee] overflow-hidden">
                          {item.image ? (
                            <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full grid place-items-center text-[10px] text-muted-foreground">صورة</div>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1.5">
                            <span className="bg-black text-white px-1.5 py-0.5 rounded text-[9px] font-bold">{item.category || "قانون"}</span>
                            <span className="flex items-center gap-1"><Clock className="size-3" /> 2 min read</span>
                          </div>
                          <h3 className="font-bold text-[13px] leading-snug line-clamp-2 group-hover:text-[#dc2626] transition-colors">{item.title}</h3>
                          <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{item.summary}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Main News - Center */}
                <div className="col-span-12 lg:col-span-6">
                  <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-2">
                    <span className="size-1 h-4 bg-black" />
                    <h2 className="font-black text-[13px] tracking-wide uppercase">Main News</h2>
                    <span className="ms-auto text-[10px] bg-[#dc2626] text-white px-2 py-0.5 rounded font-bold">حصري</span>
                  </div>
                  {mainArticle && (
                    <Link to={`/articles/${mainArticle.slug}`} className="group block bg-white border border-black/5 rounded overflow-hidden hover:border-black/15 transition-colors">
                      <div className="relative aspect-[16/10] bg-[#111] overflow-hidden">
                        {mainArticle.image ? (
                          <img src={mainArticle.image} alt={mainArticle.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-violet-500/20 grid place-items-center">
                            <span className="text-white font-black text-[24px]">ميزان</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 p-5 text-white">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-[#dc2626] px-2 py-0.5 rounded text-[10px] font-black">عاجل</span>
                            <span className="text-[11px] opacity-80">{mainArticle.category || "تحليل قانوني"}</span>
                          </div>
                          <h2 className="text-[20px] md:text-[24px] font-black leading-tight line-clamp-2">{mainArticle.title}</h2>
                          <p className="mt-2 text-[12px] opacity-80 line-clamp-2 hidden md:block">{mainArticle.summary}</p>
                          <div className="mt-3 flex items-center gap-2 text-[10px] opacity-60">
                            <span>ميزان الرقمية</span>
                            <span>•</span>
                            <span>{mainArticle.date ? new Date(mainArticle.date).toLocaleDateString("ar-MA") : "اليوم"}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Play className="size-3" /> 3 min</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )}

                  {/* Secondary row under main - 2 cols like Bryelef Hoy */}
                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-2">
                      <span className="size-1 h-4 bg-black" />
                      <h2 className="font-black text-[13px] tracking-wide uppercase">Bryelef Hoy</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {[latestArticles[4], latestArticles[5]].filter(Boolean).map((item) => (
                        <Link key={item!.id} to={`/articles/${item!.slug}`} className="group bg-white border border-black/5 rounded overflow-hidden hover:border-black/15 transition-colors">
                          <div className="aspect-[16/10] bg-[#eee] overflow-hidden">
                            {item!.image ? <img src={item!.image} alt={item!.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" /> : <div className="w-full h-full grid place-items-center text-[10px]">صورة</div>}
                          </div>
                          <div className="p-3">
                            <span className="inline-block bg-[#0a7a3b] text-white text-[9px] font-bold px-1.5 py-0.5 rounded mb-1.5">NATIONAL • TECH</span>
                            <h3 className="font-bold text-[12px] leading-snug line-clamp-2">{item!.title}</h3>
                            <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-2">
                              <span>AF themes</span>
                              <span>•</span>
                              <span>1 year ago</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Trending Now - Right */}
                <div className="col-span-12 lg:col-span-3">
                  <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-2">
                    <span className="size-1 h-4 bg-[#dc2626]" />
                    <h2 className="font-black text-[13px] tracking-wide uppercase">Trending Now</h2>
                  </div>
                  <div className="bg-white border border-black/5 rounded divide-y divide-black/5">
                    {trending.map((item, idx) => (
                      <Link key={item.id} to={item.id.length > 15 || item.slug.startsWith("news") ? `/news/${item.slug}` : `/articles/${item.slug}`} className="group flex gap-3 p-3 hover:bg-[#f8f7f4] transition-colors">
                        <span className="shrink-0 size-6 grid place-items-center rounded-full bg-black text-white text-[11px] font-black">
                          {idx + 3}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[12px] font-bold leading-snug line-clamp-2 group-hover:text-[#dc2626]">{item.title}</h4>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="truncate">{item.category || "قانون"}</span>
                            <span>•</span>
                            <span>{item.date ? new Date(item.date).toLocaleDateString("ar-MA", { month: "short", day: "numeric" }) : "اليوم"}</span>
                          </div>
                        </div>
                        <div className="shrink-0 size-12 rounded bg-[#eee] overflow-hidden">
                          {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-[8px]">IMG</div>}
                        </div>
                      </Link>
                    ))}
                  </div>

                  <div className="mt-6 bg-[#111] text-white rounded p-4">
                    <h3 className="font-black text-[12px] mb-2">النشرة البريدية</h3>
                    <p className="text-[11px] opacity-70 leading-relaxed mb-3">احصل على أهم الأخبار القانونية يومياً في بريدك</p>
                    <div className="flex gap-1">
                      <input placeholder="بريدك الإلكتروني" className="flex-1 h-8 rounded bg-white/10 border border-white/10 px-2 text-[11px] outline-none placeholder:text-white/40" />
                      <button className="h-8 px-3 rounded bg-[#dc2626] text-[11px] font-bold hover:bg-[#b91c1c]">اشتراك</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Featured Posts - 4 cols like Kreeti */}
              <div className="mt-10">
                <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-2">
                  <span className="size-1 h-4 bg-black" />
                  <h2 className="font-black text-[13px] tracking-wide uppercase">Featured Posts</h2>
                  <span className="ms-auto text-[10px] text-muted-foreground hidden sm:block">أحدث المقالات المميزة</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {featuredPosts.map((item) => (
                    <Link key={item.id} to={`/articles/${item.slug}`} className="group bg-white border border-black/5 rounded overflow-hidden hover:border-black/15 transition-colors">
                      <div className="aspect-[16/10] bg-[#eee] overflow-hidden relative">
                        {item.image ? <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" /> : <div className="w-full h-full grid place-items-center text-[10px]">صورة</div>}
                        <span className="absolute bottom-2 left-2 bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Clock className="size-3" /> 2 min read
                        </span>
                      </div>
                      <div className="p-3">
                        <div className="flex items-center gap-1 text-[9px] font-bold mb-1.5">
                          <span className="text-[#dc2626]">{item.category || "NEWSBEAT"}</span>
                          <span className="text-black/20">•</span>
                          <span className="text-muted-foreground">TECH</span>
                        </div>
                        <h3 className="font-bold text-[12px] leading-snug line-clamp-2 group-hover:text-[#dc2626] transition-colors">{item.title}</h3>
                        <div className="mt-2 text-[10px] text-muted-foreground">AF themes • 1 year ago • 72</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Express Posts 1 & 2 - like Kreeti */}
              <div className="mt-10 grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-8">
                  <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-2">
                    <span className="size-1 h-4 bg-[#dc2626]" />
                    <h2 className="font-black text-[13px] tracking-wide uppercase">Express Posts 1</h2>
                  </div>
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 md:col-span-7">
                      {expressLeft && (
                        <Link to={`/news/${expressLeft.slug}`} className="group block bg-white border border-black/5 rounded overflow-hidden hover:border-black/15 transition-colors">
                          <div className="aspect-[16/10] bg-[#111] overflow-hidden">
                            {expressLeft.image ? <img src={expressLeft.image} alt={expressLeft.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" /> : <div className="w-full h-full grid place-items-center text-white">صورة</div>}
                          </div>
                          <div className="p-4">
                            <span className="bg-black text-white text-[9px] px-1.5 py-0.5 rounded font-bold">2 min read</span>
                            <h3 className="mt-2 font-black text-[16px] leading-tight">{expressLeft.title}</h3>
                            <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed line-clamp-3">{expressLeft.summary}</p>
                            <div className="mt-3 text-[10px] text-muted-foreground">AF themes • 1 year ago • 72</div>
                          </div>
                        </Link>
                      )}
                    </div>
                    <div className="col-span-12 md:col-span-5 space-y-4">
                      {expressRight.slice(0, 2).map((item) => (
                        <Link key={item.id} to={`/news/${item.slug}`} className="group flex gap-3 bg-white border border-black/5 rounded p-3 hover:border-black/15 transition-colors">
                          <div className="shrink-0 size-20 rounded bg-[#eee] overflow-hidden">
                            {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-[9px]">IMG</div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-bold text-[#0a7a3b]">BUSINESS</span>
                            <h4 className="text-[11px] font-bold leading-snug line-clamp-2 group-hover:text-[#dc2626]">{item.title}</h4>
                            <div className="mt-1 text-[9px] text-muted-foreground">AF themes • 1 year ago • 15</div>
                          </div>
                        </Link>
                      ))}
                      <div className="grid grid-cols-2 gap-3">
                        {expressRight.slice(2, 4).map((item) => (
                          <Link key={item.id} to={`/news/${item.slug}`} className="group bg-white border border-black/5 rounded overflow-hidden hover:border-black/15 transition-colors">
                            <div className="aspect-[4/3] bg-[#eee] overflow-hidden">
                              {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : null}
                            </div>
                            <div className="p-2">
                              <h4 className="text-[10px] font-bold leading-snug line-clamp-2">{item.title}</h4>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-4">
                  <div className="flex items-center gap-2 mb-4 border-b-2 border-black pb-2">
                    <span className="size-1 h-4 bg-black" />
                    <h2 className="font-black text-[13px] tracking-wide uppercase">Express Posts 2</h2>
                  </div>
                  <div className="space-y-3">
                    {[...latestNews.slice(5, 8), ...latestArticles.slice(6, 8)].map((item) => (
                      <Link key={item.id} to={item.id.length > 10 ? `/news/${item.slug}` : `/articles/${item.slug}`} className="group flex gap-3 bg-white border border-black/5 rounded p-3 hover:border-black/15 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 text-[8px] font-bold mb-1">
                            <span className="text-[#dc2626]">RESEARCH</span>
                            <span className="text-black/20">•</span>
                            <span className="text-muted-foreground">TRENDING</span>
                          </div>
                          <h4 className="text-[11px] font-bold leading-snug line-clamp-2 group-hover:text-[#dc2626]">{item.title}</h4>
                        </div>
                        <div className="shrink-0 size-14 rounded bg-[#eee] overflow-hidden">
                          {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-[8px]">IMG</div>}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom - Your Rexau style */}
              <div className="mt-10 grid grid-cols-12 gap-6 border-t-2 border-black pt-6">
                <div className="col-span-12 lg:col-span-8">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="size-1 h-4 bg-black" />
                    <h2 className="font-black text-[13px] tracking-wide uppercase">Your Rexau</h2>
                  </div>
                  {bottomLeft && (
                    <Link to={`/articles/${bottomLeft.slug}`} className="group grid grid-cols-12 gap-4 bg-white border border-black/5 rounded overflow-hidden hover:border-black/15 transition-colors">
                      <div className="col-span-5 aspect-[4/3] bg-[#111] overflow-hidden">
                        {bottomLeft.image ? <img src={bottomLeft.image} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" /> : <div className="w-full h-full bg-gradient-to-br from-primary to-violet-600" />}
                      </div>
                      <div className="col-span-7 p-4">
                        <h3 className="font-black text-[16px] leading-tight">{bottomLeft.title}</h3>
                        <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed line-clamp-3">{bottomLeft.summary}</p>
                        <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>ميزان الرقمية</span>
                          <span>•</span>
                          <span>قراءة 3 دقائق</span>
                        </div>
                      </div>
                    </Link>
                  )}
                </div>
                <div className="col-span-12 lg:col-span-4">
                  <div className="bg-white border border-black/5 rounded p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-black text-[12px]">Naxet o J Bna</h3>
                      <span className="size-5 grid place-items-center rounded bg-[#0a7a3b] text-white text-[10px]">3</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: "مصطلحات قانونية", value: counts.lexicon },
                        { label: "مقالات تحليلية", value: articlesCount },
                        { label: "كليات حقوق", value: schoolsCount },
                      ].map((stat) => (
                        <div key={stat.label} className="flex items-center justify-between py-2 border-b border-black/5 last:border-0">
                          <span className="text-[11px]">{stat.label}</span>
                          <span className="text-[11px] font-black"><CountUp to={stat.value} /></span>
                        </div>
                      ))}
                    </div>
                    <Link to="/lexicon" className="mt-3 flex items-center justify-between text-[11px] font-bold text-[#dc2626] hover:underline">
                      تصفح القاموس
                      <ArrowLeft className="size-3" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Stats bar - like Kreeti footer */}
              <div className="mt-10 bg-[#0a0a0a] text-white rounded p-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                  {[
                    { value: 500, label: "طالب مستفيد", prefix: "+" },
                    { value: counts.lexicon, label: "مصطلح قانوني", prefix: "+" },
                    { value: articlesCount, label: "مقال قانوني", prefix: "+" },
                    { value: schoolsCount, label: "كلية جامعية", prefix: "+" },
                    { value: 100, label: "مجاني", suffix: "%" },
                  ].map((stat, i) => (
                    <div key={i}>
                      <div className="text-[20px] font-black"><CountUp to={stat.value} prefix={stat.prefix} suffix={stat.suffix} /></div>
                      <div className="text-[10px] opacity-60">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <HomeFaqSection lexiconCount={counts.lexicon} articlesCount={articlesCount} schoolsCount={schoolsCount} />
      </main>
    </>
  )
}
