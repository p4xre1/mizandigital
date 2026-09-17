import { useEffect, useState, lazy, Suspense } from "react"
import { Link } from "react-router-dom"
import { AEOHead } from "../../components/seo/AEOHead"
import counts from "../../data/counts.json"
import { diversifyByCategory } from "../../lib/utils/diversify"
import { generateSlug } from "../../lib/utils/generateSlug"
import {
  BookOpen, Scale, GraduationCap, Star, Users, Award, Library, ShieldCheck, Clock, Video, FileText, ArrowRight,
  Calendar, MapPin, Languages, GitBranch, Building2
} from "lucide-react"

const HomeFaqSection = lazy(() => import("../../components/home/HomeFaqSection").then((m) => ({ default: m.HomeFaqSection })))
const LegalTermTree = lazy(() => import("../../components/lexicon/LegalTermTree").then((m) => ({ default: m.LegalTermTree })))

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

export function HomePage() {
  const [latestArticles, setLatestArticles] = useState<FeedCard[]>([])
  const [latestEvents, setLatestEvents] = useState<EventCard[]>([])
  const [latestTerms, setLatestTerms] = useState<LexiconCard[]>([])
  const [schoolsCount] = useState<number>(counts.schools)
  const [articlesCount] = useState<number>(counts.articles)

  useEffect(() => {
    const loadLocal = async () => {
      try {
        const [{ default: articlesData }, { default: eventsData }, { default: lexiconData }] = await Promise.all([
          import("../../data/articles.json"),
          import("../../data/events.json"),
          import("../../data/lexicon.json"),
        ])
        const localArticles: FeedCard[] = (articlesData as any[])
          .map((item) => ({
            id: item.id,
            slug: item.slug,
            title: item.title,
            summary: item.excerpt,
            category: item.category,
            date: item.publishedAt,
            image: item.coverImage || item.image,
          }))
          .filter((a) => !!a.image && a.image.trim() !== "")
        setLatestArticles(diversifyByCategory(localArticles, 8))

        const localEvents: EventCard[] = (eventsData as any[])
          .map((e) => ({
            id: e.id,
            slug: e.slug || e.id,
            title: e.title,
            excerpt: e.excerpt,
            city: e.city,
            date: e.eventDate || e.date,
            image: e.image,
            organizer: e.organizer,
          }))
          .filter((e) => !!e.image && String(e.image).trim() !== "")
        setLatestEvents(localEvents.slice(0, 4))

        const localTerms: LexiconCard[] = (lexiconData as any[]).slice(0, 6).map((t) => ({
          id: t.id,
          term_ar: t.term_ar,
          term_fr: t.term_fr,
          definition: t.definition,
          category: t.category,
          legal_sources: t.legal_sources || [],
        }))
        setLatestTerms(localTerms)
      } catch {}
    }
    loadLocal()

    const loadRemote = async () => {
      try {
        const { supabase } = await import("../../lib/supabase/client")
        const [{ default: articlesData }, { default: eventsData }, { default: lexiconData }] = await Promise.all([
          import("../../data/articles.json"),
          import("../../data/events.json"),
          import("../../data/lexicon.json"),
        ])

        const [articlesRes, seminarsRes, termsRes] = await Promise.all([
          supabase.from("articles").select("id, title, slug, excerpt, published_at, created_at, cover_image, category:categories(name)").eq("status", "published").order("published_at", { ascending: false }).limit(30),
          (supabase as any).from("seminars").select("*").eq("status", "published").order("event_date", { ascending: false }).limit(20),
          supabase.from("lexicon_terms").select("id, term_ar, term_fr, definition, category").order("created_at", { ascending: false }).limit(20),
        ])

        const remoteArticles: FeedCard[] = (articlesRes.data || [])
          .map((item: any) => ({
            id: item.id,
            slug: item.slug,
            title: item.title,
            summary: item.excerpt,
            category: Array.isArray(item.category) ? item.category[0]?.name : item.category?.name,
            date: item.published_at || item.created_at,
            image: item.cover_image,
          }))
          .filter((a) => !!a.image && String(a.image).trim() !== "")

        const localArticles: FeedCard[] = (articlesData as any[])
          .map((item) => ({
            id: item.id,
            slug: item.slug,
            title: item.title,
            summary: item.excerpt,
            category: item.category,
            date: item.publishedAt,
            image: item.coverImage || item.image,
          }))
          .filter((a) => !!a.image && String(a.image).trim() !== "")

        const combinedArticles = Array.from(new Map([...remoteArticles, ...localArticles].map((a) => [a.slug, a])).values())
        setLatestArticles(diversifyByCategory(combinedArticles.filter((a) => !!a.image), 8))

        // Events: merge local + remote seminars, only with picture
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
          .filter((e: EventCard) => !!e.image)

        const localEvents: EventCard[] = (eventsData as any[])
          .map((e) => ({
            id: e.id,
            slug: e.slug || e.id,
            title: e.title,
            excerpt: e.excerpt,
            city: e.city,
            date: e.eventDate,
            image: e.image,
            organizer: e.organizer,
          }))
          .filter((e) => !!e.image)

        const combinedEvents = Array.from(new Map([...remoteSeminars, ...localEvents].map((e) => [e.id, e])).values())
        setLatestEvents(combinedEvents.slice(0, 4))

        // Lexicon terms
        const remoteTerms: LexiconCard[] = (termsRes.data || []).map((t: any) => ({
          id: t.id,
          term_ar: t.term_ar,
          term_fr: t.term_fr,
          definition: t.definition,
          category: t.category,
          legal_sources: [],
        }))

        const localTerms: LexiconCard[] = (lexiconData as any[]).slice(0, 12).map((t) => ({
          id: t.id,
          term_ar: t.term_ar,
          term_fr: t.term_fr,
          definition: t.definition,
          category: t.category,
          legal_sources: t.legal_sources || [],
        }))

        const combinedTerms = Array.from(new Map([...remoteTerms, ...localTerms].map((t) => [t.id, t])).values())
        setLatestTerms(combinedTerms.slice(0, 6))
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
  }, [])

  return (
    <>
      <AEOHead
        title="ملخصات S1-S6، قاموس قانوني 250 مصطلح ودليل 21 كلية حقوق بالمغرب"
        description="ميزان الرقمية منصة مغربية لطلبة القانون، محتواها الأساسي مجاني ومزاياها المتقدمة باشتراك ميزان برو: ملخصات S1-S6، قاموس قانوني 250 مصطلح عربي-فرنسي، دليل 21 كلية حقوق FSJES، مقالات، أخبار تشريعية واختبارات QCM."
        directAnswer="ميزان الرقمية منصة مغربية لطلبة كليات الحقوق بالمغرب، محتواها الأساسي مجاني ومزاياها المتقدمة باشتراك ميزان برو، تضم ملخصات S1-S6، قاموس قانوني 250 مصطلح عربي-فرنسي، دليل 21 كلية حقوق FSJES، مقالات تحليلية، أخبار تشريعية محينة واختبارات QCM للتحضير للمباريات."
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
        breadcrumbs={[{ name: "الرئيسية", url: "https://www.mizan.page/" }]}
        faq={[
          { question: "ما هي منصة ميزان الرقمية؟", answer: "ميزان الرقمية منصة مغربية تعليمية لطلبة القانون، محتواها الأساسي مجاني ومزاياها المتقدمة باشتراك ميزان برو، تضم ملخصات S1-S6، قاموس قانوني 250 مصطلح عربي-فرنسي، دليل 21 كلية حقوق FSJES، مقالات، أخبار تشريعية واختبارات QCM." },
          { question: "هل المحتوى مجاني؟", answer: "المحتوى الأساسي مجاني دون تسجيل: القاموس القانوني، وملخصات الأرشيف S1-S6، ودليل الكليات، والمقالات، والأخبار. المزايا المتقدمة مؤدّاة عبر اشتراك ميزان برو (49 درهماً شهرياً أو 399 درهماً سنوياً) أو عبر حزم الكريدتس. المنصة لم تعد مجانية بالكامل كما كانت في مرحلة سابقة، وهذا معلن في صفحة الأسعار." },
          { question: "كم عدد كليات الحقوق في الدليل؟", answer: "دليلنا يضم 21 كلية حقوق وعلوم قانونية واقتصادية FSJES بالمغرب: الرباط، الدار البيضاء، مراكش، فاس، طنجة، أكادير، وجدة، مكناس وغيرها." },
        ]}
      />
      <main className="min-h-screen bg-white dark:bg-[#0f172a] text-foreground" dir="rtl">
        <section className="relative bg-white dark:bg-[#0f172a] overflow-hidden">
          <div className="pointer-events-none hidden md:block absolute -top-24 left-1/2 -translate-x-1/2 size-[400px] rounded-full bg-[#dbeafe] dark:bg-[#1e3a5f]/10 blur-[50px]" />
          <div className="pointer-events-none hidden md:block absolute -bottom-24 -right-24 size-[200px] rounded-full bg-[#fef3c7] dark:bg-[#78350f]/5 blur-[40px]" />

          <div className="container relative mx-auto max-w-[800px] px-6 py-14 lg:py-20 flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#eff6ff] dark:bg-[#1e293b] border border-[#dbeafe] dark:border-[#334155] px-4 py-1.5 text-[11px] font-black tracking-wide text-[#2563eb] dark:text-[#60a5fa]">
              <span className="size-1.5 rounded-full bg-[#2563eb]" />
              منصة تعليمية عصرية • الأساسي مجاني والمتقدم باشتراك
            </div>

            <h1 className="mt-6 text-[34px] md:text-[48px] font-black leading-[1.05] tracking-[-0.03em] text-[#0f172a] dark:text-white">
              افتح إمكانياتك مع
              <br />
              <span className="text-[#2563eb]">التعلم القانوني</span>
              <br />
              <span className="text-[20px] md:text-[24px] font-bold tracking-tight text-[#475569] dark:text-[#94a3b8] mt-1 block">Online Learning</span>
            </h1>

            <p className="mt-5 max-w-[560px] text-[14px] md:text-[15px] leading-7 text-[#475569] dark:text-[#94a3b8]">
              انطلق في رحلة من المعرفة والمهارة مع مواردنا الإلكترونية. سواء كنت تبحث عن اكتساب خبرات جديدة أو صقل مواهبك، منصتنا المتنوعة تقدم تجربة تعليمية مرنة وجذابة. تمكّن نفسك اليوم!
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link to="/articles" className="inline-flex items-center gap-2 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-7 py-3 text-[14px] font-bold shadow-[0_4px_12px_rgba(37,99,235,0.2)] transition-colors">
                ابدأ الآن
                <span className="size-5 grid place-items-center rounded-full bg-white/20 text-[12px]">←</span>
              </Link>
              <Link to="/quiz" className="inline-flex items-center gap-2 rounded-full border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] px-7 py-3 text-[14px] font-bold text-[#0f172a] dark:text-white hover:bg-[#f8fafc] dark:hover:bg-[#334155] transition-colors">
                اختبر معرفتك القانونية
                <span className="size-5 grid place-items-center rounded-full bg-[#f1f5f9] dark:bg-[#334155] text-[12px]">←</span>
              </Link>
            </div>

            <div className="mt-7 flex items-center justify-center gap-4">
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
                  <Star className="size-3 fill-[#f59e0b] text-[#f59e0b]" /> 4.9 • محتوى أساسي مجاني
                </div>
              </div>
            </div>

            <div className="mt-10 w-full max-w-[560px] grid grid-cols-2 gap-3">
              {[
                { title: "القاموس", desc: "250 مصطلح", icon: Scale, color: "bg-[#2563eb]", count: `${counts.lexicon}` },
                { title: "الأرشيف", desc: "S1-S6", icon: Library, color: "bg-[#f59e0b]", count: "S1-S6" },
                { title: "المقالات", desc: `${articlesCount} مقال`, icon: BookOpen, color: "bg-[#10b981]", count: `${articlesCount}` },
                { title: "الأخبار", desc: "مباشر", icon: GraduationCap, color: "bg-[#ec4899]", count: "مباشر" },
              ].map((card, i) => (
                <div key={i} className="text-right rounded-2xl bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className={`grid size-9 place-items-center rounded-xl ${card.color} text-white shadow-sm`}>
                      <card.icon className="size-4" />
                    </div>
                    <span className="text-[10px] font-bold bg-[#f1f5f9] dark:bg-[#334155] border border-[#e2e8f0] dark:border-[#475569] rounded-full px-2 py-1">{card.count}</span>
                  </div>
                  {/* h2 وليس h3: تسلسل العناوين كان h1 ← h3 (قفز مستوى) وهو
                      سبب فشل تدقيق heading-order. h2 يبقي الترتيب تنازلياً
                      متسلسلاً مع بقية أقسام الصفحة. */}
                  <h2 className="mt-3 font-black text-[12px] text-[#0f172a] dark:text-white">{card.title}</h2>
                  <p className="mt-1 text-[11px] text-[#64748b] dark:text-[#94a3b8]">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 bg-[#f8fafc] dark:bg-[#0f172a] [content-visibility:auto] [contain-intrinsic-size:800px]">
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

            {/* أحدث المقالات — only with pictures */}
            <div className="mt-12">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-[16px] text-[#0f172a] dark:text-white">أحدث المقالات</h3>
                <Link to="/articles" className="text-[12px] font-bold text-[#2563eb] hover:underline flex items-center gap-1">عرض الكل <ArrowRight className="size-3 rtl:rotate-180" /></Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {latestArticles.filter((a) => !!a.image).slice(0, 4).map((item) => (
                  <Link key={item.id} to={`/articles/${item.slug}`} className="group bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] rounded-2xl overflow-hidden hover:border-[#2563eb]/20 hover:shadow-[0_8px_24px_rgba(37,99,235,0.08)] hover:-translate-y-0.5 transition-all flex flex-col">
                    <div className="h-[110px] sm:h-[120px] bg-[#f1f5f9] dark:bg-[#334155] overflow-hidden relative shrink-0">
                      <img src={item.image!} alt={item.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" width={320} height={120} />
                      <span className="absolute top-2 right-2 bg-white/90 dark:bg-black/60 backdrop-blur text-[9px] font-bold px-2 py-1 rounded-full border border-black/5 shadow-sm">{item.category || "قانون"}</span>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <h4 className="font-bold text-[14px] leading-snug line-clamp-2 text-[#0f172a] dark:text-white group-hover:text-[#2563eb] transition-colors">{item.title}</h4>
                      <p className="mt-2 text-[12px] leading-5 text-[#64748b] dark:text-[#94a3b8] line-clamp-2 flex-1">{item.summary}</p>
                      <div className="mt-3 flex items-center gap-2 text-[10px] text-[#64748b] dark:text-[#94a3b8] border-t border-[#f1f5f9] dark:border-[#334155] pt-3">
                        <span className="flex items-center gap-1"><Clock className="size-3" /> 5 دقائق</span>
                        <span>•</span>
                        <span>ميزان الرقمية</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* الفعاليات — only with pictures */}
            {latestEvents.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-[16px] text-[#0f172a] dark:text-white flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-full bg-[#f59e0b]/10 text-[#f59e0b]"><Calendar className="size-4" /></span>
                    الفعاليات والندوات
                  </h3>
                  <Link to="/events" className="text-[12px] font-bold text-[#2563eb] hover:underline flex items-center gap-1">عرض الكل <ArrowRight className="size-3 rtl:rotate-180" /></Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {latestEvents.filter((e) => !!e.image).slice(0, 4).map((ev) => (
                    <Link key={ev.id} to={`/events/${ev.slug}`} className="group bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] rounded-2xl overflow-hidden hover:border-[#f59e0b]/30 hover:shadow-[0_8px_24px_rgba(245,158,11,0.10)] hover:-translate-y-0.5 transition-all flex flex-col">
                      <div className="h-[130px] bg-[#fef3c7] dark:bg-[#78350f]/20 overflow-hidden relative shrink-0">
                        <img src={ev.image!} alt={ev.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" width={320} height={130} />
                        <span className="absolute top-2 right-2 bg-[#f59e0b] text-white text-[9px] font-bold px-2.5 py-1 rounded-full shadow-sm">ندوة</span>
                        {ev.date && <span className="absolute bottom-2 left-2 bg-black/60 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><Calendar className="size-3" />{new Date(ev.date).toLocaleDateString("ar-MA")}</span>}
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <h4 className="font-bold text-[13.5px] leading-snug line-clamp-2 text-[#0f172a] dark:text-white group-hover:text-[#f59e0b] transition-colors">{ev.title}</h4>
                        <p className="mt-2 text-[11.5px] leading-5 text-[#64748b] dark:text-[#94a3b8] line-clamp-2 flex-1">{ev.excerpt}</p>
                        <div className="mt-3 flex items-center gap-3 text-[10px] text-[#64748b] dark:text-[#94a3b8] border-t border-[#f1f5f9] dark:border-[#334155] pt-3">
                          {ev.city && <span className="flex items-center gap-1"><MapPin className="size-3" />{ev.city}</span>}
                          {ev.organizer && <span className="flex items-center gap-1 truncate"><Building2 className="size-3" />{ev.organizer.slice(0, 20)}</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* القاموس القانوني — مع شجرة */}
            {latestTerms.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-[16px] text-[#0f172a] dark:text-white flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-full bg-[#2563eb]/10 text-[#2563eb]"><Languages className="size-4" /></span>
                    القاموس القانوني — مع الشجرة القانونية
                  </h3>
                  <Link to="/lexicon" className="text-[12px] font-bold text-[#2563eb] hover:underline flex items-center gap-1">عرض الكل <ArrowRight className="size-3 rtl:rotate-180" /></Link>
                </div>

                {/* Featured term with tree */}
                {latestTerms[0]?.legal_sources && latestTerms[0].legal_sources.length > 0 && (
                  <div className="mb-6 rounded-2xl border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-5 overflow-hidden">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="grid size-8 place-items-center rounded-xl bg-[#2563eb] text-white"><Scale className="size-4" /></span>
                          <h4 className="font-black text-[16px] text-[#0f172a] dark:text-white">{latestTerms[0].term_ar}</h4>
                          {latestTerms[0].term_fr && <span className="text-[11px] text-muted-foreground font-mono">({latestTerms[0].term_fr})</span>}
                        </div>
                        <p className="mt-2 text-[12.5px] leading-6 text-[#475569] dark:text-[#94a3b8] max-w-2xl">{latestTerms[0].definition}</p>
                        <div className="mt-2 flex items-center gap-2 text-[10px]">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#2563eb]/10 border border-[#2563eb]/20 px-2.5 py-1 font-bold text-[#2563eb]"><GitBranch className="size-3" /> شجرة قانونية: {latestTerms[0].legal_sources.length} مصادر • {latestTerms[0].legal_sources.reduce((acc: number, s: any) => acc + (s.articles?.length || 0), 0)} فصول</span>
                          <span className="rounded-full bg-[#f1f5f9] dark:bg-[#334155] px-2.5 py-1 font-bold text-[10px]">{latestTerms[0].category}</span>
                        </div>
                      </div>
                      <Link to={`/lexicon/${generateSlug(latestTerms[0].term_ar)}`} className="shrink-0 rounded-full bg-[#2563eb] text-white px-4 py-2 text-[11px] font-bold hover:bg-[#1d4ed8]">التفاصيل →</Link>
                    </div>
                    <Suspense fallback={<div className="h-20 grid place-items-center text-[12px] text-muted-foreground">جارٍ تحميل الشجرة...</div>}>
                      <LegalTermTree termAr={latestTerms[0].term_ar} termFr={latestTerms[0].term_fr} legalSources={latestTerms[0].legal_sources} />
                    </Suspense>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {latestTerms.slice(1, 7).map((term) => (
                    <Link key={term.id} to={`/lexicon/${generateSlug(term.term_ar)}`} className="group bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] rounded-2xl p-4 hover:border-[#2563eb]/20 hover:shadow-[0_8px_20px_rgba(37,99,235,0.06)] transition-all flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="grid size-8 place-items-center rounded-xl bg-[#eff6ff] dark:bg-[#1e3a5f] text-[#2563eb] group-hover:bg-[#2563eb] group-hover:text-white transition-colors"><GitBranch className="size-4" /></span>
                          <div>
                            <h4 className="font-bold text-[13px] text-[#0f172a] dark:text-white group-hover:text-[#2563eb] transition-colors">{term.term_ar}</h4>
                            {term.term_fr && <p className="text-[10px] text-muted-foreground font-mono">{term.term_fr}</p>}
                          </div>
                        </div>
                        <span className="text-[9px] font-bold bg-[#f1f5f9] dark:bg-[#334155] border rounded-full px-2 py-1 shrink-0">{term.category}</span>
                      </div>
                      <p className="mt-3 text-[11.5px] leading-5 text-[#64748b] dark:text-[#94a3b8] line-clamp-3 flex-1">{term.definition}</p>
                      {term.legal_sources && term.legal_sources.length > 0 && (
                        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[#2563eb] font-bold border-t border-[#f1f5f9] dark:border-[#334155] pt-3">
                          <GitBranch className="size-3" />
                          <span>{term.legal_sources.length} مصادر قانونية • {term.legal_sources.reduce((acc: number, s: any) => acc + (s.articles?.length || 0), 0)} فصول مرتبطة</span>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="py-14 bg-white dark:bg-[#0f172a] border-y border-[#f1f5f9] dark:border-[#1e293b] [content-visibility:auto] [contain-intrinsic-size:900px]">
          <div className="container relative mx-auto max-w-[1280px] px-6">
            <div className="text-center max-w-[640px] mx-auto">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#eff6ff] dark:bg-[#1e293b] border border-[#dbeafe] dark:border-[#334155] px-3 py-1 text-[11px] font-black text-[#2563eb] dark:text-[#60a5fa]">
                <span className="size-1.5 rounded-full bg-[#2563eb]" />
                الأسعار • خطط مرنة
              </span>
              <h2 className="mt-4 text-[26px] md:text-[32px] font-black leading-[1.15] text-[#0f172a] dark:text-white">
                خطط تناسب كل
                <span className="text-[#2563eb]"> طالب قانون</span>
              </h2>
              <p className="mt-3 text-[13px] leading-6 text-[#64748b] dark:text-[#94a3b8]">
                ميزان برو يمول المحتوى المجاني. كل اشتراك يدعم استمرار الأرشيف والاختبارات للجميع.
              </p>
            </div>

            <div className="mt-10 grid md:grid-cols-3 gap-5 max-w-[1000px] mx-auto items-start">
              <div className="rounded-2xl bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-[#f1f5f9] dark:bg-[#334155] text-[#475569] dark:text-white">
                    <BookOpen className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-[14px] text-[#0f172a] dark:text-white">المجاني</h3>
                    <p className="text-[11px] text-[#64748b]">للجميع • للأبد</p>
                  </div>
                </div>
                <div className="mt-5">
                  <span className="text-[28px] font-black text-[#0f172a] dark:text-white">0</span>
                  <span className="text-[13px] font-bold text-[#64748b]"> د.م / للأبد</span>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {[
                    "الوصول للأرشيف S1-S6",
                    "القاموس 250 مصطلح",
                    "المقالات المجانية",
                    "الاختبارات الأساسية",
                    "دليل الكليات 21 كلية",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[12px] text-[#334155] dark:text-[#cbd5e1]">
                      <span className="grid size-5 place-items-center rounded-full bg-[#dcfce7] text-[#16a34a]"><ShieldCheck className="size-3" /></span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/articles" className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border bg-white dark:bg-[#0f172a] py-3 text-[13px] font-bold">
                  ابدأ مجاناً ←
                </Link>
              </div>

              <div className="rounded-2xl bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-[#eff6ff] text-[#2563eb]">
                    <Clock className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-[14px]">شهري</h3>
                    <p className="text-[11px] text-[#64748b]">500 كريدتس</p>
                  </div>
                </div>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-[28px] font-black">49</span>
                  <span className="text-[13px] font-bold text-[#64748b]"> د.م / شهر</span>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {[
                    "شجرة القوانين المتقدمة",
                    "تحديات مميزة",
                    "دعم أولوية",
                    "كل مزايا المجاني",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[12px]">
                      <span className="grid size-5 place-items-center rounded-full bg-[#eff6ff] text-[#2563eb]"><ShieldCheck className="size-3" /></span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/pricing" className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#0f172a] dark:bg-white text-white dark:text-black py-3 text-[13px] font-bold">
                  اختر الشهري ←
                </Link>
              </div>

              <div className="rounded-2xl bg-[#0f172a] dark:bg-black border p-6 shadow-lg relative overflow-hidden md:-mt-3">
                <div className="absolute top-0 inset-x-0 h-1 bg-[#2563eb]" />
                <span className="absolute top-4 left-4 rounded-full bg-[#f59e0b] px-2.5 py-1 text-[10px] font-black text-white">الأفضل قيمة — خصم 32%</span>
                <div className="flex items-center gap-3 mt-1">
                  <div className="grid size-10 place-items-center rounded-xl bg-white/10 text-white">
                    <Award className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-[14px] text-white">سنوي</h3>
                    <p className="text-[11px] text-white/60">7000 + 1000 هدية</p>
                  </div>
                </div>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-[28px] font-black text-white">399</span>
                  <span className="text-[13px] font-bold text-white/60"> د.م / سنة</span>
                </div>
                <p className="mt-1 text-[11px] text-[#f59e0b] font-bold">1000 كريدتس هدية + خصم 32%</p>
                <ul className="mt-5 space-y-2.5">
                  {[
                    "كل مزايا الشهري",
                    "خصم 32% عن الشهري",
                    "1000 كريدتس هدية",
                    "شهادة توصية",
                    "شارات حصرية",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[12px] text-white/90">
                      <span className="grid size-5 place-items-center rounded-full bg-white/10"><ShieldCheck className="size-3" /></span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/pricing" className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#2563eb] text-white py-3 text-[13px] font-bold">
                  اختر السنوي ←
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 bg-[#f8fafc] dark:bg-[#0f172a]/50 border-y border-[#f1f5f9] dark:border-[#1e293b] [content-visibility:auto] [contain-intrinsic-size:500px]">
          <div className="container mx-auto max-w-[1280px] px-6">
            <div className="max-w-[900px] mx-auto">
              <div className="text-center max-w-[640px] mx-auto mb-10">
                <span className="inline-block text-[11px] font-black tracking-[0.15em] text-[#2563eb] uppercase bg-[#eff6ff] dark:bg-[#1e293b] border rounded-full px-3 py-1">لماذا نحن</span>
                <h2 className="mt-4 text-[26px] md:text-[32px] font-black leading-[1.15] text-[#0f172a] dark:text-white">
                  اكتشف المزايا المميزة
                  <br />
                  لمنصتنا التعليمية
                  <span className="text-[#2563eb]"> القانونية</span>
                </h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { title: "مسارات متنوعة", desc: "استكشف مجموعة متنوعة من المسارات التعليمية المصممة لتناسب اهتماماتك.", icon: Library, color: "bg-[#eff6ff] text-[#2563eb]" },
                  { title: "أساتذة خبراء", desc: "تعلم من خبراء وأساتذة متخصصين ملتزمين بنجاحك التعليمي.", icon: Users, color: "bg-[#fef3c7] text-[#f59e0b]" },
                  { title: "جدول مرن", desc: "استمتع بمرونة التعلم عبر الإنترنت مع خيارات جدولة مرنة.", icon: Clock, color: "bg-[#dcfce7] text-[#16a34a]" },
                  { title: "دعم مستمر", desc: "احصل على دعم مستمر ووصول إلى موارد إضافية لرحلة غنية.", icon: ShieldCheck, color: "bg-[#fce7f3] text-[#ec4899]" },
                ].map((feature, i) => (
                  <div key={i} className="rounded-2xl border bg-white dark:bg-[#1e293b] p-5">
                    <div className={`size-10 grid place-items-center rounded-xl ${feature.color}`}>
                      <feature.icon className="size-5" />
                    </div>
                    <h3 className="mt-3 font-black text-[13px]">{feature.title}</h3>
                    <p className="mt-1 text-[11px] leading-5 text-[#64748b] dark:text-[#94a3b8]">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-10 bg-[#2563eb] dark:bg-[#1e40af] text-white relative">
          <div className="container mx-auto max-w-[1280px] px-6 relative">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
              {[
                { value: "500+", label: "طالب مستفيد" },
                { value: "250+", label: "مصطلح قانوني" },
                { value: `${counts.articles}+`, label: "مقال قانوني" },
                { value: `${counts.schools}+`, label: "كلية جامعية" },
                { value: "100%", label: "مجاني" },
              ].map((stat, i) => (
                <div key={i}>
                  <div className="text-[24px] font-black">{stat.value}</div>
                  <div className="text-[11px] opacity-80 font-bold mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Suspense fallback={null}>
          <HomeFaqSection lexiconCount={counts.lexicon} articlesCount={counts.articles} schoolsCount={counts.schools} />
        </Suspense>
      </main>
    </>
  )
}
