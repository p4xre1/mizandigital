import {
  LayoutDashboard,
  FileText,
  Video,
  Tags,
  Users,
  Settings,
  Scale,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react"
import { supabase } from "../../lib/supabase/client"

interface AdminSidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
  currentPath?: string
  onNavigate?: (path: string) => void
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ")
}

// ملاحظة: هذه المسارات يجب أن تبقى متطابقة مع مجلدات src/pages/admin/
// (articles, library, lexicon, seminars, faculties) ومع المسارات المستخدمة
// في DashboardPage.tsx كي لا يتكرر خطأ عدم توافق الروابط.
export default function AdminSidebar({
  collapsed = false,
  onToggleCollapse,
  currentPath = "/admin",
  onNavigate,
}: AdminSidebarProps) {
  const menuItems = [
    { label: "لوحة القيادة", path: "/admin", icon: LayoutDashboard },
    { label: "المقالات والبحوث", path: "/admin/articles", icon: FileText },
    { label: "مكتبة الوثائق", path: "/admin/library", icon: BookOpen },
    { label: "القاموس القانوني", path: "/admin/lexicon", icon: Tags },
    { label: "الندوات والبثوث", path: "/admin/seminars", icon: Video },
    { label: "الكليات والمؤسسات", path: "/admin/faculties", icon: Users },
    { label: "الإعدادات", path: "/admin/settings", icon: Settings },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onNavigate?.("/login")
  }

  return (
    <aside
      className={cn(
        "relative flex flex-col border-l border-border bg-card transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
      dir="rtl"
    >
      {/* شعار الموقع */}
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground font-black">
            <Scale className="size-5" />
          </div>
          {!collapsed && (
            <div className="whitespace-nowrap">
              <h1 className="font-extrabold leading-none text-foreground">ميزان الرقمية</h1>
              <span className="text-[10px] text-muted-foreground">إدارة المحتوى CMS</span>
            </div>
          )}
        </div>
      </div>

      {/* عناصر القائمة */}
      <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPath === item.path

          return (
            <button
              key={item.path}
              onClick={() => onNavigate?.(item.path)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="size-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* تسجيل الخروج + زر الطي */}
      <div className="border-t border-border p-3 space-y-2">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-destructive transition hover:bg-destructive/10"
          title={collapsed ? "تسجيل الخروج" : undefined}
        >
          <LogOut className="size-5 shrink-0" />
          {!collapsed && <span className="truncate">تسجيل الخروج</span>}
        </button>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border p-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted"
          >
            {collapsed ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
            {!collapsed && <span>طي القائمة</span>}
          </button>
        )}
      </div>
    </aside>
  )
}