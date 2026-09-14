import type { QuizAttempt, QuizMode, QuizQuestion } from "@/types/quiz"

/**
 * محرك الاختبارات (Quiz Engine).
 *
 * كل ما في هذا الملف دوال نقية (pure functions) بلا أي اعتماد على React أو
 * على الشبكة — حتى يسهل اختبارها آلياً (tests/quiz-engine.test.ts) وإعادة
 * استعمالها في أي واجهة لاحقاً (موبايل، واتساب بوت...).
 */

/* ------------------------------------------------------------------ *
 * ترتيب عشوائي قابل للتكرار (Seeded shuffle)
 * ------------------------------------------------------------------ */

/** مولّد أرقام شبه عشوائية (mulberry32) — ثابت النتائج لنفس البذرة. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** خوارزمية Fisher–Yates: تمزج المصفوفة بدون تعديل الأصلية. */
export function shuffle<T>(items: T[], seed?: number): T[] {
  const result = [...items]
  const random = seed === undefined ? Math.random : createRng(seed)
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/* ------------------------------------------------------------------ *
 * ثوابت النقاط (XP & Credits)
 * ------------------------------------------------------------------ */

export const XP = {
  /** النقاط الأساسية لكل إجابة صحيحة. */
  correct: 8,
  /** مكافأة السرعة: إجابة صحيحة في أقل من هذه المدة (بالميلي ثانية). */
  fastMs: 8000,
  fastBonus: 4,
  /** مكافأة التتالي: تمنح عند كل سلسلة مكتملة من هذا الطول. */
  streakStep: 3,
  streakBonus: 2,
  /** مكافأة إكمال الاختبار كاملاً. */
  completion: 15,
  /** مكافأة العلامة الكاملة. */
  perfect: 40,
} as const

const DIFFICULTY_BONUS: Record<QuizQuestion["difficulty"], number> = {
  easy: 0,
  medium: 3,
  hard: 6,
}

/** معامل الصعوبة حسب المسار — مباريات القضاء والشرطة أثقل من التسلية العامة. */
const MODE_MULTIPLIER: Record<QuizMode, number> = {
  university: 1,
  general: 0.8,
  concours: 1.25,
  interview: 1,
  placement: 1.5,
}

export const DIFFICULTY_LABEL: Record<QuizQuestion["difficulty"], string> = {
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
}

export const TIER_LABEL: Record<QuizMode, string> = {
  university: "اختبارات الكلية",
  general: "الاختبار العشوائي",
  concours: "مباريات مهنية",
  interview: "مقابلات وتداريب",
  placement: "اختبار تحديد المستوى",
}

/* ------------------------------------------------------------------ *
 * اختيار أسئلة الجلسة
 * ------------------------------------------------------------------ */

export interface PickOptions {
  count: number
  /** معرّفات الأسئلة التي شُوهدت مؤخراً — تُؤجَّل إلى آخر القائمة لتنويع التجربة. */
  excludeIds?: string[]
  seed?: number
}

/**
 * يختار أسئلة الجلسة من المخزون الممرر.
 *
 * المنطق: الأسئلة "الجديدة" (غير المشاهدة مؤخراً) لها الأولوية، ثم نكمّل
 * من المشاهدة سابقاً عند الحاجة — هكذا يبقى الاختبار متنوعاً حتى لو كان بنك
 * الأسئلة في مسار معيّن صغيراً (مثل S6 أو مباراة الجمارك).
 */
export function pickQuestions(pool: QuizQuestion[], options: PickOptions): QuizQuestion[] {
  const { count, excludeIds = [], seed } = options
  if (count <= 0 || pool.length === 0) return []

  const excluded = new Set(excludeIds)
  const fresh = shuffle(
    pool.filter((item) => !excluded.has(item.id)),
    seed
  )
  const seen = shuffle(
    pool.filter((item) => excluded.has(item.id)),
    seed
  )
  return [...fresh, ...seen].slice(0, Math.min(count, pool.length))
}

/**
 * يبني جلسة تحديد المستوى: يمزج أسئلة من كل المسارات مبتدئاً بالأسهل،
 * تماماً مثل اختبارات التحديد في تطبيقات تعلّم اللغات.
 */
export function buildPlacementPool(questions: QuizQuestion[], seed?: number): QuizQuestion[] {
  const general = shuffle(questions.filter((q) => q.tier === "general"), seed)
  const university = shuffle(questions.filter((q) => q.tier === "university"), seed)
  const concours = shuffle(questions.filter((q) => q.tier === "concours"), seed)

  return [
    ...general.filter((q) => q.difficulty === "easy").slice(0, 3),
    ...university.filter((q) => q.difficulty === "easy").slice(0, 3),
    ...general.filter((q) => q.difficulty === "medium").slice(0, 3),
    ...university.filter((q) => q.difficulty === "medium").slice(0, 3),
    ...university.filter((q) => q.difficulty === "hard").slice(0, 2),
    ...concours.slice(0, 2),
  ].slice(0, 15)
}

/* ------------------------------------------------------------------ *
 * حساب النقاط
 * ------------------------------------------------------------------ */

export interface AnswerEvent {
  question: QuizQuestion
  chosen: number | null
  elapsedMs: number
}

export interface GradedAnswer extends AnswerEvent {
  correct: boolean
  xp: number
  streak: number
}

/**
 * يصحّح إجابة واحدة ويرجع نقاطها — وتُستعمل في وضع "التصحيح الفوري" حيث يرى
 * المستخدم الشرح بعد كل سؤال (لا في نهاية الاختبار فقط).
 */
export function gradeAnswer(event: AnswerEvent, streak: number): GradedAnswer {
  const correct = event.chosen !== null && event.chosen === event.question.answer
  if (!correct) {
    return { ...event, correct: false, xp: 0, streak: 0 }
  }

  const nextStreak = streak + 1
  let xp = XP.correct + DIFFICULTY_BONUS[event.question.difficulty]
  if (event.elapsedMs > 0 && event.elapsedMs <= XP.fastMs) xp += XP.fastBonus
  if (nextStreak > 0 && nextStreak % XP.streakStep === 0) xp += XP.streakBonus

  return { ...event, correct: true, xp: Math.round(xp), streak: nextStreak }
}

export interface SessionSummary {
  correct: number
  total: number
  score: number
  bestStreak: number
  rawXp: number
  xpEarned: number
  creditsEarned: number
  durationMs: number
  isPerfect: boolean
}

/** يجمع نتيجة الجلسة كاملة ويحسب نقاط الخبرة والكريدتس النهائية. */
export function summarizeSession(
  graded: GradedAnswer[],
  mode: QuizMode,
  durationMs: number
): SessionSummary {
  const correct = graded.filter((item) => item.correct).length
  const total = graded.length
  const bestStreak = graded.reduce((max, item) => Math.max(max, item.streak), 0)
  const rawXp = graded.reduce((sum, item) => sum + item.xp, 0)
  const isPerfect = total > 0 && correct === total

  const withBonuses = rawXp + (total > 0 ? XP.completion : 0) + (isPerfect ? XP.perfect : 0)
  const xpEarned = Math.round(withBonuses * MODE_MULTIPLIER[mode])
  // الكريدتس: عملة أصغر من الخبرة (كل 12 نقطة خبرة ≈ كريدت واحد) + مكافأة إتمام ثابتة
  const creditsEarned = total > 0 ? Math.max(1, Math.round(xpEarned / 12) + 3) : 0

  return {
    correct,
    total,
    score: total > 0 ? Math.round((correct / total) * 100) : 0,
    bestStreak,
    rawXp,
    xpEarned,
    creditsEarned,
    durationMs,
    isPerfect,
  }
}

/** يبني سجلّ المحاولة الجاهز للتخزين من نتيجة الجلسة. */
export function buildAttempt(
  mode: QuizMode,
  label: string,
  tier: QuizAttempt["tier"],
  graded: GradedAnswer[],
  summary: SessionSummary
): QuizAttempt {
  return {
    id: `attempt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    mode,
    label,
    tier,
    total: summary.total,
    correct: summary.correct,
    score: summary.score,
    xpEarned: summary.xpEarned,
    creditsEarned: summary.creditsEarned,
    bestStreak: summary.bestStreak,
    durationMs: summary.durationMs,
    finishedAt: new Date().toISOString(),
    answers: graded.map((item) => ({
      questionId: item.question.id,
      chosen: item.chosen,
      correct: item.correct,
      elapsedMs: item.elapsedMs,
    })),
  }
}

/* ------------------------------------------------------------------ *
 * مساعدات العرض
 * ------------------------------------------------------------------ */

/** يحوّل المدة إلى نص مقروء بالعربية (مثال: "3 د 12 ث"). */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—"
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds} ث`
  return `${minutes} د ${seconds.toString().padStart(2, "0")} ث`
}

/** تقييم نصّي للنتيجة يُعرض للمستخدم بعد كل اختبار. */
export function getScoreVerdict(score: number): { title: string; message: string; tone: string } {
  if (score >= 90) {
    return {
      title: "أداء ممتاز",
      message: "مستوى يؤهلك لخوض المباراة بثقة. حافظ على هذا الإيقاع.",
      tone: "text-emerald-600 dark:text-emerald-400",
    }
  }
  if (score >= 70) {
    return {
      title: "أداء جيد جداً",
      message: "أنت على الطريق الصحيح — راجع الأسئلة التي أخطأت فيها وستقفز نتيجتك.",
      tone: "text-sky-600 dark:text-sky-400",
    }
  }
  if (score >= 50) {
    return {
      title: "متوسط",
      message: "الأساس موجود لكنه يحتاج تثبيتاً. راجع الشروح ثم أعد الاختبار.",
      tone: "text-amber-600 dark:text-amber-400",
    }
  }
  return {
    title: "يحتاج عملاً",
    message: "لا تقلق — ارجع إلى الدرس ثم أعد المحاولة، الشروح هنا لتساعدك.",
    tone: "text-rose-600 dark:text-rose-400",
  }
}

/** الرتبة التي يمنحها اختبار التحديد بناءً على النسبة المئوية. */
export function placementRankForScore(score: number) {
  if (score >= 90) return "A" as const
  if (score >= 75) return "B" as const
  if (score >= 55) return "C" as const
  return "D" as const
}
