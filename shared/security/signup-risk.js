// shared/security/signup-risk.js
//
// ─────────────────────────────────────────────────────────────────────────────
// Algorithm 1 — risk score for new account creation (sign-up abuse)
// ─────────────────────────────────────────────────────────────────────────────
// Pure functions only: no network, no database, no globals. The same module is
// used by functions/api/account/signup-risk.js (server decision) and by the
// tests. Keep it dependency-free so it can run in Cloudflare Workers and Node.
//
// What it answers: "given this sign-up attempt, how likely is it to be abuse
// (fake/bulk/disposable accounts, bots, card-testing bait)?" It returns one of
// three actions:
//
//   allow     → proceed normally
//   challenge → proceed, but the attempt is marked as suspicious (medium risk)
//   block     → refuse the sign-up with a neutral message
//
// Signals and weights (sum, capped at 100):
//
//   hard stops (score forced to 100, action = block)
//     • invalid_email              — the address does not have a valid shape
//     • honeypot_filled            — the hidden field that bots fill was used
//
//   weighted signals
//     • disposable_email_domain    +70  throwaway providers (mailinator, yopmail…)
//     • ip_hourly_velocity_*       +25 / +50 / +80  attempts from one IP in 1h
//     • ip_daily_velocity          +25  attempts from one IP in 24h
//     • submitted_too_fast         +30  form submitted faster than a human could
//     • suspicious_user_agent      +40  headless browsers, curl, scrapers
//     • missing_user_agent         +10
//     • tor_exit_node              +30  Cloudflare reports country "T1"
//     • random_email_pattern       +25  local part looks machine-generated
//     • random_username_pattern    +20  same for the chosen username
//     • suspicious_name            +20  full name contains a URL, @ or long digit run
//     • plus_alias                 +10  "name+tag@" aliasing (weak on its own)
//     • captcha_missing            +50  Turnstile is configured but did not verify
//
// Design notes
// ─────────────
// • A single weak signal never blocks a legitimate user: a student using a
//   campus Wi‑Fi (one IP for many people) or a Moroccan who travels abroad must
//   not be locked out. Blocking therefore needs either a hard stop or several
//   signals together (>= block threshold).
// • Geography is deliberately NOT scored. Many legitimate users sign up from
//   abroad. Only Tor (T1) is treated as a signal.
// • Velocity thresholds are per IP. Campus NAT can legitimately produce bursts;
//   tune SIGNUP_VELOCITY before raising them, not after a support complaint.
// • The caller must not reveal reasons to the client (that would teach an
//   attacker which signal to avoid). `reasons` is for server logs only.

/** Score thresholds. score >= block → block; score >= challenge → challenge. */
export const SIGNUP_THRESHOLDS = Object.freeze({ challenge: 40, block: 70 });

/** Per-IP velocity bands: [attemptsInWindow, weight]. Checked from highest. */
export const SIGNUP_VELOCITY = Object.freeze({
  hourly: Object.freeze([
    [20, 80],
    [10, 50],
    [5, 25],
  ]),
  dailyLimit: 30,
  dailyWeight: 25,
});

/** Minimum human form time in seconds (same as the comment endpoint). */
export const MIN_HUMAN_FORM_SECONDS = 3;

/** Disposable / throwaway mail providers. Extend as abuse patterns appear. */
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamailblock.com",
  "sharklasers.com",
  "10minutemail.com",
  "10minutemail.net",
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "throwawaymail.com",
  "yopmail.com",
  "yopmail.net",
  "trashmail.com",
  "getnada.com",
  "maildrop.cc",
  "dispostable.com",
  "fakeinbox.com",
  "mintemail.com",
  "mohmal.com",
  "emailondeck.com",
  "moakt.com",
]);

const SUSPICIOUS_UA_RE =
  /headless|phantomjs|curl\/|wget\/|python-requests|python-urllib|go-http-client|okhttp|scrapy|httpclient|libwww|\bbot\b|crawler|spider/i;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Lowercases and trims an email. Returns "" for non-strings.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/**
 * Looks machine-generated? Heuristics for random strings such as
 * "xk2q9zrt8" or "bcdfgh1234": long digit runs, almost no vowels, or a long
 * consonant run. Natural names (even unusual ones) rarely trigger this.
 *
 * @param {unknown} value  local part of an email, or a username
 * @returns {boolean}
 */
