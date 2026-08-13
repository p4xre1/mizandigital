import { useMemo } from "react"
import { CheckCircle2, AlertTriangle, XCircle, Search, Gauge } from "lucide-react"

interface SeoAuditWidgetProps {
  title: string
  description: string
  content: string
  slug?: string
  focusKeyword?: string
}

interface AuditRule {
  id: string
  label: string
  status: "pass" | "warn" | "fail"
  message: string
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ")
}

export default function SeoAuditWidget({
  title,
  description,
  content,
  slug = "",
  focusKeyword = "",
}: SeoAuditWidgetProps) {
  const audit = useMemo(() => {
    const rules: AuditRule[] = []
    const kw = focusKeyword.trim().toLowerCase()

    // 1. طول العنوان
    if (title.length >= 30 && title.length <= 60) {
      rules.push({ id: "title-len", label: "طول العنوان المقالي", status: "pass", message: "طول العنوان مثالي لمظاهر البحث (30-60 حرف)." })
    } else if (title.length > 0) {
      rules.push({ id: "title-len", label: "طول العنوان المقالي", status: "warn", message: "يفضل أن يكون العنوان بين 30 و 60 حرفاً." })
    } else {
      rules.push({ id: "title-len", label: "طول العنوان المقالي", status: "fail", message: "العنوان مفقود." })
    }

    // 2. الميتا الوصف
    if (description.length >= 120 && description.length <= 160) {
      rules.push({ id: "desc-len", label: "وصف الميتا (Meta Description)", status: "pass", message: "طول الوصف مثالي لمحركات البحث." })
    } else if (description.length > 0) {
      rules.push({ id: "desc-len", label: "وصف الميتا (Meta Description)", status: "warn", message: "يفضل أن يتراوح الوصف بين 120 و 160 حرفاً." })
    } else {
      rules.push({ id: "desc-len", label: "وصف الميتا (Meta Description)", status: "fail", message: "وصف الميتا غير محدد." })
    }

    // 3. طول المحتوى
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length
    if (wordCount >= 300) {
      rules.push({ id: "content-len", label: "طول النص والمحتوى", status: "pass", message: `المقال يحتوي على ${wordCount} كلمة (ممتاز).` })
    } else if (wordCount >= 100) {
      rules.push({ id: "content-len", label: "طول النص والمحتوى", status: "warn", message: `المقال قصير نسبياً (${wordCount} كلمة). ينصح بـ 300+ كلمة.` })
    } else {
      rules.push({ id: "content-len", label: "طول النص والمحتوى", status: "fail", message: "المحتوى قصير جداً أو مفقود." })
    }

    // 4. الكلمة المفتاحية
    if (kw) {
      const inTitle = title.toLowerCase().includes(kw)
      const inDesc = description.toLowerCase().includes(kw)

      if (inTitle && inDesc) {
        rules.push({ id: "kw-presence", label: "الكلمة المفتاحية المستهدفة", status: "pass", message: "الكلمة المفتاحية متواجدة في العنوان والوصف." })
      } else if (inTitle || inDesc) {
        rules.push({ id: "kw-presence", label: "الكلمة المفتاحية المستهدفة", status: "warn", message: "الكلمة المفتاحية موجودة إما في العنوان أو الوصف فقط." })
      } else {
        rules.push({ id: "kw-presence", label: "الكلمة المفتاحية المستهدفة", status: "fail", message: "الكلمة المفتاحية غير موجودة في العنوان أو الوصف." })
      }
    }

    // حساب النتيجة الكلية
    const passCount = rules.filter((r) => r.status === "pass").length
    const score = Math.round((passCount / rules.length) * 100) || 0

    return { rules, score }
  }, [title, description, content, slug, focusKeyword])

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
    if (score >= 50) return "text-amber-500 bg-amber-500/10 border-amber-500/20"
    return "text-rose-500 bg-rose-500/10 border-rose-500/20"
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4" dir="rtl">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Gauge className="size-5 text-primary" />
          <h3 className="font-bold text-foreground">تدقيق السيو (SEO Audit)</h3>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-3 py-1 text-xs font-black",
            getScoreColor(audit.score)
          )}
        >
          {audit.score} / 100
        </span>
      </div>

      {/* معاينة نتيجة محرك البحث */}
      <div className="rounded-lg bg-muted/50 p-3 space-y-1">
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Search className="size-3" /> معاينة المحرك Google
        </span>
        <div className="truncate text-sm font-bold text-blue-600 dark:text-blue-400">
          {title || "عنوان المقال سيظهر هنا"}
        </div>
        <div className="truncate text-[11px] text-emerald-700 dark:text-emerald-400" dir="ltr">
          https://mizan.ma/articles/{slug || "example-slug"}
        </div>
        <div className="line-clamp-2 text-xs text-muted-foreground">
          {description || "وصف المقال الذي يظهر في نتائج البحث سيظهر هنا..."}
        </div>
      </div>

      {/* قائمة الفحوصات */}
      <div className="space-y-2">
        {audit.rules.map((rule) => (
          <div key={rule.id} className="flex items-start gap-2.5 text-xs">
            {rule.status === "pass" && <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />}
            {rule.status === "warn" && <AlertTriangle className="size-4 shrink-0 text-amber-500" />}
            {rule.status === "fail" && <XCircle className="size-4 shrink-0 text-rose-500" />}
            <div>
              <span className="font-bold text-foreground">{rule.label}: </span>
              <span className="text-muted-foreground">{rule.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}