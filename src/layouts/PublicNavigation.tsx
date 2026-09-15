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
    <Link to="/" onClick={onClick} title="ميزان الرقمية — المعرفة القانونية للطلبة" className="flex shrink-0 items-center gap-3">
      <span className="grid size-9 place-items-center rounded-xl bg-foreground text-background font-black text-[16px]">م</span>
      <span>
        <span className="block text-[15px] font-black tracking-tight leading-none">ميزان الرقمية</span>
        <span className="block text-[10px] font-medium text-muted-foreground tracking-wide">المعرفة القانونية للطلبة</span>
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
  const today = new Date().toLocaleDateString("ar-MA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })

  const handleNavClick = () => {
    if (menuOpen && onCloseMenu) onCloseMenu()
    else if (menuOpen) onToggleMenu()
  }

  return (
    <header className="sticky top-0 z-30 w-full">
      {/* Top Bar - black in light, dark gray in dark mode - reading optimized */}
      <div className="bg-[#0a0a0a] dark:bg-[#151515] text-white text-[11px] h-8 border-b border-[#222] dark:border-[#2a2a2a]">
        <div className="container mx-auto max-w-[1280px] px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="hidden sm:block opacity-70">{today}</span>
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="hidden sm:inline">مباشر الآن • منصة مجانية</span>
              <span className="sm:hidden">مباشر</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Theme Toggle - Prominent */}
            <button
              onClick={onToggleTheme}
              aria-label={theme === "dark" ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
              className="flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 px-2.5 py-1 text-[11px] font-bold transition-colors"
              title={theme === "dark" ? "وضع القراءة النهاري" : "وضع القراءة الليلي - مريح للعين"}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              <span className="hidden sm:inline">{theme === "dark" ? "فاتح" : "داكن"}</span>
            </button>

            <div className="hidden md:flex items-center gap-2">
              {isClerkEnabled && (
                <>
                  <SignedOut>
                    <SignInButton mode="modal">
                      <button className="rounded-full bg-white text-black px-3 py-1 text-[11px] font-bold hover:bg-white/90 transition-colors">دخول</button>
                    </SignInButton>
                  </SignedOut>
                  <SignedIn>
                    <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "size-6" } }} />
                  </SignedIn>
                </>
              )}
            </div>

            <button onClick={onToggleMenu} className="md:hidden grid size-6 place-items-center rounded-full bg-white/10">
              {menuOpen ? <X size={14} /> : <Menu size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Masthead - white in light, dark card in dark */}
      <div className="bg-white dark:bg-[#1a1a1a] border-b border-black/10 dark:border-[#2a2a2a]">
        <div className="container mx-auto max-w-[1280px] px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="hidden lg:flex items-center gap-3 text-[11px]">
              <div className="text-right leading-tight">
                <div className="font-bold">النشرة اليومية</div>
                <div className="text-muted-foreground text-[10px]">الإصدار الرقمي • مجاني 100%</div>
              </div>
              <Link to="/search" className="grid size-9 place-items-center rounded-full border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 transition-colors">
                <Search className="size-4" />
              </Link>
            </div>

            <Link to="/" className="text-center flex-1 group">
              <div className="font-black tracking-[-0.02em] leading-none">
                <span className="block text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase group-hover:text-foreground transition-colors">Mizan Digital • Since 2024 • Reading Mode Optimized</span>
                <span className="block text-[30px] md:text-[38px] mt-1" style={{ fontFamily: "Georgia, serif" }}>ميزان الرقمية</span>
                <span className="block text-[11px] font-normal tracking-wide text-muted-foreground mt-1">المرجع القانوني الأول للطلبة والباحثين بالمغرب</span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-2">
              <div className="hidden lg:block text-[10px] leading-tight border border-black/10 dark:border-white/10 rounded px-3 py-2 bg-[#f8f7f4] dark:bg-[#222]">
                <div className="font-bold">مساحة إعلانية</div>
                <div className="text-muted-foreground">728x90</div>
              </div>
              <div className="size-10 grid place-items-center rounded-full bg-foreground text-background font-black text-[14px]">م</div>
            </div>
          </div>
        </div>
      </div>

      {/* Nav - newspaper style, dark mode optimized for reading */}
      <div className="bg-[#111] dark:bg-[#1e1e1e] text-white border-b border-black dark:border-[#2a2a2a]">
        <div className="container mx-auto max-w-[1280px] px-4 h-11 flex items-center justify-between gap-2">
          <nav className={`${menuOpen ? "flex" : "hidden"} md:flex absolute md:static inset-x-0 top-[88px] md:top-auto z-20 bg-[#111] dark:bg-[#1e1e1e] md:bg-transparent flex-col md:flex-row gap-1 md:gap-1 p-3 md:p-0 rounded-b-xl md:rounded-none border border-white/10 md:border-0 shadow-xl md:shadow-none max-h-[80vh] overflow-y-auto`}>
            <NavLink to="/" end onClick={handleNavClick} className={({ isActive }) => `px-3 py-1.5 rounded text-[12px] font-bold whitespace-nowrap transition-colors ${isActive ? "bg-white text-black" : "hover:bg-white/10"}`}>
              الرئيسية
            </NavLink>
            <NavLink to="/articles" onClick={handleNavClick} className={({ isActive }) => `px-3 py-1.5 rounded text-[12px] font-bold whitespace-nowrap transition-colors ${isActive ? "bg-white text-black" : "hover:bg-white/10"}`}>
              المقالات
            </NavLink>
            <NavLink to="/news" onClick={handleNavClick} className={({ isActive }) => `px-3 py-1.5 rounded text-[12px] font-bold whitespace-nowrap transition-colors ${isActive ? "bg-white text-black" : "hover:bg-white/10"}`}>
              الأخبار
            </NavLink>
            <NavLink to="/lexicon" onClick={handleNavClick} className={({ isActive }) => `px-3 py-1.5 rounded text-[12px] font-bold whitespace-nowrap transition-colors ${isActive ? "bg-white text-black" : "hover:bg-white/10"}`}>
              القاموس
            </NavLink>
            <NavLink to="/schools" onClick={handleNavClick} className={({ isActive }) => `px-3 py-1.5 rounded text-[12px] font-bold whitespace-nowrap transition-colors ${isActive ? "bg-white text-black" : "hover:bg-white/10"}`}>
              الكليات
            </NavLink>
            <NavLink to="/archive" onClick={handleNavClick} className={({ isActive }) => `px-3 py-1.5 rounded text-[12px] font-bold whitespace-nowrap transition-colors ${isActive ? "bg-white text-black" : "hover:bg-white/10"}`}>
              الأرشيف
            </NavLink>
            <NavLink to="/quiz" onClick={handleNavClick} className={({ isActive }) => `px-3 py-1.5 rounded text-[12px] font-bold whitespace-nowrap transition-colors ${isActive ? "bg-white text-black" : "hover:bg-white/10"}`}>
              الاختبارات
            </NavLink>
            
            <div className="md:hidden mt-3 pt-3 border-t border-white/10 flex flex-col gap-2">
              <button onClick={onToggleTheme} className="flex items-center justify-between px-3 py-2 rounded bg-white/10 text-[12px] font-bold">
                <span>وضع القراءة</span>
                <span className="flex items-center gap-1">{theme === "dark" ? <Sun size={14} /> : <Moon size={14} />} {theme === "dark" ? "فاتح" : "داكن"}</span>
              </button>
              <Link to="/search" onClick={handleNavClick} className="px-3 py-2 rounded bg-white/10 text-[12px] font-bold">بحث</Link>
            </div>
          </nav>

          <div className="flex items-center gap-2 shrink-0 ms-auto md:ms-0">
            <div className="hidden md:flex items-center gap-2 bg-white/10 rounded-full pl-1 pr-3 h-7 border border-white/10">
              <div className="size-5 grid place-items-center rounded-full bg-white text-black">
                <Search className="size-3" />
              </div>
              <input placeholder="ابحث..." className="bg-transparent outline-none text-[11px] w-24 placeholder:text-white/50" />
            </div>
            <Link to="/news" className="bg-[#dc2626] hover:bg-[#b91c1c] text-white px-3 py-1.5 rounded text-[11px] font-black flex items-center gap-1 transition-colors">
              <span className="size-2 rounded-full bg-white animate-pulse" />
              <span className="hidden sm:inline">WATCH ONLINE</span>
              <span className="sm:hidden">مباشر</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Popular Tags - adapts to dark mode */}
      <div className="bg-white dark:bg-[#1a1a1a] border-b border-black/5 dark:border-[#2a2a2a]">
        <div className="container mx-auto max-w-[1280px] px-4 h-9 flex items-center gap-3 text-[11px] overflow-x-auto scrollbar-none">
          <span className="font-black flex items-center gap-1 shrink-0">
            <span className="size-1.5 rounded-full bg-foreground" />
            Popular Tags
          </span>
          <div className="flex items-center gap-2">
            {["# مدونة الأسرة", "# المسطرة المدنية", "# القانون الجنائي", "# مباراة المنتدبين", "# الجريدة الرسمية"].map((tag) => (
              <Link key={tag} to={`/search?q=${tag.replace("# ", "")}`} className="px-2.5 py-1 rounded-full bg-[#f8f7f4] dark:bg-[#222] border border-black/5 dark:border-white/10 hover:border-black/15 dark:hover:border-white/20 hover:bg-white dark:hover:bg-[#2a2a2a] transition-colors whitespace-nowrap">
                {tag}
              </Link>
            ))}
          </div>
          <span className="ms-auto hidden lg:flex items-center gap-2 text-[10px] text-muted-foreground shrink-0">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            وضع قراءة مريح • {theme === "dark" ? "ليلي دافئ" : "نهاري"}
          </span>
        </div>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-card/60 dark:bg-[#111]">
      <div className="container-wide grid gap-8 py-10 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
        <div>
          <Brand />
          <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
            منصة عربية مستقلة تجمع الأرشيف الدراسي والمقالات والأخبار والندوات ودليل كليات الحقوق بالمغرب للطالب القانوني. وضع قراءة ليلي مريح للعين.
          </p>
          <a href="mailto:contact@mizan.page" dir="ltr" className="mt-4 inline-block text-sm font-semibold text-muted-foreground hover:text-primary transition text-right">
            contact@mizan.page
          </a>
          <div className="mt-4 flex items-center gap-2">
            <a href="https://www.instagram.com/mizan.page" target="_blank" rel="noopener noreferrer" className="grid size-8 place-items-center rounded-full border border-border hover:border-foreground/20 transition-colors" aria-label="إنستغرام">
              <Instagram size={16} />
            </a>
            <a href="https://www.facebook.com/mizan.page" target="_blank" rel="noopener noreferrer" className="grid size-8 place-items-center rounded-full border border-border hover:border-foreground/20 transition-colors" aria-label="فيسبوك">
              <Facebook size={16} />
            </a>
            <a href="https://www.tiktok.com/@mizan_page" target="_blank" rel="noopener noreferrer" className="grid size-8 place-items-center rounded-full border border-border hover:border-foreground/20 transition-colors" aria-label="تيك توك">
              <TikTokIcon size={16} />
            </a>
            <a href="https://www.pinterest.com/mizan.page" target="_blank" rel="noopener noreferrer" className="grid size-8 place-items-center rounded-full border border-border hover:border-foreground/20 transition-colors" aria-label="بينتيريست">
              <PinterestIcon size={16} />
            </a>
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-extrabold">استكشف</p>
          <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
            <Link to="/archive" className="hover:text-foreground">المكتبة والملخصات</Link>
            <Link to="/news" className="hover:text-foreground">الأخبار</Link>
            <Link to="/articles" className="hover:text-foreground">المقالات والدراسات</Link>
            <Link to="/events" className="hover:text-foreground">الندوات واللقاءات</Link>
            <Link to="/quiz" className="hover:text-foreground">الاختبارات القانونية</Link>
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-extrabold">مراجع سريعة</p>
          <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
            <Link to="/lexicon" className="hover:text-foreground">القاموس القانوني</Link>
            <Link to="/schools" className="hover:text-foreground">دليل كليات الحقوق</Link>
            <Link to="/profile" className="hover:text-foreground">ملفي ورتبتي</Link>
            <Link to="/faq" className="hover:text-foreground">الأسئلة الشائعة</Link>
            <Link to="/about" className="hover:text-foreground">من نحن</Link>
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-extrabold">قانوني</p>
          <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground">الشروط والأحكام</Link>
            <Link to="/privacy" className="hover:text-foreground">سياسة الخصوصية</Link>
            <Link to="/cookies" className="hover:text-foreground">سياسة الكوكيز</Link>
          </div>
        </div>
      </div>
      <div className="container-wide border-t border-border py-5 text-xs text-muted-foreground flex flex-col sm:flex-row justify-between gap-2">
        <span>© {new Date().getFullYear()} ميزان الرقمية — جميع الحقوق محفوظة.</span>
        <span className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          وضع قراءة مريح للعين • نهاري وليلي
        </span>
      </div>
    </footer>
  )
}
