// functions/_shared/helpConfig.js
//
// يحمّل إعدادات مساعد الموقع وأسئلته من Supabase (جدولا help_settings و help_qa)
// بالمفتاح العام، وهي قراءة مسموحة للجميع عبر RLS للصفوف المنشورة فقط.
//
// - تُخزَّن النتيجة في الذاكرة لدقيقة لتخفيف الحمل.
// - إذا لم تُطبَّق الهجرة بعد أو تعذّرت القراءة، يعمل المساعد بالإعدادات
//   الافتراضية والمحتوى المدمج، ولا يتوقف. الفشل يُخزَّن 15 ثانية فقط.

import { DEFAULT_SETTINGS, qaRowToEntry, settingsFromRow } from "../../shared/help/cms.js"

const OK_TTL_MS = 60_000
const FAIL_TTL_MS = 15_000

let cached = null

/** للاختبارات: يمسح الذاكرة المؤقتة حتى تُقرأ القيم الجديدة. */
export function resetHelpConfigCache() {
  cached = null
}

function defaults() {
  return { settings: { ...DEFAULT_SETTINGS, messages: { ...DEFAULT_SETTINGS.messages } }, customEntries: [] }
}

/**
 * @param {Record<string, any>} env
 * @returns {Promise<{ settings: typeof DEFAULT_SETTINGS, customEntries: any[] }>}
 */
export async function loadHelpConfig(env) {
  if (cached && Date.now() < cached.expires) return cached.value

  const supabaseUrl = env?.SUPABASE_URL || env?.VITE_SUPABASE_URL
  const anonKey = env?.SUPABASE_ANON_KEY || env?.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    cached = { value: defaults(), expires: Date.now() + FAIL_TTL_MS }
    return cached.value
  }

  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
  const base = supabaseUrl.replace(/\/$/, "")
  try {
    const [settingsRes, qaRes] = await Promise.all([
      fetch(`${base}/rest/v1/help_settings?id=eq.1&select=*`, { headers, signal: AbortSignal.timeout(2000) }),
      fetch(
        `${base}/rest/v1/help_qa?published=eq.true&select=id,question,answer,keywords,source_url,source_title&order=updated_at.desc&limit=500`,
        { headers, signal: AbortSignal.timeout(2000) },
      ),
    ])
    if (!settingsRes.ok || !qaRes.ok) throw new Error(`help config HTTP ${settingsRes.status}/${qaRes.status}`)

    const settingsRows = await settingsRes.json()
    const qaRows = await qaRes.json()
    const value = {
      settings: settingsFromRow(Array.isArray(settingsRows) ? settingsRows[0] ?? null : null),
      customEntries: (Array.isArray(qaRows) ? qaRows : [])
        .map(qaRowToEntry)
        .filter((entry) => entry.title && entry.body),
    }
    cached = { value, expires: Date.now() + OK_TTL_MS }
    return value
  } catch (error) {
    console.warn("[help] تعذّر تحميل إعدادات المساعد، تُستعمل الافتراضية:", error?.message || error)
    cached = { value: defaults(), expires: Date.now() + FAIL_TTL_MS }
    return cached.value
  }
}
