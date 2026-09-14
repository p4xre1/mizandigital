import { useState } from "react"
import { Link } from "react-router-dom"
import { Shuffle, Play, ArrowRight, Sparkles, Zap, Gift } from "lucide-react"
import { SEOHead } from "../../../components/seo/SEOHead"
import { generateBreadcrumbSchema } from "../../../lib/seo/schema"
import { QuizRunner } from "../../../components/quiz/QuizRunner"
import { useQuizQuestions } from "../../../hooks/useQuizQuestions"
import { useQuizProgress } from "../../../hooks/useQuizProgress"
import { saveAttempt } from "../../../lib/quiz/repository"
import { XP } from "../../../lib/quiz/engine"

const COUNTS = [5, 10, 15]

/**
 * الاختبار العشوائي العام (/quiz/general):
 * تسلية معرفية تكسر ملل المراجعة — أسئلة متنوعة تظهر عشوائياً، والخطأ
 * يُكافأ بشرح مبسط ومفاجئ بدل أن يُعاقب.
 */
export function GeneralQuizPage() {
  const { questions } = useQuizQuestions("general")
  const { recentQuestionIds, profile } = useQuizProgress()
  const [count, setCount] = useState(10)
  const [started, setStarted] = useState(false)

  if (started) {
    return (
      <main className="container-wide py-10" dir="rtl">
        <SEOHead title="الاختبار العشوائي العام" description="أسئلة ثقافة قانونية متنوعة مع شروح مبسطة ومفاجئة." />
        <QuizRunner
          questions={questions}
          mode="general"
          label="الاختبار العشوائي العام"
          tier="general"
          questionCount={Math.min(count, questions.length)}
          excludeIds={recentQuestionIds}
          onExit={() => setStarted(false)}
          onComplete={(attempt) => void saveAttempt(attempt, profile?.username ?? null)}
        />
      </main>
    )
  }

  return (
    <main className="container-wide py-10" dir="rtl">
      <SEOHead
        title="الاختبار العشوائي العام — ثقافة قانونية ونقاط خبرة"
        description="أسئلة قانونية متنوعة تظهر عشوائياً: أجب فتجمع نقاط الخبرة، وأخطئ فيمنحك النظام الإجابة الصحيحة مع شرح مبسط ومفاجئ. بلا حساب ولا إعداد."
        canonicalUrl="https://www.mizan.page/quiz/general"
        keywords={["اختبار ثقافة قانونية", "أسئلة قانونية متنوعة", "نقاط الخبرة", "تعلم القانون"]}
        schema={[
          generateBreadcrumbSchema([
            { name: "الرئيسية", url: "/" },
            { name: "الاختبارات", url: "/quiz" },
            { name: "الاختبار العشوائي", url: "/quiz/general" },
          ]),
        ]}
      />

      <div className="mb-6 flex items-center gap-2 text-[12.5px] font-bold text-muted-foreground">
        <Link to="/quiz" className="hover:text-foreground">
          الاختبارات
        </Link>
        <ArrowRight className="size-3.5" aria-hidden="true" />
        <span className="text-foreground">الاختبار العشوائي</span>
      </div>

      <header className="rounded-3xl border border-border bg-gradient-to-l from-emerald-500/10 via-card to-primary/5 p-6">
        <span className="mb-3 grid size-11 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
          <Shuffle className="size-5" strokeWidth={2.2} />
        </span>
        <h1 className="text-2xl font-black text-foreground">الاختبار العشوائي العام</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-7 text-muted-foreground">
          استراحة ذكية بين فقرات المراجعة: أسئلة متنوعة من الثقافة القانونية المغربية والعامة تظهر
          عشوائياً. أجب فتحصد نقاط الخبرة، وإن أخطأت فلا حرج — النظام يكشف لك الإجابة الصحيحة مع شرح
          مبسط ومفاجئ يجعل المعلومة تلتصق بذاكرتك.
        </p>
      </header>

      {/* قواعد النقاط */}
      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { icon: Sparkles, title: `${XP.correct} نقاط لكل إجابة صحيحة`, text: "تزيد بحسب مستوى صعوبة السؤال (سهل / متوسط / صعب)." },
          { icon: Zap, title: `+${XP.fastBonus} مكافأة السرعة`, text: `أجب في أقل من ${XP.fastMs / 1000} ثوانٍ لتحصل على مكافأة إضافية.` },
          { icon: Gift, title: `+${XP.perfect} مكافأة العلامة الكاملة`, text: `ومكافأة إتمام ثابتة ${XP.completion} نقطة لكل اختبار تكمله.` },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-border bg-card p-4">
            <item.icon className="mb-2 size-4 text-emerald-600" aria-hidden="true" />
            <p className="text-[13px] font-extrabold text-foreground">{item.title}</p>
            <p className="mt-1 text-[12px] leading-6 text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </section>

      {/* الإعداد والبدء */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-extrabold text-foreground">عدد الأسئلة</p>
            <p className="mt-1 text-[12px] font-semibold text-muted-foreground">
              {questions.length} سؤالاً متاحاً في بنك الأسئلة العامة
            </p>
          </div>
          <div className="flex gap-2">
            {COUNTS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCount(item)}
                className={`rounded-xl border px-3.5 py-2 text-[13px] font-extrabold transition ${
                  count === item
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={questions.length === 0}
          onClick={() => setStarted(true)}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-[14px] font-extrabold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play className="size-4" aria-hidden="true" />
          ابدأ الاختبار العشوائي
        </button>
      </section>
    </main>
  )
}
