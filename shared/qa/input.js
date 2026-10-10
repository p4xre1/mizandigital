// shared/qa/input.js
//
// المرحلة 1: التحقق من المدخل وحدوده. تعمل قبل أي معالجة أخرى.
//
// القاعدة: `original` هو النص كما كُتب (بعد إزالة ما لا يُرى فقط)، ولا يُستبدل به أي نص مُطبَّع
// في العرض أو في الاقتباس. الدالة لا تُعيد إلا ما يلزم للتحليل، والمرحلتان التاليتان تأخذان
// `clean` فقط.

import { QA_CONFIG } from "./config.js"

/** محارف تغيّر اتجاه النص أو تُخفى عن العين، وتُزال قبل التحليل فقط. */
const INVISIBLE_RE = /[\u200B\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\u061C\u00AD]/g
/** محارف التحكم (عدا السطر الجديد والجدولة). */
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g
/** أزواج بديلة ناقصة (surrogate) غير صالحة في UTF-16. */
const LONE_SURROGATE_RE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g

/**
 * @param {unknown} raw
 * @param {{ maxChars?: number }} [options]
 * @returns {{ ok: true, original: string, clean: string, malformed: boolean }
 *   | { ok: false, code: "not_text" | "empty" | "too_long" | "mostly_control" }}
 */
export function validateQuestion(raw, options = {}) {
  const maxChars = options.maxChars ?? QA_CONFIG.maxInputChars
  if (typeof raw !== "string") return { ok: false, code: "not_text" }
  if (raw.length > maxChars) return { ok: false, code: "too_long" }

  const original = raw.trim()
  if (original === "") return { ok: false, code: "empty" }

  let malformed = false
  let clean = original.replace(LONE_SURROGATE_RE, () => {
    malformed = true
    return ""
  })

  const beforeControl = clean.length
  clean = clean.replace(INVISIBLE_RE, "").replace(CONTROL_RE, "")
  if (clean.length !== beforeControl && clean.replace(/\s/g, "").length === 0) {
    return { ok: false, code: "mostly_control" }
  }
  // سطر جديد أو جدولة داخل السؤال تصير مسافة.
  clean = clean.replace(/\s+/g, " ").trim()
  if (clean === "") return { ok: false, code: "empty" }

  return { ok: true, original, clean, malformed }
}
