// shared/learning/spaced-repetition.js
//
// ─────────────────────────────────────────────────────────────────────────────
// Spaced repetition (SM-2) for quiz questions
// ─────────────────────────────────────────────────────────────────────────────
// A question that the student got wrong comes back tomorrow. A question they
// got right comes back after 1, then 3, then about interval × ease days. The
// ease factor drops with each mistake and rises with each easy recall. This is
// the classic SM-2 scheme (Wozniak, 1987), simplified for three answer grades.
//
// Pure functions only: no storage, no clock. Callers pass the current day as
// an ISO date (YYYY-MM-DD) so tests are deterministic.

/** Minimum ease factor. Below this, a question keeps coming back too often. */
export const MIN_EASE = 1.3;
/** Starting ease for a new question. */
export const START_EASE = 2.5;
/** An answer slower than this (ms) counts as "correct but hard": quality 3, not 4. */
export const SLOW_ANSWER_MS = 20_000;
/** An answer faster than this (ms) counts as "effortless": quality 5. */
export const FAST_ANSWER_MS = 6_000;

/**
 * Adds days to an ISO date and returns the new ISO date (UTC arithmetic, so no
 * daylight-saving surprises).
 * @param {string} isoDay YYYY-MM-DD
 * @param {number} days
 * @returns {string}
 */
export function addDays(isoDay, days) {
  const [y, m, d] = String(isoDay).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + Math.round(days)));
  return date.toISOString().slice(0, 10);
}

/** Fresh state for a question seen for the first time. */
export function initialState(today) {
  return { ease: START_EASE, interval: 0, reps: 0, lapses: 0, due: today };
}

/**
 * Maps one answer to an SM-2 quality grade (0–5).
 *   wrong          → 1  (forgotten)
 *   right, slow    → 3  (recalled with effort)
 *   right, normal  → 4  (recalled)
 *   right, fast    → 5  (effortless)
 * @param {{ correct: boolean, elapsedMs?: number }} answer
 * @returns {number}
 */
export function qualityFromAnswer({ correct, elapsedMs }) {
  if (!correct) return 1;
  if (typeof elapsedMs === "number" && elapsedMs >= SLOW_ANSWER_MS) return 3;
  if (typeof elapsedMs === "number" && elapsedMs <= FAST_ANSWER_MS) return 5;
  return 4;
}

/**
 * Next review state after one answer.
 * @param {{ease:number, interval:number, reps:number, lapses:number, due:string}|null} previous
 * @param {number} quality 0–5 (see qualityFromAnswer)
 * @param {string} today YYYY-MM-DD
 */
export function nextState(previous, quality, today) {
  const prev = previous ?? initialState(today);
  const q = Math.max(0, Math.min(5, Math.round(quality)));

  let { ease, interval, reps, lapses } = prev;

  if (q < 3) {
    // Failed recall: start over, but keep the ease the question earned.
    reps = 0;
    interval = 1;
    lapses += 1;
  } else {
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 3;
    else interval = Math.max(1, Math.round(interval * ease));
  }

  // SM-2 ease update.
  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  ease = Math.max(MIN_EASE, Math.round(ease * 100) / 100);

  return { ease, interval, reps, lapses, due: addDays(today, interval) };
}

/**
 * Is this question due today or earlier?
 * @param {{due:string}|null|undefined} state
 * @param {string} today
 */
export function isDue(state, today) {
  return Boolean(state) && state.due <= today;
}

/**
 * Due question ids, most overdue first. Among equally overdue questions,
 * the ones with more lapses come first (they are the weakest).
 *
 * @param {Record<string, {due:string, lapses:number}>} states
 * @param {string} today
 * @param {number} [limit]
 * @returns {string[]}
 */
export function dueQuestionIds(states, today, limit = Infinity) {
  return Object.entries(states ?? {})
    .filter(([, state]) => isDue(state, today))
    .sort(([, a], [, b]) => (a.due === b.due ? b.lapses - a.lapses : a.due < b.due ? -1 : 1))
    .slice(0, Math.max(0, limit))
    .map(([id]) => id);
}
