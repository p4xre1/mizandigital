import { useMemo, useState } from "react"
import { Lightbulb, Copy, Check, Sparkles } from "lucide-react"
import { normalizeArabic } from "../../lib/utils/search"
import { CATEGORY_KEYWORDS, type KeywordCategory } from "../../lib/seo/keywords"

interface KeywordSuggestionsProps {
  title: string
  content: string
  onSelectKeyword?: (keyword: string) => void
}

const ARABIC_STOPWORDS = new Set([
  "من", "الى", "إلى", "في", "على", "عن", "مع", "هذا", "هذه", "ذلك", "التي",
  "الذي", "و", "أو", "او", "ثم", "كما", "قد", "لا", "لم", "لن", "ما", "هو",
  "هي", "كل", "بين", "عند", "بعد", "قبل", "غير", "دون", "إذا", "اذا", "كان",
  "كانت", "يكون", "أن", "ان", "إن", "التي", "الذين", "كانوا", "يجب", "حيث",
])

// يستخرج أكثر العبارات (كلمتين إلى ثلاث كلمات) تكراراً في النص — مرشّحة
// لتكون كلمات مفتاحية طبيعية لأنها تعكس فعلياً ما يتحدث عنه المقال
function extractPhraseSuggestions(text: string, limit: number = 8): { phrase: string; count: number }[] {
  const cleaned = text
    .replace(/[#*_>`\[\]()]/g, " ")
    .replace(/[^\u0600-\u06FF\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  const words = cleaned.split(" ").filter((w) => w.length >= 2 && !ARABIC_STOPWORDS.has(normalizeArabic(w)))

  const phraseCounts = new Map<string, number>()

  for (let n = 2; n <= 3; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      const phrase = words.slice(i, i + n).join(" ")
      if (phrase.length < 6) continue
      phraseCounts.set(phrase, (phraseCounts.get(phrase) || 0) + 1)
    }
  }

  return Array.from(phraseCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([phrase, count]) => ({ phrase, count }))
}

// يقترح فئة الكلمات المفتاحية القانونية الأنسب اعتماداً على تطابق العنوان
// مع الكلمات المعروفة لكل فئة في بنك الكلمات المفتاحية المُعدّ مسبقاً
function suggestBankCategory(title: string): KeywordCategory {
  const normalizedTitle = normalizeArabic(title)
  let bestCategory: KeywordCategory = "general"
  let bestScore = 0

  ;(Object.keys(CATEGORY_KEYWORDS) as KeywordCategory[]).forEach((cat) => {
    const score = CATEGORY_KEYWORDS[cat].filter((kw) =>
      normalizedTitle.includes(normalizeArabic(kw.split(" ")[0]))
    ).length
    if (score > bestScore) {
      bestScore = score
      bestCategory = cat
    }
  })

  return bestCategory
}

const CATEGORY_LABELS: Record<KeywordCategory, string> = {
  general: "عام",
  labor_law: "قانون الشغل",
  data_protection: "حماية المعطيات",
  consumer_protection: "حماية المستهلك",
  academic_exams: "الامتحانات الجامعية",
  commercial_law: "القانون التجاري",
  legal_dictionary: "المعجم القانوني",
  educational_summaries: "الملخصات الدراسية",
}

export function KeywordSuggestions({ title, content, onSelectKeyword }: KeywordSuggestionsProps) {
  const [copied, setCopied] = useState<string | null>(null)

  const phraseSuggestions = useMemo(() => extractPhraseSuggestions(content), [content])
  const bankCategory = useMemo(() => suggestBankCategory(title), [title])
  const bankSuggestions = useMemo(
    () => (CATEGORY_KEYWORDS[bankCategory] || []).slice(0, 6),
    [bankCategory]
  )

  const handleCopy = (kw: string) => {
    navigator.clipboard?.writeText(kw).catch(() => {})
    setCopied(kw)
    setTimeout(() => setCopied(null), 1500)
  }

  if (!title && !content) return null

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm" dir="rtl">
      <div className="flex items-center gap-2.5 border-b border-border pb-3">
        <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
          <Lightbulb className="size-4.5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">اقتراحات الكلمات المفتاحية</h3>
          <p className="text-[11px] text-muted-foreground">مستخرجة من النص + بنك كلمات قانوني مصنّف</p>
        </div>
      </div>

      {phraseSuggestions.length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            عبارات متكررة في النص (مرشّحة كأفضل كلمة مفتاحية)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {phraseSuggestions.map(({ phrase, count }) => (
              <button
                key={phrase}
                type="button"
                onClick={() => (onSelectKeyword ? onSelectKeyword(phrase) : handleCopy(phrase))}
                className="group inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition hover:border-primary hover:bg-primary/5 hover:text-primary"
                title={onSelectKeyword ? "استخدم ككلمة مفتاحية رئيسية" : "نسخ"}
              >
                {onSelectKeyword ? null : copied === phrase ? (
                  <Check className="size-3 text-emerald-500" />
                ) : (
                  <Copy className="size-3 opacity-0 transition group-hover:opacity-100" />
                )}
                <span>{phrase}</span>
                <span className="rounded bg-primary/10 px-1 text-[9px] font-bold text-primary">×{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" />
          كلمات مقترحة من فئة «{CATEGORY_LABELS[bankCategory]}»
        </p>
        <div className="flex flex-wrap gap-1.5">
          {bankSuggestions.map((kw) => (
            <button
              key={kw}
              type="button"
              onClick={() => (onSelectKeyword ? onSelectKeyword(kw) : handleCopy(kw))}
              className="group inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition hover:border-primary hover:bg-primary/5 hover:text-primary"
              title={onSelectKeyword ? "استخدم ككلمة مفتاحية رئيسية" : "نسخ"}
            >
              {onSelectKeyword ? null : copied === kw ? (
                <Check className="size-3 text-emerald-500" />
              ) : (
                <Copy className="size-3 opacity-0 transition group-hover:opacity-100" />
              )}
              <span>{kw}</span>
            </button>
          ))}
        </div>
      </div>

      {phraseSuggestions.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          أضف مزيداً من المحتوى ليتمكن الأداة من استخراج عبارات متكررة تلقائياً.
        </p>
      )}
    </div>
  )
}

export default KeywordSuggestions
