import { useState } from "react"
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Link as LinkIcon,
  Eye,
  Edit3,
  AlignRight,
  AlignCenter,
  AlignLeft,
  Quote,
  Code,
} from "lucide-react"

interface RichTextEditorProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  label?: string
  minHeight?: string
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ")
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "اكتب المحتوى النصي هنا...",
  label,
  minHeight = "260px",
}: RichTextEditorProps) {
  const [isPreview, setIsPreview] = useState(false)

  const insertFormatting = (prefix: string, suffix: string = "") => {
    const textarea = document.getElementById("rich-textarea") as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end) || "نص"
    const replacement = `${prefix}${selectedText}${suffix}`

    const newValue = value.substring(0, start) + replacement + value.substring(end)
    onChange(newValue)

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length)
    }, 0)
  }

  const toolbarButtons = [
    { icon: Bold, title: "عريض", action: () => insertFormatting("**", "**") },
    { icon: Italic, title: "مائل", action: () => insertFormatting("*", "*") },
    { icon: Heading1, title: "عنوان رئيسي", action: () => insertFormatting("\n# ") },
    { icon: Heading2, title: "عنوان فرعي", action: () => insertFormatting("\n## ") },
    { icon: List, title: "قائمة نقطية", action: () => insertFormatting("\n* ") },
    { icon: ListOrdered, title: "قائمة رقمية", action: () => insertFormatting("\n1. ") },
    { icon: Quote, title: "اقتباس", action: () => insertFormatting("\n> ") },
    { icon: Code, title: "كود", action: () => insertFormatting("`", "`") },
    {
      icon: LinkIcon,
      title: "رابط",
      action: () => {
        const url = prompt("أدخل الرابط الإلكتروني:")
        if (url) insertFormatting("[", `](${url})`)
      },
    },
  ]

  return (
    <div className="space-y-1.5" dir="rtl">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-muted-foreground">{label}</label>
          <span className="text-[10px] text-muted-foreground">{value.length} حرف</span>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-focus-within focus-within:border-primary">
        {/* شريط الأدوات */}
        <div className="flex flex-wrap items-center justify-between gap-1 border-b border-border bg-muted/40 px-3 py-2">
          <div className="flex flex-wrap items-center gap-1">
            {toolbarButtons.map((btn, i) => {
              const Icon = btn.icon
              return (
                <button
                  key={i}
                  type="button"
                  onClick={btn.action}
                  disabled={isPreview}
                  title={btn.title}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
                >
                  <Icon className="size-4" />
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-1 border-r border-border pr-2">
            <button
              type="button"
              onClick={() => setIsPreview(!isPreview)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition",
                isPreview
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              {isPreview ? <Edit3 className="size-3.5" /> : <Eye className="size-3.5" />}
              {isPreview ? "تحرير" : "معاينة"}
            </button>
          </div>
        </div>

        {/* حقل الإدخال أو المعاينة */}
        {isPreview ? (
          <div
            className="prose dark:prose-invert max-w-none p-4 text-sm text-foreground"
            style={{ minHeight }}
          >
            {value ? (
              <div className="whitespace-pre-wrap">{value}</div>
            ) : (
              <p className="text-xs italic text-muted-foreground">لا يوجد محتوى للمعاينة...</p>
            )}
          </div>
        ) : (
          <textarea
            id="rich-textarea"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            style={{ minHeight }}
            className="w-full resize-y bg-transparent p-4 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
          />
        )}
      </div>
    </div>
  )
}