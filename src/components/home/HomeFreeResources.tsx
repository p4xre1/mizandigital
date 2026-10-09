import { Link } from "react-router-dom"
import { Archive, BookOpen, ClipboardCheck, Landmark, Newspaper, Search, ShieldCheck, ArrowRight, type LucideIcon } from "lucide-react"

type FreeResource = {
  title: string
  desc: string
  href: string
  icon: LucideIcon
  accent: string
}

const RESOURCES: FreeResource[] = [
  {
    title: "أرشيف الفصول S1–S6",
    desc: "ملخصات الدروس منظمة حسب الفصول، من السداسي الأول إلى السادس.",
    href: "/archive",
    icon: Archive,
    accent: "text-[#fbbf24] bg-[#fbbf24]/15",
  },
  {
    title: "القاموس القانوني",
    desc: "مصطلحات عربية–فرنسية مع تعريفات مبسطة ومصادرها القانونية.",
    href: "/lexicon",
    icon: BookOpen,
    accent: "text-[#60a5fa] bg-[#60a5fa]/15",
  },
  {
    title: "المقالات والأخبار القانونية",
    desc: "تحليلات ومستجدات تشريعية تُنشر بانتظام لمتابعة ما يتغير في القانون.",
    href: "/articles",
    icon: Newspaper,
    accent: "text-[#34d399] bg-[#34d399]/15",
  },
  {
    title: "اختبارات QCM",
    desc: "تدرّب على أسئلة الاختيار من متعدد، وقيّم مستواك قبل الامتحان.",
    href: "/quiz",
    icon: ClipboardCheck,
    accent: "text-[#f472b6] bg-[#f472b6]/15",
  },
  {
    title: "دليل كليات الحقوق",
    desc: "معلومات عن كليات الحقوق والعلوم القانونية والاقتصادية بالمغرب.",
    href: "/schools",
    icon: Landmark,
    accent: "text-[#a78bfa] bg-[#a78bfa]/15",
  },
  {
    title: "أدوات البحث والتدريب",
    desc: "ابحث في المحتوى القانوني كله من مكان واحد، واستعمل أدوات مساعدة للدراسة.",
    href: "/search",
    icon: Search,
    accent: "text-[#5eead4] bg-[#5eead4]/15",
  },
]

/**
 * قسم «المعرفة القانونية للجميع» في الصفحة الرئيسية:
 * لوحة داكنة متدرّجة، وثلاث بطاقات في الصف، ولكل بطاقة أيقونتها ورابطها.
 */
export function HomeFreeResources() {
  return (
    <section className="bg-white py-14 md:py-20 dark:bg-[#0f172a] [content-visibility:auto] [contain-intrinsic-size:900px]">
      <div className="container mx-auto max-w-[1200px] px-4 md:px-6">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#1d4ed8] p-7 text-white shadow-[0_30px_80px_-30px_rgba(29,78,216,0.5)] md:p-12 lg:p-16">
          <div className="pointer-events-none absolute -top-32 -left-24 size-[420px] rounded-full bg-[#60a5fa]/20 blur-[100px]" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-32 -right-24 size-[360px] rounded-full bg-[#fbbf24]/15 blur-[90px]" aria-hidden="true" />

          <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12px] font-black text-[#6ee7b7] ring-1 ring-white/15">
                <ShieldCheck className="size-4" aria-hidden="true" /> مجانية بالكامل
              </span>
              <h2 className="mt-5 text-[32px] font-black leading-tight md:text-[44px]">المعرفة القانونية للجميع</h2>
              <p className="mt-4 text-[16px] leading-8 text-[#cbd5e1] md:text-[18px]">
                كل موارد ميزان وأدواتها مجانية، بلا إعلانات تجارية. كل ما تحتاجه للدراسة في مكان واحد.
              </p>
            </div>
            <Link
              to="/articles"
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 self-start rounded-full bg-white px-7 py-3 text-[14px] font-bold text-[#1e3a8a] transition hover:bg-[#eff6ff] md:self-auto"
            >
              استكشف الموارد المجانية <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
          </div>

          <div className="relative mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {RESOURCES.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.06] p-7 transition hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.12]"
              >
                <div className={`grid size-14 place-items-center rounded-2xl ${item.accent}`}>
                  <item.icon className="size-7" aria-hidden="true" />
                </div>
                <h3 className="mt-6 text-[20px] font-black leading-snug">{item.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-[#cbd5e1]">{item.desc}</p>
                <span className="mt-auto inline-flex items-center gap-2 pt-6 text-[14px] font-bold text-white/80 transition group-hover:text-white">
                  تصفّح <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
