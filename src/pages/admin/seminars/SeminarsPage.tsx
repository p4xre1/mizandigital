import { useState, useEffect, useMemo } from "react"
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

export default function SeminarsPage({ onNavigate }: SeminarsPageProps) {
  const [seminars, setSeminars] = useState<Seminar[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  // حالة Modal التأكيد والحذف
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false)
  const [seminarToDelete, setSeminarToDelete] = useState<Seminar | null>(null)
  const [deleting, setDeleting] = useState<boolean>(false)

  // حالة Modal الإضافة/التعديل
  const [formModalOpen, setFormModalOpen] = useState<boolean>(false)
  const [editingSeminar, setEditingSeminar] = useState<Seminar | null>(null)
  const [saving, setSaving] = useState<boolean>(false)

  // حقول النموذج
  const [title, setTitle] = useState<string>("")
  const [description, setDescription] = useState<string>("")
  const [speaker, setSpeaker] = useState<string>("")
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
        supabase
          .from("seminars")
          .select(`
            *,
            category:categories(id, name_ar, name_fr, slug)
          `)
          .order("event_date", { ascending: false }),
        supabase.from("categories").select("*"),
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
    setTitle("")
    setDescription("")
    setSpeaker("")
    setLocation("")
    setEventDate("")
    setIsOnline(false)
    setSlug("")
    setCategoryId("")
    setFormModalOpen(true)
  }

  const handleOpenEditModal = (seminar: Seminar) => {
    setEditingSeminar(seminar)
    setTitle(seminar.title)
    setDescription(seminar.description || "")
    setSpeaker(seminar.speaker || "")
    setLocation(seminar.location || "")
    setEventDate(seminar.event_date ? seminar.event_date.split("T")[0] : "")
    setIsOnline(!!seminar.is_online)
    setSlug(seminar.slug)
    setCategoryId(seminar.category_id || "")
    setFormModalOpen(true)
  }

  const handleSaveSeminar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) return

    setSaving(true)
    const finalSlug = slug || generateSlug(title)

    const payload = {
      title,
      description: description || null,
      speaker: speaker || null,
      location: isOnline ? "عبر الإنترنت (Online)" : location || null,
      event_date: eventDate || null,
      is_online: isOnline,
      slug: finalSlug,
      category_id: categoryId || null,
    }

    try {
      if (editingSeminar) {
        const { error } = await supabase
          .from("seminars")
          .update(payload)
          .eq("id", editingSeminar.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("seminars").insert([payload])
        if (error) throw error
      }

      await fetchInitialData()
      setFormModalOpen(false)
    } catch (err) {
      console.error("خطأ أثناء حفظ الندوة:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!seminarToDelete) return
    setDeleting(true)
    try {
      const { error } = await supabase
        .from("seminars")
        .delete()
        .eq("id", seminarToDelete.id)

      if (error) throw error

      setSeminars((prev) => prev.filter((item) => item.id !== seminarToDelete.id))
      setDeleteModalOpen(false)
      setSeminarToDelete(null)
    } catch (err) {
      console.error("خطأ أثناء حذف الندوة:", err)
    } finally {
      setDeleting(false)
    }
  }

  const filteredSeminars = useMemo(() => {
    return seminars.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.speaker && item.speaker.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.location && item.location.toLowerCase().includes(searchQuery.toLowerCase()))

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
            <p className="text-xs text-muted-foreground">
              إدارة الفعاليات واللقاءات العلمية والمحاضرات الأكاديمية.
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:brightness-110"
          >
            <Plus className="size-4" />
            إضافة ندوة جديدة
          </button>
        </div>

        {/* شريط البحث والفلترة */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث باسم الندوة، المحاضر، أو مكان الانعقاد..."
              className="w-full rounded-xl border border-border bg-background py-2 pr-9 pl-4 text-xs text-foreground outline-none transition focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-primary"
            >
              <option value="all">جميع التصنيفات</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name_ar}
                </option>
              ))}
            </select>
          </div>
        </div>

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
                ? "لم يتم العثور على أي نتائج تطابق البحث."
                : "لم تقم بإضافة أي ندوات أو مؤتمرات قانونية حتى الآن."
            }
            actionLabel="إضافة ندوة جديدة"
            onAction={handleOpenAddModal}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSeminars.map((seminar) => (
              <div
                key={seminar.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/50"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        seminar.is_online
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {seminar.is_online ? (
                        <>
                          <Video className="size-3" /> عبر الإنترنت
                        </>
                      ) : (
                        <>
                          <MapPin className="size-3" /> حضوري
                        </>
                      )}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(seminar)}
                        className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        title="تعديل الندوة"
                      >
                        <Edit className="size-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setSeminarToDelete(seminar)
                          setDeleteModalOpen(true)
                        }}
                        className="grid size-8 place-items-center rounded-lg border border-border text-destructive transition hover:bg-destructive/10"
                        title="حذف الندوة"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="line-clamp-2 text-sm font-bold text-foreground">
                      {seminar.title}
                    </h3>
                    {seminar.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {seminar.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-1 text-xs text-muted-foreground">
                    {seminar.speaker && (
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <User className="size-3.5 text-primary" />
                        <span>{seminar.speaker}</span>
                      </div>
                    )}

                    {seminar.location && !seminar.is_online && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-muted-foreground" />
                        <span>{seminar.location}</span>
                      </div>
                    )}
                  </div>
                </div>

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
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold">
                      <Tag className="size-3" />
                      {seminar.category.name_ar}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal الإضافة والتعديل */}
        {formModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-base font-bold text-foreground">
                  {editingSeminar ? "تعديل الندوة" : "إضافة ندوة جديدة"}
                </h2>
                <button
                  onClick={() => setFormModalOpen(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleSaveSeminar} className="space-y-4">
                <div className="space-y-1.5">
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
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">المحاضر / المؤطر الرئيسي</label>
                  <input
                    type="text"
                    value={speaker}
                    onChange={(e) => setSpeaker(e.target.value)}
                    placeholder="مثال: د. عبد الله أستاذ القانون الخاص"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">الوصف أو البرنامـج</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="تفاصيل محاور الندوة أو الشركاء المنظمين..."
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">تاريخ الانعقاد</label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">التصنيف</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                    >
                      <option value="">اختر التصنيف...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name_ar}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isOnline"
                    checked={isOnline}
                    onChange={(e) => setIsOnline(e.target.checked)}
                    className="size-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <label htmlFor="isOnline" className="text-xs font-bold text-foreground cursor-pointer">
                    الندوة تبث عبر الإنترنت (Online)
                  </label>
                </div>

                {!isOnline && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">مكان الانعقاد</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="مثال: مدرج رقم 1، كلية الحقوق الرباط"
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">الرابط الفريد (Slug)</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="seminar-commercial-law"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary dir-ltr text-right"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setFormModalOpen(false)}
                    className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-foreground transition hover:bg-muted"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                    حفظ
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal التأكيد قبل الحذف */}
        <ConfirmDeleteModal
          isOpen={deleteModalOpen}
          title="حذف الندوة"
          description={`هل أنت تأكد من رغبتك في حذف ندوة "${seminarToDelete?.title}"؟`}
          isLoading={deleting}
          onConfirm={handleDeleteConfirm}
          onClose={() => {
            setDeleteModalOpen(false)
            setSeminarToDelete(null)
          }}
        />
      </div>
    </AdminLayout>
  )
}