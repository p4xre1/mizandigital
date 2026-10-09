/**
 * Browser storage for the spaced-repetition schedule (shared/learning/spaced-repetition.js).
 *
 * Each answered question gets a schedule entry in localStorage. Quiz results
 * still sync to the server as before. This store only decides which questions
 * come back for review, so it works offline and needs no database table.
 *
 * "Today" is the calendar day in Morocco (Africa/Casablanca), so a student who
 * answers at 23:50 is not shifted to the next day by a UTC clock.
 */

import {
  dueQuestionIds,
  nextState,
  qualityFromAnswer,
} from "../../../shared/learning/spaced-repetition.js"

const STORAGE_KEY = "mizan:review:v1"

export interface ReviewState {
  ease: number
  interval: number
  reps: number
  lapses: number
  due: string
}

type ReviewMap = Record<string, ReviewState>

/** Calendar day in Morocco as YYYY-MM-DD. */
export function todayInMorocco(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Africa/Casablanca" })
}

function readAll(): ReviewMap {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : {}
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as ReviewMap) : {}
  } catch {
    return {}
  }
}

function writeAll(map: ReviewMap): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Storage full or blocked (private mode): losing a schedule is acceptable.
  }
}

/** Records one answer and moves that question's next review date. */
export function recordReview(
  questionId: string,
  answer: { correct: boolean; elapsedMs?: number },
  today: string = todayInMorocco(),
): ReviewState {
  const map = readAll()
  const next = nextState(map[questionId] ?? null, qualityFromAnswer(answer), today) as ReviewState
  map[questionId] = next
  writeAll(map)
  return next
}

/** Question ids due for review today or earlier, most overdue first. */
export function getDueQuestionIds(today: string = todayInMorocco(), limit = Infinity): string[] {
  return dueQuestionIds(readAll(), today, limit)
}

/** Number of questions due now. */
export function getDueCount(today: string = todayInMorocco()): number {
  return dueQuestionIds(readAll(), today).length
}

/** Removes every schedule (used by "reset progress"). */
export function clearReviewStates(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
