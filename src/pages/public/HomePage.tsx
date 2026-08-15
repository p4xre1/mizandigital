import { Link } from "react-router-dom"
import { SEOHead } from "../../components/seo/SEOHead"
import {
  BookOpen,
  Scale,
  GraduationCap,
  Newspaper,
  Calendar,
  Search,
  ArrowLeft,
  ShieldCheck,
  FileText,
  Sparkles,
  Users,
  CheckCircle2
} from "lucide-react"

export function HomePage() {
  // Enhanced Schema: WebSite + Organization JSON-LD
  const homepageSchemas = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "منصة الميزان الرقمية",
      "alternateName": "Mizan Digital Platform",
      "url": "https://www.mizan.page",
      "description": "المنصة الرقمية الأولى للعلوم القانونية والتشريع المغربي، توفر الأرشيف الدراسي والمعجم القانوني ودليل الكليات.",
      "inLanguage": "ar-MA",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://www.mizan.page/lexicon?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "منصة الميزان الرقمية",
      "url": "https://www.mizan.page",
      "logo": "https://www.mizan.page/og-default.jpg",
      "sameAs": []
    }
  ]

  return (
    <>
      <SEOHead
        title="الرئيسية - المرفق القانوني الأول بالمغرب"
        description="منصة الميزان الرقمية توفر الأرشيف الدراسي، والمدونة الشاملة، والمعجم القانوني المغربي الموحد، ودليل كليات الحقوق للطلبة والمهنيين."
        keywords={[
          "القانون المغربي",
          "منصة الميزان الرقمية",
          "الأرشيف القانوني المغربي",
          "مدونة الشغل المغربية",
          "المعجم القانوني المغربي",
          "كليات الحقوق بالمغرب"
        ]}
        schema={homepageSchemas}
      />

      <main className="min-h-screen bg-background text-foreground" dir="rtl">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/5 via-background to-background py-16 md:py-24">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="mx-auto max-w-3xl text-center">
              

              {/* Title */}
              <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-5xl md:text-6xl leading-tight">
                مرجعك الأول في <span className="text-primary">القانون المغربي</span> والأرشيف الأكاديمي
              </h1>

              {/* Subtitle */}
              <p className="mt-6 text-base text-muted-foreground sm:text-lg leading-relaxed max-w-2xl mx-auto">
               نوفر للطلبة والباحثين والمهنيين أرشيفاً دراسياً كاملاً، معجماً قانونياً شاملاً، ومتابعة حية للمستجدات التشريعية.
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  to="/lexicon"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-md transition hover:opacity-90 hover:shadow-lg"
                >
                  <BookOpen size={18} />
                  <span>تصفح المعجم القانوني</span>
                </Link>

                <Link
                  to="/schools"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-bold text-foreground transition hover:bg-muted"
                >
                  <GraduationCap size={18} />
                  <span>دليل كليات الحقوق</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Access Services Grid */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-black text-foreground sm:text-3xl">
                خدمات منصة الميزان الرقمية
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                كل ما يحتاجه طالب القانون والمهني في مكان واحد
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1: Lexicon */}
              <Link
                to="/lexicon"
                className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:border-primary/50 hover:shadow-md"
              >
                <div>
                  <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition">
                    <BookOpen size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition">
                    المعجم القانوني
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    قاموس موحد للمصطلحات والمفاهيم القانونية باللغتين العربية والفرنسية مع الشرح والمراجع.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border flex items-center text-xs font-bold text-primary gap-1">
                  <span>تصفح المصطلحات</span>
                  <ArrowLeft size={14} />
                </div>
              </Link>

              {/* Card 2: Schools */}
              <Link
                to="/schools"
                className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:border-primary/50 hover:shadow-md"
              >
                <div>
                  <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition">
                    <GraduationCap size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition">
                    دليل الجامعات والكليات
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    دليل كليات العلوم القانونية والاقتصادية والاجتماعية (FSJES) عبر مختلف مدن المملكة.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border flex items-center text-xs font-bold text-primary gap-1">
                  <span>استكشف الكليات</span>
                  <ArrowLeft size={14} />
                </div>
              </Link>

              {/* Card 3: News & Articles */}
              <Link
                to="/news"
                className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:border-primary/50 hover:shadow-md"
              >
                <div>
                  <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition">
                    <Newspaper size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition">
                    الأخبار والمدونة
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    مستجدات الجريدة الرسمية، التحليلات التشريعية، والدراسات الأكاديمية المعمقة.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border flex items-center text-xs font-bold text-primary gap-1">
                  <span>قراءة المقالات</span>
                  <ArrowLeft size={14} />
                </div>
              </Link>

              {/* Card 4: Seminars & Events */}
              <Link
                to="/events"
                className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:border-primary/50 hover:shadow-md"
              >
                <div>
                  <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition">
                    <Calendar size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition">
                    الندوات والأيام الدراسية
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    متابعة المؤتمرات والندوات العلمية والأنشطة الأكاديمية في مختلف كليات المغرب.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border flex items-center text-xs font-bold text-primary gap-1">
                  <span>جدول الندوات</span>
                  <ArrowLeft size={14} />
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Value Proposition / Why Mizan Section */}
        <section className="py-16 border-t border-border">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-card">
                <div className="rounded-lg bg-primary/10 p-3 text-primary shrink-0">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-base">محتوى موثوق ومراجع</h4>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    مادة علمية قانونية مطابقة للتشريعات المغربية النافذة والاجتهادات القضائية.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-card">
                <div className="rounded-lg bg-primary/10 p-3 text-primary shrink-0">
                  <Search size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-base">بحث سريع وذكي</h4>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    محرك بحث متطور يدعم إزالة التشكيل والتطويل للوصول السريع للنصوص والمصطلحات.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-card">
                <div className="rounded-lg bg-primary/10 p-3 text-primary shrink-0">
                  <Users size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-base">مجتمع أكاديمي موحد</h4>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    ربط طلبة القانون والباحثين بمستجدات الجامعات والمؤسسات القانونية بالمغرب.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Counter Banner */}
        <section className="py-12 bg-primary text-primary-foreground">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl font-black sm:text-4xl">+10,000</div>
                <div className="mt-1 text-xs opacity-90 font-medium">مستفيد ومتابع</div>
              </div>
              <div>
                <div className="text-3xl font-black sm:text-4xl">+1,500</div>
                <div className="mt-1 text-xs opacity-90 font-medium">مصطلح قانوني موحد</div>
              </div>
              <div>
                <div className="text-3xl font-black sm:text-4xl">+25</div>
                <div className="mt-1 text-xs opacity-90 font-medium">كلية ومؤسسة جامعية</div>
              </div>
              <div>
                <div className="text-3xl font-black sm:text-4xl">100%</div>
                <div className="mt-1 text-xs opacity-90 font-medium">محتوى مفتوح ومجانى</div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}