// functions/_shared/helpConsent.js
//
// بوابة الموافقة على المساعد: لا يُجيب المساعد عن أي سؤال قبل أن يسجّل
// المستخدم موافقته على الشروط (بما فيها قسم المساعد) للنسخة الحالية من النص.
//
// المصدر: جدول public.legal_consents (انظر supabase/migrations/20260925000000_legal_consents.sql)،
// وقراءته بتوكين المستخدم نفسه، فتمر عبر RLS ولا تُرى إلا موافقاته.
// النسخة تُقارَن بـ LEGAL_LAST_UPDATED نفسها التي تعرضها الصفحات القانونية،
// فإذا تغيّر النص تُطلب الموافقة من جديد تلقائياً.

import { LEGAL_LAST_UPDATED } from "../../src/content/legal/version.js"

/** المستند الذي تُطابَق موافقته. يُسجَّل معه الخصوصية في الخطوة نفسها (consent.ts). */
export const CONSENT_DOCUMENT = "terms"

/**
 * @returns {Promise<{ok: true} | {ok: false, status: number, error: string}>}
 *   403 consent_required: لا توجد موافقة على النسخة الحالية.
 *   503 service_unavailable: تعذّر التحقق، فنرفض (fail closed).
 */
export async function checkTermsConsent(user, env) {
  const supabaseUrl = env?.SUPABASE_URL || env?.VITE_SUPABASE_URL
  const anonKey = env?.SUPABASE_ANON_KEY || env?.VITE_SUPABASE_ANON_KEY
  const query = [
    "select=id",
    `user_id=eq.${encodeURIComponent(user.id)}`,
    `document=eq.${CONSENT_DOCUMENT}`,
    `policy_version=eq.${encodeURIComponent(LEGAL_LAST_UPDATED)}`,
    "limit=1",
  ].join("&")
  try {
    const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/legal_consents?${query}`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${user.token}` },
      signal: AbortSignal.timeout(2000),
    })
    if (!res.ok) return { ok: false, status: 503, error: "service_unavailable" }
    const rows = await res.json()
    if (Array.isArray(rows) && rows.length > 0) return { ok: true }
    return { ok: false, status: 403, error: "consent_required" }
  } catch {
    return { ok: false, status: 503, error: "service_unavailable" }
  }
}
