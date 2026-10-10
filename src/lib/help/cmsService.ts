import { supabase } from "@/lib/supabase/client"
import { freshAccessToken } from "@/lib/auth/sessionToken"

// جداول help_qa و help_settings: الكتابة للمشرفين فقط عبر RLS (public.is_admin()).
// الجداول غير مولّدة في أنواع Supabase بعد، لذلك نستعمل الوصول المرن كما في pro-tools.
const db = supabase as any

export type HelpQaRow = {
  id: string
  question: string
  answer: string
  keywords: string[] | null
  source_url: string | null
  source_title: string | null
  published: boolean
  updated_at: string
}

export type HelpSettingsRow = {
  id: number
  enabled: boolean
  blocked_message: string | null
  off_topic_message: string | null
  not_found_message: string | null
  disabled_message: string | null
  blocked_phrases: string[] | null
  off_topic_terms: string[] | null
}

export type HelpQaInput = {
  id?: string
  question: string
  answer: string
  keywords: string[]
  source_url: string | null
  source_title: string | null
  published: boolean
}

async function result<T>(request: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await request
  if (error) throw new Error(error.message)
  return data
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export const helpCms = {
  listQa: () =>
    result<HelpQaRow[]>(db.from("help_qa").select("*").order("updated_at", { ascending: false })),

  saveQa: async (input: HelpQaInput) =>
    result<HelpQaRow>(
      db
        .from("help_qa")
        .upsert({ ...input, updated_by: await currentUserId() })
        .select()
        .single(),
    ),

  deleteQa: (id: string) => result(db.from("help_qa").delete().eq("id", id)),

  getSettings: () => result<HelpSettingsRow | null>(db.from("help_settings").select("*").eq("id", 1).maybeSingle()),

  saveSettings: async (row: Omit<HelpSettingsRow, "id">) =>
    result<HelpSettingsRow>(
      db
        .from("help_settings")
        .update({ ...row, updated_by: await currentUserId() })
        .eq("id", 1)
        .select()
        .single(),
    ),
}

// ---------- نقاط الإدارة على الخادم ----------
// [AI-SEC] قواعد الفحص ومحرك المعاينة لا تُشحن للمتصفح؛ تُنفَّذ على الخادم
// بهوية المشرف (انظر functions/api/admin/help/*.js).

export type HelpPreviewResult = {
  mode: string
  answer: string
  sources: { title: string; url: string | null }[]
  reason?: string
}

async function adminToken(): Promise<string> {
  // اقرأ الجلسة المخزنة وجدّدها استباقياً إن قاربت على الانتهاء، حتى لا
  // يصل رمز منتهٍ للخادم فيرفض نداء التحقق ويظهر «انتهت الجلسة» زيفاً.
  const token = await freshAccessToken()
  if (!token) throw new Error("انتهت الجلسة، سجّل الدخول من جديد.")
  return token
}

/** يُعيد رسالة الخطأ الخاصة بالمدخل أو null إذا كان صالحاً. */
export async function validateHelpDraftOnServer(
  kind: "qa" | "settings",
  draft: Record<string, unknown>,
): Promise<string | null> {
  const token = await adminToken()
  const res = await fetch("/api/admin/help/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ kind, draft }),
  })
  if (!res.ok) throw new Error(`تعذّر التحقق من المحتوى على الخادم (${res.status})`)
  const body = (await res.json()) as { error: string | null }
  return body.error ?? null
}

/** معاينة الرد كما يراه الزائر، محسوبة على الخادم من الإعدادات والأسئلة المنشورة. */
export async function previewHelpAnswerOnServer(question: string): Promise<HelpPreviewResult> {
  const token = await adminToken()
  const res = await fetch("/api/admin/help/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ question }),
  })
  if (!res.ok) throw new Error(`تعذّرت المعاينة (${res.status})`)
  return (await res.json()) as HelpPreviewResult
}
