import { useEffect, useState, useCallback } from "react"
import {
  Mail, Inbox, Star, Paperclip, Search, RefreshCw, LogOut, LogIn,
  AlertCircle, CheckCircle2, Clock, User, ExternalLink, Reply,
  Archive, Trash2, MoreVertical, Filter, Loader2, Shield, Zap,
  MessageCircle, BookOpen, Handshake, AlertTriangle, Settings
} from "lucide-react"
import { useWebMCPTool } from "@/lib/webmcp/useWebMCPTool"
import {
  getConnectionStatus, connectGmail, disconnectGmail,
  listMessages, getMessage, markAsRead,
  executeGmailMCPTool,
  GMAIL_MCP_TOOLS,
  type GmailMessage, type GmailConnectionStatus
} from "@/lib/integrations/gmailService"

export default function GmailInboxPage() {
  const [status, setStatus] = useState<GmailConnectionStatus>({ connected: false })
  const [messages, setMessages] = useState<GmailMessage[]>([])
  const [selected, setSelected] = useState<GmailMessage | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "unread" | "starred" | "contact" | "support">("all")
  const [showMCP, setShowMCP] = useState(false)

  // WebMCP tools for AI agents
  useWebMCPTool({
    name: "gmail_list_messages",
    description: "List messages from contact@mizan.page inbox",
    properties: {
      query: { type: "string", description: "Search query" },
      maxResults: { type: "number", description: "Max results" }
    },
    execute: async (params) => executeGmailMCPTool("gmail_list_messages", params)
  })

  useWebMCPTool({
    name: "gmail_search_contact_messages",
    description: "Search contact/support messages in Gmail",
    properties: {
      category: { type: "string", enum: ["contact", "support", "law_question", "partnership", "all"] },
      days: { type: "number" }
    },
    execute: async (params) => executeGmailMCPTool("gmail_search_contact_messages", params)
  })

  const loadStatus = useCallback(async () => {
    const s = await getConnectionStatus()
    setStatus(s)
    return s
  }, [])

  const loadMessages = useCallback(async () => {
    setLoading(true)
    try {
      const filters: any = { maxResults: 30 }
      if (searchQuery) filters.query = searchQuery
      if (filter === "unread") filters.isUnread = true
      if (filter === "contact") filters.query = "contact OR استفسار"
      if (filter === "support") filters.query = "مشكلة OR خطأ OR لا يعمل"
      
      const { messages: msgs } = await listMessages(filters)
      let filtered = msgs
      if (filter === "starred") filtered = msgs.filter(m => m.isStarred)
      if (filter === "unread") filtered = msgs.filter(m => m.isUnread)
      
      setMessages(filtered)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, filter])

  useEffect(() => {
    loadStatus().then(() => loadMessages())
  }, [])

  useEffect(() => {
    const debounce = setTimeout(() => loadMessages(), 300)
    return () => clearTimeout(debounce)
  }, [searchQuery, filter, loadMessages])

  const handleConnect = async () => {
    setConnecting(true)
    const res = await connectGmail()
    if (res.success) {
      await loadStatus()
      await loadMessages()
    }
    setConnecting(false)
  }

  const handleDisconnect = async () => {
    await disconnectGmail()
    await loadStatus()
    setMessages([])
    setSelected(null)
  }

  const handleSelect = async (msg: GmailMessage) => {
    setSelected(msg)
    if (msg.isUnread) {
      await markAsRead(msg.id)
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isUnread: false } : m))
      setStatus(prev => ({ ...prev, unreadCount: Math.max(0, (prev.unreadCount || 1) - 1) }))
    }
  }

  const getCategoryIcon = (msg: GmailMessage) => {
    const subj = msg.subject.toLowerCase()
    if (subj.includes("شراكة") || subj.includes("partnership")) return <Handshake className="size-3.5 text-violet-600" />
    if (subj.includes("مشكلة") || subj.includes("خطأ") || subj.includes("لا يعمل")) return <AlertTriangle className="size-3.5 text-amber-600" />
    if (subj.includes("استفسار") || subj.includes("سؤال") || subj.includes("ملخص")) return <MessageCircle className="size-3.5 text-blue-600" />
    if (subj.includes("مدونة") || subj.includes("قانون")) return <BookOpen className="size-3.5 text-emerald-600" />
    return <Mail className="size-3.5 text-muted-foreground" />
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-red-500/10 text-red-600">
            <Mail className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-black text-foreground flex items-center gap-2">
              بريد contact@mizan.page
              <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-[10px] font-bold text-red-600">MCP Gmail</span>
            </h1>
            <p className="text-[12px] text-muted-foreground">
              ربط Gmail عبر MCP tools - رسائل الدعم، الاستفسارات، والشراكات
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMCP(!showMCP)}
            className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100 flex items-center gap-1.5"
          >
            <Zap className="size-4" /> MCP Tools ({GMAIL_MCP_TOOLS.length})
          </button>
          {status.connected ? (
            <button onClick={handleDisconnect} className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted flex items-center gap-1.5">
              <LogOut className="size-4" /> قطع الاتصال
            </button>
          ) : (
            <button onClick={handleConnect} disabled={connecting} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 disabled:opacity-50">
              {connecting ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />} ربط Gmail
            </button>
          )}
          <button onClick={loadMessages} className="rounded-xl border border-border bg-card p-2 text-muted-foreground hover:bg-muted">
            <RefreshCw className="size-4" />
          </button>
        </div>
      </div>

      {/* MCP Info */}
      {showMCP && (
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-violet-900 dark:text-violet-200">
            <Zap className="size-4" /> Gmail MCP Tools - للذكاء الاصطناعي
          </h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {GMAIL_MCP_TOOLS.map(tool => (
              <div key={tool.name} className="rounded-xl border border-violet-200 bg-white p-3 dark:bg-violet-950/30">
                <p className="text-[12px] font-bold text-foreground">{tool.name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{tool.description}</p>
                <p className="mt-1 text-[10px] text-violet-600">params: {Object.keys(tool.properties).join(", ") || "none"}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            هذه الأدوات متاحة لوكلاء AI عبر WebMCP (Chrome 146+) - يمكنهم قراءة بريد contact@mizan.page تلقائياً
          </p>
        </div>
      )}

      {/* Status */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className={`rounded-2xl border p-4 ${status.connected ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20" : "border-amber-200 bg-amber-50 dark:bg-amber-950/20"}`}>
          <div className="flex items-center gap-2">
            {status.connected ? <CheckCircle2 className="size-4 text-emerald-600" /> : <AlertCircle className="size-4 text-amber-600" />}
            <p className="text-[11px] font-bold">{status.connected ? "متصل" : "غير متصل"}</p>
          </div>
          <p className="mt-1 text-[12px] font-black text-foreground">{status.email || "contact@mizan.page"}</p>
          <p className="text-[10px] text-muted-foreground">{status.connected ? `آخر مزامنة: ${status.lastSync ? new Date(status.lastSync).toLocaleString("ar-MA") : "الآن"}` : "اضغط ربط Gmail للاتصال"}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] text-muted-foreground">إجمالي الرسائل</p>
          <p className="text-xl font-black text-foreground">{status.totalMessages || 0}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:bg-amber-950/20">
          <p className="text-[11px] font-bold text-amber-700">غير مقروءة</p>
          <p className="text-xl font-black text-foreground">{status.unreadCount || 0}</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:bg-blue-950/20">
          <p className="text-[11px] font-bold text-blue-700">رسائل اليوم</p>
          <p className="text-xl font-black text-foreground">{messages.filter(m => new Date(m.date).toDateString() === new Date().toDateString()).length}</p>
        </div>
      </div>

      {/* Main inbox */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* List */}
        <div className="flex w-full flex-col rounded-2xl border border-border bg-card md:w-[380px]">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ابحث في رسائل contact@mizan.page..."
                className="w-full rounded-xl border border-border bg-background py-2.5 pr-9 pl-3 text-xs"
              />
            </div>
            <div className="mt-2 flex gap-1 overflow-x-auto">
              {[
                { k: "all", l: "الكل" },
                { k: "unread", l: "غير مقروءة" },
                { k: "starred", l: "مميزة" },
                { k: "contact", l: "استفسارات" },
                { k: "support", l: "دعم" },
              ].map(f => (
                <button
                  key={f.k}
                  onClick={() => setFilter(f.k as any)}
                  className={`whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold ${filter === f.k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                  {f.l}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-primary" /></div>
            ) : messages.length === 0 ? (
              <div className="p-8 text-center">
                <Inbox className="mx-auto size-8 text-muted-foreground/50" />
                <p className="mt-2 text-xs text-muted-foreground">لا توجد رسائل</p>
                {!status.connected && <p className="mt-1 text-[11px] text-amber-600">اربط Gmail أولاً</p>}
              </div>
            ) : (
              messages.map(msg => (
                <button
                  key={msg.id}
                  onClick={() => handleSelect(msg)}
                  className={`w-full border-b border-border/50 p-3 text-right hover:bg-muted/50 transition text-start ${selected?.id === msg.id ? "bg-primary/5 border-r-2 border-r-primary" : ""} ${msg.isUnread ? "bg-blue-50/50 dark:bg-blue-950/10" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {getCategoryIcon(msg)}
                      <span className={`truncate text-[12px] ${msg.isUnread ? "font-black text-foreground" : "font-bold text-foreground/80"}`}>
                        {msg.fromName || msg.from.split("@")[0]}
                      </span>
                      {msg.isUnread && <span className="size-2 rounded-full bg-blue-600 shrink-0" />}
                      {msg.isStarred && <Star className="size-3 fill-amber-400 text-amber-400 shrink-0" />}
                      {msg.hasAttachment && <Paperclip className="size-3 text-muted-foreground shrink-0" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{new Date(msg.date).toLocaleDateString("ar-MA", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p className={`mt-1 line-clamp-1 text-[12px] ${msg.isUnread ? "font-bold text-foreground" : "text-muted-foreground"}`}>{msg.subject}</p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{msg.snippet}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail */}
        <div className="hidden flex-1 flex-col rounded-2xl border border-border bg-card md:flex">
          {selected ? (
            <>
              <div className="border-b border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[14px] font-black text-foreground">{selected.subject}</h2>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="size-3" />{selected.fromName || selected.from}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Clock className="size-3" />{new Date(selected.date).toLocaleString("ar-MA")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="rounded-lg border border-border p-2 hover:bg-muted"><Reply className="size-4" /></button>
                    <button className="rounded-lg border border-border p-2 hover:bg-muted"><Archive className="size-4" /></button>
                    <button className="rounded-lg border border-border p-2 hover:bg-muted"><MoreVertical className="size-4" /></button>
                  </div>
                </div>
                {selected.from && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-muted p-2.5 text-[11px]">
                    <Mail className="size-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">من:</span>
                    <span className="font-bold text-foreground">{selected.from}</span>
                    <span className="text-muted-foreground">إلى:</span>
                    <span className="font-bold text-foreground">{selected.to}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <div className="prose prose-sm max-w-none text-[13px] leading-7 text-foreground whitespace-pre-wrap">
                  {selected.body || selected.snippet}
                </div>
                {selected.attachments && selected.attachments.length > 0 && (
                  <div className="mt-6 rounded-xl border border-border bg-muted/50 p-3">
                    <p className="text-[11px] font-bold text-foreground flex items-center gap-1"><Paperclip className="size-3" /> مرفقات ({selected.attachments.length})</p>
                    <div className="mt-2 space-y-1">
                      {selected.attachments.map((att, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg bg-card p-2 border border-border">
                          <span className="text-[11px] font-bold">{att.filename}</span>
                          <span className="text-[10px] text-muted-foreground">{(att.size / 1000).toFixed(0)} KB</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t border-border p-3 flex items-center gap-2">
                <button className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground flex items-center gap-1.5">
                  <Reply className="size-4" /> رد
                </button>
                <button className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground">تحويل</button>
                <button className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground">أرشفة</button>
                <span className="mr-auto text-[10px] text-muted-foreground">MCP: gmail_read_message • {selected.id}</span>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <Mail className="size-12 text-muted-foreground/20" />
              <p className="mt-3 text-sm font-bold text-foreground">اختر رسالة لقراءتها</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-[300px]">رسائل contact@mizan.page تظهر هنا - استفسارات الطلبة، شراكات، دعم فني، وتنبيهات القوانين الجديدة</p>
              {!status.connected && (
                <button onClick={handleConnect} className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
                  ربط Gmail الآن
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile selected overlay */}
      {selected && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background p-4 md:hidden">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold">{selected.subject}</h2>
            <button onClick={() => setSelected(null)} className="rounded-lg border border-border p-2"><span className="text-xs">إغلاق</span></button>
          </div>
          <div className="flex-1 overflow-y-auto py-4 text-[13px] leading-7 whitespace-pre-wrap">{selected.body}</div>
        </div>
      )}

      {/* Setup instructions */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:bg-blue-950/20">
        <h3 className="flex items-center gap-2 text-[13px] font-bold text-blue-900 dark:text-blue-200"><Settings className="size-4" /> كيفية ربط Gmail الحقيقي</h3>
        <ol className="mt-2 list-decimal pr-5 text-[11px] leading-6 text-muted-foreground">
          <li>اذهب إلى <a href="https://console.cloud.google.com" target="_blank" className="text-primary underline">Google Cloud Console</a> وأنشئ مشروعاً</li>
          <li>فعّل Gmail API وأنشئ OAuth 2.0 credentials</li>
          <li>أضف redirect URI: <code className="bg-muted px-1 rounded">{window.location.origin}/auth/gmail/callback</code></li>
          <li>أضف متغيرات البيئة: <code>GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET</code></li>
          <li>أنشئ جدول <code>integrations</code> في Supabase مع تشفير التوكن</li>
          <li>حالياً يعمل بوضع mock مع 6 رسائل تجريبية تحاكي بريد contact@mizan.page</li>
        </ol>
      </div>
    </div>
  )
}
