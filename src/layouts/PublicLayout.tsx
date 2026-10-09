import { lazy, Suspense } from "react"
import { Outlet } from "react-router-dom"
import { Header, Footer } from "./PublicNavigation"
// مساعد الموقع في جزء منفصل: لا يزيد حزمة الدخول على الصفحات كافة.
const HelpAssistant = lazy(() => import("@/components/help/HelpAssistant"))

export default function PublicLayout({
  theme,
  menuOpen,
  onToggleTheme,
  onToggleMenu,
  onCloseMenu,
}: {
  theme: "light" | "dark"
  menuOpen: boolean
  onToggleTheme: () => void
  onToggleMenu: () => void
  onCloseMenu?: () => void
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header
        theme={theme}
        menuOpen={menuOpen}
        onToggleTheme={onToggleTheme}
        onToggleMenu={onToggleMenu}
        onCloseMenu={onCloseMenu}
      />

      <Outlet />

      <Footer />

      <Suspense fallback={null}>
        <HelpAssistant />
      </Suspense>
    </div>
  )
}
