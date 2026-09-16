import { Link } from "react-router-dom"
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/clerk-react"
import { Scale, LogIn } from "lucide-react"
import { isClerkEnabled } from "@/lib/clerk/config"
import { ClerkErrorBoundary } from "@/components/auth/ClerkErrorBoundary"

/**
 * Header / Navbar
 * -----------------------------------------------------------------------
 * - يعرض شعار "ميزان الرقمية".
 * - عند تسجيل الخروج: زر "تسجيل الدخول / إنشاء حساب" يفتح نافذة Clerk
 *   المنبثقة (modal)، والتي تدعم تسجيل الدخول عبر Google تلقائياً طالما
 *   تم تفعيله من لوحة تحكم Clerk (Social Connections).
 * - عند تسجيل الدخول: يظهر UserButton الخاص بـ Clerk (صورة المستخدم +
 *   قائمة الحساب وتسجيل الخروج).
 *
 * ملاحظة: يفترض هذا المكوّن أن <ClerkProvider> موجود بالفعل في main.tsx
 * (وهو الحال في هذا المشروع).
 */
export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* الشعار */}
        <Link
          to="/"
          title="ميزان الرقمية — المعرفة القانونية للطلبة"
          className="flex shrink-0 items-center gap-2.5"
        >
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-xl border border-primary/30 bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-[0_0_15px_hsl(var(--primary)/0.15)]"
          >
            <Scale size={19} strokeWidth={2.2} />
          </span>
          <span className="leading-tight">
            <span className="block text-base font-extrabold tracking-tight text-foreground">
              ميزان الرقمية
            </span>
            <span className="hidden text-[10px] font-semibold text-muted-foreground sm:block">
              المعرفة القانونية للطلبة
            </span>
          </span>
        </Link>

        {/* منطقة المصادقة — مغلفة بـ ClerkErrorBoundary حتى لا يُسقط أي خطأ
            من Clerk (مثل غياب <ClerkProvider>) التطبيق كاملاً. */}
        <div className="flex shrink-0 items-center gap-3">
          {isClerkEnabled && (
            <ClerkErrorBoundary>
              <SignedOut>
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[13px] font-bold text-primary-foreground shadow-sm transition hover:opacity-90 hover:shadow-md active:scale-[0.98] sm:px-5 sm:text-sm"
                  >
                    <LogIn size={16} strokeWidth={2.3} />
                    <span>تسجيل الدخول / إنشاء حساب</span>
                  </button>
                </SignInButton>
              </SignedOut>

              <SignedIn>
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "size-9",
                    },
                  }}
                />
              </SignedIn>
            </ClerkErrorBoundary>
          )}
        </div>
      </div>
    </header>
  )
}