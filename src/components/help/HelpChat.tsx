import { useRef, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { Loader2, Send } from "lucide-react"

type Source = { title: string; url: string }
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
 * الطلب يذهب إلى /api/help/chat على نفس النطاق، فلا تُضاف أي نطاقات إلى CSP.
 */
export default function HelpChat({ compact = false }: { compact?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  async function send(text: string) {
    const question = text.trim()
    if (question.length < 2 || loading) return
    setMessages((prev) => [...prev, { role: "user", text: question }])
    setInput("")
    setLoading(true)
    try {
      const res = await fetch("/api/help/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      })
      const data = res.ok ? await res.json() : null
      setMessages((prev) => [
        ...prev,
        data && typeof data.answer === "string"
          ? { role: "assistant", text: data.answer, sources: data.sources ?? [], mode: data.mode }
          : { role: "assistant", text: GENERIC_ERROR, sources: [], mode: "error" },
      ])
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

  return (
    <div dir="rtl" className="flex h-full flex-col gap-3">
      <p className="text-xs leading-6 text-muted-foreground">
        مساعد يشرح كيف تستعمل ميزان الرقمية وأين تجد المحتوى. لا يقدم استشارات قانونية في حالات فردية.
      </p>

      <div ref={listRef} className={`flex-1 space-y-3 overflow-y-auto ${compact ? "max-h-72" : "min-h-72"}`}>
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                onClick={() => void send(starter)}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
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
          placeholder="اكتب سؤالك عن استعمال الموقع…"
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={loading || input.trim().length < 2}
          className="inline-flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
          aria-label="إرسال"
        >
          <Send className="size-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  )
}
