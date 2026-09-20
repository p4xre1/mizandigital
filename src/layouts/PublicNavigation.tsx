import { Link, NavLink } from "react-router-dom"
import { Sun, Moon, X, Menu, Search, Instagram, Facebook } from "lucide-react"
import { AuthControls } from "@/components/auth/AuthControls"
import { NavbarSearch } from "@/components/nav/NavbarSearch"
import { useAuth } from "@/lib/auth/AuthProvider"
import { RankBadge } from "@/components/quiz/RankBadge"
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

function XIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

/**
 * بطاقة الحساب داخل قائمة الموبايل: رتبة البروفايل + اختصارات الحساب
 * (Supabase Auth). للزائر تعرض زري الدخول وإنشاء الحساب.
 */
function MobileAccountCard({ onNavigate }: { onNavigate?: () => void }) {
  const { user, profile, rank } = useAuth()

  if (!user) {
    return (
      <Link
        to="/login"
        onClick={onNavigate}
        className="flex items-center justify-center rounded-xl bg-[#0f172a] dark:bg-white py-2.5 text-[13px] font-bold text-white dark:text-black hover:opacity-90 transition-opacity"
      >
        دخول
      </Link>
    )
  }

  return (
    <div className="rounded-xl border border-[#e2e8f0] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#0f172a]/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-extrabold text-[#0f172a] dark:text-white">
            {profile?.displayName || user.email?.split("@")[0] || "حسابي"}
          </p>
          <p className="truncate text-[11px] font-bold text-[#94a3b8]" dir="ltr">
            {profile?.username ? `@${profile.username}` : user.email}
          </p>
        </div>
        <RankBadge rank={profile?.rank ?? rank.id} size="sm" />
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <Link
          to="/profile"
          onClick={onNavigate}
          className="flex items-center justify-center rounded-lg bg-[#2563eb] py-2 text-[12px] font-bold text-white hover:bg-[#1d4ed8] transition-colors"
        >
          بروفايلي
        </Link>
        <Link
          to="/saved"
          onClick={onNavigate}
          className="flex items-center justify-center rounded-lg border border-[#e2e8f0] dark:border-[#334155] py-2 text-[12px] font-bold text-[#334155] dark:text-[#e2e8f0] hover:bg-white dark:hover:bg-[#334155] transition-colors"
        >
          المحفوظات
        </Link>
      </div>
    </div>
  )
}

