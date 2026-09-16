import { useEffect, useState, useCallback, lazy, Suspense } from "react"
import { BrowserRouter } from "react-router-dom"
import { ScrollToTop } from "@/components/ScrollToTop"
import AppRoutes from "@/routes/AppRoutes"
import { useTheme } from "@/hooks/useTheme"
import { useAuth } from "@/lib/auth/AuthProvider"
import { useProgressionSync } from "@/hooks/useProgressionSync"
import { AuthErrorBoundary } from "@/components/auth/AuthErrorBoundary"

const Toast = lazy(() => import("@/components/Toast").then((m) => ({ default: m.Toast })))
const CookieConsentBanner = lazy(() => import("@/components/CookieConsentBanner").then((m) => ({ default: m.CookieConsentBanner })))
const OnboardingGate = lazy(() => import("@/components/onboarding/OnboardingGate").then((m) => ({ default: m.OnboardingGate })))

const DOWNLOAD_TOAST_EVENT = "mizan:toast"

/**
 * App — الهيكل العام.
 *
 * الجلسة تأتي من AuthProvider (Supabase Auth) بدل إدارتها هنا، والتقدّم
 * (XP/الرتبة) يُزامن مع البروفايل السحابي عبر useProgressionSync.
 */
function ProgressionBridge() {
  // مكوّن بلا واجهة: وظيفته ربط مخزن التقدّم المحلي ببروفايل الحساب
  useProgressionSync()
  return null
}

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const { session, initialized } = useAuth()

  const [menuOpen, setMenuOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    let hideTimer: number | undefined
    const handleDownloadToast = (event: Event) => {
      const customEvent = event as CustomEvent<string>
      if (customEvent.detail) {
        setToastMessage(customEvent.detail)
        if (hideTimer) window.clearTimeout(hideTimer)
        hideTimer = window.setTimeout(() => setToastMessage(null), 3000)
      }
    }
    window.addEventListener(DOWNLOAD_TOAST_EVENT, handleDownloadToast)
    return () => {
      window.removeEventListener(DOWNLOAD_TOAST_EVENT, handleDownloadToast)
      if (hideTimer) window.clearTimeout(hideTimer)
    }
  }, [])

  const handleToggleMenu = useCallback(() => setMenuOpen((prev) => !prev), [])
  const handleCloseMenu = useCallback(() => setMenuOpen(false), [])

  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppRoutes
        session={initialized ? session : undefined}
        theme={theme}
        menuOpen={menuOpen}
        onToggleTheme={toggleTheme}
        onToggleMenu={handleToggleMenu}
        onCloseMenu={handleCloseMenu}
      />

      <Suspense fallback={null}>
        <Toast message={toastMessage ?? ""} isVisible={toastMessage !== null} onClose={() => setToastMessage(null)} />
      </Suspense>

      <Suspense fallback={null}>
        <CookieConsentBanner />
      </Suspense>

      {/* مزامنة الرتب: أي XP يُكتسب في أي اختبار يصل إلى بروفايل الحساب */}
      <AuthErrorBoundary>
        <ProgressionBridge />
      </AuthErrorBoundary>

      <AuthErrorBoundary>
        <Suspense fallback={null}>
          <OnboardingGate />
        </Suspense>
      </AuthErrorBoundary>
    </BrowserRouter>
  )
}
