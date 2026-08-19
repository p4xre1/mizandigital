import React, { useState, useEffect, useMemo } from "react"
import {
  Calendar,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  MapPin,
  X,
  Check,
  User,
  Video,
  Tag,
  Filter,
  Building2,
  RotateCcw,
  AlertCircle,
} from "lucide-react"
import AdminLayout from "../../../components/layout/AdminLayout"
import ConfirmDeleteModal from "../../../components/ui/ConfirmDeleteModal"
import EmptyState from "../../../components/ui/EmptyState"
import { supabase } from "../../../lib/supabase/client"
import { generateSlug } from "../../../lib/utils/generateSlug"
import type { Category } from "../../../types/cms"

export interface Seminar {
  id: string
  title: string
  description?: string
  speaker?: string
  organizer?: string
  location?: string
  event_date?: string
  is_online?: boolean
  slug: string
  category_id?: string
  created_at?: string
  category?: Category
}

interface SeminarsPageProps {
  onNavigate?: (path: string) => void
}

export function SeminarsPage({ onNavigate }: SeminarsPageProps) {
  const [seminars, setSeminars] = useState<Seminar[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

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

  // حقول النموذج
  const [title, setTitle] = useState<string>("")
  const [description, setDescription] = useState<string>("")
  const [speaker, setSpeaker] = useState<string>("")
  const [organizer, setOrganizer] = useState<string>("")
  const [location, setLocation] = useState<string>("")
  const [eventDate, setEventDate] = useState<string>("")
  const [isOnline, setIsOnline] = useState<boolean>(false)
  const [slug, setSlug] = useState<string>("")
  const [categoryId, setCategoryId] = useState<string>("")

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      const [seminarsRes, catsRes] = await Promise.all([
        (supabase.from("seminars") as any)
          .select(`
            *,
            category:categories(id, name_ar, name_fr, slug)
          `)
          .order("event_date", { ascending: false }),
        supabase.from("categories").select("*").order("name_ar", { ascending: true }),
      ])

      if (seminarsRes.data) setSeminars(seminarsRes.data as unknown as Seminar[])
      if (catsRes.data) setCategories(catsRes.data as Category[])
    } catch (err) {
      console.error("خطأ أثناء جلب بيانات الندوات:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAddModal = () => {
    setEditingSeminar(null)
    setFormError(null)
    setTitle("")
    setDescription("")
    setSpeaker("")
    setOrganizer("")
    setLocation("")
    setEventDate("")
    setIsOnline(false)
    setSlug("")
    setCategoryId("")
    setFormModalOpen(true)
  }

  const handleOpenEditModal = (seminar: Seminar) => {
    setEditingSeminar(seminar)
    setFormError(null)
    setTitle(seminar.title)
    setDescription(seminar.description || "")
    setSpeaker(seminar.speaker || "")
    setOrganizer(seminar.organizer || "")
    setLocation(seminar.location || "")
    setEventDate(seminar.event_date ? seminar.event_date.split("T")[0] : "")
    setIsOnline(!!seminar.is_online)
    setSlug(seminar.slug)
    setCategoryId(seminar.category_id || "")
    setFormModalOpen(true)
  }

  const handleSaveSeminar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setFormError("يرجى إدخال عنوان الندوة.")
      return
    }

    setSaving(true)
    setFormError(null)
    const finalSlug = slug.trim() || generateSlug(title)

    const payload: Record<string, any> = {
      title: title.trim(),
      description: description.trim() || null,
      speaker: speaker.trim() || null,
      organizer: organizer.trim() || null,
      location: isOnline ? "عبر الإنترنت (Online)" : location.trim() || null,
      event_date: eventDate || null,
      is_online: isOnline,
      slug: finalSlug,
      category_id: categoryId || null,
    }

    try {
      if (editingSeminar) {
        const { error } = await (supabase.from("seminars") as any)
          .update(payload)
          .eq("id", editingSeminar.id)

        if (error) throw error
      } else {
        const { error } = await (supabase.from("seminars") as any)
          .insert([payload])

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
    setCategoryFilter("all")
  }

  const filteredSeminars = useMemo(() => {
    return seminars.filter((item) => {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        item.title.toLowerCase().includes(query) ||
        (item.speaker && item.speaker.toLowerCase().includes(query)) ||
        (item.organizer && item.organizer.toLowerCase().includes(query)) ||
        (item.location && item.location.toLowerCase().includes(query))

      const matchesCategory =
        categoryFilter === "all" || item.category_id === categoryFilter

      return matchesSearch && matchesCategory
    })
  }, [seminars, searchQuery, categoryFilter])

  return (
    <AdminLayout currentPath="/seminars" onNavigate={onNavigate}>
      <div className="space-y-6" dir="rtl">
        {/* الترويسة والزر الرئيسي */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black text-foreground">الندوات والمؤتمرات القانونية</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              إدارة الفعاليات واللقاءات العلمية والمحاضرات الأكاديمية على منصة ميزان.
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
              placeholder="البحث باسم الندوة، المحاضر، الجهة المنظمة، أو المكان..."
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
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="cursor-pointer rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-primary"
            >
              <option value="all">جميع التصنيفات</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name_ar || (cat as any).name}
                </option>
              ))}
            </select>

            {(searchQuery || categoryFilter !== "all") && (
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
            <span>إجمالي الفعاليات: <strong className="font-bold text-foreground">{filteredSeminars.length}</strong></span>
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
            title="لا توجد ندوات أو مؤتمرات"
            description={
              searchQuery || categoryFilter !== "all"
                ? "لم يتم العثور على أي نتائج تطابق محددات البحث."
                : "لم تقم بإضافة أي ندوات أو مؤتمرات قانونية حتى الآن."
            }
            actionLabel={searchQuery || categoryFilter !== "all" ? "إعادة ضبط البحث" : "إضافة ندوة جديدة"}
            actionIcon={searchQuery || categoryFilter !== "all" ? RotateCcw : Plus}
            onAction={searchQuery || categoryFilter !== "all" ? resetFilters : handleOpenAddModal}
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
                        seminar.is_online
                          ? "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {seminar.is_online ? (
                        <>
                          <Video className="size-3" /> عن بُعد (Online)
                        </>
                      ) : (
                        <>
                          <MapPin className="size-3" /> حضوري
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

                  {/* Title & Description */}
                  <div>
                    <h3 className="line-clamp-2 text-sm font-extrabold leading-snug text-foreground transition-colors group-hover:text-primary">
                      {seminar.title}
                    </h3>
                    {seminar.description && (
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {seminar.description}
                      </p>
                    )}
                  </div>

                  {/* Metadata Info */}
                  <div className="space-y-1.5 border-t border-border/40 pt-2 text-xs text-muted-foreground">
                    {seminar.speaker && (
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <User className="size-3.5 shrink-0 text-primary" />
                        <span className="truncate">{seminar.speaker}</span>
                      </div>
                    )}

                    {seminar.organizer && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{seminar.organizer}</span>
                      </div>
                    )}

                    {seminar.location && !seminar.is_online && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{seminar.location}</span>
                      </div>
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

                  {seminar.category && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted/80 px-2 py-0.5 text-[10px] font-bold text-foreground">
                      <Tag className="size-3 text-primary" />
                      {seminar.category.name_ar || (seminar.category as any).name}
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
              className="w-full max-w-lg space-y-4 rounded-2xl border border-border bg-card p-6 shadow-2xl transition-all"
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
                    required
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value)
                      if (!slug && !editingSeminar) {
                        setSlug(generateSlug(e.target.value))
                      }
                    }}
                    placeholder="مثال: المستجدات التشريعية في مادة القانون التجاري..."
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground outline-none transition focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">المحاضر / المؤطر الرئيسي</label>
                    <input
                      type="text"
                      value={speaker}
                      onChange={(e) => setSpeaker(e.target.value)}
                      placeholder="مثال: د. عبد الله أستاذ القانون الخاص"
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground outline-none transition focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">الجهة المنظمة</label>
                    <input
                      type="text"
                      value={organizer}
                      onChange={(e) => setOrganizer(e.target.value)}
                      placeholder="مثال: كلية الحقوق أكدال"
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground outline-none transition focus:border-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">الوصف أو البرنامـج</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
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
                    <label className="text-xs font-bold text-foreground">التصنيف</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full cursor-pointer rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none transition focus:border-primary"
                    >
                      <option value="">اختر التصنيف...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name_ar || (cat as any).name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Checkbox Online */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isOnline"
                    checked={isOnline}
                    onChange={(e) => setIsOnline(e.target.checked)}
                    className="size-4 cursor-pointer rounded border-border text-primary focus:ring-primary"
                  />
                  <label htmlFor="isOnline" className="cursor-pointer select-none text-xs font-bold text-foreground">
                    الندوة تبث عبر الإنترنت (Online)
                  </label>
                </div>

                {!isOnline && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">مكان الانعقاد الحضوري</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="مثال: مدرج رقم 1، كلية الحقوق الرباط"
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground outline-none transition focus:border-primary"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">الرابط الفريد (Slug)</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="seminar-commercial-law"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-left font-mono text-xs text-foreground outline-none transition focus:border-primary"
                    dir="ltr"
                  />
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
              "هل أنت تأكد من رغبتك في حذف هذه الندوة من الأرشيف الرقمي؟ لا يمكن التراجع عن هذا الإجراء بعد تنفيذه."
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