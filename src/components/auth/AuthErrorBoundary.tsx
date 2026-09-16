import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  children: ReactNode
  /** ماذا نعرض عند فشل واجهة المصادقة (افتراضياً: لا شيء). */
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * AuthErrorBoundary
 * -----------------------------------------------------------------------
 * حاجز أخطاء لمنطقة المصادقة (أزرار الدخول، قائمة المستخدم، مودال
 * الاستبيان). كان اسمه ClerkErrorBoundary قبل الانتقال إلى Supabase Auth.
 *
 * لماذا ما زلنا نحتاجه؟ لأن أي خطأ في مكوّن يعتمد على الجلسة (قراءة
 * supabase.auth قبل تهيئة العميل، أو فشل الشبكة في لحظة حرجة) يجب أن يُخفي
 * منطقة المصادقة وحدها، لا أن يُسقط التطبيق كله في شاشة بيضاء.
 */
export class AuthErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(_error: unknown): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AuthErrorBoundary] خطأ داخل واجهة المصادقة:", error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.hasError) return this.props.fallback ?? null
    return this.props.children
  }
}

export default AuthErrorBoundary
