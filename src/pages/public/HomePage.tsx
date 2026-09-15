import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { AEOHead } from "../../components/seo/AEOHead"
import counts from "../../data/counts.json"
import { diversifyByCategory } from "../../lib/utils/diversify"
import { CountUp } from "../../components/ui/CountUp"
import { HomeFaqSection } from "../../components/home/HomeFaqSection"
import {
  BookOpen, Scale, GraduationCap, Search, Star, Users, Award, Library, ShieldCheck, Clock, Video, FileText, ArrowRight
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
        setLatestArticles(diversifyByCategory(combinedArticles, 8))

        const remoteNews: FeedCard[] = (newsRes.data || []).map((item: any) => ({ id: item.id, slug: item.slug || item.id, title: item.title, summary: item.summary, category: null, date: item.published_at || item.created_at, image: item.image_url }))
        const localNews: FeedCard[] = (newsData as any[]).filter((item) => item.type === "news").map((item) => ({ id: item.id, slug: item.id, title: item.title, summary: item.summary, category: item.category, date: item.date }))
        const combinedNews = Array.from(new Map([...remoteNews, ...localNews].map((n) => [n.slug, n])).values())
        setLatestNews(diversifyByCategory(combinedNews, 8))
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
      <main className="min-h-screen bg-white dark:bg-[#0f172a] text-foreground overflow-hidden" dir="rtl">
        {/* Hero - Centered Text as requested */}
        <section className="relative bg-white dark:bg-[#0f172a] overflow-hidden">
          {/* Decorative blur circles */}
          <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 size-[600px] rounded-full bg-[#dbeafe] dark:bg-[#1e3a5f]/15 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 size-[300px] rounded-full bg-[#fef3c7] dark:bg-[#78350f]/10 blur-[60px]" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 size-[300px] rounded-full bg-[#eff6ff] dark:bg-[#1e3a5f]/10 blur-[60px]" />

          <div className="container relative mx-auto max-w-[800px] px-6 py-16 lg:py-24 flex flex-col items-center text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-[#eff6ff] dark:bg-[#1e293b] border border-[#dbeafe] dark:border-[#334155] px-4 py-1.5 text-[11px] font-black tracking-wide text-[#2563eb] dark:text-[#60a5fa]">
              <span className="size-1.5 rounded-full bg-[#2563eb] animate-pulse" />
              منصة تعليمية عصرية • مجانية 100%
            </div>

            {/* Title - 3 lines centered */}
            <h1 className="mt-6 text-[36px] md:text-[52px] font-black leading-[1.05] tracking-[-0.03em] text-[#0f172a] dark:text-white">
              افتح إمكانياتك مع
              <br />
              <span className="text-[#2563eb]">التعلم القانوني</span>
              <br />
              <span className="text-[22px] md:text-[26px] font-bold tracking-tight text-[#475569] dark:text-[#94a3b8] mt-1 block">Online Learning</span>
            </h1>

            {/* Description - centered */}
            <p className="mt-6 max-w-[560px] text-[14px] md:text-[15px] leading-7 text-[#475569] dark:text-[#94a3b8]">
              انطلق في رحلة من المعرفة والمهارة مع مواردنا الإلكترونية. سواء كنت تبحث عن اكتساب خبرات جديدة أو صقل مواهبك، منصتنا المتنوعة تقدم تجربة تعليمية مرنة وجذابة. تمكّن نفسك اليوم!
            </p>

            {/* Buttons - centered in middle */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/articles" className="inline-flex items-center gap-2 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-7 py-3 text-[14px] font-bold shadow-[0_6px_20px_rgba(37,99,235,0.25)] transition-all hover:shadow-[0_8px_24px_rgba(37,99,235,0.35)] hover:-translate-y-0.5">
                ابدأ الآن
                <span className="size-5 grid place-items-center rounded-full bg-white/20 text-[12px]">←</span>
              </Link>
              <Link to="/about" className="inline-flex items-center gap-2 rounded-full border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] px-7 py-3 text-[14px] font-bold text-[#0f172a] dark:text-white hover:bg-[#f8fafc] dark:hover:bg-[#334155] transition-colors shadow-sm">
                اعرف المزيد
                <span className="size-5 grid place-items-center rounded-full bg-[#f1f5f9] dark:bg-[#334155] text-[12px]">←</span>
              </Link>
            </div>

            {/* Small trust row - centered */}
            <div className="mt-8 flex items-center justify-center gap-4">
              <div className="flex -space-x-2 rtl:space-x-reverse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="size-8 rounded-full border-2 border-white dark:border-[#0f172a] bg-[#e2e8f0] dark:bg-[#334155] grid place-items-center text-[10px] font-bold text-[#475569] dark:text-white">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <div className="text-right">
                <div className="font-black text-[12px] flex items-center gap-1 text-[#0f172a] dark:text-white">
                  <Users className="size-4 text-[#2563eb]" />
                  500+ طالب يثقون بنا
                </div>
                <div className="text-[11px] text-[#64748b] dark:text-[#94a3b8] flex items-center gap-1 justify-end">
                  <Star className="size-3 fill-[#f59e0b] text-[#f59e0b]" /> 4.9 • منصة مجانية
                </div>
              </div>
            </div>

            {/* Cards row below centered text - still centered */}
            <div className="mt-12 w-full max-w-[560px] grid grid-cols-2 gap-3">
              {[
                { title: "القاموس", desc: "250 مصطلح", icon: Scale, color: "bg-[#2563eb]", count: `${counts.lexicon}` },
                { title: "الأرشيف", desc: "S1-S6", icon: Library, color: "bg-[#f59e0b]", count: "S1-S6" },
                { title: "المقالات", desc: `${articlesCount} مقال`, icon: BookOpen, color: "bg-[#10b981]", count: `${articlesCount}` },
                { title: "الأخبار", desc: "مباشر", icon: GraduationCap, color: "bg-[#ec4899]", count: "مباشر" },
              ].map((card, i) => (
                <div key={i} className="text-right rounded-2xl bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(37,99,235,0.08)] hover:-translate-y-0.5 transition-all">
                  <div className="flex items-center justify-between">
                    <div className={`grid size-9 place-items-center rounded-xl ${card.color} text-white shadow-sm`}>
                      <card.icon className="size-4" />
                    </div>
                    <span className="text-[10px] font-bold bg-[#f1f5f9] dark:bg-[#334155] border border-[#e2e8f0] dark:border-[#475569] rounded-full px-2 py-1">{card.count}</span>
                  </div>
                  <h3 className="mt-3 font-black text-[12px] text-[#0f172a] dark:text-white">{card.title}</h3>
                  <p className="mt-1 text-[11px] text-[#64748b] dark:text-[#94a3b8]">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>



        {/* Why Choose Us - EduFlex */}
        <section className="py-16 bg-white dark:bg-[#0f172a]">
          <div className="container mx-auto max-w-[1280px] px-6">
            <div className="grid lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-5">
                <div className="relative grid grid-cols-2 gap-3 max-w-[360px] mx-auto">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[300px] rounded-full bg-[#dbeafe] dark:bg-[#1e3a5f]/20 blur-3xl" />
                  
                  <div className="relative rounded-2xl bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] p-4 shadow-sm">
                    <div className="size-10 grid place-items-center rounded-xl bg-[#eff6ff] text-[#2563eb]">📚</div>
                    <div className="mt-2 font-bold text-[12px]">ملخصات شاملة</div>
                    <div className="text-[10px] text-muted-foreground">S1-S6</div>
                  </div>
                  <div className="relative rounded-2xl bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] p-4 shadow-sm mt-6">
                    <div className="size-10 grid place-items-center rounded-xl bg-[#fef3c7] text-[#f59e0b]">🎓</div>
                    <div className="mt-2 font-bold text-[12px]">معتمد</div>
                    <div className="text-[10px] text-muted-foreground">موثوق 100%</div>
                  </div>
                  <div className="relative rounded-2xl bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] p-4 shadow-sm">
                    <div className="size-10 grid place-items-center rounded-xl bg-[#dcfce7] text-[#16a34a]">⚖️</div>
                    <div className="mt-2 font-bold text-[12px]">قاموس قانوني</div>
                    <div className="text-[10px] text-muted-foreground">250 مصطلح</div>
                  </div>
                  <div className="relative rounded-2xl bg-[#2563eb] text-white p-4 shadow-lg mt-6">
                    <div className="font-black text-[18px]">500+</div>
                    <div className="text-[11px] opacity-80">طالب مستفيد</div>
                    <div className="mt-2 flex gap-1">
                      {[1,2,3,4,5].map(i => <Star key={i} className="size-3 fill-white" />)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-6">
                <div>
                  <span className="inline-block text-[11px] font-black tracking-[0.15em] text-[#2563eb] uppercase bg-[#eff6ff] dark:bg-[#1e293b] border border-[#dbeafe] dark:border-[#334155] rounded-full px-3 py-1">لماذا نحن</span>
                  <h2 className="mt-3 text-[26px] md:text-[32px] font-black leading-[1.15] text-[#0f172a] dark:text-white">
                    اكتشف المزايا المميزة
                    <br />
                    لمنصتنا التعليمية
                    <br />
                    <span className="text-[#2563eb]">القانونية</span>
                  </h2>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { title: "مسارات متنوعة", desc: "استكشف مجموعة متنوعة من المسارات التعليمية المصممة لتناسب اهتماماتك وأهدافك المهنية في القانون.", icon: Library, color: "bg-[#eff6ff] text-[#2563eb]" },
                    { title: "أساتذة خبراء", desc: "تعلم من خبراء وأساتذة متخصصين ملتزمين بنجاحك التعليمي ومسيرتك القانونية.", icon: Users, color: "bg-[#fef3c7] text-[#f59e0b]" },
                    { title: "جدول مرن", desc: "استمتع بمرونة التعلم عبر الإنترنت مع خيارات جدولة مرنة تناسب نمط حياتك المزدحم كطالب.", icon: Clock, color: "bg-[#dcfce7] text-[#16a34a]" },
                    { title: "دعم مستمر", desc: "احصل على دعم مستمر ووصول إلى موارد إضافية لرحلة تعليمية غنية ومثمرة مع ميزان الرقمية.", icon: ShieldCheck, color: "bg-[#fce7f3] text-[#ec4899]" },
                  ].map((feature, i) => (
                    <div key={i} className="rounded-2xl border border-[#e2e8f0] dark:border-[#1e293b] bg-white dark:bg-[#1e293b] p-5 hover:border-[#2563eb]/20 hover:shadow-[0_8px_24px_rgba(37,99,235,0.08)] transition-all group">
                      <div className={`size-10 grid place-items-center rounded-xl ${feature.color} group-hover:scale-110 transition-transform`}>
                        <feature.icon className="size-5" />
                      </div>
                      <h3 className="mt-3 font-black text-[13px] text-[#0f172a] dark:text-white">{feature.title}</h3>
                      <p className="mt-1 text-[11px] leading-5 text-[#64748b] dark:text-[#94a3b8]">{feature.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Course Category - EduFlex */}
        <section className="py-16 bg-[#f8fafc] dark:bg-[#0f172a]">
          <div className="container mx-auto max-w-[1280px] px-6">
            <div className="text-center mb-8">
              <h2 className="text-[24px] md:text-[28px] font-black text-[#0f172a] dark:text-white">استكشف مساراتنا المميزة</h2>
              <p className="mt-2 text-[13px] text-[#64748b] max-w-[600px] mx-auto">منصة متكاملة بتصميم عصري نظيف — كل ما يحتاجه طالب القانون في مكان واحد</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: "القاموس القانوني", desc: "250 مصطلح عربي-فرنسي", icon: Scale, count: `${counts.lexicon}`, color: "from-[#2563eb] to-[#3b82f6]", href: "/lexicon" },
                { title: "الأرشيف الدراسي", desc: "ملخصات S1 إلى S6", icon: Library, count: "S1-S6", color: "from-[#f59e0b] to-[#fbbf24]", href: "/archive" },
                { title: "المقالات القانونية", desc: `${articlesCount} مقال تحليلي`, icon: FileText, count: `${articlesCount}`, color: "from-[#10b981] to-[#34d399]", href: "/articles" },
                { title: "الأخبار", desc: "مستجدات تشريعية", icon: Video, count: "مباشر", color: "from-[#ef4444] to-[#f87171]", href: "/news" },
              ].map((card) => (
                <Link key={card.href} to={card.href} className="group relative overflow-hidden rounded-2xl bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] p-5 hover:border-[#2563eb]/20 hover:shadow-[0_12px_24px_rgba(37,99,235,0.08)] hover:-translate-y-1 transition-all duration-300">
                  <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${card.color} opacity-60 group-hover:opacity-100 transition-opacity`} />
                  <div className="flex items-center justify-between">
                    <div className={`grid size-11 place-items-center rounded-xl bg-gradient-to-br ${card.color} text-white shadow-sm group-hover:scale-110 transition-transform`}>
                      <card.icon className="size-5" />
                    </div>
                    <span className="text-[10px] font-bold bg-[#f1f5f9] dark:bg-[#334155] border border-[#e2e8f0] dark:border-[#475569] rounded-full px-2 py-1">{card.count}</span>
                  </div>
                  <h3 className="mt-4 font-black text-[14px] text-[#0f172a] dark:text-white group-hover:text-[#2563eb] transition-colors">{card.title}</h3>
                  <p className="mt-1 text-[11px] text-[#64748b] dark:text-[#94a3b8]">{card.desc}</p>
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-[#2563eb] opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all">
                    استكشف <ArrowRight className="size-3 rtl:rotate-180" />
                  </div>
                </Link>
              ))}
            </div>

            {/* Latest Articles - EduFlex Course Grid */}
            <div className="mt-12">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-[16px] text-[#0f172a] dark:text-white">أحدث المقالات</h3>
                <Link to="/articles" className="text-[12px] font-bold text-[#2563eb] hover:underline flex items-center gap-1">عرض الكل <ArrowRight className="size-3 rtl:rotate-180" /></Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {latestArticles.slice(0, 4).map((item) => (
                  <Link key={item.id} to={`/articles/${item.slug}`} className="group bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] rounded-2xl overflow-hidden hover:border-[#2563eb]/20 hover:shadow-[0_8px_24px_rgba(37,99,235,0.08)] transition-all">
                    <div className="aspect-[16/10] bg-[#f1f5f9] dark:bg-[#334155] overflow-hidden">
                      {item.image ? <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" /> : <div className="w-full h-full grid place-items-center"><BookOpen className="size-8 text-[#94a3b8]" /></div>}
                    </div>
                    <div className="p-4">
                      <span className="inline-block bg-[#eff6ff] dark:bg-[#1e3a5f] text-[#2563eb] dark:text-[#60a5fa] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#dbeafe] dark:border-[#334155]">{item.category || "قانون"}</span>
                      <h4 className="mt-2 font-bold text-[13px] leading-snug line-clamp-2 text-[#0f172a] dark:text-white group-hover:text-[#2563eb] transition-colors">{item.title}</h4>
                      <p className="mt-1 text-[11px] text-[#64748b] line-clamp-2">{item.summary}</p>
                      <div className="mt-3 flex items-center gap-2 text-[10px] text-[#94a3b8]">
                        <span className="flex items-center gap-1"><Clock className="size-3" /> 5 دقائق</span>
                        <span>•</span>
                        <span>ميزان الرقمية</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Stats - EduFlex */}
        <section className="py-12 bg-[#2563eb] dark:bg-[#1e40af] text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:3rem_3rem]" />
          <div className="container mx-auto max-w-[1280px] px-6 relative">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
              {[
                { value: 500, label: "طالب مستفيد", prefix: "+" },
                { value: counts.lexicon, label: "مصطلح قانوني", prefix: "+" },
                { value: articlesCount, label: "مقال قانوني", prefix: "+" },
                { value: schoolsCount, label: "كلية جامعية", prefix: "+" },
                { value: 100, label: "مجاني", suffix: "%" },
              ].map((stat, i) => (
                <div key={i}>
                  <div className="text-[28px] font-black"><CountUp to={stat.value} prefix={stat.prefix} suffix={stat.suffix} /></div>
                  <div className="text-[11px] opacity-80 font-bold mt-1">{stat.label}</div>
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
