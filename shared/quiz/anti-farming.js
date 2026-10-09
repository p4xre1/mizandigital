// shared/quiz/anti-farming.js
//
// ─────────────────────────────────────────────────────────────────────────────
// Detecting bot-like quiz sessions (XP farming)
// ─────────────────────────────────────────────────────────────────────────────
// XP is the reward for answering quizzes, so a script can farm it: answer
// every question instantly, with the same timing, and collect the speed bonus.
// No human reads a question and picks an answer in under 1.5 seconds, so
// timing is the most reliable signal.
//
// Only fields the client cannot forge in a useful way are used: timings,
// question ids, and the chosen option. The client's "correct" flag is NOT used,
// because the client can set it to anything.
//
// Each rule adds points. A session is dropped when the total reaches
// BOT_SCORE_THRESHOLD. Each rule alone stays below the threshold, so a single
// signal (for example one unusually quick player) never causes a drop.

/** An answer faster than this (ms) is too quick for a human to read and choose. */
export const FAST_ANSWER_MS = 1500;
/** Pattern rules need at least this many answers to say anything. */
export const MIN_ANSWERS_FOR_PATTERN = 5;
/** Standard deviation of answer times (ms) below which timing looks scripted. */
export const UNIFORM_STDDEV_MS = 150;
/** Extra time (ms) allowed when the summed answer times exceed the session duration. */
export const DURATION_TOLERANCE_MS = 2000;
/** Score at or above which a session is dropped. */
export const BOT_SCORE_THRESHOLD = 60;

function stddev(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Scores one quiz session for bot-like behaviour.
 *
 * @param {object} session
 * @param {Array<{questionId: string, chosen: number|null, elapsedMs: number}>} session.answers
 * @param {number} [session.durationMs] total time reported by the client
 * @returns {{ action: "accept"|"drop", score: number, reasons: Array<{code: string, points: number}> }}
 */
export function assessQuizSession({ answers, durationMs } = {}) {
  const list = Array.isArray(answers) ? answers : [];
  const reasons = [];
  const add = (code, points) => reasons.push({ code, points });

  const times = list.map((a) => (typeof a?.elapsedMs === "number" && Number.isFinite(a.elapsedMs) ? Math.max(0, a.elapsedMs) : 0));
  const n = list.length;

  if (n >= MIN_ANSWERS_FOR_PATTERN) {
    // 1) إجابات أسرع من قراءة السؤال
    const fastShare = times.filter((t) => t < FAST_ANSWER_MS).length / n;
    if (fastShare >= 0.8) add("fast_answers_80", 50);
    else if (fastShare >= 0.5) add("fast_answers_50", 25);

    // 2) توقيت متطابق تقريباً بين الأسئلة (الانتهاء بالوقت المحدد لا يُحسب)
    const answeredTimes = times.filter((_, i) => list[i]?.chosen !== null && list[i]?.chosen !== undefined);
    if (answeredTimes.length >= MIN_ANSWERS_FOR_PATTERN && stddev(answeredTimes) < UNIFORM_STDDEV_MS) {
      add("uniform_timing", 40);
    }

    // 3) الاختيار نفسه في كل مرة
    const choices = list.map((a) => a?.chosen).filter((c) => typeof c === "number");
    if (n >= 10 && choices.length === n && new Set(choices).size === 1) {
      add("constant_choice", 20);
    }
  }

  // 4) مجموع أزمنة الإجابات أكبر من مدة الجلسة نفسها: توقيت متضارب
  if (typeof durationMs === "number" && Number.isFinite(durationMs)) {
    const total = times.reduce((a, b) => a + b, 0);
    if (total > durationMs + DURATION_TOLERANCE_MS) add("duration_mismatch", 40);
  }

  // 5) سؤال مكرر داخل الجلسة الواحدة (إعادة إرسال مُعدّة)
  const ids = list.map((a) => a?.questionId).filter(Boolean);
  if (new Set(ids).size !== ids.length) add("duplicate_questions", 30);

  const score = Math.min(100, reasons.reduce((sum, r) => sum + r.points, 0));
  return {
    action: score >= BOT_SCORE_THRESHOLD ? "drop" : "accept",
    score,
    reasons,
  };
}
