import { Link, NavLink } from "react-router-dom"
import { Scale, Sun, Moon, X, Menu, Instagram, Facebook } from "lucide-react"

// أيقونات غير متوفرة ضمن lucide-react (تيك توك وبينتيريست)
function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M16.6 5.82c-1.02-.9-1.6-2.19-1.6-3.6V2h-3.4v13.4a2.6 2.6 0 1 1-2.6-2.6c.27 0 .53.03.78.1V9.44a5.99 5.99 0 0 0-.78-.05A6 6 0 1 0 15 15.4V9.2a7.6 7.6 0 0 0 4.4 1.4V7.2a4.85 4.85 0 0 1-2.8-1.38Z" />
    </svg>
  )
}

function PinterestIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12.02 2C6.5 2 2 6.4 2 11.9c0 4.15 2.53 7.7 6.14 9.2-.08-.78-.16-1.98.03-2.83.18-.77 1.16-4.9 1.16-4.9s-.3-.6-.3-1.48c0-1.39.8-2.43 1.8-2.43.85 0 1.26.64 1.26 1.4 0 .86-.55 2.14-.83 3.33-.24.99.5 1.8 1.48 1.8 1.78 0 3.15-1.88 3.15-4.58 0-2.4-1.72-4.07-4.18-4.07-2.85 0-4.52 2.13-4.52 4.34 0 .86.33 1.78.75 2.28a.3.3 0 0 1 .07.29c-.08.33-.26 1.03-.29 1.18-.05.2-.16.24-.37.14-1.37-.64-2.22-2.63-2.22-4.24 0-3.45 2.5-6.62 7.22-6.62 3.79 0 6.74 2.7 6.74 6.31 0 3.77-2.37 6.79-5.67 6.79-1.1 0-2.14-.58-2.5-1.26l-.68 2.6c-.25.94-.91 2.13-1.36 2.85.99.31 2.04.47 3.13.47 5.52 0 10-4.4 10-9.9C22 6.4 17.52 2 12.02 2Z" />
    </svg>
  )
}

export function Brand() {
  return (
    <Link to="/" title="ميزان الرقمية — المعرفة القانونية للطلبة" className="flex shrink-0 items-center gap-3">
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
          <NavLink to="/" end title="الصفحة الرئيسية لمنصة ميزان الرقمية" className={linkClass}>
            الرئيسية
          </NavLink>
          <NavLink to="/archive" title="أرشيف الملخصات والمحاضرات والامتحانات القانونية" className={linkClass}>
            المكتبة والملخصات
          </NavLink>
          <NavLink to="/news" title="آخر الأخبار القانونية والقضائية بالمغرب" className={linkClass}>
            الأخبار
          </NavLink>
          <NavLink to="/articles" title="مقالات ودراسات قانونية معمقة" className={linkClass}>
            المقالات
          </NavLink>
          <NavLink to="/lexicon" title="القاموس القانوني — تعريفات المصطلحات القانونية" className={linkClass}>
            القاموس
          </NavLink>
          <NavLink to="/events" title="الندوات واللقاءات القانونية القادمة" className={linkClass}>
            الندوات
          </NavLink>
          <NavLink to="/schools" title="دليل كليات الحقوق بالجامعات المغربية" className={linkClass}>
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
            title="راسلنا عبر البريد الإلكتروني"
            dir="ltr"
            className="mt-4 inline-block text-sm font-semibold text-muted-foreground hover:text-primary transition text-right"
          >
            contact@mizan.page
          </a>
          <div className="mt-4 flex items-center gap-2">
            <a
              href="https://www.instagram.com/mizan.page"
              title="تابعنا على إنستغرام"
              target="_blank"
              rel="noopener noreferrer"
              className="icon-button"
              aria-label="إنستغرام"
            >
              <Instagram size={18} />
            </a>
            <a
              href="https://www.facebook.com/mizan.page"
              title="تابعنا على فيسبوك"
              target="_blank"
              rel="noopener noreferrer"
              className="icon-button"
              aria-label="فيسبوك"
            >
              <Facebook size={18} />
            </a>
            <a
              href="https://www.tiktok.com/@mizan_page"
              title="تابعنا على تيك توك"
              target="_blank"
              rel="noopener noreferrer"
              className="icon-button"
              aria-label="تيك توك"
            >
              <TikTokIcon size={18} />
            </a>
            <a
              href="https://www.pinterest.com/mizan.page"
              title="تابعنا على بينتيريست"
              target="_blank"
              rel="noopener noreferrer"
              className="icon-button"
              aria-label="بينتيريست"
            >
              <PinterestIcon size={18} />
            </a>
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-extrabold text-foreground">استكشف</p>
          <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
            <Link to="/archive" title="أرشيف الملخصات والمحاضرات والامتحانات القانونية" className="hover:text-foreground">
              المكتبة والملخصات
            </Link>
            <Link to="/news" title="آخر الأخبار القانونية والقضائية بالمغرب" className="hover:text-foreground">
              الأخبار
            </Link>
            <Link to="/articles" title="مقالات ودراسات قانونية معمقة" className="hover:text-foreground">
              المقالات والدراسات
            </Link>
            <Link to="/events" title="الندوات واللقاءات القانونية القادمة" className="hover:text-foreground">
              الندوات واللقاءات
            </Link>
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-extrabold text-foreground">مراجع سريعة</p>
          <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
            <Link to="/lexicon" title="القاموس القانوني — تعريفات المصطلحات القانونية" className="hover:text-foreground">
              القاموس القانوني
            </Link>
            <Link to="/schools" title="دليل كليات الحقوق بالجامعات المغربية" className="hover:text-foreground">
              دليل كليات الحقوق
            </Link>
            <Link to="/faq" title="الأسئلة الشائعة حول منصة ميزان الرقمية" className="hover:text-foreground">
              الأسئلة الشائعة
            </Link>
            <Link to="/about" title="من نحن — تعرف على منصة ميزان الرقمية" className="hover:text-foreground">
              من نحن
            </Link>
            <Link to="/contact" title="اتصل بفريق ميزان الرقمية" className="hover:text-foreground">
              اتصل بنا
            </Link>
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-extrabold text-foreground">قانوني</p>
          <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
            <Link to="/terms" title="الشروط والأحكام الخاصة باستخدام المنصة" className="hover:text-foreground">
              الشروط والأحكام
            </Link>
            <Link to="/privacy" title="سياسة الخصوصية وحماية البيانات" className="hover:text-foreground">
              سياسة الخصوصية
            </Link>
            <Link to="/cookies" title="سياسة استخدام ملفات تعريف الارتباط (الكوكيز)" className="hover:text-foreground">
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