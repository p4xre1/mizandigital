import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Compass, Play, ArrowRight, Clock, Sparkles, CreditCard, AlertCircle, CheckCircle2 } from "lucide-react"
import { SEOHead } from "../../../components/seo/SEOHead"
import { canonicalFor } from "@/lib/canonical"
import { generateBreadcrumbSchema } from "../../../lib/seo/schema"
import { QuizRunner } from "../../../components/quiz/QuizRunner"
import { RankBadge } from "../../../components/quiz/RankBadge"
import { useQuizQuestions } from "../../../hooks/useQuizQuestions"
import { useQuizProgress } from "../../../hooks/useQuizProgress"
import { buildPlacementPool } from "../../../lib/quiz/engine"
import { saveAttempt } from "../../../lib/quiz/repository"
import { getRankDefinition } from "../../../lib/quiz/ranks"

/** تكلفة تجاوز اختبار التحديد (بالكريدتس) والرتبة الممنوحة مقابلها. */
const SKIP_COST = 150
const SKIP_RANK = "A"
const PLACEMENT_XP_GRANT = 60

/**
 * اختبار تحديد المستوى (/quiz/placement) على طريقة تطبيقات تعلّم اللغات:
 * 15 سؤالاً ممزوجة تتدرج من الأسهل إلى الأصعب، وتُتوج برتبة ابتدائية.
 * المحامون والخبراء (من لا وقت لديهم) يمكنهم تجاوزه مقابل الكريدتس.
 */
