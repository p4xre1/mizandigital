// functions/_shared/helpConfig.js
//
// يحمّل إعدادات مساعد الموقع وأسئلته من Supabase (help_settings و help_qa).
//
// • قراءة help_settings تتم بمفتاح service_role على الخادم فقط، لأن قائمة العبارات
//   المحظورة لا يجب أن تُكشف للزوار. مفتاح service_role يُضبط كسرّ في Cloudflare،
//   ولا يصل إلى المتصفح أبداً.
// • الفشل يُغلق الخدمة (fail closed): لا قيم افتراضية صامتة، لأن غياب قاعدة
//   المشرف يعني أن الحماية المختارة لم تعد مطبّقة. الخطأ يُرمى ويعالجه الـendpoint بـ503.
// • أي صف في help_qa لا يجتاز التحقق يُحذف ويُسجَّل، حتى لو كُتب مباشرة في قاعدة البيانات.
// • النجاح يُخزَّن دقيقة. الفشل لا يُخزَّن أبداً.

import { DEFAULT_SETTINGS, qaRowToEntry, settingsFromRow, validateQaDraft } from "../../shared/help/cms.js"
import { logSecurityEvent } from "./helpSecurity.js"

const OK_TTL_MS = 60_000

let cached = null

export class GuardConfigError extends Error {
  /** @param {string} code @param {string} message @param {number | null} [upstreamStatus] */
  constructor(code, message, upstreamStatus = null) {
    super(message)
    this.name = "GuardConfigError"
    this.code = code
    this.upstreamStatus = upstreamStatus
  }
}

/** للاختبارات: يمسح الذاكرة المؤقتة حتى تُقرأ القيم الجديدة. */
export function resetHelpConfigCache() {
  cached = null
}

/**
 * @param {Record<string, any>} env
 * @returns {Promise<{ settings: typeof DEFAULT_SETTINGS, customEntries: any[] }>}
 * @throws {GuardConfigError}
 */
export async function loadHelpConfig(env) {
  if (cached && Date.now() < cached.expires) return cached.value

  const supabaseUrl = env?.SUPABASE_URL || env?.VITE_SUPABASE_URL
  const serviceKey = env?.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl) {
    throw new GuardConfigError("missing_supabase_url", "SUPABASE_URL مطلوب لقراءة قواعد المساعد")
  }
  if (!serviceKey) {
    throw new GuardConfigError("missing_service_key", "SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY مطلوبان لقراءة قواعد المساعد")
  }

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  const base = supabaseUrl.replace(/\/$/, "")

  let settingsRows
  let qaRows
  try {
    const [settingsRes, qaRes] = await Promise.all([
      fetch(`${base}/rest/v1/help_settings?id=eq.1&select=*`, { headers, signal: AbortSignal.timeout(5000) }),
      fetch(
        `${base}/rest/v1/help_qa?published=eq.true&select=id,question,answer,keywords,source_url,source_title&order=updated_at.desc&limit=500`,
        { headers, signal: AbortSignal.timeout(5000) },
      ),
    ])
    if (!settingsRes.ok) throw new GuardConfigError("settings_http", `help_settings HTTP ${settingsRes.status}`, settingsRes.status)
    if (!qaRes.ok) throw new GuardConfigError("qa_http", `help_qa HTTP ${qaRes.status}`, qaRes.status)
    settingsRows = await settingsRes.json()
    qaRows = await qaRes.json()
  } catch (error) {
    if (error instanceof GuardConfigError) throw error
    const code = error?.name === "TimeoutError" ? "fetch_timeout" : "fetch_failed"
    throw new GuardConfigError(code, "Help configuration request failed")
  }

  if (!Array.isArray(settingsRows) || settingsRows.length === 0) {
    throw new GuardConfigError("settings_row_missing", "صف help_settings غير موجود: طبّق الهجرة")
  }

  const customEntries = []
  for (const row of Array.isArray(qaRows) ? qaRows : []) {
    const entry = qaRowToEntry(row)
    const problem = validateQaDraft({
      question: entry.title,
      answer: entry.body,
      keywords: entry.keywords,
      sourceUrl: entry.url ?? "",
    })
    if (problem || !entry.title || !entry.body) {
      logSecurityEvent("invalid_qa_row_skipped", { rowId: String(row?.id ?? "unknown") })
      continue
    }
    customEntries.push(entry)
  }

  const value = { settings: settingsFromRow(settingsRows[0]), customEntries }
  cached = { value, expires: Date.now() + OK_TTL_MS }
  return value
}
