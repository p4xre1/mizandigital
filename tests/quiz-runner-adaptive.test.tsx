// @vitest-environment jsdom
import React from "react"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest"
import type { QuizQuestion } from "../src/types/quiz"

// ── Mocks: progress store, network, and the result panel (not under test) ──
const finishPlacement = vi.fn(() => ({ leveledUp: false, rankBefore: { id: "D" }, newBadges: [] }))
const submitAttempt = vi.fn(() => ({ leveledUp: false, rankBefore: { id: "D" }, newBadges: [] }))

vi.mock("../src/hooks/useQuizProgress", () => ({
  useQuizProgress: () => ({
    progress: { xp: 0, credits: 0 },
    submitAttempt,
    finishPlacement,
    rankProgress: {},
    profile: null,
  }),
}))
vi.mock("../src/lib/quiz/attemptService", () => ({
  submitAttemptSecure: vi.fn(async () => ({ verified: true })),
}))
vi.mock("../src/components/quiz/QuizResultPanel", async () => {
  const react = await import("react")
  return { QuizResultPanel: () => react.createElement("div", { "data-testid": "result" }) }
})

import { QuizRunner } from "../src/components/quiz/QuizRunner"
import { getDueQuestionIds, todayInMorocco } from "../src/lib/learning/reviewStore"
import { addDays } from "../shared/learning/spaced-repetition.js"

const LEVELS = ["easy", "medium", "hard"] as const
function makePool(n = 60): QuizQuestion[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `t-${i}`,
    tier: "general" as const,
    difficulty: LEVELS[i % 3],
    question: `سؤال رقم ${i}؟`,
    options: ["أ", "ب", "ج", "د"],
    answer: 0,
    explanation: "شرح",
    reference: null,
  }))
}

let container: HTMLDivElement
let root: Root

const press = (key: string) =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key }))
  })

/**
 * Plays a full adaptive session. `answerFor(question)` returns the key to press
 * (1..4), so the test controls the simulated student's ability.
 */
function play(answerFor: (q: QuizQuestion) => string, pool: QuizQuestion[]) {
  act(() => {
    root.render(
      <QuizRunner
        questions={pool}
        mode="placement"
        label="اختبار تحديد المستوى"
        tier="mixed"
        placement
        adaptive
        onExit={() => {}}
      />,
    )
  })
  const asked: string[] = []
  // Each iteration: answer the shown question, then advance. Stop when the runner finishes.
  for (let guard = 0; guard < 40; guard += 1) {
    if (finishPlacement.mock.calls.length > 0) break
    const shown = document.body.textContent?.match(/سؤال رقم (\d+)؟/)
    if (!shown) break
    const question = pool[Number(shown[1])]
    if (!asked.includes(question.id)) asked.push(question.id)
    press(answerFor(question))
    press("Enter")
  }
  return asked
}

beforeAll(() => {
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
})

beforeEach(() => {
  window.localStorage.clear()
  finishPlacement.mockClear()
  submitAttempt.mockClear()
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe("QuizRunner — adaptive placement (UI)", () => {
  test("a strong student finishes in a bounded number of questions and gets rank A", () => {
    const pool = makePool()
    // answers correctly up to hard items: picks the right option (key 1) for every question
    const asked = play(() => "1", pool)

    expect(finishPlacement).toHaveBeenCalledTimes(1)
    const [attempt, rank] = finishPlacement.mock.calls[0] as unknown as [{ total: number }, string]
    expect(attempt.total).toBeGreaterThanOrEqual(8)
    expect(attempt.total).toBeLessThanOrEqual(15)
    expect(asked.length).toBe(attempt.total)
    expect(new Set(asked).size).toBe(asked.length) // no repeats
    expect(rank).toBe("A")
  })

  test("a weak student gets rank D", () => {
    const pool = makePool()
    // always wrong (key 2 is not the answer index 0)
    play(() => "2", pool)
    const [, rank] = finishPlacement.mock.calls[0] as unknown as [unknown, string]
    expect(rank).toBe("D")
  })

  test("every answer is recorded for spaced review; wrong answers are due tomorrow, nothing is due today", () => {
    const pool = makePool(20)
    // wrong on hard items, right on the rest
    const asked = play((q) => (q.difficulty === "hard" ? "2" : "1"), pool)
    const stored = JSON.parse(window.localStorage.getItem("mizan:review:v1") || "{}")
    expect(Object.keys(stored).length).toBe(asked.length)

    const today = todayInMorocco()
    expect(getDueQuestionIds(today)).toEqual([])
    const due = getDueQuestionIds(addDays(today, 1))
    const hardAsked = asked.filter((id) => pool.find((q) => q.id === id)?.difficulty === "hard")
    expect(hardAsked.length).toBeGreaterThan(0)
    for (const id of hardAsked) expect(due).toContain(id)
  })
})
