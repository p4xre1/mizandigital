/**
 * inputGuard.ts — Anti-spam, anti-XSS, character limits for EVERY input box
 * 
 * Uses payloadGuard as single source of truth + adds:
 * - Rate limiting (localStorage)
 * - Character limits per field type
 * - Sanitization helpers for all public inputs
 */

import {
  LIMITS,
  sanitizeUserText,
  detectInjection,
  detectSpam,
  countUrls,
  INVISIBLE_CHARS_RE,
  CONTROL_CHARS_RE,
} from "./payloadGuard"

// --- Character limits for EVERY box (public) ---
export const INPUT_LIMITS = Object.freeze({
  // Profile
  USERNAME_MIN: 3,
  USERNAME_MAX: 30,
  DISPLAY_NAME_MIN: 2,
  DISPLAY_NAME_MAX: 50,
  CITY_MIN: 2,
  CITY_MAX: 50,
  BIO_MAX: 240,
  YEARS_MIN: 0,
  YEARS_MAX: 60,

  // Search
  SEARCH_MAX: 100,
  SEARCH_MIN: 1,

  // Comments (already in LIMITS but re-export)
  COMMENT_NAME_MAX: 100,
  COMMENT_BODY_MAX: 2000,
  COMMENT_BODY_MIN: 2,

  // Reports
  REPORT_DETAILS_MAX: 500,

  // Generic
  GENERIC_MAX: 500,
  TITLE_MAX: 150,
  URL_MAX: 2000,
})

// --- Sanitization: strip ALL HTML/scripts, keep plain text ---
export function sanitizePlainText(input: string, maxLength: number = INPUT_LIMITS.GENERIC_MAX): string {
  if (typeof input !== "string") return ""
  let out = input.replace(INVISIBLE_CHARS_RE, "").replace(CONTROL_CHARS_RE, "")
  // Remove ALL HTML tags
  out = out.replace(/<[^>]*>/g, "")
  // Remove javascript: , data: , vbscript:
  out = out.replace(/\b(javascript|vbscript|data)\s*:/gi, "")
  // Remove event handlers
  out = out.replace(/\bon[a-z]{2,}\s*=/gi, "")
  // Collapse whitespace
  out = out.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ")
  out = out.replace(/[ \t]+/g, " ")
  out = out.replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n")
  out = out.trim()
  if (out.length > maxLength) out = out.slice(0, maxLength)
  return out
}

// --- Anti-hacking: detect XSS / SQLi / traversal ---
export function isSafeText(input: string): { safe: boolean; reason?: string } {
  if (!input) return { safe: true }
  const injection = detectInjection(input)
  if (!injection.safe) {
    return { safe: false, reason: "injection_detected" }
  }
  // Extra checks for common hacking payloads
  const lower = input.toLowerCase()
  const hackingPatterns = [
    "<script", "</script", "javascript:", "onerror=", "onload=", "eval(",
    "document.cookie", "document.write", "localstorage", "sessionstorage",
    "union select", "drop table", "insert into", "delete from", "--", "/*",
    "../", "..\\", "%3c", "%3e", "&#x", "&#60", "&#62",
  ]
  for (const pat of hackingPatterns) {
    if (lower.includes(pat)) {
      // Allow -- only if not part of SQL comment attack (allow in normal text)
      if (pat === "--" && !/;\s*--/.test(input)) continue
      return { safe: false, reason: `hacking_pattern:${pat}` }
    }
  }
  return { safe: true }
}

// --- Anti-spam: URLs, repeated chars, spam keywords ---
export function isSpamText(input: string, maxUrls = 0): { spam: boolean; reason?: string } {
  if (!input) return { spam: false }
  if (countUrls(input) > maxUrls) {
    return { spam: true, reason: `too_many_urls:${countUrls(input)}` }
  }
  const spam = detectSpam(input, { maxUrls })
  if (spam.spam) {
    return { spam: true, reason: spam.reasons.join(",") }
  }
  // Extra spam: repeated same char 10+ times, or all caps latin
  if (/(.)\1{9,}/.test(input)) {
    return { spam: true, reason: "repeated_chars" }
  }
  return { spam: false }
}

// --- Full validation for any public input ---
export interface ValidationOptions {
  field: string
  maxLength: number
  minLength?: number
  maxUrls?: number
  allowUrls?: boolean
}

export interface ValidationResult {
  ok: boolean
  value: string
  error?: string
}

export function validateInput(raw: string, opts: ValidationOptions): ValidationResult {
  const { field, maxLength, minLength = 0, maxUrls = 0 } = opts

  // 1. Sanitize
  const sanitized = sanitizePlainText(raw, maxLength)

  // 2. Length checks
  if (minLength > 0 && sanitized.length < minLength) {
    return { ok: false, value: sanitized, error: `${field}:too_short` }
  }
  if (sanitized.length > maxLength) {
    return { ok: false, value: sanitized, error: `${field}:too_long` }
  }

  // 3. Anti-hacking
  const safe = isSafeText(sanitized)
  if (!safe.safe) {
    return { ok: false, value: sanitized, error: `${field}:injection` }
  }

  // 4. Anti-spam
  const spam = isSpamText(sanitized, maxUrls)
  if (spam.spam) {
    return { ok: false, value: sanitized, error: `${field}:spam` }
  }

  return { ok: true, value: sanitized }
}

// --- Rate limiting (localStorage) ---
const RATE_LIMIT_PREFIX = "mizan:ratelimit:"

