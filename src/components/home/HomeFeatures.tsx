import { Link } from "react-router-dom"
import { ArrowRight, Bookmark, ClipboardCheck, FileText, GraduationCap, Languages, Layers, type LucideIcon } from "lucide-react"
import { LAW_TEXT_FORMS, QUESTION_FORMS, SCHOOL_FORMS, TERM_FORMS, arabicCount } from "@/lib/utils/arabicCount"

export interface FeatureCounts {
  laws: number
  lexicon: number
  schools: number
  quizQuestions: number
}

/**
 * ألوان ثابتة: لون واحد لكل ميزة. الأصناف مكتوبة صراحةً حتى يلتقطها Tailwind.
 * كل لون يحقق تبايناً 4.5:1 على خلفية الشارة الفاتحة.
 */
const ACCENTS = {
  blue: {
    solid: "bg-[#1d4ed8]",
    soft: "bg-[#eff6ff] text-[#1d4ed8] dark:bg-[#1e3a8a]/40 dark:text-[#bfdbfe]",
    hover: "group-hover:border-[#1d4ed8]",
  },
  teal: {
    solid: "bg-[#0f766e]",
    soft: "bg-[#f0fdfa] text-[#0f766e] dark:bg-[#134e4a]/40 dark:text-[#99f6e4]",
    hover: "group-hover:border-[#0f766e]",
  },
  amber: {
    solid: "bg-[#b45309]",
    soft: "bg-[#fffbeb] text-[#b45309] dark:bg-[#78350f]/40 dark:text-[#fcd34d]",
    hover: "group-hover:border-[#b45309]",
  },
  rose: {
    solid: "bg-[#be123c]",
    soft: "bg-[#fff1f2] text-[#be123c] dark:bg-[#881337]/40 dark:text-[#fda4af]",
    hover: "group-hover:border-[#be123c]",
  },
  emerald: {
    solid: "bg-[#047857]",
    soft: "bg-[#ecfdf5] text-[#047857] dark:bg-[#064e3b]/40 dark:text-[#6ee7b7]",
    hover: "group-hover:border-[#047857]",
  },
  indigo: {
    solid: "bg-[#4338ca]",
    soft: "bg-[#eef2ff] text-[#4338ca] dark:bg-[#312e81]/40 dark:text-[#c7d2fe]",
    hover: "group-hover:border-[#4338ca]",
  },
} as const

type Accent = (typeof ACCENTS)[keyof typeof ACCENTS]

export interface HomeFeature {
  title: string
  body: string
  to: string
  cta: string
  icon: LucideIcon
  accent: Accent
  /** الشارة في الزاوية. null إن لم يكن هناك رقم صالح. */
  tag: string | null
}

/** الميزات الست: كل واحدة برابط إلى صفحتها، وشارتها من بيانات البناء. */
export function featuresFor(counts: FeatureCounts): HomeFeature[] {
  return [
    {
      title: "نصوص قانونية بصيغة PDF",
      body: "القوانين المغربية من الجريدة الرسمية، للقراءة أو التحميل.",
      to: "/archive?type=legal-texts",
      cta: "تصفح النصوص",
      icon: FileText,
      accent: ACCENTS.blue,
      tag: counts.laws > 0 ? arabicCount(counts.laws, LAW_TEXT_FORMS) : null,
    },
    {
      title: "قاموس ثنائي اللغة",
      body: "عربي-فرنسي، مع شجرة تربط كل مصطلح بمصادره وفصوله.",
      to: "/lexicon",
      cta: "افتح القاموس",
      icon: Languages,
      accent: ACCENTS.teal,
      tag: counts.lexicon > 0 ? arabicCount(counts.lexicon, TERM_FORMS) : null,
    },
    {
      title: "أرشيف مرتب بالفصول",
      body: "ملخصات ومحاضرات وامتحانات من S1 إلى S6.",
      to: "/archive",
      cta: "تصفح الأرشيف",
      icon: Layers,
      accent: ACCENTS.amber,
      tag: "S1 — S6",
    },
    {
      title: "اختبارات للتدريب",
      body: "اختبارات الفصول، مباريات التوظيف، المقابلات الشفوية وتحديد المستوى.",
      to: "/quiz",
      cta: "ابدأ التدريب",
      icon: ClipboardCheck,
      accent: ACCENTS.rose,
      tag: counts.quizQuestions > 0 ? arabicCount(counts.quizQuestions, QUESTION_FORMS) : null,
    },
    {
      title: "دليل الكليات والمسارات",
      body: "كليات الحقوق في المغرب ومسارات مهنية تساعدك على اختيار طريقك.",
      to: "/schools",
      cta: "استعرض الكليات",
      icon: GraduationCap,
      accent: ACCENTS.emerald,
      tag: counts.schools > 0 ? arabicCount(counts.schools, SCHOOL_FORMS) : null,
    },
    {
      title: "مكتبتك الشخصية",
      body: "احفظ ما يهمك على متصفحك وارجع إليه في أي وقت، بلا حساب.",
      to: "/saved",
      cta: "افتح المحفوظات",
      icon: Bookmark,
      accent: ACCENTS.indigo,
      tag: "بلا تسجيل",
    },
  ]
}

