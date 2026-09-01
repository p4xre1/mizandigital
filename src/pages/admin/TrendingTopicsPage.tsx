import { useEffect, useMemo, useState } from "react"
import {
  TrendingUp,
  Plus,
  Search,
  Trash2,
  Edit,
  Loader2,
  X,
  Check,
  AlertCircle,
  ExternalLink,
  Newspaper,
  Youtube,
  Twitter,
  FileText,
  RotateCcw,
  Filter,
} from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import ConfirmDeleteModal from "../../components/ui/ConfirmDeleteModal"
import EmptyState from "../../components/ui/EmptyState"
import { supabase } from "../../lib/supabase/client"
import { DEFAULT_KEYWORDS, CATEGORY_KEYWORDS } from "../../lib/seo/keywords"

interface TrendingTopic {
  id: string
  topic: string
  notes?: string | null
  category?: string | null
  status: "new" | "in_progress" | "published" | "archived"
  priority: "low" | "medium" | "high"
  source_note?: string | null
  created_at?: string
}

interface TrendingTopicsPageProps {
  onNavigate?: (path: string) => void
  currentPath?: string
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ")
}

// روابط بحث حية (بدون أي مفتاح API) لرصد الرائج قانونياً بالمغرب عبر أكثر من منصة
function buildResearchLinks(query: string) {
  const q = encodeURIComponent(query)
  return [
    {
      label: "Google Trends",
      icon: TrendingUp,
      url: `https://trends.google.com/trends/explore?geo=MA&q=${q}`,
    },
    {
      label: "أخبار Google",
      icon: Newspaper,
      url: `https://news.google.com/search?q=${q}&hl=ar&gl=MA&ceid=MA:ar`,
    },
    {
      label: "بحث Google",
      icon: Search,
      url: `https://www.google.com/search?q=${q}&gl=MA&hl=ar`,
    },
    {
      label: "X (تويتر)",
      icon: Twitter,
      url: `https://x.com/search?q=${q}&f=live`,
    },
    {
      label: "YouTube",
      icon: Youtube,
      url: `https://www.youtube.com/results?search_query=${q}`,
    },
  ]
}

const STATUS_LABELS: Record<TrendingTopic["status"], string> = {
  new: "جديد",
  in_progress: "قيد المعالجة",
  published: "تم النشر",
  archived: "مؤرشف",
}

const PRIORITY_LABELS: Record<TrendingTopic["priority"], string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
}

const PRIORITY_STYLES: Record<TrendingTopic["priority"], string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  high: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
}

