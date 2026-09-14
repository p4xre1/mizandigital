import { useMemo } from "react"
import { Link } from "react-router-dom"
import {
  GraduationCap,
  Shuffle,
  ShieldCheck,
  BriefcaseBusiness,
  Compass,
  Sparkles,
  Trophy,
  Flame,
  ArrowLeft,
  BookOpen,
} from "lucide-react"
import { SEOHead } from "../../../components/seo/SEOHead"
import { generateBreadcrumbSchema } from "../../../lib/seo/schema"
import { TierCard } from "../../../components/quiz/TierCard"
import { RankBadge } from "../../../components/quiz/RankBadge"
import { XpBar } from "../../../components/quiz/XpBar"
import { useQuizProgress } from "../../../hooks/useQuizProgress"
import { useQuizQuestions } from "../../../hooks/useQuizQuestions"
import { BADGE_BY_ID } from "../../../lib/quiz/ranks"

/**
 * مركز الاختبارات (/quiz) — البوابة الموحّدة للمسارات الأربعة:
 * الكلية، العشوائي، المباريات، المقابلات، إضافة إلى اختبار تحديد المستوى.
 */
export function QuizHubPage() {
  const { questions, loading } = useQuizQuestions()
  const { rank, rankProgress, stats, xp, credits, badges, streakDays, placementCompleted } = useQuizProgress()

  const counts = useMemo(() => {
    const result = { university: 0, general: 0, concours: 0, interview: 0 }
    questions.forEach((question) => {
      if (question.tier in result) result[question.tier as keyof typeof result] += 1
    })
    return result
  }, [questions])

  const schema = [
    generateBreadcrumbSchema([
      { name: "الرئيسية", url: "/" },
      { name: "الاختبارات القانونية", url: "/quiz" },
    ]),
    {
      "@type": "ItemList",
      name: "مسارات الاختبارات القانونية في ميزان",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "اختبارات طلبة الكلية (S1 إلى S6)" },
        { "@type": "ListItem", position: 2, name: "الاختبار العشوائي العام" },
        { "@type": "ListItem", position: 3, name: "اختبارات المباريات المهنية" },
        { "@type": "ListItem", position: 4, name: "اختبارات المقابلات والتداريب" },
      ],
    },
  ]

  return (
    <main className="container-wide py-10" dir="rtl">
      <SEOHead
        title="الاختبارات القانونية — 4 مسارات للكلية والمباريات والمقابلات"
        description="اختبر نفسك في القانون المغربي عبر أربعة مسارات: اختبارات طلبة الكلية من S1 إلى S6، اختبار عشوائي للثقافة القانونية، مباريات الأمن الوطني والقضاء والوظيفة العمومية، وتدريبات المقابلات المهنية."
        canonicalUrl="https://www.mizan.page/quiz"
        keywords={["اختبارات قانونية", "مباريات الأمن الوطني", "اختبارات القانون المغربي", "concours Maroc", "تدريب محاماة"]}
        schema={schema}
      />

      {/* الترويسة */}
      <section className="rounded-3xl border border-border bg-gradient-to-l from-primary/10 via-card to-accent-gold/10 p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-gold/40 bg-accent-gold/10 px-3 py-1 text-[11px] font-extrabold text-accent-gold">
              <Sparkles className="size-3.5" aria-hidden="true" />
              نظام الاختبارات الرباعي
            </span>
            <h1 className="mt-3 text-2xl font-black leading-tight text-foreground sm:text-3xl">
              اختبر نفسك في القانون المغربي… وارفع رتبتك
            </h1>
            <p className="mt-3 text-[14px] leading-7 text-muted-foreground">
              أربعة مسارات مصمّمة لغايات مختلفة: تحضير امتحانات الكلية، كسر ملل المراجعة بأسئلة عامة،
              التدريب على صيغة المباريات المهنية الحقيقية، والتأهيل العملي لمقابلات التدريب والعمل.
              كل إجابة صحيحة تمنحك نقاط خبرة (XP) وترقّيك من الرتبة D حتى SSS.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                to="/quiz/placement"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-extrabold text-primary-foreground transition hover:opacity-90"
              >
                <Compass className="size-4" aria-hidden="true" />
                {placementCompleted ? "إعادة اختبار تحديد المستوى" : "حدد مستواك في 5 دقائق"}
              </Link>
              <Link
                to="/quiz/general"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-[13px] font-extrabold text-foreground transition hover:border-primary/50"
              >
                <Shuffle className="size-4" aria-hidden="true" />
                اختبار عشوائي سريع
              </Link>
            </div>
          </div>

          {/* لوحة تقدّم المستخدم */}
          <div className="w-full rounded-2xl border border-border bg-card p-5 lg:w-80">
            <div className="mb-4 flex items-center justify-between">
              <RankBadge rank={rank} />
              {streakDays > 1 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-1 text-[11px] font-extrabold text-orange-600 dark:text-orange-400">
                  <Flame className="size-3" aria-hidden="true" />
                  {streakDays} أيام
                </span>
              )}
            </div>

            <XpBar rankProgress={rankProgress} xp={xp} credits={credits} />

            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { label: "اختبارات", value: stats.totalAttempts },
                { label: "أسئلة", value: stats.answeredQuestions },
                { label: "دقة", value: `%${stats.accuracy}` },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border bg-background p-2">
                  <dt className="text-[10px] font-bold text-muted-foreground">{item.label}</dt>
                  <dd className="text-sm font-extrabold text-foreground" dir="ltr">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>

            {badges.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="mb-2 text-[11px] font-extrabold text-muted-foreground">أوسمتي</p>
                <div className="flex flex-wrap gap-1.5">
                  {badges.slice(0, 6).map((badgeId) => {
                    const badge = BADGE_BY_ID.get(badgeId)
                    if (!badge) return null
                    return (
                      <span key={badgeId} title={badge.description} className="text-base" aria-label={badge.label}>
                        {badge.icon}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* المسارات الأربعة */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-extrabold text-foreground">اختر مسارك</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TierCard
            to="/quiz/university"
            icon={GraduationCap}
            title="اختبارات طلبة الكلية"
            tagline="من S1 إلى S6"
            description="أسئلة دقيقة مرتبطة بالمقررات الجامعية الرسمية: القانون المدني، الجنائي، الإداري، الدستوري، المساطر، الشغل، والأسرة."
            features={["مصنّفة حسب الفصل والمادة", "شروح مستوحاة من الدروس الجامعية", "مثالية قبل امتحانات الفصل"]}
            questionCount={counts.university}
            accent="bg-primary/10 text-primary"
            badge="الأكثر استخداماً"
          />
          <TierCard
            to="/quiz/general"
            icon={Shuffle}
            title="الاختبار العشوائي العام"
            tagline="تسلية معرفية ونقاط خبرة"
            description="أسئلة متنوعة تظهر عشوائياً. أجب فتجمع النقاط، وأخطئ فيُظهر لك النظام الإجابة الصحيحة مع شرح مبسط ومفاجئ."
            features={["ثقافة قانونية عامة", "شرح فوري بعد كل سؤال", "بلا حساب ولا إعداد"]}
            questionCount={counts.general}
            accent="bg-emerald-500/10 text-emerald-600"
          />
          <TierCard
            to="/quiz/concours"
            icon={ShieldCheck}
            title="اختبارات المباريات المهنية"
            tagline="الأمن الوطني · القضاء · الوظيفة العمومية"
            description="أسئلة تخصصية بصيغة الامتحانات الرسمية السابقة، مع عدّاد زمني يحاكي ظروف المباراة الحقيقية."
            features={["مباريات الشرطة والقوات المساعدة", "القضاء وكتابة الضبط", "وضع مؤقّت كالمباراة الفعلية"]}
            questionCount={counts.concours}
            accent="bg-amber-500/10 text-amber-600"
          />
          <TierCard
            to="/quiz/interview"
            icon={BriefcaseBusiness}
            title="مقابلات التدريب والعمل"
            tagline="تدريب · وظيفة · أخلاقيات المهنة"
            description="مواقف عملية وأسئلة مقابلات حقيقية لتأكيد جاهزيتك للعمل في مكاتب المحاماة والشركات والمؤسسات."
            features={["مواقف تطبيقية من الواقع المهني", "أخلاقيات المهنة وتضارب المصالح", "مراجعة العقود والافتحاص"]}
            questionCount={counts.interview}
            accent="bg-sky-500/10 text-sky-600"
          />
        </div>
      </section>

      {/* كيف يعمل النظام */}
      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          {
            icon: Trophy,
            title: "نقاط الخبرة والرتب",
            text: "كل إجابة صحيحة تمنح نقاطاً، والسرعة والتتالي يضاعفانها. تتدرج من الرتبة D حتى SSS، وكل رتبة تفتح صلاحيات أوسع.",
          },
          {
            icon: BookOpen,
            title: "التعلم من الخطأ",
            text: "الخطأ لا يعاقبك: النظام يشرح لك الإجابة الصحيحة مع سندها القانوني فوراً، فتتحول الغلطة إلى معلومة ثابتة.",
          },
          {
            icon: Sparkles,
            title: "بروفايل عام يشهد لك",
            text: "أنشئ اسم مستخدم واحصل على رابط عام يبرز رتبتك وإحصاءاتك — وشارك بطاقة نتيجتك على واتساب ولينكد إن.",
          },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-border bg-card p-5">
            <span className="mb-3 grid size-10 place-items-center rounded-xl bg-muted text-primary">
              <item.icon className="size-5" aria-hidden="true" />
            </span>
            <h3 className="text-[15px] font-extrabold text-foreground">{item.title}</h3>
            <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </section>

      <p className="mt-8 rounded-2xl border border-border bg-card p-4 text-[12px] leading-6 text-muted-foreground">
        <strong className="font-extrabold text-foreground">تنبيه:</strong> أسئلة المنصة مُعدّة لأغراض
        تعليمية وتدريبية انطلاقاً من النصوص القانونية المغربية الجاري بها العمل، وهي لا تُغني عن مراجعة
        النص الرسمي المنشور في الجريدة الرسمية ولا عن استشارة قانونية متخصصة.
        {loading && " جارٍ تحميل بنك الأسئلة..."}
      </p>

      <div className="mt-6">
        <Link
          to="/profile"
          className="inline-flex items-center gap-2 text-[13px] font-extrabold text-primary transition hover:gap-3"
        >
          إعداد ملفي الشخصي ورابطي العام
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </main>
  )
}
