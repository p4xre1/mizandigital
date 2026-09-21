import { useEffect, useRef, useState, lazy, Suspense, type CSSProperties } from "react"
import { Link } from "react-router-dom"
import { AEOHead } from "../../components/seo/AEOHead"
import { BASE_URL, canonicalHome } from "../../lib/canonical"
import counts from "../../data/counts.json"
import { diversifyByCategory } from "../../lib/utils/diversify"
import { CountUp, Reveal } from "../../components/ui/Reveal"
import { generateSlug } from "../../lib/utils/generateSlug"
import {
  BookOpen, Scale, GraduationCap, Award, Library, ShieldCheck, Clock, FileText, ArrowRight,
  Calendar, MapPin, Languages, GitBranch, Building2, Video, GitCompare, BellRing,
  BadgeCheck, ListChecks, MousePointerClick, Download, Newspaper, Briefcase, Gavel, PenLine,
  Landmark, ExternalLink, CalendarClock, FolderOpen, Link2, School,
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
  readingTime?: string | null
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
 * تعطي إيقاعاً بصرياً واضحاً للصفحة: الزائر يعرف دائماً في أي قسم هو.
 */
const TONES = {
  blue: { text: "text-[#2563eb]", rule: "bg-[#2563eb]", soft: "bg-[#2563eb]/10 text-[#2563eb]" },
  gold: { text: "text-[#b45309]", rule: "bg-[#b45309]", soft: "bg-[#b45309]/10 text-[#b45309]" },
  /* النبرة الذهبية الفاتحة للأسطح الكحلية فقط (تباين كافٍ على الكحلي). */
  goldLight: { text: "text-[#fcd34d]", rule: "bg-[#f59e0b]", soft: "bg-[#f59e0b]/15 text-[#fcd34d]" },
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

/* ── فصول المسار القانوني في كليات الحقوق والعلوم القانونية بالمغرب ───────── */
const SEMESTERS = ["S1", "S2", "S3", "S4", "S5", "S6"] as const

/*
 * مراحل الموسم الجامعي: وصف عام لسير الدوارات في الكليات المغربية، لا تقويم
 * رسمي. الأشهر بالصيغة المغربية (شتنبر، دجنبر، يوليوز…) والإشارة صريحة إلى أن
 * المرجع هو إعلان الكلية.
 */
const SEASON_PHASES = [
  {
    month: "شتنبر",
    title: "انطلاق الموسم الجامعي",
    desc: "التسجيل وتسلّم المقرّر وتحديد الوحدات والمدرّسين: هنا يُبنى جدول المراجعة الشخصي قبل أن تتراكم المحاضرات.",
    action: { label: "افتح أرشيف فصلك", href: "/archive" },
  },
  {
    month: "أكتوبر – دجنبر",
    title: "الدورة الخريفية",
    desc: "محاضرات وحصص تطبيقية، ومراقبة مستمرة تُبنى عليها نقطة الفصل الأول. المصطلح أول ما ينبغي ضبطه هنا.",
    action: { label: "اضبط المصطلحات", href: "/lexicon" },
  },
  {
    month: "يناير",
    title: "امتحانات الدورة الخريفية",
    desc: "الامتحان الدوري للفصل الأول، وبعده عطلة نصف السنة. المراجعة المركّزة تسبقه بأسابيع لا بأيام.",
    action: { label: "اختبر نفسك", href: "/quiz" },
  },
  {
    month: "فبراير – ماي",
    title: "الدورة الربيعية",
    desc: "وحدات الفصل الثاني، مع أشغال موجّهة وتمارين على النصوص والأحكام. التحليل المكتوب يبدأ من هنا.",
    action: { label: "تعلّم منهجية التحليل", href: "/articles" },
  },
  {
    month: "ماي – يونيو",
    title: "امتحانات الدورة الربيعية",
    desc: "الامتحان الدوري الثاني وإعلان النقط، وبه يتحدّد ما يحتاج استدراكاً في الصيف.",
    action: { label: "تابع المستجدات", href: "/news" },
  },
  {
    month: "يوليوز",
    title: "الدورة الاستدراكية",
    desc: "فرصة ثانية لإنقاذ الوحدات التي لم تُقبل فيها النقطة، بمراجعة أضيق وأعمق.",
    action: { label: "أعد ترتيب مراجعتك", href: "/archive" },
  },
]

/*
 * مسارات ومهن يفتحها مسار القانون في المغرب — وصف عام بلا أي رقم أو موعد:
 * الولوج يمرّ عبر مساطر ومباريات رسمية معلنة، والمرجع دائماً الإعلان الرسمي.
 */
const CAREER_PATHS = [
  { title: "القضاء والنيابة العامة", desc: "الهيئة القضائية وقضاة النيابة العامة، والولوج عبر مسالك التكوين والمباريات المعلنة.", icon: Gavel },
  { title: "المحاماة", desc: "الدفاع والتمثيل أمام المحاكم، في مسار مهني منظّم بالتربّص والشهادة.", icon: Scale },
  { title: "كتابة الضبط", desc: "أطر كتابة الضبط داخل المحاكم، ولوجها عبر مباريات رسمية.", icon: FileText },
  { title: "المهن القضائية المساعدة", desc: "المفوضون القضائيون ومهن مساعدة للعدالة، بمساطر ومعايير خاصة.", icon: Landmark },
  { title: "التوثيق", desc: "مهنة التوثيق، وولوجها عبر التكوين المتخصّص والمباريات.", icon: PenLine },
  { title: "الوظيفة العمومية والجماعات", desc: "مباريات القطاعات الحكومية والمؤسسات والجماعات الترابية.", icon: Building2 },
  { title: "الاستشارة القانونية بالمقاولات", desc: "مناصب قانونية داخل الشركات والبنوك: العقود، المطابقة، والنزاعات.", icon: Briefcase },
  { title: "البحث والتدريس الجامعي", desc: "الماستر والدكتوراه والبحث الأكاديمي في القانون.", icon: GraduationCap },
]

export function HomePage() {
  const [latestArticles, setLatestArticles] = useState<FeedCard[]>([])
  const [latestEvents, setLatestEvents] = useState<EventCard[]>([])
  const [latestTerms, setLatestTerms] = useState<LexiconCard[]>([])
  /* ── قياس التمرير: شريط تقدّم القراءة + تعبئة خطّ الزمن ──────────────────
   * حركة واحدة محسوبة من موضع التمرير، لا حلقة تكرار ولا نبض. تُلغى لمن يطلب
   * تقليل الحركة (يبقى الشريط كاملاً والخطّ معبّأً). */
  const [readProgress, setReadProgress] = useState(0)
  const [seasonProgress, setSeasonProgress] = useState(0)
  const seasonRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      setReadProgress(1)
      setSeasonProgress(1)
      return
    }
    let frame = 0
    const update = () => {
      frame = 0
      const doc = document.documentElement
      const scrollable = doc.scrollHeight - window.innerHeight
      setReadProgress(scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0)
      const node = seasonRef.current
      if (node) {
        const rect = node.getBoundingClientRect()
        const seen = window.innerHeight * 0.78 - rect.top
        const span = rect.height + window.innerHeight * 0.4
        setSeasonProgress(span > 0 ? Math.min(1, Math.max(0, seen / span)) : 0)
      }
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

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
            readingTime: item.readingTime,
          }))
        setLatestArticles(diversifyByCategory(localArticles, 8))

        const localEvents: EventCard[] = (eventsData as any[]).map((e) => ({
          id: e.id,
          slug: e.slug || e.id,
          title: e.title,
          excerpt: e.excerpt,
          city: e.city,
          date: e.eventDate || e.date,
          image: e.image,
          organizer: e.organizer,
        }))
        setLatestEvents(localEvents.slice(0, 3))

        const localTerms: LexiconCard[] = (lexiconData as any[]).slice(0, 7).map((t) => ({
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

        const localArticles: FeedCard[] = (articlesData as any[])
          .map((item) => ({
            id: item.id,
            slug: item.slug,
            title: item.title,
            summary: item.excerpt,
            category: item.category,
            date: item.publishedAt,
            image: item.coverImage || item.image,
            readingTime: item.readingTime,
          }))

        const combinedArticles = Array.from(new Map([...remoteArticles, ...localArticles].map((a) => [a.slug, a])).values())
        setLatestArticles(diversifyByCategory(combinedArticles, 8))

        // الندوات: دمج الندوات المنشورة مع الفعاليات المحلية (صورة اختيارية).
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

        const localEvents: EventCard[] = (eventsData as any[]).map((e) => ({
          id: e.id,
          slug: e.slug || e.id,
          title: e.title,
          excerpt: e.excerpt,
          city: e.city,
          date: e.eventDate,
          image: e.image,
          organizer: e.organizer,
        }))

        const combinedEvents = Array.from(new Map([...remoteSeminars, ...localEvents].map((e) => [e.id, e])).values())
        setLatestEvents(combinedEvents.slice(0, 3))

        // مصطلحات المعجم: البعيد أولاً ثم المحلي.
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
        setLatestTerms(combinedTerms.slice(0, 7))
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

  /* محتوى المسارات: كل رقم هنا مشتقّ من بيانات المنصة نفسها (counts.json). */
  const contentPaths: {
    title: string; desc: string; icon: typeof Library; count: string | number; numeric?: number;
    tone: string; bar: string; link: string; href: string;
  }[] = [
    { title: "الأرشيف الدراسي", desc: "ملفات مراجعة موزّعة على الفصول الدراسية، كل ملف بتاريخ تحديث.", icon: Library, count: "S1-S6", tone: TONES.gold.soft, bar: "bg-[#b45309]", link: "افتح الأرشيف", href: "/archive" },
    { title: "القاموس القانوني", desc: `${counts.lexiconBranches.length} فرعاً قانونياً بالمصطلح والتعريف والمقابل الفرنسي`, icon: Scale, count: counts.lexicon, numeric: counts.lexicon, tone: TONES.blue.soft, bar: "bg-[#2563eb]", link: "ابحث عن مصطلح", href: "/lexicon" },
    { title: "المقالات القانونية", desc: "منهجية المراجعة، وقراءة النص القانوني، وتحليل القرارات", icon: FileText, count: counts.articles, numeric: counts.articles, tone: "bg-[#10b981]/10 text-[#047857]", bar: "bg-[#10b981]", link: "اقرأ المقالات", href: "/articles" },
    { title: "المستجدات التشريعية", desc: "النصوص الجديدة والمساطر في طور التحديث، مع الإحالة إلى مصدرها", icon: Newspaper, count: counts.news, numeric: counts.news, tone: "bg-[#ef4444]/10 text-[#b91c1c]", bar: "bg-[#ef4444]", link: "تابع الأخبار", href: "/news" },
    { title: "الندوات والفعاليات", desc: "ملتقيات وندوات كليات الحقوق بمختلف المدن", icon: Video, count: counts.events, numeric: counts.events, tone: "bg-[#b45309]/10 text-[#b45309]", bar: "bg-[#b45309]", link: "أجندة الفعاليات", href: "/events" },
    { title: "دليل كليات الحقوق", desc: `${counts.schools} مؤسسة في ${counts.schoolCities} مدينة و${counts.schoolUniversities} جامعة`, icon: School, count: counts.schools, numeric: counts.schools, tone: TONES.blue.soft, bar: "bg-[#2563eb]", link: "تصفّح الدليل", href: "/schools" },
  ]

  /* خريطة الفصول: الوحدات المعروضة مشتقّة من ملفات الأرشيف المنشورة فعلاً. */
  const docsBySemester = new Map<string, string[]>(
    (counts.docsBySemester as { semester: string; modules: string[] }[]).map((entry) => [entry.semester, entry.modules]),
  )

  /* فروع المعجم: أعلى ثمانية فروع + مجموع ما تبقّى (لا رقم مكتوب بخط اليد). */
  const topBranches = (counts.lexiconBranches as { name: string; count: number }[]).slice(0, 8)
  const restBranches = (counts.lexiconBranches as { name: string; count: number }[]).slice(8)
  const restTerms = restBranches.reduce((sum, branch) => sum + branch.count, 0)
  const busiestBranch = topBranches[0]?.count ?? 1

  return (
    <>
      <AEOHead
        title="ميزان الرقمية – منصة طلبة الحقوق في المغرب"
        description="ميزان الرقمية منصة مغربية لطلبة القانون، محتواها الأساسي مجاني ومزاياها المتقدمة باشتراك ميزان برو: ملخصات S1-S6، قاموس قانوني 250 مصطلح عربي-فرنسي، دليل 21 كلية حقوق FSJES، مقالات، أخبار تشريعية واختبارات QCM."
        directAnswer="ميزان الرقمية: ملخصات الفصول S1-S6، وقاموس قانوني بالعربية والفرنسية، ودليل كليات الحقوق — والأساسي منها مجاني."
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
        {/* شريط تقدّم القراءة: يُقاس من التمرير، وليس حركة تلقائية. */}
        <div className="page-progress" style={{ "--p": readProgress } as CSSProperties} aria-hidden="true" />

        {/* ── ١. الرأس: الوعد + الإجابة المباشرة + الدليل + مثال حقيقي ─────── */}
        <section className="grad-hero relative overflow-hidden bg-[#0b1220] text-white">
          {/* خلفية تصويرية: مكتب قانوني ببلاط زليج مغربي (مشهد عام بلا أشخاص).
              الصورة زينة لا محتوى (alt فارغ)، وتُعتَّم بطبقتين حتى يبقى النصّ
              مقروءاً بتباين كافٍ في الوضعين، ولو تعذّر تحميلها فالأرضية كحلية. */}
          <img
            src="/images/hero-law.jpg"
            srcSet="/images/hero-law-900.jpg 900w, /images/hero-law.jpg 1376w"
            sizes="100vw"
            alt=""
            aria-hidden="true"
            width={1376}
            height={768}
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[#0b1220]/72" aria-hidden="true" />
          <div className="grad-photo-scrim absolute inset-x-0 bottom-0 h-40" aria-hidden="true" />
          <div className="container relative mx-auto max-w-[1200px] px-6 py-14 md:py-20">
            <div className="grid items-center gap-12 lg:gap-14 lg:grid-cols-[1.02fr_0.98fr]">

              {/* العمود النصّي */}
              <Reveal className="text-center lg:text-right">
                <p className="flex items-center justify-center gap-3 lg:justify-start">
                  <span className="h-px w-8 bg-white/35" aria-hidden="true" />
                  <span className="text-[12px] font-black tracking-[0.16em] text-[#93c5fd]">منصة القانون المغربي</span>
                  <span className="h-px w-8 bg-white/35 lg:hidden" aria-hidden="true" />
                </p>

                <h1 className="mt-4 text-[34px] md:text-[48px] font-black leading-[1.08] tracking-[-0.03em] text-white">
                  القانون المغربي لطلبة الحقوق
                </h1>

                {/* مسطرة تأكيد أسفل العنوان: قطعة سميكة + خطّ رفيع يمتدّ. */}
                <div className="mt-5 flex items-center justify-center gap-2 lg:justify-start" aria-hidden="true">
                  <span className="h-1 w-14 rounded-full bg-[#3b82f6]" />
                  <span className="h-px w-full max-w-[220px] bg-white/25" />
                </div>

                {/* الإجابة المباشرة أول ما يقرأه الزاحف التوليدي بعد H1 (GEO:
                    Answer-First). الصنف `lead` هو نفسه الذي تستهدفه
                    SpeakableSpecification في AEOHead، فيُقرأ النصّ صوتياً أيضاً. */}
                <p className="lead mt-6 border-s-2 border-[#3b82f6] ps-4 text-[16px] md:text-[17px] font-bold leading-8 text-[#e2e8f0]">
                  ميزان الرقمية: ملخصات الفصول S1-S6، وقاموس قانوني بالعربية والفرنسية، ودليل كليات الحقوق — والأساسي منها مجاني.
                </p>

                <div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                  {/* زرّ أساسي واحد فقط للفعل الأهمّ (المراجعة قبل الامتحان).
                      الزرّ الثانوي إطار بلا تعبئة (Von Restorff). */}
                  <Link to="/archive" className="btn-accent inline-flex items-center gap-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-7 py-3.5 text-[15px] font-black transition-colors">
                    ابدأ المراجعة — مجاناً
                    <span className="grid size-5 place-items-center rounded-md bg-white/20 text-[12px]" aria-hidden="true">←</span>
                  </Link>
                  <Link to="/quiz" className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3.5 text-[14px] font-bold text-white hover:bg-white/[0.18] transition-colors">
                    قِس مستواك في ٣ دقائق
                    <span className="grid size-5 place-items-center rounded-md bg-white/20 text-[12px]" aria-hidden="true">←</span>
                  </Link>
                </div>

                {/* دليل ثقة: ثلاث حقائق قابلة للتحقّق (لا أرقام مُختلقة) */}
                <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-[12px] font-bold text-[#cbd5e1] lg:justify-start">
                  <li className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-[#93c5fd]" aria-hidden="true" />محتوى أساسي مجاني</li>
                  <li aria-hidden="true" className="hidden h-4 w-px bg-white/20 lg:block" />
                  <li className="flex items-center gap-1.5"><BadgeCheck className="size-4 text-[#93c5fd]" aria-hidden="true" />بلا إعلانات</li>
                  <li aria-hidden="true" className="hidden h-4 w-px bg-white/20 lg:block" />
                  <li className="flex items-center gap-1.5"><Landmark className="size-4 text-[#93c5fd]" aria-hidden="true" />مصادر رسمية</li>
                </ul>
              </Reveal>

              {/* لوحة المعاينة: محتوى حقيقي من المنصة (مصطلح + سلسلة إحالة + حاسبة) */}
              <Reveal delay={140}>
              <figure aria-label="معاينة من المنصة" className="grad-card overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-2xl ring-1 ring-white/20 dark:border-[#334155] dark:bg-[#1e293b]">
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
                        <span className="block h-4 w-32 rounded bg-[#f1f5f9] dark:bg-[#334155]" />
                        <span className="block h-3 w-full rounded bg-[#f1f5f9] dark:bg-[#334155]" />
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
                        <span className="mt-1 block text-[12px] font-black tabular-nums text-[#2563eb]">2026-02-24</span>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-[#64748b] dark:text-[#94a3b8]">أيام تقويمية، ويوم الحدث مستبعد — بلا احتساب العطل.</p>
                  </div>
                </div>
              </figure>
              </Reveal>
            </div>

            {/* شريط تنقّل سريع: أربعة مداخل بحجم سطر واحد، الأرشيف أولاً
                لأنه المدخل الأعلى نيّة لدى الطالب قبل الامتحان. */}
            <nav aria-label="مداخل المحتوى" className="mt-12 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {[
                { title: "الأرشيف", desc: "ملخصات الفصول", icon: Library, color: "bg-[#b45309]", href: "/archive" },
                { title: "القاموس", desc: `${counts.lexicon} مصطلح قانوني`, icon: Scale, color: "bg-[#2563eb]", href: "/lexicon" },
                { title: "المقالات", desc: "تحليلات ودراسات", icon: BookOpen, color: "bg-[#047857]", href: "/articles" },
                { title: "الأخبار", desc: "مستجدات تشريعية", icon: Newspaper, color: "bg-[#b91c1c]", href: "/news" },
              ].map((card, i) => (
                <Reveal key={i} delay={i * 60}>
                  <Link to={card.href} className="group hover-lift flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-3.5 py-3 hover:bg-white/[0.16]">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${card.color} text-white`} aria-hidden="true">
                      <card.icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-black text-white transition-colors group-hover:text-[#93c5fd]">{card.title}</span>
                      <span className="block truncate text-[11px] text-[#cbd5e1]">{card.desc}</span>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </nav>
          </div>
        </section>

        {/* ── ٢. شريط الأرقام: إثبات مبكر مبني على البيانات نفسها ───────────── */}
        <section className="grad-accent relative overflow-hidden py-12 md:py-14 bg-[#2563eb] dark:bg-[#1e40af] text-white">
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
                  <div className="text-[28px] md:text-[34px] font-black leading-none tabular-nums">
                    {/^\d+$/.test(stat.value) ? <CountUp value={Number(stat.value)} /> : stat.value}
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-white/80">{stat.label}</div>
                </div>
              ))}
            </div>
            <p className="relative mt-7 text-center text-[11.5px] font-bold text-white/75">
              كل مصطلح في المعجم يحمل تاريخ مراجعة موثّقاً، وكل ملف دراسي يحمل تاريخ تحديث.
            </p>
          </div>
        </section>

        {/* ── ٠١. المحتوى: مسارات المنصة الستّة ─────────────────────────────── */}
        <section className="relative overflow-hidden py-16 md:py-24 bg-[#f8fafc] dark:bg-[#0f172a] [content-visibility:auto] [contain-intrinsic-size:1200px]">
          <div className="container mx-auto max-w-[1200px] px-6">
            <div className="mb-10 md:mb-14 text-center">
              {/* عنوان بصيغة سؤال (GEO: Question-Style Headings) */}
              <SectionLabel step="٠١" tone="blue">المحتوى</SectionLabel>
              <h2 className="mt-3 text-[26px] md:text-[34px] font-black leading-[1.15] text-[#0f172a] dark:text-white">ماذا تقدم ميزان لطلبة الحقوق؟</h2>
              <p className="mt-3 text-[13px] text-[#64748b] dark:text-[#94a3b8] max-w-[680px] mx-auto">
                ستّة مداخل تغطّي ما يحتاجه طالب القانون المغربي في موسمه الدراسي: الأرشيف، والمعجم، والمقالات، والأخبار، والندوات، ودليل الكليات.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {contentPaths.map((card, i) => (
                <Reveal key={card.href} delay={i * 60} className="h-full">
                  <Link to={card.href} className="grad-card group relative flex h-full flex-col overflow-hidden rounded-xl border border-[#e2e8f0] bg-white p-5 hover-lift dark:border-[#334155] dark:bg-[#1e293b]">
                    <span className={`absolute inset-x-0 top-0 h-1 ${card.bar}`} aria-hidden="true" />
                    <div className="flex items-start justify-between gap-3">
                      <span className={`grid size-11 place-items-center rounded-xl ${card.tone}`} aria-hidden="true">
                        <card.icon className="size-5" />
                      </span>
                      <span className="text-[30px] font-black leading-none tabular-nums text-[#0f172a] dark:text-white">
                        {card.numeric ? <CountUp value={card.numeric} /> : card.count}
                      </span>
                    </div>
                    <h3 className="mt-4 font-black text-[15px] text-[#0f172a] dark:text-white">{card.title}</h3>
                    <p className="mt-1.5 flex-1 text-[12px] leading-6 text-[#64748b] dark:text-[#94a3b8]">{card.desc}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-[11.5px] font-black text-[#2563eb]">
                      {card.link}
                      <ArrowRight className="link-arrow size-3 rtl:rotate-180" aria-hidden="true" />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── ٠٢. خريطة الفصول: أين يقف الطالب في مساره؟ ───────────────────── */}
        <section className="grad-soft relative overflow-hidden border-y border-[#f1f5f9] dark:border-[#1e293b] bg-white dark:bg-[#0f172a] py-16 md:py-24 [content-visibility:auto] [contain-intrinsic-size:1100px]">
          <div className="container mx-auto max-w-[1200px] px-6">
            <div className="mb-10 text-center md:mb-14">
              <SectionLabel step="٠٢" tone="gold">الأرشيف الدراسي</SectionLabel>
              <h2 className="mt-3 text-[26px] md:text-[34px] font-black leading-[1.15] text-[#0f172a] dark:text-white">ماذا يجد الطالب في كل فصل دراسي؟</h2>
              <p className="mt-3 text-[13px] text-[#64748b] dark:text-[#94a3b8] max-w-[680px] mx-auto">
                الأرشيف مرتّب حسب الفصل الدراسي لا حسب الموضوع، ويُحدَّث مع كل ملف جديد: اليوم {counts.docs} ملفات مراجعة موزّعة على الفصول، وكل ملف يحمل تاريخ تحديثه.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {SEMESTERS.map((semester, i) => {
                const modules = docsBySemester.get(semester) ?? []
                const ready = modules.length > 0
                return (
                  <Reveal key={semester} delay={i * 60} className="h-full">
                    <article className={`flex h-full flex-col rounded-xl border bg-white p-5 dark:bg-[#1e293b] ${ready ? "border-[#e2e8f0] dark:border-[#334155]" : "border-dashed border-[#e2e8f0] dark:border-[#334155]"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className={`text-[22px] font-black leading-none tabular-nums ${ready ? "text-[#0f172a] dark:text-white" : "text-[#64748b] dark:text-[#94a3b8]"}`}>{semester}</span>
                        <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${ready ? "bg-[#b45309]/10 text-[#b45309]" : "bg-[#f1f5f9] text-[#64748b] dark:bg-[#334155] dark:text-[#94a3b8]"}`}>
                          {ready ? `${modules.length} ملف مراجعة` : "قيد الإعداد"}
                        </span>
                      </div>

                      {ready ? (
                        <ul className="mt-4 flex-1 space-y-2">
                          {modules.map((module) => (
                            <li key={module} className="flex items-start gap-2 text-[12px] leading-6 text-[#475569] dark:text-[#cbd5e1]">
                              <FileText className="mt-1 size-3.5 shrink-0 text-[#b45309]" aria-hidden="true" />
                              {module}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-4 flex-1 text-[12px] leading-6 text-[#64748b] dark:text-[#94a3b8]">
                          لم تُنشر ملفات هذا الفصل بعد. نُشر الملف عندما يكتمل مراجعته، بلا مواعيد وهمية.
                        </p>
                      )}

                      <Link to={ready ? `/${semester.toLowerCase()}` : "/archive"} className="group mt-4 inline-flex items-center gap-1.5 text-[12px] font-black text-[#2563eb]">
                        {ready ? `افتح ملفات ${semester}` : "تصفّح الأرشيف الحالي"}
                        <ArrowRight className="link-arrow size-3.5 rtl:rotate-180" aria-hidden="true" />
                      </Link>
                    </article>
                  </Reveal>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── ٠٣. الموسم الجامعي في المغرب: خطّ زمني يتحرّك مع التمرير ──────── */}
        <section className="relative overflow-hidden py-16 md:py-24 bg-[#f8fafc] dark:bg-[#0f172a] [content-visibility:auto] [contain-intrinsic-size:1200px]">
          <div className="container mx-auto max-w-[1200px] px-6">
            <div className="mb-10 text-center md:mb-14">
              <SectionLabel step="٠٣" tone="blue">الموسم الجامعي</SectionLabel>
              <h2 className="mt-3 text-[26px] md:text-[34px] font-black leading-[1.15] text-[#0f172a] dark:text-white">كيف يتوزّع الموسم الجامعي في المغرب؟</h2>
              <p className="mt-3 text-[13px] text-[#64748b] dark:text-[#94a3b8] max-w-[680px] mx-auto">
                ستّ مراحل من شتنبر إلى يوليوز: تعرف فيها ما يُنتظر منك، وما تراجعه، ومتى يبدأ الاستدراك.
              </p>
            </div>

            <div className="relative mx-auto max-w-[1000px]" ref={seasonRef}>
              <span className="grad-timeline absolute inset-y-0 start-[6px] w-0.5 rounded-full" aria-hidden="true" />
              <span className="timeline-fill absolute inset-y-0 start-[6px] w-0.5 rounded-full bg-[#2563eb]" style={{ "--tp": seasonProgress } as CSSProperties} aria-hidden="true" />
              <ol className="space-y-8">
                {SEASON_PHASES.map((phase, i) => (
                  <li key={phase.title} className="relative ps-10">
                    <span className="absolute start-0 top-1.5 grid size-3.5 place-items-center rounded-sm border-2 border-[#2563eb] bg-white dark:bg-[#0f172a]" aria-hidden="true" />
                    <Reveal delay={i * 80}>
                      <p className="text-[11px] font-black tracking-[0.12em] text-[#2563eb]">{phase.month}</p>
                      <h3 className="mt-1 text-[15px] font-black text-[#0f172a] dark:text-white">{phase.title}</h3>
                      <p className="mt-1.5 max-w-[680px] text-[12.5px] leading-6 text-[#64748b] dark:text-[#94a3b8]">{phase.desc}</p>
                      <Link to={phase.action.href} className="group mt-2 inline-flex items-center gap-1.5 text-[12px] font-black text-[#2563eb]">
                        {phase.action.label}
                        <ArrowRight className="link-arrow size-3.5 rtl:rotate-180" aria-hidden="true" />
                      </Link>
                    </Reveal>
                  </li>
                ))}
              </ol>
            </div>

            <p className="mx-auto mt-10 max-w-[680px] text-center text-[11.5px] leading-6 text-[#64748b] dark:text-[#94a3b8]">
              هذه صورة عامة لسير الدوارات في الكليات المغربية، وتختلف التواريخ من كلية إلى أخرى ومن سنة إلى أخرى؛ المرجع دائماً الإعلان الرسمي لكليتك.
            </p>
          </div>
        </section>

        {/* ── ٠٤. أحدث ما نُشر: مقالات وندوات ومعجم بأحجام حقيقية ───────────── */}
        <section className="grad-soft relative overflow-hidden border-y border-[#f1f5f9] dark:border-[#1e293b] bg-white dark:bg-[#0f172a] py-16 md:py-24 [content-visibility:auto] [contain-intrinsic-size:1800px]">
          <div className="container mx-auto max-w-[1200px] px-6">
            <div className="mb-10 text-center md:mb-14">
              <SectionLabel step="٠٤" tone="gold">أحدث ما نُشر</SectionLabel>
              <h2 className="mt-3 text-[26px] md:text-[34px] font-black leading-[1.15] text-[#0f172a] dark:text-white">آخر ما أُضيف إلى المنصة</h2>
              <p className="mt-3 text-[13px] text-[#64748b] dark:text-[#94a3b8] max-w-[680px] mx-auto">
                مقالات في المنهجية والتحليل القانوني، وندوات كليات الحقوق، ومصطلحات من المعجم — كلها منشورة فعلاً بتاريخها.
              </p>
            </div>

            {/* أحدث المقالات: بطاقات نصّية (لا صور فائضة) */}
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h3 className="flex items-center gap-2 text-[16px] font-black text-[#0f172a] dark:text-white">
                <span className="grid size-7 place-items-center rounded-lg bg-[#047857]/10 text-[#047857]" aria-hidden="true"><FileText className="size-4" /></span>
                أحدث المقالات
              </h3>
              <Link to="/articles" className="group inline-flex items-center gap-1 text-[12px] font-bold text-[#2563eb]">
                كل المقالات
                <ArrowRight className="link-arrow size-3 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
              {latestArticles.slice(0, 8).map((item, i) => (
                <Reveal key={item.id} delay={i * 50} className="h-full">
                  <Link to={`/articles/${item.slug}`} className="group hover-lift flex h-full flex-col rounded-xl border border-[#e2e8f0] bg-white p-4 dark:border-[#334155] dark:bg-[#1e293b]">
                    <span className="text-[10.5px] font-black text-[#047857]">{item.category || "قانون"}</span>
                    <h3 className="mt-2 text-[14px] font-black leading-7 text-[#0f172a] transition-colors group-hover:text-[#2563eb] dark:text-white line-clamp-2">{item.title}</h3>
                    <p className="mt-1.5 flex-1 text-[11.5px] leading-6 text-[#64748b] dark:text-[#94a3b8] line-clamp-3">{item.summary}</p>
                    <span className="mt-3 flex items-center justify-between border-t border-[#f1f5f9] pt-3 text-[10px] font-bold text-[#64748b] dark:border-[#334155] dark:text-[#94a3b8]">
                      <span className="tabular-nums">{item.date}</span>
                      <span className="flex items-center gap-1"><Clock className="size-3" aria-hidden="true" />{item.readingTime || "قراءة"}</span>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>

            {/* الندوات والفعاليات */}
            {latestEvents.length > 0 && (
              <>
                <div className="mt-14 flex items-center justify-between mb-6 md:mb-8">
                  <h3 className="flex items-center gap-2 text-[16px] font-black text-[#0f172a] dark:text-white">
                    <span className="grid size-7 place-items-center rounded-lg bg-[#b45309]/10 text-[#b45309]" aria-hidden="true"><Calendar className="size-4" /></span>
                    الفعاليات والندوات
                  </h3>
                  <Link to="/events" className="group inline-flex items-center gap-1 text-[12px] font-bold text-[#2563eb]">
                    كل الفعاليات
                    <ArrowRight className="link-arrow size-3 rtl:rotate-180" aria-hidden="true" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                  {latestEvents.slice(0, 3).map((ev, i) => (
                    <Reveal key={ev.id} delay={i * 60} className="h-full">
                      <Link to={`/events/${ev.slug}`} className="group hover-lift flex h-full flex-col overflow-hidden rounded-xl border border-[#e2e8f0] bg-white dark:border-[#334155] dark:bg-[#1e293b]">
                        {ev.image ? (
                          <div className="zoom-frame relative h-[168px] shrink-0 bg-[#f1f5f9] dark:bg-[#334155]">
                            <img src={ev.image} alt={ev.title} loading="lazy" decoding="async" className="h-full w-full object-cover" width={320} height={168} />
                            <span className="absolute top-2 right-2 rounded-md bg-[#b45309] px-2.5 py-1 text-[9px] font-bold text-white">ندوة</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 border-b border-[#f1f5f9] bg-[#f8fafc] px-4 py-3 text-[11px] font-bold text-[#b45309] dark:border-[#334155] dark:bg-[#0f172a]">
                            <Calendar className="size-3.5" aria-hidden="true" />
                            <span className="tabular-nums">{ev.date}</span>
                            {ev.city && <><span aria-hidden="true">—</span><MapPin className="size-3.5" aria-hidden="true" />{ev.city}</>}
                          </div>
                        )}
                        <div className="flex flex-1 flex-col p-4">
                          <h3 className="text-[13.5px] font-black leading-6 text-[#0f172a] transition-colors group-hover:text-[#b45309] dark:text-white line-clamp-2">{ev.title}</h3>
                          <p className="mt-2 flex-1 text-[11.5px] leading-6 text-[#64748b] dark:text-[#94a3b8] line-clamp-3">{ev.excerpt}</p>
                          <span className="mt-3 flex flex-wrap items-center gap-3 border-t border-[#f1f5f9] pt-3 text-[10px] text-[#64748b] dark:border-[#334155] dark:text-[#94a3b8]">
                            {ev.date && <span className="flex items-center gap-1 tabular-nums"><Calendar className="size-3" aria-hidden="true" />{ev.date}</span>}
                            {ev.city && <span className="flex items-center gap-1"><MapPin className="size-3" aria-hidden="true" />{ev.city}</span>}
                            {ev.organizer && <span className="flex items-center gap-1 truncate"><Building2 className="size-3" aria-hidden="true" />{ev.organizer.slice(0, 22)}</span>}
                          </span>
                        </div>
                      </Link>
                    </Reveal>
                  ))}
                </div>
              </>
            )}

            {/* المعجم: بطاقة مصطلح بارزة مع شجرته، ثم مصطلحات مختارة */}
            {latestTerms.length > 0 && (
              <>
                <div className="mt-14 flex items-center justify-between mb-6 md:mb-8">
                  <h3 className="flex items-center gap-2 text-[16px] font-black text-[#0f172a] dark:text-white">
                    <span className="grid size-7 place-items-center rounded-lg bg-[#2563eb]/10 text-[#2563eb]" aria-hidden="true"><Languages className="size-4" /></span>
                    من المعجم — مع الشجرة القانونية
                  </h3>
                  <Link to="/lexicon" className="group inline-flex items-center gap-1 text-[12px] font-bold text-[#2563eb]">
                    كل المصطلحات
                    <ArrowRight className="link-arrow size-3 rtl:rotate-180" aria-hidden="true" />
                  </Link>
                </div>

                {latestTerms[0]?.legal_sources && latestTerms[0].legal_sources.length > 0 && (
                  <div className="grad-card mb-6 overflow-hidden rounded-xl border border-[#e2e8f0] bg-white p-4 dark:border-[#334155] dark:bg-[#1e293b] md:p-5">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="grid size-8 place-items-center rounded-xl bg-[#2563eb] text-white" aria-hidden="true"><Scale className="size-4" /></span>
                          <h3 className="text-[16px] font-black text-[#0f172a] dark:text-white">{latestTerms[0].term_ar}</h3>
                          {latestTerms[0].term_fr && <span className="font-mono text-[11px] text-[#64748b] dark:text-[#94a3b8]">({latestTerms[0].term_fr})</span>}
                        </div>
                        <p className="mt-2 max-w-2xl text-[12.5px] leading-6 text-[#475569] dark:text-[#94a3b8]">{latestTerms[0].definition}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#2563eb]/20 bg-[#2563eb]/10 px-2.5 py-1 font-bold text-[#2563eb]">
                            <GitBranch className="size-3" aria-hidden="true" /> شجرة قانونية: {latestTerms[0].legal_sources.length} مصادر - {latestTerms[0].legal_sources.reduce((acc: number, s: any) => acc + (s.articles?.length || 0), 0)} فصول
                          </span>
                          <span className="rounded-md bg-[#f1f5f9] px-2.5 py-1 text-[10px] font-bold text-[#475569] dark:bg-[#334155] dark:text-[#cbd5e1]">{latestTerms[0].category}</span>
                        </div>
                      </div>
                      <Link to={`/lexicon/${generateSlug(latestTerms[0].term_ar)}`} className="shrink-0 rounded-md bg-[#2563eb] px-4 py-2 text-[11px] font-bold text-white hover:bg-[#1d4ed8]">
                        التفاصيل ←
                      </Link>
                    </div>
                    <Suspense fallback={<div className="grid h-20 place-items-center text-[12px] text-[#64748b] dark:text-[#94a3b8]">جارٍ تحميل الشجرة...</div>}>
                      <LegalTermTree termAr={latestTerms[0].term_ar} termFr={latestTerms[0].term_fr} legalSources={latestTerms[0].legal_sources} />
                    </Suspense>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                  {latestTerms.slice(1, 7).map((term, i) => (
                    <Reveal key={term.id} delay={i * 50} className="h-full">
                      <Link to={`/lexicon/${generateSlug(term.term_ar)}`} className="group hover-lift flex h-full flex-col rounded-xl border border-[#e2e8f0] bg-white p-4 dark:border-[#334155] dark:bg-[#1e293b]">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="grid size-8 place-items-center rounded-xl bg-[#eff6ff] text-[#2563eb] transition-colors group-hover:bg-[#2563eb] group-hover:text-white dark:bg-[#1e3a5f]" aria-hidden="true"><GitBranch className="size-4" /></span>
                            <span>
                              <span className="block text-[13px] font-bold text-[#0f172a] transition-colors group-hover:text-[#2563eb] dark:text-white">{term.term_ar}</span>
                              {term.term_fr && <span className="block font-mono text-[10px] text-[#64748b] dark:text-[#94a3b8]">{term.term_fr}</span>}
                            </span>
                          </div>
                          <span className="shrink-0 rounded-md border border-[#e2e8f0] bg-[#f1f5f9] px-2 py-1 text-[9px] font-bold text-[#475569] dark:border-[#334155] dark:bg-[#334155] dark:text-[#cbd5e1]">{term.category}</span>
                        </div>
                        <p className="mt-3 flex-1 text-[11.5px] leading-5 text-[#64748b] dark:text-[#94a3b8] line-clamp-3">{term.definition}</p>
                        {term.legal_sources && term.legal_sources.length > 0 && (
                          <span className="mt-3 flex items-center gap-1.5 border-t border-[#f1f5f9] pt-3 text-[10px] font-bold text-[#2563eb] dark:border-[#334155]">
                            <GitBranch className="size-3" aria-hidden="true" />
                            <span>{term.legal_sources.length} مصادر قانونية - {term.legal_sources.reduce((acc: number, s: any) => acc + (s.articles?.length || 0), 0)} فصول مرتبطة</span>
                          </span>
                        )}
                      </Link>
                    </Reveal>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── ٠٥. كيف تبدأ — التزام وتتابع: ثلاث خطوات صغيرة يسهل قول «نعم» لها ── */}
        <section className="relative overflow-hidden py-16 md:py-24 bg-[#f8fafc] dark:bg-[#0f172a] [content-visibility:auto] [contain-intrinsic-size:900px]">
          <div className="container mx-auto max-w-[1200px] px-6">
            <div className="mb-10 text-center md:mb-14">
              <SectionLabel step="٠٥" tone="blue">كيف تبدأ</SectionLabel>
              <h2 className="mt-3 text-[26px] md:text-[34px] font-black leading-[1.15] text-[#0f172a] dark:text-white">ثلاث خطوات قبل الامتحان</h2>
              <p className="mt-3 text-[13px] text-[#64748b] dark:text-[#94a3b8] max-w-[680px] mx-auto">
                بلا تسجيل وبلا إعداد: افتح، راجع، ثم اختبر نفسك. الخطوات الثلاث تعمل من الهاتف ومن الحاسوب.
              </p>
            </div>

            <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {[
                { n: "01", title: "افتح فصلك الدراسي", desc: "اختر الفصل الدراسي والمادة، ثم حمّل ملف المراجعة المناسب.", icon: Library, to: "/archive", cta: "تصفّح الأرشيف", tone: `${TONES.gold.soft}` },
                { n: "02", title: "راجع المصطلحات", desc: "اضبط المصطلح بالعربية وبمقابله الفرنسي، ومنه إلى نصّه القانوني.", icon: Languages, to: "/lexicon", cta: "افتح القاموس", tone: `${TONES.blue.soft}` },
                { n: "03", title: "اختبر نفسك", desc: "أسئلة اختيار من متعدّد مع شرح الجواب الصحيح لقياس استعدادك.", icon: ListChecks, to: "/quiz", cta: "ابدأ اختباراً", tone: `${TONES.green.soft}` },
              ].map((step, i) => (
                <li key={step.n}>
                  {/* الحركة داخل عنصر القائمة: بنية <ol> تبقى صحيحة دلالياً */}
                  <Reveal delay={i * 80} className="h-full">
                    <div className="grad-card relative flex h-full flex-col overflow-hidden rounded-xl border border-[#e2e8f0] bg-white p-6 hover-lift dark:border-[#334155] dark:bg-[#1e293b]">
                      <div className="flex items-start justify-between gap-3">
                        <span className={`grid size-10 place-items-center rounded-xl ${step.tone}`} aria-hidden="true">
                          <step.icon className="size-5" />
                        </span>
                        <span className="text-[34px] font-black leading-none tabular-nums text-[#e2e8f0] dark:text-[#334155]">{step.n}</span>
                      </div>
                      <h3 className="mt-4 text-[15px] font-black text-[#0f172a] dark:text-white">{step.title}</h3>
                      <p className="mt-2 flex-1 text-[12.5px] leading-6 text-[#64748b] dark:text-[#94a3b8]">{step.desc}</p>
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
              <div className="mt-12 grid gap-8 border-t border-[#e2e8f0] pt-10 dark:border-[#334155] sm:grid-cols-3">
                {[
                  { icon: MousePointerClick, title: "بلا حساب للقراءة", desc: "المعجم والأرشيف والمقالات مفتوحة للزائر مباشرة." },
                  { icon: BadgeCheck, title: "بلا إعلانات", desc: "لا شبكات إعلانية ولا نوافذ منبثقة ولا محتوى مدفوع بالضغط." },
                  { icon: Download, title: "ليست استشارة قانونية", desc: "محتوى تعليمي بإحالات إلى المصادر الرسمية، والنصّ النافذ يُراجع فيها." },
                ].map((item, i) => (
                  <div key={i}>
                    <span className="grid size-9 place-items-center rounded-lg bg-[#f1f5f9] text-[#2563eb] dark:bg-[#334155]" aria-hidden="true">
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

        {/* ── ٠٦. أدوات ميزان برو — عرض تعريفي: ما يفتحه الاشتراك فعلياً ────── */}
        <section className="grad-band relative overflow-hidden py-14 md:py-20 bg-[#0f172a] dark:bg-[#0b1220] [content-visibility:auto] [contain-intrinsic-size:800px]">
          <div className="container mx-auto max-w-[1200px] px-6">
            <div className="text-center mb-10 md:mb-12">
              <SectionLabel step="٠٦" tone="goldLight">أدوات ميزان برو</SectionLabel>
              <h2 className="mt-3 text-[26px] md:text-[34px] font-black leading-[1.15] text-white">ستّ أدوات للمراجعة والتحرير القانوني</h2>
              <p className="mt-3 mx-auto max-w-[680px] text-[13px] text-[#cbd5e1]">
                أدوات عملية داخل المنصة: مقارنة النصوص، وتمارين الواقعة إلى الحل، وخريطة الإحالات، والتنبيهات، وحساب الآجال، وملف بحث خاص بك.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "قانون عبر الزمن", desc: "قارن نسختين موثّقتين من النصّ نفسه، مع إبراز الفروق كلمة بكلمة.", icon: GitCompare, tone: "bg-[#3b82f6]/15 text-[#93c5fd]" },
                { title: "من الواقعة إلى الحل", desc: "تمارين على وقائع قانونية مع إجابات نموذجية مراجعة وعناصر تحليل.", icon: Scale, tone: "bg-[#10b981]/15 text-[#6ee7b7]" },
                { title: "خريطة الإحالات القانونية", desc: "تابع الروابط بين النصوص: الصادر منها والوارد إليها، حتى المصدر الرسمي.", icon: Link2, tone: "bg-[#f59e0b]/15 text-[#fcd34d]" },
                { title: "راقب النصّ", desc: "احفظ المواضيع التي تهمّك واطّلع على تحديثاتها المنشورة داخل المنصة.", icon: BellRing, tone: "bg-[#ef4444]/15 text-[#fca5a5]" },
                { title: "حاسبة الآجال المسطرية", desc: "حساب مساعد لقواعد الأيام التقويمية المراجعة فقط، وليس استشارة قانونية.", icon: CalendarClock, tone: "bg-[#14b8a6]/15 text-[#5eead4]" },
                { title: "ملف البحث القانوني", desc: "احفظ ملاحظاتك ومراجعك، وصدّر ملف بحثك للاستعمال في تحريرك.", icon: FolderOpen, tone: "bg-[#fb923c]/15 text-[#fdba74]" },
              ].map((tool, i) => (
                <Reveal key={i} delay={i * 60} className="h-full">
                  <article className="group flex h-full flex-col rounded-xl border border-white/10 bg-white/5 p-5 transition-colors hover:border-[#3b82f6]/40 hover:bg-white/[0.08]">
                    <span className={`grid size-10 place-items-center rounded-xl ${tool.tone}`} aria-hidden="true">
                      <tool.icon className="size-5" />
                    </span>
                    <h3 className="mt-4 text-[14px] font-black text-white">{tool.title}</h3>
                    <p className="mt-1.5 text-[12px] leading-6 text-[#cbd5e1]">{tool.desc}</p>
                  </article>
                </Reveal>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-[12px] font-bold">
              <Link to="/pro-tools" className="group inline-flex items-center gap-2 rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white px-6 py-2.5 transition-colors">
                تعرّف على الأدوات
                <ArrowRight className="link-arrow size-3.5 rtl:rotate-180" aria-hidden="true" />
              </Link>
              <Link to="/pricing" className="text-[#93c5fd] hover:underline">الأسعار</Link>
            </div>
          </div>
        </section>

        {/* ── ٠٧. الأسعار: خطّتان واضحتان بلا أشرطة ولا شارات ──────────────── */}
        <section className="relative overflow-hidden border-y border-[#f1f5f9] bg-white py-16 md:py-24 dark:border-[#1e293b] dark:bg-[#0f172a] [content-visibility:auto] [contain-intrinsic-size:1000px]">
          <div className="container relative mx-auto max-w-[1200px] px-6">
            <div className="mx-auto max-w-[680px] text-center">
              <SectionLabel step="٠٧" tone="blue">الأسعار - خطط مرنة</SectionLabel>
              <h2 className="mt-3 text-[26px] md:text-[34px] font-black leading-[1.15] text-[#0f172a] dark:text-white">
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
                    <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">للجميع - للأبد</p>
                  </div>
                </div>
                <div className="mt-5">
                  <span className="text-[28px] font-black text-[#0f172a] dark:text-white">0</span>
                  <span className="text-[13px] font-bold text-[#64748b] dark:text-[#94a3b8]"> د.م / للأبد</span>
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
                      <ShieldCheck className="size-3.5 shrink-0 text-[#16a34a] dark:text-[#4ade80]" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/articles" className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border bg-white dark:bg-[#0f172a] py-3 text-[13px] font-bold">
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
                    <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">500 كريدتس</p>
                  </div>
                </div>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-[28px] font-black">49</span>
                  <span className="text-[13px] font-bold text-[#64748b] dark:text-[#94a3b8]"> د.م / شهر</span>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {[
                    "شجرة القوانين المتقدمة",
                    "تحديات مميزة",
                    "دعم أولوية",
                    "كل مزايا المجاني",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[12px]">
                      <ShieldCheck className="size-3.5 shrink-0 text-[#2563eb] dark:text-[#93c5fd]" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/pricing" className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f172a] dark:bg-white text-white dark:text-black py-3 text-[13px] font-bold">
                  اختر الشهري ←
                </Link>
              </div>

              <div className="rounded-2xl border border-[#2563eb]/35 bg-white p-6 dark:border-[#2563eb]/40 dark:bg-[#1e293b]">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-[#eff6ff] text-[#2563eb] dark:bg-[#1e3a5f]">
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
                <p className="mt-1 text-[11px] font-bold text-muted-foreground">1000 كريدتس هدية + خصم 32%</p>
                <ul className="mt-5 space-y-2.5">
                  {[
                    "كل مزايا الشهري",
                    "خصم 32% عن الشهري",
                    "1000 كريدتس هدية",
                    "شهادة توصية",
                    "شارات حصرية",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[12px] text-foreground">
                      <ShieldCheck className="size-3.5 shrink-0 text-[#2563eb] dark:text-[#93c5fd]" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/pricing" className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] py-3 text-[13px] font-bold text-white">
                  اختر السنوي ←
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── ٠٨. لماذا نحن + المصادر الرسمية ─────────────────────────────── */}
        <section className="relative overflow-hidden py-16 md:py-24 bg-[#f8fafc] dark:bg-[#0f172a]/50 border-y border-[#f1f5f9] dark:border-[#1e293b] [content-visibility:auto] [contain-intrinsic-size:900px]">
          <div className="container mx-auto max-w-[1200px] px-6">
            <div className="mx-auto max-w-[1000px]">
              <div className="mx-auto mb-10 max-w-[680px] text-center md:mb-14">
                <SectionLabel step="٠٨" tone="green">لماذا نحن</SectionLabel>
                {/* عنوان بصيغة سؤال (GEO: Question-Style Headings) */}
                <h2 className="mt-3 text-[26px] md:text-[34px] font-black leading-[1.15] text-[#0f172a] dark:text-white">
                  لماذا تختار منصة ميزان الرقمية؟
                </h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
                {[
                  { title: "محتوى مرتّب بالفصول", desc: "ملخصات ودروس مرتّبة من S1 إلى S6 حسب المسلك والفصل، بلا تشتّت بين ملفات متفرقة.", icon: Library, color: TONES.blue.soft, bar: "bg-[#2563eb]" },
                  { title: "إحالة إلى المصادر الرسمية", desc: "النصوص القانونية والقواعد محالة إلى الجريدة الرسمية وبوابة العدالة الرقمية للتحقق.", icon: Scale, color: TONES.green.soft, bar: "bg-[#047857]" },
                  { title: "قاموس عربي–فرنسي", desc: `${counts.lexicon} مصطلحاً قانونياً بالتعريف والترجمة، مع بحث وتصنيف حسب الفروع.`, icon: FileText, color: TONES.gold.soft, bar: "bg-[#b45309]" },
                  { title: "أدوات للمراجعة", desc: "اختبارات QCM لتقيس مستواك، وأدوات ميزان برو لتتبّع النصوص وحساب الآجال والتمارين.", icon: Clock, color: TONES.red.soft, bar: "bg-[#b91c1c]" },
                ].map((feature, i) => (
                  <Reveal key={i} delay={i * 70} className="h-full">
                    <div className="relative h-full overflow-hidden rounded-xl border border-[#e2e8f0] bg-white p-5 hover-lift dark:border-[#334155] dark:bg-[#1e293b]">
                      <span className={`absolute inset-x-0 top-0 h-1 ${feature.bar}`} aria-hidden="true" />
                      <span className={`grid size-10 place-items-center rounded-xl ${feature.color}`} aria-hidden="true">
                        <feature.icon className="size-5" />
                      </span>
                      <h3 className="mt-3 font-black text-[13px] text-[#0f172a] dark:text-white">{feature.title}</h3>
                      <p className="mt-1 text-[11px] leading-5 text-[#64748b] dark:text-[#94a3b8]">{feature.desc}</p>
                    </div>
                  </Reveal>
                ))}
              </div>

              {/* مصادر رسمية مسمّاة (GEO: Citations & Quotations). روابط
                  خارجية صريحة بـ rel="noopener noreferrer" — النسب يُقرأ
                  فيُربط المحتوى التعليمي بمصدر التحقق، وهو نفسه المذكور في
                  نسخة prerender الثابتة فلا تختلف نسختا الصفحة. */}
              <div className="mt-8 rounded-xl border border-[#e2e8f0] bg-white p-4 dark:border-[#334155] dark:bg-[#1e293b] sm:p-5">
                <p className="text-[12.5px] leading-6 text-[#475569] dark:text-[#94a3b8]">
                  جميع النصوص القانونية والقواعد المذكورة في منصة ميزان الرقمية محالة إلى مصادر رسمية يمكن التحقق منها مباشرة.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <a
                    href="https://www.sgg.gov.ma"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#e2e8f0] px-3.5 py-3 text-[12px] font-bold text-[#0f172a] transition-colors hover:border-[#2563eb]/40 dark:border-[#334155] dark:text-white"
                  >
                    <span className="flex items-center gap-2">
                      <Landmark className="size-4 text-[#2563eb]" aria-hidden="true" />
                      الجريدة الرسمية — الأمانة العامة للحكومة
                    </span>
                    <ExternalLink className="size-3.5 text-[#64748b] dark:text-[#94a3b8]" aria-hidden="true" />
                  </a>
                  <a
                    href="https://adala.justice.gov.ma"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#e2e8f0] px-3.5 py-3 text-[12px] font-bold text-[#0f172a] transition-colors hover:border-[#2563eb]/40 dark:border-[#334155] dark:text-white"
                  >
                    <span className="flex items-center gap-2">
                      <Landmark className="size-4 text-[#2563eb]" aria-hidden="true" />
                      بوابة العدالة الرقمية — وزارة العدل
                    </span>
                    <ExternalLink className="size-3.5 text-[#64748b] dark:text-[#94a3b8]" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── ٠٩. فروع القانون: أين يقع بحث الطالب في المعجم؟ ──────────────── */}
        <section className="relative overflow-hidden py-16 md:py-24 bg-white dark:bg-[#0f172a] [content-visibility:auto] [contain-intrinsic-size:900px]">
          <div className="container mx-auto max-w-[1200px] px-6">
            <div className="mb-10 text-center md:mb-14">
              <SectionLabel step="٠٩" tone="blue">فروع القانون</SectionLabel>
              <h2 className="mt-3 text-[26px] md:text-[34px] font-black leading-[1.15] text-[#0f172a] dark:text-white">أين يقع بحثك في المعجم؟</h2>
              <p className="mt-3 text-[13px] text-[#64748b] dark:text-[#94a3b8] max-w-[680px] mx-auto">
                المصطلحات مصنّفة حسب فروع القانون المغربي، وكل فرع يعطيك مدخلاً سريعاً إلى مصطلحاته ونصوصه.
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
              <div className="space-y-4">
                {topBranches.map((branch, i) => (
                  <Reveal key={branch.name} delay={i * 50}>
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[13px] font-black text-[#0f172a] dark:text-white">{branch.name}</span>
                        <span className="text-[12px] font-black tabular-nums text-[#2563eb]">{branch.count}</span>
                      </div>
                      <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-[#f1f5f9] dark:bg-[#334155]">
                        <span
                          className="grow-x block h-1.5 rounded-full bg-[#2563eb]"
                          style={{ width: `${Math.round((branch.count / busiestBranch) * 100)}%`, animationDelay: `${i * 60}ms` }}
                        />
                      </span>
                    </div>
                  </Reveal>
                ))}
                <p className="pt-1 text-[11.5px] leading-6 text-[#64748b] dark:text-[#94a3b8]">
                  و{restTerms} مصطلحاً موزّعاً على {restBranches.length} فرعاً آخر.
                </p>
              </div>

              <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-5 dark:border-[#334155] dark:bg-[#1e293b]">
                <h3 className="text-[15px] font-black text-[#0f172a] dark:text-white">كيف يُبنى المصطلح في المنصة؟</h3>
                <ol className="mt-4 space-y-3">
                  {[
                    "تعريف عربي واضح بلغة الطالب، لا بلغة القرار.",
                    "المقابل الفرنسي، لأن جزءاً من المراجع الجامعية يُقرأ بالفرنسية.",
                    "الإسناد إلى النصّ القانوني والمادة حين يكون المصطلح مرجعياً.",
                    "الرابط إلى المصدر الرسمي للتحقق من النصّ النافذ.",
                    "تاريخ مراجعة موثّق لكل بطاقة مصطلح.",
                  ].map((line, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[12.5px] leading-6 text-[#475569] dark:text-[#cbd5e1]">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-white text-[10px] font-black tabular-nums text-[#2563eb] dark:bg-[#334155]" aria-hidden="true">
                        {i + 1}
                      </span>
                      {line}
                    </li>
                  ))}
                </ol>
                <p className="mt-4 border-t border-[#e2e8f0] pt-4 text-[12px] leading-6 text-[#475569] dark:border-[#334155] dark:text-[#cbd5e1]">
                  {counts.lexiconWithSources} مصطلحاً من {counts.lexicon} تحمل إسناداً موثّقاً إلى نصّ ومادة، والباقي تعريفات ومقابلات فرنسية في انتظار الإسناد.
                </p>
                <Link to="/lexicon" className="group mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-black text-[#2563eb]">
                  افتح المعجم الكامل
                  <ArrowRight className="link-arrow size-3.5 rtl:rotate-180" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── ١٠. المسارات والمهن: إلى أين يقود مسار القانون؟ ───────────────── */}
        <section className="grad-soft relative overflow-hidden border-y border-[#f1f5f9] dark:border-[#1e293b] bg-white dark:bg-[#0f172a] py-16 md:py-24 [content-visibility:auto] [contain-intrinsic-size:900px]">
          <div className="container mx-auto max-w-[1200px] px-6">
            <div className="mb-10 text-center md:mb-14">
              <SectionLabel step="١٠" tone="gold">المسارات والمهن</SectionLabel>
              <h2 className="mt-3 text-[26px] md:text-[34px] font-black leading-[1.15] text-[#0f172a] dark:text-white">إلى أين يقود مسار القانون في المغرب؟</h2>
              <p className="mt-3 text-[13px] text-[#64748b] dark:text-[#94a3b8] max-w-[680px] mx-auto">
                صورة عامة عن الآفاق التي يفتحها مسار الحقوق، بلا مواعيد ولا أرقام: كل مسار له مساطره المعلنة.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
              {CAREER_PATHS.map((path, i) => (
                <Reveal key={path.title} delay={i * 50} className="h-full">
                  <article className="flex h-full flex-col rounded-xl border border-[#e2e8f0] bg-white p-4 transition-colors hover:border-[#2563eb]/40 dark:border-[#334155] dark:bg-[#1e293b]">
                    <span className="grid size-9 place-items-center rounded-lg bg-[#f1f5f9] text-[#2563eb] dark:bg-[#334155]" aria-hidden="true">
                      <path.icon className="size-4" />
                    </span>
                    <h3 className="mt-3 text-[13.5px] font-black text-[#0f172a] dark:text-white">{path.title}</h3>
                    <p className="mt-1.5 flex-1 text-[11.5px] leading-6 text-[#64748b] dark:text-[#94a3b8]">{path.desc}</p>
                  </article>
                </Reveal>
              ))}
            </div>

            <p className="mx-auto mt-8 max-w-[680px] text-center text-[11.5px] leading-6 text-[#64748b] dark:text-[#94a3b8]">
              الولوج إلى هذه المسارات يمرّ عبر مساطر ومباريات رسمية معلنة، وتختلف شروطها من هيئة إلى أخرى؛ تحقّق دائماً من الإعلانات الرسمية، وابدأ من
              {" "}<Link to="/schools" className="font-bold text-[#2563eb] hover:underline">دليل كليات الحقوق</Link>{" "}
              لمعرفة مؤسستك.
            </p>
          </div>
        </section>

        {/* ── الشريط الختامي: فعل واحد واضح مع تقليل المخاطرة ─────────────── */}
        <section className="grad-band relative overflow-hidden bg-[#0f172a] py-16 text-white md:py-24 dark:bg-[#0b1220]">
          <div className="container relative mx-auto max-w-[1200px] px-6 text-center">
            <h2 className="text-[26px] md:text-[34px] font-black leading-[1.15]">
              ابدأ من الفصل الذي تدرسه اليوم
            </h2>
            <p className="mx-auto mt-3 max-w-[680px] text-[14px] leading-7 text-[#cbd5e1]">
              افتح الأرشيف، اختر الفصل والمادة، ثم اختبر نفسك. المحتوى الأساسي مجاني وبلا حساب.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
              <Link to="/archive" className="btn-accent inline-flex items-center gap-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-7 py-3.5 text-[15px] font-black transition-colors">
                تصفّح الأرشيف الدراسي
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
              <Link to="/quiz" className="text-[13px] font-bold text-[#93c5fd] hover:underline">
                أو جرّب اختباراً سريعاً
              </Link>
            </div>
            <p className="mt-6 text-[11.5px] font-bold text-[#cbd5e1]">
              {counts.lexicon} مصطلحاً، و{counts.docs} ملفاً دراسياً، و{counts.schools} كلية، و{counts.articles} مقالاً، و{counts.news} خبراً.
            </p>
          </div>
        </section>

        <Suspense fallback={null}>
          <HomeFaqSection lexiconCount={counts.lexicon} articlesCount={counts.articles} schoolsCount={counts.schools} />
        </Suspense>
      </main>
    </>
  )
}
