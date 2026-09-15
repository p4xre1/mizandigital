import { useEffect, useState, useCallback } from "react"
import { BrowserRouter } from "react-router-dom"
import { Toast } from "@/components/Toast"
import { CookieConsentBanner } from "@/components/CookieConsentBanner"
import { ScrollToTop } from "@/components/ScrollToTop"
import type { Session } from "@supabase/supabase-js"
import AppRoutes from "@/routes/AppRoutes"
import { useTheme } from "@/hooks/useTheme"
import { isClerkEnabled } from "@/lib/clerk/config"
import { OnboardingGate } from "@/components/onboarding/OnboardingGate"

const DOWNLOAD_TOAST_EVENT = "mizan:toast"

export default function App() {
  // إدارة الوضع الليلي/النهاري: تفضيل النظام افتراضياً، مع تجاوز يدوي
  // محفوظ فـ localStorage("mizan_theme") — المنطق الكامل فـ hooks/useTheme.ts
  const { theme, toggleTheme } = useTheme()

  const [menuOpen, setMenuOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  // Supabase Auth Listener with mounting guard & prerender signal
  //
  // ملاحظة أداء (JS الحرج): كنستوردو مكتبة Supabase (~50 KiB) بشكل ديناميكي
  // هنا بدل استيرادها بشكل ثابت أعلى الملف. App.tsx كيتحمّل بشكل فوري (غير
  // lazy) مع أول تحميل للصفحة، فأي استيراد ثابت لـ Supabase فيه كان كيرغم
  // المتصفح يجلب وينفّذ حزمة Supabase كاملة قبل ما يقدر React يرسم أي حاجة
  // — رغم أن التحقق من الجلسة أصلاً غير حرج لعرض المحتوى الأولي (H1/hero)
  // وكيصرا داخل useEffect (بعد أول render). الاستيراد الديناميكي كيخلي
  // حزمة Supabase تتحمّل بالموازاة مع/بعد أول رسم بلا ما تأخّره
  useEffect(() => {
    let isMounted = true
    let unsubscribe: (() => void) | undefined

    import("@/lib/supabase/client").then(({ supabase }) => {
      if (!isMounted) return

      supabase.auth.getSession().then(({ data }) => {
        if (isMounted) {
          setSession(data.session)
        }
      })

      const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (isMounted) setSession(nextSession)
      })

      unsubscribe = () => subscription.subscription.unsubscribe()
    })

    return () => {
      isMounted = false
      unsubscribe?.()
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

  const handleCloseMenu = useCallback(() => {
    setMenuOpen(false)
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
        onCloseMenu={handleCloseMenu}
      />

      {/* Global Toast Notification */}
      <Toast
        message={toastMessage ?? ""}
        isVisible={toastMessage !== null}
        onClose={() => setToastMessage(null)}
      />

      {/* شريط موافقة الكوكيز (Google Consent Mode) */}
      <CookieConsentBanner />

      {/*
        استبيان الترحيب (3 أسئلة) بعد أول تسجيل دخول عبر Clerk.
        نتحقق من isClerkEnabled هنا لأن useAuth/useUser (المستعملة داخل
        OnboardingGate) كتحتاج <ClerkProvider> فـ الشجرة — main.tsx كيغلّف
        <App/> بـ ClerkProvider فقط إذا كان المفتاح مضبوط (شوف
        src/lib/clerk/config.ts). بلا هاد الشرط، الموقع كان غايهرمي خطأ
        فوري إذا كان Clerk غير مفعّل.
      */}
      {isClerkEnabled && <OnboardingGate />}
    </BrowserRouter>
  )
}