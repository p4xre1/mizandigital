import { Link, NavLink } from "react-router-dom"
import { Sun, Moon, X, Menu, Search, Instagram, Facebook } from "lucide-react"
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react"
import { isClerkEnabled } from "@/lib/clerk/config"
import { useEffect } from "react"

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
        <span className="block text-[15px] font-black tracking-tight leading-none text-[#0f172a] dark:text-white">ميزان الرقمية</span>
        <span className="block text-[10px] font-bold text-[#64748b] dark:text-[#94a3b8] tracking-wide">المعرفة القانونية للطلبة</span>
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
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [menuOpen])

  const handleNavClick = () => {
    if (onCloseMenu) onCloseMenu()
  }

  return (
    <>
      <header className="sticky top-0 z-[50] w-full bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-xl border-b border-[#e2e8f0] dark:border-[#1e293b]">
        <div className="container mx-auto max-w-[1280px] px-4 h-16 flex items-center justify-between gap-3">
          <Brand onClick={handleNavClick} />

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            <NavLink to="/" end className={({ isActive }) => `px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all ${isActive ? "bg-[#2563eb] text-white shadow-sm" : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:bg-[#1e293b] dark:hover:text-white"}`}>
              الرئيسية
            </NavLink>
            <NavLink to="/articles" className={({ isActive }) => `px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all ${isActive ? "bg-[#2563eb] text-white shadow-sm" : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:bg-[#1e293b] dark:hover:text-white"}`}>
              المقالات
            </NavLink>
            <NavLink to="/news" className={({ isActive }) => `px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all ${isActive ? "bg-[#2563eb] text-white shadow-sm" : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:bg-[#1e293b] dark:hover:text-white"}`}>
              الأخبار
            </NavLink>
            <NavLink to="/lexicon" className={({ isActive }) => `px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all ${isActive ? "bg-[#2563eb] text-white shadow-sm" : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:bg-[#1e293b] dark:hover:text-white"}`}>
              القاموس
            </NavLink>
            <NavLink to="/schools" className={({ isActive }) => `px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all ${isActive ? "bg-[#2563eb] text-white shadow-sm" : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:bg-[#1e293b] dark:hover:text-white"}`}>
              الكليات
            </NavLink>
            <NavLink to="/archive" className={({ isActive }) => `px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all ${isActive ? "bg-[#2563eb] text-white shadow-sm" : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:bg-[#1e293b] dark:hover:text-white"}`}>
              الأرشيف
            </NavLink>
            <NavLink to="/quiz" className={({ isActive }) => `px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all ${isActive ? "bg-[#2563eb] text-white shadow-sm" : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:bg-[#1e293b] dark:hover:text-white"}`}>
              الاختبارات
            </NavLink>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {/* Search desktop */}
            <div className="hidden md:flex items-center gap-2 bg-[#f8fafc] dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] rounded-full pl-1 pr-3 h-9">
              <div className="size-7 grid place-items-center rounded-full bg-[#2563eb] text-white">
                <Search className="size-4" />
              </div>
              <input placeholder="ابحث..." className="bg-transparent outline-none text-[13px] w-24 placeholder:text-[#94a3b8]" />
            </div>

            {/* Theme toggle - ALWAYS visible on navbar (light/dark) */}
            <button onClick={onToggleTheme} className="grid size-9 place-items-center rounded-full border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] hover:bg-[#f1f5f9] dark:hover:bg-[#334155] transition-colors" aria-label="Toggle theme">
              {theme === "dark" ? <Sun size={16} className="text-[#f59e0b]" /> : <Moon size={16} className="text-[#475569]" />}
            </button>

            {isClerkEnabled && (
              <div className="hidden md:flex items-center gap-2">
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="rounded-full border border-[#e2e8f0] dark:border-[#334155] px-4 py-2 text-[13px] font-bold hover:bg-[#f8fafc] dark:hover:bg-[#1e293b] transition-colors">دخول</button>
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

            {/* Burger - mobile only */}
            <button onClick={onToggleMenu} className="lg:hidden grid size-9 place-items-center rounded-full bg-[#0f172a] dark:bg-white text-white dark:text-black hover:opacity-90 transition-opacity" aria-label="Toggle menu">
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Small mobile menu - dropdown card, not full screen */}
      {menuOpen && (
        <>
          <div className="lg:hidden fixed inset-0 top-16 bg-black/20 backdrop-blur-[1px] z-[60]" onClick={onCloseMenu} aria-hidden="true" />
          <div className="lg:hidden fixed right-3 top-[70px] w-[300px] max-w-[calc(100vw-24px)] z-[70] animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-[#e2e8f0] dark:border-[#334155] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.25)] overflow-hidden">
              <nav className="p-2.5 space-y-1 max-h-[70vh] overflow-y-auto">
                <NavLink to="/" end onClick={handleNavClick} className={({ isActive }) => `flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${isActive ? "bg-[#2563eb] text-white" : "text-[#334155] dark:text-[#e2e8f0] hover:bg-[#f8fafc] dark:hover:bg-[#334155]"}`}>
                  <span>الرئيسية</span>
                  <span className="text-[14px]">🏠</span>
                </NavLink>
                <NavLink to="/articles" onClick={handleNavClick} className={({ isActive }) => `flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${isActive ? "bg-[#2563eb] text-white" : "text-[#334155] dark:text-[#e2e8f0] hover:bg-[#f8fafc] dark:hover:bg-[#334155]"}`}>
                  <span>المقالات</span>
                  <span className="text-[14px]">📚</span>
                </NavLink>
                <NavLink to="/news" onClick={handleNavClick} className={({ isActive }) => `flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${isActive ? "bg-[#2563eb] text-white" : "text-[#334155] dark:text-[#e2e8f0] hover:bg-[#f8fafc] dark:hover:bg-[#334155]"}`}>
                  <span>الأخبار</span>
                  <span className="text-[14px]">📰</span>
                </NavLink>
                <NavLink to="/lexicon" onClick={handleNavClick} className={({ isActive }) => `flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${isActive ? "bg-[#2563eb] text-white" : "text-[#334155] dark:text-[#e2e8f0] hover:bg-[#f8fafc] dark:hover:bg-[#334155]"}`}>
                  <span>القاموس</span>
                  <span className="text-[14px]">📖</span>
                </NavLink>
                <NavLink to="/schools" onClick={handleNavClick} className={({ isActive }) => `flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${isActive ? "bg-[#2563eb] text-white" : "text-[#334155] dark:text-[#e2e8f0] hover:bg-[#f8fafc] dark:hover:bg-[#334155]"}`}>
                  <span>الكليات</span>
                  <span className="text-[14px]">🎓</span>
                </NavLink>
                <NavLink to="/archive" onClick={handleNavClick} className={({ isActive }) => `flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${isActive ? "bg-[#2563eb] text-white" : "text-[#334155] dark:text-[#e2e8f0] hover:bg-[#f8fafc] dark:hover:bg-[#334155]"}`}>
                  <span>الأرشيف</span>
                  <span className="text-[14px]">🗂️</span>
                </NavLink>
                <NavLink to="/quiz" onClick={handleNavClick} className={({ isActive }) => `flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${isActive ? "bg-[#2563eb] text-white" : "text-[#334155] dark:text-[#e2e8f0] hover:bg-[#f8fafc] dark:hover:bg-[#334155]"}`}>
                  <span>الاختبارات</span>
                  <span className="text-[14px]">✍️</span>
                </NavLink>

                <div className="pt-2 mt-2 border-t border-[#f1f5f9] dark:border-[#334155] space-y-2">
                  <Link to="/search" onClick={handleNavClick} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#f8fafc] dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#334155] text-[12px] font-bold text-[#475569] dark:text-[#94a3b8]">
                    <Search size={14} />
                    بحث سريع...
                  </Link>

                  <Link to="/articles" onClick={handleNavClick} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white py-2.5 text-[13px] font-bold shadow-sm">
                    ابدأ الآن ←
                  </Link>
                </div>
              </nav>
            </div>
          </div>
        </>
      )}
    </>
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
