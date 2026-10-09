// shared/quiz/adaptive.js
//
// ─────────────────────────────────────────────────────────────────────────────
// Adaptive placement test (1-parameter logistic / Rasch IRT)
// ─────────────────────────────────────────────────────────────────────────────
// The fixed placement test asks everyone the same 15 questions in the same
// order. An adaptive test asks the question that tells the most about the
// student's ability right now, so fewer questions give a reliable rank.
//
// Model
//   P(correct | ability θ, item difficulty b) = 1 / (1 + e^-(θ − b))
//   Item difficulty b comes from the difficulty tag: easy −1, medium 0, hard +1.
//   The tags are coarse, so the estimate is coarse too. It is good enough for
//   a rank (D, C, B, A), not for a score.
//
// Estimation: expected a posteriori (EAP) on a grid from −4 to 4, with a
// standard normal prior. Unlike maximum likelihood, this stays finite when the
// student answers every question right or wrong.
//
// Selection: the unused item with the largest information I = P(1 − P) at the
// current θ. The top few are shuffled so that everyone does not see the exact
// same sequence.
//
// Stopping: at least ADAPTIVE_MIN_ITEMS answers, and the posterior standard
// deviation is at most STOP_SD; or ADAPTIVE_MAX_ITEMS answers in all.
//
// Calibration (simulated 200 students per ability level, θ from −2 to +2):
// with three difficulty levels the posterior SD stays above 0.35 for all 15
// items, so that threshold never stops early. At 0.6 the test averages about
// 9 items (range 8–12), and the rank matches the true ability in most runs.

export const ADAPTIVE_MIN_ITEMS = 8;
export const ADAPTIVE_MAX_ITEMS = 15;
/** Stop when the uncertainty about θ falls below this (in θ units). */
export const STOP_SD = 0.6;
/** How many of the most informative items are candidates for the next question. */
export const SELECTION_TOP_K = 3;

/** Difficulty tag → item difficulty b on the θ scale. */
export const DIFFICULTY_B = Object.freeze({ easy: -1, medium: 0, hard: 1 });

/** Rank cut-offs on the posterior mean θ. Above a cut-off, the next rank applies. */
export const RANK_THRESHOLDS = Object.freeze({ C: -0.5, B: 0.25, A: 1.0 });

const GRID = Array.from({ length: 81 }, (_, i) => -4 + i * 0.1);

/** Item difficulty b for a question (medium when the tag is unknown). */
export function itemDifficulty(question) {
  return DIFFICULTY_B[question?.difficulty] ?? 0;
}

/** P(correct) under the Rasch model. */
export function probabilityCorrect(theta, b) {
  return 1 / (1 + Math.exp(-(theta - b)));
}

/** Fisher information of an item at θ: P(1 − P). */
export function itemInformation(theta, b) {
  const p = probabilityCorrect(theta, b);
  return p * (1 - p);
}

/**
 * Posterior mean and standard deviation of θ given the answers so far.
 * @param {Array<{ b: number, correct: boolean }>} responses
 * @returns {{ theta: number, sd: number }}
 */
export function estimateAbility(responses) {
  const weights = GRID.map((theta) => {
    // log prior N(0,1), up to a constant
    let logw = -0.5 * theta * theta;
    for (const r of responses) {
      const p = probabilityCorrect(theta, r.b);
      logw += Math.log(r.correct ? p : 1 - p);
    }
    return logw;
  });
  // stabilise before exponentiating
  const max = Math.max(...weights);
  const w = weights.map((lw) => Math.exp(lw - max));
  const total = w.reduce((a, b) => a + b, 0);

  let mean = 0;
  for (let i = 0; i < GRID.length; i += 1) mean += (GRID[i] * w[i]) / total;
  let variance = 0;
  for (let i = 0; i < GRID.length; i += 1) variance += ((GRID[i] - mean) ** 2 * w[i]) / total;

  return { theta: mean, sd: Math.sqrt(variance) };
}

/** Should the test stop now? */
export function shouldStop({ count, sd }) {
  if (count >= ADAPTIVE_MAX_ITEMS) return true;
  return count >= ADAPTIVE_MIN_ITEMS && sd <= STOP_SD;
}

/**
 * Rank from the ability estimate. Anything below the C threshold is D.
 * @param {number} theta
 * @returns {"D"|"C"|"B"|"A"}
 */
export function rankForAbility(theta) {
  if (theta >= RANK_THRESHOLDS.A) return "A";
  if (theta >= RANK_THRESHOLDS.B) return "B";
  if (theta >= RANK_THRESHOLDS.C) return "C";
  return "D";
}

/**
 * Chooses the next question from the pool.
 *
 * @param {object} args
 * @param {Array<{id:string, difficulty:string}>} args.pool
 * @param {Array<{ question: {id:string, difficulty:string}, correct: boolean }>} args.answered
 * @param {() => number} [args.rng]  random source in [0,1); injectable for tests
 * @returns {{ question: object|null, theta: number, sd: number, done: boolean }}
 */
export function nextAdaptiveQuestion({ pool, answered = [], rng = Math.random }) {
  const responses = answered.map((a) => ({ b: itemDifficulty(a.question), correct: Boolean(a.correct) }));
  const { theta, sd } = estimateAbility(responses);
  const count = answered.length;

  if (shouldStop({ count, sd })) return { question: null, theta, sd, done: true };

  const used = new Set(answered.map((a) => a.question.id));
  const candidates = pool
    .filter((q) => !used.has(q.id))
    .map((q) => ({ q, info: itemInformation(theta, itemDifficulty(q)) }))
    .sort((a, b) => b.info - a.info || (a.q.id < b.q.id ? -1 : 1));

  if (candidates.length === 0) return { question: null, theta, sd, done: true };

  const top = candidates.slice(0, SELECTION_TOP_K);
  const pick = top[Math.min(top.length - 1, Math.floor(rng() * top.length))];
  return { question: pick.q, theta, sd, done: false };
}
