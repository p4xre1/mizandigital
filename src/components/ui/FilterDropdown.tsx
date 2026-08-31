import { useEffect, useRef, useState } from "react"
import { ChevronDown, Check } from "lucide-react"

export interface FilterDropdownOption {
  value: string
  label: string
  count?: number
}

interface FilterDropdownProps {
  value: string
  onChange: (value: string) => void
  allLabel: string
  allValue?: string
  allCount?: number
  options: FilterDropdownOption[]
  icon?: React.ReactNode
  className?: string
}

/**
 * قائمة منسدلة لاختيار فئة/تصنيف واحد من عدة خيارات، بديل عن صف أزرار
 * قابل للتمرير الأفقي (الذي كان يجعل الخيارات متلاصقة وصعبة القراءة).
 */
export function FilterDropdown({
  value,
  onChange,
  allLabel,
  allValue = "all",
  allCount,
  options,
  icon,
  className = "",
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleKey)
    }
  }, [open])

  const selectedLabel =
    value === allValue
      ? `${allLabel}${allCount !== undefined ? ` (${allCount})` : ""}`
      : options.find((o) => o.value === value)?.label || allLabel

  return (
    <div ref={ref} className={`relative w-full ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-muted px-4 py-3 text-sm font-bold text-foreground transition hover:bg-muted/80 min-h-[44px]"
      >
        <span className="flex items-center gap-2 truncate">
          {icon}
          <span className="truncate">{selectedLabel}</span>
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-lg"
        >
          <button
            type="button"
            role="option"
            aria-selected={value === allValue}
            onClick={() => {
              onChange(allValue)
              setOpen(false)
            }}
            className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-right text-sm font-bold transition ${
              value === allValue ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
            }`}
          >
            <span>
              {allLabel}
              {allCount !== undefined && <span className="text-muted-foreground font-semibold"> ({allCount})</span>}
            </span>
            {value === allValue && <Check size={16} />}
          </button>

          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={value === opt.value}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-right text-sm font-semibold transition ${
                value === opt.value ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
              }`}
            >
              <span className="truncate">
                {opt.label}
                {opt.count !== undefined && <span className="text-muted-foreground font-medium"> ({opt.count})</span>}
              </span>
              {value === opt.value && <Check size={16} className="shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default FilterDropdown
