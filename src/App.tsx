import { useEffect, useState, useCallback } from "react"
import { BrowserRouter } from "react-router-dom"
import { Toast } from "@/components/Toast"
import { CookieConsentBanner } from "@/components/CookieConsentBanner"
import { ScrollToTop } from "@/components/ScrollToTop"
import { supabase } from "@/lib/supabase/client"
import type { Session } from "@supabase/supabase-js"
import AppRoutes from "@/routes/AppRoutes"
import { useTheme } from "@/hooks/useTheme"

const DOWNLOAD_TOAST_EVENT = "mizan:toast"

export default function App() {
  // إدارة الوضع الليلي/النهاري: تفضيل النظام افتراضياً، مع تجاوز يدوي
  // محفوظ فـ localStorage("mizan_theme") — المنطق الكامل فـ hooks/useTheme.ts
  const { theme, toggleTheme } = useTheme()

  const [menuOpen, setMenuOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  // Supabase Auth Listener with mounting guard & prerender signal
  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session)
      }
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) setSession(nextSession)
    })

    return () => {
      isMounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  // Dynamic Theme Syncing متكفّل بها الآن hooks/useTheme.ts

  // Global Custom Event Toast Handler (Type-safe browser timer)
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

  const handleToggleMenu = useCallback(() => {
    setMenuOpen((prev) => !prev)
  }, [])

  return (
    <BrowserRouter>
      {/* يعيد التمرير إلى الأعلى عند كل تنقّل بين الصفحات */}
      <ScrollToTop />

      {/* Main Application Routes */}
      <AppRoutes
        session={session}
        theme={theme}
        menuOpen={menuOpen}
        onToggleTheme={toggleTheme}
        onToggleMenu={handleToggleMenu}
      />

      {/* Global Toast Notification */}
      <Toast
        message={toastMessage ?? ""}
        isVisible={toastMessage !== null}
        onClose={() => setToastMessage(null)}
      />

      {/* شريط موافقة الكوكيز (Google Consent Mode) */}
      <CookieConsentBanner />
    </BrowserRouter>
  )
}