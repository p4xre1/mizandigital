import { useEffect, useRef, type ReactNode } from "react"
import { Download, List, Loader2, X } from "lucide-react"

import { ArticleTranslateWidget } from "./ArticleTranslateWidget"

interface MaxReadBarProps {
  /** نسبة تقدّم القراءة 0..100 — تظهر كشريط رفيع عند حافة الشريط السفلى */
  progress: number
  /** إخفاء عند التمرير للأسفل والعودة عند التمرير للأعلى (Medium-style) */
  hidden: boolean
  title: string
  settingsOpen: boolean
  tocOpen: boolean
  onToggleSettings: () => void
  onToggleToc: () => void
  onCloseSettings: () => void
  onCloseToc: () => void
  onExit: () => void
  /** تنزيل المقال PDF — اختياري: دون الزر لا يظهر */
  onExportPdf?: () => void
  exportingPdf?: boolean
  /** محتوى النافذة المنبثقة: مكوّن خيارات القراءة ذاته المستعمل في البطاقة الجانبية */
  settingsContent: ReactNode
  /** محتوى درج الفهرس: لوحة محتويات المقال نفسها */
  tocContent: ReactNode
}

/**
 * الشريط العلوي النحيف لوضع القراءة الأقصى — كل أدوات القراءة تبقى على بُعد
 * لمسة واحدة: زر الخروج (Esc)، شريط تقدّم القراءة، زر «Aa» لخيارات القراءة،
 * زر فهرس يفتح درجاً جانبياً، وأيقونة الترجمة.
 *
 * يختفي بالتمرير للأسفل ويعود بأول تمرير للأعلى، ويبقى ظاهراً ما دامت النافذة
 * المنبثقة أو الدرج مفتوحَين حتى لا «يهرب» الزر الذي يغلقانه.
 *
 * الوصولية: أهداف لمس 44px (size-11)، aria-expanded على زرّي Aa والفهرس،
 * dialog بدور واضح للنافذة والدرج، وإعادة التركيز إلى الزر الذي فتحها عند
 * الإغلاق، والحركات كلها خلف motion-safe احتراماً لـ prefers-reduced-motion.
 */
