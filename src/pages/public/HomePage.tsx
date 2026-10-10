import { useEffect, useRef, useState, lazy, Suspense } from "react"
import { Link } from "react-router-dom"
import { AEOHead } from "../../components/seo/AEOHead"
import { canonicalHome } from "../../lib/canonical"
import counts from "../../data/counts.json"
import { diversifyByCategory } from "../../lib/utils/diversify"
import { generateSlug } from "../../lib/utils/generateSlug"
import { afterWindowLoad, scheduleWhenIdle } from "../../lib/utils/deferWork"
import { Scale, Library, Clock, Video, FileText, ArrowRight, Calendar, MapPin, Building2 } from "lucide-react"

import { HomeLawArchive } from "../../components/home/HomeLawArchive"
import { HomeLexiconShowcase } from "../../components/home/HomeLexiconShowcase"
import { HomeFeatures } from "../../components/home/HomeFeatures"
import { HomeStatsBand } from "../../components/home/HomeStatsBand"
import { pickTreeTerms, type TreeTerm } from "../../lib/lexicon/treeTerms"
import { HeroPreview } from "../../components/home/HeroPreview"
import { HomeFreeResources } from "../../components/home/HomeFreeResources"
const HomeFaqSection = lazy(() => import("../../components/home/HomeFaqSection").then((m) => ({ default: m.HomeFaqSection })))

interface FeedCard {
  id: string
  slug: string
  title: string
  summary?: string | null
  category?: string | null
  date?: string | null
  image?: string | null
}

interface EventCard {
  id: string
  slug: string
  title: string
  excerpt?: string
  city?: string | null
  date?: string | null
  image?: string | null
  organizer?: string | null
}

interface LexiconCard {
  id: string
  term_ar: string
  term_fr?: string
  definition: string
  category: string
  legal_sources?: any[]
}

/** Mirrors shared contentSlug(): explicit slug, title-derived slug, then id. */
function feedSlug(item: { slug?: unknown; title?: unknown; id?: unknown }) {
  const explicit = String(item?.slug ?? "").trim().replace(/\/+$/, "")
  if (explicit) return explicit
  const fromTitle = generateSlug(String(item?.title ?? ""))
  return fromTitle || String(item?.id ?? "").trim()
}

