import { useEffect, useState, lazy, Suspense } from "react"
import { Link } from "react-router-dom"
import { AEOHead } from "../../components/seo/AEOHead"
import { BASE_URL, canonicalHome } from "../../lib/canonical"
import counts from "../../data/counts.json"
import { diversifyByCategory } from "../../lib/utils/diversify"
import { CountUp, Reveal } from "../../components/ui/Reveal"
import { generateSlug } from "../../lib/utils/generateSlug"
import {
  BookOpen, Scale, GraduationCap, Award, Library, ShieldCheck, Clock, FileText, ArrowRight,
  Calendar, MapPin, Languages, GitBranch, Building2, Video, GitCompare, BellRing, Compass,
  BadgeCheck, ListChecks, MousePointerClick, Download,
  CalendarClock, FolderOpen, Link2, Landmark, ExternalLink
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

/**
 * علامة قسم موحّدة: رقم القسم + خطّ رفيع + عنوان صغير.
 * تعطي إيقاعاً بصرياً واضحاً للصفحة بدل شرائح ملوّنة متفرّقة.
 */
const TONES = {
  blue: { text: "text-[#2563eb]", rule: "bg-[#2563eb]", soft: "bg-[#2563eb]/10 text-[#2563eb]" },
  gold: { text: "text-[#fcd34d]", rule: "bg-[#f59e0b]", soft: "bg-[#f59e0b]/15 text-[#fcd34d]" },
  green: { text: "text-[#047857]", rule: "bg-[#047857]", soft: "bg-[#047857]/10 text-[#047857]" },
  red: { text: "text-[#b91c1c]", rule: "bg-[#b91c1c]", soft: "bg-[#b91c1c]/10 text-[#b91c1c]" },
} as const;

function SectionLabel({
  step,
  tone = "blue",
  children,
}: {
  step: string;
  tone?: keyof typeof TONES;
  children: React.ReactNode;
}) {
  return (
    <p className={`flex items-center justify-center gap-3 text-[11px] font-black tracking-[0.14em] uppercase ${TONES[tone].text}`}>
      <span className="tabular-nums text-[#64748b] dark:text-[#94a3b8]">{step}</span>
      <span className={`h-px w-6 ${TONES[tone].rule}`} aria-hidden="true" />
      {children}
    </p>
  );
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
          import("../../data/lexicon.client.json"),
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
          import("../../data/lexicon.client.json"),
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

  /*
   * ── عقدة WebPage الصريحة للرئيسية (GEO) ──────────────────────────────────
   * كانت AEOHead تُمرَّر بـ schema فارغ، فلا تُنشر عقدة محتوى للصفحة إلا عقدة
   * speakable وحدها بلا about ولا primaryTopic — وهو ما رصده تدقيق GEO تحت
   * «Content Schema / Answer-First». العقدة هنا تحمل @id الصفحة نفسه المستعمل
   * في index.html وscripts/prerender.mjs، فتُدمج معها ككيان واحد موصوف بدل
   * عقدتين متنافستين على الرابط نفسه، ويُقرأ `about` و`primaryTopic` مباشرة.
   */
  const homePageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${BASE_URL}/#webpage`,
    url: BASE_URL,
    name: "ميزان الرقمية – منصة طلبة الحقوق في المغرب",
    description:
      "منصة ميزان الرقمية تجمع ملخصات القانون، المصطلحات القانونية، ومعلومات كليات الحقوق في مكان واحد. محتواها الأساسي مجاني لطلبة الحقوق بالمغرب، ومزاياها المتقدمة باشتراك ميزان برو.",
    inLanguage: "ar-MA",
    isPartOf: { "@type": "WebSite", "@id": `${BASE_URL}/#website` },
    // مرجع الكيان يبقى أولاً، ويُضاف وصف موضوعي مسمّى كما يطلبه تدقيق GEO
    // (about بـ Thing مسمّى لا مرجع مجرّد).
    about: [
      { "@id": `${BASE_URL}/#organization` },
      { "@type": "Thing", name: "التعليم القانوني في المغرب" },
    ],
    primaryTopic: {
      "@type": "Thing",
      name: "ملخصات ومصطلحات قانونية لطلبة الحقوق",
    },
    publisher: { "@id": `${BASE_URL}/#organization` },
    isAccessibleForFree: true,
  }

  return (
    <>
      <AEOHead
        title="ميزان الرقمية – منصة طلبة الحقوق في المغرب"
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
        canonicalUrl={canonicalHome()}
        schema={homePageSchema}
        faq={[
          { question: "ما هي منصة ميزان الرقمية؟", answer: "ميزان الرقمية منصة مغربية تعليمية لطلبة القانون، محتواها الأساسي مجاني ومزاياها المتقدمة باشتراك ميزان برو، تضم ملخصات S1-S6، قاموس قانوني 250 مصطلح عربي-فرنسي، دليل 21 كلية حقوق FSJES، مقالات، أخبار تشريعية واختبارات QCM." },
          { question: "هل المحتوى مجاني؟", answer: "المحتوى الأساسي مجاني دون تسجيل: القاموس القانوني، وملخصات الأرشيف S1-S6، ودليل الكليات، والمقالات، والأخبار. المزايا المتقدمة مؤدّاة عبر اشتراك ميزان برو (49 درهماً شهرياً أو 399 درهماً سنوياً) أو عبر حزم الكريدتس. المنصة لم تعد مجانية بالكامل كما كانت في مرحلة سابقة، وهذا معلن في صفحة الأسعار." },
          { question: "كم عدد كليات الحقوق في الدليل؟", answer: "دليلنا يضم 21 كلية حقوق وعلوم قانونية واقتصادية FSJES بالمغرب: الرباط، الدار البيضاء، مراكش، فاس، طنجة، أكادير، وجدة، مكناس وغيرها." },
        ]}
      />
      <main className="min-h-screen bg-white dark:bg-[#0f172a] text-foreground" dir="rtl">
        <section className="relative overflow-hidden grad-hero dark:bg-[#0f172a] bg-white">
          <div className="container relative mx-auto max-w-[1200px] px-6 py-14 md:py-20">
            <div className="grid items-center gap-12 lg:gap-14 lg:grid-cols-[1.02fr_0.98fr]">

              {/* العمود النصّي */}
              <Reveal className="text-center lg:text-right">
                <p className="flex items-center justify-center gap-3 lg:justify-start">
                  <span className="h-px w-8 bg-[#cbd5e1] dark:bg-[#334155]" aria-hidden="true" />
                  <span className="text-[12px] font-black tracking-[0.16em] text-[#2563eb]">منصة مغربية مستقلة لطلبة الحقوق</span>
                  <span className="h-px w-8 bg-[#cbd5e1] dark:bg-[#334155] lg:hidden" aria-hidden="true" />
                </p>

                <h1 className="mt-4 text-[31px] md:text-[42px] font-black leading-[1.18] tracking-[-0.025em] text-[#0f172a] dark:text-white">
                  المعرفة القانونية لطلبة الحقوق في المغرب
                </h1>

                {/* مسطرة تأكيد أسفل العنوان: قطعة سميكة + خطّ رفيع يمتدّ. */}
                <div className="mt-5 flex items-center justify-center gap-2 lg:justify-start" aria-hidden="true">
                  <span className="h-1 w-14 rounded-full bg-[#2563eb]" />
                  <span className="h-px w-full max-w-[220px] bg-[#e2e8f0] dark:bg-[#334155]" />
                </div>

                {/* الإجابة المباشرة أول ما يقرأه الزاحف التوليدي بعد H1 (GEO:
                    Answer-First). الصنف `lead` هو نفسه الذي تستهدفه
                    SpeakableSpecification في AEOHead، فيُقرأ النصّ صوتياً أيضاً. */}
                <div className="relative mt-6 overflow-hidden rounded-xl border border-[#e2e8f0] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#1e293b] p-4 ps-5">
                  <span className="absolute inset-y-0 right-0 w-1 bg-[#2563eb]" aria-hidden="true" />
                  <p className="lead text-[15px] md:text-[16px] font-bold leading-7 text-[#334155] dark:text-[#cbd5e1]">
                    ميزان الرقمية منصة مغربية تعليمية لطلبة الحقوق، محتواها الأساسي مجاني، وتجمع القاموس القانوني، وملخصات الفصول S1-S6، ودليل كليات الحقوق بالمغرب في مكان واحد.
                  </p>
                </div>

                <p className="mt-5 flex items-start gap-2.5 text-right text-[14px] leading-7 text-[#475569] dark:text-[#94a3b8]">
                  <Compass className="mt-1 size-4 shrink-0 text-[#2563eb]" aria-hidden="true" />
                  <span>ابدأ من الأرشيف الدراسي بملخصات الفصول، أو قِس مستواك باختبار تجريبي، وتابع المقالات التحليلية والمستجدات التشريعية.</span>
                </p>

                <div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                  {/* زرّ أساسي واحد فقط للفعل الأهم (طلب المستخدم: المراجعة
                      قبل الامتحان). الزرّ الثانوي إطار بلا تعبئة (Von Restorff). */}
                  <Link to="/archive" className="btn-accent inline-flex items-center gap-2 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-8 py-3.5 text-[15px] font-black transition-colors">
                    ابدأ المراجعة — مجاناً
                    <span className="size-5 grid place-items-center rounded-full bg-white/20 text-[12px]">←</span>
                  </Link>
                  <Link to="/quiz" className="inline-flex items-center gap-2 rounded-full border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] px-7 py-3 text-[14px] font-bold text-[#0f172a] dark:text-white hover:bg-[#f8fafc] dark:hover:bg-[#334155] transition-colors">
                    قِس مستواك في ٣ دقائق
                    <span className="size-5 grid place-items-center rounded-full bg-[#f1f5f9] dark:bg-[#334155] text-[12px]">←</span>
                  </Link>
                </div>

                {/* دليل ثقة: أربع حقائق قابلة للتحقّق (لا أرقام مُختلقة) */}
                <ul className="mt-7 grid gap-px overflow-hidden rounded-xl border border-[#e2e8f0] dark:border-[#334155] bg-[#e2e8f0] dark:bg-[#334155] text-[12px] font-bold text-[#475569] dark:text-[#94a3b8] sm:grid-cols-2 lg:grid-cols-4">
                  <li className="flex items-center justify-center gap-1.5 bg-white dark:bg-[#1e293b] px-4 py-2.5"><ShieldCheck className="size-4 text-[#2563eb]" aria-hidden="true" />محتوى أساسي مجاني</li>
                  <li className="flex items-center justify-center gap-1.5 bg-white dark:bg-[#1e293b] px-4 py-2.5"><BadgeCheck className="size-4 text-[#2563eb]" aria-hidden="true" />بلا إعلانات</li>
                  <li className="flex items-center justify-center gap-1.5 bg-white dark:bg-[#1e293b] px-4 py-2.5"><Landmark className="size-4 text-[#2563eb]" aria-hidden="true" />مصادر رسمية محالة</li>
                  <li className="flex items-center justify-center gap-1.5 bg-white dark:bg-[#1e293b] px-4 py-2.5"><Library className="size-4 text-[#2563eb]" aria-hidden="true" />ملخصات S1-S6</li>
                </ul>
              </Reveal>

              {/* لوحة المعاينة: محتوى حقيقي من المنصة (مصطلح + سلسلة إحالة + حاسبة) */}
              <Reveal delay={140}>
              <figure aria-label="معاينة من المنصة" className="grad-card overflow-hidden rounded-2xl border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] shadow-sm">
                {/* شريط العلامة أعلى اللوحة */}
                <div className="h-1 w-full bg-[#2563eb]" aria-hidden="true" />
                <figcaption className="flex items-center justify-between gap-3 border-b border-[#e2e8f0] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#0f172a] px-4 py-2.5">
                  <span className="flex items-center gap-2 text-[11px] font-black text-[#334155] dark:text-[#cbd5e1]">
                    <Scale className="size-3.5 text-[#2563eb]" aria-hidden="true" />
                    معاينة من المنصة
                  </span>
                  <span className="text-[10px] font-bold text-[#64748b] dark:text-[#94a3b8]">مثال توضيحي</span>
                </figcaption>

                <div className="divide-y divide-[#e2e8f0] dark:divide-[#334155]">
                  <div className="p-4">
                    <p className="flex items-center gap-2 text-[10px] font-black tracking-wide text-[#2563eb]">
                      <BookOpen className="size-3.5" aria-hidden="true" />القاموس القانوني
                    </p>
                    {latestTerms[0] ? (
                      <>
                        <p className="mt-2 text-[15px] font-black text-[#0f172a] dark:text-white">
                          {latestTerms[0].term_ar}
                          {latestTerms[0].term_fr && <span className="ms-2 text-[11px] font-bold text-[#64748b] dark:text-[#94a3b8]">{latestTerms[0].term_fr}</span>}
                        </p>
                        <p className="mt-1 line-clamp-2 text-[12px] leading-6 text-[#475569] dark:text-[#94a3b8]">{latestTerms[0].definition}</p>
                      </>
                    ) : (
                      <span className="mt-2 block space-y-2">
                        <span className="block h-4 w-32 rounded bg-muted animate-pulse" />
                        <span className="block h-3 w-full rounded bg-muted animate-pulse" />
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    <p className="flex items-center gap-2 text-[10px] font-black tracking-wide text-[#2563eb]">
                      <Link2 className="size-3.5" aria-hidden="true" />خريطة الإحالات
                    </p>
                    <ol className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-[#334155] dark:text-[#cbd5e1]">
                      <li className="rounded-lg border border-[#e2e8f0] dark:border-[#334155] px-2 py-1">النصّ القانوني</li>
                      <li aria-hidden="true" className="text-[#64748b] dark:text-[#94a3b8]">←</li>
                      <li className="rounded-lg border border-[#e2e8f0] dark:border-[#334155] px-2 py-1">
                        {latestTerms[0]?.legal_sources?.[0]?.code_short || "النصّ المرجعي"}
                        {latestTerms[0]?.legal_sources?.[0]?.articles?.[0]?.number ? ` — المادة ${latestTerms[0].legal_sources[0].articles[0].number}` : ""}
                      </li>
                      <li aria-hidden="true" className="text-[#64748b] dark:text-[#94a3b8]">←</li>
                      <li className="rounded-lg border border-[#e2e8f0] dark:border-[#334155] px-2 py-1">المصدر الرسمي</li>
                    </ol>
                  </div>

                  <div className="p-4">
                    <p className="flex items-center gap-2 text-[10px] font-black tracking-wide text-[#2563eb]">
                      <CalendarClock className="size-3.5" aria-hidden="true" />حاسبة الآجال
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg border border-[#e2e8f0] dark:border-[#334155] px-2 py-2">
                        <span className="block text-[10px] font-bold text-[#64748b] dark:text-[#94a3b8]">تاريخ الحدث</span>
                        <span className="mt-1 block text-[12px] font-black tabular-nums text-[#0f172a] dark:text-white">2026-01-25</span>
                      </div>
                      <div className="rounded-lg border border-[#e2e8f0] dark:border-[#334155] px-2 py-2">
                        <span className="block text-[10px] font-bold text-[#64748b] dark:text-[#94a3b8]">المدة</span>
                        <span className="mt-1 block text-[12px] font-black tabular-nums text-[#0f172a] dark:text-white">30 يوماً</span>
                      </div>
                      <div className="rounded-lg border border-[#2563eb]/30 bg-[#eff6ff] dark:bg-[#1e3a5f]/30 px-2 py-2">
                        <span className="block text-[10px] font-bold text-[#2563eb]">النتيجة</span>
                        <span className="mt-1 block text-[12px] font-black tabular-nums text-[#2563eb]">2026-02-04</span>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-[#64748b] dark:text-[#94a3b8]">أيام تقويمية، ويوم الحدث مستبعد — بلا احتساب العطل.</p>
                  </div>
                </div>
              </figure>
              </Reveal>
            </div>

            {/* روابط سريعة للمحتوى */}
            <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { title: "الأرشيف", desc: "ملخصات S1-S6", icon: Library, color: "bg-[#b45309]", count: "S1-S6", href: "/archive" },
                { title: "القاموس", desc: "250 مصطلح", icon: Scale, color: "bg-[#2563eb]", count: `${counts.lexicon}`, numeric: counts.lexicon, href: "/lexicon" },
                { title: "المقالات", desc: `${articlesCount} مقال`, icon: BookOpen, color: "bg-[#10b981]", count: `${articlesCount}`, numeric: articlesCount, href: "/articles" },
                { title: "الأخبار", desc: "مستجدات تشريعية", icon: GraduationCap, color: "bg-[#b91c1c]", count: `${counts.news}`, numeric: counts.news, href: "/news" },
              ].map((card, i) => (
                <Reveal key={i} delay={i * 70} className="h-full">
                <Link to={card.href} className={`group flex h-full flex-col text-right overflow-hidden rounded-2xl bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] hover-lift`}>
                  <span className={`h-1 w-full ${card.color}`} aria-hidden="true" />
                  <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className={`grid size-9 place-items-center rounded-xl ${card.color} text-white`}>
                      <card.icon className="size-4" />
                    </div>
                    <span className="text-[10px] font-bold bg-[#f1f5f9] dark:bg-[#334155] border border-[#e2e8f0] dark:border-[#475569] rounded-full px-2 py-1">
                      {card.numeric ? <CountUp value={card.numeric} /> : card.count}
                    </span>
                  </div>
                  {/* h2 وليس h3: تسلسل العناوين كان h1 ← h3 (قفز مستوى) وهو
                      سبب فشل تدقيق heading-order. h2 يبقي الترتيب تنازلياً
                      متسلسلاً مع بقية أقسام الصفحة. */}
                  <h2 className="mt-3 font-black text-[12px] text-[#0f172a] dark:text-white group-hover:text-[#2563eb] transition-colors">{card.title}</h2>
                  <p className="mt-1 text-[11px] text-[#64748b] dark:text-[#94a3b8]">{card.desc}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[#2563eb]">
                    فتح القسم
                    <ArrowRight className="link-arrow size-3 rtl:rotate-180" aria-hidden="true" />
                  </span>
                  </div>
                </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden py-16 md:py-24 bg-[#f8fafc] dark:bg-[#0f172a] [content-visibility:auto] [contain-intrinsic-size:1000px]">
          <div className="container mx-auto max-w-[1200px] px-6">
            <div className="text-center mb-10 md:mb-14">
              {/* عنوان بصيغة سؤال (GEO: Question-Style Headings) — كان
                  «استكشف مساراتنا المميزة»؛ النصّ نفسه في الـ prerender. */}
              <SectionLabel step="٠١" tone="blue">المحتوى</SectionLabel>
              <h2 className="mt-3 text-[24px] md:text-[28px] font-black text-[#0f172a] dark:text-white">ماذا تقدم ميزان لطلبة الحقوق؟</h2>
              <p className="mt-3 text-[13px] text-[#64748b] max-w-[680px] mx-auto">كل ما يحتاجه طالب القانون المغربي في مكان واحد: القاموس، والملخصات، والمقالات، ودليل الكليات.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {[
                { title: "الأرشيف الدراسي", desc: "ملخصات S1 إلى S6", icon: Library, count: "S1-S6", tone: "bg-[#b45309]/10 text-[#b45309]", bar: "bg-[#b45309]", link: "ابدأ بالملخصات", href: "/archive" },
                { title: "القاموس القانوني", desc: "250 مصطلح عربي-فرنسي", icon: Scale, count: `${counts.lexicon}`, numeric: counts.lexicon, tone: "bg-[#2563eb]/10 text-[#2563eb]", bar: "bg-[#2563eb]", link: "ابحث عن مصطلح", href: "/lexicon" },
                { title: "المقالات القانونية", desc: `${articlesCount} مقال تحليلي`, icon: FileText, count: `${articlesCount}`, numeric: articlesCount, tone: "bg-[#10b981]/10 text-[#047857]", bar: "bg-[#10b981]", link: "اقرأ التحليلات", href: "/articles" },
                { title: "الأخبار", desc: "مستجدات تشريعية", icon: Video, count: `${counts.news}`, numeric: counts.news, tone: "bg-[#ef4444]/10 text-[#b91c1c]", bar: "bg-[#ef4444]", link: "تابع المستجدات", href: "/news" },
              ].map((card) => (
                <Link key={card.href} to={card.href} className="grad-card group relative flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] p-5 hover-lift">
                  <span className={`absolute inset-x-0 top-0 h-1 ${card.bar}`} aria-hidden="true" />
                  
                  <div className="flex items-center justify-between">
                    <div className={`grid size-11 place-items-center rounded-xl ${card.tone}`}>
                      <card.icon className="size-5" />
                    </div>
                  <span className="text-[10px] font-bold bg-[#f1f5f9] dark:bg-[#334155] border rounded-full px-2 py-1">
                    {card.numeric ? <CountUp value={card.numeric} /> : card.count}
                  </span>
                </div>
                <h3 className="mt-4 font-black text-[14px] text-[#0f172a] dark:text-white">{card.title}</h3>
                <p className="mt-1 text-[11px] text-[#64748b] dark:text-[#94a3b8]">{card.desc}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[#2563eb]">
                  {card.link}
                  <ArrowRight className="link-arrow size-3 rtl:rotate-180" aria-hidden="true" />
                </span>
              </Link>
              ))}
            </div>

            {/* أحدث المقالات — only with pictures */}
            <div className="mt-14 md:mt-16">
              <div className="flex items-center justify-between mb-6 md:mb-8">
                <h3 className="font-black text-[16px] text-[#0f172a] dark:text-white">أحدث المقالات</h3>
                <Link to="/articles" className="text-[12px] font-bold text-[#2563eb] hover:underline flex items-center gap-1">عرض الكل <ArrowRight className="size-3 rtl:rotate-180" /></Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {latestArticles.filter((a) => !!a.image).slice(0, 4).map((item) => (
                  <Link key={item.id} to={`/articles/${item.slug}`} className="group bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] rounded-2xl overflow-hidden hover:border-[#2563eb]/20 transition-colors flex flex-col">
                    <div className="zoom-frame h-[110px] sm:h-[120px] bg-[#f1f5f9] dark:bg-[#334155] relative shrink-0">
                      <img src={item.image!} alt={item.title} loading="lazy" decoding="async" className="w-full h-full object-cover" width={320} height={120} />
                      <span className="absolute top-2 right-2 bg-white/95 dark:bg-black/70 text-[9px] font-bold px-2 py-1 rounded-full border border-[#2563eb]/20 text-[#1d4ed8] dark:text-[#93c5fd]">{item.category || "قانون"}</span>
                    </div>
                    <div className="p-5 md:p-6 flex flex-col flex-1">
                      <h4 className="font-bold text-[14px] leading-snug line-clamp-2 text-[#0f172a] dark:text-white group-hover:text-[#2563eb] transition-colors">{item.title}</h4>
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

            {/* الفعاليات — only with pictures */}
            {latestEvents.length > 0 && (
              <div className="mt-14 md:mt-16">
                <div className="flex items-center justify-between mb-6 md:mb-8">
                  <h3 className="font-black text-[16px] text-[#0f172a] dark:text-white flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-full bg-[#b45309]/10 text-[#b45309]"><Calendar className="size-4" /></span>
                    الفعاليات والندوات
                  </h3>
                  <Link to="/events" className="text-[12px] font-bold text-[#2563eb] hover:underline flex items-center gap-1">عرض الكل <ArrowRight className="size-3 rtl:rotate-180" /></Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  {latestEvents.filter((e) => !!e.image).slice(0, 4).map((ev) => (
                    <Link key={ev.id} to={`/events/${ev.slug}`} className="group bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] rounded-2xl overflow-hidden hover:border-[#f59e0b]/30 transition-colors flex flex-col">
                      <div className="h-[130px] bg-[#f1f5f9] dark:bg-[#334155] overflow-hidden relative shrink-0">
                        <img src={ev.image!} alt={ev.title} loading="lazy" className="w-full h-full object-cover" width={320} height={130} />
                        <span className="absolute top-2 right-2 bg-[#b45309] text-white text-[9px] font-bold px-2.5 py-1 rounded-full">ندوة</span>
                        {ev.date && <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><Calendar className="size-3" />{new Date(ev.date).toLocaleDateString("ar-MA")}</span>}
                      </div>
                      <div className="p-5 md:p-6 flex flex-col flex-1">
                        <h4 className="font-bold text-[13.5px] leading-snug line-clamp-2 text-[#0f172a] dark:text-white group-hover:text-[#b45309] transition-colors">{ev.title}</h4>
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
              <div className="mt-14 md:mt-16">
                <div className="flex items-center justify-between mb-6 md:mb-8">
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
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#2563eb]/10 border border-[#2563eb]/20 px-2.5 py-1 font-bold text-[#2563eb]"><GitBranch className="size-3" /> شجرة قانونية: {latestTerms[0].legal_sources.length} مصادر - {latestTerms[0].legal_sources.reduce((acc: number, s: any) => acc + (s.articles?.length || 0), 0)} فصول</span>
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {latestTerms.slice(1, 7).map((term) => (
                    <Link key={term.id} to={`/lexicon/${generateSlug(term.term_ar)}`} className="group bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] rounded-2xl p-4 hover:border-[#2563eb]/20 transition-colors flex flex-col">
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
                          <span>{term.legal_sources.length} مصادر قانونية - {term.legal_sources.reduce((acc: number, s: any) => acc + (s.articles?.length || 0), 0)} فصول مرتبطة</span>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* كيف تبدأ — التزام وتتابع: ثلاث خطوات صغيرة يسهل قول «نعم» لها،
            وكل خطوة تفتح وجهتها مباشرة. ثم ثلاث حقائق تُزيل الاعتراضات. */}
        <section className="py-16 md:py-24 bg-white dark:bg-[#0f172a] border-y border-[#f1f5f9] dark:border-[#1e293b] [content-visibility:auto] [contain-intrinsic-size:900px]">
          <div className="container mx-auto max-w-[1200px] px-6">
            <div className="text-center mb-10 md:mb-14">
              <SectionLabel step="٠٢" tone="blue">كيف تبدأ</SectionLabel>
              <h2 className="mt-3 text-[24px] md:text-[28px] font-black text-[#0f172a] dark:text-white">ثلاث خطوات قبل الامتحان</h2>
              <p className="mt-3 text-[13px] text-[#64748b] dark:text-[#94a3b8] max-w-[680px] mx-auto">
                لا تحتاج حساباً ولا دفعاً: افتح، راجع، ثم اختبر نفسك.
              </p>
            </div>

            <ol className="grid gap-4 md:gap-6 md:grid-cols-3">
              {[
                { n: "١", title: "افتح فصلك الدراسي", desc: "أرشيف مرتّب من S1 إلى S6 حسب المسلك والفصل، وملخصات كل مادة.", to: "/archive", cta: "اذهب إلى الأرشيف", icon: FolderOpen, tone: "bg-[#b45309]/10 text-[#b45309]", bar: "bg-[#b45309]" },
                { n: "٢", title: "راجع المصطلحات", desc: "250 مصطلحاً قانونياً بالعربية والفرنسية مع التعريف والإحالة التشريعية.", to: "/lexicon", cta: "افتح القاموس", icon: BookOpen, tone: "bg-[#2563eb]/10 text-[#2563eb]", bar: "bg-[#2563eb]" },
                { n: "٣", title: "اختبر نفسك", desc: "أسئلة QCM مع شرح الإجابة الصحيحة وسندها، لتثبيت ما راجعته.", to: "/quiz", cta: "ابدأ اختباراً", icon: ListChecks, tone: "bg-[#047857]/10 text-[#047857]", bar: "bg-[#047857]" },
              ].map((step, i) => (
                <li key={i} className="h-full">
                  {/* الحركة داخل عنصر القائمة: بنية <ol> تبقى صحيحة دلالياً */}
                  <Reveal delay={i * 80} className="h-full">
                    <div className="grad-card relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-6 hover-lift">
                    <span className={`absolute inset-x-0 top-0 h-1 ${step.bar}`} aria-hidden="true" />
                    <div className="flex items-center gap-3">
                      <span className={`grid size-10 place-items-center rounded-xl ${step.tone}`} aria-hidden="true">
                        <step.icon className="size-5" />
                      </span>
                      <span className="text-[26px] font-black tabular-nums text-[#e2e8f0] dark:text-[#334155]">{step.n}</span>
                    </div>
                    <h3 className="mt-4 font-black text-[15px] text-[#0f172a] dark:text-white">{step.title}</h3>
                    <p className="mt-2 text-[12.5px] leading-6 text-[#64748b] dark:text-[#94a3b8] flex-1">{step.desc}</p>
                      <Link to={step.to} className="group mt-4 inline-flex items-center gap-1.5 text-[12px] font-black text-[#2563eb]">
                        {step.cta}
                        <ArrowRight className="link-arrow size-3.5 rtl:rotate-180" aria-hidden="true" />
                      </Link>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>

            <Reveal delay={240}>
              <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-[#e2e8f0] dark:border-[#334155] bg-[#e2e8f0] dark:bg-[#334155] sm:grid-cols-3">
                {[
                  { icon: MousePointerClick, title: "بلا حساب للقراءة", desc: "المعجم والأرشيف والمقالات مفتوحة للزائر مباشرة." },
                  { icon: BadgeCheck, title: "بلا إعلانات", desc: "لا شبكات إعلانية ولا نوافذ منبثقة ولا محتوى مدفوع بالضغط." },
                  { icon: Download, title: "ليست استشارة قانونية", desc: "محتوى تعليمي بإحالات إلى المصادر الرسمية، والنصّ النافذ يُراجع فيها." },
                ].map((item, i) => (
                  <div key={i} className="bg-[#f8fafc] dark:bg-[#0f172a] p-5">
                    <span className="grid size-9 place-items-center rounded-xl bg-white dark:bg-[#1e293b] text-[#2563eb]" aria-hidden="true">
                      <item.icon className="size-4" />
                    </span>
                    <h3 className="mt-3 font-black text-[13px] text-[#0f172a] dark:text-white">{item.title}</h3>
                    <p className="mt-1 text-[11.5px] leading-5 text-[#64748b] dark:text-[#94a3b8]">{item.desc}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* أدوات ميزان برو — عرض تعريفي: ما تفتحه الاشتراك فعلياً */}
        <section className="grad-band relative overflow-hidden py-14 md:py-20 bg-[#0f172a] dark:bg-[#0b1220] [content-visibility:auto] [contain-intrinsic-size:800px]">
          <div className="container mx-auto max-w-[1200px] px-6">
            <div className="text-center mb-10 md:mb-12">
              <SectionLabel step="٠٣" tone="gold">أدوات ميزان برو</SectionLabel>
              <h2 className="mt-3 text-[24px] md:text-[28px] font-black text-white">ستّ أدوات للمراجعة والتحرير القانوني</h2>
              <p className="mt-3 text-[13px] text-[#cbd5e1] max-w-[680px] mx-auto">
                أدوات عملية داخل المنصة: مقارنة النصوص، وتمارين الواقعة إلى الحل، وخريطة الإحالات، والتنبيهات، وحساب الآجال، وملف بحث خاص بك.
              </p>
            </div>

            <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "قانون عبر الزمن", desc: "قارن نسختين موثّقتين من النصّ نفسه، مع إبراز الفروق كلمة بكلمة.", icon: GitCompare, tone: "bg-[#3b82f6]/15 text-[#93c5fd]" },
                { title: "من الواقعة إلى الحل", desc: "تمارين على وقائع قانونية مع إجابات نموذجية مراجعة وعناصر تحليل.", icon: Scale, tone: "bg-[#10b981]/15 text-[#6ee7b7]" },
                { title: "خريطة الإحالات القانونية", desc: "تابع الروابط بين النصوص: الصادر منها والوارد إليها، حتى المصدر الرسمي.", icon: Link2, tone: "bg-[#f59e0b]/15 text-[#fcd34d]" },
                { title: "راقب النصّ", desc: "احفظ المواضيع التي تهمّك واطّلع على تحديثاتها المنشورة داخل المنصة.", icon: BellRing, tone: "bg-[#ef4444]/15 text-[#fca5a5]" },
                { title: "حاسبة الآجال المسطرية", desc: "حساب مساعد لقواعد الأيام التقويمية المراجعة فقط، وليس استشارة قانونية.", icon: CalendarClock, tone: "bg-[#14b8a6]/15 text-[#5eead4]" },
                { title: "ملف البحث القانوني", desc: "احفظ ملاحظاتك ومراجعك، وصدّر ملف بحثك للاستعمال في تحريرك.", icon: FolderOpen, tone: "bg-[#fb923c]/15 text-[#fdba74]" },
              ].map((tool, i) => (
                <Reveal key={i} delay={i * 60} className="bg-[#0f172a]/85 dark:bg-[#0b1220]/85">
                  <article className="group flex h-full flex-col p-5">
                    <span className={`grid size-10 place-items-center rounded-xl ${tool.tone}`} aria-hidden="true">
                      <tool.icon className="size-5" />
                    </span>
                    <h3 className="mt-4 font-black text-[14px] text-white">{tool.title}</h3>
                    <p className="mt-1.5 text-[12px] leading-6 text-[#cbd5e1]">{tool.desc}</p>
                  </article>
                </Reveal>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-[12px] font-bold">
              <Link to="/pro-tools" className="group inline-flex items-center gap-2 rounded-full bg-[#b45309] hover:bg-[#92400e] text-white px-6 py-2.5 transition-colors">
                تعرّف على الأدوات
                <ArrowRight className="link-arrow size-3.5 rtl:rotate-180" aria-hidden="true" />
              </Link>
              <Link to="/pricing" className="text-[#93c5fd] hover:underline">الأسعار</Link>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-white dark:bg-[#0f172a] border-y border-[#f1f5f9] dark:border-[#1e293b] [content-visibility:auto] [contain-intrinsic-size:1000px]">
          <div className="container relative mx-auto max-w-[1200px] px-6">
            <div className="text-center max-w-[680px] mx-auto">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#eff6ff] dark:bg-[#1e293b] border border-[#dbeafe] dark:border-[#334155] px-3 py-1 text-[11px] font-black text-[#2563eb] dark:text-[#60a5fa]">
                ٠٤ — الأسعار - خطط مرنة
              </span>
              <h2 className="mt-4 text-[26px] md:text-[32px] font-black leading-[1.15] text-[#0f172a] dark:text-white">
                خطط تناسب كل
                <span className="text-[#2563eb]"> طالب قانون</span>
              </h2>
              <p className="mt-3 text-[13px] leading-6 text-[#64748b] dark:text-[#94a3b8]">
                ميزان برو يمول المحتوى المجاني. كل اشتراك يدعم استمرار الأرشيف والاختبارات للجميع.
              </p>
            </div>

            <div className="mt-12 md:mt-14 grid md:grid-cols-3 gap-5 md:gap-6 max-w-[1060px] mx-auto items-start">
              <div className="rounded-2xl bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] p-6">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-[#f1f5f9] dark:bg-[#334155] text-[#475569] dark:text-white">
                    <BookOpen className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-[14px] text-[#0f172a] dark:text-white">المجاني</h3>
                    <p className="text-[11px] text-[#64748b]">للجميع - للأبد</p>
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

              <div className="rounded-2xl bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] p-6">
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

              <div className="rounded-2xl bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] p-6">
                <span className="inline-block mb-3 rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-bold text-foreground">الأفضل قيمة — خصم 32%</span>
                <div className="flex items-center gap-3 mt-1">
                  <div className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <Award className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-[14px] text-foreground">سنوي</h3>
                    <p className="text-[11px] text-muted-foreground">7000 + 1000 هدية</p>
                  </div>
                </div>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-[28px] font-black text-foreground">399</span>
                  <span className="text-[13px] font-bold text-muted-foreground"> د.م / سنة</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground font-bold">1000 كريدتس هدية + خصم 32%</p>
                <ul className="mt-5 space-y-2.5">
                  {[
                    "كل مزايا الشهري",
                    "خصم 32% عن الشهري",
                    "1000 كريدتس هدية",
                    "شهادة توصية",
                    "شارات حصرية",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[12px] text-foreground">
                      <span className="grid size-5 place-items-center rounded-full bg-muted"><ShieldCheck className="size-3" /></span>
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

        <section className="py-16 md:py-24 bg-[#f8fafc] dark:bg-[#0f172a]/50 border-y border-[#f1f5f9] dark:border-[#1e293b] [content-visibility:auto] [contain-intrinsic-size:600px]">
          <div className="container mx-auto max-w-[1200px] px-6">
            <div className="max-w-[1000px] mx-auto">
              <div className="text-center max-w-[680px] mx-auto mb-10 md:mb-14">
                <SectionLabel step="٠٥" tone="green">لماذا نحن</SectionLabel>
                {/* عنوان بصيغة سؤال (GEO: Question-Style Headings) — كان
                    «اكتشف المزايا المميزة لمنصتنا التعليمية القانونية». */}
                <h2 className="mt-4 text-[26px] md:text-[32px] font-black leading-[1.15] text-[#0f172a] dark:text-white">
                  لماذا تختار منصة ميزان الرقمية؟
                </h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
                {[
                  { title: "محتوى مرتّب بالفصول", desc: "ملخصات ودروس مرتّبة من S1 إلى S6 حسب المسلك والفصل، بلا تشتّت بين ملفات متفرقة.", icon: Library, color: "bg-[#2563eb]/10 text-[#2563eb]", bar: "bg-[#2563eb]" },
                  { title: "إحالة إلى المصادر الرسمية", desc: "النصوص القانونية والقواعد محالة إلى الجريدة الرسمية وبوابة العدالة الرقمية للتحقق.", icon: Scale, color: "bg-[#047857]/10 text-[#047857]", bar: "bg-[#047857]" },
                  { title: "قاموس عربي–فرنسي", desc: "250 مصطلحاً قانونياً بالتعريف والترجمة، مع بحث وتصنيف حسب الفروع.", icon: FileText, color: "bg-[#b45309]/10 text-[#b45309]", bar: "bg-[#b45309]" },
                  { title: "أدوات للمراجعة", desc: "اختبارات QCM لتقيس مستواك، وأدوات ميزان برو لتتبّع النصوص وحساب الآجال والتمارين.", icon: Clock, color: "bg-[#b91c1c]/10 text-[#b91c1c]", bar: "bg-[#b91c1c]" },
                ].map((feature, i) => (
                  <Reveal key={i} delay={i * 70} className="h-full">
                    <div className="relative h-full overflow-hidden rounded-2xl border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-5 hover-lift">
                      <span className={`absolute inset-x-0 top-0 h-1 ${feature.bar}`} aria-hidden="true" />
                      <div className={`size-10 grid place-items-center rounded-xl ${feature.color}`}>
                        <feature.icon className="size-5" />
                      </div>
                      <h3 className="mt-3 font-black text-[13px]">{feature.title}</h3>
                      <p className="mt-1 text-[11px] leading-5 text-[#64748b] dark:text-[#94a3b8]">{feature.desc}</p>
                    </div>
                  </Reveal>
                ))}
              </div>

              {/* مصادر رسمية مسمّاة (GEO: Citations & Quotations). روابط
                  خارجية صريحة بـ rel="noopener noreferrer" — النسب يُقرأ
                  فيُربط المحتوى التعليمي بمصدر التحقق، وهو نفسه المذكور في
                  نسخة prerender الثابتة فلا تختلف نسختا الصفحة. */}
              <div className="mt-8 rounded-2xl border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-4 sm:p-5">
                <p className="text-[12.5px] leading-6 text-[#475569] dark:text-[#94a3b8]">
                  جميع النصوص القانونية والقواعد المذكورة في منصة ميزان الرقمية محالة إلى مصادر رسمية يمكن التحقق منها مباشرة.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <a
                    href="https://www.sgg.gov.ma"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#e2e8f0] dark:border-[#334155] px-3.5 py-3 text-[12px] font-bold text-[#0f172a] dark:text-white hover:border-[#2563eb]/40 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Landmark className="size-4 text-[#2563eb]" aria-hidden="true" />
                      الجريدة الرسمية — الأمانة العامة للحكومة
                    </span>
                    <ExternalLink className="size-3.5 text-[#64748b]" aria-hidden="true" />
                  </a>
                  <a
                    href="https://adala.justice.gov.ma"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#e2e8f0] dark:border-[#334155] px-3.5 py-3 text-[12px] font-bold text-[#0f172a] dark:text-white hover:border-[#2563eb]/40 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Landmark className="size-4 text-[#2563eb]" aria-hidden="true" />
                      بوابة العدالة الرقمية — وزارة العدل
                    </span>
                    <ExternalLink className="size-3.5 text-[#64748b]" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grad-accent relative overflow-hidden py-12 md:py-16 bg-[#2563eb] dark:bg-[#1e40af] text-white">
          <div className="container mx-auto max-w-[1200px] px-6 relative">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-y-6 divide-y divide-white/15 md:divide-y-0 md:divide-x md:divide-x-reverse text-center">
              {[
                { value: `${counts.lexicon}`, label: "مصطلح قانوني" },
                { value: "S1-S6", label: "فصول دراسية" },
                { value: `${counts.articles}`, label: "مقال تحليلي" },
                { value: `${counts.schools}`, label: "كلية للحقوق" },
                { value: `${counts.docs}`, label: "ملف دراسي" },
              ].map((stat, i) => (
                <div key={i} className="px-2">
                  <div className="text-[26px] font-black tabular-nums">
                    {/^\d+$/.test(stat.value) ? <CountUp value={Number(stat.value)} /> : stat.value}
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-white/80">{stat.label}</div>
                </div>
              ))}
            </div>
            <p className="relative mt-8 text-center text-[11.5px] font-bold text-white/75">
              كل مصطلح في المعجم يحمل تاريخ مراجعة موثّقاً، وكل ملف دراسي يحمل تاريخ تحديث.
            </p>
          </div>
        </section>

        <Suspense fallback={null}>
          <HomeFaqSection lexiconCount={counts.lexicon} articlesCount={counts.articles} schoolsCount={counts.schools} />
        </Suspense>

        {/* الشريط الختامي: آخر ما يبقى في الذاكرة فعل واحد واضح مع تقليل المخاطرة */}
        <section className="grad-soft border-t border-[#e2e8f0] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#0f172a] py-16 md:py-24">
          <div className="container mx-auto max-w-[1200px] px-6 text-center">
            <h2 className="text-[24px] md:text-[30px] font-black leading-tight text-[#0f172a] dark:text-white">
              ابدأ من الفصل الذي تدرسه اليوم
            </h2>
            <p className="mt-3 text-[14px] leading-7 text-[#475569] dark:text-[#94a3b8] max-w-[680px] mx-auto">
              افتح الأرشيف، اختر الفصل والمادة، ثم اختبر نفسك. المحتوى الأساسي مجاني وبلا حساب.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link to="/archive" className="btn-accent inline-flex items-center gap-2 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-8 py-3.5 text-[15px] font-black transition-colors">
                تصفّح الأرشيف الدراسي
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
              <Link to="/quiz" className="text-[13px] font-bold text-[#2563eb] hover:underline">
                أو جرّب اختباراً سريعاً
              </Link>
            </div>
          </div>
        </section>

      </main>
    </>
  )
}
