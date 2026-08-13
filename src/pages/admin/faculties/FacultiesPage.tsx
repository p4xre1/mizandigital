import { useState, useEffect, useMemo } from "react"
import {
  GraduationCap,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  MapPin,
  X,
  Check,
  Building2,
} from "lucide-react"
import AdminLayout from "../../../components/layout/AdminLayout"
import ConfirmDeleteModal from "../../../components/ui/ConfirmDeleteModal"
import EmptyState from "../../../components/ui/EmptyState"
import { supabase } from "../../../lib/supabase/client"
import { generateSlug } from "../../../lib/utils/generateSlug"
import type { Faculty } from "../../../types/cms"

interface FacultiesPageProps {
  onNavigate?: (path: string) => void
}

export default function FacultiesPage({ onNavigate }: FacultiesPageProps) {
  const [faculties, setFaculties] = useState<Faculty[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>("")

  // حالة Modal التأكيد والحذف
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false)
  const [facultyToDelete, setFacultyToDelete] = useState<Faculty | null>(null)
  const [deleting, setDeleting] = useState<boolean>(false)

  // حالة Modal الإضافة/التعديل
  const [formModalOpen, setFormModalOpen] = useState<boolean>(false)
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null)
  const [saving, setSaving] = useState<boolean>(false)

  // حقول النموذج
  const [nameAr, setNameAr] = useState<string>("")
  const [nameFr, setNameFr] = useState<string>("")
  const [city, setCity] = useState<string>("")
  const [slug, setSlug] = useState<string>("")

  useEffect(() => {
    fetchFaculties()
  }, [])

  const fetchFaculties = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("faculties")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      if (data) setFaculties(data as Faculty[])
    } catch (err) {
      console.error("خطأ في جلب بيانات الكليات:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAddModal = () => {
    setEditingFaculty(null)
    setNameAr("")
    setNameFr("")
    setCity("")
    setSlug("")
    setFormModalOpen(true)
  }

  const handleOpenEditModal = (faculty: Faculty) => {
    setEditingFaculty(faculty)
    setNameAr(faculty.name_ar)
    setNameFr(faculty.name_fr)
    setCity(faculty.city)
    setSlug(faculty.slug)
    setFormModalOpen(true)
  }

  const handleSaveFaculty = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameAr || !nameFr || !city) return

    setSaving(true)
    const finalSlug = slug || generateSlug(nameFr || nameAr)

    const payload = {
      name_ar: nameAr,
      name_fr: nameFr,
      city,
      slug: finalSlug,
    }

    try {
      if (editingFaculty) {
        const { error } = await supabase
          .from("faculties")
          .update(payload)
          .eq("id", editingFaculty.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("faculties").insert([payload])
        if (error) throw error
      }

      await fetchFaculties()
      setFormModalOpen(false)
    } catch (err) {
      console.error("خطأ أثناء حفظ الكلية:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!facultyToDelete) return
    setDeleting(true)
    try {
      const { error } = await supabase
        .from("faculties")
        .delete()
        .eq("id", facultyToDelete.id)

      if (error) throw error

      setFaculties((prev) => prev.filter((item) => item.id !== facultyToDelete.id))
      setDeleteModalOpen(false)
      setFacultyToDelete(null)
    } catch (err) {
      console.error("خطأ أثناء حذف الكلية:", err)
    } finally {
      setDeleting(false)
    }
  }

  const filteredFaculties = useMemo(() => {
    return faculties.filter(
      (fac) =>
        fac.name_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fac.name_fr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fac.city.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [faculties, searchQuery])

  return (
    <AdminLayout currentPath="/faculties" onNavigate={onNavigate}>
      <div className="space-y-6" dir="rtl">
        {/* الترويسة والزر الرئيسي */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black text-foreground">كليات ومعاهد الحقوق</h1>
            <p className="text-xs text-muted-foreground">
              إدارة دليل الكليات والمؤسسات الجامعية القانونية المعتمدة.
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:brightness-110"
          >
            <Plus className="size-4" />
            إضافة كلية جديدة
          </button>
        </div>

        {/* شريط البحث */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث باسم الكلية (عربي/فرنسي) أو المدينة..."
              className="w-full rounded-xl border border-border bg-background py-2 pr-9 pl-4 text-xs text-foreground outline-none transition focus:border-primary"
            />
          </div>
        </div>

        {/* قائمة الكليات */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : filteredFaculties.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="لا توجد كليات"
            description={
              searchQuery
                ? "لم يتم العثور على أي نتائج تطابق البحث."
                : "لم تقم بإضافة أي كليات أو معاهد قانونية حتى الآن."
            }
            actionLabel="إضافة كلية جديدة"
            onAction={handleOpenAddModal}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFaculties.map((faculty) => (
              <div
                key={faculty.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/50"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Building2 className="size-5" />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(faculty)}
                        className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        title="تعديل"
                      >
                        <Edit className="size-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setFacultyToDelete(faculty)
                          setDeleteModalOpen(true)
                        }}
                        className="grid size-8 place-items-center rounded-lg border border-border text-destructive transition hover:bg-destructive/10"
                        title="حذف"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-foreground">{faculty.name_ar}</h3>
                    <p className="text-xs font-semibold text-muted-foreground dir-ltr text-right">
                      {faculty.name_fr}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5 text-primary" />
                    {faculty.city}
                  </span>
                  <span className="text-[10px] dir-ltr font-mono bg-muted px-2 py-0.5 rounded-md">
                    {faculty.slug}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal الإضافة والتديل */}
        {formModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-base font-bold text-foreground">
                  {editingFaculty ? "تعديل بيانات الكلية" : "إضافة كلية جديدة"}
                </h2>
                <button
                  onClick={() => setFormModalOpen(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleSaveFaculty} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    اسم الكلية (بالعربية) *
                  </label>
                  <input
                    type="text"
                    required
                    value={nameAr}
                    onChange={(e) => {
                      setNameAr(e.target.value)
                      if (!slug && !editingFaculty) {
                        setSlug(generateSlug(e.target.value))
                      }
                    }}
                    placeholder="كلية العلوم القانونية والاقتصادية والاجتماعية أكدال"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    اسم الكلية (بالفرنسية) *
                  </label>
                  <input
                    type="text"
                    required
                    value={nameFr}
                    onChange={(e) => setNameFr(e.target.value)}
                    placeholder="FSJES Agdal"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary dir-ltr text-right"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">المدينة *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="الرباط"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">الرابط الفريد (Slug)</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="fsjes-agdal"
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
          title="حذف كلية"
          description={`هل أنت تأكد من رغبتك في حذف "${facultyToDelete?.name_ar}"؟`}
          isLoading={deleting}
          onConfirm={handleDeleteConfirm}
          onClose={() => {
            setDeleteModalOpen(false)
            setFacultyToDelete(null)
          }}
        />
      </div>
    </AdminLayout>
  )
}