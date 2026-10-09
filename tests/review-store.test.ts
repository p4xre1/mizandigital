import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import {
  clearReviewStates,
  getDueCount,
  getDueQuestionIds,
  recordReview,
  todayInMorocco,
} from "../src/lib/learning/reviewStore"

/** Minimal in-memory localStorage so the store can run under the node test environment. */
function fakeWindow() {
  const data = new Map<string, string>()
  return {
    localStorage: {
      getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
      setItem: (k: string, v: string) => void data.set(k, String(v)),
      removeItem: (k: string) => void data.delete(k),
    },
  }
}

describe("review store (browser)", () => {
  beforeEach(() => {
    vi.stubGlobal("window", fakeWindow())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test("today is the calendar day in Morocco, not UTC", () => {
    // 23:30 UTC on 9 October is already 00:30 on 10 October in Morocco (UTC+1 outside Ramadan)
    expect(todayInMorocco(new Date("2026-10-09T23:30:00Z"))).toBe("2026-10-10")
    expect(todayInMorocco(new Date("2026-10-09T08:00:00Z"))).toBe("2026-10-09")
  })

  test("a question answered correctly is not due on the same day, and is due later", () => {
    recordReview("q1", { correct: true, elapsedMs: 9000 }, "2026-10-09")
    expect(getDueQuestionIds("2026-10-09")).toEqual([])
    expect(getDueQuestionIds("2026-10-10")).toEqual(["q1"])
  })

  test("a wrong answer brings the question back the next day", () => {
    recordReview("q2", { correct: false, elapsedMs: 3000 }, "2026-10-09")
    expect(getDueQuestionIds("2026-10-10")).toEqual(["q2"])
    expect(getDueCount("2026-10-10")).toBe(1)
  })

  test("due questions come most overdue first", () => {
    recordReview("old", { correct: false }, "2026-10-01")
    recordReview("newer", { correct: false }, "2026-10-08")
    expect(getDueQuestionIds("2026-10-10")).toEqual(["old", "newer"])
  })

  test("corrupt storage is ignored instead of crashing", () => {
    ;(globalThis as any).window.localStorage.setItem("mizan:review:v1", "{not json")
    expect(getDueQuestionIds("2026-10-10")).toEqual([])
    expect(() => recordReview("q3", { correct: true }, "2026-10-10")).not.toThrow()
  })

  test("clearReviewStates removes every schedule", () => {
    recordReview("q4", { correct: false }, "2026-10-09")
    clearReviewStates()
    expect(getDueQuestionIds("2026-10-10")).toEqual([])
  })

  test("without a window (server render), reads are empty and writes are no-ops", () => {
    vi.unstubAllGlobals()
    expect(getDueQuestionIds("2026-10-10")).toEqual([])
    expect(() => recordReview("q5", { correct: true }, "2026-10-10")).not.toThrow()
  })
})
