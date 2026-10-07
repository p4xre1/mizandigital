import { useCallback, useId, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search, X } from "lucide-react"
import { INPUT_LIMITS, getInputErrorMessage, validateSearch } from "@/lib/security/inputGuard"

/**
 * بحث قائمة البرغر — نقطة البحث الوحيدة في الموبايل واللوحي.
 * -----------------------------------------------------------------------
 * حلّ محلّ حقل الشريط العلوي القديم (NavbarSearch):
 *   1) الحقل نزل من الشريط إلى داخل قائمة البرغر، فلم يبقَ في الشريط
 *      إلا أيقونة تنقل إلى /search على الشاشات الكبيرة.
 *   2) أُزيل اختصار الحرف K تماماً: لا مستمع keydown عام، ولا شارة <kbd>،
 *      لأن المستمع كان يبتلع الحرف في كل الصفحات.
 *   3) أُضيف زر تفريغ (X) لأن لوحات المفاتيح في الهاتف لا Escape فيها.
 *
 * Enter ينقل إلى /search?q=… بعد المرور عبر validateSearch (نفس دالة صفحة
 * البحث)، والبحث الفارغ ينقل إلى /search وحدها بدل طلب بلا معنى.
 */

interface MenuSearchProps {
  className?: string
  /** يُنادى بعد الانتقال (نقفل قائمة البرغر). */
  onNavigate?: () => void
}

export function MenuSearch({ className = "", onNavigate }: MenuSearchProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const inputId = useId()
  const errorId = useId()
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)

  const runSearch = useCallback(() => {
    const check = validateSearch(query)
    if (!check.ok) {
      setError(
        getInputErrorMessage(check.error) ||
          `البحث غير صالح — أحرف وأرقام ومسافات فقط، حتى ${INPUT_LIMITS.SEARCH_MAX} حرف.`
      )
      return
    }
    const value = check.value.trim()
    onNavigate?.()
    navigate(value ? `/search?q=${encodeURIComponent(value)}` : "/search")
  }, [navigate, onNavigate, query])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    runSearch()
  }

  const clear = () => {
    setQuery("")
    setError(null)
    inputRef.current?.focus()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter صراحةً: لا نترك الانتقال مرهوناً بقاعدة «الإرسال الضمني»
    // التي تختلف بين المتصفحات.
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
      className={`relative flex flex-col items-stretch ${className}`}
      aria-label="البحث في ميزان الرقمية"
    >
      <label htmlFor={inputId} className="sr-only">
        ابحث في المقالات والأخبار والقاموس والكليات
      </label>

      <div
        className={`flex h-10 w-full items-center gap-2 rounded-xl border bg-[#f8fafc] pr-1.5 pl-2 transition-colors dark:bg-[#0f172a]/40 ${
          error
            ? "border-[#ef4444]/60"
            : "border-[#e2e8f0] focus-within:border-[#2563eb] dark:border-[#334155] dark:focus-within:border-[#60a5fa]"
        }`}
      >
        <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#2563eb] text-white">
          <Search className="size-4" aria-hidden="true" />
        </div>

        <input
          ref={inputRef}
          id={inputId}
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
          aria-describedby={error ? errorId : undefined}
          className="min-w-0 flex-1 bg-transparent text-[13px] font-bold text-[#0f172a] outline-none placeholder:font-normal placeholder:text-[#94a3b8] dark:text-white [&::-webkit-search-cancel-button]:hidden"
        />

        {query && (
          <button
            type="button"
            onClick={clear}
            aria-label="تفريغ البحث"
            className="grid size-7 shrink-0 place-items-center rounded-lg text-[#64748b] transition-colors hover:bg-[#f1f5f9] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:bg-[#334155] dark:hover:text-white"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {error && (
        <p id={errorId} role="alert" className="mt-1.5 pr-1 text-[11px] font-bold text-[#ef4444]">
          {error}
        </p>
      )}
    </form>
  )
}

export default MenuSearch