export function HomePage() {
  const [latestArticles, setLatestArticles] = useState<FeedCard[]>([])
  const [latestEvents, setLatestEvents] = useState<EventCard[]>([])
  const [treeTerms, setTreeTerms] = useState<TreeTerm[]>([])
  const [schoolsCount] = useState<number>(counts.schools)
  const [articlesCount] = useState<number>(counts.articles)

  // القسم الذي يحمل البطاقات (مقالات/فعاليات/قاموس): يُستعمل مرجعاً لمعرفة
  // متى يقترب من الشاشة فنطلب بياناته — لا قبل ذلك.
  const contentSectionRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    let cancelled = false
    let started = false

    const loadLocal = async () => {
      try {
        const [{ default: articlesData }, { default: eventsData }, { default: lexiconData }] = await Promise.all([
          import("../../data/articles.json"),
          import("../../data/events.json"),
          import("../../data/lexicon.client.json"),
        ])
        const localArticles: FeedCard[] = (articlesData as any[])
          .map((item) => ({
            id: item.id,
            slug: feedSlug(item),
            title: item.title,
            summary: item.excerpt,
            category: item.category,
            date: item.publishedAt,
            image: item.coverImage || item.image,
          }))
        if (cancelled) return
        setLatestArticles(diversifyByCategory(localArticles, 8))

        const localEvents: EventCard[] = (eventsData as any[])
          .map((e) => ({
            id: e.id,
            slug: feedSlug(e),
            title: e.title,
            excerpt: e.excerpt,
            city: e.city,
            date: e.eventDate || e.date,
            image: e.image,
            organizer: e.organizer,
          }))
        if (cancelled) return
        setLatestEvents(localEvents.slice(0, 4))

        setTreeTerms(pickTreeTerms(lexiconData as any[], 7))
      } catch {
        /* لا بيانات محلية: الأقسام تبقى فارغة كما كانت قبل الإصلاح */
      }
    }

    /*
      لماذا لم يعد loadLocal() يُستدعى فوراً:
      ────────────────────────────────────────
      كان يُنفَّذ في أول تركيب فينزّل ثلاثة ملفات (articles.json +
      events.json + lexicon.client.json ≈ 72KB مضغوطة) في الثانية الأولى،
      تتزاحم مع الخط والحزمة وCSS على نطاق 4G البطيء في نافذة قياس CWV —
      وهي بيانات قسم أسفل الصفحة، لا يراها الزائر قبل أن يمرّر.
      الجديد: تُطلب عند اقتراب القسم من الشاشة (هوامش 700px فتكون جاهزة قبل
      ظهوره)، أو بعد اكتمال التحميل + خمول كسقف أعلى (3 ثوانٍ) لمن لا يمرّر.
      النتيجة: أول رسم بلا تنزيل بيانات إطلاقاً، والمحتوى يظهر كما كان يظهر.
    */
    const startLocal = () => {
      if (started || cancelled) return
      started = true
      void loadLocal()
    }

    const cancelIdle = afterWindowLoad(() => scheduleWhenIdle(startLocal, { timeout: 3000 }))
    let cancelObserver: (() => void) | undefined

    const target = contentSectionRef.current
    if (target && typeof IntersectionObserver === "function") {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer.disconnect()
            startLocal()
          }
        },
        { rootMargin: "700px 0px" }
      )
      observer.observe(target)
      cancelObserver = () => observer.disconnect()
    } else {
      // بيئة بلا IntersectionObserver: لا نترك القسم فارغاً بلا نهاية
      scheduleWhenIdle(startLocal, { timeout: 2000 })
    }

    const loadRemote = async () => {
      try {
        const { supabase } = await import("../../lib/supabase/client")
        const [{ default: articlesData }, { default: eventsData }, { default: lexiconData }] = await Promise.all([
          import("../../data/articles.json"),
          import("../../data/events.json"),
          import("../../data/lexicon.client.json"),
        ])

        const [articlesRes, seminarsRes] = await Promise.all([
          supabase.from("articles").select("id, title, slug, excerpt, published_at, created_at, cover_image, category:categories(name)").eq("status", "published").order("published_at", { ascending: false }).limit(30),
          (supabase as any).from("seminars").select("*").eq("status", "published").order("event_date", { ascending: false }).limit(20),
        ])

        const remoteArticles: FeedCard[] = (articlesRes.data || [])
          .map((item: any) => ({
            id: item.id,
            slug: feedSlug(item),
            title: item.title,
            summary: item.excerpt,
            category: Array.isArray(item.category) ? item.category[0]?.name : item.category?.name,
            date: item.published_at || item.created_at,
            image: item.cover_image,
          }))

        const localArticles: FeedCard[] = (articlesData as any[])
          .map((item) => ({
            id: item.id,
            slug: feedSlug(item),
            title: item.title,
            summary: item.excerpt,
            category: item.category,
            date: item.publishedAt,
            image: item.coverImage || item.image,
          }))

        const combinedArticles = Array.from(new Map([...remoteArticles, ...localArticles].map((a) => [a.slug, a])).values())
        setLatestArticles(diversifyByCategory(combinedArticles, 8))

        // Events: merge local and remote seminars; keep text available when an image is absent.
        const remoteSeminars: EventCard[] = (seminarsRes.data || [])
          .map((raw: any) => ({
            id: `seminar-${raw.id}`,
            slug: `seminar-${raw.id}`,
            title: raw.title,
            excerpt: raw.agenda || "",
            city: null,
            date: raw.event_date,
            image: raw.image_url,
            organizer: raw.speaker_title || raw.speaker,
          }))

        const localEvents: EventCard[] = (eventsData as any[])
          .map((e) => ({
            id: e.id,
            slug: feedSlug(e),
            title: e.title,
            excerpt: e.excerpt,
            city: e.city,
            date: e.eventDate,
            image: e.image,
            organizer: e.organizer,
          }))

        const combinedEvents = Array.from(new Map([...remoteSeminars, ...localEvents].map((e) => [e.id, e])).values())
        setLatestEvents(combinedEvents.slice(0, 4))

        // القاموس: المصطلحات التي لها شجرة فقط، من البيانات المحلية (الشجرة لا تُخزَّن في القاعدة).
        setTreeTerms(pickTreeTerms(lexiconData as any[], 7))
      } catch {}
    }

    // ── لماذا تأجيل المزامنة مع Supabase ────────────────────────────────────
    // كانت تُجدوَل بـ requestIdleCallback بحدّ أقصى 3 ثوانٍ، أي في قلب نافذة
    // قياس الأداء: تستورد حزمة vendor-supabase (217KB) وتحلّلها، تنفّذ ثلاثة
    // استعلامات، ثم تستبدل القوائم المعروضة — مهمات طويلة على الخيط الرئيسي
    // (TBT) وانزياح تخطيط ثانٍ (CLS) بعد ظهور المحتوى المحلي.
    // البيانات المحلية تُعرض فوراً anyway، فالمزامنة تحديث لاحق لا سبب
    // للاستعجال عليه: تُؤجَّل إلى ما بعد اكتمال التحميل وأول خمول فعلي.
    const scheduleRemoteSync = () => {
      if ("requestIdleCallback" in window) {
        // @ts-ignore
        requestIdleCallback(loadRemote, { timeout: 12000 })
      } else {
        setTimeout(loadRemote, 8000)
      }
    }

    if (document.readyState === "complete") {
      scheduleRemoteSync()
    } else {
      window.addEventListener("load", scheduleRemoteSync, { once: true })
    }

    return () => {
      cancelled = true
      cancelIdle()
      cancelObserver?.()
    }
  }, [])

  return (
    <>
      <AEOHead
        title="ميزان الرقمية – منصة طلبة الحقوق في المغرب"
        description="ميزان الرقمية منصة مغربية مجانية بالكامل لطلبة القانون: ملخصات S1-S6، قاموس قانوني 250 مصطلح عربي-فرنسي، دليل 21 كلية حقوق FSJES، مقالات، أخبار تشريعية واختبارات QCM، بلا إعلانات تجارية."
        directAnswer="ميزان الرقمية منصة مغربية مجانية بالكامل لطلبة كليات الحقوق، تضم ملخصات S1-S6، قاموساً قانونياً، دليلاً للكليات، مقالات وأخباراً واختبارات وأدوات قانونية، بلا إعلانات تجارية."
        keywords={[
          "ملخصات القانون S1 S2 S3 S4 S5 S6",
          "قاموس قانوني عربي فرنسي",
          "كليات الحقوق المغرب FSJES",
          "اختبارات QCM قانون",
          "الأخبار القانونية المغرب",
          "المستجدات التشريعية المغربية",
          "منصة ميزان الرقمية",
          "دروس القانون المغربي مجانا",
        ]}
        canonicalUrl={canonicalHome()}
        faq={[
          { question: "ما هي منصة ميزان الرقمية؟", answer: "ميزان الرقمية منصة تعليمية مغربية مجانية بالكامل لطلبة القانون، تضم ملخصات S1-S6، قاموساً قانونياً، دليل الكليات، مقالات وأخباراً واختبارات وأدوات قانونية، بلا إعلانات تجارية." },
          { question: "هل المنصة مجانية؟", answer: "نعم، ميزان مجانية بالكامل: جميع الموارد والأدوات متاحة للجميع، ولا توجد إعلانات تجارية." },
          { question: "كم عدد كليات الحقوق في الدليل؟", answer: "دليلنا يضم 21 كلية حقوق وعلوم قانونية واقتصادية FSJES بالمغرب: الرباط، الدار البيضاء، مراكش، فاس، طنجة، أكادير، وجدة، مكناس وغيرها." },
        ]}
      />
      <main className="min-h-screen bg-white dark:bg-[#0f172a] text-foreground" dir="rtl">
        <section className="relative bg-white dark:bg-[#0f172a] overflow-hidden">
          <div className="pointer-events-none hidden md:block absolute -top-24 left-1/2 -translate-x-1/2 size-[400px] lg:size-[640px] lg:-top-40 rounded-full bg-[#dbeafe] dark:bg-[#1e3a5f]/10 blur-[50px] lg:blur-[90px]" />
          <div className="pointer-events-none hidden md:block absolute -bottom-24 -right-24 size-[200px] lg:size-[360px] lg:-bottom-40 lg:-right-32 rounded-full bg-[#fef3c7] dark:bg-[#78350f]/5 blur-[40px] lg:blur-[70px]" />

          <div className="container relative mx-auto max-w-[800px] lg:max-w-[1440px] xl:max-w-[1600px] px-6 py-14 lg:px-12 lg:py-24 grid gap-12 lg:gap-16 xl:gap-24 lg:grid-cols-2 lg:items-center">

            <div className="flex flex-col items-center text-center lg:items-start lg:text-right">
              <h1 className="mt-6 lg:mt-0 flex flex-col gap-3 md:gap-4 text-[34px] md:text-[48px] lg:text-[64px] xl:text-[76px] font-black leading-[1.2] lg:leading-[1.15] tracking-[-0.03em] text-[#0f172a] dark:text-white">
                <span>افتح إمكانياتك مع</span>
                <span className="text-[#2563eb]">التعلم القانوني</span>
                <span className="text-[20px] md:text-[24px] lg:text-[32px] font-bold tracking-tight text-[#475569] dark:text-[#94a3b8] block">Online Learning</span>
              </h1>

              <p className="mt-5 lg:mt-8 max-w-[560px] lg:max-w-[600px] text-[15px] md:text-[16px] lg:text-[20px] leading-7 lg:leading-9 text-[#334155] dark:text-[#cbd5e1]">
                ميزان الرقمية هي منصة مغربية مجانية لطلبة كليات الحقوق، تجمع ملخصات S1-S6 والقاموس القانوني والمقالات والاختبارات في مكان واحد، بلا إعلانات تجارية.
              </p>

              <div className="mt-7 lg:mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-3 lg:gap-4">
                <Link to="/articles" className="inline-flex items-center gap-2 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-7 py-3 lg:px-10 lg:py-4 text-[14px] lg:text-[17px] font-bold shadow-[0_4px_12px_rgba(37,99,235,0.2)] lg:shadow-[0_8px_24px_rgba(37,99,235,0.25)] transition-colors">
                  ابدأ الآن
                  <span className="size-5 lg:size-7 grid place-items-center rounded-full bg-white/20 text-[12px] lg:text-[15px]">←</span>
                </Link>
                <Link to="/quiz" className="inline-flex items-center gap-2 rounded-full border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] px-7 py-3 lg:px-10 lg:py-4 text-[14px] lg:text-[17px] font-bold text-[#0f172a] dark:text-white hover:bg-[#f8fafc] dark:hover:bg-[#334155] transition-colors">
                  اختبر معرفتك القانونية
                  <span className="size-5 lg:size-7 grid place-items-center rounded-full bg-[#f1f5f9] dark:bg-[#334155] text-[12px] lg:text-[15px]">←</span>
                </Link>
              </div>

              <p className="mt-7 lg:mt-10 text-center lg:text-start text-[13px] lg:text-[15px] font-semibold text-[#475569] dark:text-[#cbd5e1]">
                انزل إلى الأسفل، ستجد رابط مجتمع ميزان على واتساب.
              </p>
            </div>

            <div className="hidden lg:block">
              <HeroPreview />
            </div>
          </div>
        </section>

        <section ref={contentSectionRef} className="py-14 bg-[#f8fafc] dark:bg-[#0f172a] [content-visibility:auto] [contain-intrinsic-size:800px]">
          <div className="container mx-auto max-w-[1280px] px-6">
            <div className="text-center mb-8">
              <h2 className="text-[24px] md:text-[28px] font-black text-[#0f172a] dark:text-white">ماذا تجد في ميزان الرقمية؟</h2>
              <p className="mt-2 text-[13px] text-[#64748b] max-w-[600px] mx-auto">تجمع ميزان ملخصات S1-S6 والقاموس القانوني والمقالات والأخبار، وهي كل ما يحتاجه طالب القانون في مكان واحد.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: "القاموس القانوني", desc: "250 مصطلح عربي-فرنسي", icon: Scale, count: `${counts.lexicon}`, color: "from-[#2563eb] to-[#3b82f6]", href: "/lexicon" },
                { title: "الأرشيف الدراسي", desc: "ملخصات S1 إلى S6", icon: Library, count: "S1-S6", color: "from-[#f59e0b] to-[#fbbf24]", href: "/archive" },
                { title: "المقالات القانونية", desc: `${articlesCount} مقال تحليلي`, icon: FileText, count: `${articlesCount}`, color: "from-[#10b981] to-[#34d399]", href: "/articles" },
                { title: "الأخبار", desc: "مستجدات تشريعية", icon: Video, count: "مباشر", color: "from-[#ef4444] to-[#f87171]", href: "/news" },
              ].map((card) => (
                <Link key={card.href} to={card.href} className="group relative overflow-hidden rounded-2xl bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] p-5 hover:border-[#2563eb]/20 hover:shadow-[0_8px_20px_rgba(37,99,235,0.06)] transition-all">
                  <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${card.color} opacity-60`} />
                  <div className="flex items-center justify-between">
                    <div className={`grid size-11 place-items-center rounded-xl bg-gradient-to-br ${card.color} text-white shadow-sm`}>
                      <card.icon className="size-5" />
                    </div>
                    <span className="text-[10px] font-bold bg-[#f1f5f9] dark:bg-[#334155] border rounded-full px-2 py-1">{card.count}</span>
                  </div>
                  <h3 className="mt-4 font-black text-[14px] text-[#0f172a] dark:text-white">{card.title}</h3>
                  <p className="mt-1 text-[11px] text-[#64748b] dark:text-[#94a3b8]">{card.desc}</p>
                </Link>
              ))}
            </div>

            {/* أحدث المقالات — النص متاح حتى عندما لا تتوفر صورة للبطاقة */}
            <div className="mt-12">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-[16px] text-[#0f172a] dark:text-white">أحدث المقالات</h3>
                <Link to="/articles" aria-label="عرض الكل: أحدث المقالات" className="text-[12px] font-bold text-[#2563eb] hover:underline flex items-center gap-1">عرض الكل <ArrowRight className="size-3 rtl:rotate-180" aria-hidden="true" /></Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {latestArticles.slice(0, 4).map((item) => (
                  <Link key={item.id} to={`/articles/${item.slug}`} className="group bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] rounded-2xl overflow-hidden hover:border-[#2563eb]/20 hover:shadow-[0_8px_24px_rgba(37,99,235,0.08)] hover:-translate-y-0.5 transition-all flex flex-col">
                    {item.image ? (
                      <div className="h-[110px] sm:h-[120px] bg-[#f1f5f9] dark:bg-[#334155] overflow-hidden relative shrink-0">
                        <img src={item.image} alt={item.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" width={320} height={120} />
                        <span className="absolute top-2 right-2 bg-white/90 dark:bg-black/60 backdrop-blur text-[9px] font-bold px-2 py-1 rounded-full border border-black/5 shadow-sm">{item.category || "قانون"}</span>
                      </div>
                    ) : null}
                    <div className="p-4 flex flex-col flex-1">
                      {!item.image && item.category ? <span className="self-start rounded-full bg-[#f1f5f9] dark:bg-[#334155] px-2 py-1 text-[10px] font-bold">{item.category}</span> : null}
                      <h4 className="font-bold text-[14px] leading-snug text-[#0f172a] dark:text-white group-hover:text-[#2563eb] transition-colors">{item.title}</h4>
                      <p className="mt-2 text-[12px] leading-5 text-[#64748b] dark:text-[#94a3b8] line-clamp-2 flex-1">{item.summary}</p>
                      <div className="mt-3 flex items-center gap-2 text-[10px] text-[#64748b] dark:text-[#94a3b8] border-t border-[#f1f5f9] dark:border-[#334155] pt-3">
                        <span className="flex items-center gap-1"><Clock className="size-3" /> 5 دقائق</span>
                        <span>-</span>
                        <span>ميزان الرقمية</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* الفعاليات — نعرض معلوماتها النصية ولو لم تتوفر صورة */}
            {latestEvents.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-[16px] text-[#0f172a] dark:text-white flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-full bg-[#f59e0b]/10 text-[#f59e0b]"><Calendar className="size-4" /></span>
                    الفعاليات والندوات
                  </h3>
                  <Link to="/events" aria-label="عرض الكل: الفعاليات والندوات" className="text-[12px] font-bold text-[#2563eb] hover:underline flex items-center gap-1">عرض الكل <ArrowRight className="size-3 rtl:rotate-180" aria-hidden="true" /></Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {latestEvents.slice(0, 4).map((ev) => (
                    <Link key={ev.id} to={`/events/${ev.slug}`} className="group bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] rounded-2xl overflow-hidden hover:border-[#f59e0b]/30 hover:shadow-[0_8px_24px_rgba(245,158,11,0.10)] hover:-translate-y-0.5 transition-all flex flex-col">
                      {ev.image ? (
                        <div className="h-[130px] bg-[#fef3c7] dark:bg-[#78350f]/20 overflow-hidden relative shrink-0">
                          <img src={ev.image} alt={ev.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" width={320} height={130} />
                          <span className="absolute top-2 right-2 bg-[#f59e0b] text-white text-[9px] font-bold px-2.5 py-1 rounded-full shadow-sm">ندوة</span>
                          {ev.date && <span className="absolute bottom-2 left-2 bg-black/60 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><Calendar className="size-3" />{new Date(ev.date).toLocaleDateString("ar-MA")}</span>}
                        </div>
                      ) : null}
                      <div className="p-4 flex flex-col flex-1">
                        {!ev.image && <span className="self-start rounded-full bg-[#fffbeb] dark:bg-[#78350f]/20 px-2 py-1 text-[10px] font-bold text-[#b45309]">ندوة</span>}
                        <h4 className="font-bold text-[13.5px] leading-snug text-[#0f172a] dark:text-white group-hover:text-[#f59e0b] transition-colors">{ev.title}</h4>
                        <p className="mt-2 text-[11.5px] leading-5 text-[#64748b] dark:text-[#94a3b8] line-clamp-2 flex-1">{ev.excerpt}</p>
                        <div className="mt-3 flex items-center gap-3 text-[10px] text-[#64748b] dark:text-[#94a3b8] border-t border-[#f1f5f9] dark:border-[#334155] pt-3">
                          {!ev.image && ev.date && <time dateTime={ev.date} className="flex items-center gap-1"><Calendar className="size-3" />{new Date(ev.date).toLocaleDateString("ar-MA")}</time>}
                          {ev.city && <span className="flex items-center gap-1"><MapPin className="size-3" />{ev.city}</span>}
                          {ev.organizer && <span className="flex items-center gap-1 truncate"><Building2 className="size-3" />{ev.organizer}</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* نصوص قانونية من الأرشيف — تُعرض قبل القاموس لأنها المصدر الأول */}
            <HomeLawArchive />

            {/* القاموس القانوني — مصطلحات لها شجرة قانونية فقط */}
            <HomeLexiconShowcase terms={treeTerms} total={counts.lexicon} />
          </div>
        </section>

        <HomeFreeResources />

        <HomeFeatures counts={counts} />

        <HomeStatsBand
          items={[
            { value: counts.laws, label: "النصوص القانونية" },
            { value: counts.lexicon, label: "المصطلحات القانونية" },
            { value: counts.schools, label: "الكليات في الدليل" },
            { value: counts.quizQuestions, label: "أسئلة التدريب" },
          ]}
        />

        <Suspense fallback={null}>
          <HomeFaqSection lexiconCount={counts.lexicon} articlesCount={counts.articles} schoolsCount={counts.schools} />
        </Suspense>
      </main>
    </>
  )
}
