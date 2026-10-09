import { describe, expect, test } from "vitest"
import {
  DISPOSABLE_EMAIL_DOMAINS,
  MIN_HUMAN_FORM_SECONDS,
  SIGNUP_THRESHOLDS,
  assessSignupRisk,
  looksRandom,
  normalizeEmail,
} from "../shared/security/signup-risk.js"

const HUMAN_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/120.0 Safari/537.36"

/** A clearly legitimate sign-up. Every test changes one thing from this baseline. */
const legit = {
  email: "amina.benali@gmail.com",
  username: "amina_b",
  fullName: "أمينة بنعلي",
  honeypotFilled: false,
  secondsToSubmit: 25,
  ipAttemptsLastHour: 1,
  ipAttemptsLastDay: 1,
  userAgent: HUMAN_UA,
  ipCountry: "MA",
  captchaRequired: false,
  captchaVerified: false,
}

describe("signup risk — baseline", () => {
  test("a legitimate sign-up is allowed with zero score", () => {
    const r = assessSignupRisk(legit)
    expect(r.action).toBe("allow")
    expect(r.level).toBe("low")
    expect(r.score).toBe(0)
    expect(r.reasons).toEqual([])
  })

  test("thresholds are ordered and inside 0..100", () => {
    expect(SIGNUP_THRESHOLDS.challenge).toBeLessThan(SIGNUP_THRESHOLDS.block)
    expect(SIGNUP_THRESHOLDS.block).toBeLessThanOrEqual(100)
  })

  test("missing or empty email is a hard invalid_email stop", () => {
    const r = assessSignupRisk({ ...legit, email: "" })
    expect(r.action).toBe("block")
    expect(r.score).toBe(100)
    expect(r.reasons.map((x) => x.code)).toContain("invalid_email")
  })
})

describe("signup risk — hard stops", () => {
  test("honeypot filled forces a block regardless of other signals", () => {
    const r = assessSignupRisk({ ...legit, honeypotFilled: true })
    expect(r.action).toBe("block")
    expect(r.score).toBe(100)
    expect(r.reasons).toContainEqual({ code: "honeypot_filled", weight: 100, hard: true })
  })

  test("malformed email is blocked", () => {
    expect(assessSignupRisk({ ...legit, email: "not-an-email" }).action).toBe("block")
    expect(assessSignupRisk({ ...legit, email: "a@b" }).action).toBe("block")
  })
})

describe("signup risk — email signals", () => {
  test("disposable domain alone blocks", () => {
    const r = assessSignupRisk({ ...legit, email: "someone@mailinator.com" })
    expect(r.reasons.map((x) => x.code)).toContain("disposable_email_domain")
    expect(r.action).toBe("block")
  })

  test("every listed disposable domain is recognised", () => {
    for (const domain of DISPOSABLE_EMAIL_DOMAINS) {
      const r = assessSignupRisk({ ...legit, email: `x@${domain}` })
      expect(r.reasons.map((x) => x.code)).toContain("disposable_email_domain")
    }
  })

  test("plus-alias is a weak signal and does not block by itself", () => {
    const r = assessSignupRisk({ ...legit, email: "amina+promo@gmail.com" })
    expect(r.reasons).toEqual([{ code: "plus_alias", weight: 10 }])
    expect(r.action).toBe("allow")
  })

  test("machine-looking local part is flagged", () => {
    const r = assessSignupRisk({ ...legit, email: "xk2q9zrt8@gmail.com" })
    expect(r.reasons.map((x) => x.code)).toContain("random_email_pattern")
  })

  test("email is normalised before scoring", () => {
    expect(normalizeEmail("  Amina@Gmail.COM ")).toBe("amina@gmail.com")
    expect(normalizeEmail(undefined)).toBe("")
    expect(assessSignupRisk({ ...legit, email: "  Someone@MAILINATOR.com " }).action).toBe("block")
  })
})

describe("signup risk — username and name", () => {
  test("random username adds a signal", () => {
    const r = assessSignupRisk({ ...legit, username: "k7j2m9p4q1" })
    expect(r.reasons.map((x) => x.code)).toContain("random_username_pattern")
  })

  test("URL or long digit run in full name is suspicious", () => {
    expect(assessSignupRisk({ ...legit, fullName: "visit https://spam.example" }).reasons.map((x) => x.code)).toContain(
      "suspicious_name",
    )
    expect(assessSignupRisk({ ...legit, fullName: "user 12345678" }).reasons.map((x) => x.code)).toContain(
      "suspicious_name",
    )
  })

  test("normal Arabic and French names pass", () => {
    expect(assessSignupRisk({ ...legit, fullName: "Yassine El Amrani" }).score).toBe(0)
    expect(assessSignupRisk({ ...legit, fullName: "فاطمة الزهراء" }).score).toBe(0)
  })
})

