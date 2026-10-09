import { describe, expect, test } from "vitest"
import {
  MIN_EASE,
  START_EASE,
  addDays,
  dueQuestionIds,
  initialState,
  isDue,
  nextState,
  qualityFromAnswer,
} from "../shared/learning/spaced-repetition.js"

const DAY = "2026-10-09"

describe("spaced repetition — dates", () => {
  test("addDays crosses month and year boundaries", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02")
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01")
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29")
    expect(addDays(DAY, 0)).toBe(DAY)
  })
})

describe("spaced repetition — grades", () => {
  test("wrong answers grade 1, right answers 3–5 by speed", () => {
    expect(qualityFromAnswer({ correct: false, elapsedMs: 2000 })).toBe(1)
    expect(qualityFromAnswer({ correct: true, elapsedMs: 3000 })).toBe(5)
    expect(qualityFromAnswer({ correct: true, elapsedMs: 10000 })).toBe(4)
    expect(qualityFromAnswer({ correct: true, elapsedMs: 25000 })).toBe(3)
    expect(qualityFromAnswer({ correct: true })).toBe(4)
  })
})

describe("spaced repetition — scheduling", () => {
  test("a new question that is recalled comes back after 1, then 3, then growing days", () => {
    let s = initialState(DAY)
    s = nextState(s, 4, DAY)
    expect(s.interval).toBe(1)
    expect(s.due).toBe("2026-10-10")

    s = nextState(s, 4, s.due)
    expect(s.interval).toBe(3)

    const before = s.interval
    s = nextState(s, 4, s.due)
    expect(s.interval).toBeGreaterThan(before)
    expect(s.reps).toBe(3)
  })

  test("a wrong answer resets the schedule and counts a lapse", () => {
    let s = initialState(DAY)
    s = nextState(s, 4, DAY)
    s = nextState(s, 4, s.due)
    s = nextState(s, 1, s.due)
    expect(s.reps).toBe(0)
    expect(s.interval).toBe(1)
    expect(s.lapses).toBe(1)
  })

  test("ease never drops below the floor, however many mistakes", () => {
    let s = initialState(DAY)
    for (let i = 0; i < 20; i += 1) s = nextState(s, 1, s.due)
    expect(s.ease).toBe(MIN_EASE)
  })

  test("easy recalls raise the ease above the start value", () => {
    let s = initialState(DAY)
    for (let i = 0; i < 3; i += 1) s = nextState(s, 5, s.due)
    expect(s.ease).toBeGreaterThan(START_EASE)
  })

  test("quality is clamped to 0–5 and rounded", () => {
    expect(() => nextState(null, 9, DAY)).not.toThrow()
    expect(nextState(null, -4, DAY).lapses).toBe(1)
  })
})

describe("spaced repetition — queue", () => {
  test("isDue compares ISO dates; missing state is not due", () => {
    expect(isDue({ due: DAY }, DAY)).toBe(true)
    expect(isDue({ due: "2026-10-08" }, DAY)).toBe(true)
    expect(isDue({ due: "2026-10-10" }, DAY)).toBe(false)
    expect(isDue(undefined, DAY)).toBe(false)
  })

  test("dueQuestionIds: most overdue first, then weakest (most lapses), with a limit", () => {
    const states = {
      a: { due: "2026-10-09", lapses: 0 },
      b: { due: "2026-10-05", lapses: 0 },
      c: { due: "2026-10-05", lapses: 3 },
      d: { due: "2026-10-20", lapses: 9 },
    }
    expect(dueQuestionIds(states, DAY)).toEqual(["c", "b", "a"])
    expect(dueQuestionIds(states, DAY, 2)).toEqual(["c", "b"])
    expect(dueQuestionIds({}, DAY)).toEqual([])
  })
})
