import { useState } from "react"
import { Check, Copy, Facebook, Linkedin, MessageCircle, Share2, Twitter } from "lucide-react"

import {
  buildArticleShareTargets,
  buildArticleShareText,
  canNativeShare,
  type ArticleShareNetwork,
} from "@/lib/articles/share"
import { copyToClipboard, openExternalShare } from "@/lib/utils/share"

interface ArticleSharePanelProps {
  title: string
  /** الرابط القانوني للمقال — نفسه og:url و canonical. */
  url: string
  summary?: string
  /** رسالة عابرة (toast) عند النسخ أو تعذّر الفتح. */
  onToast?: (message: string) => void
}

const NETWORK_STYLE: Record<ArticleShareNetwork, { className: string; icon: typeof Twitter }> = {
  x: {
    className: "border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/5",
    icon: Twitter,
  },
  facebook: {
    className: "border-sky-500/50 bg-sky-500/5 text-sky-700 hover:bg-sky-500/10 dark:text-sky-300",
    icon: Facebook,
  },
  linkedin: {
    className: "border-blue-600/40 bg-blue-600/5 text-blue-700 hover:bg-blue-600/10 dark:text-blue-300",
    icon: Linkedin,
  },
  whatsapp: {
    className: "border-emerald-500/50 bg-emerald-500/5 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300",
    icon: MessageCircle,
  },
}

/**
 * لوحة «شارك المقال» — داخل درج الأدوات (نقرة واحدة) لا بطاقة دائمة.
 *
 * الأزرار كانت رموزاً بلا فعل (𝕏 f in ↗) في بطاقة جانبية؛ صارت مشاركة فعلية:
 * روابط الشبكات تُبنى من الرابط القانوني (lib/articles/share) وتُفتح عبر
 * openExternalShare، وإن حجب المتصفح النافذة (إطارات المعاينة، بعض متصفحات
 * الجوال) يظهر الرابط في حقل قابل للنسخ بدل زرٍّ يبدو معطّلاً — وهو المسار
 * نفسه المعتمد في نافذة مشاركة نتيجة الاختبار.
 */
export function ArticleSharePanel({ title, url, summary, onToast }: ArticleSharePanelProps) {
  const [copied, setCopied] = useState(false)
  const [blocked, setBlocked] = useState<{ label: string; url: string } | null>(null)

  const targets = buildArticleShareTargets({ title, url, summary })
  const shareText = buildArticleShareText({ title, url, summary })
  const nativeShare = canNativeShare()

  const notify = (message: string) => {
    onToast?.(message)
  }

  const openNetwork = (label: string, target: string) => {
    setBlocked(null)
    if (openExternalShare(target) === "blocked") {
      setBlocked({ label, url: target })
      notify(`حجب المتصفح فتح ${label} — الرابط معروض أدناه، انسخه وافتحه يدوياً`)
    }
  }

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(url)
    setCopied(ok)
    notify(ok ? "نُسخ رابط المقال" : "تعذّر النسخ — حدّد الرابط أدناه وانسخه يدوياً")
    if (ok) window.setTimeout(() => setCopied(false), 2500)
  }

  const handleNativeShare = async () => {
    setBlocked(null)
    try {
      await navigator.share({ title, text: shareText, url })
    } catch {
      // إلغاء المستخدم ليس خطأً يُعرض
    }
  }

  return (
    <div className="space-y-4" dir="rtl">
      {nativeShare && (
        <button
          type="button"
          onClick={handleNativeShare}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-extrabold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:transition-opacity"
        >
          <Share2 className="size-4" aria-hidden="true" />
          مشاركة عبر الجهاز (واتساب، رسائل…)
        </button>
      )}

      <div className="grid grid-cols-2 gap-2">
        {targets.map((target) => {
          const { className, icon: Icon } = NETWORK_STYLE[target.id]
          return (
            <button
              key={target.id}
              type="button"
              onClick={() => openNetwork(target.label, target.url)}
              className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[12.5px] font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:transition-colors ${className}`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {target.label}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={handleCopyLink}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-[12.5px] font-extrabold text-foreground hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:transition-colors"
      >
        {copied ? <Check className="size-4 text-emerald-600" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
        {copied ? "نُسخ الرابط" : "نسخ رابط المقال"}
      </button>

      {/* الرابط نفسه: قابل للتحديد والنسخ اليدوي دائماً، وهو البديل عند حجب النوافذ */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-bold text-muted-foreground">
          {blocked ? `تعذّر فتح ${blocked.label} في نافذة جديدة — افتح هذا الرابط يدوياً:` : "رابط المقال:"}
        </p>
        <input
          readOnly
          value={blocked ? blocked.url : url}
          onFocus={(event) => event.currentTarget.select()}
          aria-label={blocked ? `رابط ${blocked.label}` : "رابط المقال"}
          className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-[11px] text-foreground/80 outline-none focus:border-primary/40"
        />
      </div>
    </div>
  )
}
