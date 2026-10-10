import { useRef, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { Loader2, Send } from "lucide-react"
import { useAuth } from "../../lib/auth/AuthProvider"
import { withAuthRetry } from "../../lib/auth/sessionToken"
import { interpretPendingReply } from "../../../shared/help/clarify-state.js"

type Source = { title: string; url: string }
type Quota = { limit: number; remaining: number }
/** اختيار يعرضه التوضيح. المعرّف فقط يُرسل إلى الخادم، والنص للعرض. */
type Choice = { id: string; label: string }
type Clarification = { kind: string; explanation: string; suggestion: string | null; choices: Choice[] }
type Message =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "assistant"; text: string; sources: Source[]; mode: string; clarification?: Clarification }
/**
 * توضيح معلّق، منفصل عن الرسائل: السؤال الأصلي، والسؤال السابق (للسياق)، والرسالة التي تعرض الأزرار.
 * يُمسح عند أي سؤال جديد، وعند تحديث الصفحة (لا يُحفظ).
 */
type Pending = { original: string; previousQuestion: string | null; messageId: number; clarification: Clarification }
/** Omit موزَّع على اتحاد الرسائل، حتى يبقى كل فرع بحقوله. */
type NewMessage = Message extends infer M ? (M extends unknown ? Omit<M, "id"> : never) : never

const STARTERS = [
  "كيف أبحث في الأرشيف؟",
  "ما هي الكليات المدرجة في الدليل؟",
  "كيف أبدأ اختبارات المباريات المهنية؟",
  "هل أحتاج حساباً للقراءة؟",
]

const GENERIC_ERROR = "تعذّر الرد الآن. حاول مرة أخرى بعد قليل."
// خطأ خادم (5xx): المشكلة في إعدادات الخادم لا في السؤال. السبب الدقيق
// (مثل service_misconfigured) يُطبع في وحدة تحكم المتصفح ليطّلع عليه المشرف.
const SERVER_TROUBLE = "المساعد متوقف مؤقتاً بسبب مشكلة في الخادم. حاول لاحقاً، وإن استمرت المشكلة أخبر إدارة الموقع."
const SESSION_EXPIRED = "انتهت جلستك. سجّل الدخول من جديد لمتابعة السؤال."
const DAILY_LIMIT_REACHED = "استنفدت حصة اليوم من الأسئلة. حاول مرة أخرى غداً."
const ACCOUNT_RESTRICTED = "حسابك غير مفعّل لاستعمال المساعد. راجع إدارة الموقع إن كان هذا خطأ."
const TOO_FAST = "أرسلت أسئلة كثيرة في وقت قصير. انتظر دقيقة ثم حاول مجدداً."
const SELECTION_REQUIRED = "اختر أحد الخيارات المعروضة أعلاه، أو اكتب سؤالك من جديد."

/** تحقق من شكل بيانات التوضيح قبل عرضها. أي شكل غير متوقع يُهمل. */
function asClarification(value: unknown): Clarification | undefined {
  if (!value || typeof value !== "object") return undefined
  const v = value as Partial<Clarification>
  if (typeof v.kind !== "string" || typeof v.explanation !== "string" || !Array.isArray(v.choices)) return undefined
  const choices = v.choices.filter(
    (c): c is Choice => !!c && typeof c.id === "string" && typeof c.label === "string",
  )
  return { kind: v.kind, explanation: v.explanation, suggestion: typeof v.suggestion === "string" ? v.suggestion : null, choices }
}

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
 * رسالة توضيح: شرح قصير، والصياغة المقترحة مع السؤال الإلزامي، وأزرار الاختيار.
 * الأزرار تظهر للرسالة المعلّقة فقط، فإذا اختير شيء أو سُئل سؤال جديد تختفي.
 */
