import { useEffect, useRef, type ReactNode } from "react"
import { X } from "lucide-react"

interface ArticleToolDrawerProps {
  /** عنوان اللوحة — يُستعمل عنواناً مرئياً و aria-label للحوار في آنٍ واحد. */
  label: string
  /** أيقونة العنوان (اختيارية). */
  icon?: ReactNode
  /** شارة صغيرة بجانب العنوان (عدد الأقسام مثلاً). */
  badge?: ReactNode
  onClose: () => void
  children: ReactNode
  /** محتوى مثبّت أسفل الدرج (إحصائيات القراءة مع الفهرس، زر الوضع الأقصى...). */
  footer?: ReactNode
  /** أي رابط داخل الدرج يُغلقه بعد النقر — لفهرس الأقسام الذي يقفز داخل الصفحة. */
  closeOnNavigate?: boolean
  /**
   * الزر الذي فتح الدرج — إليه يعود التركيز عند الإغلاق. يُمرَّر صراحةً (لا
   * يُلتقط من document.activeElement) لأن النقر البرمجي في الاختبارات لا ينقل
   * التركيز، ولأن بعض المتصفحات لا تركّز الزر بالنقر أصلاً.
   */
  opener?: HTMLElement | null
}

/**
 * درج أدوات القراءة في الوضع العادي — «محتويات المقال»، «خيارات القراءة»
 * و«شارك المقال».
 *
 * لماذا درج بدل بطاقات جانبية دائمة؟ البطاقات كانت تأكل نصفَي العمود
 * (3 + 3 من 12) فتترك المقال في شريط ضيّق، والأغلبية الساحقة من الزيارات
 * تقرأ ولا تلمسها. الآن الصفحة كلها للمقال، والأدوات على بُعد نقرة واحدة
 * من شريط لاصق تحت هيدر الموقع مباشرة.
 *
 * الوصولية: role=dialog + aria-modal، تركيز يُستقبل عند الفتح ويعود إلى الزر
 * الذي فتحه عند الإغلاق، Esc يغلق (بالتقاط يسبق اختصارات الصفحة)، والتركيز
 * محبوس داخل الدرج (Tab/Shift+Tab يدوران فيه ولا يخرجان إلى محتوى مغطى)،
 * أهداف لمس 44px، والحركة خلف motion-safe احتراماً لـ prefers-reduced-motion.
 * الدرج no-pdf فلا يدخل ملف التصدير ولا نسخة الطباعة.
 */
export function ArticleToolDrawer({
  label,
  icon,
  badge,
  onClose,
  children,
  footer,
  closeOnNavigate = false,
  opener = null,
}: ArticleToolDrawerProps) {
  const panelRef = useRef<HTMLElement | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    // الزر الفاتح صراحةً، وإلا العنصر المركّز لحظة التركيب (النقر ركّزه)
    const active = document.activeElement
    openerRef.current = opener ?? (active instanceof HTMLElement && active !== document.body ? active : null)
    panelRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        // بالتقاط: يُغلق الدرج قبل أي اختصار آخر على الصفحة (F/Esc الخاصَّين بالوضع الأقصى)
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== "Tab") return

      // حبس التركيز داخل الحوار: الخلفية تغطي الصفحة لكن عناصرها تبقى قابلة
      // للتركيز بلوحة المفاتيح، فبدون الحبس يخرج Tab إلى محتوى لا يراه القارئ.
      const panel = panelRef.current
      if (!panel) return
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      )
      if (focusable.length === 0) {
        event.preventDefault()
        panel.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (!active || !panel.contains(active)) {
        event.preventDefault()
        first.focus()
        return
      }
      if (event.shiftKey && (active === panel || active === first)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", handleKeyDown, true)
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true)
      // التركيز يعود للزر الفاتح: بعد الإغلاق يكون الجسم هو المركّز (أو الدرج
      // نفسه وهو يُفكَّك)، وكلتاهما حالتان تستدعيان الإعادة
      const target = openerRef.current
      const focused = document.activeElement
      const lostFocus = !focused || focused === document.body || panelRef.current?.contains(focused)
      if (target && document.contains(target) && lostFocus) target.focus()
    }
  }, [onClose, opener])

  return (
    <div className="no-pdf fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label={`إغلاق ${label}`}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/45 backdrop-blur-[2px]"
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        dir="rtl"
        onClick={
          closeOnNavigate
            ? (event) => {
                // أي رابط قسم داخل الدرج يغلقه بعد القفز
                if ((event.target as HTMLElement).closest("a")) onClose()
              }
            : undefined
        }
        className="absolute inset-y-0 right-0 flex w-[min(88vw,380px)] flex-col border-s border-border bg-card shadow-[0_0_60px_hsl(0_0%_0%/0.35)] outline-none motion-safe:animate-[readerDrawer_0.3s_cubic-bezier(0.16,1,0.3,1)]"
      >
        <header className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-2">
          <h2 className="flex items-center gap-2 text-[13px] font-black">
            {icon}
            {label}
            {badge}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:transition-colors"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <div className="border-t border-border/60 p-4">{footer}</div>}
      </aside>
    </div>
  )
}
