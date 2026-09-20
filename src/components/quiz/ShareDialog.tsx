import { useEffect, useRef, useState } from "react"
import { X, Download, Share2, Copy, Check, ExternalLink, Loader2, MessageCircle, Linkedin } from "lucide-react"
import { BASE_URL } from "@/lib/canonical"
import {
  blobToObjectUrl,
  buildLinkedInShareUrl,
  buildShareText,
  buildWhatsAppShareUrl,
  copyToClipboard,
  downloadBlob,
  openExternalShare,
  renderShareCard,
  shareOrDownloadCard,
  type ShareCardInput,
} from "@/lib/quiz/shareCard"

/**
 * نافذة المشاركة (Share Dialog).
 *
 * لماذا نافذة داخلية بدل روابط مباشرة؟ لأن المتصفح يحجب النوافذ المنبثقة
 * والتنزيلات داخل الإطارات المعزولة (مثل نافذة المعاينة داخل بيئات التطوير،
 * أو بعض تطبيقات الجوال التي تفتح الروابط داخل متصفح داخلي). حين يُحجب
 * الفتح، نعرض الرابط في صندوق قابل للنسخ بدل زر يبدو معطّلاً.
 *
 * ترتيب المحاولات دائماً: مشاركة النظام (الجوال) → فتح نافذة → نسخ الرابط.
 */
