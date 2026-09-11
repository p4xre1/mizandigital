import { useCallback, useEffect, useRef, useState } from "react"
import { Languages, Check, Search, Loader2, RotateCcw, AlertTriangle } from "lucide-react"

import {
  LANGUAGES,
  SORTED_LANGUAGES,
  SOURCE_LANG,
  getLanguage,
  isRtlLanguage,
  searchLanguages,
} from "../../lib/i18n/languages"
import { translateTexts } from "../../lib/i18n/translate"
import {
  applyTranslations,
  collectTranslatableNodes,
  resetDirection,
  restoreOriginals,
  setDirection,
} from "../../lib/i18n/domTranslate"

const STORAGE_KEY = "mizan_translate_lang"

export interface ArticleTranslateWidgetProps {
  className?: string
  /**
   * مُحدِّد جذر المحتوى الذي ستُترجم نصوصه.
   * الافتراضي "main" — يغطي صفحة المقال وصفحة تفاصيل الخبر معاً لأن
   * المسارين /articles/:slug و /news/:slug يُصرَّفان بنفس المكوّن.
   */
  target?: string
}

/**
 * أداة ترجمة محتوى الصفحة إلى أي لغة يختارها القارئ.
 *
 * بديل عن "Google Website Translator" الذي أوقفته Google نهائياً ابتداءً من
 * 1 أكتوبر 2026: لم نعد نُحمّل translate.google.com/translate_a/element.js،
 * بل نُدخل نصوص المحتوى إلى /api/translate (وسيط على نفس النطاق يُدير سلسلة
 * مزوّدين وتخزيناً مؤقتاً) ونكتب الترجمة مكان النص مباشرةً.
 *
 * ⚠️ الترجمة آلية. المصطلح القانوني والإحالات التشريعية قد تفقد دقتها،
 * ولهذا يظهر تنبيه واضح للقارئ عند تفعيل أي لغة.
 */
