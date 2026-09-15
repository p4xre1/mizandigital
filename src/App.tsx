import { useEffect, useState, useCallback, lazy, Suspense } from "react"
import { BrowserRouter } from "react-router-dom"
import { ScrollToTop } from "@/components/ScrollToTop"
import type { Session } from "@supabase/supabase-js"
import AppRoutes from "@/routes/AppRoutes"
import { useTheme } from "@/hooks/useTheme"
import { isClerkEnabled } from "@/lib/clerk/config"

const Toast = lazy(() => import("@/components/Toast").then((m) => ({ default: m.Toast })))
const CookieConsentBanner = lazy(() => import("@/components/CookieConsentBanner").then((m) => ({ default: m.CookieConsentBanner })))
const OnboardingGate = lazy(() => import("@/components/onboarding/OnboardingGate").then((m) => ({ default: m.OnboardingGate })))

const DOWNLOAD_TOAST_EVENT = "mizan:toast"

export default function App() {
  const { theme, toggleTheme } = useTheme()

  const [menuOpen, setMenuOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  // Defer Supabase auth to idle - not critical for first paint (LCP)
  useEffect(() => {
    let isMounted = true
    let unsubscribe: (() => void) | undefined

    const initAuth = () => {
      import("@/lib/supabase/client").then(({ supabase }) => {
        if (!isMounted) return
        supabase.auth.getSession().then(({ data }) => {
          if (isMounted) setSession(data.session)
        })
        const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          if (isMounted) setSession(nextSession)
        })
        unsubscribe = () => subscription.subscription.unsubscribe()
      })
    }

    if ("requestIdleCallback" in window) {
      // @ts-ignore
      requestIdleCallback(initAuth, { timeout: 2000 })
    } else {
      setTimeout(initAuth, 1000)
    }

    return () => {
      isMounted = false
      unsubscribe?.()
    }
  }, [])

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
        session={session}
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

      {isClerkEnabled && (
        <Suspense fallback={null}>
          <OnboardingGate />
        </Suspense>
      )}
    </BrowserRouter>
  )
}