export function ShareDialog({
  open,
  onClose,
  input,
  shareUrl,
}: {
  open: boolean
  onClose: () => void
  input: ShareCardInput
  /** الرابط المرافق للمشاركة (رابط المنصة أو البروفايل). */
  shareUrl?: string
}) {
  const [blob, setBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [blocked, setBlocked] = useState<{ label: string; url: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const objectUrlRef = useRef<string | null>(null)

  // توليد البطاقة عند فتح النافذة (مرة واحدة)
  useEffect(() => {
    if (!open || blob) return
    let cancelled = false
    setPreparing(true)
    renderShareCard(input)
      .then((result) => {
        if (cancelled || !result) return
        setBlob(result)
        const url = blobToObjectUrl(result)
        objectUrlRef.current = url
        setPreviewUrl(url)
      })
      .finally(() => {
        if (!cancelled) setPreparing(false)
      })
    return () => {
      cancelled = true
    }
  }, [blob, input, open])

  // تنظيف رابط الكائن عند الإغلاق
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [])

  // إغلاق بمفتاح ESC
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [onClose, open])

  if (!open) return null

  // رابط المشاركة: بروفايل المستخدم إن وُجد، وإلا رابط المنصة
  const resolvedShareUrl = shareUrl ?? (input.username ? `${BASE_URL}/u/${input.username}` : `${BASE_URL}/quiz`)
  const shareText = buildShareText(input)
  const whatsappUrl = buildWhatsAppShareUrl(input)
  const linkedinUrl = buildLinkedInShareUrl(resolvedShareUrl)

  const tryOpen = (label: string, url: string) => {
    setMessage(null)
    const result = openExternalShare(url)
    if (result === "blocked") {
      setBlocked({ label, url })
      setMessage(`حجب المتصفح فتح ${label} في نافذة جديدة — انسخ الرابط من الأسفل وافتحه يدوياً.`)
    }
  }

  const handleNativeShare = async () => {
    setMessage(null)
    if (blob) {
      const result = await shareOrDownloadCard(blob)
      setMessage(
        result === "shared"
          ? "تمت المشاركة."
          : result === "downloaded"
            ? "نُزّلت البطاقة — شاركها على واتساب أو لينكد إن."
            : result === "blocked"
              ? "حجب المتصفح التنزيل — يمكنك الضغط مطولاً على الصورة أعلاه لحفظها، أو نسخ الرابط أدناه."
              : "تعذّرت المشاركة على هذا المتصفح."
      )
      return
    }
    // لا توجد صورة: نشارك نصاً فقط
    if (navigator.share) {
      try {
        await navigator.share({ title: "نتيجتي في ميزان الرقمية", text: shareText, url: resolvedShareUrl })
        setMessage("تمت المشاركة.")
      } catch {
        setMessage("أُلغيت المشاركة.")
      }
      return
    }
    setMessage("المشاركة المباشرة غير متاحة في هذا المتصفح — استخدم واتساب أو النسخ.")
  }

  const handleDownload = () => {
    if (!blob) return
    const result = downloadBlob(blob, "mizan-result.png")
    setMessage(
      result === "downloaded"
        ? "نُزّلت البطاقة — شاركها على واتساب أو لينكد إن."
        : "حجب المتصفح التنزيل: اضغط مطولاً على الصورة أعلاه لحفظها، أو انسخ الرابط أدناه."
    )
  }

  const handleCopy = async (text: string, label: string) => {
    const ok = await copyToClipboard(text)
    setCopied(ok)
    setMessage(ok ? `نُسخ ${label}.` : `تعذّر النسخ — حدد النص يدوياً وانسخه.`)
    window.setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-foreground/60 p-4"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="مشاركة النتيجة"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="my-6 w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl">
        {/* العنوان */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-[15px] font-extrabold text-foreground">شارك نتيجتك</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="إغلاق"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {/* معاينة البطاقة */}
          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            {preparing && (
              <div className="flex items-center justify-center gap-2 p-10 text-[12.5px] font-bold text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                جارٍ تحضير البطاقة...
              </div>
            )}
            {previewUrl && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <img src={previewUrl} alt="بطاقة نتيجة الاختبار" className="w-full" />
            )}
          </div>

          {/* الأزرار */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleNativeShare}
              className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-extrabold text-primary-foreground transition hover:opacity-90"
            >
              <Share2 className="size-4" aria-hidden="true" />
              مشاركة عبر الجهاز (واتساب/لينكد إن…)
            </button>

            <button
              type="button"
              onClick={() => tryOpen("واتساب", whatsappUrl)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/5 px-4 py-2.5 text-[12.5px] font-extrabold text-emerald-700 transition hover:bg-emerald-500/10 dark:text-emerald-300"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              واتساب
            </button>

            <button
              type="button"
              onClick={() => tryOpen("لينكد إن", linkedinUrl)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-500/50 bg-sky-500/5 px-4 py-2.5 text-[12.5px] font-extrabold text-sky-700 transition hover:bg-sky-500/10 dark:text-sky-300"
            >
              <Linkedin className="size-4" aria-hidden="true" />
              لينكد إن
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={!blob}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-[12.5px] font-extrabold text-foreground transition hover:border-primary/50 disabled:opacity-50"
            >
              <Download className="size-4" aria-hidden="true" />
              تحميل الصورة
            </button>

            <button
              type="button"
              onClick={() => handleCopy(shareText, "نص النتيجة")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-[12.5px] font-extrabold text-foreground transition hover:border-primary/50"
            >
              {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
              نسخ النص
            </button>
          </div>

          {/* بديل: نسخ الرابط يدوياً عند الحجب */}
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="mb-2 text-[11.5px] font-bold text-muted-foreground">
              الرابط المرفق بالمشاركة (انسخه إن حجب المتصفح النوافذ المنبثقة):
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={blocked?.url ?? resolvedShareUrl}
                dir="ltr"
                onFocus={(event) => event.currentTarget.select()}
                className="min-w-0 flex-1 rounded-lg border border-border bg-card px-2.5 py-2 text-[12px] text-foreground outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => handleCopy(blocked?.url ?? resolvedShareUrl, "الرابط")}
                className="shrink-0 rounded-lg border border-border px-3 py-2 text-[12px] font-extrabold text-foreground transition hover:border-primary/50"
              >
                نسخ
              </button>
              <a
                href={blocked?.url ?? resolvedShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg border border-border p-2 text-muted-foreground transition hover:text-foreground"
                aria-label="فتح الرابط في تبويب جديد"
              >
                <ExternalLink className="size-4" />
              </a>
            </div>
          </div>

          {message && (
            <p className="rounded-xl border border-border bg-muted/40 p-3 text-[12px] font-bold leading-6 text-foreground">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
