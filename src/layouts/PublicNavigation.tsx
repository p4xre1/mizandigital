import { Link, NavLink } from "react-router-dom"
import { Scale, Sun, Moon, X, Menu, Search, Instagram, Facebook } from "lucide-react"
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react"
import { isClerkEnabled } from "@/lib/clerk/config"

function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.82c-1.02-.9-1.6-2.19-1.6-3.6V2h-3.4v13.4a2.6 2.6 0 1 1-2.6-2.6c.27 0 .53.03.78.1V9.44a5.99 5.99 0 0 0-.78-.05A6 6 0 1 0 15 15.4V9.2a7.6 7.6 0 0 0 4.4 1.4V7.2a4.85 4.85 0 0 1-2.8-1.38Z" />
    </svg>
  )
}

function PinterestIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.02 2C6.5 2 2 6.4 2 11.9c0 4.15 2.53 7.7 6.14 9.2-.08-.78-.16-1.98.03-2.83.18-.77 1.16-4.9 1.16-4.9s-.3-.6-.3-1.48c0-1.39.8-2.43 1.8-2.43.85 0 1.26.64 1.26 1.4 0 .86-.55 2.14-.83 3.33-.24.99.5 1.8 1.48 1.8 1.78 0 3.15-1.88 3.15-4.58 0-2.4-1.72-4.07-4.18-4.07-2.85 0-4.52 2.13-4.52 4.34 0 .86.33 1.78.75 2.28a.3.3 0 0 1 .07.29c-.08.33-.26 1.03-.29 1.18-.05.2-.16.24-.37.14-1.37-.64-2.22-2.63-2.22-4.24 0-3.45 2.5-6.62 7.22-6.62 3.79 0 6.74 2.7 6.74 6.31 0 3.77-2.37 6.79-5.67 6.79-1.1 0-2.14-.58-2.5-1.26l-.68 2.6c-.25.94-.91 2.13-1.36 2.85.99.31 2.04.47 3.13.47 5.52 0 10-4.4 10-9.9C22 6.4 17.52 2 12.02 2Z" />
    </svg>
  )
}

export function Brand({ onClick }: { onClick?: () => void } = {}) {
  return (
    <Link to="/" onClick={onClick} className="flex shrink-0 items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-[#2563eb] text-white font-black text-[16px] shadow-sm">م</span>
      <span>
        <span className="block text-[15px] font-black tracking-tight leading-none text-[#0f172a]">ميزان الرقمية</span>
        <span className="block text-[10px] font-bold text-[#64748b] tracking-wide">المعرفة القانونية للطلبة</span>
      </span>
    </Link>
  )
}

