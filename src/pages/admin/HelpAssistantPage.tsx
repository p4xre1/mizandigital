import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Bot, Check, Edit, Loader2, Plus, Save, Search, Shield, Trash2, X } from "lucide-react"
import ConfirmDeleteModal from "../../components/ui/ConfirmDeleteModal"
import {
  helpCms,
  previewHelpAnswerOnServer,
  validateHelpDraftOnServer,
  type HelpPreviewResult,
  type HelpQaRow,
  type HelpSettingsRow,
} from "../../lib/help/cmsService"
// ثوابت وتحويلات فقط: التحقق والمعاينة يتمان على الخادم (انظر cmsService.ts)
import {
  DEFAULT_MESSAGES,
  MAX_ANSWER_CHARS,
  MAX_KEYWORDS,
  MAX_MESSAGE_CHARS,
  MAX_QUESTION_CHARS,
  parseList,
} from "../../../shared/help/cms-constants.js"

type Tab = "qa" | "settings" | "preview" | "defenses"

const TABS: { id: Tab; label: string }[] = [
  { id: "qa", label: "الأسئلة والأجوبة" },
  { id: "settings", label: "الحماية والردود" },
  { id: "preview", label: "اختبار المساعد" },
  { id: "defenses", label: "الحمايات المدمجة" },
]

const MODE_LABELS: Record<string, string> = {
  answer: "جواب من المحتوى",
  not_found: "لا جواب",
  refused: "رفض (استشارة فردية)",
  blocked: "محظور (حقن، هندسة اجتماعية، أو عبارة محظورة)",
  out_of_topic: "خارج الموضوع",
  clarify: "توضيح مطلوب من السائل",
  insufficient: "لم يُتحقق من المصدر",
  disabled: "المساعد متوقف",
  unsupported_language: "لغة غير عربية",
}

type Draft = {
  id?: string
  question: string
  answer: string
  keywords: string
  sourceUrl: string
  sourceTitle: string
  published: boolean
}

const EMPTY_DRAFT: Draft = { question: "", answer: "", keywords: "", sourceUrl: "", sourceTitle: "", published: true }

const DEFENSES: { title: string; body: string }[] = [
  {
    title: "حقن الشيفرة والوسوم",
    body: "أي سؤال يحوي <script> أو <iframe> أو javascript: أو on…= أو eval( يُرفض برد محظور. كذلك تُفحص أسئلة المشرف وأجوبته قبل الحفظ.",
  },
  {
    title: "حقن التعليمات (Prompt injection)",
    body: "عبارات مثل \"تجاهل التعليمات السابقة\" أو \"اعرض تعليماتك\" أو \"system prompt\" أو \"developer mode\" تُرفض برد محظور دون كشف أي تفاصيل داخلية.",
  },
  {
    title: "الهندسة الاجتماعية",
    body: "انتحال صفة المدير أو المطور، وادعاء صلاحيات، وطلب بيانات مستخدمين آخرين أو كلمات مرورهم، وطلب المفاتيح أو الإعدادات الداخلية، ولعب الأدوار لتجاوز القواعد، ومحاولات الاختراق تُرفض برد محظور. بعد 3 محاولات مرفوضة خلال ساعة يُوقف المساعد الحساب مؤقتاً لمدة ساعة من آخر محاولة.",
  },
  {
    title: "الاستشارة القانونية في حالة فردية",
    body: "أسئلة مثل \"هل يحق لي…\" أو \"قضيتي…\" أو \"عندي محامي\" تُرفض وتُحال إلى محامٍ مسجل أو الجهة المختصة.",
  },
  {
    title: "الرد من النص المعتمد فقط",
    body: "لا يوجد نموذج لغوي يولّد نصاً حراً. الجواب يأتي من أسئلة منشورة يكتبها المشرف أو من محتوى الموقع المدمج، لذلك لا يمكن للمستخدم أن يدفع المساعد إلى قول شيء غير مكتوب.",
  },
  {
    title: "اللغة العربية فقط",
    body: "السؤال بغير العربية يتوقف برسالة توضح ذلك، ولا يُجاب عنه.",
  },
  {
    title: "تسجيل الدخول والحصة اليومية",
    body: "المساعد للمسجلين فقط، وكل مستخدم له 20 سؤالاً في اليوم كحد أقصى، مع حد إضافي لكل عنوان IP ضد الإغراق.",
  },
]

