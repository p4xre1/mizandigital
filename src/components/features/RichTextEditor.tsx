import React, { useState, useRef, useCallback, useMemo, useEffect } from "react"
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
  Search,
  Globe,
  X,
  Loader2,
} from "lucide-react"
import { parseArticleMarkdown } from "../../lib/content/parseArticleMarkdown"
import { ArticleContent } from "../articles/ArticleContent"
import { supabase } from "../../lib/supabase/client"

// نتيجة بحث داخلي (مقال أو خبر) صالحة للربط الداخلي بين المحتويات
interface InternalLinkResult {
  id: string
  title: string
  slug: string
  kind: "article" | "news"
}

// نافذة إدراج رابط: تدعم البحث عن روابط داخلية (مقالات/أخبار منشورة) أو
// إدخال رابط خارجي يدوياً، لتحل محل window.prompt غير الاحترافي.
function LinkInsertDialog({
  onInsert,
  onClose,
}: {
  onInsert: (url: string, label: string) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<"internal" | "external">("internal")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<InternalLinkResult[]>([])
  const [searching, setSearching] = useState(false)
  const [externalUrl, setExternalUrl] = useState("https://")
  const [externalLabel, setExternalLabel] = useState("")

  useEffect(() => {
    if (tab !== "internal") return
    let active = true
    setSearching(true)
    const timeout = setTimeout(async () => {
      try {
        const [articlesRes, newsRes] = await Promise.all([
          supabase
            .from("articles")
            .select("id, title, slug")
            .eq("status", "published")
            .ilike("title", `%${query}%`)
            .limit(6),
          supabase
            .from("news")
            .select("id, title, slug")
            .eq("is_published", true)
            .ilike("title", `%${query}%`)
            .limit(6),
        ])
        if (!active) return
        const merged: InternalLinkResult[] = [
          ...((articlesRes.data as any[]) || []).map((a) => ({ ...a, kind: "article" as const })),
          ...((newsRes.data as any[]) || []).map((n) => ({ ...n, kind: "news" as const })),
        ]
        setResults(merged)
      } catch (err) {
        console.error("خطأ أثناء البحث عن روابط داخلية:", err)
      } finally {
        if (active) setSearching(false)
      }
    }, 300)
    return () => {
      active = false
      clearTimeout(timeout)
    }
  }, [query, tab])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-foreground">إدراج رابط</h3>
          <button type="button" onClick={onClose} className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>

        <div className="mb-3 flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setTab("internal")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition",
              tab === "internal" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Search className="size-3" /> رابط داخلي
          </button>
          <button
            type="button"
            onClick={() => setTab("external")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition",
              tab === "external" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Globe className="size-3" /> رابط خارجي
          </button>
        </div>

        {tab === "internal" ? (
          <div className="space-y-2">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن مقال أو خبر منشور..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
            />
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {searching && (
                <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" /> جارٍ البحث...
                </div>
              )}
              {!searching && results.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">لا توجد نتائج مطابقة.</p>
              )}
              {!searching &&
                results.map((r) => (
                  <button
                    key={`${r.kind}-${r.id}`}
                    type="button"
                    onClick={() => onInsert(`/${r.kind === "article" ? "articles" : "news"}/${r.slug}`, r.title)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-right text-xs font-semibold text-foreground transition hover:border-primary hover:bg-muted"
                  >
                    <span className="truncate">{r.title}</span>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                      {r.kind === "article" ? "مقال" : "خبر"}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              autoFocus
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://example.com"
              dir="ltr"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-left text-xs text-foreground outline-none focus:border-primary"
            />
            <input
              type="text"
              value={externalLabel}
              onChange={(e) => setExternalLabel(e.target.value)}
              placeholder="نص الرابط المعروض (اختياري)"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => {
                if (externalUrl && externalUrl !== "https://") {
                  onInsert(externalUrl, externalLabel || "رابط خارجي")
                }
              }}
              className="w-full rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition hover:brightness-110"
            >
              إدراج الرابط
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// نافذة إدراج صورة مع نص بديل إلزامي لضمان الالتزام بمعايير السيو وإمكانية الوصول
function ImageInsertDialog({
  onInsert,
  onClose,
}: {
  onInsert: (url: string, alt: string) => void
  onClose: () => void
}) {
  const [url, setUrl] = useState("https://")
  const [alt, setAlt] = useState("")

  const canInsert = url && url !== "https://" && alt.trim().length > 0

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-foreground">إدراج صورة</h3>
          <button type="button" onClick={onClose} className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-2">
          <input
            type="text"
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            dir="ltr"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-left text-xs text-foreground outline-none focus:border-primary"
          />
          <input
            type="text"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="النص البديل للصورة (مطلوب لمحركات البحث) *"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
          />
          {!alt.trim() && (
            <p className="text-[11px] text-amber-600">النص البديل مطلوب لضمان فهرسة الصورة بشكل صحيح في محركات البحث.</p>
          )}
          <button
            type="button"
            disabled={!canInsert}
            onClick={() => canInsert && onInsert(url, alt.trim())}
            className="w-full rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            إدراج الصورة
          </button>
        </div>
      </div>
    </div>
  )
}

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
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
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

  // إدراج رابط إلكتروني (داخلي أو خارجي) عبر نافذة إدراج الروابط
  const handleInsertLink = () => setLinkDialogOpen(true)

  const handleLinkInsert = (url: string, label: string) => {
    insertFormatting("[", `](${url})`, label || "عنوان الرابط")
    setLinkDialogOpen(false)
  }

  // إدراج صورة عبر نافذة مخصصة تفرض نصاً بديلاً (Alt Text) لدواعي السيو
  const handleInsertImage = () => setImageDialogOpen(true)

  const handleImageInsert = (url: string, alt: string) => {
    insertFormatting(`![${alt}](`, `)`, url)
    setImageDialogOpen(false)
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
              <ArticleContent blocks={previewParsed.blocks} disableAds />
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

      {linkDialogOpen && <LinkInsertDialog onInsert={handleLinkInsert} onClose={() => setLinkDialogOpen(false)} />}
      {imageDialogOpen && <ImageInsertDialog onInsert={handleImageInsert} onClose={() => setImageDialogOpen(false)} />}
    </div>
  )
}