import { lazy, Suspense } from "react"
import { Outlet } from "react-router-dom"
import { Header, Footer } from "./PublicNavigation"
// مساعد الموقع في جزء منفصل: لا يزيد حزمة الدخول على الصفحات كافة.
const HelpAssistant = lazy(() => import("@/components/help/HelpAssistant"))
// متتبّع الزيارة أيضاً في جزء منفصل: استيراده مباشرةً يجرّ عميل Supabase إلى
// حزمة الدخول ويتجاوز ميزانية الحزمة (اختبار performance-budget يقيسها).
const SiteVisitTracker = lazy(() =>
  import("@/components/analytics/SiteVisitTracker").then((m) => ({ default: m.SiteVisitTracker })),
)

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
    <div className="site-public min-h-screen bg-background text-foreground">
      {/* زيارة الموقع (content_type='page'): تُسجَّل هنا مرة واحدة لكل تنقّل،
          فيكون «إجمالي زيارات الموقع» في لوحة التحكم حقيقياً لا محصوراً في
          قراءات المحتوى. كان المكوّن موجوداً بلا تركيب قبل هذا التغيير. */}
      <Suspense fallback={null}>
        <SiteVisitTracker />
      </Suspense>

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
