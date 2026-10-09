import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, BookMarked, CheckCircle2, Play } from "lucide-react"
import { SEOHead } from "../../../components/seo/SEOHead"
import { QuizRunner } from "../../../components/quiz/QuizRunner"
import { useQuizQuestions } from "../../../hooks/useQuizQuestions"
import { useQuizProgress } from "../../../hooks/useQuizProgress"
import { saveAttempt } from "../../../lib/quiz/repository"
import { getDueQuestionIds, todayInMorocco } from "../../../lib/learning/reviewStore"

/** أقصى عدد أسئلة في جلسة مراجعة واحدة. */
const SESSION_LIMIT = 20

/**
 * مراجعة اليوم (/quiz/review): الأسئلة التي حان موعد مراجعتها حسب
 * التكرار المتباعد (SM-2). الخطأ يعيد السؤال غداً، والإجابة الصحيحة تؤجّله أبعد.
 * الصفحة شخصية ولا تُفهرس.
 */
export function ReviewQuizPage() {
  const { questions, loading } = useQuizQuestions()
  const { profile } = useQuizProgress()
  const [started, setStarted] = useState(false)

  // نحسب المستحقّ مرة واحدة عند فتح الصفحة (الترتيب: الأكثر تأخراً أولاً)
  const today = useMemo(() => todayInMorocco(), [])
  const dueQuestions = useMemo(() => {
    const byId = new Map(questions.map((q) => [q.id, q]))
    return getDueQuestionIds(today)
      .map((id) => byId.get(id))
      .filter((q): q is NonNullable<typeof q> => Boolean(q))
  }, [questions, today])

  if (started && dueQuestions.length > 0) {
    return (
      <main className="container-wide py-10" dir="rtl">
        <SEOHead title="مراجعة اليوم" description="مراجعة الأسئلة المستحقة حسب التكرار المتباعد." noindex />
        <QuizRunner
          questions={dueQuestions}
          mode="general"
          label="مراجعة اليوم"
          tier="mixed"
          questionCount={Math.min(SESSION_LIMIT, dueQuestions.length)}
          onExit={() => setStarted(false)}
          onComplete={(attempt) => void saveAttempt(attempt, profile?.username ?? null)}
        />
      </main>
    )
  }

  return (
    <main className="container-wide py-10" dir="rtl">
      <SEOHead
        title="مراجعة اليوم — التكرار المتباعد"
        description="الأسئلة التي حان موعد مراجعتها اليوم."
        noindex
      />

      <div className="mb-6 flex items-center gap-2 text-[12.5px] font-bold text-muted-foreground">
        <Link to="/quiz" className="hover:text-foreground">
          الاختبارات
        </Link>
        <ArrowRight className="size-3.5" aria-hidden="true" />
        <span className="text-foreground">مراجعة اليوم</span>
      </div>

      <header className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <span className="mb-3 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <BookMarked className="size-5" strokeWidth={2.2} />
        </span>
        <h1 className="text-2xl font-black text-foreground">مراجعة اليوم</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-7 text-muted-foreground">
          هذه الأسئلة أجبت عنها من قبل، وحان الآن وقت مراجعتها حتى لا تنساها. الإجابة الصحيحة تؤجّل
          السؤال إلى موعد أبعد، والخطأ يعيده غداً. تُحسب هذه الجدولة على جهازك فقط.
        </p>

        {loading && dueQuestions.length === 0 ? (
          <p className="mt-6 text-[13px] font-semibold text-muted-foreground">جارٍ تحميل الأسئلة...</p>
        ) : dueQuestions.length === 0 ? (
          <p className="mt-6 flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-[13px] font-bold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            لا توجد أسئلة مستحقة للمراجعة اليوم. أجب عن أسئلة جديدة وستظهر هنا في موعد مراجعتها.
          </p>
        ) : (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <p className="text-[13px] font-extrabold text-foreground">
              {dueQuestions.length} سؤالاً مستحقاً
              {dueQuestions.length > SESSION_LIMIT && <> — سنبدأ بأول {SESSION_LIMIT}</>}
            </p>
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[14px] font-extrabold text-primary-foreground transition hover:opacity-90"
            >
              <Play className="size-4" aria-hidden="true" />
              ابدأ المراجعة
            </button>
          </div>
        )}
      </header>
    </main>
  )
}
