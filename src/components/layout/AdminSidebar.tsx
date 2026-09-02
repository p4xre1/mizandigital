import React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  FileText,
  Video,
  Tags,
  Users,
  Settings,
  Scale,
  BookOpen,
  MessageCircle,
  ChevronsLeft,
  ChevronsRight,
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

// عناصر القائمة مجمّعة فـ قسمين حقيقيين: محتوى المنصة، وإدارة النظام —
// تجميع فعلي وليس زخرفة، لأن الفرق بين الاثنين له معنى وظيفي حقيقي
const navGroups = [
  {
    label: "المحتوى",
    items: [
      { label: "لوحة القيادة", path: "/admin", icon: LayoutDashboard },
      { label: "المقالات والبحوث", path: "/admin/articles", icon: FileText },
      { label: "القاموس القانوني", path: "/admin/lexicon", icon: Tags },
      { label: "الأرشيف القانوني", path: "/admin/laws", icon: Scale },
      { label: "مكتبة الوثائق", path: "/admin/library", icon: BookOpen },
      { label: "الندوات والبثوث", path: "/admin/seminars", icon: Video },
    ],
  },
  {
    label: "النظام",
    items: [
      { label: "التعليقات", path: "/admin/comments", icon: MessageCircle },
      { label: "الكليات والمؤسسات", path: "/admin/faculties", icon: Users },
      { label: "الإعدادات", path: "/admin/settings", icon: Settings },
    ],
  },
]

export default function AdminSidebar({
  collapsed = false,
  onToggleCollapse,
  currentPath: customPath,
  onNavigate,
}: AdminSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const activePath = customPath || location.pathname

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path)
    } else {
      navigate(path)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    handleNav("/login")
  }

  return (
    <aside
      className={cn(
        "relative flex flex-col border-l border-border bg-card transition-[width] duration-200",
        collapsed ? "w-[72px]" : "w-64"
      )}
      dir="rtl"
    >
      {/* شعار الموقع */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Scale className="size-[18px]" strokeWidth={2.25} />
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <h1 className="truncate text-[13.5px] font-extrabold text-foreground">ميزان الرقمية</h1>
            <span className="text-[10.5px] font-medium text-muted-foreground">إدارة المحتوى</span>
          </div>
        )}
      </div>

      {/* عناصر القائمة مجمّعة */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="mb-1.5 px-2.5 text-[10.5px] font-bold text-muted-foreground/70">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive =
                  activePath === item.path ||
                  (item.path !== "/admin" && activePath.startsWith(item.path))

                return (
                  <button
                    key={item.path}
                    onClick={() => handleNav(item.path)}
                    className={cn(
                      "group relative flex w-full items-center gap-3 rounded-lg py-2 text-[13px] font-bold transition-colors",
                      collapsed ? "justify-center px-0" : "px-2.5",
                      isActive
                        ? "bg-primary/[0.07] text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    {/* مؤشر النشاط: خط ذهبي رفيع بدل خلفية صلبة — لمسة واحدة هادئة */}
                    <span
                      className={cn(
                        "absolute right-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-accent-gold transition-opacity",
                        isActive ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <Icon className={cn("size-[18px] shrink-0", isActive && "text-primary")} strokeWidth={2} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* تسجيل الخروج + زر الطي */}
      <div className="shrink-0 space-y-1 border-t border-border p-3">
        <button
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg py-2 text-[13px] font-bold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
            collapsed ? "justify-center px-0" : "px-2.5"
          )}
          title={collapsed ? "تسجيل الخروج" : undefined}
        >
          <LogOut className="size-[18px] shrink-0" strokeWidth={2} />
          {!collapsed && <span className="truncate">تسجيل الخروج</span>}
        </button>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg py-2 text-[11px] font-semibold text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground",
              collapsed ? "justify-center px-0" : "px-2.5"
            )}
          >
            {collapsed ? <ChevronsLeft className="size-4" /> : <ChevronsRight className="size-4" />}
            {!collapsed && <span>طي القائمة</span>}
          </button>
        )}
      </div>
    </aside>
  )
}