import { useEffect, useState, useCallback } from "react"
import { BrowserRouter } from "react-router-dom"
import { Toast } from "@/components/Toast"
import { supabase } from "@/lib/supabase/client"
import type { Session } from "@supabase/supabase-js"
import AppRoutes from "@/routes/AppRoutes"

type Theme = "light" | "dark"
const DOWNLOAD_TOAST_EVENT = "mizan:toast"

export default function App() {
  // Theme state with localStorage & system preference fallback
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("mizan-theme")
      if (stored === "light" || stored === "dark") return stored
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    }
    return "dark"
  })

  const [menuOpen, setMenuOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  // Supabase Auth Listener with mounting guard & prerender signal
  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session)
        // Signal the prerender engine that the initial auth check is done
        // This ensures the static HTML includes your data/app state
        document.dispatchEvent(new Event("render-event"))
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

  // Dynamic Theme Syncing
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(theme)
    root.style.colorScheme = theme
    window.localStorage.setItem("mizan-theme", theme)
  }, [theme])

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

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"))
  }, [])

  const handleToggleMenu = useCallback(() => {
    setMenuOpen((prev) => !prev)
  }, [])

  return (
    <BrowserRouter>
      {/* Main Application Routes */}
      <AppRoutes
        session={session}
        theme={theme}
        menuOpen={menuOpen}
        onToggleTheme={handleToggleTheme}
        onToggleMenu={handleToggleMenu}
      />

      {/* Global Toast Notification */}
      <Toast
        message={toastMessage ?? ""}
        isVisible={toastMessage !== null}
        onClose={() => setToastMessage(null)}
      />
    </BrowserRouter>
  )
}