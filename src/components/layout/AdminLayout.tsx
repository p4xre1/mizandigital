import { useState } from "react"
import AdminSidebar from "./AdminSidebar"
import AdminHeader from "./AdminHeader"

interface AdminLayoutProps {
  children: React.ReactNode
  currentPath?: string
  onNavigate?: (path: string) => void
}

export default function AdminLayout({
  children,
  currentPath = "/dashboard",
  onNavigate,
}: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background font-sans text-foreground antialiased" dir="rtl">
      {/* القائمة الجانبية للشاشات الكبيرة */}
      <div className="hidden lg:flex">
        <AdminSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          currentPath={currentPath}
          onNavigate={onNavigate}
        />
      </div>

      {/* القائمة الجانبية للأجهزة المحمولة */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-10 w-64 bg-card">
            <AdminSidebar
              collapsed={false}
              currentPath={currentPath}
              onNavigate={(path) => {
                onNavigate?.(path)
                setMobileSidebarOpen(false)
              }}
            />
          </div>
        </div>
      )}

      {/* منطقة المحتوى الرئيسية */}
      <div className="flex flex-1 flex-col min-w-0">
        <AdminHeader onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  )
}