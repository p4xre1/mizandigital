import { useEffect, useRef, useState } from "react"
import { MessageCircle, Send, Loader2, CheckCircle2 } from "lucide-react"
import { supabase } from "../../lib/supabase/client"
import { inspectUserText, describeInspection, LIMITS } from "../../lib/security/payloadGuard"

interface CommentSectionProps {
  /** أي قسم ينتمي إليه هذا المحتوى: مقال أم خبر */
  table: "articles" | "news"
  /** السلاق كما يظهر في رابط الصفحة — يعمل مع المحتوى المحلي (JSON) والمحتوى من Supabase على حدّ سواء */
  slug?: string | null
}

interface CommentRow {
  id: string
  author_name: string
  body: string
  created_at: string | null
}

/**
 * اسم حقل "مصيدة البوتات". يجب أن يطابق القيمة الافتراضية في
 * `checkHoneypotAndTiming` داخل functions/_shared/guard.js.
 * الحقل مخفي بصرياً وغير قابل للوصول بلوحة المفاتيح، فالبشر لا يملؤونه
 * أبداً بينما البوتات تملأ كل الحقول التي تجدها في الـ DOM.
 */
const HONEYPOT_FIELD = "website"

/**
 * إرسال التعليق عبر نقطة النهاية المحمية /api/comments.
 *
 * في بيئة التطوير (`pnpm dev` = Vite فقط، بلا Pages Functions) يرجع المسار
 * 404؛ عندها فقط نرجع للإدراج المباشر كي لا ينسدّ العمل محلياً. هذا الرجوع
 * محكوم بـ `import.meta.env.DEV` فلا يمكن أن يُفعَّل في البناء المنشور.
 */
async function submitComment(
  payload: Record<string, unknown>,
  directInsert?: () => Promise<void>
) {
  try {
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    // مسار تطوير فقط: `pnpm dev` يشغّل Vite وحده بلا Pages Functions فيرجع
    // المسار 404. الدالة `directInsert` تُمرَّر undefined في الإنتاج (انظر
    // موضع الاستدعاء) فيُلغى هذا الفرع ولا يبقى أي إدخال مباشر في البناء
    // المنشور. غياب الدالة = لا رجوع احتياطي أبداً.
    if (res.status === 404 && directInsert) {
      await directInsert()
      return { ok: true as const }
    }

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("Retry-After") || 0)
      return {
        ok: false as const,
        message: `لقد أرسلت تعليقات كثيرة. حاول مجدداً بعد ${Math.max(1, Math.ceil(retryAfter / 60))} دقيقة.`,
      }
    }

    if (res.status === 400) {
      const data = await res.json().catch(() => null)
      if (data?.error === "captcha_failed") {
        return { ok: false as const, message: "فشل التحقق الأمني، يرجى إعادة المحاولة." }
      }
      if (data?.error === "invalid_target") {
        return { ok: false as const, message: "لا يمكن إضافة تعليق على هذا المحتوى حالياً." }
      }
      return { ok: false as const, message: "تعذّر إرسال التعليق، يرجى مراجعة النص." }
    }

    if (!res.ok) return { ok: false as const, message: "تعذّر إرسال التعليق، حاول مرة أخرى." }

    // ملاحظة: الخادم يجيب بنجاح حتى لو أسقط المشغّل التعليق بصمت
    // (سبام). هذا مقصود كي لا يتعلم المهاجم أي قاعدة كشفته.
    return { ok: true as const }
  } catch {
    // انقطاع شبكة: لا نحاول الإدراج المباشر (سيكون ذلك ثغرة تجاوز)
    return { ok: false as const, message: "تعذّر الاتصال بالخادم، تحقق من اتصالك بالإنترنت." }
  }
}

