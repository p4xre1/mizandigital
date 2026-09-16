import { lazy, Suspense, type ReactNode } from "react"
import { isClerkEnabled } from "@/lib/clerk/config"
import { ClerkErrorBoundary } from "./ClerkErrorBoundary"

interface SafeClerkAuthProps {
  /**
   * محتوى زر تسجيل الدخول (يُمرَّر كـ child لـ SignInButton).
   * افتراضياً زر نصّي بسيط مناسب لشريط التنقل العام.
   */
  signInChildren?: ReactNode
  /** كلاسّات الحاوية الخارجية. */
  className?: string
  /** حجم صورة المستخدم داخل UserButton (clerk appearance). */
  avatarBox?: string
  /** رابط بعد تسجيل الخروج. */
  afterSignOutUrl?: string
}

// تحميل مكوّنات Clerk بالـ lazy:
// - إذا كان المفتاح غير مضبوط لا تُستورد الحزمة أصلاً (توفير ~225KB على الصفحة الأولى)
// - وأيضاً لا يوجد أي استعمال مباشر لـ SignedIn/SignedOut خارج <ClerkProvider>
const ClerkAuthControls = lazy(async () => {
  const { SignedIn, SignedOut, SignInButton, UserButton } = await import("@clerk/clerk-react")

  return {
    default: function ClerkAuthControlsInner({
      signInChildren,
      avatarBox,
      afterSignOutUrl,
    }: {
      signInChildren?: ReactNode
      avatarBox: string
      afterSignOutUrl: string
    }) {
      return (
        <>
          <SignedOut>
            <SignInButton mode="modal">{signInChildren}</SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl={afterSignOutUrl} appearance={{ elements: { avatarBox } }} />
          </SignedIn>
        </>
      )
    },
  }
})

/**
 * SafeClerkAuth
 * -----------------------------------------------------------------------
 * بديل آمن عن الاستعمال المباشر لـ SignedIn / SignedOut / UserButton /
 * SignInButton في الواجهات العامة:
 *
 * 1) يفحص isClerkEnabled — إذا كان VITE_CLERK_PUBLISHABLE_KEY غير مضبوط
 *    لا يُرجع أي شيء (null) ولا يحمّل حتى حزمة Clerk.
 * 2) يغلّف SignedIn/SignedOut/UserButton داخل ClerkErrorBoundary — حتى لو
 *    حدث خطأ "can only be used within the <ClerkProvider />" لسبب طارئ،
 *    تختفي منطقة المصادقة وحدها بدل ما يسقط التطبيق كله في شاشة بيضاء.
 */
export function SafeClerkAuth({
  signInChildren = "دخول",
  className = "hidden md:flex items-center gap-2",
  avatarBox = "size-8",
  afterSignOutUrl = "/",
}: SafeClerkAuthProps) {
  if (!isClerkEnabled) return null

  return (
    <ClerkErrorBoundary>
      <div className={className}>
        <Suspense fallback={null}>
          <ClerkAuthControls
            signInChildren={signInChildren}
            avatarBox={avatarBox}
            afterSignOutUrl={afterSignOutUrl}
          />
        </Suspense>
      </div>
    </ClerkErrorBoundary>
  )
}

export default SafeClerkAuth