function FeatureCard({ feature }: { feature: HomeFeature }) {
  const { icon: Icon, accent } = feature
  return (
    <Link
      to={feature.to}
      className={`group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white p-6 pt-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] dark:border-[#334155] dark:bg-[#1e293b] ${accent.hover}`}
    >
      <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${accent.solid}`} />
      <div className="flex items-start justify-between gap-3">
        <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${accent.soft}`}>
          <Icon className="size-6" aria-hidden="true" />
        </span>
        {feature.tag && (
          <span className={`rounded-full px-3 py-1 text-[13px] font-black ${accent.soft}`} dir="auto">
            {feature.tag}
          </span>
        )}
      </div>
      <h3 className="text-[18px] font-black leading-snug text-[#0f172a] dark:text-white">{feature.title}</h3>
      <p className="text-[15px] leading-7 text-[#334155] dark:text-[#cbd5e1]">{feature.body}</p>
      <span className="mt-auto inline-flex items-center gap-1.5 border-t border-dashed border-[#cbd5e1] pt-4 text-[14px] font-bold text-[#0f172a] group-hover:underline dark:border-[#475569] dark:text-white">
        {feature.cta}
        <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
      </span>
    </Link>
  )
}

export function HomeFeatures({ counts }: { counts: FeatureCounts }) {
  const features = featuresFor(counts)
  return (
    <section
      className="py-16 bg-[#f8fafc] dark:bg-[#0f172a]/50 border-y border-[#f1f5f9] dark:border-[#1e293b] [content-visibility:auto] [contain-intrinsic-size:900px]"
      aria-labelledby="home-features-title"
    >
      <div className="container mx-auto max-w-[1100px] px-6">
        <div className="text-center max-w-[720px] mx-auto mb-14">
          <p className="inline-flex items-center gap-3 text-[18px] md:text-[20px] font-black leading-none text-[#2563eb] dark:text-[#93c5fd]">
            <span aria-hidden="true" className="h-[3px] w-8 rounded-full bg-[#2563eb] dark:bg-[#93c5fd]" />
            لماذا نحن
            <span aria-hidden="true" className="h-[3px] w-8 rounded-full bg-[#2563eb] dark:bg-[#93c5fd]" />
          </p>
          <h2 id="home-features-title" className="mt-5 text-[30px] md:text-[42px] font-black leading-[1.25] text-[#0f172a] dark:text-white">
            كل ما يحتاجه{" "}
            <span className="relative isolate inline-block whitespace-nowrap text-[#1d4ed8] dark:text-[#93c5fd]">
              <span aria-hidden="true" className="absolute inset-x-[-0.15em] bottom-[0.08em] -z-10 h-[0.36em] rounded-md bg-[#dbeafe] dark:bg-[#1e3a8a]" />
              طالب القانون
            </span>{" "}
            المغربي
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.to} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  )
}
