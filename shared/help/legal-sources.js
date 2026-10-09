// shared/help/legal-sources.js
//
// التحقق من الاستشهادات القانونية في الجواب مقابل سجل المصادر (أرشيف القوانين المعتمد).
// القاعدة: لا يُعتبر نص قانوني "موثقاً" إلا إذا وُجد له صف في السجل، وليس مُلغى.
// ما لا يُوجد له سجل يُعرض مع جملة عدم اليقين المعتمدة، ولا يُخترع له رقم أو مادة.
//
// السجل الحالي (src/data/laws.client.json) فارغ، لذلك كل استشهاد الآن "غير موثق"
// وهذا هو الجواب الصادق. ويتحسن التحقق تلقائياً عند تحديث الأرشيف.

import lawsSnapshot from "../../src/data/laws.client.json"
import { extractLawCitations, toAsciiDigits } from "../laws/citations.js"
import { REPEALED_LEGAL_NOTE, UNVERIFIED_LEGAL_NOTE } from "./policy.js"

const REPEALED_STATUSES = new Set(["repealed", "abrogated", "ملغى", "ملغي"])

/** @returns {Array<{ law_number?: string|null, title?: string|null, status?: string|null, repealed_by?: string|null }>} */
export function defaultLawArchive() {
  return Array.isArray(lawsSnapshot?.laws) ? lawsSnapshot.laws : []
}

function isRepealedRow(row) {
  if (row.repealed_by) return true
  return REPEALED_STATUSES.has(String(row.status ?? "").toLowerCase())
}

/**
 * @param {string} text
 * @param {Array<object>} [archive]
 * @returns {{ numbers: string[], verified: string[], repealed: string[], unverified: string[] }}
 */
export function verifyLegalCitations(text, archive = defaultLawArchive()) {
  const numbers = [...new Set(extractLawCitations(text).map((c) => c.number))]
  const verified = []
  const repealed = []
  const unverified = []
  for (const number of numbers) {
    const row = archive.find((r) => r && toAsciiDigits(r.law_number ?? "") === number)
    if (!row) unverified.push(number)
    else if (isRepealedRow(row)) repealed.push(number)
    else verified.push(number)
  }
  return { numbers, verified, repealed, unverified }
}

/**
 * يضيف التنبيهات المطلوبة إلى الجواب. لا يغيّر نص الجواب نفسه.
 * @param {string} text
 * @param {ReturnType<typeof verifyLegalCitations>} verification
 */
export function applyLegalNotes(text, verification) {
  let out = text
  if (verification.repealed.length > 0) {
    out = `${REPEALED_LEGAL_NOTE}${verification.repealed.join("، ")}.\n\n${out}`
  }
  if (verification.unverified.length > 0 && !out.includes(UNVERIFIED_LEGAL_NOTE)) {
    out = `${out}\n\n${UNVERIFIED_LEGAL_NOTE}`
  }
  return out
}
