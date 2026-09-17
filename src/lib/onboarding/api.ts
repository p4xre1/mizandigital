import { supabase } from "@/lib/supabase/client"

export type OnboardingUserType =
  | "student"
  | "teacher"
  | "normal"
  | "license"
  | "master"
  | "doctorate"
  | "startup"
  | "company"

export type OnboardingInterest = "lexicon" | "schools" | "pdfs" | "articles" | "news" | "events"

export interface OnboardingPayload {
  user_type: OnboardingUserType
  referral_source: string
  interests: OnboardingInterest[]
}

/**
 * استبيان الترحيب — بعد إزالة Clerk صار الرمز المستعمل هو access_token
 * الخاص بـ Supabase Auth، والدالة الحافية (Edge Function) تتحقق من توقيعه
 * عبر JWKS الخاص بـ Supabase (شوف supabase/functions/onboarding/index.ts).
 */

async function getAccessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  } catch {
    return null
  }
}

async function callOnboardingFunction(init: { method: "GET" | "POST"; body?: OnboardingPayload }) {
  const token = await getAccessToken()
  if (!token) throw new Error("لا توجد جلسة Supabase صالحة — سجّل الدخول أولاً.")

  const { data, error } = await supabase.functions.invoke("onboarding", {
    method: init.method,
    headers: { Authorization: `Bearer ${token}` },
    body: init.body,
  })

  if (error) throw error
  return data
}

/** يتحقق واش المستخدم الحالي كمّل استبيان الترحيب من قبل. */
export async function checkOnboardingCompleted(): Promise<boolean> {
  const data = await callOnboardingFunction({ method: "GET" })
  return Boolean(data?.completed)
}

/** يسجّل إجابات استبيان الترحيب. */
export async function submitOnboarding(payload: OnboardingPayload): Promise<void> {
  await callOnboardingFunction({ method: "POST", body: payload })
}
