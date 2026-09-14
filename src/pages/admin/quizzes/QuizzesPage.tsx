import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ListChecks,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  X,
  Check,
  AlertCircle,
  Filter,
  Database,
  HardDrive,
  Save,
} from "lucide-react"
import AdminLayout from "../../../components/layout/AdminLayout"
import ConfirmDeleteModal from "../../../components/ui/ConfirmDeleteModal"
import EmptyState from "../../../components/ui/EmptyState"
import {
  deleteQuestion,
  loadAllQuestions,
  loadSeedQuestions,
  saveQuestion,
  validateQuestion,
} from "../../../lib/quiz/repository"
import { DIFFICULTY_LABEL, TIER_LABEL } from "../../../lib/quiz/engine"
import type {
  ConcoursBody,
  Difficulty,
  InterviewTrack,
  QuizQuestion,
  QuizTier,
  Semester,
} from "../../../types/quiz"

const TIERS: QuizTier[] = ["university", "general", "concours", "interview"]
const SEMESTERS: Semester[] = ["S1", "S2", "S3", "S4", "S5", "S6"]
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"]

const BODIES: Array<{ id: ConcoursBody; label: string }> = [
  { id: "police", label: "الأمن الوطني" },
  { id: "judiciary", label: "القضاء وكتابة الضبط" },
  { id: "civil_service", label: "الوظيفة العمومية" },
  { id: "auxiliary", label: "القوات المساعدة" },
  { id: "customs", label: "الجمارك" },
  { id: "general", label: "مباريات مشتركة" },
]

const TRACKS: Array<{ id: InterviewTrack; label: string }> = [
  { id: "internship", label: "تدريب" },
  { id: "job", label: "وظيفة قانونية" },
  { id: "ethics", label: "أخلاقيات المهنة" },
  { id: "softskills", label: "مهارات التواصل" },
]

type Draft = QuizQuestion

function emptyDraft(): Draft {
  return {
    id: "",
    tier: "university",
    semester: "S1",
    module: "",
    body: null,
    track: null,
    difficulty: "medium",
    question: "",
    options: ["", "", "", ""],
    answer: 0,
    explanation: "",
    reference: "",
    source: "cms",
  }
}

/**
 * لوحة إدارة بنك الأسئلة (/admin/quizzes).
 *
 * تُظهر بنك الأسئلة كاملاً (المحلي + المحفوظ في Supabase + المحفوظ على
 * الجهاز)، وتسمح بإضافة سؤال أو تعديله أو حذفه. الحفظ يمر عبر
 * src/lib/quiz/repository.ts الذي يستعمل Supabase أولاً، فإن تعذّر الاتصال
 * يحفظ على الجهاز ويُعلم المشرف بذلك صراحةً (لا صمت ولا فقدان للعمل).
 */
