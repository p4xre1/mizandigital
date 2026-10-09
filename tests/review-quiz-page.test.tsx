// @vitest-environment jsdom
import React from "react"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import type { QuizQuestion } from "../src/types/quiz"

const pool: QuizQuestion[] = [0, 1, 2].map((i) => ({
  id: `r-${i}`,
  tier: "general" as const,
  difficulty: "medium" as const,
  question: `مراجعة رقم ${i}؟`,
  options: ["أ", "ب", "ج", "د"],
  answer: 0,
  explanation: "شرح",
  reference: null,
}))

vi.mock("../src/hooks/useQuizQuestions", () => ({
  useQuizQuestions: () => ({ questions: pool, loading: false, hasCmsQuestions: false, hasPendingLocal: false, refresh: () => {} }),
}))
vi.mock("../src/hooks/useQuizProgress", () => ({
  useQuizProgress: () => ({ progress: { xp: 0, credits: 0 }, submitAttempt: vi.fn(), finishPlacement: vi.fn(), profile: null }),
}))
vi.mock("../src/lib/quiz/repository", () => ({ saveAttempt: vi.fn(async () => {}) }))
vi.mock("../src/components/seo/SEOHead", () => ({ SEOHead: () => null }))

import { ReviewQuizPage } from "../src/pages/public/quiz/ReviewQuizPage"
import { recordReview, todayInMorocco } from "../src/lib/learning/reviewStore"
import { addDays } from "../shared/learning/spaced-repetition.js"

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  window.localStorage.clear()
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe("ReviewQuizPage", () => {
  test("shows the number of due questions and starts a session with them", () => {
    // a question answered wrong three days ago is due today
    recordReview("r-1", { correct: false }, addDays(todayInMorocco(), -3))
    act(() =>
      root.render(
        <MemoryRouter>
          <ReviewQuizPage />
        </MemoryRouter>,
      ),
    )

    expect(container.textContent).toContain("1 سؤالاً مستحقاً")
    const start = [...container.querySelectorAll("button")].find((b) => b.textContent?.includes("ابدأ المراجعة"))
    expect(start).toBeTruthy()
    act(() => start!.click())
    expect(container.textContent).toContain("مراجعة رقم 1")
  })

  test("with nothing due, shows the empty state and no start button", () => {
    act(() =>
      root.render(
        <MemoryRouter>
          <ReviewQuizPage />
        </MemoryRouter>,
      ),
    )
    expect(container.textContent).toContain("لا توجد أسئلة مستحقة للمراجعة اليوم")
    expect([...container.querySelectorAll("button")].some((b) => b.textContent?.includes("ابدأ"))).toBe(false)
  })
})
