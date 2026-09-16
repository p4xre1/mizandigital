/**
 * الموافقة على السياسات القانونية — التقاط، تخزين، ومزامنة.
 * -----------------------------------------------------------------------
 * خانة الاختيار وحدها لا تكفي قانوناً: المادة 7(1) من GDPR تتطلب القدرة على
 * *إثبات* الموافقة. لذا نسجّل من وافق، متى، على أي نسخة من السياسة، وبأي
 * طريقة (بريد أم Google) في جدول public.legal_consents.
 *
 * التدفق:
 *   1) المستخدم يؤشّر الخانة في /login?mode=signup  → captureConsent()
 *   2) تنجح المصادقة (بريد أو عودة من Google)        → syncPendingConsent()
 *   3) تُكتب الصفوف عبر RPC record_legal_consent (UPSERT لا يتعارض)
 *
 * السجل يبقى في المتصفح بعد المزامنة (بـ synced=true) حتى لا نعيد السؤال على
 * نفس المتصفح عن نفس النسخة. عند تغيير LEGAL_LAST_UPDATED تُطلب الموافقة من
 * جديد تلقائياً — وهذا هو السلوك الصحيح قانوناً.
 */

import { LEGAL_LAST_UPDATED } from "@/content/legal/policies.js"

export const CONSENT_STORAGE_KEY = "mizan:legal:consent:v1"

/** النسخة الحالية للسياسات — من نفس مصدر نص الصفحات القانونية. */
export const POLICY_VERSION: string = LEGAL_LAST_UPDATED

/** المستندات التي تغطيها الخانة الواحدة. */
export const CONSENT_DOCUMENTS = ["privacy", "terms"] as const
export type ConsentDocument = (typeof CONSENT_DOCUMENTS)[number]

export type ConsentMethod = "email" | "google"

export interface LegalConsentRecord {
  policyVersion: string
  agreedAt: string
  method: ConsentMethod
  documents: ConsentDocument[]
  synced: boolean
}

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage
  } catch {
    return null
  }
}

/** يقرأ السجل المحفوظ، ويتجاهل أي نسخة قديمة أو بيانات تالفة. */
export function readStoredConsent(): LegalConsentRecord | null {
  const storage = safeStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LegalConsentRecord>
    if (
      typeof parsed.policyVersion !== "string" ||
      typeof parsed.agreedAt !== "string" ||
      Number.isNaN(Date.parse(parsed.agreedAt))
    ) {
      return null
    }
    const method: ConsentMethod = parsed.method === "google" ? "google" : "email"
    const documents = Array.isArray(parsed.documents)
      ? (parsed.documents.filter((d): d is ConsentDocument =>
          CONSENT_DOCUMENTS.includes(d as ConsentDocument)
        ) as ConsentDocument[])
      : []
    return {
      policyVersion: parsed.policyVersion,
      agreedAt: parsed.agreedAt,
      method,
      documents: documents.length ? documents : [...CONSENT_DOCUMENTS],
      synced: parsed.synced === true,
    }
  } catch {
    return null
  }
}

/**
 * هل وافق هذا المتصفح على النسخة *الحالية* من السياسات؟
 * إن تغيّرت النسخة ترجع false فتُطلب الموافقة من جديد.
 */
export function hasCurrentConsent(): boolean {
  return readStoredConsent()?.policyVersion === POLICY_VERSION
}

/** يلتقط الموافقة لحظة تأشير الخانة — قبل أي استدعاء شبكة. */
export function captureConsent(method: ConsentMethod): LegalConsentRecord {
  const record: LegalConsentRecord = {
    policyVersion: POLICY_VERSION,
    agreedAt: new Date().toISOString(),
    method,
    documents: [...CONSENT_DOCUMENTS],
    synced: false,
  }
  const storage = safeStorage()
  if (storage) {
    try {
      storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record))
    } catch {
      /* التخزين ممتلئ أو محظور — تبقى المزامنة ممكنة عبر metadata */
    }
  }
  return record
}

/** يرفع السجل المحلي إلى "غير متزامن" ليُعاد إرساله. */
export function markConsentUnsynced(): void {
  const record = readStoredConsent()
  if (!record) return
  const storage = safeStorage()
  if (!storage) return
  try {
    storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ ...record, synced: false }))
  } catch {
    /* تجاهل */
  }
}

export function clearStoredConsent(): void {
  const storage = safeStorage()
  if (!storage) return
  try {
    storage.removeItem(CONSENT_STORAGE_KEY)
  } catch {
    /* تجاهل */
  }
}

export interface ConsentSyncResult {
  synced: boolean
  skipped: boolean
  error: string | null
}

/**
 * يكتب موافقة محفوظة محلياً إلى القاعدة للمستخدم الحالي.
 * آمنة للاستدعاء المتكرر: RPC عبارة عن UPSERT على
 * (user_id, document, policy_version).
 */
export async function syncPendingConsent(): Promise<ConsentSyncResult> {
  const record = readStoredConsent()
  if (!record) return { synced: false, skipped: true, error: null }
  // نسخة قديمة → لا نُسجّل موافقة على نص لم يعد معروضاً، بل نطلبها من جديد.
  if (record.policyVersion !== POLICY_VERSION) {
    return { synced: false, skipped: true, error: null }
  }
  if (record.synced) return { synced: true, skipped: true, error: null }

  try {
    const { supabase } = await import("@/lib/supabase/client")
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { synced: false, skipped: true, error: null }

    const userAgent =
      typeof navigator === "undefined" ? null : navigator.userAgent.slice(0, 300)

    let failure: string | null = null
    for (const document of record.documents) {
      const { error } = await supabase.rpc("record_legal_consent", {
        p_document: document,
        p_policy_version: record.policyVersion,
        p_method: record.method,
        p_user_agent: userAgent,
      })
      if (error) failure = error.message
    }

    if (failure) return { synced: false, skipped: false, error: failure }

    const storage = safeStorage()
    if (storage) {
      try {
        storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ ...record, synced: true }))
      } catch {
        /* ليس حرجاً: الصفوف وصلت إلى القاعدة */
      }
    }
    return { synced: true, skipped: false, error: null }
  } catch (error) {
    return {
      synced: false,
      skipped: false,
      error: error instanceof Error ? error.message : "تعذّرت مزامنة الموافقة",
    }
  }
}
