import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  Lightbulb,
  SkipForward,
  XCircle,
  Zap,
} from "lucide-react"
import type { QuizAttempt, QuizMode, QuizQuestion } from "@/types/quiz"
import {
  DIFFICULTY_LABEL,
  buildAttempt,
  gradeAnswer,
  pickQuestions,
  placementRankForScore,
  summarizeSession,
  type GradedAnswer,
} from "@/lib/quiz/engine"
import { useQuizProgress } from "@/hooks/useQuizProgress"
import { getRankForXp } from "@/lib/quiz/ranks"
import { QuizResultPanel } from "./QuizResultPanel"

/**
 * محرّك تشغيل الاختبار (Quiz Runner).
 *
 * مسؤولياته: بناء الجلسة، عرض سؤال واحد في كل مرة، التصحيح الفوري مع الشرح،
 * حساب النقاط، ثم عرض شاشة النتيجة. وهو مشترك بين المسارات الأربعة
 * (الكلية، العشوائي، المباريات، المقابلات) وبين اختبار تحديد المستوى —
 * الاختلاف كله في المعاملات (props) لا في المنطق.
 *
 * قرار تصميمي: التصحيح "فوري" بعد كل سؤال لا في النهاية فقط، لأن الهدف
 * تعليمي — المستخدم يرى الشرح وهو ما زال متفاعلاً مع الدافع الذي جعله يخطئ.
 */
export interface QuizRunnerProps {
  /** مخزون الأسئلة المتاح لهذا المسار (بعد الفلترة). */
  questions: QuizQuestion[]
  mode: QuizMode
  /** عنوان الجلسة الظاهر للمستخدم وفي سجل المحاولات. */
  label: string
  tier: QuizAttempt["tier"]
  /** عدد أسئلة الجلسة (10 افتراضياً، أو 15 لاختبار التحديد). */
  questionCount?: number
  /** معرّفات الأسئلة المشاهدة مؤخراً — تُؤجَّل لتنويع الجلسة. */
  excludeIds?: string[]
  /** عدّاد تنازلي بالثواني لكل سؤال (أسلوب المباريات المهنية). */
  secondsPerQuestion?: number
  /** وضع اختبار التحديد: يمنح رتبة ابتدائية بدل النقاط الاعتيادية فقط. */
  placement?: boolean
  onExit: () => void
  /** يُستدعى مرة واحدة عند اكتمال الجلسة (لمزامنة سحابية أو تحليلات). */
  onComplete?: (attempt: QuizAttempt) => void
}

