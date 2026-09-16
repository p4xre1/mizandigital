import type { MizanProfile, QuizAttempt, QuizProgress, RankId } from "@/types/quiz"
import { BADGES, getRankForXp, type RankDefinition } from "./ranks"

/**
 * مخزن التقدّم (Progress Store).
 *
 * مصدر الحقيقة للتجربة هو الجهاز: كل نقاط الخبرة والرتب والمحاولات محفوظة
 * في localStorage، ويُستعمل هذا المخزن مع useSyncExternalStore في
 * src/hooks/useQuizProgress.ts حتى تتحدّث كل الواجهة (الشارة، الشريط،
 * النقاط) لحظة انتهاء أي اختبار بلا إعادة تحميل.
 *
 * المزامنة السحابية (Supabase) اختيارية وتتم في profileService.ts — فشلها
 * لا يؤثر على التجربة أبداً.
 */

const STORAGE_KEY = "mizan:quiz:progress:v1"

const EMPTY_PROGRESS: QuizProgress = {
  xp: 0,
  credits: 0,
  lastPlayedDate: null,
  streakDays: 0,
  attempts: [],
  placementCompleted: false,
  placementRank: null,
  profile: null,
  badges: [],
}

/* ------------------------------------------------------------------ *
 * القراءة والكتابة الآمنة
 * ------------------------------------------------------------------ */

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function normalize(value: unknown): QuizProgress {
  if (!value || typeof value !== "object") return { ...EMPTY_PROGRESS }
  const raw = value as Partial<QuizProgress>
  return {
    xp: Number.isFinite(raw.xp) ? Math.max(0, Math.round(raw.xp as number)) : 0,
    credits: Number.isFinite(raw.credits) ? Math.max(0, Math.round(raw.credits as number)) : 0,
    lastPlayedDate: typeof raw.lastPlayedDate === "string" ? raw.lastPlayedDate : null,
    streakDays: Number.isFinite(raw.streakDays) ? Math.max(0, Math.round(raw.streakDays as number)) : 0,
    attempts: Array.isArray(raw.attempts) ? (raw.attempts as QuizAttempt[]).slice(-100) : [],
    placementCompleted: raw.placementCompleted === true,
    placementRank: (raw.placementRank ?? null) as RankId | null,
    profile: raw.profile ?? null,
    badges: Array.isArray(raw.badges) ? raw.badges.filter((id) => BADGES.some((badge) => badge.id === id)) : [],
  }
}

function safeParse(raw: string | null): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function loadInitialState(): QuizProgress {
  if (!isBrowser()) return { ...EMPTY_PROGRESS }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = safeParse(raw)
    if (!parsed) return { ...EMPTY_PROGRESS }

    // تحقق من التوقيع إن وجد
    const checksum = window.localStorage.getItem("mizan:quiz:progress:checksum:v1")
    if (raw && checksum) {
      // تحقق غير متزامن — لا نوقف التحميل، فقط نحذر
      import("./secureProgress")
        .then(({ verifyProgress, validateProgressIntegrity }) => {
          const valid = verifyProgress(raw, checksum)
          if (!valid) {
            console.warn("[progressStore] checksum mismatch — possible tampering or device change")
          }
          const issues = validateProgressIntegrity(normalize(parsed) as any)
          if (issues.some((i) => i.severity === "error")) {
            console.warn("[progressStore] integrity errors on load:", issues)
          }
        })
        .catch(() => {})
    }

    return normalize(parsed)
  } catch {
    return { ...EMPTY_PROGRESS }
  }
}

let state: QuizProgress = loadInitialState()

const listeners = new Set<() => void>()

function commit(next: QuizProgress): void {
  state = next
  if (isBrowser()) {
    try {
      const json = JSON.stringify(state)
      window.localStorage.setItem(STORAGE_KEY, json)
      // حماية إضافية: توقيع خفيف لكشف التلاعب (secureProgress.ts)
      // لا يمنع التلاعب المتعمد 100% لكنه يكشف النسخ/اللصق والتعديل العرضي
      // الخادم يبقى مصدر الحقيقة النهائي عبر submit_quiz_attempt RPC
      import("./secureProgress")
        .then(({ saveChecksum, validateProgressIntegrity, SECURITY_LIMITS }) => {
          // تحقق من الحدود قبل الحفظ
          const issues = validateProgressIntegrity(next)
          const hasError = issues.some((i) => i.severity === "error")
          if (hasError) {
            console.warn("[progressStore] integrity issues:", issues)
            // إذا كان هناك تلاعب واضح، لا نحفظ القيم المتضخمة
            if (next.xp > SECURITY_LIMITS.maxTotalXp || next.credits > SECURITY_LIMITS.maxTotalCredits) {
              console.error("[progressStore] blocked save: values out of range")
              return
            }
          }
          saveChecksum(json)
        })
        .catch(() => {
          /* ignore */
        })
    } catch {
      /* تجاهل: امتلاء مساحة التخزين لا يجب أن يوقف اللعب */
    }
  }
  listeners.forEach((listener) => listener())
}

