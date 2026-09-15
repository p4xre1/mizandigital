import { useEffect, useState, lazy, Suspense } from "react"
import { Link } from "react-router-dom"
import { AEOHead } from "../../components/seo/AEOHead"
import counts from "../../data/counts.json"
import { diversifyByCategory } from "../../lib/utils/diversify"
import {
  BookOpen, Scale, GraduationCap, Star, Users, Award, Library, ShieldCheck, Clock, Video, FileText, ArrowRight
} from "lucide-react"

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

export function HomePage() {
  const [latestArticles, setLatestArticles] = useState<FeedCard[]>([])
  const [schoolsCount] = useState<number>(counts.schools)
  const [articlesCount] = useState<number>(counts.articles)

  useEffect(() => {
    // Fast local load - no supabase, immediate after paint
    const loadLocal = async () => {
      try {
        const [{ default: articlesData }] = await Promise.all([import("../../data/articles.json")])
        const local: FeedCard[] = (articlesData as any[]).slice(0, 8).map((item) => ({
          id: item.id,
          slug: item.slug,
          title: item.title,
          summary: item.excerpt,
          category: item.category,
          date: item.publishedAt,
          image: item.coverImage || item.image,
        }))
        setLatestArticles(diversifyByCategory(local, 8))
      } catch {}
    }
    loadLocal()

    // Defer heavy supabase to idle - not critical for LCP
    const loadRemote = async () => {
      try {
        const { supabase } = await import("../../lib/supabase/client")
        const [{ default: articlesData }] = await Promise.all([import("../../data/articles.json")])
        const [articlesRes] = await Promise.all([
          supabase.from("articles").select("id, title, slug, excerpt, published_at, created_at, cover_image, category:categories(name)").eq("status", "published").order("published_at", { ascending: false }).limit(20),
        ])
        const remoteArticles: FeedCard[] = (articlesRes.data || []).map((item: any) => ({
          id: item.id,
          slug: item.slug,
          title: item.title,
          summary: item.excerpt,
          category: Array.isArray(item.category) ? item.category[0]?.name : item.category?.name,
          date: item.published_at || item.created_at,
          image: item.cover_image,
        }))
        const localArticles: FeedCard[] = (articlesData as any[]).map((item) => ({
          id: item.id,
          slug: item.slug,
          title: item.title,
          summary: item.excerpt,
          category: item.category,
          date: item.publishedAt,
          image: item.coverImage || item.image,
        }))
        const combined = Array.from(new Map([...remoteArticles, ...localArticles].map((a) => [a.slug, a])).values())
        setLatestArticles(diversifyByCategory(combined, 8))
      } catch {}
    }

    if ("requestIdleCallback" in window) {
      // @ts-ignore
      requestIdleCallback(loadRemote, { timeout: 3000 })
    } else {
      setTimeout(loadRemote, 1500)
    }
  }, [])

  return (
    <>
      <AEOHead
        title="المعرفة القانونية للطلبة بالمغرب"
        description="ميزان الرقمية منصة مغربية مجانية لطلبة القانون، تضم ملخصات دراسية، قاموساً قانونياً، أخباراً، ندوات ودليل كليات الحقوق."
        directAnswer="ميزان الرقمية منصة مغربية مجانية لطلبة كليات الحقوق، تضم 304 سجلاً: 8 مقالات قانونية، 13 خبراً تشريعياً، 250 مصطلحاً قانونياً، 21 كلية حقوق."
        keywords={["القانون المغربي", "منصة الميزان الرقمية", "الأرشيف القانوني المغربي"]}
      />
      <main className="min-h-screen bg-white dark:bg-[#0f172a] text-foreground" dir="rtl">
        {/* Hero - Centered Text - Optimized: smaller blur, no heavy animations */}
        <section className="relative bg-white dark:bg-[#0f172a] overflow-hidden">
          {/* Lightweight decorative - hidden on mobile for speed */}
          <div className="pointer-events-none hidden md:block absolute -top-24 left-1/2 -translate-x-1/2 size-[400px] rounded-full bg-[#dbeafe] dark:bg-[#1e3a5f]/10 blur-[50px]" />
          <div className="pointer-events-none hidden md:block absolute -bottom-24 -right-24 size-[200px] rounded-full bg-[#fef3c7] dark:bg-[#78350f]/5 blur-[40px]" />

          <div className="container relative mx-auto max-w-[800px] px-6 py-14 lg:py-20 flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#eff6ff] dark:bg-[#1e293b] border border-[#dbeafe] dark:border-[#334155] px-4 py-1.5 text-[11px] font-black tracking-wide text-[#2563eb] dark:text-[#60a5fa]">
              <span className="size-1.5 rounded-full bg-[#2563eb]" />
              منصة تعليمية عصرية • مجانية 100%
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
              <Link to="/about" className="inline-flex items-center gap-2 rounded-full border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] px-7 py-3 text-[14px] font-bold text-[#0f172a] dark:text-white hover:bg-[#f8fafc] dark:hover:bg-[#334155] transition-colors">
                اعرف المزيد
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
                  <Star className="size-3 fill-[#f59e0b] text-[#f59e0b]" /> 4.9 • منصة مجانية
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
                  <h3 className="mt-3 font-black text-[12px] text-[#0f172a] dark:text-white">{card.title}</h3>
                  <p className="mt-1 text-[11px] text-[#64748b] dark:text-[#94a3b8]">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Course Category - BEFORE subscription - content-visibility for speed */}
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

            <div className="mt-12">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-[16px] text-[#0f172a] dark:text-white">أحدث المقالات</h3>
                <Link to="/articles" className="text-[12px] font-bold text-[#2563eb] hover:underline flex items-center gap-1">عرض الكل <ArrowRight className="size-3 rtl:rotate-180" /></Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {latestArticles.slice(0, 4).map((item) => (
                  <Link key={item.id} to={`/articles/${item.slug}`} className="group bg-white dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] rounded-2xl overflow-hidden hover:shadow-sm transition-all">
                    <div className="aspect-[16/10] bg-[#f1f5f9] dark:bg-[#334155] overflow-hidden">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                          width={320}
                          height={200}
                        />
                      ) : (
                        <div className="w-full h-full grid place-items-center"><BookOpen className="size-8 text-[#94a3b8]" /></div>
                      )}
                    </div>
                    <div className="p-4">
                      <span className="inline-block bg-[#eff6ff] dark:bg-[#1e3a5f] text-[#2563eb] dark:text-[#60a5fa] text-[10px] font-bold px-2 py-0.5 rounded-full border">{item.category || "قانون"}</span>
                      <h4 className="mt-2 font-bold text-[13px] leading-snug line-clamp-2 text-[#0f172a] dark:text-white">{item.title}</h4>
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

        {/* Pricing */}
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

        {/* Why Choose Us */}
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

        {/* Stats - lightweight, no animation */}
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
