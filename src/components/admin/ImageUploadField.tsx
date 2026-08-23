import React, { useState } from "react"
import { ImageIcon, Link as LinkIcon, UploadCloud, X, Loader2 } from "lucide-react"
import { storageService } from "../../services/storageService"

interface ImageUploadFieldProps {
  label: string
  value: string
  onChange: (url: string) => void
  helperText?: string
  folder?: string // مجلد التخزين داخل R2 (اختياري)
}

// حقل صورة اختياري تماماً (لا required في أي مكان) يدعم طريقتين لإضافة
// الصورة: رفع ملف مباشرة إلى مستودع R2، أو لصق رابط جاهز. يُستخدم في نماذج
// المقالات والأخبار والكليات والندوات بلوحة التحكم.
export function ImageUploadField({ label, value, onChange, helperText, folder = "images" }: ImageUploadFieldProps) {
  const [mode, setMode] = useState<"link" | "upload">(value ? "link" : "link")
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    try {
      const { uploadUrl, fileUrl } = await storageService.getUploadUrl(file, folder)
      await storageService.uploadToPresignedUrl(uploadUrl, file)
      onChange(fileUrl)
    } catch (err: any) {
      console.error("خطأ أثناء رفع الصورة:", err)
      setError("تعذر رفع الصورة. تحقّق من الاتصال وأعد المحاولة.")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <ImageIcon className="size-3.5" /> {label}
        <span className="font-normal text-muted-foreground/70">(اختياري)</span>
      </label>

      <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setMode("link")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
            mode === "link" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LinkIcon className="size-3" />
          رابط صورة
        </button>
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
            mode === "upload" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <UploadCloud className="size-3" />
          رفع صورة
        </button>
      </div>

      {mode === "link" ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          dir="ltr"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-left text-xs text-foreground outline-none focus:border-primary"
        />
      ) : (
        <div className="flex items-center gap-2">
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-3 py-2.5 text-xs font-semibold text-muted-foreground transition hover:border-primary hover:text-primary">
            {uploading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> جاري الرفع...
              </>
            ) : (
              <>
                <UploadCloud className="size-3.5" /> اختر صورة من جهازك
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
          </label>
        </div>
      )}

      {error && <p className="text-[11px] font-semibold text-destructive">{error}</p>}

      {value && (
        <div className="relative mt-1 inline-block">
          <img src={value} alt="" className="h-20 w-32 rounded-lg border border-border object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -left-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-destructive text-white shadow"
            title="إزالة الصورة"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      {helperText && <p className="text-[11px] text-muted-foreground">{helperText}</p>}
    </div>
  )
}

export default ImageUploadField