export function MaxReadBar({
  progress,
  hidden,
  title,
  settingsOpen,
  tocOpen,
  onToggleSettings,
  onToggleToc,
  onCloseSettings,
  onCloseToc,
  onExit,
  onExportPdf,
  exportingPdf = false,
  settingsContent,
  tocContent,
}: MaxReadBarProps) {
  const settingsAnchorRef = useRef<HTMLButtonElement | null>(null)
  const tocAnchorRef = useRef<HTMLButtonElement | null>(null)
  const settingsPopoverRef = useRef<HTMLDivElement | null>(null)
  const tocDrawerRef = useRef<HTMLElement | null>(null)

  const barHidden = hidden && !settingsOpen && !tocOpen

  // النقر خارج نافذة الخيارات يغلقها (زر Aa نفسه يستثنى فيقلب فتح/إغلاق)
  useEffect(() => {
    if (!settingsOpen) return
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      if (settingsPopoverRef.current?.contains(target)) return
      if (settingsAnchorRef.current?.contains(target)) return
      onCloseSettings()
    }
    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("touchstart", handlePointerDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("touchstart", handlePointerDown)
    }
  }, [settingsOpen, onCloseSettings])

  // إدارة التركيز: تُستقبَل النافذة/الدرج بالتركيز، وعند الإغلاق يعود التركيز
  // إلى الزر الذي فتحهما (ولو أُغلقا من Esc أو نقرة خارجية).
  const prevSettingsOpen = useRef(false)
  const prevTocOpen = useRef(false)
  useEffect(() => {
    if (settingsOpen) {
      settingsPopoverRef.current?.focus()
    } else if (prevSettingsOpen.current) {
      const active = document.activeElement
      if (!active || active === document.body || settingsPopoverRef.current?.contains(active)) {
        settingsAnchorRef.current?.focus()
      }
    }
    prevSettingsOpen.current = settingsOpen
  }, [settingsOpen])

  useEffect(() => {
    if (tocOpen) {
      tocDrawerRef.current?.focus()
    } else if (prevTocOpen.current) {
      const active = document.activeElement
      if (!active || active === document.body || tocDrawerRef.current?.contains(active)) {
        tocAnchorRef.current?.focus()
      }
    }
    prevTocOpen.current = tocOpen
  }, [tocOpen])

  const barButton =
    "grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:transition-colors"

  return (
    <>
      <header
        dir="rtl"
        className={`no-pdf fixed inset-x-0 top-0 z-[70] border-b border-border/60 bg-card/90 shadow-sm backdrop-blur-md ${
          barHidden ? "-translate-y-full" : "translate-y-0"
        } motion-safe:transition-transform motion-safe:duration-300`}
      >
        <div className="relative mx-auto flex h-14 max-w-[760px] items-center gap-1 px-2 md:px-4">
          <button type="button" onClick={onExit} className={barButton} aria-label="إنهاء وضع القراءة الأقصى (Esc)" title="إنهاء (Esc)">
            <X size={18} aria-hidden="true" />
          </button>

          <p className="min-w-0 flex-1 truncate px-1 text-center text-[12px] font-bold text-muted-foreground" aria-hidden="true">
            {title}
          </p>

          <div className="relative shrink-0">
            <button
              type="button"
              ref={settingsAnchorRef}
              onClick={onToggleSettings}
              className={`${barButton} text-[13px] font-black`}
              aria-label="خيارات القراءة (الخط والحجم والمظهر)"
              aria-expanded={settingsOpen}
              aria-haspopup="dialog"
              title="خيارات القراءة"
            >
              Aa
            </button>

            {settingsOpen && (
              <div
                ref={settingsPopoverRef}
                role="dialog"
                aria-label="خيارات القراءة"
                tabIndex={-1}
                className="fixed left-1/2 top-14 z-[80] max-h-[calc(100dvh-4.5rem)] w-[min(92vw,380px)] -translate-x-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-[0_24px_60px_hsl(0_0%_0%/0.25)] outline-none motion-safe:animate-[fadeUp_0.25s_cubic-bezier(0.16,1,0.3,1)]"
              >
                {settingsContent}
              </div>
            )}
          </div>

          <button
            type="button"
            ref={tocAnchorRef}
            onClick={onToggleToc}
            className={barButton}
            aria-label="محتويات المقال"
            aria-expanded={tocOpen}
            aria-haspopup="dialog"
            title="محتويات المقال"
          >
            <List size={17} aria-hidden="true" />
          </button>

          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              disabled={exportingPdf}
              className={`${barButton} no-pdf`}
              aria-label="تحميل المقال بصيغة PDF"
              title="تحميل المقال بصيغة PDF"
            >
              {exportingPdf ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <Download size={17} aria-hidden="true" />}
            </button>
          )}

          <div className="shrink-0">
            <ArticleTranslateWidget />
          </div>

          {/* شريط تقدّم القراءة عند الحافة السفلى للشريط */}
          <div className="absolute inset-x-0 bottom-0 h-[2.5px] bg-muted/70" aria-hidden="true">
            <div
              className="h-full bg-gradient-to-l from-primary via-violet-600 to-primary/70 motion-safe:transition-[width] motion-safe:duration-150 motion-safe:ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {tocOpen && (
        <div className="no-pdf fixed inset-0 z-[90]">
          <button
            type="button"
            aria-label="إغلاق المحتويات"
            onClick={onCloseToc}
            className="absolute inset-0 cursor-default bg-black/45 backdrop-blur-[2px]"
          />
          <aside
            ref={tocDrawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="محتويات المقال"
            tabIndex={-1}
            dir="rtl"
            onClick={(event) => {
              // أي رابط قسم داخل الدرج يغلقه بعد القفز
              if ((event.target as HTMLElement).closest("a")) onCloseToc()
            }}
            className="absolute inset-y-0 right-0 flex w-[min(85vw,340px)] flex-col border-s border-border bg-card shadow-[0_0_60px_hsl(0_0%_0%/0.35)] outline-none motion-safe:animate-[readerDrawer_0.3s_cubic-bezier(0.16,1,0.3,1)]"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-2">
              <h2 className="flex items-center gap-2 text-[13px] font-black">
                <List size={15} className="text-primary" aria-hidden="true" />
                محتويات المقال
              </h2>
              <button type="button" onClick={onCloseToc} className={barButton} aria-label="إغلاق">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">{tocContent}</div>
          </aside>
        </div>
      )}
    </>
  )
}