function ClarificationBubble({
  clarification,
  text,
  active,
  disabled,
  onChoose,
}: {
  clarification: Clarification
  text: string
  active: boolean
  disabled: boolean
  onChoose: (choice: { choice: string; label: string }) => void
}) {
  const suggested = clarification.choices.find((c) => c.id === "suggested")
  const others = clarification.choices.filter((c) => c.id !== "suggested")
  return (
    <div className="max-w-[90%] space-y-2 rounded-2xl border border-border bg-card px-3 py-2 text-sm leading-7" aria-label="توضيح مطلوب">
      <p>{clarification.explanation}</p>
      {clarification.suggestion && (
        <p className="rounded-xl bg-muted/40 px-3 py-2 font-semibold">«{clarification.suggestion}»</p>
      )}
      {clarification.suggestion && <p>هل هذا ما تقصد السؤال عنه؟</p>}
      {active && clarification.choices.length > 0 && (
        <div role="group" aria-label="اختر المقصود" className="flex flex-wrap gap-2">
          {[suggested, ...others].filter((c): c is Choice => Boolean(c)).map((choice) => (
            <button
              key={choice.id}
              type="button"
              disabled={disabled}
              onClick={() => onChoose({ choice: choice.id, label: choice.label })}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50"
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}
      {!active && <p className="sr-only">{text}</p>}
    </div>
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
  const [pending, setPending] = useState<Pending | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(0)
  /** آخر سؤال أُجيب عنه: يُرسل سياقاً عند السؤال التالي (مثل: "ما نص هذا الفصل؟"). */
  const lastAnswered = useRef<string | null>(null)
  const token = session?.access_token

  function addMessage(message: NewMessage): number {
    nextId.current += 1
    const id = nextId.current
    setMessages((prev) => [...prev, { ...message, id } as Message])
    return id
  }

  /** إرسال السؤال إلى نقطة النهاية برمزي المعرَّف. */
  async function postChat(body: Record<string, unknown>, accessToken: string) {
    const res = await fetch("/api/help/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => null)
    return { res, data }
  }

  /**
   * إرسال سؤال جديد، أو اختيار من توضيح معلّق (pick). الاختيار يرسل المعرّف فقط،
   * والسؤال الأصلي من الحالة المعلّقة، فلا يُقبل نص من المتصفح كأنه تأكيد.
   */
  async function send(text: string, pick?: { choice: string; label: string }) {
    const question = (pick && pending ? pending.original : text).trim()
    if (question.length < 2 || loading || !token) return
    if (pick && !pending) return
    const previousQuestion = pick && pending ? pending.previousQuestion : lastAnswered.current
    addMessage({ role: "user", text: pick ? pick.label : question })
    setPending(null)
    setInput("")
    setNotice(null)
    setLoading(true)
    try {
      const body: Record<string, unknown> = { message: question }
      if (pick) body.clarification = { choice: pick.choice }
      if (previousQuestion) body.context = { previousQuestion }
      // رمز صالح لحظة الإرسال، مع إعادة محاولة واحدة بعد 401: الرمز المعروض
      // وقت التصيير قد يكون انتهى أثناء خمول الصفحة، فيُجدَّد هنا بدل أن يرى
      // المستخدم «انتهت جلستك» رغم أن الجلسة قابلة للتجديد.
      const { res, data } = await withAuthRetry((accessToken) => postChat(body, accessToken), token)

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
      } else if (res.ok && data && typeof data.answer === "string" && data.mode === "clarify") {
        const clarification = asClarification(data.clarification)
        const id = addMessage({ role: "assistant", text: data.answer, sources: [], mode: "clarify", clarification })
        // الأزرار المعلّقة تحتاج صياغة مقترحة أو خيارات. بدونها يكفي الشرح، وسؤال المستخدم التالي سؤال جديد.
        if (clarification && clarification.choices.length > 0) {
          setPending({ original: question, previousQuestion, messageId: id, clarification })
        }
      } else if (res.ok && data && typeof data.answer === "string") {
        addMessage({ role: "assistant", text: data.answer, sources: data.sources ?? [], mode: data.mode })
        if (data.mode === "answer" || data.mode === "not_found" || data.mode === "insufficient") {
          lastAnswered.current = typeof data.questionUsed === "string" ? data.questionUsed : question
        }
      } else if (res.status >= 500) {
        // خطأ خادم: السبب الدقيق (مثل service_misconfigured أو
        // guard_config_unavailable) يظهر هنا في وحدة التحكم لتشخيص إعدادات النشر.
        console.error(`[help-chat] server error ${res.status}:`, data?.error ?? "(no JSON body)")
        addMessage({ role: "assistant", text: SERVER_TROUBLE, sources: [], mode: "error" })
      } else {
        console.error(`[help-chat] unexpected response ${res.status}:`, data?.error ?? "(no JSON body)")
        addMessage({ role: "assistant", text: GENERIC_ERROR, sources: [], mode: "error" })
      }
    } catch (error) {
      console.error("[help-chat] network failure:", error)
      addMessage({ role: "assistant", text: GENERIC_ERROR, sources: [], mode: "error" })
    } finally {
      setLoading(false)
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }))
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const typed = input.trim()
    if (!pending) {
      void send(typed)
      return
    }
    // توضيح معلّق: الرد الصريح يُفسَّر تأكيداً أو رفضاً. أي شيء آخر سؤال جديد، والصمت لا يُعد تأكيداً.
    const reply = interpretPendingReply(pending, typed)
    if (reply.type === "choice") {
      void send(typed, { choice: reply.choice, label: typed })
    } else if (reply.type === "invalid") {
      setNotice(SELECTION_REQUIRED)
    } else {
      void send(typed)
    }
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

        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="ms-auto max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground">
              {message.text}
            </div>
          ) : message.clarification ? (
            <ClarificationBubble
              key={message.id}
              clarification={message.clarification}
              text={message.text}
              active={pending?.messageId === message.id}
              disabled={loading}
              onChoose={(choice) => void send(pending?.original ?? "", choice)}
            />
          ) : (
            <div key={message.id} className="max-w-[90%] space-y-2 rounded-2xl border border-border bg-card px-3 py-2 text-sm leading-7">
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
          placeholder={exhausted ? "انتهت حصة اليوم" : pending ? "أجب بنعم أو لا، أو اكتب سؤالاً جديداً…" : "اكتب سؤالك عن استعمال الموقع…"}
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