export function ArticleTranslateWidget({ className = "", target = "main" }: ArticleTranslateWidgetProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeLang, setActiveLang] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const originalDirection = useRef<{ dir: string | null; lang: string | null } | null>(null)
  const appliedFromStorage = useRef(false)

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const resolveRoot = useCallback((): HTMLElement | null => {
    const el = document.querySelector<HTMLElement>(target)
    return el || document.querySelector<HTMLElement>("main") || document.body
  }, [target])

  const restore = useCallback(() => {
    const root = resolveRoot()
    restoreOriginals()
    if (root && originalDirection.current) {
      resetDirection(root, originalDirection.current.dir, originalDirection.current.lang)
      originalDirection.current = null
    }
    setActiveLang(null)
    setError(null)
    setProgress(null)
  }, [resolveRoot])

  const applyLanguage = useCallback(
    async (code: string) => {
      if (code === SOURCE_LANG) {
        restore()
        window.localStorage.setItem(STORAGE_KEY, SOURCE_LANG)
        setOpen(false)
        return
      }

      setError(null)
      setLoading(true)
      setProgress("جارٍ جمع نصوص الصفحة…")

      try {
        const root = resolveRoot()
        if (!root) throw new Error("تعذّر تحديد محتوى الصفحة")

        // حفظ الاتجاه الأصلي مرة واحدة قبل أول ترجمة
        if (!originalDirection.current) {
          originalDirection.current = {
            dir: root.getAttribute("dir"),
            lang: root.getAttribute("lang"),
          }
        }

        const nodes = collectTranslatableNodes(root)
        if (nodes.length === 0) throw new Error("لا توجد نصوص قابلة للترجمة في هذه الصفحة")

        setProgress(`جارٍ الترجمة (${nodes.length} مقطعاً)…`)
        const { results, provider, partial } = await translateTexts(
          nodes.map((node) => node.nodeValue || ""),
          code
        )

        applyTranslations(nodes, results)
        setDirection(root, code, isRtlLanguage(code))

        setActiveLang(code)
        window.localStorage.setItem(STORAGE_KEY, code)
        setProgress(null)
        if (partial || provider === "none") {
          setError("ترجمة جزئية — بعض المقاطع لم يُترجم. جرّب لغة أخرى أو أعد المحاولة.")
        }
      } catch (err) {
        setProgress(null)
        setError(err instanceof Error ? err.message : "تعذّرت الترجمة")
      } finally {
        setLoading(false)
        setOpen(false)
      }
    },
    [resolveRoot, restore]
  )

  // إعادة تطبيق آخر لغة اختارها القارئ عند فتح صفحة أخرى
  useEffect(() => {
    if (appliedFromStorage.current) return
    appliedFromStorage.current = true
    let stored: string | null = null
    try {
      stored = window.localStorage.getItem(STORAGE_KEY)
    } catch {
      stored = null
    }
    if (stored && stored !== SOURCE_LANG && getLanguage(stored)) {
      void applyLanguage(stored)
    }
  }, [applyLanguage])

  // تفكيك الترجمة عند مغادرة الصفحة كي لا تنتقل نصوص مترجمة لصفحة أخرى
  useEffect(() => {
    return () => {
      restoreOriginals()
    }
  }, [])

  const filtered = search.trim() ? searchLanguages(search) : SORTED_LANGUAGES
  const activeLabel = activeLang ? getLanguage(activeLang)?.name : null

  return (
    <div ref={containerRef} className={`relative inline-block notranslate ${className}`} translate="no">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="ترجمة محتوى هذه الصفحة إلى لغة أخرى (ترجمة آلية)"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition cursor-pointer ${
          activeLang
            ? "border-primary bg-primary/10 text-primary"
            : "border-border text-muted-foreground hover:text-foreground"
        }`}
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Languages size={13} />}
        <span>{activeLabel || "ترجمة"}</span>
      </button>

      {open && (
        <div
          dir="rtl"
          className="absolute z-50 mt-2 flex max-h-96 w-72 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg"
        >
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`ابحث في ${LANGUAGES.length} لغة…`}
                className="w-full rounded-md border border-border bg-background py-1.5 pr-8 pl-2 text-xs outline-none focus:border-primary"
              />
            </div>
          </div>

          {progress && (
            <p className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
              <Loader2 size={12} className="animate-spin" />
              {progress}
            </p>
          )}

          <button
            type="button"
            onClick={() => applyLanguage(SOURCE_LANG)}
            className={`flex items-center justify-between px-3 py-2 text-xs transition hover:bg-muted ${
              !activeLang ? "font-bold text-primary" : "text-foreground"
            }`}
          >
            <span>الأصل (العربية)</span>
            {!activeLang && <Check size={13} />}
          </button>

          <div className="flex-1 overflow-y-auto">
            {filtered.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => applyLanguage(lang.code)}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-xs transition hover:bg-muted ${
                  activeLang === lang.code ? "font-bold text-primary" : "text-foreground"
                }`}
              >
                <span className="flex flex-col items-start">
                  <span>{lang.name}</span>
                  <span className="text-[10px] text-muted-foreground">{lang.ar}</span>
                </span>
                {activeLang === lang.code && <Check size={13} />}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">لا توجد نتائج</p>
            )}
          </div>

          {activeLang && (
            <button
              type="button"
              onClick={() => {
                restore()
                window.localStorage.setItem(STORAGE_KEY, SOURCE_LANG)
              }}
              className="flex items-center justify-center gap-1.5 border-t border-border px-3 py-2 text-[11px] font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <RotateCcw size={12} />
              استعادة النص الأصلي
            </button>
          )}
        </div>
      )}

      {(error || activeLang) && !open && (
        <p
          className={`mt-1.5 flex max-w-[16rem] items-start gap-1 text-[10px] leading-snug ${
            error ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {error ? <AlertTriangle size={11} className="mt-px shrink-0" /> : null}
          <span>{error || "ترجمة آلية — قد لا تكون المصطلحات القانونية دقيقة."}</span>
        </p>
      )}
    </div>
  )
}