export default function TrendingTopicsPage({ onNavigate, currentPath = "/admin/trends" }: TrendingTopicsPageProps) {
  const [topics, setTopics] = useState<TrendingTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // بحث سريع عن اتجاه جديد (بدون حفظه بالضرورة)
  const [quickQuery, setQuickQuery] = useState("")

  // Modal إضافة/تعديل
  const [formOpen, setFormOpen] = useState(false)
  const [editingTopic, setEditingTopic] = useState<TrendingTopic | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [topic, setTopic] = useState("")
  const [notes, setNotes] = useState("")
  const [category, setCategory] = useState("")
  const [status, setStatus] = useState<TrendingTopic["status"]>("new")
  const [priority, setPriority] = useState<TrendingTopic["priority"]>("medium")
  const [sourceNote, setSourceNote] = useState("")

  // حذف
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [topicToDelete, setTopicToDelete] = useState<TrendingTopic | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchTopics()
  }, [])

  const fetchTopics = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const { data, error } = await (supabase as any)
        .from("trending_topics")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setTopics((data as TrendingTopic[]) || [])
    } catch (err: any) {
      console.error("خطأ أثناء جلب الاتجاهات الرائجة:", err)
      setLoadError(
        "تعذر تحميل جدول الاتجاهات. تأكد من تنفيذ ملف migration الخاص بجدول trending_topics على Supabase."
      )
    } finally {
      setLoading(false)
    }
  }

  const seedTopics = useMemo(() => {
    const all = [...DEFAULT_KEYWORDS]
    Object.values(CATEGORY_KEYWORDS).forEach((arr) => all.push(...arr.slice(0, 2)))
    return Array.from(new Set(all)).slice(0, 14)
  }, [])

  const filteredTopics = useMemo(() => {
    return topics.filter((t) => {
      const q = searchQuery.trim().toLowerCase()
      const matchesQuery = !q || t.topic.toLowerCase().includes(q) || (t.notes || "").toLowerCase().includes(q)
      const matchesStatus = statusFilter === "all" || t.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [topics, searchQuery, statusFilter])

  const resetForm = () => {
    setTopic("")
    setNotes("")
    setCategory("")
    setStatus("new")
    setPriority("medium")
    setSourceNote("")
    setFormError(null)
  }

  const openAddModal = (prefill?: string) => {
    setEditingTopic(null)
    resetForm()
    if (prefill) setTopic(prefill)
    setFormOpen(true)
  }

  const openEditModal = (t: TrendingTopic) => {
    setEditingTopic(t)
    setTopic(t.topic)
    setNotes(t.notes || "")
    setCategory(t.category || "")
    setStatus(t.status)
    setPriority(t.priority)
    setSourceNote(t.source_note || "")
    setFormError(null)
    setFormOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) {
      setFormError("يرجى إدخال عنوان الموضوع الرائج.")
      return
    }
    setSaving(true)
    setFormError(null)

    const payload = {
      topic: topic.trim(),
      notes: notes.trim() || null,
      category: category || null,
      status,
      priority,
      source_note: sourceNote.trim() || null,
    }

    try {
      if (editingTopic) {
        const { error } = await (supabase as any)
          .from("trending_topics")
          .update(payload)
          .eq("id", editingTopic.id)
        if (error) throw error
      } else {
        const { error } = await (supabase as any).from("trending_topics").insert([payload])
        if (error) throw error
      }
      await fetchTopics()
      setFormOpen(false)
    } catch (err: any) {
      console.error("خطأ أثناء حفظ الموضوع الرائج:", err)
      setFormError(err?.message || "حدث خطأ غير متوقع أثناء الحفظ.")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!topicToDelete) return
    setDeleting(true)
    try {
      const { error } = await (supabase as any).from("trending_topics").delete().eq("id", topicToDelete.id)
      if (error) throw error
      setTopics((prev) => prev.filter((t) => t.id !== topicToDelete.id))
      setDeleteOpen(false)
      setTopicToDelete(null)
    } catch (err) {
      console.error("خطأ أثناء حذف الموضوع:", err)
    } finally {
      setDeleting(false)
    }
  }

  const handleConvertToArticle = (t: string) => {
    const path = `/admin/articles/new?keyword=${encodeURIComponent(t)}`
    if (onNavigate) onNavigate(path)
    else window.location.href = path
  }

  return (
    <AdminLayout currentPath={currentPath} onNavigate={onNavigate}>
      <div className="space-y-6" dir="rtl">
        {/* الترويسة */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black text-foreground">الاتجاهات القانونية الرائجة</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              ارصد المواضيع القانونية الرائجة بالمغرب من Google والمنصات المختلفة، وحوّلها بسرعة إلى محتوى جديد.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openAddModal()}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:brightness-110 active:scale-95"
          >
            <Plus className="size-4" />
            <span>رصد موضوع جديد</span>
          </button>
        </div>

        {/* أداة البحث السريع الخارجي */}
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" />
            <h2 className="text-sm font-extrabold text-foreground">بحث سريع عن اتجاه (بدون حفظ)</h2>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                placeholder="مثال: مدونة الأسرة الجديدة، قانون الإيجار..."
                className="w-full rounded-xl border border-border bg-background py-2 pr-9 pl-3 text-xs text-foreground outline-none transition focus:border-primary"
              />
            </div>
            <button
              type="button"
              onClick={() => quickQuery.trim() && openAddModal(quickQuery.trim())}
              disabled={!quickQuery.trim()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3.5 py-2 text-xs font-bold text-foreground transition hover:bg-muted disabled:opacity-40"
            >
              <Plus className="size-3.5" /> رصد كموضوع
            </button>
          </div>

          {quickQuery.trim() && (
            <div className="flex flex-wrap gap-2 pt-1">
              {buildResearchLinks(quickQuery.trim()).map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  title={link.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-[11px] font-bold text-foreground transition hover:bg-muted"
                >
                  <link.icon className="size-3.5 text-primary" />
                  {link.label}
                  <ExternalLink className="size-3 text-muted-foreground" />
                </a>
              ))}
            </div>
          )}

          {/* مقترحات انطلاقاً من بنك الكلمات المفتاحية الحالي */}
          {!quickQuery.trim() && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-muted-foreground">اقتراحات سريعة من بنك الكلمات المفتاحية:</span>
              <div className="flex flex-wrap gap-1.5">
                {seedTopics.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setQuickQuery(s)}
                    className="rounded-lg bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* شريط البحث والفلترة على الجدول المحفوظ */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث ضمن المواضيع المرصودة..."
              className="w-full rounded-xl border border-border bg-background py-2 pr-9 pl-8 text-xs text-foreground outline-none transition focus:border-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Filter className="size-4 shrink-0 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="cursor-pointer rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-primary"
            >
              <option value="all">جميع الحالات</option>
              {(Object.keys(STATUS_LABELS) as TrendingTopic["status"][]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            {(searchQuery || statusFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("")
                  setStatusFilter("all")
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/50 px-2.5 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <RotateCcw className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {loadError && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <AlertCircle className="size-4 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {/* قائمة المواضيع المرصودة */}
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : filteredTopics.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="لا توجد مواضيع رائجة مرصودة"
            description="ابدأ برصد أول موضوع قانوني رائج لتحويله لاحقاً إلى مقال أو خبر."
            actionLabel="رصد موضوع جديد"
            actionIcon={Plus}
            onAction={() => openAddModal()}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {filteredTopics.map((t) => (
              <div key={t.id} className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <h3 className="text-sm font-extrabold text-foreground">{t.topic}</h3>
                    {t.notes && <p className="text-xs text-muted-foreground">{t.notes}</p>}
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold", PRIORITY_STYLES[t.priority])}>
                    {PRIORITY_LABELS[t.priority]}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                  <span className="rounded-lg bg-muted px-2 py-0.5">{STATUS_LABELS[t.status]}</span>
                  {t.category && <span className="rounded-lg bg-muted px-2 py-0.5">{t.category}</span>}
                  {t.source_note && <span className="rounded-lg bg-muted px-2 py-0.5">المصدر: {t.source_note}</span>}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {buildResearchLinks(t.topic).slice(0, 3).map((link) => (
                    <a
                      key={link.label}
                      href={link.url}
                      title={link.label}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-[10px] font-bold text-foreground transition hover:bg-muted"
                    >
                      <link.icon className="size-3 text-primary" />
                      {link.label}
                    </a>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
                  <button
                    type="button"
                    onClick={() => handleConvertToArticle(t.topic)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
                  >
                    <FileText className="size-3.5" /> تحويل إلى مقال
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(t)}
                      className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      <Edit className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTopicToDelete(t)
                        setDeleteOpen(true)
                      }}
                      className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal إضافة/تعديل */}
        {formOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => !saving && setFormOpen(false)}
          >
            <div
              className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-base font-extrabold text-foreground">
                  {editingTopic ? "تعديل الموضوع الرائج" : "رصد موضوع رائج جديد"}
                </h2>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  disabled={saving}
                  className="rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              {formError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-bold text-rose-600 dark:text-rose-400">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">عنوان الموضوع *</label>
                  <input
                    type="text"
                    required
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="مثال: تعديلات مدونة الأسرة 2026"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground outline-none transition focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">ملاحظات</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="لماذا هذا الموضوع رائج الآن؟"
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground outline-none transition focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">الأولوية</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as TrendingTopic["priority"])}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground outline-none focus:border-primary"
                    >
                      {(Object.keys(PRIORITY_LABELS) as TrendingTopic["priority"][]).map((p) => (
                        <option key={p} value={p}>
                          {PRIORITY_LABELS[p]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">الحالة</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as TrendingTopic["status"])}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground outline-none focus:border-primary"
                    >
                      {(Object.keys(STATUS_LABELS) as TrendingTopic["status"][]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">مصدر الرصد (اختياري)</label>
                  <input
                    type="text"
                    value={sourceNote}
                    onChange={(e) => setSourceNote(e.target.value)}
                    placeholder="مثال: Google Trends، X، جريدة..."
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground outline-none transition focus:border-primary"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    disabled={saving}
                    className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground transition hover:bg-muted"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm transition hover:brightness-110 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                    <span>حفظ</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <ConfirmDeleteModal
          isOpen={deleteOpen}
          title="حذف الموضوع الرائج"
          itemName={topicToDelete?.topic}
          confirmLabel="نعم، احذف"
          cancelLabel="تراجع"
          isLoading={deleting}
          onConfirm={handleDeleteConfirm}
          onClose={() => {
            setDeleteOpen(false)
            setTopicToDelete(null)
          }}
        />
      </div>
    </AdminLayout>
  )
}
