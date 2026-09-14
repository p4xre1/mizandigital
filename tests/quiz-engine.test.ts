import { test, expect, describe } from "vitest"
import questions from "../src/data/quiz-questions.json"
import type { QuizAttempt, QuizQuestion } from "../src/types/quiz"
import {
  XP,
  buildPlacementPool,
  formatDuration,
  gradeAnswer,
  pickQuestions,
  placementRankForScore,
  shuffle,
  summarizeSession,
  type GradedAnswer,
} from "../src/lib/quiz/engine"
import { RANKS, getRankForXp, getRankProgress } from "../src/lib/quiz/ranks"
import { computeStreak, evaluateBadges, getProgressStats } from "../src/lib/quiz/progressStore"
import { mergeQuestions, validateQuestion } from "../src/lib/quiz/repository"

const bank = questions as QuizQuestion[]

/** يبني سؤالاً وهمياً صالحاً للاختبارات (بدون الاعتماد على البنك الحقيقي). */
function makeQuestion(overrides: Partial<QuizQuestion> = {}): QuizQuestion {
  return {
    id: "test-1",
    tier: "general",
    difficulty: "easy",
    question: "سؤال اختباري؟",
    options: ["أ", "ب", "ج", "د"],
    answer: 1,
    explanation: "شرح الاختبار",
    source: "cms",
    ...overrides,
  }
}

/** يبني سجل محاولة وهمياً لحساب الإحصاءات والأوسمة. */
function makeAttempt(overrides: Partial<QuizAttempt> = {}): QuizAttempt {
  return {
    id: "attempt-1",
    mode: "general",
    label: "اختبار تجريبي",
    tier: "general",
    total: 10,
    correct: 8,
    score: 80,
    xpEarned: 120,
    creditsEarned: 13,
    bestStreak: 4,
    durationMs: 90_000,
    finishedAt: new Date().toISOString(),
    answers: [],
    ...overrides,
  }
}

/* ------------------------------------------------------------------ *
 * سلامة بنك الأسئلة
 * ------------------------------------------------------------------ */

