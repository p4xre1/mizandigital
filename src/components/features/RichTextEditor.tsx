import React, { useState, useRef, useCallback, useMemo } from "react"
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Eye,
  Edit3,
  Quote,
  Code,
  Image as ImageIcon,
  Minus,
  Table,
  FileText,
  Clock,
} from "lucide-react"
import { parseArticleMarkdown } from "../../lib/content/parseArticleMarkdown"
import { ArticleContent } from "../articles/ArticleContent"

interface RichTextEditorProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  label?: string
  minHeight?: string
  disabled?: boolean
  id?: string
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ")
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "اكتب المحتوى النصي هنا بأسلوب Markdown...",
  label,
  minHeight = "280px",
  disabled = false,
  id,
}: RichTextEditorProps) {
  const [isPreview, setIsPreview] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // إدراج التنسيقات النصية بناءً على تحديد النص الحاضر
  const insertFormatting = useCallback(
    (prefix: string, suffix: string = "", defaultText: string = "نص") => {
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selectedText = value.substring(start, end) || defaultText
      const replacement = `${prefix}${selectedText}${suffix}`

      const newValue = value.substring(0, start) + replacement + value.substring(end)
      onChange(newValue)

      // إعادة التركيز وتحديد النص داخل التنسيق
      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(
          start + prefix.length,
          start + prefix.length + selectedText.length
        )
      })
    },
    [value, onChange]
  )

  // إدراج رابط إلكتروني
  const handleInsertLink = () => {
    const url = prompt("أدخل الرابط الإلكتروني (URL):", "https://")
    if (url && url !== "https://") {
      insertFormatting("[", `](${url})`, "عنوان الرابط")
    }
  }

  // إدراج صورة
  const handleInsertImage = () => {
    const url = prompt("أدخل رابط الصورة (URL):", "https://")
    if (url && url !== "https://") {
      const altText = prompt("وصف الصورة (Alt Text):", "وصف الصورة") || "صورة"
      insertFormatting(`![${altText}](`, `)`, url)
    }
  }

  // إدراج جدول
  const handleInsertTable = () => {
    const tableTemplate =
      "\n| العنوان 1 | العنوان 2 |\n| --------- | --------- |\n| عنصر 1   | عنصر 2   |\n"
    insertFormatting(tableTemplate, "", "")
  }

  // معالجة اختصارات لوحة المفاتيح
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "b" || e.key === "B") {
        e.preventDefault()
        insertFormatting("**", "**")
      } else if (e.key === "i" || e.key === "I") {
        e.preventDefault()
        insertFormatting("*", "*")
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault()
        handleInsertLink()
      }
    }
  }

  // إحصائيات النص
  const stats = useMemo(() => {
    const charCount = value.length
    const trimmed = value.trim()
    const wordCount = trimmed ? trimmed.split(/\s+/).length : 0
    const readingTime = Math.max(1, Math.ceil(wordCount / 180)) // معدل قراءة 180 كلمة/دقيقة

    return { charCount, wordCount, readingTime }
  }, [value])

  // تحليل المحتوى لعرضه بنفس شكله النهائي في صفحة المقال (عناوين، صور، فقرات...)
  const previewParsed = useMemo(() => parseArticleMarkdown(value), [value])

  const toolbarButtons = [
    { icon: Bold, title: "عريض (Ctrl+B)", action: () => insertFormatting("**", "**") },
    { icon: Italic, title: "مائل (Ctrl+I)", action: () => insertFormatting("*", "*") },
    { icon: Heading1, title: "عنوان رئيسي (H1)", action: () => insertFormatting("\n# ", "", "عنوان رئيسي") },
    { icon: Heading2, title: "عنوان فرعي (H2)", action: () => insertFormatting("\n## ", "", "عنوان فرعي") },
    { icon: Heading3, title: "عنوان جزئي (H3)", action: () => insertFormatting("\n### ", "", "عنوان جزئي") },
    { icon: List, title: "قائمة نقطية", action: () => insertFormatting("\n* ", "", "عنصر القائمة") },
    { icon: ListOrdered, title: "قائمة رقمية", action: () => insertFormatting("\n1. ", "", "عنصر رقمي") },
    { icon: Quote, title: "اقتباس قانوني", action: () => insertFormatting("\n> ", "", "نص الاقتباس...") },
    { icon: Code, title: "كود برمجي", action: () => insertFormatting("`", "`", "code") },
    { icon: LinkIcon, title: "إدراج رابط (Ctrl+K)", action: handleInsertLink },
    { icon: ImageIcon, title: "إدراج صورة", action: handleInsertImage },
    { icon: Table, title: "إدراج جدول", action: handleInsertTable },
    { icon: Minus, title: "فاصل أفقي", action: () => insertFormatting("\n\n---\n\n", "", "") },
  ]

  return (
    <div className="space-y-1.5" dir="rtl">
      {/* الترويسة والعدادات */}
      {label && (
        <div className="flex items-center justify-between px-0.5">
          <label htmlFor={id} className="block text-xs font-bold text-foreground">
            {label}
          </label>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="size-3" />
              {stats.wordCount} كلمة ({stats.charCount} حرف)
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              ~{stats.readingTime} د قراءة
            </span>
          </div>
        </div>
      )}

      {/* صندوق المحرر الرئيسي */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
        {/* شريط الأدوات */}
        <div className="flex flex-wrap items-center justify-between gap-1 border-b border-border bg-muted/30 px-3 py-1.5">
          <div className="flex flex-wrap items-center gap-0.5">
            {toolbarButtons.map((btn, i) => {
              const Icon = btn.icon
              return (
                <button
                  key={i}
                  type="button"
                  onClick={btn.action}
                  disabled={isPreview || disabled}
                  title={btn.title}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30"
                >
                  <Icon className="size-4" />
                </button>
              )
            })}
          </div>

          {/* تبديل التحرير المعاينة */}
          <div className="flex items-center gap-1 border-r border-border pr-2">
            <button
              type="button"
              onClick={() => setIsPreview(!isPreview)}
              disabled={disabled}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
                isPreview
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {isPreview ? <Edit3 className="size-3.5" /> : <Eye className="size-3.5" />}
              <span>{isPreview ? "تحرير النص" : "معاينة المحتوى"}</span>
            </button>
          </div>
        </div>

        {/* حقل الإدخال أو وضع المعاينة */}
        {isPreview ? (
          <div
            className="prose dark:prose-invert max-w-none p-4 text-xs leading-relaxed text-foreground sm:text-sm"
            style={{ minHeight }}
          >
            {value ? (
              <ArticleContent blocks={previewParsed.blocks} />
            ) : (
              <p className="text-xs italic text-muted-foreground">لا يوجد محتوى للمعاينة حالياً...</p>
            )}
          </div>
        ) : (
          <textarea
            id={id}
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            style={{ minHeight }}
            className="w-full resize-y bg-transparent p-4 font-mono text-xs leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50 sm:text-sm disabled:cursor-not-allowed disabled:opacity-50"
          />
        )}
      </div>
    </div>
  )
}