import { useState } from "react"
import { Search, Bell, Sun, Moon, Menu, Plus, Globe, Shield } from "lucide-react"

interface AdminHeaderProps {
  onToggleSidebar?: () => void
}

export default function AdminHeader({ onToggleSidebar }: AdminHeaderProps) {
  const [isDark, setIsDark] = useState(false)
  const [notifications] = useState(3)

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle("dark")
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md sm:px-6" dir="rtl">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted lg:hidden"
          aria-label="القائمة"
        >
          <Menu className="size-5" />
        </button>

        {/* شريط البحث */}
        <div className="relative hidden sm:block">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث في لوحة التحكم..."
            className="h-9 w-64 rounded-full border border-border bg-background pr-9 pl-4 text-xs outline-none transition focus:w-80 focus:border-primary"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="hidden items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted sm:inline-flex"
        >
          <Globe className="size-3.5" /> زيارة الموقع
        </a>

        {/* تبديل المظهر */}
        <button
          onClick={toggleTheme}
          className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-muted"
          aria-label="المظهر"
        >
          {isDark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4" />}
        </button>

        {/* الإشعارات */}
        <button
          className="relative grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition hover:bg-muted"
          aria-label="الإشعارات"
        >
          <Bell className="size-4" />
          {notifications > 0 && (
            <span className="absolute top-1.5 right-1.5 grid size-2.5 place-items-center rounded-full bg-rose-500" />
          )}
        </button>

        <div className="mr-2 h-6 w-px bg-border" />

        {/* ملف المستخدم */}
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            م
          </div>
          <div className="hidden text-right md:block">
            <div className="text-xs font-bold text-foreground">مدير النظام</div>
            <div className="text-[10px] text-muted-foreground">admin@mizan.ma</div>
          </div>
        </div>
      </div>
    </header>
  )
}