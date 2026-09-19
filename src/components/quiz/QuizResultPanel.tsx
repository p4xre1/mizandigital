import { useState } from "react"
import {
  Trophy,
  RotateCcw,
  ArrowLeft,
  Share2,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  Flame,
  BookOpenCheck,
} from "lucide-react"
import type { QuizAttempt, QuizQuestion } from "@/types/quiz"
import {
  DIFFICULTY_LABEL,
  formatDuration,
  getScoreVerdict,
  type GradedAnswer,
  type SessionSummary,
} from "@/lib/quiz/engine"
import { BADGE_BY_ID, getRankProgress, type RankProgress } from "@/lib/quiz/ranks"
import { XpBar } from "./XpBar"
import { RankBadge } from "./RankBadge"
import { ShareDialog } from "./ShareDialog"

/**
 * شاشة النتيجة بعد إكمال الاختبار: النسبة، نقاط الخبرة المكتسبة، الرتبة،
 * مراجعة الأسئلة مع شروحها، وأزرار المشاركة الفيروسية (واتساب/لينكد إن/بطاقة).
 */
export function QuizResultPanel({
  attempt,
  summary,
  questions,
  answers,
  rankProgress,
  rankBefore,
  leveledUp,
  newBadges,
  totalXp,
  totalCredits,
  username,
  onRetake,
  onExit,
}: {
  attempt: QuizAttempt
  summary: SessionSummary
  questions: QuizQuestion[]
  answers: GradedAnswer[]
  rankProgress: RankProgress
  rankBefore?: RankProgress["rank"]
  leveledUp: boolean
  newBadges: string[]
  /** إجمالي الخبرة بعد إضافة مكافأة هذا الاختبار (لعرض الشريط محدّثاً). */
  totalXp: number
  totalCredits: number
  username?: string | null
  onRetake: () => void
  onExit: () => void
}) {
  const verdict = getScoreVerdict(summary.score)
  const [shareOpen, setShareOpen] = useState(false)

  const questionById = new Map(questions.map((question) => [question.id, question]))

  const shareInput = {
    title: attempt.label,
    score: summary.score,
    correct: summary.correct,
    total: summary.total,
    rank: rankProgress.rank.id,
    username,
    xpEarned: summary.xpEarned,
  }

  return (
    <div className="mx-auto w-full max-w-3xl" dir="rtl">
      {/* بطاقة النتيجة */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="bg-gradient-to-l from-primary/10 via-card to-accent-gold/10 px-6 py-8 text-center">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-accent-gold/15 text-accent-gold">
            <Trophy className="size-7" strokeWidth={2.2} />
          </div>
          <p className="text-[13px] font-bold text-muted-foreground">{attempt.label}</p>

          <p className="mt-2 text-6xl font-black leading-none text-foreground" dir="ltr">
            {summary.score}
            <span className="text-2xl font-extrabold text-muted-foreground">%</span>
          </p>

          <p className={`mt-2 text-base font-extrabold ${verdict.tone}`}>{verdict.title}</p>
          <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-6 text-muted-foreground">{verdict.message}</p>
        </div>

        {/* إحصاءات */}
        <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-4">
          {[
            { icon: CheckCircle2, label: "إجابات صحيحة", value: `${summary.correct}/${summary.total}`, tone: "text-emerald-600 dark:text-emerald-400" },
            { icon: Target, label: "نقاط الخبرة", value: `+${summary.xpEarned}`, tone: "text-primary" },
            { icon: Flame, label: "أطول تتالي", value: String(summary.bestStreak), tone: "text-orange-500" },
            { icon: Clock, label: "المدة", value: formatDuration(summary.durationMs), tone: "text-muted-foreground" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-background p-3 text-center">
              <item.icon className={`mx-auto mb-1.5 size-4 ${item.tone}`} aria-hidden="true" />
              <p className="text-sm font-extrabold text-foreground" dir="ltr">
                {item.value}
              </p>
              <p className="mt-0.5 text-[10.5px] font-semibold text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>

        {/* شريط الخبرة والكريدتس */}
        <div className="border-t border-border px-6 py-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <RankBadge rank={rankProgress.rank} size="md" />
            <span className="rounded-full border border-accent-gold/40 bg-accent-gold/10 px-3 py-1 text-[11px] font-extrabold text-accent-gold">
              +{attempt.creditsEarned} كريدت
            </span>
          </div>
          <XpBar rankProgress={rankProgress} xp={totalXp} credits={totalCredits} />
        </div>

        {/* ترقية الرتبة وأوسمة جديدة */}
        {(leveledUp || newBadges.length > 0) && (
          <div className="border-t border-border bg-accent-gold/5 px-6 py-5">
            {leveledUp && (
              <p className="mb-3 flex items-center gap-2 text-[13px] font-extrabold text-accent-gold">
                <Sparkles className="size-4" aria-hidden="true" />
                تهانينا! ارتقيت من الرتبة {rankBefore?.id ?? "D"} إلى الرتبة {rankProgress.rank.id} ({rankProgress.rank.label})
              </p>
            )}
            {newBadges.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {newBadges.map((badgeId) => {
                  const badge = BADGE_BY_ID.get(badgeId)
                  if (!badge) return null
                  return (
                    <span
                      key={badgeId}
                      className="rounded-full border border-border bg-background px-3 py-1.5 text-[11.5px] font-bold text-foreground"
                      title={badge.description}
                    >
                      {badge.icon} {badge.label}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* أزرار المشاركة */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-6 py-5">
          <button
            type="button"
            onClick={onRetake}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-extrabold text-primary-foreground transition hover:opacity-90"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            إعادة الاختبار
          </button>
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-4 py-2.5 text-[13px] font-extrabold text-primary transition hover:bg-primary/10"
          >
            <Share2 className="size-4" aria-hidden="true" />
            مشاركة النتيجة (بطاقة + واتساب + لينكد إن)
          </button>
          <button
            type="button"
            onClick={onExit}
            className="mr-auto inline-flex items-center gap-2 px-2 py-2.5 text-[13px] font-extrabold text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            العودة للاختبارات
          </button>
        </div>
      </div>

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        input={shareInput}
        shareUrl={username ? `https://mizan.page/u/${username}` : "https://mizan.page/quiz"}
      />

      {/* مراجعة الأسئلة */}
      <div className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-base font-extrabold text-foreground">
          <BookOpenCheck className="size-5 text-primary" aria-hidden="true" />
          مراجعة الأسئلة ({summary.total})
        </h2>
        <div className="space-y-3">
          {answers.map((answer, index) => {
            const question = answer.question
            return (
              <div
                key={`${answer.question.id}-${index}`}
                className={`rounded-2xl border p-4 ${
                  answer.correct ? "border-emerald-500/40 bg-emerald-500/[0.04]" : "border-rose-500/40 bg-rose-500/[0.04]"
                }`}
              >
                <div className="mb-2 flex items-start gap-2">
                  {answer.correct ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <XCircle className="mt-0.5 size-4 shrink-0 text-rose-600" aria-hidden="true" />
                  )}
                  <p className="text-[13.5px] font-bold leading-6 text-foreground">
                    {index + 1}. {question.question}
                  </p>
                </div>

                <div className="grid gap-1.5 pr-6">
                  {question.options.map((option, optionIndex) => {
                    const isCorrectOption = optionIndex === question.answer
                    const isChosen = optionIndex === answer.chosen
                    return (
                      <p
                        key={option}
                        className={`rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold ${
                          isCorrectOption
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : isChosen
                              ? "border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                              : "border-border bg-background text-muted-foreground"
                        }`}
                      >
                        {option}
                        {isCorrectOption && " ✓"}
                        {isChosen && !isCorrectOption && " ✗"}
                      </p>
                    )
                  })}
                </div>

                <div className="mt-3 rounded-xl border border-border bg-background p-3">
                  <p className="text-[12.5px] leading-6 text-muted-foreground">
                    <span className="font-extrabold text-foreground">الشرح: </span>
                    {question.explanation}
                  </p>
                  {question.reference && (
                    <p className="mt-1.5 text-[11.5px] font-bold text-primary">السند: {question.reference}</p>
                  )}
                  <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                    مستوى السؤال: {DIFFICULTY_LABEL[question.difficulty]}
                    {answer.xp > 0 && <> - نقاط هذا السؤال: +{answer.xp}</>}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