export function QuizRunner({
  questions,
  mode,
  label,
  tier,
  questionCount = 10,
  excludeIds = [],
  secondsPerQuestion,
  placement = false,
  onExit,
  onComplete,
}: QuizRunnerProps) {
  const { progress, submitAttempt, finishPlacement, rankProgress, profile } = useQuizProgress()

  const [session, setSession] = useState<QuizQuestion[]>(() =>
    pickQuestions(questions, { count: questionCount, excludeIds })
  )
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<GradedAnswer[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [streak, setStreak] = useState(0)
  const [startedAt, setStartedAt] = useState(() => Date.now())
  const [questionStartedAt, setQuestionStartedAt] = useState(() => Date.now())
  const [timeLeft, setTimeLeft] = useState(secondsPerQuestion ?? null)
  const [finished, setFinished] = useState(false)

  // نتيجة مسجّلة في المخزن (الرتبة بعد إضافة نقاط هذا الاختبار)
  const [result, setResult] = useState<{
    attempt: QuizAttempt
    summary: ReturnType<typeof summarizeSession>
    graded: GradedAnswer[]
    leveledUp: boolean
    rankBeforeId: string
    totalXp: number
    totalCredits: number
    newBadges: string[]
  } | null>(null)

  const completedRef = useRef(false)
  const current = session[index]

  /**
   * إعادة بناء الجلسة عند وصول بنك الأسئلة.
   *
   * بنك الأسئلة المحلي يُستورد ديناميكياً (import())، وقد يضغط المستخدم على
   * "ابدأ" قبل اكتماله، فيُبنى المحرّك بمخزون فارغ ويعرض "لا توجد أسئلة"
   * للأبد. هذا الأثر يترقّب وصول الأسئلة ويبني الجلسة حينها — بشرط ألا يكون
   * المستخدم قد بدأ الإجابة فعلاً (حتى لا تضيع إجاباته).
   */
  useEffect(() => {
    if (session.length > 0 || answers.length > 0 || questions.length === 0) return
    setSession(pickQuestions(questions, { count: questionCount, excludeIds }))
  }, [answers.length, excludeIds, questionCount, questions, session.length])

  /** يعيد بناء جلسة جديدة بأسئلة مغايرة (بلا إعادة تحميل للصفحة). */
  const restart = useCallback(() => {
    setSession(pickQuestions(questions, { count: questionCount, excludeIds }))
    setIndex(0)
    setAnswers([])
    setSelected(null)
    setRevealed(false)
    setStreak(0)
    setStartedAt(Date.now())
    setQuestionStartedAt(Date.now())
    setTimeLeft(secondsPerQuestion ?? null)
    setFinished(false)
    setResult(null)
    completedRef.current = false
  }, [excludeIds, questionCount, questions, secondsPerQuestion])

  // العدّاد التنازلي الخاص بكل سؤال (أسلوب المباريات): عند انتهاء الوقت
  // يُعتبر السؤال مُجاباً عنه خطأ (chosen = null) ويظهر الشرح مباشرة.
  useEffect(() => {
    if (timeLeft === null || revealed || finished) return
    if (timeLeft <= 0) {
      handleAnswer(null)
      return
    }
    const timer = window.setTimeout(() => setTimeLeft((value) => (value === null ? null : value - 1)), 1000)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, revealed, finished])

  const handleAnswer = useCallback(
    (choice: number | null) => {
      if (revealed || !current) return
      const elapsedMs = Date.now() - questionStartedAt
      const graded = gradeAnswer({ question: current, chosen: choice, elapsedMs }, streak)
      setSelected(choice)
      setRevealed(true)
      setStreak(graded.streak)
      setAnswers((previous) => [...previous, graded])
    },
    [current, questionStartedAt, revealed, streak]
  )

  const goNext = useCallback(() => {
    if (index + 1 >= session.length) {
      setFinished(true)
      return
    }
    setIndex((value) => value + 1)
    setSelected(null)
    setRevealed(false)
    setQuestionStartedAt(Date.now())
    setTimeLeft(secondsPerQuestion ?? null)
  }, [index, secondsPerQuestion, session.length])

  // اختصارات لوحة المفاتيح: 1–4 للإجابة، Enter للسؤال الموالي
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (finished) return
      if (!revealed && ["1", "2", "3", "4"].includes(event.key)) {
        handleAnswer(Number(event.key) - 1)
        return
      }
      if (revealed && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault()
        goNext()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [finished, goNext, handleAnswer, revealed])

  // حساب النتيجة وتسجيلها في المخزن مرة واحدة فقط
  useEffect(() => {
    if (!finished || completedRef.current || session.length === 0) return
    completedRef.current = true

    const durationMs = Date.now() - startedAt
    const summary = summarizeSession(answers, mode, durationMs)
    const attempt = buildAttempt(mode, label, tier, answers, summary)

    const rankBeforeId = getRankForXp(progress.xp).id

    if (placement) {
      const rank = placementRankForScore(summary.score)
      const finish = finishPlacement(attempt, rank, 60)
      setResult({
        attempt,
        summary,
        graded: answers,
        leveledUp: finish.leveledUp,
        rankBeforeId: finish.rankBefore.id,
        totalXp: progress.xp + attempt.xpEarned + 60,
        totalCredits: progress.credits + attempt.creditsEarned,
        newBadges: finish.newBadges,
      })
    } else {
      const recorded = submitAttempt(attempt)
      setResult({
        attempt,
        summary,
        graded: answers,
        leveledUp: recorded.leveledUp,
        rankBeforeId: recorded.rankBefore.id,
        totalXp: progress.xp + attempt.xpEarned,
        totalCredits: progress.credits + attempt.creditsEarned,
        newBadges: recorded.newBadges,
      })
    }

    onComplete?.(attempt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  const progressPercent = useMemo(
    () => (session.length === 0 ? 0 : Math.round(((index + (revealed ? 1 : 0)) / session.length) * 100)),
    [index, revealed, session.length]
  )

  if (session.length === 0 && questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-border bg-card p-8 text-center" dir="rtl">
        <Loader2 className="mx-auto mb-3 size-5 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm font-extrabold text-foreground">جارٍ تحميل الأسئلة...</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          نجهّز جلسة من بنك الأسئلة — لحظات قليلة فقط.
        </p>
        <button
          type="button"
          onClick={onExit}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-[13px] font-extrabold text-muted-foreground transition hover:text-foreground"
        >
          <ArrowRight className="size-4" aria-hidden="true" />
          إلغاء والعودة
        </button>
      </div>
    )
  }

  if (session.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-border bg-card p-8 text-center" dir="rtl">
        <p className="text-sm font-extrabold text-foreground">لا توجد أسئلة كافية بعد</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          لم نتمكن من بناء جلسة من هذا التصنيف. جرّب فصلاً أو مادة أخرى، أو أعد المحاولة لاحقاً بعد إضافة أسئلة جديدة.
        </p>
        <button
          type="button"
          onClick={onExit}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-extrabold text-primary-foreground"
        >
          <ArrowRight className="size-4" aria-hidden="true" />
          العودة للاختبارات
        </button>
      </div>
    )
  }

  if (result) {
    return (
      <QuizResultPanel
        attempt={result.attempt}
        summary={result.summary}
        questions={session}
        answers={result.graded}
        rankProgress={rankProgress}
        rankBefore={getRankForXp(progress.xp - result.attempt.xpEarned)}
        leveledUp={result.leveledUp}
        newBadges={result.newBadges}
        totalXp={result.totalXp}
        totalCredits={result.totalCredits}
        username={profile?.username ?? null}
        onRetake={restart}
        onExit={onExit}
      />
    )
  }

  const isLastQuestion = index + 1 >= session.length

  return (
    <div className="mx-auto w-full max-w-3xl" dir="rtl">
      {/* شريط التقدم والخروج */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-extrabold text-muted-foreground transition hover:text-foreground"
          >
            <ArrowRight className="size-4" aria-hidden="true" />
            إنهاء
          </button>

          <div className="flex items-center gap-3">
            {streak >= 3 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-1 text-[11px] font-extrabold text-orange-600 dark:text-orange-400">
                <Zap className="size-3" aria-hidden="true" />
                تتالي {streak}
              </span>
            )}
            {secondsPerQuestion && timeLeft !== null && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                  timeLeft <= 10 ? "bg-rose-500/10 text-rose-600" : "bg-muted text-muted-foreground"
                }`}
                aria-live="polite"
              >
                <Clock className="size-3" aria-hidden="true" />
                <span dir="ltr">{timeLeft}s</span>
              </span>
            )}
            <span className="text-[12px] font-extrabold text-muted-foreground" dir="ltr">
              {index + 1} / {session.length}
            </span>
          </div>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label="تقدم الاختبار">
          <div
            className="h-full rounded-full bg-gradient-to-l from-primary to-accent-gold transition-[width] duration-500"
            style={{ width: `${Math.max(progressPercent, 3)}%` }}
          />
        </div>
      </div>

      {/* بطاقة السؤال */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-1 text-[10.5px] font-extrabold text-muted-foreground">
            {DIFFICULTY_LABEL[current.difficulty]}
          </span>
          {current.module && (
            <span className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[10.5px] font-extrabold text-primary">
              {current.module}
            </span>
          )}
          {current.semester && (
            <span className="rounded-full border border-accent-gold/40 bg-accent-gold/10 px-2.5 py-1 text-[10.5px] font-extrabold text-accent-gold">
              {current.semester}
            </span>
          )}
        </div>

        <h2 className="text-lg font-extrabold leading-8 text-foreground">{current.question}</h2>

        <div className="mt-5 grid gap-2.5">
          {current.options.map((option, optionIndex) => {
            const isChosen = selected === optionIndex
            const isCorrect = current.answer === optionIndex

            let stateClass = "border-border bg-background hover:border-primary/50 hover:bg-primary/[0.03]"
            if (revealed && isCorrect) stateClass = "border-emerald-500/60 bg-emerald-500/10"
            else if (revealed && isChosen) stateClass = "border-rose-500/60 bg-rose-500/10"

            return (
              <button
                key={option}
                type="button"
                disabled={revealed}
                onClick={() => handleAnswer(optionIndex)}
                className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-right transition ${stateClass}`}
              >
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-lg text-[12px] font-black ${
                    revealed && isCorrect
                      ? "bg-emerald-500 text-white"
                      : revealed && isChosen
                        ? "bg-rose-500 text-white"
                        : "bg-muted text-muted-foreground"
                  }`}
                  aria-hidden="true"
                >
                  {revealed && isCorrect ? <CheckCircle2 className="size-4" /> : revealed && isChosen ? <XCircle className="size-4" /> : optionIndex + 1}
                </span>
                <span className="text-[14px] font-bold leading-6 text-foreground">{option}</span>
              </button>
            )
          })}
        </div>

        {/* الشرح الفوري */}
        {revealed && (
          <div className="mt-5 rounded-2xl border border-border bg-background p-4">
            <p className="mb-2 flex items-center gap-2 text-[12.5px] font-extrabold text-accent-gold">
              <Lightbulb className="size-4" aria-hidden="true" />
              {mode === "general" ? "هل تعلم؟" : "الشرح"}
            </p>
            <p className="text-[13px] leading-7 text-muted-foreground">{current.explanation}</p>
            {current.reference && (
              <p className="mt-2 text-[11.5px] font-bold text-primary">السند: {current.reference}</p>
            )}
            {answers[index]?.xp ? (
              <p className="mt-2 text-[11.5px] font-extrabold text-emerald-600 dark:text-emerald-400">
                +{answers[index].xp} نقطة خبرة
              </p>
            ) : (
              !answers[index]?.correct && (
                <p className="mt-2 text-[11.5px] font-extrabold text-rose-600 dark:text-rose-400">
                  الإجابة الصحيحة: {current.options[current.answer]}
                </p>
              )
            )}
          </div>
        )}

        {/* أزرار التنقل */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold text-muted-foreground">
            اختصارات: 1–4 للإجابة · Enter للسؤال الموالي
          </p>
          {revealed ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[13px] font-extrabold text-primary-foreground transition hover:opacity-90"
            >
              {isLastQuestion ? "عرض النتيجة" : "السؤال التالي"}
              <ArrowLeft className="size-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleAnswer(null)}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-[12.5px] font-extrabold text-muted-foreground transition hover:text-foreground"
            >
              <SkipForward className="size-4" aria-hidden="true" />
              تخطي
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
