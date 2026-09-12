export const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
  | string
  | undefined

export const isClerkEnabled = Boolean(CLERK_PUBLISHABLE_KEY)

if (!isClerkEnabled && import.meta.env.DEV) {
  console.warn(
    "[Clerk] VITE_CLERK_PUBLISHABLE_KEY غير مضبوط — زر تسجيل الدخول لن يظهر حتى تضيف المفتاح فـ .env (أو فـ إعدادات بيئة النشر)."
  )
}