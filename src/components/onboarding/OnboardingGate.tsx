import { useEffect, useState } from "react"
import { useAuth, useUser } from "@clerk/clerk-react"
import { isClerkEnabled } from "@/lib/clerk/config"
import { OnboardingModal } from "./OnboardingModal"
import { checkOnboardingCompleted, submitOnboarding, type OnboardingPayload } from "@/lib/onboarding/api"

/**
 * useSafeAuth / useSafeUser
 * -----------------------------------------------------------------------
 * useAuth/useUser يرميان خطأ إذا لم يكن <ClerkProvider> mounted بعد
 * (مثلاً أثناء تحميل حزمة Clerk أو إذا كان المفتاح غير مضبوط).
 * هاد الـ wrappers كنبتلع بيهم الخطأ فكنرجع حالة "غير مسجل دخول"،
 * وبما أن الرمي/النجاح محسوم لكل شجرة (Provider إما موجود أو لا)،
 * ترتيب الـ hooks كيبقى ثابت بين الـ renders.
 */
const NO_TOKEN = async (): Promise<string | null> => null

function useSafeAuth() {
  try {
    return useAuth()
  } catch {
    return null
  }
}

function useSafeUser() {
  try {
    return useUser()
  } catch {
    return null
  }
}

/**
 * OnboardingGate
 * -----------------------------------------------------------------------
 * هاد المكوّن كيتركّب فقط إذا كان Clerk مفعّل (شوف App.tsx: {isClerkEnabled
 * && <OnboardingGate />}) — لأن useAuth/useUser كيحتاجو <ClerkProvider>
 * فـ الشجرة، وnullما كنضمنوش هاد الشرط إلا هكا.
 *
 * المنطق: عند تسجيل الدخول (isSignedIn === true)، كنسولو الدالة
 * (Edge Function) باش نعرفو واش هذا المستخدم كمّل الاستبيان من قبل.
 * إذا لا، كنبانو المودال. الإغلاق بلا إكمال ما كيسجّلش أي حاجة، فغادي
 * يبان الاستبيان مرة أخرى فـ الجلسة الجاية (سلوك مقصود — بلا ما نرغمو
 * حد يجاوب).
 */
export function OnboardingGate() {
  const auth = useSafeAuth()
  const userState = useSafeUser()
  const isSignedIn = auth?.isSignedIn ?? false
  const isLoaded = auth?.isLoaded ?? false
  // مرجع ثابت للـ fallback حتى لا تتغير dependencies في كل render
  const getToken = auth?.getToken ?? NO_TOKEN
  const user = userState?.user ?? null
  const [showModal, setShowModal] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!isLoaded || !isSignedIn || checked) return

    let cancelled = false
    checkOnboardingCompleted(() => getToken())
      .then((completed) => {
        if (!cancelled) {
          setShowModal(!completed)
          setChecked(true)
        }
      })
      .catch(() => {
        // إذا فشل التحقق (مثلاً CLERK_JWT_ISSUER غير مضبوط فـ الدالة)،
        // ما كنبانوش المودال بدل ما نزعجو المستخدم بأخطاء متكررة كل جلسة.
        if (!cancelled) setChecked(true)
      })

    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, checked, getToken])

  // إذا سجّل المستخدم الخروج، نعاود تصفير الحالة باش لو دخل بحساب آخر
  // فـ نفس الجلسة يتحقق من جديد.
  useEffect(() => {
    if (!isSignedIn) {
      setChecked(false)
      setShowModal(false)
    }
  }, [isSignedIn, user?.id])

  if (!isClerkEnabled || !showModal) return null

  const handleSubmit = async (payload: OnboardingPayload) => {
    await submitOnboarding(() => getToken(), payload)
    setShowModal(false)
  }

  return <OnboardingModal onSubmit={handleSubmit} onDismiss={() => setShowModal(false)} />
}
