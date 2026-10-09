import { useRef, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { Loader2, Send } from "lucide-react"
import { useAuth } from "../../lib/auth/AuthProvider"

type Source = { title: string; url: string }
type Quota = { limit: number; remaining: number }
type Message =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; sources: Source[]; mode: string }

const STARTERS = [
  "كيف أبحث في الأرشيف؟",
  "ما هي الكليات المدرجة في الدليل؟",
  "كيف أبدأ اختبارات المباريات المهنية؟",
  "هل أحتاج حساباً للقراءة؟",
]

const GENERIC_ERROR = "تعذّر الرد الآن. حاول مرة أخرى بعد قليل."
const SESSION_EXPIRED = "انتهت جلستك. سجّل الدخول من جديد لمتابعة السؤال."
const DAILY_LIMIT_REACHED = "استنفدت حصة اليوم من الأسئلة. حاول مرة أخرى غداً."
const ACCOUNT_RESTRICTED = "حسابك غير مفعّل لاستعمال المساعد. راجع إدارة الموقع إن كان هذا خطأ."
const TOO_FAST = "أرسلت أسئلة كثيرة في وقت قصير. انتظر دقيقة ثم حاول مجدداً."

/** الروابط الداخلية تمر عبر الراوتر، وروابط الملفات العامة (مثل RSS) تُفتح كرابط عادي. */
function SourceLink({ source }: { source: Source }) {
  const isStaticFile = /\.[a-z0-9]+$/i.test(source.url.split(/[?#]/)[0])
  const className = "text-sm font-semibold text-primary underline-offset-4 hover:underline"
  return isStaticFile ? (
    <a href={source.url} className={className}>
      {source.title}
    </a>
  ) : (
    <Link to={source.url} className={className}>
      {source.title}
    </Link>
  )
}

/**
 * واجهة المحادثة. تُستعمل في الزر العائم وفي صفحة /help.
 * المساعد للمستخدمين المسجّلين فقط: الزائر يرى دعوة لتسجيل الدخول.
 * الطلب يذهب إلى /api/help/chat على نفس النطاق، فلا تُضاف أي نطاقات إلى CSP.
 */
export default function HelpChat({ compact = false }: { compact?: boolean }) {
  const { session, initialized } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [quota, setQuota] = useState<Quota | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const token = session?.access_token

  async function send(text: string) {
    const question = text.trim()
    if (question.length < 2 || loading || !token) return
    setMessages((prev) => [...prev, { role: "user", text: question }])
    setInput("")
    setNotice(null)
    setLoading(true)
    try {
      const res = await fetch("/api/help/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: question }),
      })
      const data = await res.json().catch(() => null)

      if (data && typeof data.quota?.remaining === "number" && typeof data.quota?.limit === "number") {
        setQuota({ limit: data.quota.limit, remaining: data.quota.remaining })
      }

      if (res.status === 401) {
        setNotice(SESSION_EXPIRED)
      } else if (res.status === 403 && data?.error === "account_restricted") {
        setNotice(ACCOUNT_RESTRICTED)
      } else if (res.status === 429 && data?.error === "too_fast") {
        setNotice(TOO_FAST)
      } else if (res.status === 429 && data?.error === "daily_limit_reached") {
        setQuota({ limit: data.quota?.limit ?? quota?.limit ?? 0, remaining: 0 })
        setNotice(DAILY_LIMIT_REACHED)
      } else if (res.ok && data && typeof data.answer === "string") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: data.answer, sources: data.sources ?? [], mode: data.mode },
        ])
      } else {
        setMessages((prev) => [...prev, { role: "assistant", text: GENERIC_ERROR, sources: [], mode: "error" }])
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: GENERIC_ERROR, sources: [], mode: "error" }])
    } finally {
      setLoading(false)
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }))
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    void send(input)
  }

  const header = (
    <p className="text-xs leading-6 text-muted-foreground">
      مساعد يشرح كيف تستعمل ميزان الرقمية وأين تجد المحتوى. لا يقدم استشارات قانونية في حالات فردية.
    </p>
  )

  if (!initialized) {
    return (
      <div dir="rtl" className="flex flex-col gap-3">
        {header}
        <p className="text-sm text-muted-foreground" role="status">
          جارٍ التحقق من الجلسة…
        </p>
      </div>
    )
  }

  if (!session) {
    return (
      <div dir="rtl" className="flex flex-col gap-3">
        {header}
        <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm leading-7">
          <p className="mb-3">مساعد ميزان متاح للمسجّلين فقط. سجّل الدخول لتسأل عن الموقع.</p>
          <Link
            to="/login?next=/help"
            className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            تسجيل الدخول
          </Link>
        </div>
      </div>
    )
  }

  const exhausted = quota !== null && quota.remaining <= 0

  return (
    <div dir="rtl" className="flex h-full flex-col gap-3">
      {header}

      {quota && (
        <p className="text-xs font-semibold text-muted-foreground" aria-live="polite">
          المتبقي اليوم: {quota.remaining} من {quota.limit} سؤالاً
        </p>
      )}

      {notice && (
        <p role="alert" className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs leading-6">
          {notice}
        </p>
      )}

      <div ref={listRef} className={`flex-1 space-y-3 overflow-y-auto ${compact ? "max-h-72" : "min-h-72"}`}>
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                disabled={exhausted}
                onClick={() => void send(starter)}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50"
              >
                {starter}
              </button>
            ))}
          </div>
        )}

        {messages.map((message, index) =>
          message.role === "user" ? (
            <div key={index} className="ms-auto max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground">
              {message.text}
            </div>
          ) : (
            <div key={index} className="max-w-[90%] space-y-2 rounded-2xl border border-border bg-card px-3 py-2 text-sm leading-7">
              <p>{message.text}</p>
              {message.sources.length > 0 && (
                <ul className="space-y-1">
                  {message.sources.map((source) => (
                    <li key={`${source.url}-${source.title}`}>
                      <SourceLink source={source} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ),
        )}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            يبحث في محتوى الموقع…
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <label htmlFor="help-chat-input" className="sr-only">
          اكتب سؤالك عن الموقع
        </label>
        <input
          id="help-chat-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          maxLength={500}
          disabled={exhausted}
          placeholder={exhausted ? "انتهت حصة اليوم" : "اكتب سؤالك عن استعمال الموقع…"}
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || exhausted || input.trim().length < 2}
          className="inline-flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
          aria-label="إرسال"
        >
          <Send className="size-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  )
}
