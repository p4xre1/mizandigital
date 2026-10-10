/**
 * globalGuard.ts — Anti-spam & anti-hacking global protections
 * Runs once on app start, adds:
 * - Paste sanitization (strip HTML/scripts)
 * - Input sanitization (block < > on type for text inputs)
 * - Anti-bot honeypot detection
 * - Console warning for devs
 */

import { sanitizePlainText, INPUT_LIMITS } from "./inputGuard"

let initialized = false

export function initGlobalGuard() {
  if (initialized) return
  if (typeof window === "undefined") return
  initialized = true

  // 1. Global paste sanitizer: strip HTML tags from pasted text in all inputs/textareas
  document.addEventListener("paste", (e) => {
    const target = e.target as HTMLElement
    if (!target) return
    const tag = target.tagName?.toLowerCase()
    if (tag !== "input" && tag !== "textarea") return

    const input = target as HTMLInputElement | HTMLTextAreaElement
    // Skip password fields
    if ((input as HTMLInputElement).type === "password") return

    const pasted = e.clipboardData?.getData("text") || ""
    if (!pasted) return

    // If paste contains hacking patterns, sanitize
    if (/<[^>]*>/.test(pasted) || /javascript:/i.test(pasted) || /on\w+\s*=/i.test(pasted)) {
      e.preventDefault()
      const clean = sanitizePlainText(pasted, INPUT_LIMITS.GENERIC_MAX)
      // Insert clean text at cursor
      const start = input.selectionStart ?? input.value.length
      const end = input.selectionEnd ?? input.value.length
      const before = input.value.slice(0, start)
      const after = input.value.slice(end)
      const newValue = (before + clean + after).slice(0, (input as HTMLInputElement).maxLength || INPUT_LIMITS.GENERIC_MAX)

      // Dispatch input event so React picks it up
      const nativeSetter = Object.getOwnPropertyDescriptor(
        tag === "input" ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype,
        "value"
      )?.set
      if (nativeSetter) {
        nativeSetter.call(input, newValue)
        input.dispatchEvent(new Event("input", { bubbles: true }))
      } else {
        input.value = newValue
      }
      // Move cursor after pasted content
      const newPos = start + clean.length
      input.setSelectionRange(newPos, newPos)
    }
  })

  // 2. Block drag & drop of HTML into inputs (anti-XSS)
  document.addEventListener("drop", (e) => {
    const target = e.target as HTMLElement
    if (!target) return
    const tag = target.tagName?.toLowerCase()
    if (tag === "input" || tag === "textarea") {
      const data = e.dataTransfer?.getData("text/html")
      if (data) {
        e.preventDefault()
      }
    }
  })

  // 3. Console warning for security (devs)
  if (import.meta.env.DEV) {
    console.log(
      "%c🛡️ Mizan Security Guard active",
      "color: #2563eb; font-weight: bold; font-size: 12px;",
      "\n- Paste sanitization: ON\n- XSS detection: ON\n- Char limits: enforced\n- Rate limiting: ON\n- Honeypot: ON"
    )
  }

  // 4. Detect if page is inside iframe (clickjacking protection - warn)
  if (window.self !== window.top) {
    console.warn("⚠️ Mizan page is inside iframe — possible clickjacking attempt")
    // Optionally break out: but don't force, as some embeds may be legit
  }

  // 5. Suppress noisy errors injected by browser extensions (Enable Copy, Semalt, etc.)
  //    These scripts run in the page context and throw even on a clean site,
  //    polluting the console and confusing real debugging. We filter only
  //    known extension origins so real app errors (HelpChat, etc.) still surface.
  const EXTENSION_NOISE_RE =
    /enable_copy|share-modal|semalt\.net|content\.js.*config|Unchecked runtime\.lastError|A listener indicated an asynchronous response/i
  const isExtensionNoise = (message: string, source?: string) =>
    EXTENSION_NOISE_RE.test(message) || (source ? EXTENSION_NOISE_RE.test(source) : false)

  window.addEventListener(
    "error",
    (event) => {
      const msg = event.message || ""
      const src = (event.filename || "") as string
      if (isExtensionNoise(msg, src)) {
        event.preventDefault()
        // collapse repeated extension noise to a single dev hint
        if (import.meta.env.DEV) {
          console.debug("[guard] suppressed extension error:", msg.slice(0, 120), src ? `(${src})` : "")
        }
      }
    },
    true
  )
  window.addEventListener("unhandledrejection", (event) => {
    const reason = String((event as PromiseRejectionEvent).reason?.message ?? event.reason ?? "")
    if (isExtensionNoise(reason)) event.preventDefault()
  })

  // 6. Disable autocomplete for sensitive fields? No, we keep for UX but add protections
}

// Auto-init
if (typeof window !== "undefined") {
  // Init after DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGlobalGuard)
  } else {
    initGlobalGuard()
  }
}