/** يُستعمل من طرف useSyncExternalStore — يجب أن يُرجع نفس المرجع بلا تغيير. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getProgressSnapshot(): QuizProgress {
  return state
}

/* ------------------------------------------------------------------ *
 * حساب سلسلة الأيام
 * ------------------------------------------------------------------ */

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`)
  const end = Date.parse(`${to}T00:00:00Z`)
  if (Number.isNaN(start) || Number.isNaN(end)) return Number.POSITIVE_INFINITY
  return Math.round((end - start) / 86_400_000)
}

/** يحسب سلسلة الأيام الجديدة: متصلة إن كان آخر لعب أمس، وتنكسر بعد ذلك. */
export function computeStreak(previousDate: string | null, previousStreak: number, today = todayKey()): number {
  if (!previousDate) return 1
  const gap = daysBetween(previousDate, today)
  if (gap === 0) return Math.max(previousStreak, 1)
  if (gap === 1) return previousStreak + 1
  return 1
}

/* ------------------------------------------------------------------ *
 * الأوسمة
 * ------------------------------------------------------------------ */

/** يقيّم الأوسمة المستحقة بناءً على السجل الكامل للمحاولات. */
export function evaluateBadges(progress: QuizProgress): string[] {
  const earned = new Set(progress.badges)
  const attempts = progress.attempts

  if (attempts.length > 0) earned.add("first_quiz")
  if (attempts.some((attempt) => attempt.total > 0 && attempt.correct === attempt.total)) earned.add("perfect")
  if (attempts.some((attempt) => attempt.bestStreak >= 10)) earned.add("streak_10")
  if (attempts.some((attempt) => attempt.tier === "concours" && attempt.score >= 80)) earned.add("concours_ready")
  if (attempts.filter((attempt) => attempt.tier === "interview").length >= 5) earned.add("lawyer_mind")

  const answeredQuestions = attempts.reduce((sum, attempt) => sum + (attempt.total || 0), 0)
  if (answeredQuestions >= 100) earned.add("marathon")

  const streak = computeStreak(progress.lastPlayedDate, progress.streakDays)
  if (streak >= 7) earned.add("week_streak")

  return Array.from(earned)
}

/* ------------------------------------------------------------------ *
 * العمليات
 * ------------------------------------------------------------------ */

export interface RecordAttemptResult {
  xpAdded: number
  creditsAdded: number
  rankBefore: RankDefinition
  rankAfter: RankDefinition
  leveledUp: boolean
  newBadges: string[]
  streakDays: number
}

/** يسجّل محاولة مكتملة: يضيف الخبرة والكريدتس، ويحدّث السلسلة والأوسمة. */
export function recordAttempt(attempt: QuizAttempt): RecordAttemptResult {
  const current = state
  const rankBefore = getRankForXp(current.xp)

  const today = todayKey()
  const streakDays = computeStreak(current.lastPlayedDate, current.streakDays, today)

  const next: QuizProgress = {
    ...current,
    xp: current.xp + attempt.xpEarned,
    credits: current.credits + attempt.creditsEarned,
    lastPlayedDate: today,
    streakDays,
    attempts: [...current.attempts, attempt].slice(-100),
  }

  const newBadges = evaluateBadges(next).filter((id) => !current.badges.includes(id))
  next.badges = Array.from(new Set([...current.badges, ...newBadges]))

  commit(next)

  const rankAfter = getRankForXp(next.xp)
  return {
    xpAdded: attempt.xpEarned,
    creditsAdded: attempt.creditsEarned,
    rankBefore,
    rankAfter,
    leveledUp: rankAfter.id !== rankBefore.id,
    newBadges,
    streakDays,
  }
}

/** يحفظ نتيجة اختبار التحديد ويمنح الرتبة الابتدائية (كنقاط خبرة). */
export function completePlacement(attempt: QuizAttempt, rank: RankId, xpGrant: number): RecordAttemptResult {
  const current = state
  const rankBefore = getRankForXp(current.xp)
  const today = todayKey()

  const next: QuizProgress = {
    ...current,
    xp: current.xp + attempt.xpEarned + xpGrant,
    credits: current.credits + attempt.creditsEarned,
    lastPlayedDate: today,
    streakDays: computeStreak(current.lastPlayedDate, current.streakDays, today),
    attempts: [...current.attempts, attempt].slice(-100),
    placementCompleted: true,
    placementRank: rank,
  }

  next.badges = evaluateBadges(next)
  commit(next)

  const rankAfter = getRankForXp(next.xp)
  return {
    xpAdded: attempt.xpEarned + xpGrant,
    creditsAdded: attempt.creditsEarned,
    rankBefore,
    rankAfter,
    leveledUp: rankAfter.id !== rankBefore.id,
    newBadges: [],
    streakDays: next.streakDays,
  }
}

/**
 * خاصية التجاوز المدفوع (Pay-to-Skip): مقابل كمية من الكريدتس يتجاوز
 * المستخدم (الذي قد يكون محامياً مشغولاً) اختبار التحديد الطويل ويحصل على
 * الرتبة المتقدمة مباشرة. الكريدتس تُخصم أولاً، فإن لم تكفِ ترجع false.
 */
export function skipPlacement(rank: RankId, xpGrant: number, cost: number): boolean {
  if (state.credits < cost) return false
  const rankBefore = getRankForXp(state.xp)
  const next: QuizProgress = {
    ...state,
    credits: state.credits - cost,
    // لا ننقص الخبرة أبداً: إن كان المستخدم أعلى من العتبة الممنوحة يبقى كما هو
    xp: Math.max(state.xp, xpGrant),
    lastPlayedDate: todayKey(),
    placementCompleted: true,
    placementRank: rank,
  }
  next.badges = evaluateBadges(next)
  commit(next)
  void rankBefore
  return true
}

/** ينقص الكريدتس مقابل ميزة مدفوعة (مثل تجاوز اختبار التحديد). */
export function spendCredits(amount: number): boolean {
  if (amount <= 0) return true
  if (state.credits < amount) return false
  commit({ ...state, credits: state.credits - amount })
  return true
}

/** يضيف كريدتس (مكافآت القراءة، الدعوات، إلخ). */
export function grantCredits(amount: number): void {
  if (amount <= 0) return
  commit({ ...state, credits: state.credits + Math.round(amount) })
}

export function saveProfile(profile: MizanProfile): void {
  commit({ ...state, profile })
}

export function resetProgress(): void {
  commit({ ...EMPTY_PROGRESS })
}

/* ------------------------------------------------------------------ *
 * إحصاءات مشتقة
 * ------------------------------------------------------------------ */

export interface ProgressStats {
  totalAttempts: number
  answeredQuestions: number
  correctAnswers: number
  accuracy: number
  bestScore: number
  averageScore: number
  totalXp: number
  /** المسار الأكثر ممارسة (يُعرض في البروفايل). */
  favoriteTier: QuizTierLabel | null
  lastAttempt: QuizAttempt | null
}

type QuizTierLabel = QuizAttempt["tier"]

export function getProgressStats(progress: QuizProgress = state): ProgressStats {
  const attempts = progress.attempts
  const answeredQuestions = attempts.reduce((sum, attempt) => sum + (attempt.total || 0), 0)
  const correctAnswers = attempts.reduce((sum, attempt) => sum + (attempt.correct || 0), 0)
  const scores = attempts.map((attempt) => attempt.score).filter((score) => Number.isFinite(score))

  const counts = new Map<string, number>()
  attempts.forEach((attempt) => {
    counts.set(attempt.tier, (counts.get(attempt.tier) ?? 0) + 1)
  })
  const favoriteTier = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  return {
    totalAttempts: attempts.length,
    answeredQuestions,
    correctAnswers,
    accuracy: answeredQuestions > 0 ? Math.round((correctAnswers / answeredQuestions) * 100) : 0,
    bestScore: scores.length > 0 ? Math.max(...scores) : 0,
    averageScore: scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
    totalXp: progress.xp,
    favoriteTier: favoriteTier as QuizTierLabel | null,
    lastAttempt: attempts.length > 0 ? attempts[attempts.length - 1] : null,
  }
}

/**
 * عيّنة من معرّفات الأسئلة التي شوهدت مؤخراً (آخر 40) — تُمرّر إلى محرك
 * الاختيار حتى يقدّم الأسئلة الجديدة على التي تكررت.
 */
export function getRecentlySeenQuestionIds(progress: QuizProgress = state): string[] {
  const ids: string[] = []
  for (const attempt of progress.attempts) {
    for (const answer of attempt.answers) ids.push(answer.questionId)
  }
  return Array.from(new Set(ids)).slice(-40)
}