export function looksRandom(value) {
  if (typeof value !== "string") return false;
  const s = value.toLowerCase().replace(/[._\-+]/g, "");
  if (s.length < 8) return false;

  const digits = (s.match(/\d/g) || []).length;
  if (digits / s.length >= 0.5) return true;

  const letters = s.replace(/\d/g, "");
  if (letters.length >= 6) {
    const vowels = (letters.match(/[aeiou]/g) || []).length;
    if (vowels / letters.length < 0.15) return true;
  }

  let longestConsonantRun = 0;
  let run = 0;
  for (const ch of letters) {
    if (/[bcdfghjklmnpqrstvwxyz]/.test(ch)) {
      run += 1;
      if (run > longestConsonantRun) longestConsonantRun = run;
    } else {
      run = 0;
    }
  }
  return longestConsonantRun >= 6;
}

/**
 * Scores one sign-up attempt.
 *
 * @param {object} input
 * @param {string} [input.email]
 * @param {string|null} [input.username]
 * @param {string|null} [input.fullName]
 * @param {boolean} [input.honeypotFilled]
 * @param {number|null} [input.secondsToSubmit]  null when the client sent no timing
 * @param {number} [input.ipAttemptsLastHour]   attempts from this IP incl. the current one
 * @param {number} [input.ipAttemptsLastDay]    attempts from this IP incl. the current one
 * @param {string|null} [input.userAgent]
 * @param {string|null} [input.ipCountry]       ISO alpha-2, "T1" for Tor, or null
 * @param {boolean} [input.captchaRequired]     true when Turnstile is configured
 * @param {boolean} [input.captchaVerified]
 * @returns {{
 *   action: "allow"|"challenge"|"block",
 *   level: "low"|"medium"|"high",
 *   score: number,
 *   reasons: Array<{ code: string, weight: number, hard?: boolean }>
 * }}
 */
export function assessSignupRisk(input = {}) {
  const reasons = [];
  const add = (code, weight, hard = false) => reasons.push({ code, weight, ...(hard ? { hard: true } : {}) });

  const email = normalizeEmail(input.email);
  const [localPart = "", domain = ""] = email.split("@");

  // ── hard stops ───────────────────────────────────────────────────────────
  if (!EMAIL_RE.test(email)) add("invalid_email", 100, true);
  if (input.honeypotFilled) add("honeypot_filled", 100, true);

  // ── email signals ────────────────────────────────────────────────────────
  if (domain && DISPOSABLE_EMAIL_DOMAINS.has(domain)) add("disposable_email_domain", 70);
  if (looksRandom(localPart)) add("random_email_pattern", 25);
  if (localPart.includes("+")) add("plus_alias", 10);

  // ── username / name signals ──────────────────────────────────────────────
  const username = typeof input.username === "string" ? input.username.trim() : "";
  if (username && looksRandom(username)) add("random_username_pattern", 20);

  const fullName = typeof input.fullName === "string" ? input.fullName.trim() : "";
  if (fullName && (/https?:|www\.|@/i.test(fullName) || /\d{4,}/.test(fullName))) {
    add("suspicious_name", 20);
  }

  // ── timing & velocity ────────────────────────────────────────────────────
  if (typeof input.secondsToSubmit === "number" && input.secondsToSubmit < MIN_HUMAN_FORM_SECONDS) {
    add("submitted_too_fast", 30);
  }

  const hourly = Number(input.ipAttemptsLastHour) || 0;
  const band = SIGNUP_VELOCITY.hourly.find(([min]) => hourly >= min);
  if (band) {
    const weight = band[1];
    const code = weight >= 80 ? "ip_hourly_velocity_extreme" : weight >= 50 ? "ip_hourly_velocity_high" : "ip_hourly_velocity_low";
    add(code, weight);
  }
  if ((Number(input.ipAttemptsLastDay) || 0) >= SIGNUP_VELOCITY.dailyLimit) {
    add("ip_daily_velocity", SIGNUP_VELOCITY.dailyWeight);
  }

  // ── client & network ─────────────────────────────────────────────────────
  const ua = typeof input.userAgent === "string" ? input.userAgent.trim() : "";
  if (!ua) add("missing_user_agent", 10);
  else if (SUSPICIOUS_UA_RE.test(ua)) add("suspicious_user_agent", 40);

  if (typeof input.ipCountry === "string" && input.ipCountry.trim().toUpperCase() === "T1") {
    add("tor_exit_node", 30);
  }

  if (input.captchaRequired && !input.captchaVerified) add("captcha_missing", 50);

  // ── decision ─────────────────────────────────────────────────────────────
  const hard = reasons.some((r) => r.hard);
  const score = hard ? 100 : Math.min(100, reasons.reduce((sum, r) => sum + r.weight, 0));

  const action = score >= SIGNUP_THRESHOLDS.block ? "block" : score >= SIGNUP_THRESHOLDS.challenge ? "challenge" : "allow";
  const level = action === "block" ? "high" : action === "challenge" ? "medium" : "low";

  return { action, level, score, reasons };
}
