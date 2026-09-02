import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { SEOHead } from "../../components/seo/SEOHead"
import { supabase } from "../../lib/supabase/client"
import articlesData from "../../data/articles.json"
import newsData from "../../data/news.json"
import eventsData from "../../data/events.json"
import lexiconData from "../../data/lexicon.json"
import schoolsData from "../../data/schools.json"
import { diversifyByCategory } from "../../lib/utils/diversify"
import SiteSearchBar from "../../components/search/SiteSearchBar"
import { generateSlug } from "../../lib/utils/generateSlug"
import { CountUp } from "../../components/ui/CountUp"
import { HomeFaqSection } from "../../components/home/HomeFaqSection"
import {
  BookOpen, Scale, GraduationCap, Newspaper, Calendar, Search, ArrowLeft,
  ShieldCheck, FileText, Sparkles, Users, Video, Loader2, Download,
} from "lucide-react"

interface FeedCard {
  id: string
  slug: string
  title: string
  summary?: string | null
  category?: string | null
  date?: string | null
}

export function HomePage() {
  const [latestArticles, setLatestArticles] = useState<FeedCard[]>([])
  const [latestNews, setLatestNews] = useState<FeedCard[]>([])
  const [latestEvents, setLatestEvents] = useState<FeedCard[]>([])
  const [latestDocs, setLatestDocs] = useState<FeedCard[]>([])
  const [latestTerms, setLatestTerms] = useState<FeedCard[]>([])
  const [feedLoading, setFeedLoading] = useState<boolean>(true)
  // نبدأ بعدد البيانات المحلية (دقيق بما يكفي) كي لا يظهر رقم فارغ قبل
  // اكتمال الطلب الحي، ثم نحدّثه بالعدد الحقيقي من Supabase إن توفر
  const [schoolsCount, setSchoolsCount] = useState<number>((schoolsData as any[]).length)
  const [articlesCount, setArticlesCount] = useState<number>((articlesData as any[]).length)

  useEffect(() => {
    const fetchHomeFeed = async () => {
      try {
        const [articlesRes, newsRes, seminarsRes, docsRes, termsRes] = await Promise.all([
          supabase.from("articles").select("id, title, slug, excerpt, published_at, created_at, category:categories(name)").eq("status", "published").order("published_at", { ascending: false }).limit(15),
          // Production `news` has no `category` column. Requesting it caused PostgREST HTTP 400.
          supabase.from("news").select("id, title, slug, summary, published_at, created_at").eq("is_published", true).order("published_at", { ascending: false }).limit(15),
          supabase.from("seminars").select("id, title, agenda, event_date, status").eq("status", "published").order("event_date", { ascending: false }).limit(6),
          supabase.from("pdf_summaries").select("id, title, description, semester, created_at").order("created_at", { ascending: false }).limit(6),
          supabase.from("lexicon_terms").select("id, term_ar, term_fr, definition, category, created_at").order("created_at", { ascending: false }).limit(6),
        ])

        const remoteArticles: FeedCard[] = (articlesRes.data || []).map((item: any) => ({ id: item.id, slug: item.slug, title: item.title, summary: item.excerpt, category: Array.isArray(item.category) ? item.category[0]?.name : item.category?.name, date: item.published_at || item.created_at }))
        const localArticles: FeedCard[] = (articlesData as any[]).map((item) => ({ id: item.id, slug: item.slug, title: item.title, summary: item.excerpt, category: item.category, date: item.publishedAt }))
        const combinedArticles = Array.from(new Map([...remoteArticles, ...localArticles].map((a) => [a.slug, a])).values())
        setLatestArticles(diversifyByCategory(combinedArticles, 4))

        const remoteNews: FeedCard[] = (newsRes.data || []).map((item: any) => ({ id: item.id, slug: item.slug || item.id, title: item.title, summary: item.summary, category: null, date: item.published_at || item.created_at }))
        const localNews: FeedCard[] = (newsData as any[]).filter((item) => item.type === "news").map((item) => ({ id: item.id, slug: item.id, title: item.title, summary: item.summary, category: item.category, date: item.date }))
        const combinedNews = Array.from(new Map([...remoteNews, ...localNews].map((n) => [n.slug, n])).values())
        setLatestNews(diversifyByCategory(combinedNews, 4))

        const remoteEvents: FeedCard[] = (seminarsRes.data || []).map((item: any) => ({ id: `seminar-${item.id}`, slug: `seminar-${item.id}`, title: item.title, summary: item.agenda, category: "ندوة قانونية", date: item.event_date }))
        const localEvents: FeedCard[] = (eventsData as any[]).map((item: any) => ({ id: item.id, slug: item.id, title: item.title, summary: item.excerpt, category: item.category, date: item.eventDate }))
        const combinedEvents = [...remoteEvents, ...localEvents].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 3)
        setLatestEvents(combinedEvents)

        const remoteDocs: FeedCard[] = (docsRes.data || []).map((item: any) => ({ id: item.id, slug: `pdf-${item.id}`, title: item.title, summary: item.description, category: item.semester, date: item.created_at }))
        setLatestDocs(remoteDocs.slice(0, 3))

        const remoteTerms: FeedCard[] = (termsRes.data || []).map((item: any) => ({ id: item.id, slug: generateSlug(item.term_ar), title: item.term_ar, summary: item.term_fr, category: item.category, date: item.created_at }))
        const fallbackTerms: FeedCard[] = remoteTerms.length > 0 ? [] : (lexiconData as any[]).slice(0, 3).map((item) => ({ id: item.id, slug: generateSlug(item.term_ar), title: item.term_ar, summary: item.term_fr, category: item.category, date: null }))
        setLatestTerms(remoteTerms.length > 0 ? remoteTerms.slice(0, 3) : fallbackTerms)
      } catch (err) {
        console.error("خطأ أثناء جلب أحدث المستجدات للصفحة الرئيسية:", err)
      } finally {
        setFeedLoading(false)
      }
    }
    fetchHomeFeed()

    // عدد الكليات والمقالات الحقيقي من قاعدة البيانات (بلا جلب الصفوف كاملة،
    // فقط العدد) لعرضه فـ إحصائيات الصفحة الرئيسية. نتجاهل الخطأ بصمت
    // ونبقي على العدد المحلي كاحتياطي إن تعذّر الطلب
    const fetchCounts = async () => {
      try {
        const [schoolsCountRes, articlesCountRes] = await Promise.all([
          supabase.from("schools").select("id", { count: "exact", head: true }),
          supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "published"),
        ])
        if (typeof schoolsCountRes.count === "number" && schoolsCountRes.count > 0) {
          setSchoolsCount(schoolsCountRes.count)
        }
        if (typeof articlesCountRes.count === "number" && articlesCountRes.count > 0) {
          setArticlesCount(articlesCountRes.count)
        }
      } catch (err) {
        console.error("تعذّر جلب إحصائيات الصفحة الرئيسية:", err)
      }
    }
    fetchCounts()
  }, [])

  return (
    <>
      <SEOHead title="المعرفة القانونية للطلبة بالمغرب" description="ميزان الرقمية منصة مغربية مجانية لطلبة القانون، تضم ملخصات دراسية، قاموساً قانونياً، أخباراً، ندوات ودليل كليات الحقوق." keywords={["القانون المغربي", "منصة الميزان الرقمية", "الأرشيف القانوني المغربي", "مدونة الشغل المغربية", "المعجم القانوني المغربي", "كليات الحقوق بالمغرب", "ندوات قانونية", "شرح القانون المغربي", "دروس القانون للطلبة"]} />
      <main className="min-h-screen bg-background text-foreground" dir="rtl">
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/5 via-background to-background py-16 md:py-24"><div className="container mx-auto max-w-6xl px-4"><div className="mx-auto max-w-3xl text-center"><h1 className="text-3xl font-black tracking-tight text-foreground sm:text-5xl md:text-6xl leading-tight">ميزان الرقمية — <span className="text-primary">المعرفة القانونية</span> للطلبة بالمغرب</h1><p className="mt-6 text-base text-muted-foreground sm:text-lg leading-relaxed max-w-2xl mx-auto">أفضل منصة مجانية لملخصات ومصطلحات القانون لطلبة كليات الحقوق، بأرشيف دراسي كامل، ومعجم قانوني شامل، ومتابعة حية للمستجدات التشريعية والندوات القانونية.</p><div className="mt-8 flex flex-wrap items-center justify-center gap-4"><Link to="/lexicon" title="القاموس القانوني — تعريفات المصطلحات القانونية" className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-md transition hover:opacity-90 hover:shadow-lg"><BookOpen size={18}/><span>تصفح المعجم القانوني</span></Link><Link to="/schools" title="دليل كليات الحقوق بالجامعات المغربية" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-bold text-foreground transition hover:bg-muted"><GraduationCap size={18}/><span>دليل كليات الحقوق</span></Link></div><div className="mt-10"><SiteSearchBar /></div></div></div></section>
        <section className="py-16 bg-muted/30"><div className="container mx-auto max-w-6xl px-4"><div className="text-center mb-12"><h2 className="text-2xl font-black text-foreground sm:text-3xl">خدمات منصة الميزان الرقمية</h2><p className="mt-2 text-sm text-muted-foreground">كل ما يحتاجه طالب القانون والمهني في مكان واحد</p></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link to="/lexicon" title="القاموس القانوني — تعريفات المصطلحات القانونية" className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:border-primary/50 hover:shadow-md"><div><div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4"><BookOpen size={24}/></div><h3 className="text-lg font-bold text-foreground">المعجم القانوني</h3><p className="mt-2 text-xs text-muted-foreground leading-relaxed">قاموس موحد للمصطلحات والمفاهيم القانونية باللغتين العربية والفرنسية مع الشرح والمراجع.</p></div><div className="mt-6 pt-4 border-t border-border flex items-center text-xs font-bold text-primary gap-1"><span>تصفح المصطلحات</span><ArrowLeft size={14}/></div></Link>
          <Link to="/schools" title="دليل كليات الحقوق بالجامعات المغربية" className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:border-primary/50 hover:shadow-md"><div><div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4"><GraduationCap size={24}/></div><h3 className="text-lg font-bold text-foreground">دليل الجامعات والكليات</h3><p className="mt-2 text-xs text-muted-foreground leading-relaxed">دليل كليات العلوم القانونية والاقتصادية والاجتماعية (FSJES) عبر مختلف مدن المملكة.</p></div><div className="mt-6 pt-4 border-t border-border flex items-center text-xs font-bold text-primary gap-1"><span>استكشف الكليات</span><ArrowLeft size={14}/></div></Link>
          <Link to="/news" title="آخر الأخبار القانونية والقضائية بالمغرب" className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:border-primary/50 hover:shadow-md"><div><div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4"><Newspaper size={24}/></div><h3 className="text-lg font-bold text-foreground">الأخبار والمدونة</h3><p className="mt-2 text-xs text-muted-foreground leading-relaxed">مستجدات الجريدة الرسمية، التحليلات التشريعية، والدراسات الأكاديمية المعمقة.</p></div><div className="mt-6 pt-4 border-t border-border flex items-center text-xs font-bold text-primary gap-1"><span>قراءة المقالات</span><ArrowLeft size={14}/></div></Link>
          <Link to="/events" title="الندوات واللقاءات القانونية القادمة" className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:border-primary/50 hover:shadow-md"><div><div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4"><Calendar size={24}/></div><h3 className="text-lg font-bold text-foreground">الندوات والأيام الدراسية</h3><p className="mt-2 text-xs text-muted-foreground leading-relaxed">متابعة المؤتمرات والندوات العلمية والأنشطة الأكاديمية في مختلف كليات المغرب.</p></div><div className="mt-6 pt-4 border-t border-border flex items-center text-xs font-bold text-primary gap-1"><span>جدول الندوات</span><ArrowLeft size={14}/></div></Link>
        </div></div></section>
        <section className="py-16 border-t border-border"><div className="container mx-auto max-w-6xl px-4"><div className="mb-10 text-center"><div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary border border-primary/20 mb-3"><Sparkles size={14}/><span>محدَّث تلقائياً</span></div><h2 className="text-2xl font-black text-foreground sm:text-3xl">أحدث المستجدات</h2><p className="mt-2 text-sm text-muted-foreground">آخر ما نُشر بمختلف أقسام المنصة، مرتّب حسب الحداثة وتنوّع المواضيع</p></div>
          {feedLoading ? <div className="flex h-40 items-center justify-center"><Loader2 className="size-8 animate-spin text-primary"/></div> : <div className="space-y-12">
            {latestArticles.length > 0 && <div><div className="mb-4 flex items-center justify-between"><h3 className="flex items-center gap-2 text-base font-extrabold"><FileText size={18} className="text-primary"/>أحدث المقالات</h3><Link to="/articles" title="مقالات ودراسات قانونية معمقة" className="text-xs font-bold text-primary">عرض الكل <ArrowLeft size={13}/></Link></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{latestArticles.map(item=><Link key={item.slug} to={`/articles/${item.slug}`} title={item.title} className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition hover:border-primary/50 hover:shadow-sm">{item.category&&<span className="w-fit rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{item.category}</span>}<h4 className="text-sm font-bold line-clamp-2">{item.title}</h4>{item.summary&&<p className="line-clamp-2 text-[11px] text-muted-foreground">{item.summary}</p>}</Link>)}</div></div>}
            {latestNews.length > 0 && <div><div className="mb-4 flex items-center justify-between"><h3 className="flex items-center gap-2 text-base font-extrabold"><Newspaper size={18} className="text-primary"/>أحدث الأخبار</h3><Link to="/news" title="آخر الأخبار القانونية والقضائية بالمغرب" className="text-xs font-bold text-primary">عرض الكل <ArrowLeft size={13}/></Link></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{latestNews.map(item=><Link key={item.slug} to={`/news/${item.slug}`} title={item.title} className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition hover:border-primary/50 hover:shadow-sm">{item.category&&<span className="w-fit rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{item.category}</span>}<h4 className="text-sm font-bold line-clamp-2">{item.title}</h4>{item.summary&&<p className="line-clamp-2 text-[11px] text-muted-foreground">{item.summary}</p>}</Link>)}</div></div>}
            {latestEvents.length > 0 && <div><div className="mb-4 flex items-center justify-between"><h3 className="flex items-center gap-2 text-base font-extrabold"><Calendar size={18} className="text-primary"/>أحدث الندوات والفعاليات</h3><Link to="/events" title="الندوات واللقاءات القانونية القادمة" className="text-xs font-bold text-primary">عرض الكل <ArrowLeft size={13}/></Link></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{latestEvents.map(item=><Link key={item.slug} to={`/events/${item.slug}`} title={item.title} className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4"><span className="w-fit inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"><Video size={10}/>{item.category||"فعالية"}</span><h4 className="text-sm font-bold line-clamp-2">{item.title}</h4></Link>)}</div></div>}
            {latestDocs.length > 0 && <div><div className="mb-4 flex items-center justify-between"><h3 className="flex items-center gap-2 text-base font-extrabold"><Download size={18} className="text-primary"/>أحدث وثائق الأرشيف</h3><Link to="/archive" title="أرشيف الملخصات والمحاضرات والامتحانات القانونية" className="text-xs font-bold text-primary">عرض الكل <ArrowLeft size={13}/></Link></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{latestDocs.map(item=><Link key={item.slug} to={`/download/${item.id}`} title={`تحميل ${item.title}`} className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4"><span className="w-fit inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"><FileText size={10}/>{item.category?`الفصل ${item.category}`:"PDF"}</span><h4 className="text-sm font-bold line-clamp-2">{item.title}</h4></Link>)}</div></div>}
            {latestTerms.length > 0 && <div><div className="mb-4 flex items-center justify-between"><h3 className="flex items-center gap-2 text-base font-extrabold"><Scale size={18} className="text-primary"/>أحدث المصطلحات القانونية</h3><Link to="/lexicon" title="القاموس القانوني — تعريفات المصطلحات القانونية" className="text-xs font-bold text-primary">عرض الكل <ArrowLeft size={13}/></Link></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{latestTerms.map(item=><Link key={item.slug} to={`/lexicon/${item.slug}`} title={item.title} className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4">{item.category&&<span className="w-fit rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{item.category}</span>}<h4 className="text-sm font-bold">{item.title}</h4>{item.summary&&<p className="text-[11px] text-muted-foreground" dir="ltr">{item.summary}</p>}</Link>)}</div></div>}
          </div>}
        </div></section>
        <section className="py-16 border-t border-border"><div className="container mx-auto max-w-6xl px-4"><div className="grid grid-cols-1 md:grid-cols-3 gap-8"><div className="flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-card"><div className="rounded-lg bg-primary/10 p-3 text-primary shrink-0"><ShieldCheck size={24}/></div><div><h4 className="font-bold text-base">محتوى موثوق ومراجع</h4><p className="mt-1 text-xs text-muted-foreground leading-relaxed">مادة علمية قانونية مطابقة للتشريعات المغربية النافذة والاجتهادات القضائية.</p></div></div><div className="flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-card"><div className="rounded-lg bg-primary/10 p-3 text-primary shrink-0"><Search size={24}/></div><div><h4 className="font-bold text-base">بحث سريع وذكي</h4><p className="mt-1 text-xs text-muted-foreground leading-relaxed">محرك بحث متطور يدعم إزالة التشكيل والتطويل للوصول السريع للنصوص والمصطلحات.</p></div></div><div className="flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-card"><div className="rounded-lg bg-primary/10 p-3 text-primary shrink-0"><Users size={24}/></div><div><h4 className="font-bold text-base">مجتمع أكاديمي موحد</h4><p className="mt-1 text-xs text-muted-foreground leading-relaxed">ربط طلبة القانون والباحثين بمستجدات الجامعات والمؤسسات القانونية بالمغرب.</p></div></div></div></div></section>
        <section className="py-12 bg-primary text-primary-foreground"><div className="container mx-auto max-w-6xl px-4"><div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
          <div><div className="text-3xl font-black sm:text-4xl"><CountUp to={500} prefix="+" /></div><div className="mt-1 text-xs opacity-90 font-medium">طالب مستفيد من المنصة</div></div>
          <div><div className="text-3xl font-black sm:text-4xl"><CountUp to={lexiconData.length} prefix="+" /></div><div className="mt-1 text-xs opacity-90 font-medium">مصطلح قانوني موحد</div></div>
          <div><div className="text-3xl font-black sm:text-4xl"><CountUp to={articlesCount} prefix="+" /></div><div className="mt-1 text-xs opacity-90 font-medium">مقال قانوني</div></div>
          <div><div className="text-3xl font-black sm:text-4xl"><CountUp to={schoolsCount} prefix="+" /></div><div className="mt-1 text-xs opacity-90 font-medium">كلية ومؤسسة جامعية</div></div>
          <div><div className="text-3xl font-black sm:text-4xl"><CountUp to={100} suffix="%" /></div><div className="mt-1 text-xs opacity-90 font-medium">محتوى مفتوح ومجانى</div></div>
        </div></div></section>
        <HomeFaqSection lexiconCount={lexiconData.length} articlesCount={articlesCount} schoolsCount={schoolsCount} />
      </main>
    </>
  )
}
