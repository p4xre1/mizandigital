import { Link } from "react-router-dom"
import { Scale } from "lucide-react"
import { AuthControls, SignInButton } from "@/components/auth/AuthControls"

/**
 * Header / Navbar
 * -----------------------------------------------------------------------
 * - يعرض شعار "ميزان الرقمية".
 * - عند تسجيل الخروج: زرا «دخول» و«حساب جديد» نحو /login (صفحة مصادقة
 *   Supabase: بريد + كلمة مرور، Google، ورابط سحري).
 * - عند تسجيل الدخول: قائمة الحساب مع شارة الرتبة (D → SSS) ورابط البروفايل
 *   العام ولوحة التحكم للمشرفين.
 *
 * المصادقة كلها Supabase Auth — أُزيل Clerk (لا ClerkProvider ولا
 * VITE_CLERK_PUBLISHABLE_KEY).
 */
export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 ">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* الشعار */}
        <Link
          to="/"
          title="ميزان الرقمية — المعرفة القانونية للطلبة"
          className="flex shrink-0 items-center gap-2.5"
        >
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary"
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

        {/* منطقة المصادقة (Supabase) — مغلفة بـ AuthErrorBoundary داخل AuthControls */}
        <div className="flex shrink-0 items-center gap-3">
          <AuthControls className="hidden items-center gap-2 md:flex" />
          <div className="md:hidden">
            <SignInButton label="دخول" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[13px] font-bold text-primary-foreground shadow-sm transition hover:opacity-90 active:scale-[0.98]" />
          </div>
        </div>
      </div>
    </header>
  )
}
