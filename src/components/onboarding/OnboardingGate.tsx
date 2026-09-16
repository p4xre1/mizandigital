import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth/AuthProvider"
import { OnboardingModal } from "./OnboardingModal"
import { checkOnboardingCompleted, submitOnboarding, type OnboardingPayload } from "@/lib/onboarding/api"

/**
 * OnboardingGate
 * -----------------------------------------------------------------------
 * استبيان الترحيب (3 أسئلة) يظهر مرة واحدة بعد أول تسجيل دخول.
 *
 * بعد إزالة Clerk صار يعتمد على useAuth() الخاص بـ Supabase:
 *   • useAuth() لا يرمي أبداً (يرجع حالة زائر إن غاب المزوّد)، فلا حاجة إلى
 *     try/catch حول الخطافات ولا إلى شرط isClerkEnabled في App.tsx.
 *   • التحقق يتم عبر Edge Function التي تتحقق من Supabase JWT.
 *
 * الإغلاق بلا إكمال لا يسجّل شيئاً، فيظهر الاستبيان في الجلسة القادمة
 * (سلوك مقصود: لا نُجبر أحداً على الجواب).
 */
export function OnboardingGate() {
  const { initialized, user } = useAuth()
  const isSignedIn = Boolean(user)
  const [showModal, setShowModal] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!initialized || !isSignedIn || checked) return

    let cancelled = false
    checkOnboardingCompleted()
      .then((completed) => {
        if (!cancelled) {
          setShowModal(!completed)
          setChecked(true)
        }
      })
      .catch(() => {
        // فشل التحقق (شبكة/دالة غير منشورة) → لا نزعج المستخدم كل جلسة
        if (!cancelled) setChecked(true)
      })

    return () => {
      cancelled = true
    }
  }, [initialized, isSignedIn, checked])

  // تسجيل الخروج أو تغيير الحساب → تصفير الحالة للتحقق من جديد
  useEffect(() => {
    if (!isSignedIn) {
      setChecked(false)
      setShowModal(false)
    }
  }, [isSignedIn, user?.id])

  if (!showModal) return null

  const handleSubmit = async (payload: OnboardingPayload) => {
    await submitOnboarding(payload)
    setShowModal(false)
  }

  return <OnboardingModal onSubmit={handleSubmit} onDismiss={() => setShowModal(false)} />
}

export default OnboardingGate
