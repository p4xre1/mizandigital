import { useState } from "react"
import { Image as ImageIcon, X } from "lucide-react"

interface ImageInsertDialogProps {
  onClose: () => void
  onInsert: (markdown: string) => void
}

/**
 * أداة إدراج الصور داخل محرر النصوص، بحقل نص بديل (Alt Text) إلزامي حتى
 * تُفهرس الصور بشكل سليم فـ محركات البحث (Google Images)، بدل الاعتماد على
 * window.prompt() القديمة.
 */
export function ImageInsertDialog({ onClose, onInsert }: ImageInsertDialogProps) {
  const [url, setUrl] = useState("https://")
  const [alt, setAlt] = useState("")
  const [caption, setCaption] = useState("")

  const canInsert = url.trim() !== "" && url.trim() !== "https://" && alt.trim() !== ""

  const handleConfirm = () => {
    if (!canInsert) return
    const safeAlt = alt.trim().replace(/[\[\]]/g, "")
    const safeCaption = caption.trim().replace(/"/g, "'")
    const markdown = safeCaption
      ? `![${safeAlt}](${url.trim()} "${safeCaption}")`
      : `![${safeAlt}](${url.trim()})`
    onInsert(markdown)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
            <ImageIcon className="size-4 text-primary" />
            إدراج صورة
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">رابط الصورة (URL) *</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              dir="ltr"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              النص البديل (Alt Text) *
              <span className="mr-1 font-normal text-muted-foreground/70">— ضروري لفهرسة الصورة فـ نتائج البحث</span>
            </label>
            <input
              type="text"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="وصف مختصر ودقيق لمحتوى الصورة..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">تعليق أسفل الصورة (اختياري)</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="مثال: مصدر الصورة أو توضيح إضافي..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canInsert}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            إدراج الصورة
          </button>
        </div>
      </div>
    </div>
  )
}
