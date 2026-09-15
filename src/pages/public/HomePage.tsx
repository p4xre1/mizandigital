import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { AEOHead } from "../../components/seo/AEOHead"
import {
  generateOrganizationSchema,
  generateWebSiteSchema,
  generateLegalServiceSchema,
} from "../../lib/seo/schema"
import counts from "../../data/counts.json"
import { diversifyByCategory } from "../../lib/utils/diversify"
import SiteSearchBar from "../../components/search/SiteSearchBar"
import { generateSlug } from "../../lib/utils/generateSlug"
import { CountUp } from "../../components/ui/CountUp"
import { HomeFaqSection } from "../../components/home/HomeFaqSection"
import { ProContentCard } from "../../components/content/ProContentCard"
import { AnimatedSection, StaggerGrid } from "../../components/ui/AnimatedSection"
import {
  BookOpen, Scale, GraduationCap, Newspaper, Calendar, Search, ArrowLeft,
  ShieldCheck, FileText, Sparkles, Users, Video, Loader2, Download,
  TrendingUp, Zap, Globe, Award, Library, Flame, ArrowUpRight, Star, CheckCircle2
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
  const [latestEvents, setLatestEvents] = useState<FeedCard[]>([])
  const [latestDocs, setLatestDocs] = useState<FeedCard[]>([])
  const [latestTerms, setLatestTerms] = useState<FeedCard[]>([])
  const [feedLoading, setFeedLoading] = useState<boolean>(true)
  const [schoolsCount, setSchoolsCount] = useState<number>(counts.schools)
  const [articlesCount, setArticlesCount] = useState<number>(counts.articles)

  useEffect(() => {
    const fetchHomeFeed = async () => {
      try {
        const { supabase } = await import("../../lib/supabase/client")
        const [articlesRes, newsRes, seminarsRes, docsRes, termsRes] = await Promise.all([
          supabase.from("articles").select("id, title, slug, excerpt, published_at, created_at, cover_image, category:categories(name)").eq("status", "published").order("published_at", { ascending: false }).limit(15),
          supabase.from("news").select("id, title, slug, summary, published_at, created_at, image_url").eq("is_published", true).order("published_at", { ascending: false }).limit(15),
          supabase.from("seminars").select("id, title, agenda, event_date, status").eq("status", "published").order("event_date", { ascending: false }).limit(6),
          supabase.from("pdf_summaries").select("id, title, slug, description, semester, created_at").order("created_at", { ascending: false }).limit(6),
          supabase.from("lexicon_terms").select("id, term_ar, term_fr, definition, category, created_at").order("created_at", { ascending: false }).limit(6),
        ])

        const [{ default: articlesData }, { default: newsData }, { default: eventsData }] = await Promise.all([
          import("../../data/articles.json"),
          import("../../data/news.json"),
          import("../../data/events.json"),
        ])

        const remoteArticles: FeedCard[] = (articlesRes.data || []).map((item: any) => ({ id: item.id, slug: item.slug, title: item.title, summary: item.excerpt, category: Array.isArray(item.category) ? item.category[0]?.name : item.category?.name, date: item.published_at || item.created_at, image: item.cover_image }))
        const localArticles: FeedCard[] = (articlesData as any[]).map((item) => ({ id: item.id, slug: item.slug, title: item.title, summary: item.excerpt, category: item.category, date: item.publishedAt, image: item.coverImage || item.image }))
        const combinedArticles = Array.from(new Map([...remoteArticles, ...localArticles].map((a) => [a.slug, a])).values())
        setLatestArticles(diversifyByCategory(combinedArticles, 4))

        const remoteNews: FeedCard[] = (newsRes.data || []).map((item: any) => ({ id: item.id, slug: item.slug || item.id, title: item.title, summary: item.summary, category: null, date: item.published_at || item.created_at, image: item.image_url }))
        const localNews: FeedCard[] = (newsData as any[]).filter((item) => item.type === "news").map((item) => ({ id: item.id, slug: item.id, title: item.title, summary: item.summary, category: item.category, date: item.date }))
        const combinedNews = Array.from(new Map([...remoteNews, ...localNews].map((n) => [n.slug, n])).values())
        setLatestNews(diversifyByCategory(combinedNews, 4))

        const remoteEvents: FeedCard[] = (seminarsRes.data || []).map((item: any) => ({ id: `seminar-${item.id}`, slug: `seminar-${item.id}`, title: item.title, summary: item.agenda, category: "ندوة قانونية", date: item.event_date }))
        const localEvents: FeedCard[] = (eventsData as any[]).map((item: any) => ({ id: item.id, slug: item.id, title: item.title, summary: item.excerpt, category: item.category, date: item.eventDate }))
        const combinedEvents = [...remoteEvents, ...localEvents].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 3)
        setLatestEvents(combinedEvents)

        const remoteDocs: FeedCard[] = (docsRes.data || []).map((item: any) => ({ id: item.id, slug: item.slug || `pdf-${item.id}`, title: item.title, summary: item.description, category: item.semester, date: item.created_at }))
        setLatestDocs(remoteDocs.slice(0, 3))

        const remoteTerms: FeedCard[] = (termsRes.data || []).map((item: any) => ({ id: item.id, slug: generateSlug(item.term_ar), title: item.term_ar, summary: item.term_fr, category: item.category, date: item.created_at }))
        const fallbackTerms: FeedCard[] = remoteTerms.length > 0 ? [] : (await import("../../data/lexicon.json")).default.slice(0, 3).map((item: any) => ({ id: item.id, slug: generateSlug(item.term_ar), title: item.term_ar, summary: item.term_fr, category: item.category, date: null }))
        setLatestTerms(remoteTerms.length > 0 ? remoteTerms.slice(0, 3) : fallbackTerms)
      } catch (err) {
        console.error("خطأ:", err)
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
        directAnswer="ميزان الرقمية منصة مغربية مجانية لطلبة كليات الحقوق، تضم 304 سجلاً: 8 مقالات قانونية، 13 خبراً تشريعياً، 250 مصطلحاً قانونياً، 21 كلية حقوق، وأرشيف ملخصات S1-S6، و4 مسارات اختبارات."
        keywords={["القانون المغربي", "منصة الميزان الرقمية", "الأرشيف القانوني المغربي", "مدونة الشغل المغربية", "المعجم القانوني المغربي", "كليات الحقوق بالمغرب"]}
      />
      <main className="min-h-screen bg-background text-foreground overflow-hidden" dir="rtl">
        {/* HERO - Pro */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-violet-500/[0.05] to-accent-gold/[0.04]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.4)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.4)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
          <div className="absolute top-20 right-[10%] size-72 rounded-full bg-gradient-to-br from-primary/20 to-violet-500/20 blur-[80px] animate-[float_6s_ease-in-out_infinite]" />
          <div className="absolute bottom-20 left-[15%] size-96 rounded-full bg-gradient-to-br from-accent-gold/15 to-orange-500/15 blur-[100px] animate-[float_8s_ease-in-out_infinite_1s]" />

          <div className="container relative mx-auto max-w-7xl px-4 py-16 md:py-24 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-7 space-y-8">
                <AnimatedSection animation="fadeUp">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-black text-primary backdrop-blur">
                      <span className="relative flex size-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-primary" /></span>
                      منصة مجانية 100% • بلا إعلانات
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-700">
                      <CheckCircle2 className="size-3.5" /> موثوق من +500 طالب
                    </span>
                  </div>
                </AnimatedSection>

                <AnimatedSection animation="fadeUp" delay={100}>
                  <div className="space-y-5">
                    <h1 className="text-[2rem] font-black leading-[1.1] tracking-tight sm:text-[2.75rem] md:text-[3.25rem]">
                      <span className="block">ميزان الرقمية</span>
                      <span className="pro-gradient-text block mt-1">المعرفة القانونية</span>
                      <span className="block text-[0.6em] font-bold text-muted-foreground mt-2">للطلبة بالمغرب</span>
                    </h1>
                    <p className="max-w-[600px] text-[15px] leading-8 text-muted-foreground md:text-[16px]">
                      منصة مغربية مجانية تضم <span className="font-black text-foreground">304 سجلاً</span> قانونياً: ملخصات S1-S6، قاموس 250 مصطلحاً، أخبار تشريعية، دليل 21 كلية، و4 مسارات اختبارات تفاعلية — كل شيء لطالب القانون في مكان واحد.
                    </p>
                  </div>
                </AnimatedSection>

                <AnimatedSection animation="fadeUp" delay={200}>
                  <div className="space-y-4">
                    <SiteSearchBar />
                    <div className="flex flex-wrap gap-2">
                      {["مدونة الأسرة", "المسطرة المدنية", "القانون الجنائي", "مباراة المنتدبين"].map((kw, i) => (
                        <Link key={i} to={`/search?q=${kw}`} className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card/50 px-3 py-1.5 text-[11px] font-bold text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all backdrop-blur">
                          <Search className="size-3 group-hover:scale-110 transition-transform" />
                          {kw}
                        </Link>
                      ))}
                    </div>
                  </div>
                </AnimatedSection>

                <AnimatedSection animation="fadeUp" delay={300}>
                  <div className="grid grid-cols-3 gap-3 max-w-[400px]">
                    {[
                      { value: counts.lexicon, label: "مصطلح قانوني", icon: Scale, grad: "from-violet-500 to-purple-500" },
                      { value: articlesCount, label: "مقال تحليلي", icon: BookOpen, grad: "from-blue-500 to-cyan-500" },
                      { value: schoolsCount, label: "كلية حقوق", icon: GraduationCap, grad: "from-emerald-500 to-teal-500" },
                    ].map((stat, i) => (
                      <div key={i} className="group rounded-2xl border border-border/50 bg-card/60 backdrop-blur p-4 text-center hover:border-primary/20 hover:shadow-[0_8px_24px_hsl(var(--primary)/0.08)] transition-all">
                        <div className={`mx-auto grid size-10 place-items-center rounded-xl bg-gradient-to-br ${stat.grad} text-white shadow group-hover:scale-110 transition-transform`}>
                          <stat.icon className="size-5" />
                        </div>
                        <p className="mt-2 text-xl font-black"><CountUp to={stat.value} /></p>
                        <p className="text-[11px] font-bold text-muted-foreground">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </AnimatedSection>
              </div>

              <div className="lg:col-span-5 relative hidden lg:block">
                <AnimatedSection animation="scaleIn" delay={200}>
                  <div className="relative">
                    <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 via-violet-500/10 to-accent-gold/10 rounded-[32px] blur-2xl" />
                    <div className="relative grid grid-cols-2 gap-4">
                      {[
                        { title: "القاموس القانوني", desc: "250 مصطلح عربي-فرنسي", icon: Scale, color: "from-violet-500 to-purple-600", path: "/lexicon" },
                        { title: "الأرشيف الدراسي", desc: "S1 إلى S6 ملخصات", icon: Library, color: "from-blue-500 to-cyan-600", path: "/archive" },
                        { title: "الأخبار", desc: "مستجدات تشريعية", icon: Newspaper, color: "from-orange-500 to-red-500", path: "/news" },
                        { title: "الاختبارات", desc: "4 مسارات تفاعلية", icon: Award, color: "from-emerald-500 to-teal-600", path: "/quiz" },
                      ].map((card, i) => (
                        <Link key={i} to={card.path} className="group relative overflow-hidden rounded-[20px] border border-border/50 bg-card/80 backdrop-blur p-5 hover:border-primary/20 hover:shadow-[0_12px_32px_hsl(0_0%_0%/0.08)] hover:-translate-y-1 transition-all duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                          <div className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r ${card.color} opacity-60 group-hover:opacity-100 transition-opacity`} />
                          <div className={`grid size-11 place-items-center rounded-xl bg-gradient-to-br ${card.color} text-white shadow group-hover:scale-110 transition-transform`}>
                            <card.icon className="size-5" />
                          </div>
                          <h3 className="mt-3 font-black text-[13px] group-hover:text-primary transition-colors">{card.title}</h3>
                          <p className="mt-1 text-[11px] text-muted-foreground">{card.desc}</p>
                          <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-primary opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all">
                            استكشف <ArrowLeft className="size-3" />
                          </div>
                        </Link>
                      ))}
                    </div>

                    <div className="absolute -bottom-6 -left-6 rounded-2xl border border-border bg-card p-3 shadow-xl animate-[float_5s_ease-in-out_infinite]">
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[11px] font-bold">مباشر: 12 طالب يتصفحون الآن</span>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              </div>
            </div>
          </div>
        </section>

        {/* Features Bento */}
        <section className="py-16 border-y border-border/50 bg-muted/20">
          <div className="container mx-auto max-w-7xl px-4 lg:px-8">
            <AnimatedSection animation="fadeUp">
              <div className="mb-10 text-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-xs font-bold text-primary mb-4">
                  <Sparkles className="size-4" />
                  لماذا ميزان الرقمية؟
                </div>
                <h2 className="text-2xl font-black md:text-3xl">كل ما يحتاجه طالب القانون</h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-2xl mx-auto">منصة متكاملة بمعايير احترافية، مجانية 100%، بلا إعلانات مزعجة</p>
              </div>
            </AnimatedSection>

            <StaggerGrid className="grid grid-cols-1 gap-4 md:grid-cols-3" delay={100}>
              {[
                { title: "محتوى موثوق ومراجع", desc: "مادة علمية مطابقة للتشريعات المغربية النافذة والاجتهادات القضائية، مراجعة من أساتذة ومهنيين.", icon: ShieldCheck, grad: "from-emerald-500 to-teal-500" },
                { title: "بحث سريع وذكي", desc: "محرك بحث متطور يدعم إزالة التشكيل، تطبيع الألف، والبحث الدلالي للوصول السريع.", icon: Search, grad: "from-blue-500 to-violet-500" },
                { title: "مجتمع أكاديمي موحد", desc: "ربط طلبة القانون والباحثين بمستجدات الجامعات، المباريات، والمؤسسات القانونية.", icon: Users, grad: "from-orange-500 to-red-500" },
              ].map((feature, i) => (
                <div key={i} className="group relative overflow-hidden rounded-[20px] border border-border/50 bg-card p-6 hover:border-primary/20 hover:shadow-[0_12px_32px_hsl(0_0%_0%/0.06)] hover:-translate-y-1 transition-all duration-500">
                  <div className={`absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r ${feature.grad} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <div className={`grid size-12 place-items-center rounded-xl bg-gradient-to-br ${feature.grad} text-white shadow group-hover:scale-110 transition-transform`}>
                    <feature.icon className="size-6" />
                  </div>
                  <h3 className="mt-4 font-black text-[15px]">{feature.title}</h3>
                  <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </StaggerGrid>
          </div>
        </section>

        {/* Latest Feed - Pro */}
        <section className="py-16">
          <div className="container mx-auto max-w-7xl px-4 lg:px-8">
            <AnimatedSection animation="fadeUp">
              <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-bold text-amber-700 mb-3">
                    <Flame className="size-4" /> محدَّث تلقائياً
                  </div>
                  <h2 className="text-2xl font-black md:text-3xl">أحدث المستجدات</h2>
                  <p className="mt-1 text-sm text-muted-foreground">آخر ما نُشر بمختلف الأقسام، منوع حسب التصنيف</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:flex items-center gap-1.5 rounded-full bg-card border border-border px-3 py-1.5 text-[11px] font-bold">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    مباشر
                  </span>
                </div>
              </div>
            </AnimatedSection>

            {feedLoading ? (
              <div className="flex h-40 items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-16">
                {latestArticles.length > 0 && (
                  <AnimatedSection animation="fadeUp">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="flex items-center gap-2.5 text-base font-black"><div className="grid size-8 place-items-center rounded-lg bg-blue-500/10 text-blue-600"><FileText className="size-4" /></div>أحدث المقالات</h3>
                      <Link to="/articles" className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-bold hover:border-primary/20 transition-all">عرض الكل <ArrowLeft className="size-3 group-hover:-translate-x-0.5 transition-transform" /></Link>
                    </div>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                      {latestArticles.map((item, idx) => (
                        <ProContentCard key={item.slug} href={`/articles/${item.slug}`} title={item.title} image={item.image} badgeLabel={item.category} badgeColor="blue" summary={item.summary} index={idx} />
                      ))}
                    </div>
                  </AnimatedSection>
                )}

                {latestNews.length > 0 && (
                  <AnimatedSection animation="fadeUp" delay={100}>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="flex items-center gap-2.5 text-base font-black"><div className="grid size-8 place-items-center rounded-lg bg-orange-500/10 text-orange-600"><Newspaper className="size-4" /></div>أحدث الأخبار</h3>
                      <Link to="/news" className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-bold hover:border-primary/20 transition-all">عرض الكل <ArrowLeft className="size-3 group-hover:-translate-x-0.5 transition-transform" /></Link>
                    </div>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                      {latestNews.map((item, idx) => (
                        <ProContentCard key={item.slug} href={`/news/${item.slug}`} title={item.title} image={item.image} badgeLabel="خبر" badgeColor="amber" summary={item.summary} isNew={idx < 2} index={idx} />
                      ))}
                    </div>
                  </AnimatedSection>
                )}

                {(latestEvents.length > 0 || latestDocs.length > 0 || latestTerms.length > 0) && (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {latestEvents.length > 0 && (
                      <div className="rounded-[20px] border border-border/50 bg-card p-6">
                        <h3 className="flex items-center gap-2 font-black text-sm mb-4"><Calendar className="size-4 text-primary" />ندوات قادمة</h3>
                        <div className="space-y-3">
                          {latestEvents.map(item => (
                            <Link key={item.slug} to={`/events/${item.slug}`} className="group block rounded-xl border border-border/50 bg-muted/30 p-3 hover:border-primary/20 hover:bg-card transition-all">
                              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-700"><Video className="size-3" />{item.category}</span>
                              <p className="mt-2 text-[13px] font-bold line-clamp-2 group-hover:text-primary transition-colors">{item.title}</p>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {latestDocs.length > 0 && (
                      <div className="rounded-[20px] border border-border/50 bg-card p-6">
                        <h3 className="flex items-center gap-2 font-black text-sm mb-4"><Download className="size-4 text-primary" />وثائق حديثة</h3>
                        <div className="space-y-3">
                          {latestDocs.map(item => (
                            <Link key={item.slug} to={`/pdf/${item.slug}`} className="group block rounded-xl border border-border/50 bg-muted/30 p-3 hover:border-primary/20 hover:bg-card transition-all">
                              <span className="inline-flex rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-700">{item.category || "PDF"}</span>
                              <p className="mt-2 text-[13px] font-bold line-clamp-2 group-hover:text-primary transition-colors">{item.title}</p>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {latestTerms.length > 0 && (
                      <div className="rounded-[20px] border border-border/50 bg-card p-6">
                        <h3 className="flex items-center gap-2 font-black text-sm mb-4"><Scale className="size-4 text-primary" />مصطلحات جديدة</h3>
                        <div className="space-y-3">
                          {latestTerms.map(item => (
                            <Link key={item.slug} to={`/lexicon/${item.slug}`} className="group block rounded-xl border border-border/50 bg-muted/30 p-3 hover:border-primary/20 hover:bg-card transition-all">
                              {item.category && <span className="inline-flex rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700">{item.category}</span>}
                              <p className="mt-1 font-black text-[13px] group-hover:text-primary transition-colors">{item.title}</p>
                              {item.summary && <p className="text-[11px] text-muted-foreground" dir="ltr">{item.summary}</p>}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Stats - Pro */}
        <section className="relative overflow-hidden py-16 bg-foreground text-background">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-violet-500/10 to-transparent" />
          <div className="container relative mx-auto max-w-7xl px-4 lg:px-8">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-5 text-center">
              {[
                { value: 500, label: "طالب مستفيد", prefix: "+", icon: Users },
                { value: counts.lexicon, label: "مصطلح قانوني", prefix: "+", icon: Scale },
                { value: articlesCount, label: "مقال قانوني", prefix: "+", icon: BookOpen },
                { value: schoolsCount, label: "كلية جامعية", prefix: "+", icon: GraduationCap },
                { value: 100, label: "مجاني", suffix: "%", icon: Star },
              ].map((stat, i) => (
                <div key={i} className="group">
                  <div className="mx-auto mb-3 grid size-12 place-items-center rounded-xl bg-white/10 backdrop-blur group-hover:bg-white/20 group-hover:scale-110 transition-all">
                    <stat.icon className="size-6" />
                  </div>
                  <div className="text-3xl font-black sm:text-4xl"><CountUp to={stat.value} prefix={stat.prefix} suffix={stat.suffix} /></div>
                  <div className="mt-1 text-xs opacity-70 font-bold">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <HomeFaqSection lexiconCount={counts.lexicon} articlesCount={articlesCount} schoolsCount={schoolsCount} />
      </main>
    </>
  )
}
