import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { AEOHead } from "../../components/seo/AEOHead"
import counts from "../../data/counts.json"
import { diversifyByCategory } from "../../lib/utils/diversify"
import SiteSearchBar from "../../components/search/SiteSearchBar"
import { generateSlug } from "../../lib/utils/generateSlug"
import { CountUp } from "../../components/ui/CountUp"
import { HomeFaqSection } from "../../components/home/HomeFaqSection"
import { ProContentCard } from "../../components/content/ProContentCard"
import { AnimatedSection } from "../../components/ui/AnimatedSection"
import {
  BookOpen, Scale, GraduationCap, Newspaper, ArrowUpLeft,
  Library, Search, FileText
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
          supabase.from("articles").select("id, title, slug, excerpt, published_at, created_at, cover_image, category:categories(name)").eq("status", "published").order("published_at", { ascending: false }).limit(12),
          supabase.from("news").select("id, title, slug, summary, published_at, created_at, image_url").eq("is_published", true).order("published_at", { ascending: false }).limit(12),
        ])

        const [{ default: articlesData }, { default: newsData }] = await Promise.all([
          import("../../data/articles.json"),
          import("../../data/news.json"),
        ])

        const remoteArticles: FeedCard[] = (articlesRes.data || []).map((item: any) => ({ id: item.id, slug: item.slug, title: item.title, summary: item.excerpt, category: Array.isArray(item.category) ? item.category[0]?.name : item.category?.name, date: item.published_at || item.created_at, image: item.cover_image }))
        const localArticles: FeedCard[] = (articlesData as any[]).map((item) => ({ id: item.id, slug: item.slug, title: item.title, summary: item.excerpt, category: item.category, date: item.publishedAt, image: item.coverImage || item.image }))
        const combinedArticles = Array.from(new Map([...remoteArticles, ...localArticles].map((a) => [a.slug, a])).values())
        setLatestArticles(diversifyByCategory(combinedArticles, 4))

        const remoteNews: FeedCard[] = (newsRes.data || []).map((item: any) => ({ id: item.id, slug: item.slug || item.id, title: item.title, summary: item.summary, category: null, date: item.published_at || item.created_at, image: item.image_url }))
        const localNews: FeedCard[] = (newsData as any[]).filter((item) => item.type === "news").map((item) => ({ id: item.id, slug: item.id, title: item.title, summary: item.summary, category: item.category, date: item.date }))
        const combinedNews = Array.from(new Map([...remoteNews, ...localNews].map((n) => [n.slug, n])).values())
        setLatestNews(diversifyByCategory(combinedNews, 4))
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

  return (
    <>
      <AEOHead
        title="المعرفة القانونية للطلبة بالمغرب"
        description="ميزان الرقمية منصة مغربية مجانية لطلبة القانون، تضم ملخصات دراسية، قاموساً قانونياً، أخباراً، ندوات ودليل كليات الحقوق."
        directAnswer="ميزان الرقمية منصة مغربية مجانية لطلبة كليات الحقوق، تضم 304 سجلاً: 8 مقالات قانونية، 13 خبراً تشريعياً، 250 مصطلحاً قانونياً، 21 كلية حقوق."
        keywords={["القانون المغربي", "منصة الميزان الرقمية", "الأرشيف القانوني المغربي"]}
      />
      <main className="min-h-screen bg-background text-foreground" dir="rtl">
        {/* Hero - Minimal Editorial */}
        <section className="border-b border-border">
          <div className="container mx-auto max-w-[1200px] px-6 py-16 md:py-24 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
              <div className="space-y-8">
                <AnimatedSection>
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-medium tracking-wide">
                    <span className="size-1.5 rounded-full bg-foreground" />
                    منصة مجانية • بدون إعلانات • موثوقة
                  </div>
                </AnimatedSection>

                <AnimatedSection delay={50}>
                  <div className="space-y-6">
                    <h1 className="text-[40px] font-[800] leading-[0.95] tracking-[-0.03em] md:text-[56px]">
                      المعرفة القانونية
                      <br />
                      <span className="font-[400] tracking-[-0.02em] text-muted-foreground">للطلبة بالمغرب</span>
                    </h1>
                    <p className="max-w-[520px] text-[15px] leading-[1.7] text-muted-foreground">
                      منصة متكاملة تضم <span className="font-semibold text-foreground">{counts.lexicon + articlesCount + schoolsCount}+ مورد</span> قانوني: ملخصات S1-S6، قاموس 250 مصطلحاً، أخبار تشريعية، دليل 21 كلية، واختبارات تفاعلية — كل شيء في مكان واحد، بتصميم صمم بعناية.
                    </p>
                  </div>
                </AnimatedSection>

                <AnimatedSection delay={100}>
                  <div className="space-y-4 max-w-[480px]">
                    <SiteSearchBar />
                    <div className="flex flex-wrap gap-1.5">
                      {["مدونة الأسرة", "المسطرة المدنية", "القانون الجنائي", "مباراة المنتدبين"].map((kw) => (
                        <Link key={kw} to={`/search?q=${kw}`} className="rounded-full border border-border px-3 py-1 text-[11px] font-medium text-muted-foreground hover:border-foreground/20 hover:text-foreground transition-colors">
                          {kw}
                        </Link>
                      ))}
                    </div>
                  </div>
                </AnimatedSection>

                <AnimatedSection delay={150}>
                  <div className="flex gap-6 border-t border-border pt-6">
                    {[
                      { value: counts.lexicon, label: "مصطلح" },
                      { value: articlesCount, label: "مقال" },
                      { value: schoolsCount, label: "كلية" },
                    ].map((stat) => (
                      <div key={stat.label} className="space-y-1">
                        <div className="text-[22px] font-bold tracking-[-0.02em]"><CountUp to={stat.value} /></div>
                        <div className="text-[11px] tracking-wide text-muted-foreground">{stat.label}</div>
                      </div>
                    ))}
                    <div className="ms-auto hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="size-px h-8 w-px bg-border" />
                      <span>500+ طالب يستخدم المنصة</span>
                    </div>
                  </div>
                </AnimatedSection>
              </div>

              <AnimatedSection delay={200} className="hidden lg:block">
                <div className="space-y-3">
                  {[
                    { title: "القاموس القانوني", desc: "250 مصطلح عربي-فرنسي مع الشرح", icon: Scale, href: "/lexicon", count: `${counts.lexicon}` },
                    { title: "الأرشيف الدراسي", desc: "ملخصات S1 إلى S6 منظمة", icon: Library, href: "/archive", count: "S1-S6" },
                    { title: "الأخبار القانونية", desc: "مستجدات تشريعية يومية", icon: Newspaper, href: "/news", count: "مباشر" },
                    { title: "دليل الكليات", desc: "21 كلية حقوق بالمغرب", icon: GraduationCap, href: "/schools", count: `${schoolsCount}` },
                  ].map((item) => (
                    <Link key={item.href} to={item.href} className="group flex items-center justify-between rounded-[12px] border border-border bg-card p-4 hover:border-foreground/15 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 place-items-center rounded-[8px] border border-border bg-muted group-hover:bg-foreground group-hover:text-background transition-colors">
                          <item.icon className="size-4" />
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold tracking-[-0.01em]">{item.title}</div>
                          <div className="text-[11px] text-muted-foreground">{item.desc}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium tracking-wide text-muted-foreground border border-border rounded-full px-2 py-1">{item.count}</span>
                        <span className="grid size-6 place-items-center rounded-full border border-border group-hover:border-foreground group-hover:bg-foreground group-hover:text-background transition-all">
                          <ArrowUpLeft className="size-3" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* Manifesto - minimal */}
        <section className="border-b border-border bg-muted/30">
          <div className="container mx-auto max-w-[1200px] px-6 py-12 lg:px-8">
            <div className="grid gap-8 md:grid-cols-3">
              {[
                { title: "محتوى موثوق", desc: "مادة علمية مطابقة للتشريعات المغربية النافذة، مراجعة من أساتذة ومهنيين." },
                { title: "بحث ذكي", desc: "محرك بحث يدعم إزالة التشكيل، تطبيع الألف، والبحث الدلالي السريع." },
                { title: "مجتمع موحد", desc: "ربط طلبة القانون بمستجدات الجامعات، المباريات، والمؤسسات." },
              ].map((f, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-px w-8 bg-foreground" />
                  <h3 className="text-[13px] font-bold tracking-[-0.01em]">{f.title}</h3>
                  <p className="text-[13px] leading-[1.6] text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Latest */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto max-w-[1200px] px-6 lg:px-8">
            <div className="mb-8 flex items-baseline justify-between">
              <h2 className="text-[18px] font-bold tracking-[-0.02em]">أحدث المحتويات</h2>
              <div className="h-px flex-1 mx-6 bg-border hidden sm:block" />
              <span className="text-[11px] tracking-wide text-muted-foreground">محدّث تلقائياً</span>
            </div>

            {feedLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-[280px] animate-pulse rounded-[16px] border border-border bg-muted" />
                ))}
              </div>
            ) : (
              <div className="space-y-12">
                {latestArticles.length > 0 && (
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-[13px] font-semibold tracking-[-0.01em]">
                        <FileText className="size-4" /> المقالات
                      </h3>
                      <Link to="/articles" className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                        عرض الكل <ArrowUpLeft className="size-3" />
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {latestArticles.map((item) => (
                        <ProContentCard key={item.slug} href={`/articles/${item.slug}`} title={item.title} image={item.image} badgeLabel={item.category} summary={item.summary} />
                      ))}
                    </div>
                  </div>
                )}

                {latestNews.length > 0 && (
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-[13px] font-semibold tracking-[-0.01em]">
                        <Newspaper className="size-4" /> الأخبار
                      </h3>
                      <Link to="/news" className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                        عرض الكل <ArrowUpLeft className="size-3" />
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {latestNews.map((item) => (
                        <ProContentCard key={item.slug} href={`/news/${item.slug}`} title={item.title} image={item.image} badgeLabel="خبر" summary={item.summary} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Stats minimal */}
        <section className="border-y border-border">
          <div className="container mx-auto max-w-[1200px] px-6 py-10 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-8">
              <div className="flex gap-10">
                {[
                  { value: 500, label: "طالب", prefix: "+" },
                  { value: counts.lexicon, label: "مصطلح", prefix: "" },
                  { value: articlesCount, label: "مقال", prefix: "" },
                  { value: schoolsCount, label: "كلية", prefix: "" },
                ].map((s) => (
                  <div key={s.label} className="space-y-1">
                    <div className="text-[20px] font-bold tracking-[-0.02em]"><CountUp to={s.value} prefix={s.prefix} /></div>
                    <div className="text-[11px] text-muted-foreground tracking-wide">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="text-[12px] text-muted-foreground max-w-[300px] leading-[1.6]">
                منصة صممت بواسطة فريق من المهندسين والباحثين القانونيين — بسيطة، سريعة، ومركزة على ما يهم الطالب.
              </div>
            </div>
          </div>
        </section>

        <HomeFaqSection lexiconCount={counts.lexicon} articlesCount={articlesCount} schoolsCount={schoolsCount} />
      </main>
    </>
  )
}