export function checkRateLimit(key: string, maxAttempts: number, windowMs: number): { allowed: boolean; retryAfterMs?: number } {
  if (typeof window === "undefined") return { allowed: true }
  try {
    const now = Date.now()
    const storageKey = RATE_LIMIT_PREFIX + key
    const raw = localStorage.getItem(storageKey)
    let attempts: number[] = raw ? JSON.parse(raw) : []

    // Clean old attempts outside window
    attempts = attempts.filter((t) => now - t < windowMs)

    if (attempts.length >= maxAttempts) {
      const oldestInWindow = attempts[0]
      const retryAfterMs = windowMs - (now - oldestInWindow)
      return { allowed: false, retryAfterMs }
    }

    attempts.push(now)
    localStorage.setItem(storageKey, JSON.stringify(attempts))
    return { allowed: true }
  } catch {
    return { allowed: true }
  }
}

// Convenience rate limits for common actions
export const RATE_LIMITS = {
  PROFILE_SAVE: { key: "profile_save", max: 5, windowMs: 60_000 }, // 5 saves per minute
  SEARCH: { key: "search", max: 20, windowMs: 60_000 }, // 20 searches per minute
  COMMENT: { key: "comment", max: 3, windowMs: 60_000 }, // 3 comments per minute
  REPORT: { key: "report", max: 5, windowMs: 60_000 * 5 }, // 5 reports per 5 min
}

// --- Specific validators for each box ---
export function validateUsername(raw: string): ValidationResult {
  const clean = raw.trim().toLowerCase().replace(/\s+/g, "_")
  if (!/^[a-z0-9_]{3,30}$/.test(clean)) {
    return { ok: false, value: clean, error: "username:invalid_format" }
  }
  return validateInput(clean, {
    field: "username",
    maxLength: INPUT_LIMITS.USERNAME_MAX,
    minLength: INPUT_LIMITS.USERNAME_MIN,
    maxUrls: 0,
  })
}

export function validateDisplayName(raw: string): ValidationResult {
  return validateInput(raw, {
    field: "displayName",
    maxLength: INPUT_LIMITS.DISPLAY_NAME_MAX,
    minLength: INPUT_LIMITS.DISPLAY_NAME_MIN,
    maxUrls: 0,
  })
}

export function validateCity(raw: string): ValidationResult {
  if (!raw.trim()) return { ok: true, value: "" } // optional
  return validateInput(raw, {
    field: "city",
    maxLength: INPUT_LIMITS.CITY_MAX,
    minLength: INPUT_LIMITS.CITY_MIN,
    maxUrls: 0,
  })
}

export function validateBio(raw: string): ValidationResult {
  if (!raw.trim()) return { ok: true, value: "" }
  return validateInput(raw, {
    field: "bio",
    maxLength: INPUT_LIMITS.BIO_MAX,
    maxUrls: 0,
  })
}

export function validateSearch(raw: string): ValidationResult {
  if (!raw.trim()) return { ok: true, value: "" }
  return validateInput(raw, {
    field: "search",
    maxLength: INPUT_LIMITS.SEARCH_MAX,
    minLength: INPUT_LIMITS.SEARCH_MIN,
    maxUrls: 0,
  })
}

export function validateReportDetails(raw: string): ValidationResult {
  if (!raw.trim()) return { ok: true, value: "" }
  return validateInput(raw, {
    field: "report",
    maxLength: INPUT_LIMITS.REPORT_DETAILS_MAX,
    maxUrls: 1,
  })
}

// --- Error messages in Arabic ---
export const INPUT_ERROR_MESSAGES: Record<string, string> = {
  "username:invalid_format": "اسم المستخدم يجب أن يكون 3-30 حرفاً، أحرف لاتينية وأرقام و _ فقط.",
  "username:too_short": "اسم المستخدم قصير جداً (3 أحرف على الأقل).",
  "username:too_long": "اسم المستخدم طويل جداً (30 حرف كحد أقصى).",
  "username:injection": "اسم المستخدم يحتوي على رموز غير مسموح بها.",
  "username:spam": "اسم المستخدم غير صالح.",
  "displayName:too_short": "الاسم المعروض قصير جداً (حرفين على الأقل).",
  "displayName:too_long": "الاسم المعروض طويل جداً (50 حرف كحد أقصى).",
  "displayName:injection": "الاسم يحتوي على رموز غير مسموح بها.",
  "displayName:spam": "الاسم غير صالح.",
  "city:too_short": "اسم المدينة قصير جداً.",
  "city:too_long": "اسم المدينة طويل جداً (50 حرف).",
  "city:injection": "اسم المدينة يحتوي على رموز غير مسموح بها.",
  "bio:too_long": "النبذة طويلة جداً (240 حرف كحد أقصى).",
  "bio:injection": "النبذة تحتوي على رموز غير مسموح بها.",
  "bio:spam": "النبذة تبدو إشهارية.",
  "search:too_long": "البحث طويل جداً (100 حرف كحد أقصى).",
  "search:injection": "البحث يحتوي على رموز غير مسموح بها.",
  "search:spam": "البحث غير صالح.",
  "report:too_long": "التفاصيل طويلة جداً (500 حرف).",
  "report:injection": "التفاصيل تحتوي على رموز غير مسموح بها.",
  "comment:too_long": "التعليق طويل جداً.",
  "comment:injection": "التعليق يحتوي على وسوم غير مسموح بها.",
  "comment:spam": "التعليق يبدو إشهارياً.",
}

export function getInputErrorMessage(code?: string): string {
  if (!code) return ""
  return INPUT_ERROR_MESSAGES[code] || "النص يحتوي على محتوى غير مسموح به."
}
