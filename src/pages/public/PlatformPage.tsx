import { useMemo } from "react"
import { Link } from "react-router-dom"
import { AEOHead } from "../../components/seo/AEOHead"
import countsData from "../../data/counts.json"
import lexiconData from "../../data/lexicon.client.json"
import newsData from "../../data/news.json"
import schoolsData from "../../data/schools.json"

/**
 * صفحة «المنصة» — الصفحة الركنية (cornerstone) التي تصف ميزان الرقمية كما هي
 * فعلاً: محتوى منشور في `src/data/*.json`، لا وعود تسويقية. كل رقم وكل بطاقة
 * هنا تُقرأ من الملفات نفسها التي تقرأها الصفحات الحيّة، فلا تتناقض الصفحة مع
 * الأرشيف إذا أُضيف مورد أو مُصطلح.
 *
 * العنوان والوصف مطابقة حرفياً لما هو متفق عليه في خطة السيو؛ وتمرّان على
 * `AEOHead` (أي `shared/seo/meta-copy.js`) فتنضبط الطولان بالسياسة نفسها
 * المطبَّقة على بقية الصفحات. الروابط الداخلية بلا شرطة مائلة نهائياً.
 */
const PLATFORM_TITLE = "ميزان الرقمية: المنصة المغربية المجانية لطلبة الحقوق"

/*
 * الوصف مكتوب داخل النطاق 140–160 حرفاً عمداً: الطبقة المشتركة
 * shared/seo/meta-copy.js تبني منه نسخة padded في prerender بينما تمرره
 * SEOHead في المتصفح كما هو — فأي وصف أقصر من الحدّ الأدنى يجعل وسم
 * المتصفح يختلف عن وسم الملف الثابت. نفس النص في scripts/prerender.mjs.
 */
const PLATFORM_DESCRIPTION =
  "منصة ميزان الرقمية تجمع ملخصات القانون، المصطلحات القانونية، ومعلومات كليات الحقوق في مكان واحد. مجانية لطلبة الحقوق بالمغرب، بلا حساب إجباري للتصفح."

type LexiconEntry = {
  id: string
  term_ar?: string
  term_fr?: string
  category?: string
  canonical_url?: string
  review_status?: string
}

type NewsEntry = {
  id: string
  title?: string
  date?: string
  summary?: string
  category?: string
}

type SchoolEntry = {
  id?: string
  name?: string
  short_name?: string
  city?: string
  university?: string
  officialUrl?: string
}

const FEATURES: Array<{
  href: string
  kicker: string
  title: string
  text: string
}> = [
  {
    href: "/archive",
    kicker: "ملخصات ومحاضرات",
    title: "أرشيف دراسي منظّم بالفصل S1 → S6",
    text: "ملخصات القانون المدني والجنائي والدستوري والجنائي والعقار والحالة المدنية، مرفقة بأسئلة امتحانات سابقة مع عناصر الإجابة. تصفّح حسب الفصل أو ابحث داخل المادة.",
  },
  {
    href: "/lexicon",
    kicker: "المعجم القانوني",
    title: "مصطلح عربي/فرنسي بتعريف ومصدر",
    text: "كل بطاقة مصطلح تعرض التعريف، والشرح المبسّط للطلبة، وأمثلة دراسية، وكلمات مفتاحية للمراجعة، مع النص القانوني المنشور حين يتوفّر في المصدر الرسمي.",
  },
  {
    href: "/schools",
    kicker: "كليات الحقوق",
    title: "معلومات الكليات بكل مدينة",
    text: "جامعة، مدينة، ومسالك الدراسة — مع الرابط الرسمي للكلية، وسنة الإحداث ومنصّة التسجيل حين تكون منشورة في البيانات.",
  },
  {
    href: "/news",
    kicker: "مستجدات",
    title: "أخبار تشريعية وجامعية مختصرة",
    text: "ما تغيّر في النصوص أو في الكلية: مشاريع القوانين، مواعيد الامتحانات، نتائج المباريات — بملخّص قصير ورابط للمصدر.",
  },
  {
    href: "/guides/new-law-student-morocco",
    kicker: "دليل الطالب الجديد",
    title: "من أول أسبوع إلى أول امتحان",
    text: "دليل عملي لطلبة السنة الأولى: كيف تنظّم مراجعتك، كيف تقرأ نصّاً قانونياً، وأين تجد الملخّص والسلسلة الصحيحة من النصوص.",
  },
  {
    href: "/guides/free-legal-resources-morocco",
    kicker: "موارد مجانية",
    title: "أفضل الموارد المجانية لطلبة القانون",
    text: "مقارنة بين المنصات والمصادر المفتوحة المتاحة بالعربية والفرنسية، ومتى تحتاج كل واحد منها.",
  },
]