export function Brand({ onClick }: { onClick?: () => void } = {}) {
  return (
    <Link to="/" onClick={onClick} className="flex shrink-0 items-center gap-2.5">
      <img src="/Logo.svg" alt="ميزان الرقمية" className="size-9 rounded-xl shadow-sm object-cover" width={36} height={36} loading="eager" />
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
      <header className="sticky top-0 z-[50] w-full bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-b border-[#e2e8f0] dark:border-[#1e293b]">
        <div className="container mx-auto max-w-[1280px] px-4 h-16 flex items-center justify-between gap-3">
          <Brand onClick={handleNavClick} />

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
            <NavLink to="/pro-tools" className="px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap text-primary">أدوات Pro</NavLink>
            <NavLink to="/schools" className={({ isActive }) => `px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all ${isActive ? "bg-[#2563eb] text-white shadow-sm" : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:bg-[#1e293b] dark:hover:text-white"}`}>
              الكليات
            </NavLink>
            <NavLink to="/archive" className={({ isActive }) => `px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all ${isActive ? "bg-[#2563eb] text-white shadow-sm" : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:bg-[#1e293b] dark:hover:text-white"}`}>
              الأرشيف
            </NavLink>
            <NavLink to="/events" className={({ isActive }) => `px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all ${isActive ? "bg-[#2563eb] text-white shadow-sm" : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:bg-[#1e293b] dark:hover:text-white"}`}>
              الفعاليات
            </NavLink>
            <NavLink to="/quiz" className={({ isActive }) => `px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all ${isActive ? "bg-[#2563eb] text-white shadow-sm" : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:bg-[#1e293b] dark:hover:text-white"}`}>
              الاختبارات
            </NavLink>
          </nav>

          {/*
            البحث في وسط الشريط (سطح المكتب فقط). الغلاف flex-1 يمتص كل
            المساحة الحرة و justify-center يوسّط الحقل داخلها، فيبقى وسط
            الشريط سواء ظهرت روابط التنقل (lg+) أم لم تظهر (md–lg).
          */}
          <div className="hidden md:flex min-w-0 flex-1 justify-center px-2">
            <NavbarSearch className="w-full max-w-[320px]" onNavigate={handleNavClick} />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link to="/search" className="grid md:hidden size-9 place-items-center rounded-full border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] hover:bg-[#f1f5f9] dark:hover:bg-[#334155] transition-colors" aria-label="Search">
              <Search size={16} />
            </Link>

            <button onClick={onToggleTheme} className="grid size-9 place-items-center rounded-full border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] hover:bg-[#f1f5f9] dark:hover:bg-[#334155] transition-colors" aria-label="Toggle theme">
              {theme === "dark" ? <Sun size={16} className="text-[#f59e0b]" /> : <Moon size={16} className="text-[#475569]" />}
            </button>

            <AuthControls onNavigate={handleNavClick} />
            <AuthControls className="flex items-center gap-2 md:hidden" onNavigate={handleNavClick} />

            <button onClick={onToggleMenu} className="lg:hidden grid size-9 place-items-center rounded-full bg-[#0f172a] dark:bg-white text-white dark:text-black hover:opacity-90 transition-opacity" aria-label="Toggle menu">
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <>
          <div className="lg:hidden fixed inset-0 top-16 bg-black/20 backdrop-blur-[1px] z-[60]" onClick={onCloseMenu} aria-hidden="true" />
          <div className="lg:hidden fixed right-3 top-[70px] w-[300px] max-w-[calc(100vw-24px)] z-[70] animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-[#e2e8f0] dark:border-[#334155] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.25)] overflow-hidden">
              <nav className="p-2.5 space-y-1 max-h-[70vh] overflow-y-auto">
                <NavLink to="/" end onClick={handleNavClick} className={({ isActive }) => `flex items-center px-3 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${isActive ? "bg-[#2563eb] text-white" : "text-[#334155] dark:text-[#e2e8f0] hover:bg-[#f8fafc] dark:hover:bg-[#334155]"}`}>
                  الرئيسية
                </NavLink>
                <NavLink to="/articles" onClick={handleNavClick} className={({ isActive }) => `flex items-center px-3 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${isActive ? "bg-[#2563eb] text-white" : "text-[#334155] dark:text-[#e2e8f0] hover:bg-[#f8fafc] dark:hover:bg-[#334155]"}`}>
                  المقالات
                </NavLink>
                <NavLink to="/news" onClick={handleNavClick} className={({ isActive }) => `flex items-center px-3 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${isActive ? "bg-[#2563eb] text-white" : "text-[#334155] dark:text-[#e2e8f0] hover:bg-[#f8fafc] dark:hover:bg-[#334155]"}`}>
                  الأخبار
                </NavLink>
                <NavLink to="/lexicon" onClick={handleNavClick} className={({ isActive }) => `flex items-center px-3 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${isActive ? "bg-[#2563eb] text-white" : "text-[#334155] dark:text-[#e2e8f0] hover:bg-[#f8fafc] dark:hover:bg-[#334155]"}`}>
                  القاموس
                </NavLink>
                <NavLink to="/pro-tools" onClick={handleNavClick} className="flex items-center px-3 py-2.5 rounded-xl text-[13px] font-bold text-primary">أدوات Pro</NavLink>
                <NavLink to="/schools" onClick={handleNavClick} className={({ isActive }) => `flex items-center px-3 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${isActive ? "bg-[#2563eb] text-white" : "text-[#334155] dark:text-[#e2e8f0] hover:bg-[#f8fafc] dark:hover:bg-[#334155]"}`}>
                  الكليات
                </NavLink>
                <NavLink to="/archive" onClick={handleNavClick} className={({ isActive }) => `flex items-center px-3 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${isActive ? "bg-[#2563eb] text-white" : "text-[#334155] dark:text-[#e2e8f0] hover:bg-[#f8fafc] dark:hover:bg-[#334155]"}`}>
                  الأرشيف
                </NavLink>
                <NavLink to="/events" onClick={handleNavClick} className={({ isActive }) => `flex items-center px-3 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${isActive ? "bg-[#2563eb] text-white" : "text-[#334155] dark:text-[#e2e8f0] hover:bg-[#f8fafc] dark:hover:bg-[#334155]"}`}>
                  الفعاليات
                </NavLink>
                <NavLink to="/quiz" onClick={handleNavClick} className={({ isActive }) => `flex items-center px-3 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${isActive ? "bg-[#2563eb] text-white" : "text-[#334155] dark:text-[#e2e8f0] hover:bg-[#f8fafc] dark:hover:bg-[#334155]"}`}>
                  الاختبارات
                </NavLink>

                <div className="pt-2 mt-2 border-t border-[#f1f5f9] dark:border-[#334155] space-y-2">
                  <MobileAccountCard onNavigate={handleNavClick} />
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
      <div className="container mx-auto max-w-[1280px] px-6 py-12 grid gap-8 md:grid-cols-[1.3fr_0.9fr_0.9fr_0.9fr_0.9fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <img src="/Logo.svg" alt="ميزان الرقمية" className="size-9 rounded-xl shadow-sm object-cover" width={36} height={36} loading="lazy" />
            <span>
              <span className="block text-[15px] font-black">ميزان الرقمية</span>
              <span className="block text-[11px] text-[#94a3b8] font-bold">المعرفة القانونية للطلبة</span>
            </span>
          </div>
          <p className="mt-4 max-w-md text-[13px] leading-6 text-[#94a3b8]">
            منصة تعليمية عصرية بتصميم نظيف — تعلم القانون بطريقة مرنة وجذابة، بمحتوى أساسي مجاني ومزايا متقدمة باشتراك للطلبة بالمغرب.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <a href="https://www.instagram.com/mizan.page" target="_blank" rel="noopener noreferrer" aria-label="حساب ميزان الرقمية على إنستغرام" title="إنستغرام" className="grid size-8 place-items-center rounded-full bg-white/10 text-white hover:bg-white/15 transition-colors">
              <Instagram size={16} aria-hidden="true" />
            </a>
            <a href="https://www.facebook.com/profile.php?id=61593607157317" target="_blank" rel="noopener noreferrer" aria-label="صفحة ميزان الرقمية على فيسبوك" title="فيسبوك" className="grid size-8 place-items-center rounded-full bg-white/10 text-white hover:bg-white/15 transition-colors">
              <Facebook size={16} aria-hidden="true" />
            </a>
            <a href="https://www.tiktok.com/@mizan_page" target="_blank" rel="noopener noreferrer" aria-label="حساب ميزان الرقمية على تيك توك" title="تيك توك" className="grid size-8 place-items-center rounded-full bg-white/10 text-white hover:bg-white/15 transition-colors">
              <TikTokIcon size={16} />
            </a>
            <a href="https://www.pinterest.com/mohamedredayassinn/" target="_blank" rel="noopener noreferrer" aria-label="حساب ميزان الرقمية على بنترست" title="بنترست" className="grid size-8 place-items-center rounded-full bg-white/10 text-white hover:bg-white/15 transition-colors">
              <PinterestIcon size={16} />
            </a>
            <a href="https://x.com/MIZANPAGE" target="_blank" rel="noopener noreferrer" aria-label="حساب ميزان الرقمية على إكس" title="إكس" className="grid size-8 place-items-center rounded-full bg-white/10 text-white hover:bg-white/15 transition-colors">
              <XIcon size={16} />
            </a>
            <a href="https://whatsapp.com/channel/0029Vb97ZZE23n3WE7R6Tf1m" target="_blank" rel="noopener noreferrer" aria-label="قناة ميزان الرقمية على واتساب" title="واتساب" className="grid size-8 place-items-center rounded-full bg-white/10 text-white hover:bg-white/15 transition-colors">
              <WhatsAppIcon size={16} />
            </a>
          </div>

          {/*
            قناة واتساب ليست منصة نشر كباقي الأيقونات بل مجتمع يلتقي فيه
            الطلبة، فتستحق دعوة واضحة بذاتها لا أيقونة بين أخريات.
          */}
          <a
            href="https://whatsapp.com/channel/0029Vb97ZZE23n3WE7R6Tf1m"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-white/20"
          >
            <WhatsAppIcon size={15} />
            انضمّ إلى مجتمع الطلبة على واتساب
          </a>
        </div>
        <div>
          <p className="mb-3 text-[13px] font-black">استكشف المحتوى</p>
          <div className="flex flex-col gap-2 text-[13px] text-[#94a3b8]">
            <Link to="/" className="hover:text-white transition-colors">الرئيسية</Link>
            <Link to="/platform" className="hover:text-white transition-colors">المنصة</Link>
            <Link to="/archive" className="hover:text-white transition-colors">المكتبة والملخصات</Link>
            <Link to="/articles" className="hover:text-white transition-colors">المقالات</Link>
            <Link to="/news" className="hover:text-white transition-colors">الأخبار القانونية</Link>
            <Link to="/lexicon" className="hover:text-white transition-colors">القاموس القانوني</Link>
            <Link to="/schools" className="hover:text-white transition-colors">دليل الكليات</Link>
            <Link to="/events" className="hover:text-white transition-colors">الفعاليات</Link>
          </div>
        </div>
        <div>
          <p className="mb-3 text-[13px] font-black">التعلم</p>
          <div className="flex flex-col gap-2 text-[13px] text-[#94a3b8]">
            <Link to="/quiz" className="hover:text-white transition-colors">مركز الاختبارات</Link>
            <Link to="/quiz/university" className="hover:text-white transition-colors">اختبارات S1-S6</Link>
            <Link to="/quiz/general" className="hover:text-white transition-colors">الثقافة العامة</Link>
            <Link to="/quiz/concours" className="hover:text-white transition-colors">مباريات التوظيف</Link>
            <Link to="/quiz/interview" className="hover:text-white transition-colors">المقابلات الشفوية</Link>
            <Link to="/quiz/placement" className="hover:text-white transition-colors">تحديد المستوى</Link>
            <Link to="/search" className="hover:text-white transition-colors">البحث</Link>
          </div>
        </div>
        <div>
          {/* عمود الأدلة الركنية: الصفحات الثلاث المرتبطة بخطة السيو، موصولة من
              الفوتر حتى لا تُولَّد يتيمة في فاحص orphanPages. */}
          <p className="mb-3 text-[13px] font-black">أدلة الطالب</p>
          <div className="flex flex-col gap-2 text-[13px] text-[#94a3b8]">
            <Link to="/guides/new-law-student-morocco" className="hover:text-white transition-colors">دليل الطالب الجديد</Link>
            <Link to="/guides/free-legal-resources-morocco" className="hover:text-white transition-colors">الموارد القانونية المجانية</Link>
            <Link to="/platform" className="hover:text-white transition-colors">عن المنصة</Link>
          </div>
        </div>
        <div>
          <p className="mb-3 text-[13px] font-black">المنصة</p>
          <div className="flex flex-col gap-2 text-[13px] text-[#94a3b8]">
            <Link to="/about" className="hover:text-white transition-colors">من نحن</Link>
            <Link to="/contact" className="hover:text-white transition-colors">اتصل بنا</Link>
            <Link to="/faq" className="hover:text-white transition-colors">الأسئلة الشائعة</Link>
            <Link to="/pricing" className="hover:text-white transition-colors">الأسعار</Link>
            <Link to="/payments" className="hover:text-white transition-colors">شراء كريدتس</Link>
            <Link to="/saved" className="hover:text-white transition-colors">المحفوظات</Link>
            <Link to="/profile" className="hover:text-white transition-colors">حسابي</Link>
          </div>
        </div>
        <div>
          <p className="mb-3 text-[13px] font-black">قانوني</p>
          <div className="flex flex-col gap-2 text-[13px] text-[#94a3b8]">
            <Link to="/terms" className="hover:text-white transition-colors">الشروط والأحكام</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">سياسة الخصوصية</Link>
            <Link to="/cookies" className="hover:text-white transition-colors">سياسة الكوكيز</Link>
            <Link to="/guidelines" className="hover:text-white transition-colors">إرشادات المجتمع</Link>
            <a href="/sitemap.xml" className="hover:text-white transition-colors">خريطة الموقع</a>
            <a href="/feed.xml" className="hover:text-white transition-colors">RSS</a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        {/*
          التباين: كان اللون #64748b على الخلفية #0f172a يعطي نسبة 3.75:1 فقط
          (الحد الأدنى WCAG AA للنص العادي هو 4.5:1) — وهذا سبب فشل تدقيق
          color-contrast في Lighthouse. #94a3b8 على نفس الخلفية = 6.96:1.
        */}
        <div className="container mx-auto max-w-[1280px] px-6 py-4 flex flex-col sm:flex-row justify-between gap-2 text-[11px] text-[#94a3b8]">
          <span>© {new Date().getFullYear()} ميزان الرقمية — جميع الحقوق محفوظة - منصة تعليمية، المحتوى الأساسي مجاني</span>
          <span className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[#22c55e] animate-pulse" aria-hidden="true" />
            تصميم عصري - خطوط مجانية
          </span>
        </div>
      </div>
    </footer>
  )
}