export function PlacementQuizPage() {
  const { questions } = useQuizQuestions("placement")
  const { profile, credits, placementCompleted, placementRank, rank, payToSkipPlacement } = useQuizProgress()

  const [started, setStarted] = useState(false)
  const [skipError, setSkipError] = useState<string | null>(null)
  const [skipDone, setSkipDone] = useState(false)

  const pool = useMemo(() => buildPlacementPool(questions), [questions])

  const handleSkip = () => {
    setSkipError(null)
    const ok = payToSkipPlacement(SKIP_RANK, getRankDefinition(SKIP_RANK).minXp, SKIP_COST)
    if (!ok) {
      setSkipError(
        `تحتاج إلى ${SKIP_COST} كريدت لتجاوز الاختبار (رصيدك الحالي: ${credits}). اجمع الكريدتس من الاختبارات القصيرة ثم عد.`
      )
      return
    }
    setSkipDone(true)
  }

  if (started) {
    return (
      <main className="container-wide py-10" dir="rtl">
        <SEOHead title="اختبار تحديد المستوى" description="15 سؤالاً تحدد رتبتك الابتدائية في ميزان." />
        <QuizRunner
          questions={pool}
          mode="placement"
          label="اختبار تحديد المستوى"
          tier="mixed"
          questionCount={Math.min(15, pool.length)}
          placement
          onExit={() => setStarted(false)}
          onComplete={(attempt) => void saveAttempt(attempt, profile?.username ?? null)}
        />
      </main>
    )
  }

  return (
    <main className="container-wide py-10" dir="rtl">
      <SEOHead
        title="اختبار تحديد المستوى — حدد رتبتك في 5 دقائق"
        description="15 سؤالاً متدرجة تحدد مستواك الابتدائي في القانون المغربي وتمنحك الرتبة التي تناسبك. يمكنك أيضاً تجاوزه مقابل الكريدتس إن كنت محامياً أو خبيراً."
        canonicalUrl={canonicalFor("/quiz/placement")}
        keywords={["تحديد المستوى القانوني", "placement test law", "رتبة ميزان"]}
        schema={[
          generateBreadcrumbSchema([
            { name: "الرئيسية", url: "/" },
            { name: "الاختبارات", url: "/quiz" },
            { name: "تحديد المستوى", url: "/quiz/placement" },
          ]),
        ]}
      />

      <div className="mb-6 flex items-center gap-2 text-[12.5px] font-bold text-muted-foreground">
        <Link to="/quiz" className="hover:text-foreground">
          الاختبارات
        </Link>
        <ArrowRight className="size-3.5" aria-hidden="true" />
        <span className="text-foreground">تحديد المستوى</span>
      </div>

      <header className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <span className="mb-3 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Compass className="size-5" strokeWidth={2.2} />
        </span>
        <h1 className="text-2xl font-black text-foreground">اختبار تحديد المستوى</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-7 text-muted-foreground">
          خمسة عشر سؤالاً فقط تكفي ليرسم النظام صورة دقيقة عن مستواك: نبدأ بأسئلة سهلة في الثقافة
          القانونية، ثم نصعد تدريجياً حتى نصل إلى مستوى مباريات القضاء. في النهاية تمنحك المنصة
          الرتبة الابتدائية المناسبة وتبني عليها.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Clock, title: "5 دقائق", text: "15 سؤالاً متدرجة بلا عدّاد زمني — خذ وقتك في التفكير." },
            { icon: Sparkles, title: "رتبة ابتدائية فورية", text: "من D إلى A بحسب نتيجتك، وتُبنى عليها كل الاختبارات اللاحقة." },
            { icon: CreditCard, title: "خيار التجاوز", text: `للمحامين والخبراء: تجاوز الاختبار مقابل ${SKIP_COST} كريدت.` },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-background p-4">
              <item.icon className="mb-2 size-4 text-primary" aria-hidden="true" />
              <p className="text-[13px] font-extrabold text-foreground">{item.title}</p>
              <p className="mt-1 text-[12px] leading-6 text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>

        {placementCompleted && !skipDone && (
          <p className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-background p-3 text-[12.5px] font-bold text-muted-foreground">
            <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
            أجريت هذا الاختبار سابقاً
            {placementRank && <> وحصلت على الرتبة {placementRank}</>}
            . رتبتك الحالية الآن:
            <span className="text-foreground"> {rank.id} ({rank.label})</span>
          </p>
        )}

        {skipDone && (
          <p className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-[12.5px] font-bold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            تم التجاوز: خُصم {SKIP_COST} كريدت ومُنحت الرتبة {SKIP_RANK} ({getRankDefinition(SKIP_RANK).label}) مباشرة.
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={pool.length === 0}
            onClick={() => setStarted(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[14px] font-extrabold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="size-4" aria-hidden="true" />
            ابدأ اختبار التحديد
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-3 text-[13.5px] font-extrabold text-foreground transition hover:border-accent-gold/60"
          >
            <CreditCard className="size-4" aria-hidden="true" />
            تجاوز الاختبار ({SKIP_COST} كريدت)
          </button>

          <span className="text-[12px] font-semibold text-muted-foreground">رصيدك: {credits} كريدت</span>
        </div>

        {skipError && (
          <p className="mt-3 flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-[12.5px] font-bold text-rose-700 dark:text-rose-300">
            <AlertCircle className="size-4" aria-hidden="true" />
            {skipError}
          </p>
        )}
      </header>

      <section className="mt-6 rounded-3xl border border-border bg-card p-6">
        <h2 className="text-[15px] font-extrabold text-foreground">سلم الرتب بعد التحديد</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(["D", "C", "B", "A"] as const).map((rankId) => {
            const definition = getRankDefinition(rankId)
            return (
              <div key={rankId} className="rounded-2xl border border-border bg-background p-4">
                <RankBadge rank={definition} size="sm" />
                <p className="mt-2 text-[12px] leading-6 text-muted-foreground">{definition.description}</p>
                <p className="mt-1.5 text-[11px] font-bold text-muted-foreground" dir="ltr">
                  من {definition.minXp} XP
                </p>
              </div>
            )
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
          <p className="text-[12.5px] leading-7 text-amber-900 dark:text-amber-100">
            <span className="font-black">تنبيه:</span> أسئلة المنصة مُعدّة لأغراض تعليمية وتدريبية انطلاقاً من النصوص القانونية المغربية الجاري بها العمل، وهي لا تُغني عن مراجعة النص الرسمي المنشور في الجريدة الرسمية ولا عن استشارة قانونية متخصصة.
          </p>
        </div>
      </section>
    </main>
  )
}