export function CommentSection({ table, slug }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [body, setBody] = useState("")
  const [honeypot, setHoneypot] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  // لحظة عرض النموذج: تُرسل مع الطلب ليقيس الخادم زمن التعبئة ويرفض
  // الإرسال اللحظي (بوت). تُخزَّن في ref لأنها ليست جزءاً من العرض.
  const formStartedAt = useRef<number>(Date.now())

  useEffect(() => {
    if (!slug) {
      setLoading(false)
      return
    }
    let cancelled = false

    supabase
      .from("comments")
      .select("id, author_name, body, created_at")
      .eq("source_type", table)
      .eq("source_slug", slug)
      .eq("is_approved", true)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!cancelled) {
          setComments((data as CommentRow[]) || [])
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [table, slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!slug) {
      setErrorMsg("لا يمكن إضافة تعليق على هذا المحتوى حالياً.")
      return
    }

    // الفحص هنا لتحسين التجربة فقط (رسالة عربية فورية) — الخادم يعيد
    // الفحص كاملاً ولا يثق بما يأتي من المتصفح.
    const nameCheck = inspectUserText(name, {
      field: "name",
      maxLength: LIMITS.AUTHOR_NAME_MAX,
      minLength: 1,
      maxUrls: 0,
    })
    if (!nameCheck.ok) {
      setErrorMsg(describeInspection(nameCheck.code))
      return
    }

    const bodyCheck = inspectUserText(body, {
      field: "body",
      maxLength: LIMITS.BODY_MAX,
      minLength: LIMITS.BODY_MIN,
    })
    if (!bodyCheck.ok) {
      setErrorMsg(describeInspection(bodyCheck.code))
      return
    }

    setSubmitting(true)
    // طيّ `import.meta.env.DEV` هنا (لا داخل submitComment): Vite يستبدله بـ
    // false في البناء المنشور، فيصبح هذا التعبير `undefined` ويسقط closure
    // الإدراج المباشر بالكامل من الحزمة. وضعه داخل الدالة لم يكن كافياً لأن
    // Rollup لا يستطيع إثبات موت فرع يعبر حدود الدالة.
    const devOnlyDirectInsert = import.meta.env.DEV
      ? async () => {
          await supabase.from("comments").insert({
            source_type: table,
            source_slug: slug,
            author_name: nameCheck.value,
            body: bodyCheck.value,
            is_approved: false,
          } as any)
        }
      : undefined

    const result = await submitComment(
      {
        sourceType: table,
        sourceSlug: slug,
        authorName: nameCheck.value,
        body: bodyCheck.value,
        [HONEYPOT_FIELD]: honeypot,
        formStartedAt: formStartedAt.current,
      },
      devOnlyDirectInsert
    )
    setSubmitting(false)

    if (!result.ok) {
      setErrorMsg(result.message)
      return
    }

    setSubmitted(true)
    setName("")
    setBody("")
    setHoneypot("")
    formStartedAt.current = Date.now()
  }

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-5 md:p-8">
      <h2 className="flex items-center gap-2 text-base md:text-lg font-bold text-foreground mb-6">
        <MessageCircle size={18} className="text-primary" />
        التعليقات {comments.length > 0 && `(${comments.length})`}
      </h2>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          جارٍ تحميل التعليقات...
        </div>
      ) : comments.length > 0 ? (
        <ul className="space-y-4 mb-8">
          {comments.map((c) => (
            <li key={c.id} className="rounded-xl border border-border/70 bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-sm font-bold text-foreground">{c.author_name}</span>
                {c.created_at && (
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("ar-MA", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{c.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground mb-8">لا توجد تعليقات بعد، كن أول من يعلّق.</p>
      )}

      {submitted ? (
        <div className="flex items-center gap-2 rounded-xl border border-green-600/30 bg-green-600/10 p-4 text-sm font-semibold text-green-700 dark:text-green-400">
          <CheckCircle2 size={16} />
          شكراً لك، تم إرسال تعليقك وسيظهر بعد المراجعة.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="relative space-y-3">
          {/* مصيدة البوتات: مخفية بصرياً وخارج ترتيب الـ tab، فالبشر لا
              يرونها ولا يملؤونها، بينما البوتات تملأ أي حقل input تجده. */}
          <input
            type="text"
            name={HONEYPOT_FIELD}
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            placeholder="اترك هذا الحقل فارغاً"
            className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسمك"
            maxLength={LIMITS.AUTHOR_NAME_MAX}
            autoComplete="name"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="اكتب تعليقك هنا..."
            rows={3}
            maxLength={LIMITS.BODY_MAX}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          {errorMsg && <p className="text-xs font-semibold text-red-600">{errorMsg}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            إرسال التعليق
          </button>
          <p className="text-[11px] text-muted-foreground">
            التعليقات تخضع للمراجعة قبل النشر.
          </p>
        </form>
      )}
    </section>
  )
}