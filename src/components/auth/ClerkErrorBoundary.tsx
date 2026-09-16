import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  children: ReactNode
  /** ماذا نعرض عند فشل واجهة Clerk (افتراضياً: لا شيء). */
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * ClerkErrorBoundary
 * -----------------------------------------------------------------------
 * حاجز أخطاء (Error Boundary) للمكوّنات التي تعتمد على <ClerkProvider>
 * مثل SignedIn / SignedOut / UserButton / SignInButton.
 *
 * لماذا؟ إذا استُعملت هذه المكوّنات بدون ClerkProvider (مثلاً المفتاح
 * VITE_CLERK_PUBLISHABLE_KEY غير مضبوط، أو الحمولة Lazy لم تُكمل بعد)،
 * ترمي Clerk خطأ "SignedOut can only be used within the <ClerkProvider />"
 * وكان يسقط التطبيق كاملاً في شاشة بيضاء.
 *
 * هنا بدلاً من ذلك: نخفي منطقة المصادقة فقط (نُرجع null) ولا يكسر شيء،
 * مع تسجيل تحذير في الـ console عند الخطأ المرتبط بـ ClerkProvider.
 */
export class ClerkErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(_error: unknown): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const message = error?.message ?? ""
    if (message.includes("ClerkProvider")) {
      console.warn(
        "[Clerk] مكوّن من مكوّنات Clerk استُعمل بدون <ClerkProvider> — تم إخفاء واجهة المصادقة بدل تعطّل التطبيق. تحقق من VITE_CLERK_PUBLISHABLE_KEY.",
        error,
        info.componentStack
      )
    } else {
      console.error("[ClerkErrorBoundary] خطأ غير متوقع داخل واجهة Clerk:", error)
    }
  }

  render(): ReactNode {
    if (this.state.hasError) return this.props.fallback ?? null
    return this.props.children
  }
}

export default ClerkErrorBoundary
