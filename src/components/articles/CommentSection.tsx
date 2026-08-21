import { useEffect, useState } from "react"
import { MessageCircle, Send, Loader2, CheckCircle2 } from "lucide-react"
import { supabase } from "../../lib/supabase/client"

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

export function CommentSection({ table, slug }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [body, setBody] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

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
    if (!name.trim() || !body.trim()) {
      setErrorMsg("يرجى كتابة الاسم والتعليق.")
      return
    }
    if (body.trim().length > 2000) {
      setErrorMsg("التعليق طويل جداً (الحد الأقصى 2000 حرف).")
      return
    }

    setSubmitting(true)
    const { error } = await supabase.from("comments").insert({
      source_type: table,
      source_slug: slug,
      author_name: name.trim().slice(0, 100),
      body: body.trim(),
      is_approved: false,
    } as any)
    setSubmitting(false)

    if (error) {
      setErrorMsg("تعذّر إرسال التعليق، حاول مرة أخرى.")
      return
    }

    setSubmitted(true)
    setName("")
    setBody("")
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
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسمك"
            maxLength={100}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="اكتب تعليقك هنا..."
            rows={3}
            maxLength={2000}
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