/**
 * مسار داخلي بلا شرطة مائلة نهاية: نأخذ مسار canonical الموجود في البطاقة بعد
 * تجريد الأصل، وإلا نعود إلى المعرّف. لا `new URL()` هنا: بعض القيم نسبية في
 * البيانات القديمة، والتجريد اليدوي أبسط وأأمن.
 */
function termHref(t: LexiconEntry): string {
  const raw = (t.canonical_url || "").replace(/^https?:\/\/[^/]+/, "").replace(/\/+$/, "")
  return raw.startsWith("/lexicon/") ? raw : `/lexicon/${t.id}`
}

/** المصطلحات المقترحة للزيارة: نبدأ بما راجعه البشر ثم نتمّم بالأكثر اكتمالاً. */
function pickSampleTerms(terms: LexiconEntry[], limit = 6): LexiconEntry[] {
  const published = terms.filter((t) => t.review_status === "published")
  const rest = terms.filter((t) => t.review_status !== "published")
  return [...published, ...rest].filter((t) => t.term_ar).slice(0, limit)
}

export default function PlatformPage() {
  const terms = useMemo(() => lexiconData as unknown as LexiconEntry[], [])
  const news = useMemo(() => newsData as unknown as NewsEntry[], [])
  const schools = useMemo(() => schoolsData as unknown as SchoolEntry[], [])

  const stats = useMemo(() => {
    const fromCounts = countsData as {
      total_resources?: number
      total_students?: number
    }
    return {
      resources: fromCounts.total_resources ?? 0,
      terms: terms.length,
      schools: schools.length,
      news: news.length,
    }
  }, [terms, schools, news])

  const samples = useMemo(() => pickSampleTerms(terms), [terms])
  const cities = useMemo(() => {
    const set = new Set<string>()
    for (const s of schools) if (s.city) set.add(s.city)
    return [...set]
  }, [schools])

  return (
    <div className="bg-white dark:bg-[#0f172a]">
      <AEOHead
        title={PLATFORM_TITLE}
        description={PLATFORM_DESCRIPTION}
        keywords={[
          "منصة ميزان الرقمية",
          "ملخصات القانون المغربي",
          "مصطلحات قانونية",
          "كليات الحقوق",
          "قانون مجاني للطلبة",
        ]}
        breadcrumbs={[
          { name: "الرئيسية", url: "/" },
          { name: "المنصة", url: "/platform" },
        ]}
        schema={{
          "@type": "WebApplication",
          name: PLATFORM_TITLE,
          applicationCategory: "EducationalApplication",
          isAccessibleForFree: true,
          inLanguage: ["ar-MA", "fr-MA"],
          offers: { "@type": "Offer", price: "0", priceCurrency: "MAD" },
          featureList: FEATURES.map((f) => f.title),
        }}
      />

      <article className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#2563eb]">المنصة</p>
        <h1 className="mt-3 text-[28px] sm:text-[34px] font-extrabold leading-tight text-[#0f172a] dark:text-white">
          {PLATFORM_TITLE}
        </h1>
        <p className="mt-4 lead text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
          <strong>
            ميزان الرقمية منصة مجانية لطلبة الحقوق في المغرب: ملخصات دراسية بالفصل، معجم قانوني بالمصطلح، دليل
            كليات الحقوق، ومستجدات تشريعية في مكان واحد.
          </strong>{" "}
          لا حساب إجباري ولا جدار أداء على المحتوى الأساسي؛ ما هو منشور في الأرشيف متاح للتصفح والتحميل
          مباشرة.
        </p>

        {/* ── الأرقام من الملفات نفسها ───────────────────────────────────── */}
        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { k: "مورد دراسي منشور", v: stats.resources, href: "/archive" },
            { k: "مصطلح في المعجم", v: stats.terms, href: "/lexicon" },
            { k: "كلية حقوق في الدليل", v: stats.schools, href: "/schools" },
            { k: "خبر ومستجد", v: stats.news, href: "/news" },
          ].map((s) => (
            <Link
              key={s.k}
              to={s.href}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4 hover:border-[#2563eb]/40 transition-colors"
            >
              <dt className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{s.k}</dt>
              <dd className="mt-1 text-[26px] font-extrabold text-[#0f172a] dark:text-white tabular-nums">
                {s.v}
              </dd>
            </Link>
          ))}
        </dl>

        {/* ── ماذا تقدم ميزان لطلبة الحقوق؟ ─────────────────────────────── */}
        <section id="what-we-offer" className="mt-12">
          <h2 className="text-[22px] font-extrabold text-[#0f172a] dark:text-white">
            ماذا تقدم ميزان لطلبة الحقوق؟
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <Link
                key={f.href}
                to={f.href}
                className="block rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:border-[#2563eb]/40 transition-colors"
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#2563eb]">{f.kicker}</p>
                <h3 className="mt-2 text-[16px] font-extrabold text-[#0f172a] dark:text-white">{f.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                  {f.text}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* ── لماذا تختار ميزان؟ ─────────────────────────────────────────── */}
        <section id="why-mizan" className="mt-12">
          <h2 className="text-[22px] font-extrabold text-[#0f172a] dark:text-white">لماذا تختار ميزان؟</h2>
          <ul className="mt-5 space-y-4">
            {[
              {
                t: "المصطلح والنص والملخّص في صفحة واحدة",
                d: "بطاقة المصطلح لا تكتفي بالتعريف: شرح مبسّط للطلبة، أمثلة، كلمات مفتاحية للمراجعة، وإحالة إلى النص القانوني المنشور. والملخّص الدراسي يربط المادة بموسمها (S1 → S6) بدل قائمة ملفات مجهولة.",
              },
              {
                t: "محتوى عربي بلغة طالب مغربي",
                d: "التعريفات والأمثلة مكتوبة بالعربية التي تدرس بها، مع المقابل الفرنسي للمصطلح — لأن الامتحان والتصحيح يشتغلان باللغتين.",
              },
              {
                t: "من الفصل الذي تدرس فيه الآن",
                d: "الأرشيف منظّم حسب الفصول، ومعظم الملخصات تحمل أسئلة دورات سابقة وعناصر الإجابة، وهو ما تبحث عنه في الأسبوعين الأخيرين قبل الامتحان.",
              },
              {
                t: "بلا حساب إجباري ولا جدار أداء",
                d: "تصفح المعجم والأرشيف ودليل الكليات والأخبار متاح مباشرة. الاشتراك (ميزان برو) يفتح أدوات متقدمة فقط، والمحتوى التعليمي الأساسي يبقى مجانياً.",
              },
              {
                t: "مفهوم المصدر، لا منقول بلا مصدر",
                d: "بطاقة المصطلح تعرض النص القانوني عند توفره، والصفحة تنوّه أن ما هنا محتوى تعليمي لا يغني عن النص الرسمي عند العمل القانوني.",
              },
            ].map((r) => (
              <li
                key={r.t}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5 bg-white dark:bg-[#1e293b]"
              >
                <h3 className="text-[15px] font-extrabold text-[#0f172a] dark:text-white">{r.t}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{r.d}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── عيّنة من المعجم ────────────────────────────────────────────── */}
        <section id="lexicon-sample" className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-[22px] font-extrabold text-[#0f172a] dark:text-white">
              عيّنة من المعجم القانوني
            </h2>
            <Link to="/lexicon" className="text-[13px] font-bold text-[#2563eb] whitespace-nowrap">
              كل المصطلحات ←
            </Link>
          </div>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {samples.map((t) => (
              <li key={t.id}>
                <Link
                  to={termHref(t)}
                  className="block h-full rounded-2xl border border-slate-200 dark:border-slate-700 p-4 hover:border-[#2563eb]/40 transition-colors"
                >
                  <p className="text-[15px] font-extrabold text-[#0f172a] dark:text-white">{t.term_ar}</p>
                  <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">{t.term_fr}</p>
                  <p className="mt-2 text-[11px] font-bold text-slate-400">{t.category}</p>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-slate-500 dark:text-slate-400">
            الكليات المتوفرة في الدليل: {cities.join("، ")} — {stats.schools} كلية.
          </p>
        </section>

        {/* ── CTA ────────────────────────────────────────────────────────── */}
        <section
          id="start"
          className="mt-12 rounded-2xl border border-[#2563eb]/20 bg-[#eff6ff] dark:bg-[#2563eb]/10 p-6 text-center sm:p-8 sm:text-right"
        >
          <h2 className="text-[20px] font-extrabold text-[#0f172a] dark:text-white">
            ابدأ من الفصل الذي تدرسه الآن
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
            ادخل الأرشيف واختر فصلك، أو ابحث عن المصطلح الذي تعثّرت فيه اليوم، أو اقرأ دليل الطالب الجديد قبل
            أن تبدأ أسبوعك الأول.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/archive"
              className="rounded-full bg-[#2563eb] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-[#1d4ed8]"
            >
              تصفّح الملخصات
            </Link>
            <Link
              to="/lexicon"
              className="rounded-full border border-[#2563eb]/30 px-5 py-2.5 text-[13px] font-bold text-[#2563eb] hover:bg-white dark:hover:bg-[#1e293b]"
            >
              المعجم القانوني
            </Link>
            <Link
              to="/guides/new-law-student-morocco"
              className="rounded-full border border-[#2563eb]/30 px-5 py-2.5 text-[13px] font-bold text-[#2563eb] hover:bg-white dark:hover:bg-[#1e293b]"
            >
              دليل الطالب الجديد
            </Link>
          </div>
        </section>
      </article>
    </div>
  )
}
