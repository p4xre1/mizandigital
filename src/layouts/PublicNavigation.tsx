import { Link, NavLink } from "react-router-dom"
import { Scale, Sun, Moon, X, Menu } from "lucide-react"

export function Brand() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-3">
      <span className="brand-mark" aria-hidden="true">
        <Scale size={21} strokeWidth={2.2} />
      </span>
      <span>
        <span className="block text-base font-extrabold tracking-tight text-foreground">
          ميزان الرقمية
        </span>
        <span className="block text-[10px] font-semibold text-muted-foreground">
          المعرفة القانونية للطلبة
        </span>
      </span>
    </Link>
  )
}

export function Header({
  theme,
  menuOpen,
  onToggleTheme,
  onToggleMenu,
}: {
  theme: "light" | "dark"
  menuOpen: boolean
  onToggleTheme: () => void
  onToggleMenu: () => void
}) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-3 py-2 text-[0.72rem] font-bold transition lg:px-4 lg:text-sm ${
      isActive
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    }`

  return (
    <header className="site-header">
      <div className="container-wide flex min-h-[72px] items-center justify-between gap-4">
        <Brand />
        <nav
          className={`${
            menuOpen ? "flex" : "hidden"
          } absolute inset-x-4 top-[68px] z-20 flex-col gap-1 rounded-2xl border border-border bg-card p-3 shadow-xl md:static md:flex md:flex-row md:items-center md:gap-0 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
          aria-label="التنقل الرئيسي"
        >
          <NavLink to="/" end className={linkClass}>
            الرئيسية
          </NavLink>
          <NavLink to="/archive" className={linkClass}>
            المكتبة والملخصات
          </NavLink>
          <NavLink to="/news" className={linkClass}>
            الأخبار
          </NavLink>
          <NavLink to="/articles" className={linkClass}>
            المقالات
          </NavLink>
          <NavLink to="/lexicon" className={linkClass}>
            القاموس
          </NavLink>
          <NavLink to="/events" className={linkClass}>
            الندوات
          </NavLink>
          <NavLink to="/schools" className={linkClass}>
            كليات الحقوق
          </NavLink>
        </nav>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="icon-button"
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            type="button"
            className="icon-button md:hidden"
            onClick={onToggleMenu}
            aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
          >
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-card/60">
      <div className="container-wide grid gap-8 py-10 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
        <div>
          <Brand />
          <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
            منصة عربية مستقلة تجمع الأرشيف الدراسي والمقالات والأخبار والندوات ودليل كليات الحقوق بالمغرب للطالب القانوني.
          </p>
          <a
            href="mailto:contact@mizan.page"
            dir="ltr"
            className="mt-4 inline-block text-sm font-semibold text-muted-foreground hover:text-primary transition text-right"
          >
            contact@mizan.page
          </a>
        </div>
        <div>
          <p className="mb-3 text-sm font-extrabold text-foreground">استكشف</p>
          <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
            <Link to="/archive" className="hover:text-foreground">
              المكتبة والملخصات
            </Link>
            <Link to="/news" className="hover:text-foreground">
              الأخبار
            </Link>
            <Link to="/articles" className="hover:text-foreground">
              المقالات والدراسات
            </Link>
            <Link to="/events" className="hover:text-foreground">
              الندوات واللقاءات
            </Link>
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-extrabold text-foreground">مراجع سريعة</p>
          <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
            <Link to="/lexicon" className="hover:text-foreground">
              القاموس القانوني
            </Link>
            <Link to="/schools" className="hover:text-foreground">
              دليل كليات الحقوق
            </Link>
            <Link to="/faq" className="hover:text-foreground">
              الأسئلة الشائعة
            </Link>
            <Link to="/about" className="hover:text-foreground">
              من نحن
            </Link>
            <Link to="/contact" className="hover:text-foreground">
              اتصل بنا
            </Link>
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-extrabold text-foreground">قانوني</p>
          <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground">
              الشروط والأحكام
            </Link>
            <Link to="/privacy" className="hover:text-foreground">
              سياسة الخصوصية
            </Link>
            <Link to="/cookies" className="hover:text-foreground">
              سياسة الكوكيز
            </Link>
          </div>
        </div>
      </div>
      <div className="container-wide border-t border-border py-5 text-xs text-muted-foreground">
        © {new Date().getFullYear()} ميزان الرقمية — جميع الحقوق محفوظة. منصة تعليمية وليست بديلاً عن الاستشارة القانونية المتخصصة.
      </div>
    </footer>
  )
}