export default function HelpAssistantPage() {
  const [tab, setTab] = useState<Tab>("qa")
  const [rows, setRows] = useState<HelpQaRow[]>([])
  const [settingsRow, setSettingsRow] = useState<HelpSettingsRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null)

  // محرر الأسئلة
  const [draft, setDraft] = useState<Draft | null>(null)
  const [draftError, setDraftError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [toDelete, setToDelete] = useState<HelpQaRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  // نموذج الإعدادات
  const [enabled, setEnabled] = useState(true)
  const [messages, setMessages] = useState({ blocked: "", offTopic: "", notFound: "", disabled: "" })
  const [blockedText, setBlockedText] = useState("")
  const [offTopicText, setOffTopicText] = useState("")
  const [savingSettings, setSavingSettings] = useState(false)

  // اختبار
  const [testQuestion, setTestQuestion] = useState("")
  const [testResult, setTestResult] = useState<HelpPreviewResult | null>(null)
  const [testError, setTestError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    setLoadError(null)
    try {
      const [qa, settings] = await Promise.all([helpCms.listQa(), helpCms.getSettings()])
      setRows(qa)
      setSettingsRow(settings)
      setEnabled(settings?.enabled ?? true)
      setMessages({
        blocked: settings?.blocked_message ?? "",
        offTopic: settings?.off_topic_message ?? "",
        notFound: settings?.not_found_message ?? "",
        disabled: settings?.disabled_message ?? "",
      })
      setBlockedText((settings?.blocked_phrases ?? []).join("\n"))
      setOffTopicText((settings?.off_topic_terms ?? []).join("\n"))
    } catch (error) {
      setLoadError(
        `تعذّر تحميل البيانات: ${error instanceof Error ? error.message : "خطأ غير معروف"}. تأكد من تطبيق ترحيل help_assistant_cms على قاعدة البيانات.`,
      )
    } finally {
      setLoading(false)
    }
  }

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (row) => row.question.toLowerCase().includes(q) || row.answer.toLowerCase().includes(q) || (row.keywords ?? []).some((k) => k.toLowerCase().includes(q)),
    )
  }, [rows, search])

  // ---------- الأسئلة ----------

  function openNew() {
    setDraft({ ...EMPTY_DRAFT })
    setDraftError(null)
    setStatus(null)
  }

  function openEdit(row: HelpQaRow) {
    setDraft({
      id: row.id,
      question: row.question,
      answer: row.answer,
      keywords: (row.keywords ?? []).join("، "),
      sourceUrl: row.source_url ?? "",
      sourceTitle: row.source_title ?? "",
      published: row.published,
    })
    setDraftError(null)
    setStatus(null)
  }

  async function saveDraft(event: FormEvent) {
    event.preventDefault()
    if (!draft) return
    const keywords = parseList(draft.keywords)
    setSaving(true)
    setDraftError(null)
    try {
      const error = await validateHelpDraftOnServer("qa", {
        question: draft.question,
        answer: draft.answer,
        keywords,
        sourceUrl: draft.sourceUrl,
      })
      if (error) {
        setDraftError(error)
        return
      }
      await helpCms.saveQa({
        id: draft.id,
        question: draft.question.trim(),
        answer: draft.answer.trim(),
        keywords,
        source_url: draft.sourceUrl.trim() || null,
        source_title: draft.sourceTitle.trim() || null,
        published: draft.published,
      })
      setDraft(null)
      setStatus({ kind: "ok", text: "تم حفظ السؤال." })
      await load()
    } catch (err) {
      setDraftError(`تعذّر الحفظ: ${err instanceof Error ? err.message : "خطأ غير معروف"}`)
    } finally {
      setSaving(false)
    }
  }

  async function togglePublished(row: HelpQaRow) {
    try {
      await helpCms.saveQa({
        id: row.id,
        question: row.question,
        answer: row.answer,
        keywords: row.keywords ?? [],
        source_url: row.source_url,
        source_title: row.source_title,
        published: !row.published,
      })
      await load()
    } catch (err) {
      setStatus({ kind: "error", text: `تعذّر تغيير النشر: ${err instanceof Error ? err.message : "خطأ"}` })
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      await helpCms.deleteQa(toDelete.id)
      setToDelete(null)
      setStatus({ kind: "ok", text: "تم حذف السؤال." })
      await load()
    } catch (err) {
      setStatus({ kind: "error", text: `تعذّر الحذف: ${err instanceof Error ? err.message : "خطأ"}` })
    } finally {
      setDeleting(false)
    }
  }

  // ---------- الإعدادات ----------

  async function saveSettings(event: FormEvent) {
    event.preventDefault()
    const payload = {
      enabled,
      blocked_message: messages.blocked.trim() || null,
      off_topic_message: messages.offTopic.trim() || null,
      not_found_message: messages.notFound.trim() || null,
      disabled_message: messages.disabled.trim() || null,
      blocked_phrases: parseList(blockedText),
      off_topic_terms: parseList(offTopicText),
    }
    setSavingSettings(true)
    try {
      const error = await validateHelpDraftOnServer("settings", {
        messages: { blocked: payload.blocked_message ?? "", offTopic: payload.off_topic_message ?? "", notFound: payload.not_found_message ?? "", disabled: payload.disabled_message ?? "" },
        blockedPhrases: payload.blocked_phrases,
        offTopicTerms: payload.off_topic_terms,
      })
      if (error) {
        setStatus({ kind: "error", text: error })
        return
      }
      await helpCms.saveSettings(payload)
      setStatus({ kind: "ok", text: "تم حفظ إعدادات المساعد. تظهر التغييرات للزوار خلال دقيقة." })
      await load()
    } catch (err) {
      setStatus({ kind: "error", text: `تعذّر حفظ الإعدادات: ${err instanceof Error ? err.message : "خطأ"}` })
    } finally {
      setSavingSettings(false)
    }
  }

  // ---------- الاختبار ----------

  async function runTest(event: FormEvent) {
    event.preventDefault()
    const question = testQuestion.trim()
    if (question.length < 2) return
    // نفس خط المعالجة الذي يراه الزائر، لكن محسوباً على الخادم (القواعد لا تُشحن للمتصفح).
    setTestError(null)
    try {
      setTestResult(await previewHelpAnswerOnServer(question))
    } catch (err) {
      setTestResult(null)
      setTestError(err instanceof Error ? err.message : "تعذّرت المعاينة")
    }
  }

  const draftQuestionLength = draft?.question.length ?? 0
  const draftAnswerLength = draft?.answer.length ?? 0

  return (
    <div dir="rtl" className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-foreground">
            <Bot className="size-6" aria-hidden="true" /> مساعد الموقع
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            تحكّم في ما يجيب عنه مساعد الزوار: أسئلة وأجوبة، وحماية من الحقن وكلمات خارج الموضوع.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${enabled ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground"}`}
        >
          {enabled ? "المساعد يعمل" : "المساعد متوقف"}
        </span>
      </header>

      {loadError && (
        <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </p>
      )}
      {status && (
        <p
          role="status"
          className={`rounded-xl px-4 py-3 text-sm ${status.kind === "ok" ? "bg-emerald-500/10 text-emerald-800" : "bg-destructive/5 text-destructive"}`}
        >
          {status.text}
        </p>
      )}

      <nav className="flex flex-wrap gap-2 border-b border-border pb-2" aria-label="أقسام مساعد الموقع">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-pressed={tab === item.id}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === item.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/70"}`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> جارٍ التحميل…
        </div>
      )}

      {!loading && tab === "qa" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-60 flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث في الأسئلة والأجوبة"
                aria-label="بحث"
                className="w-full rounded-xl border border-border bg-background py-2 ps-9 pe-3 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={openNew}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
            >
              <Plus className="size-4" aria-hidden="true" /> سؤال جديد
            </button>
          </div>

          {draft && (
            <form onSubmit={saveDraft} className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <h2 className="text-base font-bold">{draft.id ? "تعديل سؤال" : "سؤال جديد"}</h2>
              <label className="block space-y-1">
                <span className="text-sm font-semibold">السؤال كما يكتبه الزائر</span>
                <input
                  value={draft.question}
                  onChange={(event) => setDraft({ ...draft, question: event.target.value })}
                  maxLength={MAX_QUESTION_CHARS}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  placeholder="مثال: كيف أسجل في الدورات؟"
                />
                <span className="text-xs text-muted-foreground">{draftQuestionLength} / {MAX_QUESTION_CHARS}</span>
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-semibold">الجواب</span>
                <textarea
                  value={draft.answer}
                  onChange={(event) => setDraft({ ...draft, answer: event.target.value })}
                  maxLength={MAX_ANSWER_CHARS}
                  rows={5}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm leading-7"
                />
                <span className="text-xs text-muted-foreground">{draftAnswerLength} / {MAX_ANSWER_CHARS} — نص عادي فقط، لا وسوم ولا روابط خارجية.</span>
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-semibold">كلمات مفتاحية (اختياري، مفصولة بفاصلة)</span>
                <input
                  value={draft.keywords}
                  onChange={(event) => setDraft({ ...draft, keywords: event.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  placeholder={`حتى ${MAX_KEYWORDS} كلمة، مثل: تسجيل، حساب`}
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-sm font-semibold">رابط المصدر (مسار داخلي، اختياري)</span>
                  <input
                    value={draft.sourceUrl}
                    onChange={(event) => setDraft({ ...draft, sourceUrl: event.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    placeholder="/archive أو /faq"
                    dir="ltr"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-semibold">نص الرابط</span>
                  <input
                    value={draft.sourceTitle}
                    onChange={(event) => setDraft({ ...draft, sourceTitle: event.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    placeholder="الأرشيف القانوني"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.published} onChange={(event) => setDraft({ ...draft, published: event.target.checked })} />
                منشور (يظهر للزوار)
              </label>
              {draftError && <p role="alert" className="text-sm text-destructive">{draftError}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60">
                  {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />} حفظ
                </button>
                <button type="button" onClick={() => setDraft(null)} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-bold">
                  <X className="size-4" aria-hidden="true" /> إلغاء
                </button>
              </div>
            </form>
          )}

          {filteredRows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              لا توجد أسئلة بعد. أضف أول سؤال وجوابه المعتمد.
            </p>
          ) : (
            <ul className="space-y-3">
              {filteredRows.map((row) => (
                <li key={row.id} className="space-y-2 rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-base font-bold">{row.question}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${row.published ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {row.published ? "منشور" : "مسودة"}
                    </span>
                  </div>
                  <p className="text-sm leading-7 text-muted-foreground">{row.answer}</p>
                  {(row.keywords ?? []).length > 0 && (
                    <p className="text-xs text-muted-foreground">الكلمات: {(row.keywords ?? []).join("، ")}</p>
                  )}
                  {row.source_url && <p className="text-xs text-muted-foreground" dir="ltr">{row.source_url}</p>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button type="button" onClick={() => openEdit(row)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold">
                      <Edit className="size-3.5" aria-hidden="true" /> تعديل
                    </button>
                    <button type="button" onClick={() => togglePublished(row)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold">
                      {row.published ? "إلغاء النشر" : "نشر"}
                    </button>
                    <button type="button" onClick={() => setToDelete(row)} className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-bold text-destructive">
                      <Trash2 className="size-3.5" aria-hidden="true" /> حذف
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!loading && tab === "settings" && (
        <form onSubmit={saveSettings} className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
            تفعيل المساعد للزوار
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            {(
              [
                ["blocked", "رد الحظر (حقن أو عبارة محظورة)", DEFAULT_MESSAGES.blocked],
                ["offTopic", "رد خارج الموضوع", DEFAULT_MESSAGES.offTopic],
                ["notFound", "رد عدم وجود جواب", DEFAULT_MESSAGES.notFound],
                ["disabled", "رد المساعد المتوقف", DEFAULT_MESSAGES.disabled],
              ] as const
            ).map(([key, label, fallback]) => (
              <label key={key} className="block space-y-1">
                <span className="text-sm font-semibold">{label}</span>
                <textarea
                  value={messages[key]}
                  onChange={(event) => setMessages({ ...messages, [key]: event.target.value })}
                  maxLength={MAX_MESSAGE_CHARS}
                  rows={3}
                  placeholder={fallback}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm leading-7"
                />
                <span className="text-xs text-muted-foreground">اتركه فارغاً لاستعمال النص الافتراضي.</span>
              </label>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-semibold">عبارات محظورة (سطر لكل عبارة)</span>
              <textarea
                value={blockedText}
                onChange={(event) => setBlockedText(event.target.value)}
                rows={6}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                placeholder="أي سؤال يحوي إحدى هذه العبارات كلمةً كاملة يُرفض برد الحظر"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-semibold">كلمات خارج الموضوع (سطر لكل كلمة)</span>
              <textarea
                value={offTopicText}
                onChange={(event) => setOffTopicText(event.target.value)}
                rows={6}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                placeholder="مثال: كرة القدم، الطقس، وصفة"
              />
            </label>
          </div>

          <p className="text-xs text-muted-foreground">
            تُطابق العبارات والكلمات كلمةً كاملة بعد تطبيع النص العربي. تُفحص قبل الجواب، لذلك تُغلق السؤال ولا تحتاج إلى جواب.
          </p>

          <button type="submit" disabled={savingSettings} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60">
            {savingSettings ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />} حفظ الإعدادات
          </button>
        </form>
      )}

      {!loading && tab === "preview" && (
        <section className="space-y-4">
          <p className="text-sm text-muted-foreground">
            يعمل الاختبار بالإعدادات والأسئلة المحفوظة، بالمحرك نفسه الذي يجيب الزوار. لا يستهلك أي حصة.
          </p>
          <form onSubmit={runTest} className="flex flex-wrap gap-2">
            <input
              value={testQuestion}
              onChange={(event) => setTestQuestion(event.target.value)}
              maxLength={MAX_QUESTION_CHARS}
              placeholder="اكتب سؤالاً كما يكتبه الزائر"
              aria-label="سؤال الاختبار"
              className="min-w-60 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
              اختبار
            </button>
          </form>
          {testError && <p className="text-sm text-destructive">{testError}</p>}
          {testResult && (
            <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-bold text-muted-foreground">النوع: {MODE_LABELS[testResult.mode] ?? testResult.mode}</p>
              <p className="whitespace-pre-line text-sm leading-7">{testResult.answer}</p>
              {testResult.sources.length > 0 && (
                <ul className="space-y-1 text-sm">
                  {testResult.sources.map((source) => (
                    <li key={`${source.url}-${source.title}`} className="text-primary">
                      {source.title} <span className="text-xs text-muted-foreground" dir="ltr">{source.url}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}

      {!loading && tab === "defenses" && (
        <section className="space-y-3">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="size-4" aria-hidden="true" /> هذه الحمايات تعمل دائماً في الخادم، ولا يمكن تعطيلها من لوحة الإدارة.
          </p>
          {DEFENSES.map((item) => (
            <article key={item.title} className="rounded-2xl border border-border bg-card p-4">
              <h2 className="text-sm font-bold">{item.title}</h2>
              <p className="mt-1 text-sm leading-7 text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </section>
      )}

      <ConfirmDeleteModal
        isOpen={toDelete !== null}
        title="حذف سؤال"
        description={`هل تريد حذف السؤال "${toDelete?.question ?? ""}"؟`}
        isLoading={deleting}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
