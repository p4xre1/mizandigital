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
 * getToken هو نفسه اللي كترجعه useAuth() ديال Clerk — Function دالة
 * async كترجع رمز الدخول (JWT) الحالي أو null إذا كان المستخدم غير موصول.
 */
type GetClerkToken = () => Promise<string | null>

async function callOnboardingFunction(
  getToken: GetClerkToken,
  init: { method: "GET" | "POST"; body?: OnboardingPayload }
) {
  const token = await getToken()
  console.log("Clerk Token Debug:", token ? "Token exists (Length: " + token.length + ")" : "Token is NULL!")
  
  if (!token) throw new Error("لا توجد جلسة Clerk صالحة")

  const { data, error } = await supabase.functions.invoke("onboarding", {
    method: init.method,
    headers: { Authorization: `Bearer ${token}` },
    body: init.body,
  })

  if (error) throw error
  return data
}
/** يتحقق واش المستخدم الحالي (Clerk) كمّل استبيان الترحيب من قبل. */
export async function checkOnboardingCompleted(getToken: GetClerkToken): Promise<boolean> {
  const data = await callOnboardingFunction(getToken, { method: "GET" })
  return Boolean(data?.completed)
}

/** يسجّل إجابات استبيان الترحيب. */
export async function submitOnboarding(getToken: GetClerkToken, payload: OnboardingPayload): Promise<void> {
  await callOnboardingFunction(getToken, { method: "POST", body: payload })
}
