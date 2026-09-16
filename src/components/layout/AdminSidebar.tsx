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
  ListChecks,
  Flag,
  Coins,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  BarChart3,
  Brain,
  Gauge,
  Tag,
  Database,
  TrendingUp,
  Globe,
  Search,
  Bookmark,
  Zap,
  ShieldCheck,
  FileQuestion,
  GraduationCap,
  Newspaper,
  Layers,
  HelpCircle,
  Info,
  Mail,
  Shield,
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

const navGroups = [
  {
    label: "نظرة عامة",
    items: [
      { label: "لوحة القيادة", path: "/admin/dashboard", icon: LayoutDashboard },
      { label: "التحكم الكامل", path: "/admin/control", icon: Zap },
      { label: "التحليلات", path: "/admin/analytics", icon: BarChart3 },
      { label: "تتبع المحتوى 🔥", path: "/admin/content-analytics", icon: TrendingUp },
      { label: "ترند القوانين 🇲🇦", path: "/admin/law-trends", icon: Globe },
      { label: "بريد Gmail 📧", path: "/admin/gmail", icon: Mail },
      { label: "الاستخبارات", path: "/admin/intelligence", icon: Brain },
    ],
  },
  {
    label: "المحتوى",
    items: [
      { label: "المقالات والبحوث", path: "/admin/articles", icon: FileText },
      { label: "الأخبار", path: "/admin/news", icon: Newspaper },
      { label: "القاموس القانوني", path: "/admin/lexicon", icon: Layers },
      { label: "تحسين المحتوى ✨", path: "/admin/content-optimization", icon: Zap },
      { label: "الكليات", path: "/admin/faculties", icon: GraduationCap },
      { label: "الأرشيف القانوني", path: "/admin/laws", icon: Scale },
      { label: "مكتبة الوثائق", path: "/admin/library", icon: BookOpen },
      { label: "الندوات والفعاليات", path: "/admin/seminars", icon: Video },
      { label: "بنك الأسئلة", path: "/admin/quizzes", icon: ListChecks },
      { label: "التعليقات", path: "/admin/comments", icon: MessageCircle },
      { label: "الرائج القانوني", path: "/admin/trends", icon: TrendingUp },
    ],
  },
  {
    label: "المستخدمون والحوكمة",
    items: [
      { label: "إدارة المستخدمين", path: "/admin/users", icon: Users },
      { label: "بيانات المستخدم GDPR", path: "/admin/userdata", icon: Database },
      { label: "الحوكمة والبلاغات", path: "/admin/moderation", icon: Flag },
      { label: "مكافحة الاحتيال", path: "/admin/fraud", icon: ShieldCheck },
    ],
  },
  {
    label: "التمويل",
    items: [
      { label: "المدفوعات", path: "/admin/payments", icon: Coins },
      { label: "التسعير Mizan Pro", path: "/admin/pricing", icon: Tag },
      { label: "مراقبة الحدود", path: "/admin/limits", icon: Gauge },
    ],
  },
  {
    label: "الموقع والصفحات",
    items: [
      { label: "إدارة الرئيسية", path: "/admin/home", icon: Globe },
      { label: "الصفحات الثابتة", path: "/admin/pages", icon: FileText },
      { label: "SEO & AI", path: "/admin/seo", icon: Search },
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
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Scale className="size-[18px]" strokeWidth={2.25} />
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <h1 className="truncate text-[13.5px] font-extrabold text-foreground">ميزان الرقمية</h1>
            <span className="text-[10.5px] font-medium text-muted-foreground">تحكم كامل • بلا إعلانات</span>
          </div>
        )}
      </div>

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

      <div className="shrink-0 space-y-1 border-t border-border p-3">
        {!collapsed && (
          <div className="mb-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5">
            <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">Mizan Pro • بلا Adsterra</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">49/399 MAD • بيع نهائي • لا حذف ذاتي</p>
          </div>
        )}
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
