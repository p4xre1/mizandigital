import { describe, expect, test } from "vitest"
import { BOT_SCORE_THRESHOLD, assessQuizSession } from "../shared/quiz/anti-farming.js"

/** A human-looking session: varied reading and thinking times, varied choices. */
const HUMAN = [
  { questionId: "q1", chosen: 2, elapsedMs: 4200 },
  { questionId: "q2", chosen: 0, elapsedMs: 9100 },
  { questionId: "q3", chosen: 3, elapsedMs: 2600 },
  { questionId: "q4", chosen: 1, elapsedMs: 12500 },
  { questionId: "q5", chosen: 2, elapsedMs: 6800 },
  { questionId: "q6", chosen: 0, elapsedMs: 3300 },
  { questionId: "q7", chosen: 1, elapsedMs: 8800 },
]

const codes = (r: ReturnType<typeof assessQuizSession>) => r.reasons.map((x) => x.code)

describe("anti-farming — human sessions are accepted", () => {
  test("a varied, realistic session is accepted with no reasons", () => {
    const r = assessQuizSession({ answers: HUMAN, durationMs: 80_000 })
    expect(r.action).toBe("accept")
    expect(r.score).toBe(0)
    expect(r.reasons).toEqual([])
  })

  test("one unusually quick player is not dropped (one signal is below the threshold)", () => {
    const quick = HUMAN.map((a, i) => ({ ...a, elapsedMs: i < 5 ? 900 : 9000 }))
    const r = assessQuizSession({ answers: quick, durationMs: 60_000 })
    expect(r.score).toBeLessThan(BOT_SCORE_THRESHOLD)
    expect(r.action).toBe("accept")
  })

  test("short sessions are never judged on pattern rules", () => {
    const short = [
      { questionId: "a", chosen: 0, elapsedMs: 200 },
      { questionId: "b", chosen: 0, elapsedMs: 200 },
    ]
    expect(assessQuizSession({ answers: short, durationMs: 1000 }).action).toBe("accept")
  })

  test("timed-out answers (chosen null) do not count as uniform timing", () => {
    const timedOut = HUMAN.map((a, i) => ({ ...a, chosen: i < 2 ? null : a.chosen, elapsedMs: i < 2 ? 30000 : a.elapsedMs }))
    expect(codes(assessQuizSession({ answers: timedOut, durationMs: 90_000 }))).not.toContain("uniform_timing")
  })
})

describe("anti-farming — bot-like sessions are dropped", () => {
  test("instant, identical answers with the same choice are dropped", () => {
    const bot = Array.from({ length: 12 }, (_, i) => ({ questionId: `q${i}`, chosen: 0, elapsedMs: 300 }))
    const r = assessQuizSession({ answers: bot, durationMs: 4000 })
    expect(r.action).toBe("drop")
    expect(r.score).toBeGreaterThanOrEqual(BOT_SCORE_THRESHOLD)
    expect(codes(r)).toEqual(expect.arrayContaining(["fast_answers_80", "uniform_timing", "constant_choice"]))
  })

  test("fast and uniform timing alone is enough to drop", () => {
    const bot = Array.from({ length: 8 }, (_, i) => ({ questionId: `q${i}`, chosen: i % 4, elapsedMs: 1000 + i }))
    expect(assessQuizSession({ answers: bot, durationMs: 20_000 }).action).toBe("drop")
  })

  test("summed answer times larger than the session duration is flagged", () => {
    const r = assessQuizSession({ answers: HUMAN, durationMs: 10_000 })
    expect(codes(r)).toContain("duration_mismatch")
  })

  test("a repeated question id in one session is flagged", () => {
    const dup = [...HUMAN, { questionId: "q1", chosen: 1, elapsedMs: 5000 }]
    expect(codes(assessQuizSession({ answers: dup, durationMs: 90_000 }))).toContain("duplicate_questions")
  })
})

describe("anti-farming — robustness", () => {
  test("missing or non-numeric timings count as instant answers", () => {
    const missing = HUMAN.map((a) => ({ questionId: a.questionId, chosen: a.chosen }))
    const r = assessQuizSession({ answers: missing as any, durationMs: 90_000 })
    expect(codes(r)).toContain("fast_answers_80")
  })

  test("score is capped at 100 and reasons add up to the score", () => {
    const bot = Array.from({ length: 12 }, () => ({ questionId: "same", chosen: 0, elapsedMs: 100 }))
    const r = assessQuizSession({ answers: bot, durationMs: 10 })
    expect(r.score).toBeLessThanOrEqual(100)
    const sum = r.reasons.reduce((s, x) => s + x.points, 0)
    expect(r.score).toBe(Math.min(100, sum))
  })

  test("non-array input is accepted with no signals (the endpoint validates shape)", () => {
    expect(assessQuizSession({ answers: null as any }).action).toBe("accept")
    expect(assessQuizSession().action).toBe("accept")
  })
})
