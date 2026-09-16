import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search } from "lucide-react"
import { INPUT_LIMITS, validateSearch } from "@/lib/security/inputGuard"

/**
 * بحث الشريط العلوي — لسطح المكتب.
 * -----------------------------------------------------------------------
 * يحل ثلاث مشاكل في النسخة السابقة:
 *   1) كان الحقل زينة: بلا state ولا معالج، فالكتابة فيه لا تفعل شيئاً.
 *   2) كان محشوراً في مجموعة أزرار اليمين بعرض 24 (w-24).
 *   3) لم يكن هناك اختصار لوحة مفاتيح.
 *
 * الآن: الحقل في وسط الشريط، Enter ينقل إلى /search?q=… بعد المرور عبر
 * validateSearch (نفس دالة صفحة البحث)، وزر K يركّزه — والضغط على K من
 * أي مكان في الصفحة يركّزه أيضاً ما لم يكن المستخدم يكتب في حقل آخر.
 */

/** مفتاح الاختصار — معروض للمستخدم ومستعمل في المستمع. */
export const SEARCH_HOTKEY = "k"

interface NavbarSearchProps {
  className?: string
  /** يُنادى بعد الانتقال (مثلاً لإغلاق قائمة الموبايل). */
  onNavigate?: () => void
}

export function NavbarSearch({ className = "", onNavigate }: NavbarSearchProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)

  const focusInput = useCallback(() => {
    const input = inputRef.current
    if (!input) return
    input.focus()
    // تحديد النص الموجود يسهّل استبداله مباشرة
    input.select()
  }, [])

  /* اختصار لوحة المفاتيح: K أو Ctrl/Cmd+K */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== SEARCH_HOTKEY) return
      if (event.altKey) return

      const target = event.target as HTMLElement | null
      const tagName = target?.tagName
      const isTyping =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        target?.isContentEditable === true

      // K وحدها تكفي خارج حقول الكتابة؛ داخلها نشترط Ctrl/Cmd حتى لا نبتلع
      // حرف k الذي يكتبه المستخدم.
      if (isTyping && !(event.ctrlKey || event.metaKey)) return

      event.preventDefault()
      focusInput()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [focusInput])

  const runSearch = useCallback(() => {
    const check = validateSearch(query)
    if (!check.ok) {
      setError("البحث غير صالح — أحرف وأرقام ومسافات فقط، حتى 100 حرف.")
      return
    }
    const value = check.value.trim()
    // بحث فارغ: ننقل إلى صفحة البحث نفسها بدل طلب بلا معنى
    onNavigate?.()
    navigate(value ? `/search?q=${encodeURIComponent(value)}` : "/search")
  }, [navigate, onNavigate, query])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    runSearch()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter صراحةً: النموذج ليس فيه زر إرسال، ولا نترك الانتقال مرهوناً
    // بقاعدة «الإرسال الضمني» التي تختلف بين المتصفحات.
    if (event.key === "Enter") {
      event.preventDefault()
      runSearch()
      return
    }
    if (event.key === "Escape") {
      // Escape يفرّغ الحقل أولاً، ثم يرفع التركيز إن كان فارغاً
      if (query) {
        event.preventDefault()
        setQuery("")
        setError(null)
      } else {
        inputRef.current?.blur()
      }
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={`relative flex items-center ${className}`}
      aria-label="البحث في ميزان الرقمية"
    >
      <div
        className={`flex h-9 w-full items-center gap-2 rounded-full border bg-[#f8fafc] pr-1 pl-2 transition-colors dark:bg-[#1e293b] ${
          error
            ? "border-[#ef4444]/60"
            : "border-[#e2e8f0] focus-within:border-[#2563eb] dark:border-[#334155]"
        }`}
      >
        <div className="grid size-7 shrink-0 place-items-center rounded-full bg-[#2563eb] text-white">
          <Search className="size-4" />
        </div>

        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            if (error) setError(null)
          }}
          onKeyDown={handleKeyDown}
          placeholder="ابحث..."
          maxLength={INPUT_LIMITS.SEARCH_MAX}
          autoComplete="off"
          spellCheck={false}
          aria-label="ابحث في المقالات والأخبار والقاموس والكليات"
          aria-describedby={error ? "navbar-search-error" : undefined}
          className="min-w-0 flex-1 bg-transparent text-[13px] font-bold text-[#0f172a] outline-none placeholder:font-normal placeholder:text-[#94a3b8] dark:text-white [&::-webkit-search-cancel-button]:hidden"
        />

        {/* زر الاختصار — ينقر ليركّز الحقل، ويعرض الحرف للمستخدم */}
        <button
          type="button"
          onClick={focusInput}
          aria-label={`اضغط ${SEARCH_HOTKEY.toUpperCase()} للبحث`}
          title={`اختصار البحث: ${SEARCH_HOTKEY.toUpperCase()}`}
          className="grid h-6 shrink-0 place-items-center rounded-md border border-[#e2e8f0] bg-white px-1.5 text-[11px] font-black text-[#64748b] transition-colors hover:border-[#2563eb] hover:text-[#2563eb] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#94a3b8] dark:hover:border-[#60a5fa] dark:hover:text-[#60a5fa]"
        >
          <kbd className="font-sans">{SEARCH_HOTKEY.toUpperCase()}</kbd>
        </button>
      </div>

      {error && (
        <p
          id="navbar-search-error"
          role="alert"
          className="absolute right-3 top-full mt-1 text-[11px] font-bold text-[#ef4444]"
        >
          {error}
        </p>
      )}
    </form>
  )
}

export default NavbarSearch
