import React, { useState, useEffect, useMemo } from "react"
import {
  Calendar,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  X,
  Check,
  User,
  Video,
  Clock,
  Paperclip,
  Filter,
  RotateCcw,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react"
import AdminLayout from "../../../components/layout/AdminLayout"
import ConfirmDeleteModal from "../../../components/ui/ConfirmDeleteModal"
import EmptyState from "../../../components/ui/EmptyState"
import { ImageUploadField } from "../../../components/admin/ImageUploadField"
import { supabase } from "../../../lib/supabase/client"

// ملاحظة مهمة: هذا النموذج يطابق تماماً أعمدة جدول "seminars" الفعلي في Supabase
// (title, speaker, speaker_title, video_url, event_date, event_time, agenda,
// attachment_url, status). كانت النسخة القديمة من هذه الصفحة ترسل أعمدة غير
// موجودة أصلاً في الجدول (organizer, location, is_online, slug, category_id)
// وهو ما كان يتسبب في فشل الحفظ/التعديل بصمت (خطأ من قاعدة البيانات).
export interface Seminar {
  id: string
  title: string
  speaker: string
  speaker_title?: string | null
  video_url: string
  event_date?: string | null
  event_time?: string | null
  agenda?: string | null
  attachment_url?: string | null
  image_url?: string | null
  status?: string | null
  created_at?: string | null
}

interface SeminarsPageProps {
  onNavigate?: (path: string) => void
}

const STATUS_OPTIONS = [
  { value: "published", label: "منشورة" },
  { value: "draft", label: "مسودة" },
]

export function SeminarsPage({ onNavigate }: SeminarsPageProps) {
  const [seminars, setSeminars] = useState<Seminar[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // حالة Modal التأكيد والحذف
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false)
  const [seminarToDelete, setSeminarToDelete] = useState<Seminar | null>(null)
  const [deleting, setDeleting] = useState<boolean>(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // حالة Modal الإضافة/التعديل
  const [formModalOpen, setFormModalOpen] = useState<boolean>(false)
  const [editingSeminar, setEditingSeminar] = useState<Seminar | null>(null)
  const [saving, setSaving] = useState<boolean>(false)
  const [formError, setFormError] = useState<string | null>(null)

  // حقول النموذج (مطابقة لأعمدة جدول seminars الحقيقية)
  const [title, setTitle] = useState<string>("")
  const [speaker, setSpeaker] = useState<string>("")
  const [speakerTitle, setSpeakerTitle] = useState<string>("")
  const [videoUrl, setVideoUrl] = useState<string>("")
  const [eventDate, setEventDate] = useState<string>("")
  const [eventTime, setEventTime] = useState<string>("")
  const [agenda, setAgenda] = useState<string>("")
  const [attachmentUrl, setAttachmentUrl] = useState<string>("")
  const [imageUrl, setImageUrl] = useState<string>("")
  const [status, setStatus] = useState<string>("published")

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      const { data, error } = await (supabase.from("seminars") as any)
        .select("*")
        .order("event_date", { ascending: false })

      if (error) throw error
      if (data) setSeminars(data as unknown as Seminar[])
    } catch (err) {
      console.error("خطأ أثناء جلب بيانات الندوات:", err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTitle("")
    setSpeaker("")
    setSpeakerTitle("")
    setVideoUrl("")
    setEventDate("")
    setEventTime("")
    setAgenda("")
    setAttachmentUrl("")
    setImageUrl("")
    setStatus("published")
  }

  const handleOpenAddModal = () => {
    setEditingSeminar(null)
    setFormError(null)
    resetForm()
    setFormModalOpen(true)
  }

  const handleOpenEditModal = (seminar: Seminar) => {
    setEditingSeminar(seminar)
    setFormError(null)
    setTitle(seminar.title)
    setSpeaker(seminar.speaker || "")
    setSpeakerTitle(seminar.speaker_title || "")
    setVideoUrl(seminar.video_url || "")
    setEventDate(seminar.event_date ? seminar.event_date.split("T")[0] : "")
    setEventTime(seminar.event_time || "")
    setAgenda(seminar.agenda || "")
    setAttachmentUrl(seminar.attachment_url || "")
    setImageUrl(seminar.image_url || "")
    setStatus(seminar.status || "published")
    setFormModalOpen(true)
  }

  const handleSaveSeminar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setFormError("يرجى إدخال عنوان الندوة.")
      return
    }
    if (!speaker.trim()) {
      setFormError("يرجى إدخال اسم المحاضر/المتدخل.")
      return
    }
    if (!videoUrl.trim()) {
      setFormError("يرجى إدخال رابط الفيديو أو البث المباشر للندوة.")
      return
    }

    setSaving(true)
    setFormError(null)

    // نرسل فقط الأعمدة الموجودة فعلياً في جدول seminars
    const payload: Record<string, any> = {
      title: title.trim(),
      speaker: speaker.trim(),
      speaker_title: speakerTitle.trim() || null,
      video_url: videoUrl.trim(),
      event_date: eventDate || null,
      event_time: eventTime || null,
      agenda: agenda.trim() || null,
      attachment_url: attachmentUrl.trim() || null,
      image_url: imageUrl.trim() || null,
      status,
    }

    try {
      if (editingSeminar) {
        const { error } = await (supabase.from("seminars") as any)
          .update(payload)
          .eq("id", editingSeminar.id)

        if (error) throw error
      } else {
        const { error } = await (supabase.from("seminars") as any).insert([payload])

        if (error) throw error
      }

      await fetchInitialData()
      setFormModalOpen(false)
    } catch (err: any) {
      console.error("خطأ أثناء حفظ الندوة:", err)
      setFormError(err?.message || "حدث خطأ غير متوقع أثناء حفظ الندوة.")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!seminarToDelete) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const { error } = await (supabase.from("seminars") as any)
        .delete()
        .eq("id", seminarToDelete.id)

      if (error) throw error

      setSeminars((prev) => prev.filter((item) => item.id !== seminarToDelete.id))
      setDeleteModalOpen(false)
      setSeminarToDelete(null)
    } catch (err: any) {
      console.error("خطأ أثناء حذف الندوة:", err)
      setDeleteError(err?.message || "تعذر حذف الندوة. يرجى المحاولة مرة أخرى.")
    } finally {
      setDeleting(false)
    }
  }

  const resetFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
  }

  const filteredSeminars = useMemo(() => {
    return seminars.filter((item) => {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        item.title.toLowerCase().includes(query) ||
        (item.speaker && item.speaker.toLowerCase().includes(query)) ||
        (item.speaker_title && item.speaker_title.toLowerCase().includes(query))

      const matchesStatus = statusFilter === "all" || (item.status || "published") === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [seminars, searchQuery, statusFilter])

  return (
    <AdminLayout currentPath="/admin/seminars" onNavigate={onNavigate}>
      <div className="space-y-6" dir="rtl">
        {/* الترويسة والزر الرئيسي */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black text-foreground">الندوات والبثوث القانونية</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              إدارة الندوات المسجّلة والمباشرة (فيديو) التي تظهر في صفحة الفعاليات بالموقع.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:brightness-110 active:scale-95"
          >
            <Plus className="size-4" />
            <span>إضافة ندوة جديدة</span>
          </button>
        </div>

        {/* شريط البحث والفلترة */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث بعنوان الندوة أو اسم المحاضر..."
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
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            {(searchQuery || statusFilter !== "all") && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/50 px-2.5 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                title="إعادة ضبط الفلاتر"
              >
                <RotateCcw className="size-3.5" />
                <span className="hidden md:inline">تصفية</span>
              </button>
            )}
          </div>
        </div>

        {/* عداد النتائج */}
        {!loading && (
          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
            <span>
              إجمالي الندوات: <strong className="font-bold text-foreground">{filteredSeminars.length}</strong>
            </span>
          </div>
        )}

        {/* قائمة الندوات */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : filteredSeminars.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="لا توجد ندوات أو بثوث"
            description={
              searchQuery || statusFilter !== "all"
                ? "لم يتم العثور على أي نتائج تطابق محددات البحث."
                : "لم تقم بإضافة أي ندوة قانونية حتى الآن."
            }
            actionLabel={searchQuery || statusFilter !== "all" ? "إعادة ضبط البحث" : "إضافة ندوة جديدة"}
            actionIcon={searchQuery || statusFilter !== "all" ? RotateCcw : Plus}
            onAction={searchQuery || statusFilter !== "all" ? resetFilters : handleOpenAddModal}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSeminars.map((seminar) => (
              <div
                key={seminar.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition duration-200 animate-in fade-in hover:border-primary/50 hover:shadow-md"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                        (seminar.status || "published") === "published"
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {(seminar.status || "published") === "published" ? (
                        <>
                          <Eye className="size-3" /> منشورة
                        </>
                      ) : (
                        <>
                          <EyeOff className="size-3" /> مسودة
                        </>
                      )}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(seminar)}
                        className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        title="تعديل الندوة"
                      >
                        <Edit className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSeminarToDelete(seminar)
                          setDeleteModalOpen(true)
                        }}
                        className="grid size-8 place-items-center rounded-lg border border-border text-rose-500 transition hover:border-rose-500/20 hover:bg-rose-500/10"
                        title="حذف الندوة"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Agenda */}
                  <div>
                    <h3 className="line-clamp-2 text-sm font-extrabold leading-snug text-foreground transition-colors group-hover:text-primary">
                      {seminar.title}
                    </h3>
                    {seminar.agenda && (
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {seminar.agenda}
                      </p>
                    )}
                  </div>

                  {/* Metadata Info */}
                  <div className="space-y-1.5 border-t border-border/40 pt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <User className="size-3.5 shrink-0 text-primary" />
                      <span className="truncate">
                        {seminar.speaker}
                        {seminar.speaker_title ? ` — ${seminar.speaker_title}` : ""}
                      </span>
                    </div>

                    <a
                      href={seminar.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <Video className="size-3.5 shrink-0" />
                      <span className="truncate">رابط الفيديو / البث</span>
                    </a>

                    {seminar.attachment_url && (
                      <a
                        href={seminar.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 hover:text-foreground"
                      >
                        <Paperclip className="size-3.5 shrink-0" />
                        <span className="truncate">مرفق / وثيقة الندوة</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-semibold">
                    <Calendar className="size-3.5 text-primary" />
                    {seminar.event_date
                      ? new Date(seminar.event_date).toLocaleDateString("ar-MA", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "غير محدد"}
                  </span>
                  {seminar.event_time && (
                    <span className="flex items-center gap-1 font-semibold">
                      <Clock className="size-3.5 text-primary" />
                      {seminar.event_time}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal الإضافة والتعديل */}
        {formModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-all duration-200 animate-in fade-in"
            onClick={() => !saving && setFormModalOpen(false)}
          >
            <div
              className="w-full max-w-lg space-y-4 rounded-2xl border border-border bg-card p-6 shadow-2xl transition-all max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-base font-extrabold text-foreground">
                  {editingSeminar ? "تعديل الندوة القانونية" : "إضافة ندوة جديدة"}
                </h2>
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  disabled={saving}
                  className="rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
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

              <form onSubmit={handleSaveSeminar} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">عنوان الندوة *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: المستجدات التشريعية في مادة القانون التجاري..."
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground outline-none transition focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">المحاضر / المتدخل *</label>
                    <input
                      type="text"
                      value={speaker}
                      onChange={(e) => setSpeaker(e.target.value)}
                      placeholder="مثال: د. عبد الله أستاذ القانون الخاص"
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground outline-none transition focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">صفة/لقب المحاضر</label>
                    <input
                      type="text"
                      value={speakerTitle}
                      onChange={(e) => setSpeakerTitle(e.target.value)}
                      placeholder="مثال: أستاذ التعليم العالي، كلية الحقوق أكدال"
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground outline-none transition focus:border-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">رابط الفيديو / البث المباشر *</label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... أو رابط البث المباشر"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-left font-mono text-xs text-foreground outline-none transition focus:border-primary"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">محاور / برنامج الندوة</label>
                  <textarea
                    rows={3}
                    value={agenda}
                    onChange={(e) => setAgenda(e.target.value)}
                    placeholder="تفاصيل محاور الندوة، الشركاء المنظمين، أو برنامج المداخلات..."
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground outline-none transition focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">تاريخ الانعقاد</label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none transition focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">توقيت الانعقاد</label>
                    <input
                      type="time"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none transition focus:border-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">رابط مرفق (اختياري)</label>
                  <input
                    type="url"
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    placeholder="رابط PDF لعرض تقديمي أو وثيقة مرافقة للندوة..."
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-left font-mono text-xs text-foreground outline-none transition focus:border-primary"
                    dir="ltr"
                  />
                </div>

                <ImageUploadField
                  label="صورة الندوة"
                  value={imageUrl}
                  onChange={setImageUrl}
                  folder="seminars"
                  helperText="تظهر في بطاقة الندوة ضمن صفحة الفعاليات."
                />

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">حالة النشر</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full cursor-pointer rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none transition focus:border-primary"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() => setFormModalOpen(false)}
                    disabled={saving}
                    className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground transition hover:bg-muted"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 transition hover:brightness-110 active:scale-95 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                    <span>حفظ البيانات</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal التأكيد قبل الحذف */}
        <ConfirmDeleteModal
          isOpen={deleteModalOpen}
          title="حذف الندوة القانونية"
          itemName={seminarToDelete?.title}
          description={
            deleteError ? (
              <span className="font-semibold text-destructive">{deleteError}</span>
            ) : (
              "هل أنت متأكد من رغبتك في حذف هذه الندوة؟ لا يمكن التراجع عن هذا الإجراء بعد تنفيذه."
            )
          }
          confirmLabel="نعم، احذف الندوة"
          cancelLabel="تراجع"
          isLoading={deleting}
          onConfirm={handleDeleteConfirm}
          onClose={() => {
            setDeleteModalOpen(false)
            setSeminarToDelete(null)
            setDeleteError(null)
          }}
        />
      </div>
    </AdminLayout>
  )
}

export default SeminarsPage