describe("looksRandom", () => {
  test("flags digit-heavy, vowel-free and consonant-heavy strings", () => {
    expect(looksRandom("xk2q9zrt8")).toBe(true)
    expect(looksRandom("8374928374")).toBe(true)
    expect(looksRandom("bcdfghjklm")).toBe(true)
  })

  test("does not flag natural short or ordinary names", () => {
    expect(looksRandom("amina")).toBe(false)
    expect(looksRandom("mohammed_benjelloun")).toBe(false)
    expect(looksRandom("yassine.elamrani")).toBe(false)
    expect(looksRandom(null)).toBe(false)
  })
})

describe("signup risk — timing and velocity", () => {
  test("submitting faster than a human is a signal", () => {
    const r = assessSignupRisk({ ...legit, secondsToSubmit: MIN_HUMAN_FORM_SECONDS - 1 })
    expect(r.reasons).toContainEqual({ code: "submitted_too_fast", weight: 30 })
    expect(r.action).toBe("allow")
  })

  test("instant submit combined with a missing user agent reaches challenge", () => {
    const r = assessSignupRisk({ ...legit, secondsToSubmit: 0.4, userAgent: "" })
    expect(r.score).toBe(40)
    expect(r.action).toBe("challenge")
  })

  test("unknown timing (null) is not penalised", () => {
    expect(assessSignupRisk({ ...legit, secondsToSubmit: null }).score).toBe(0)
  })

  test("hourly velocity bands escalate allow → challenge → block", () => {
    expect(assessSignupRisk({ ...legit, ipAttemptsLastHour: 4 }).action).toBe("allow")
    const five = assessSignupRisk({ ...legit, ipAttemptsLastHour: 5 })
    expect(five.reasons).toContainEqual({ code: "ip_hourly_velocity_low", weight: 25 })
    expect(five.action).toBe("allow")

    const ten = assessSignupRisk({ ...legit, ipAttemptsLastHour: 10 })
    expect(ten.reasons.map((x) => x.code)).toContain("ip_hourly_velocity_high")
    expect(ten.action).toBe("challenge")

    const twenty = assessSignupRisk({ ...legit, ipAttemptsLastHour: 20 })
    expect(twenty.reasons.map((x) => x.code)).toContain("ip_hourly_velocity_extreme")
    expect(twenty.action).toBe("block")
  })

  test("daily velocity adds its own weight at the limit", () => {
    const r = assessSignupRisk({ ...legit, ipAttemptsLastDay: 30 })
    expect(r.reasons).toContainEqual({ code: "ip_daily_velocity", weight: 25 })
  })
})

describe("signup risk — client and network", () => {
  test("headless or scripted user agents are suspicious", () => {
    const r = assessSignupRisk({ ...legit, userAgent: "HeadlessChrome/120.0" })
    expect(r.reasons.map((x) => x.code)).toContain("suspicious_user_agent")
    expect(assessSignupRisk({ ...legit, userAgent: "curl/8.4.0" }).reasons.map((x) => x.code)).toContain(
      "suspicious_user_agent",
    )
  })

  test("missing user agent is a weak signal", () => {
    expect(assessSignupRisk({ ...legit, userAgent: null }).reasons).toEqual([
      { code: "missing_user_agent", weight: 10 },
    ])
  })

  test("Tor exit node alone is allowed, Tor plus a bot UA is blocked", () => {
    expect(assessSignupRisk({ ...legit, ipCountry: "T1" }).action).toBe("allow")
    expect(assessSignupRisk({ ...legit, ipCountry: "T1", userAgent: "curl/8" }).action).toBe("block")
  })

  test("foreign country is NOT scored (legitimate users travel)", () => {
    expect(assessSignupRisk({ ...legit, ipCountry: "FR" }).score).toBe(0)
    expect(assessSignupRisk({ ...legit, ipCountry: null }).score).toBe(0)
  })

  test("missing captcha when Turnstile is required reaches challenge", () => {
    const r = assessSignupRisk({ ...legit, captchaRequired: true, captchaVerified: false })
    expect(r.reasons).toContainEqual({ code: "captcha_missing", weight: 50 })
    expect(r.action).toBe("challenge")
    expect(assessSignupRisk({ ...legit, captchaRequired: true, captchaVerified: true }).score).toBe(0)
  })
})

describe("signup risk — combining signals", () => {
  test("score is capped at 100 for non-hard signals", () => {
    const r = assessSignupRisk({
      ...legit,
      email: "x@mailinator.com",
      ipAttemptsLastHour: 50,
      captchaRequired: true,
      captchaVerified: false,
    })
    expect(r.score).toBe(100)
    expect(r.action).toBe("block")
    expect(r.level).toBe("high")
  })

  test("a single weak signal never blocks a legitimate user", () => {
    for (const patch of [
      { email: "amina+x@gmail.com" },
      { userAgent: null },
      { secondsToSubmit: 1 },
      { ipCountry: "T1" },
    ]) {
      expect(assessSignupRisk({ ...legit, ...patch }).action).not.toBe("block")
    }
  })
})
