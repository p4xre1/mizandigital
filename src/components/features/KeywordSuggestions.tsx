import { useMemo, useState } from "react"
import { Search, Copy, Check, Plus, Sparkles, ListFilter } from "lucide-react"
import { CATEGORY_KEYWORDS, DEFAULT_KEYWORDS, type KeywordCategory } from "../../lib/seo/keywords"

interface KeywordSuggestionsProps {
  /** يُستدعى عند الضغط على "استخدام" — لجعل الكلمة هي الكلمة المفتاحية المستهدفة */
  onUseAsFocusKeyword?: (keyword: string) => void
  /** يُستدعى عند الضغط على "إدراج" — لإضافة الكلمة إلى قائمة كلمات مفتاحية إضافية */
  onInsertKeyword?: (keyword: string) => void
  /** الكلمات المُدرجة مسبقاً (لتعطيل زر الإدراج المكرر) */
  insertedKeywords?: string[]
}

const CATEGORY_LABELS: Record<KeywordCategory, string> = {
  general: "عام / تشريع",
  labor_law: "قانون الشغل",
  data_protection: "حماية المعطيات",
  consumer_protection: "حماية المستهلك",
  academic_exams: "امتحانات ومباريات",
  commercial_law: "القانون التجاري",
  legal_dictionary: "المعجم القانوني",
  educational_summaries: "ملخصات تعليمية",
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ")
}

/**
 * أداة اقتراح وحقن الكلمات المفتاحية (Keyword Research Tool)
 * تعتمد على بنك الكلمات المفتاحية القانونية المغربية المصنّف مسبقاً
 * في src/lib/seo/keywords.ts — بدون أي استدعاء خارجي، تعمل فوراً وبدون تكلفة.
 */
export default function KeywordSuggestions({
  onUseAsFocusKeyword,
  onInsertKeyword,
  insertedKeywords = [],
}: KeywordSuggestionsProps) {
  const [query, setQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<KeywordCategory | "all">("all")
  const [copiedKw, setCopiedKw] = useState<string | null>(null)

  const allEntries = useMemo(() => {
    const entries: { keyword: string; category: KeywordCategory | "general" }[] = []
    DEFAULT_KEYWORDS.forEach((kw) => entries.push({ keyword: kw, category: "general" }))
    ;(Object.keys(CATEGORY_KEYWORDS) as KeywordCategory[]).forEach((cat) => {
      CATEGORY_KEYWORDS[cat].forEach((kw) => entries.push({ keyword: kw, category: cat }))
    })
    // إزالة التكرار
    const seen = new Set<string>()
    return entries.filter((e) => {
      const key = e.keyword.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allEntries.filter((e) => {
      const matchesCategory = activeCategory === "all" || e.category === activeCategory
      const matchesQuery = !q || e.keyword.toLowerCase().includes(q)
      return matchesCategory && matchesQuery
    })
  }, [allEntries, query, activeCategory])

  const handleCopy = async (kw: string) => {
    try {
      await navigator.clipboard.writeText(kw)
      setCopiedKw(kw)
      setTimeout(() => setCopiedKw(null), 1500)
    } catch {
      // بيئة بدون صلاحية الحافظة — تجاهل بصمت
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm" dir="rtl">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Sparkles className="size-4 text-primary" />
        <h3 className="text-sm font-extrabold text-foreground">بنك الكلمات المفتاحية القانونية</h3>
      </div>

      {/* بحث */}
      <div className="relative">
        <Search className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن كلمة مفتاحية..."
          className="w-full rounded-xl border border-border bg-background py-2 pr-9 pl-3 text-xs text-foreground outline-none transition focus:border-primary"
        />
      </div>

      {/* تصفية حسب الفئة */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
          <ListFilter className="size-3" /> الفئة:
        </span>
        <button
          type="button"
          onClick={() => setActiveCategory("all")}
          className={cn(
            "rounded-lg px-2 py-0.5 text-[10px] font-bold transition",
            activeCategory === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
          )}
        >
          الكل
        </button>
        {(Object.keys(CATEGORY_LABELS) as KeywordCategory[]).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "rounded-lg px-2 py-0.5 text-[10px] font-bold transition",
              activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
            )}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* قائمة الكلمات */}
      <div className="max-h-64 space-y-1.5 overflow-y-auto pt-1">
        {filtered.length > 0 ? (
          filtered.map((entry) => {
            const already = insertedKeywords.includes(entry.keyword)
            return (
              <div
                key={entry.keyword}
                className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-1.5 text-xs"
              >
                <span className="truncate font-semibold text-foreground">{entry.keyword}</span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleCopy(entry.keyword)}
                    title="نسخ"
                    className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    {copiedKw === entry.keyword ? (
                      <Check className="size-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                  {onInsertKeyword && (
                    <button
                      type="button"
                      onClick={() => onInsertKeyword(entry.keyword)}
                      disabled={already}
                      title="إدراج ضمن كلمات المقال"
                      className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-primary/10 hover:text-primary disabled:opacity-30"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  )}
                  {onUseAsFocusKeyword && (
                    <button
                      type="button"
                      onClick={() => onUseAsFocusKeyword(entry.keyword)}
                      className="rounded-lg bg-muted px-2 py-1 text-[10px] font-bold text-foreground transition hover:bg-primary hover:text-primary-foreground"
                    >
                      استهداف
                    </button>
                  )}
                </div>
              </div>
            )
          })
        ) : (
          <div className="py-6 text-center text-xs text-muted-foreground">لا توجد نتائج مطابقة.</div>
        )}
      </div>
    </div>
  )
}
