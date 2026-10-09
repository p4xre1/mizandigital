// functions/api/account/signup-risk.js  →  POST /api/account/signup-risk
//
// ─────────────────────────────────────────────────────────────────────────────
// Server side of Algorithm 1 (account-creation risk). The scoring rules live in
// shared/security/signup-risk.js; this file only gathers signals and answers.
// ─────────────────────────────────────────────────────────────────────────────
// The browser calls this endpoint right before supabase.auth.signUp().
//
// Signals gathered here (never trusted from the browser):
//   • IP velocity: attempts per IP in the last hour and the last day. Counted
//     with checkRateLimit (KV if RATE_LIMIT_KV is bound, memory otherwise). The
//     counter increments on every check, so it measures attempts, not successes.
//   • User-Agent and Cloudflare's CF-IPCountry (T1 = Tor).
//   • Turnstile, only when TURNSTILE_SECRET_KEY is set.
//
// Signals taken from the body (client-supplied, scored as weak evidence):
//   • email, username, fullName, honeypot field "website", formStartedAt.
//
// Response: { action: "allow" | "challenge" | "block", message }.
// Reasons are logged to the Worker console only. The client never sees them,
// otherwise an attacker could learn which signal to avoid.
//
// Failure policy: this endpoint never returns 5xx for a valid request. If
// something goes wrong internally we answer "allow" and log it. Blocking a real
// user because of our own outage is worse than letting one abusive account
// through, and the Supabase email confirmation remains in place.

import {
  checkRateLimit,
  fingerprint,
  getClientIp,
  jsonResponse,
  readJsonBody,
  verifyTurnstile,
  checkHoneypotAndTiming,
} from "../../_shared/guard.js";
import { assessSignupRisk, normalizeEmail } from "../../../shared/security/signup-risk.js";

/** Limits on the attempt counters. Above these, the velocity band is at its maximum. */
const HOUR_LIMIT = 50;
const HOUR_WINDOW_SECONDS = 3600;
const DAY_LIMIT = 200;
const DAY_WINDOW_SECONDS = 86400;

const MAX_BODY_BYTES = 4 * 1024;

const MESSAGES = Object.freeze({
  allow: null,
  challenge: "أكّد بريدك الإلكتروني بعد التسجيل لإتمام تفعيل الحساب.",
  block: "تعذّر إنشاء الحساب الآن. حاول لاحقاً أو تواصل مع فريق الدعم.",
});

function logDecision(decision, extra = "") {
  // Server logs only. Do not include the raw email address or IP.
  if (decision.action === "allow") return;
  const codes = decision.reasons.map((r) => r.code).join(",");
  console.warn(`[signup-risk] action=${decision.action} score=${decision.score} codes=${codes} ${extra}`.trim());
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const parsed = await readJsonBody(request, MAX_BODY_BYTES);
  if (!parsed.ok) {
    return jsonResponse({ error: "invalid_request" }, parsed.status);
  }
  const body = parsed.body && typeof parsed.body === "object" ? parsed.body : {};

  try {
    const ip = getClientIp(request);
    const ipHash = await fingerprint(ip, env.IP_HASH_SALT || "");

    // ── 1) Velocity: count this attempt, then read the counters ─────────────
    const hour = await checkRateLimit({
      kv: env.RATE_LIMIT_KV,
      bucket: "signup_check_hour",
      key: ipHash,
      limit: HOUR_LIMIT,
      windowSeconds: HOUR_WINDOW_SECONDS,
    });
    const day = await checkRateLimit({
      kv: env.RATE_LIMIT_KV,
      bucket: "signup_check_day",
      key: ipHash,
      limit: DAY_LIMIT,
      windowSeconds: DAY_WINDOW_SECONDS,
    });
    // checkRateLimit returns remaining = limit - count (after increment).
    // When it refuses, the count has reached the limit.
    const ipAttemptsLastHour = hour.allowed ? HOUR_LIMIT - hour.remaining : HOUR_LIMIT;
    const ipAttemptsLastDay = day.allowed ? DAY_LIMIT - day.remaining : DAY_LIMIT;

    // ── 2) Honeypot and timing (same helper as the comment endpoint) ────────
    const bot = checkHoneypotAndTiming({
      website: body.website,
      formStartedAt: body.formStartedAt,
    });
    const startedAt = Number(body.formStartedAt);
    const secondsToSubmit =
      Number.isFinite(startedAt) && startedAt > 0 ? (Date.now() - startedAt) / 1000 : null;

    // ── 3) Turnstile (only when configured) ─────────────────────────────────
    const turnstile = await verifyTurnstile({
      secret: env.TURNSTILE_SECRET_KEY,
      token: typeof body.turnstileToken === "string" ? body.turnstileToken : undefined,
      remoteIp: ip,
    });

    // ── 4) Score ─────────────────────────────────────────────────────────────
    const decision = assessSignupRisk({
      email: normalizeEmail(body.email),
      username: typeof body.username === "string" ? body.username : null,
      fullName: typeof body.fullName === "string" ? body.fullName : null,
      // The honeypot helper returns a reason when the field was filled. The
      // timing check is folded into secondsToSubmit, which the scorer sees.
      honeypotFilled: !bot.ok && bot.reason === "honeypot_filled",
      secondsToSubmit,
      ipAttemptsLastHour,
      ipAttemptsLastDay,
      userAgent: request.headers.get("User-Agent"),
      ipCountry: request.headers.get("CF-IPCountry"),
      captchaRequired: !turnstile.skipped,
      captchaVerified: turnstile.verified,
    });

    logDecision(decision, `hour=${ipAttemptsLastHour} day=${ipAttemptsLastDay}`);
    return jsonResponse({ action: decision.action, message: MESSAGES[decision.action] });
  } catch (error) {
    // Internal failure: fail open. See the policy note at the top of this file.
    console.error("[signup-risk] internal error, failing open:", error?.message || error);
    return jsonResponse({ action: "allow", message: null });
  }
}
