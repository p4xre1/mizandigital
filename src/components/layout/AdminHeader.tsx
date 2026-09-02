import { useState, useEffect } from "react"
import { Search, Bell, Sun, Moon, Menu, ArrowUpLeft } from "lucide-react"

interface AdminHeaderProps {
  onToggleSidebar?: () => void
}

export default function AdminHeader({ onToggleSidebar }: AdminHeaderProps) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark")
    }
    return false
  })

  const [notifications] = useState<number>(3)

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [isDark])

  const toggleTheme = () => {
    setIsDark((prev) => !prev)
  }

  return (
    <header
      className="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center justify-between gap-3 border-b border-border bg-card/85 px-4 backdrop-blur-md sm:px-6"
      dir="rtl"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted lg:hidden"
          aria-label="القائمة الجانبية"
        >
          <Menu className="size-[18px]" />
        </button>

        {/* شريط البحث */}
        <label className="group relative hidden w-full max-w-sm items-center sm:flex">
          <Search className="pointer-events-none absolute right-3.5 size-[15px] text-muted-foreground/70" />
          <input
            type="text"
            placeholder="ابحث فـ لوحة التحكم..."
            className="h-9 w-full rounded-lg border border-border bg-background pr-9 pl-3 text-[12.5px] text-foreground outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/10"
          />
        </label>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          title="زيارة الموقع فـ تبويب جديد"
          className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground sm:inline-flex"
        >
          <span>زيارة الموقع</span>
          <ArrowUpLeft className="size-3.5" />
        </a>

        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

        {/* تبديل المظهر */}
        <button
          type="button"
          onClick={toggleTheme}
          className="grid size-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="تغيير المظهر"
          title={isDark ? "تفعيل الوضع النهارِي" : "تفعيل الوضع الداكن"}
        >
          {isDark ? <Sun className="size-[17px] text-accent-gold" /> : <Moon className="size-[17px]" />}
        </button>

        {/* الإشعارات */}
        <button
          type="button"
          className="relative grid size-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="الإشعارات"
        >
          <Bell className="size-[17px]" />
          {notifications > 0 && (
            <span className="absolute left-2 top-2 size-[7px] rounded-full bg-accent-gold ring-2 ring-card" />
          )}
        </button>

        <div className="mx-1 h-6 w-px bg-border" />

        {/* ملف المستخدم */}
        <button type="button" className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 transition hover:bg-muted">
          <div className="hidden text-right md:block">
            <div className="text-[12.5px] font-bold leading-tight text-foreground">مدير النظام</div>
            <div className="text-[10.5px] leading-tight text-muted-foreground">admin@mizan.ma</div>
          </div>
          <div className="grid size-8 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground ring-2 ring-primary/15">
            م
          </div>
        </button>
      </div>
    </header>
  )
}