describe("بنك الأسئلة المحلي", () => {
  test("كل سؤال له معرّف فريد", () => {
    const ids = bank.map((question) => question.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test("كل سؤال يملك أربعة خيارات مختلفة وجواباً داخل النطاق", () => {
    for (const question of bank) {
      expect(question.options, question.id).toHaveLength(4)
      expect(new Set(question.options).size, question.id).toBe(4)
      expect(question.answer, question.id).toBeGreaterThanOrEqual(0)
      expect(question.answer, question.id).toBeLessThan(4)
    }
  })

  test("كل سؤال مرفق بشرح ونص واضحين", () => {
    for (const question of bank) {
      expect(question.question.trim().length, question.id).toBeGreaterThan(10)
      expect(question.explanation.trim().length, question.id).toBeGreaterThan(20)
    }
  })

  test("التصنيف إلزامي بحسب المسار", () => {
    for (const question of bank) {
      if (question.tier === "university") {
        expect(question.semester, question.id).toMatch(/^S[1-6]$/)
        expect(question.module, question.id).toBeTruthy()
      }
      if (question.tier === "concours") expect(question.body, question.id).toBeTruthy()
      if (question.tier === "interview") expect(question.track, question.id).toBeTruthy()
    }
  })

  test("المسارات الأربعة كلها مغطاة، وكل فصل دراسي فيه أسئلة", () => {
    const tiers = new Set(bank.map((question) => question.tier))
    expect(tiers).toEqual(new Set(["university", "general", "concours", "interview"]))

    const semesters = new Set(
      bank.filter((question) => question.tier === "university").map((question) => question.semester)
    )
    expect(semesters).toEqual(new Set(["S1", "S2", "S3", "S4", "S5", "S6"]))
  })
})

/* ------------------------------------------------------------------ *
 * المحرّك
 * ------------------------------------------------------------------ */

describe("محرّك الاختبارات", () => {
  test("الترتيب العشوائي ببذرة ثابتة يعطي نفس النتيجة ولا يعدّل الأصلية", () => {
    const list = [1, 2, 3, 4, 5, 6]
    const first = shuffle(list, 42)
    const second = shuffle(list, 42)
    expect(first).toEqual(second)
    expect(list).toEqual([1, 2, 3, 4, 5, 6])
    expect(shuffle(list, 43)).not.toEqual(first)
  })

  test("اختيار الأسئلة يعطي الأولوية للجديد ويحترم العدد المطلوب", () => {
    const pool = Array.from({ length: 10 }, (_, index) => makeQuestion({ id: `q${index}` }))
    const picked = pickQuestions(pool, { count: 4, excludeIds: ["q0", "q1"], seed: 7 })
    expect(picked).toHaveLength(4)
    // الأسئلة المستبعدة لا تظهر إلا عند الضرورة
    expect(picked.map((item) => item.id)).not.toContain("q0")
  })

  test("اختيار الأسئلة لا يتجاوز حجم المخزون", () => {
    const pool = [makeQuestion({ id: "only" })]
    expect(pickQuestions(pool, { count: 20 })).toHaveLength(1)
  })

  test("التصحيح يمنح النقاط للإجابة الصحيحة فقط", () => {
    const question = makeQuestion({ answer: 2, difficulty: "hard" })
    const correct = gradeAnswer({ question, chosen: 2, elapsedMs: 30_000 }, 0)
    const wrong = gradeAnswer({ question, chosen: 0, elapsedMs: 30_000 }, 3)

    expect(correct.correct).toBe(true)
    expect(correct.streak).toBe(1)
    expect(correct.xp).toBe(XP.correct + 6) // +6 مكافأة الصعوبة (hard)
    expect(wrong.correct).toBe(false)
    expect(wrong.xp).toBe(0)
    expect(wrong.streak).toBe(0) // الخطأ يكسر التتالي
  })

  test("مكافأة السرعة تُمنح فقط للإجابة الصحيحة داخل المهلة", () => {
    const question = makeQuestion({ answer: 0, difficulty: "easy" })
    const fast = gradeAnswer({ question, chosen: 0, elapsedMs: 2_000 }, 0)
    const slow = gradeAnswer({ question, chosen: 0, elapsedMs: XP.fastMs + 5_000 }, 0)
    expect(fast.xp).toBe(XP.correct + XP.fastBonus)
    expect(slow.xp).toBe(XP.correct)
  })

  test("مكافأة التتالي تظهر عند كل سلسلة مكتملة", () => {
    const question = makeQuestion({ answer: 0, difficulty: "easy" })
    const third = gradeAnswer({ question, chosen: 0, elapsedMs: 30_000 }, 2)
    expect(third.streak).toBe(3)
    expect(third.xp).toBe(XP.correct + XP.streakBonus)
  })

  test("ملخص الجلسة يحسب النسبة والمكافآت والكريدتس", () => {
    const question = makeQuestion({ answer: 0, difficulty: "easy" })
    const graded: GradedAnswer[] = Array.from({ length: 10 }, () =>
      gradeAnswer({ question, chosen: 0, elapsedMs: 30_000 }, 0)
    )
    const summary = summarizeSession(graded, "university", 120_000)

    expect(summary.correct).toBe(10)
    expect(summary.score).toBe(100)
    expect(summary.isPerfect).toBe(true)
    expect(summary.xpEarned).toBe((XP.correct * 10 + XP.completion + XP.perfect) * 1)
    expect(summary.creditsEarned).toBeGreaterThan(0)
  })

  test("معامل المسار يضاعف نقاط المباريات ويخفّض العشوائي", () => {
    const question = makeQuestion({ answer: 0, difficulty: "easy" })
    const graded: GradedAnswer[] = Array.from({ length: 5 }, () =>
      gradeAnswer({ question, chosen: 0, elapsedMs: 30_000 }, 0)
    )
    const concours = summarizeSession(graded, "concours", 60_000)
    const general = summarizeSession(graded, "general", 60_000)
    expect(concours.xpEarned).toBeGreaterThan(general.xpEarned)
  })

  test("جلسة تحديد المستوى تمزج المسارات وتبدأ بالأسهل", () => {
    const pool = buildPlacementPool(bank, 3)
    expect(pool.length).toBeGreaterThan(6)
    expect(pool.length).toBeLessThanOrEqual(15)
    expect(pool[0].difficulty).toBe("easy")
  })

  test("رتبة التحديد تناسب النتيجة", () => {
    expect(placementRankForScore(95)).toBe("A")
    expect(placementRankForScore(80)).toBe("B")
    expect(placementRankForScore(60)).toBe("C")
    expect(placementRankForScore(20)).toBe("D")
  })

  test("تنسيق المدة يقرأ بالعربية", () => {
    expect(formatDuration(45_000)).toBe("45 ث")
    expect(formatDuration(185_000)).toBe("3 د 05 ث")
    expect(formatDuration(Number.NaN)).toBe("—")
  })
})

/* ------------------------------------------------------------------ *
 * الرتب والألعاب
 * ------------------------------------------------------------------ */

describe("نظام الرتب", () => {
  test("الرتب تتصاعد بلا فجوات", () => {
    expect(RANKS.map((rank) => rank.id)).toEqual(["D", "C", "B", "A", "S", "SS", "SSS"])
    expect(getRankForXp(0).id).toBe("D")
    expect(getRankForXp(121).id).toBe("C")
    expect(getRankForXp(5_000).id).toBe("SSS")
    expect(getRankForXp(-50).id).toBe("D")
  })

  test("شريط التقدم يحسب النسبة والخبرة المتبقية", () => {
    const progress = getRankProgress(RANKS[0].minXp + 60)
    expect(progress.rank.id).toBe("D")
    expect(progress.next?.id).toBe("C")
    expect(progress.percent).toBe(50)
    expect(progress.xpToNext).toBe(60)
  })

  test("أعلى رتبة ليس لها رتبة موالية", () => {
    const progress = getRankProgress(9_999)
    expect(progress.next).toBeNull()
    expect(progress.percent).toBe(100)
  })

  test("سلسلة الأيام تنكسر بعد يوم فائت وتستمر يوماً بيوم", () => {
    expect(computeStreak(null, 0)).toBe(1)
    expect(computeStreak("2026-09-13", 4, "2026-09-14")).toBe(5)
    expect(computeStreak("2026-09-13", 4, "2026-09-13")).toBe(4)
    expect(computeStreak("2026-09-01", 9, "2026-09-14")).toBe(1)
  })

  test("الأوسمة تُمنح بحسب السجل", () => {
    const base = {
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
    expect(evaluateBadges(base)).toEqual([])

    const withQuiz = { ...base, attempts: [makeAttempt({ score: 100, correct: 10, total: 10 })] }
    const badges = evaluateBadges(withQuiz)
    expect(badges).toContain("first_quiz")
    expect(badges).toContain("perfect")
  })

  test("الإحصاءات تحسب الدقة وأفضل نتيجة", () => {
    const stats = getProgressStats({
      xp: 300,
      credits: 40,
      lastPlayedDate: null,
      streakDays: 0,
      attempts: [
        makeAttempt({ total: 10, correct: 8, score: 80 }),
        makeAttempt({ id: "attempt-2", total: 5, correct: 5, score: 100 }),
      ],
      placementCompleted: true,
      placementRank: "B",
      profile: null,
      badges: [],
    })
    expect(stats.answeredQuestions).toBe(15)
    expect(stats.correctAnswers).toBe(13)
    expect(stats.accuracy).toBe(87)
    expect(stats.bestScore).toBe(100)
    expect(stats.averageScore).toBe(90)
  })
})

/* ------------------------------------------------------------------ *
 * المستودع والتحقق
 * ------------------------------------------------------------------ */

describe("التحقق من الأسئلة ودمجها", () => {
  test("يرفض سؤالاً ناقص الخيارات أو بلا جواب محدد", () => {
    expect(validateQuestion(makeQuestion({ options: ["أ", "ب"] })).valid).toBe(false)
    expect(validateQuestion(makeQuestion({ answer: 9 })).valid).toBe(false)
    expect(validateQuestion(makeQuestion({ explanation: "" })).valid).toBe(false)
    expect(validateQuestion(makeQuestion({ options: ["أ", "أ", "ج", "د"] })).valid).toBe(false)
  })

  test("يقبل سؤالاً مكتملاً", () => {
    expect(validateQuestion(makeQuestion()).errors).toEqual([])
  })

  test("نسخة قاعدة البيانات تغطي على نسخة الملف المحلي عند تطابق المعرّف", () => {
    const seed = makeQuestion({ id: "x", question: "قديمة", source: "seed" })
    const cms = makeQuestion({ id: "x", question: "جديدة", source: "cms" })
    const merged = mergeQuestions([seed], [cms], [])
    expect(merged).toHaveLength(1)
    expect(merged[0].question).toBe("جديدة")
  })

  test("الأسئلة المحلية المعلّقة تظهر حتى بلا قاعدة بيانات", () => {
    const pending = makeQuestion({ id: "local-1", source: "cms" })
    const merged = mergeQuestions([makeQuestion({ id: "x" })], [], [pending])
    expect(merged.map((item) => item.id)).toContain("local-1")
  })
})