export default function QuizzesPage({ onNavigate }: { onNavigate?: (path: string) => void }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [tierFilter, setTierFilter] = useState<QuizTier | "all">("all")

  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [questionToDelete, setQuestionToDelete] = useState<QuizQuestion | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async (force = false) => {
    setRefreshing(true)
    try {
      const all = await loadAllQuestions({ force })
      setQuestions(all)
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const seedIds = useMemo(() => new Set<string>(), [])

  useEffect(() => {
    loadSeedQuestions().then((seed) => seed.forEach((question) => seedIds.add(question.id)))
  }, [seedIds])

  const filtered = useMemo(() => {
    return questions.filter((question) => {
      if (tierFilter !== "all" && question.tier !== tierFilter) return false
      if (!searchQuery.trim()) return true
      const query = searchQuery.trim()
      return (
        question.question.includes(query) ||
        question.explanation.includes(query) ||
        (question.module ?? "").includes(query) ||
        (question.reference ?? "").includes(query) ||
        question.options.some((option) => option.includes(query))
      )
    })
  }, [questions, searchQuery, tierFilter])

  const stats = useMemo(() => {
    const perTier: Record<string, number> = { university: 0, general: 0, concours: 0, interview: 0 }
    let cms = 0
    questions.forEach((question) => {
      perTier[question.tier] = (perTier[question.tier] ?? 0) + 1
      if (question.source === "cms") cms += 1
    })
    return { total: questions.length, cms, seed: questions.length - cms, perTier }
  }, [questions])

  const openAdd = () => {
    setDraft(emptyDraft())
    setErrors([])
    setModalOpen(true)
  }

  const openEdit = (question: QuizQuestion) => {
    setDraft({
      ...question,
      module: question.module ?? "",
      reference: question.reference ?? "",
      semester: question.semester ?? "S1",
      body: question.body ?? "police",
      track: question.track ?? "internship",
    })
    setErrors([])
    setModalOpen(true)
  }

  const handleSave = async () => {
    const result = validateQuestion(draft)
    if (!result.valid) {
      setErrors(result.errors)
      return
    }
    setSaving(true)
    setErrors([])
    const saved = await saveQuestion({
      ...draft,
      semester: draft.tier === "university" ? draft.semester : null,
      module: draft.tier === "university" ? draft.module || null : null,
      body: draft.tier === "concours" ? draft.body : null,
      track: draft.tier === "interview" ? draft.track : null,
    })
    setSaving(false)
    setStatus({ tone: saved.synced ? "ok" : "error", text: saved.message })
    setModalOpen(false)
    await load(true)
  }

  const handleDelete = async () => {
    if (!questionToDelete) return
    setDeleting(true)
    const result = await deleteQuestion(questionToDelete.id)
    setDeleting(false)
    setDeleteModalOpen(false)
    setQuestionToDelete(null)
    setStatus({ tone: result.synced ? "ok" : "error", text: result.message })
    await load(true)
  }

  return (
    <AdminLayout currentPath="/admin/quizzes" onNavigate={onNavigate}>
      <div className="space-y-6" dir="rtl">
        {/* الترويسة */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black text-foreground">بنك الأسئلة</h1>
            <p className="text-xs text-muted-foreground">
              إدارة أسئلة الاختبارات الأربعة: الكلية، العشوائي، المباريات، والمقابلات.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-[12.5px] font-extrabold text-foreground transition hover:border-primary/50"
              disabled={refreshing}
            >
              {refreshing ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              تحديث
            </button>
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-[12.5px] font-extrabold text-primary-foreground transition hover:opacity-90"
            >
              <Plus className="size-4" />
              سؤال جديد
            </button>
          </div>
        </div>

        {/* بطاقات الإحصاء */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier) => (
            <div key={tier} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <ListChecks className="size-4 text-primary" aria-hidden="true" />
                <p className="text-[12.5px] font-extrabold text-foreground">{TIER_LABEL[tier]}</p>
              </div>
              <p className="mt-2 text-2xl font-black text-foreground" dir="ltr">
                {stats.perTier[tier] ?? 0}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11.5px] font-bold text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Database className="size-3.5" aria-hidden="true" />
            من قاعدة البيانات: {stats.cms}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <HardDrive className="size-3.5" aria-hidden="true" />
            من الملف المحلي: {stats.seed}
          </span>
          <span>الإجمالي: {stats.total}</span>
        </div>

        {status && (
          <p
            className={`flex items-center gap-2 rounded-xl border p-3 text-[12.5px] font-bold ${
              status.tone === "ok"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            }`}
          >
            <AlertCircle className="size-4" aria-hidden="true" />
            {status.text}
          </p>
        )}

        {/* البحث والفلترة */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="ابحث في نص السؤال، الشرح، المادة، أو السند..."
              className="w-full rounded-xl border border-border bg-card py-2.5 pr-10 pl-3 text-[13px] text-foreground outline-none transition focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" aria-hidden="true" />
            <select
              value={tierFilter}
              onChange={(event) => setTierFilter(event.target.value as QuizTier | "all")}
              className="rounded-xl border border-border bg-card px-3 py-2.5 text-[12.5px] font-bold text-foreground outline-none transition focus:border-primary"
            >
              <option value="all">كل المسارات</option>
              {TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {TIER_LABEL[tier]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* القائمة */}
        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-border bg-card p-10">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="لا توجد أسئلة مطابقة"
            description="عدّل كلمة البحث أو الفلترة، أو أضف سؤالاً جديداً من الزر أعلاه."
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((question) => (
              <div key={question.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-extrabold leading-6 text-foreground">{question.question}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10.5px] font-extrabold text-primary">
                        {TIER_LABEL[question.tier]}
                      </span>
                      {question.semester && (
                        <span className="rounded-full bg-accent-gold/10 px-2 py-0.5 text-[10.5px] font-extrabold text-accent-gold">
                          {question.semester}
                        </span>
                      )}
                      {question.module && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10.5px] font-bold text-muted-foreground">
                          {question.module}
                        </span>
                      )}
                      {question.body && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10.5px] font-bold text-muted-foreground">
                          {BODIES.find((item) => item.id === question.body)?.label ?? question.body}
                        </span>
                      )}
                      {question.track && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10.5px] font-bold text-muted-foreground">
                          {TRACKS.find((item) => item.id === question.track)?.label ?? question.track}
                        </span>
                      )}
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10.5px] font-bold text-muted-foreground">
                        {DIFFICULTY_LABEL[question.difficulty]}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] font-extrabold ${
                          question.source === "cms"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {question.source === "cms" ? "قاعدة البيانات" : "ملف محلي"}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[12px] leading-6 text-muted-foreground">
                      الإجابة الصحيحة: {question.options[question.answer]}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(question)}
                      className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                      title="تعديل السؤال"
                    >
                      <Edit className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQuestionToDelete(question)
                        setDeleteModalOpen(true)
                      }}
                      className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
                      title="حذف السؤال"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* نموذج الإضافة/التعديل */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm" dir="rtl">
          <div className="my-6 w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-[15px] font-extrabold text-foreground">
                {draft.id && !draft.id.startsWith("tmp-") ? "تعديل السؤال" : "سؤال جديد"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="إغلاق"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
              {/* المسار */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[12px] font-extrabold text-foreground">المسار</label>
                  <select
                    value={draft.tier}
                    onChange={(event) => setDraft({ ...draft, tier: event.target.value as QuizTier })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-primary"
                  >
                    {TIERS.map((tier) => (
                      <option key={tier} value={tier}>
                        {TIER_LABEL[tier]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-extrabold text-foreground">الصعوبة</label>
                  <select
                    value={draft.difficulty}
                    onChange={(event) => setDraft({ ...draft, difficulty: event.target.value as Difficulty })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-primary"
                  >
                    {DIFFICULTIES.map((item) => (
                      <option key={item} value={item}>
                        {DIFFICULTY_LABEL[item]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* حقول خاصة بالمسار */}
              {draft.tier === "university" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-extrabold text-foreground">الفصل الدراسي</label>
                    <select
                      value={draft.semester ?? "S1"}
                      onChange={(event) => setDraft({ ...draft, semester: event.target.value as Semester })}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-primary"
                    >
                      {SEMESTERS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-extrabold text-foreground">المادة</label>
                    <input
                      value={draft.module ?? ""}
                      onChange={(event) => setDraft({ ...draft, module: event.target.value })}
                      placeholder="القانون المدني"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-primary"
                    />
                  </div>
                </div>
              )}

              {draft.tier === "concours" && (
                <div>
                  <label className="mb-1.5 block text-[12px] font-extrabold text-foreground">المباراة المستهدفة</label>
                  <select
                    value={draft.body ?? "police"}
                    onChange={(event) => setDraft({ ...draft, body: event.target.value as ConcoursBody })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-primary"
                  >
                    {BODIES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {draft.tier === "interview" && (
                <div>
                  <label className="mb-1.5 block text-[12px] font-extrabold text-foreground">المحور</label>
                  <select
                    value={draft.track ?? "internship"}
                    onChange={(event) => setDraft({ ...draft, track: event.target.value as InterviewTrack })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-primary"
                  >
                    {TRACKS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* نص السؤال */}
              <div>
                <label className="mb-1.5 block text-[12px] font-extrabold text-foreground">نص السؤال</label>
                <textarea
                  rows={3}
                  value={draft.question}
                  onChange={(event) => setDraft({ ...draft, question: event.target.value })}
                  placeholder="اكتب السؤال بصيغة واضحة ومباشرة..."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] leading-6 text-foreground outline-none focus:border-primary"
                />
              </div>

              {/* الخيارات */}
              <div>
                <label className="mb-1.5 block text-[12px] font-extrabold text-foreground">
                  الخيارات (حدد الخيار الصحيح)
                </label>
                <div className="space-y-2">
                  {draft.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correct-answer"
                        checked={draft.answer === index}
                        onChange={() => setDraft({ ...draft, answer: index })}
                        className="size-4 accent-primary"
                        aria-label={`الخيار ${index + 1} هو الصحيح`}
                      />
                      <input
                        value={option}
                        onChange={(event) => {
                          const options = [...draft.options]
                          options[index] = event.target.value
                          setDraft({ ...draft, options })
                        }}
                        placeholder={`الخيار ${index + 1}`}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-primary"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* الشرح والسند */}
              <div>
                <label className="mb-1.5 block text-[12px] font-extrabold text-foreground">
                  الشرح (يظهر للمستخدم بعد الإجابة)
                </label>
                <textarea
                  rows={4}
                  value={draft.explanation}
                  onChange={(event) => setDraft({ ...draft, explanation: event.target.value })}
                  placeholder="اشرح لماذا هذا الجواب صحيح، ولماذا الخيارات الأخرى خاطئة..."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] leading-6 text-foreground outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-extrabold text-foreground">السند القانوني (اختياري)</label>
                <input
                  value={draft.reference ?? ""}
                  onChange={(event) => setDraft({ ...draft, reference: event.target.value })}
                  placeholder="الفصل 505 من القانون الجنائي"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-primary"
                />
              </div>

              {errors.length > 0 && (
                <ul className="space-y-1 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3">
                  {errors.map((error) => (
                    <li key={error} className="flex items-center gap-2 text-[12px] font-bold text-rose-700 dark:text-rose-300">
                      <AlertCircle className="size-3.5" aria-hidden="true" />
                      {error}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-border px-4 py-2.5 text-[12.5px] font-extrabold text-muted-foreground transition hover:text-foreground"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[12.5px] font-extrabold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                حفظ السؤال
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="حذف السؤال"
        itemName={questionToDelete?.question}
        description={
          questionToDelete?.source === "seed"
            ? "تحذير: هذا السؤال من الملف المحلي. سيُحذف من قاعدة البيانات فقط إن كان منسوخاً إليها، ولن يختفي من الملف المحلي إلا بعد تحديثه."
            : "سيُحذف هذا السؤال من بنك الأسئلة ولن يظهر للمستخدمين بعد الآن. لا يمكن التراجع عن هذا الإجراء."
        }
        confirmLabel="حذف السؤال"
        isLoading={deleting}
      />
    </AdminLayout>
  )
}