export function Header({
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
  const handleNavClick = () => {
    if (menuOpen && onCloseMenu) onCloseMenu()
    else if (menuOpen) onToggleMenu()
  }

  return (
    <header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl border-b border-[#e2e8f0] dark:border-[#1e293b]">
      <div className="container mx-auto max-w-[1280px] px-4 h-[64px] flex items-center justify-between gap-4">
        <Brand onClick={handleNavClick} />

        <nav className={`${menuOpen ? "flex" : "hidden"} lg:flex absolute lg:static inset-x-0 top-[64px] lg:top-auto z-20 bg-white dark:bg-[#0f172a] lg:bg-transparent flex-col lg:flex-row gap-1 lg:gap-1 p-4 lg:p-0 rounded-b-2xl lg:rounded-none border border-[#e2e8f0] dark:border-[#1e293b] lg:border-0 shadow-xl lg:shadow-none max-h-[80vh] overflow-y-auto`}>
          <NavLink to="/" end onClick={handleNavClick} className={({ isActive }) => `px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all ${isActive ? "bg-[#2563eb] text-white shadow-sm" : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:bg-[#1e293b]"}`}>
            الرئيسية
          </NavLink>
          <NavLink to="/articles" onClick={handleNavClick} className={({ isActive }) => `px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all ${isActive ? "bg-[#2563eb] text-white shadow-sm" : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:bg-[#1e293b]"}`}>
            المقالات
          </NavLink>
          <NavLink to="/news" onClick={handleNavClick} className={({ isActive }) => `px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all ${isActive ? "bg-[#2563eb] text-white shadow-sm" : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:bg-[#1e293b]"}`}>
            الأخبار
          </NavLink>
          <NavLink to="/lexicon" onClick={handleNavClick} className={({ isActive }) => `px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all ${isActive ? "bg-[#2563eb] text-white shadow-sm" : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:bg-[#1e293b]"}`}>
            القاموس
          </NavLink>
          <NavLink to="/schools" onClick={handleNavClick} className={({ isActive }) => `px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all ${isActive ? "bg-[#2563eb] text-white shadow-sm" : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:bg-[#1e293b]"}`}>
            الكليات
          </NavLink>
          <NavLink to="/archive" onClick={handleNavClick} className={({ isActive }) => `px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all ${isActive ? "bg-[#2563eb] text-white shadow-sm" : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:bg-[#1e293b]"}`}>
            الأرشيف
          </NavLink>
          <NavLink to="/quiz" onClick={handleNavClick} className={({ isActive }) => `px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all ${isActive ? "bg-[#2563eb] text-white shadow-sm" : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:bg-[#1e293b]"}`}>
            الاختبارات
          </NavLink>

          <div className="lg:hidden mt-3 pt-3 border-t border-[#e2e8f0] flex flex-col gap-2">
            <button onClick={onToggleTheme} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#f1f5f9] dark:bg-[#1e293b] text-[13px] font-bold">
              <span>وضع القراءة</span>
              <span className="flex items-center gap-1.5">{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />} {theme === "dark" ? "فاتح" : "داكن"}</span>
            </button>
            <Link to="/search" onClick={handleNavClick} className="px-4 py-2.5 rounded-xl border border-[#e2e8f0] text-[13px] font-bold">بحث</Link>
          </div>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-2 bg-[#f8fafc] dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] rounded-full pl-1 pr-3 h-9">
            <div className="size-7 grid place-items-center rounded-full bg-[#2563eb] text-white">
              <Search className="size-4" />
            </div>
            <input placeholder="ابحث..." className="bg-transparent outline-none text-[13px] w-24 placeholder:text-[#94a3b8]" />
          </div>

          <button onClick={onToggleTheme} className="hidden lg:grid size-9 place-items-center rounded-full border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] hover:bg-[#f1f5f9] dark:hover:bg-[#334155] transition-colors" aria-label="Toggle theme">
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {isClerkEnabled && (
            <div className="hidden md:flex items-center gap-2">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="rounded-full border border-[#e2e8f0] px-4 py-2 text-[13px] font-bold hover:bg-[#f8fafc] transition-colors">دخول</button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "size-8" } }} />
              </SignedIn>
            </div>
          )}

          <Link to="/articles" className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 py-2 text-[13px] font-bold shadow-sm transition-colors">
            ابدأ الآن
            <span className="size-5 grid place-items-center rounded-full bg-white/20">←</span>
          </Link>

          <button onClick={onToggleMenu} className="lg:hidden grid size-9 place-items-center rounded-full border border-[#e2e8f0] bg-white">
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="mt-20 bg-[#0f172a] text-white">
      <div className="container mx-auto max-w-[1280px] px-6 py-12 grid gap-8 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-[#2563eb] text-white font-black">م</span>
            <span>
              <span className="block text-[15px] font-black">ميزان الرقمية</span>
              <span className="block text-[11px] text-[#94a3b8] font-bold">المعرفة القانونية للطلبة</span>
            </span>
          </div>
          <p className="mt-4 max-w-md text-[13px] leading-6 text-[#94a3b8]">
            منصة تعليمية عصرية بتصميم نظيف — تعلم القانون بطريقة مرنة وجذابة، مع موارد مجانية للطلبة بالمغرب.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <a href="https://www.instagram.com/mizan.page" target="_blank" rel="noopener noreferrer" className="grid size-8 place-items-center rounded-full bg-white/10 hover:bg-white/15 transition-colors">
              <Instagram size={16} />
            </a>
            <a href="https://www.facebook.com/mizan.page" target="_blank" rel="noopener noreferrer" className="grid size-8 place-items-center rounded-full bg-white/10 hover:bg-white/15 transition-colors">
              <Facebook size={16} />
            </a>
            <a href="https://www.tiktok.com/@mizan_page" target="_blank" rel="noopener noreferrer" className="grid size-8 place-items-center rounded-full bg-white/10 hover:bg-white/15 transition-colors">
              <TikTokIcon size={16} />
            </a>
            <a href="https://www.pinterest.com/mizan.page" target="_blank" rel="noopener noreferrer" className="grid size-8 place-items-center rounded-full bg-white/10 hover:bg-white/15 transition-colors">
              <PinterestIcon size={16} />
            </a>
          </div>
        </div>
        <div>
          <p className="mb-3 text-[13px] font-black">استكشف</p>
          <div className="flex flex-col gap-2 text-[13px] text-[#94a3b8]">
            <Link to="/archive" className="hover:text-white transition-colors">المكتبة والملخصات</Link>
            <Link to="/news" className="hover:text-white transition-colors">الأخبار</Link>
            <Link to="/articles" className="hover:text-white transition-colors">المقالات والدراسات</Link>
            <Link to="/quiz" className="hover:text-white transition-colors">الاختبارات القانونية</Link>
          </div>
        </div>
        <div>
          <p className="mb-3 text-[13px] font-black">مراجع سريعة</p>
          <div className="flex flex-col gap-2 text-[13px] text-[#94a3b8]">
            <Link to="/lexicon" className="hover:text-white transition-colors">القاموس القانوني</Link>
            <Link to="/schools" className="hover:text-white transition-colors">دليل كليات الحقوق</Link>
            <Link to="/faq" className="hover:text-white transition-colors">الأسئلة الشائعة</Link>
            <Link to="/about" className="hover:text-white transition-colors">من نحن</Link>
          </div>
        </div>
        <div>
          <p className="mb-3 text-[13px] font-black">قانوني</p>
          <div className="flex flex-col gap-2 text-[13px] text-[#94a3b8]">
            <Link to="/terms" className="hover:text-white transition-colors">الشروط والأحكام</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">سياسة الخصوصية</Link>
            <Link to="/cookies" className="hover:text-white transition-colors">سياسة الكوكيز</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container mx-auto max-w-[1280px] px-6 py-4 flex flex-col sm:flex-row justify-between gap-2 text-[11px] text-[#64748b]">
          <span>© {new Date().getFullYear()} ميزان الرقمية — جميع الحقوق محفوظة • منصة تعليمية مجانية</span>
          <span className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[#22c55e] animate-pulse" />
            تصميم عصري • خطوط مجانية
          </span>
        </div>
      </div>
    </footer>
  )
}
