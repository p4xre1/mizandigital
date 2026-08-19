import React, { useState, useEffect, useMemo } from "react"
import {
  Scale,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  X,
  Check,
  RotateCcw,
  AlertCircle,
  Filter,
  Calendar,
  ExternalLink,
  Tag,
  BookOpen,
} from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import ConfirmDeleteModal from "../../components/ui/ConfirmDeleteModal"
import EmptyState from "../../components/ui/EmptyState"
import { supabase } from "../../lib/supabase/client"
import { generateSlug } from "../../lib/utils/generateSlug"
import type { Category } from "../../types/cms"

export interface Law {
  id: string
  title: string
  law_number?: string
  description?: string
  official_gazette_number?: string
  publication_date?: string
  pdf_url?: string
  slug: string
  category_id?: string
  created_at?: string
  category?: Category
}

interface LawsPageProps {
  onNavigate?: (path: string) => void
  currentPath?: string
}

export function LawsPage({ onNavigate, currentPath = "/admin/laws" }: LawsPageProps) {
  const [laws, setLaws] = useState<Law[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  // حالة Modal التأكيد والحذف
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false)
  const [lawToDelete, setLawToDelete] = useState<Law | null>(null)
  const [deleting, setDeleting] = useState<boolean>(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // حالة Modal الإضافة/التعديل
  const [formModalOpen, setFormModalOpen] = useState<boolean>(false)
  const [editingLaw, setEditingLaw] = useState<Law | null>(null)
  const [saving, setSaving] = useState<boolean>(false)
  const [formError, setFormError] = useState<string | null>(null)

  // حقول النموذج
  const [title, setTitle] = useState<string>("")
  const [lawNumber, setLawNumber] = useState<string>("")
  const [description, setDescription] = useState<string>("")
  const [officialGazetteNumber, setOfficialGazetteNumber] = useState<string>("")
  const [publicationDate, setPublicationDate] = useState<string>("")
  const [pdfUrl, setPdfUrl] = useState<string>("")
  const [slug, setSlug] = useState<string>("")
  const [categoryId, setCategoryId] = useState<string>("")

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      const [lawsRes, catsRes] = await Promise.all([
        (supabase as any)
          .from("laws")
          .select(`
            *,
            category:categories(id, name_ar, name_fr, slug)
          `)
          .order("created_at", { ascending: false }),
        supabase.from("categories").select("*").order("name_ar", { ascending: true }),
      ])

      if (lawsRes.data) setLaws(lawsRes.data as unknown as Law[])
      if (catsRes.data) setCategories(catsRes.data as Category[])
    } catch (err) {
      console.error("خطأ أثناء جلب القوانين:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAddModal = () => {
    setEditingLaw(null)
    setFormError(null)
    setTitle("")
    setLawNumber("")
    setDescription("")
    setOfficialGazetteNumber("")
    setPublicationDate("")
    setPdfUrl("")
    setSlug("")
    setCategoryId("")
    setFormModalOpen(true)
  }

  const handleOpenEditModal = (law: Law) => {
    setEditingLaw(law)
    setFormError(null)
    setTitle(law.title)
    setLawNumber(law.law_number || "")
    setDescription(law.description || "")
    setOfficialGazetteNumber(law.official_gazette_number || "")
    setPublicationDate(law.publication_date ? law.publication_date.split("T")[0] : "")
    setPdfUrl(law.pdf_url || "")
    setSlug(law.slug)
    setCategoryId(law.category_id || "")
    setFormModalOpen(true)
  }

  const handleSaveLaw = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setFormError("يرجى إدخال عنوان القانون.")
      return
    }

    setSaving(true)
    setFormError(null)
    const finalSlug = slug.trim() || generateSlug(title)

    const payload: Record<string, any> = {
      title: title.trim(),
      law_number: lawNumber.trim() || null,
      description: description.trim() || null,
      official_gazette_number: officialGazetteNumber.trim() || null,
      publication_date: publicationDate || null,
      pdf_url: pdfUrl.trim() || null,
      slug: finalSlug,
      category_id: categoryId || null,
    }

    try {
      if (editingLaw) {
        const { error } = await (supabase as any)
          .from("laws")
          .update(payload)
          .eq("id", editingLaw.id)

        if (error) throw error
      } else {
        const { error } = await (supabase as any)
          .from("laws")
          .insert([payload])

        if (error) throw error
      }

      await fetchInitialData()
      setFormModalOpen(false)
    } catch (err: any) {
      console.error("خطأ أثناء حفظ القانون:", err)
      setFormError(err?.message || "حدث خطأ غير متوقع أثناء حفظ النص التشريعي.")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!lawToDelete) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const { error } = await (supabase as any)
        .from("laws")
        .delete()
        .eq("id", lawToDelete.id)

      if (error) throw error

      setLaws((prev) => prev.filter((item) => item.id !== lawToDelete.id))
      setDeleteModalOpen(false)
      setLawToDelete(null)
    } catch (err: any) {
      console.error("خطأ أثناء حذف القانون:", err)
      // نُبقي النافذة مفتوحة ونعرض الخطأ للمستخدم بدلاً من الفشل الصامت
      setDeleteError(err?.message || "تعذر حذف النص التشريعي. يرجى المحاولة مرة أخرى.")
    } finally {
      setDeleting(false)
    }
  }

  const resetFilters = () => {
    setSearchQuery("")
    setCategoryFilter("all")
  }

  const filteredLaws = useMemo(() => {
    return laws.filter((item) => {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        item.title.toLowerCase().includes(query) ||
        (item.law_number && item.law_number.toLowerCase().includes(query)) ||
        (item.official_gazette_number && item.official_gazette_number.toLowerCase().includes(query))

      const matchesCategory =
        categoryFilter === "all" || item.category_id === categoryFilter

      return matchesSearch && matchesCategory
    })
  }, [laws, searchQuery, categoryFilter])

  return (
    <AdminLayout currentPath={currentPath} onNavigate={onNavigate}>
      <div className="space-y-6" dir="rtl">
        {/* الترويسة والزر الرئيسي */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black text-foreground">القوانين والنصوص التشريعية</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              إدارة الأرشيف التشريعي، الظهائر الشريفة، والقوانين المحدثة لمنصة ميزان.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:brightness-110 active:scale-95"
          >
            <Plus className="size-4" />
            <span>إضافة قانون جديد</span>
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
              placeholder="البحث باسم القانون، رقم القانون (مثلاً 65.99)، أو الجريدة الرسمية..."
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
            <span>إجمالي النصوص التشريعية: <strong className="font-bold text-foreground">{filteredLaws.length}</strong></span>
          </div>
        )}

        {/* قائمة القوانين */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : filteredLaws.length === 0 ? (
          <EmptyState
            icon={Scale}
            title="لا توجد نصوص تشريعية"
            description={
              searchQuery || categoryFilter !== "all"
                ? "لم يتم العثور على أي نتائج تطابق معايير البحث."
                : "لم تقم بإضافة أي نصوص أو قوانين تشريعية حتى الآن."
            }
            actionLabel={searchQuery || categoryFilter !== "all" ? "إعادة ضبط البحث" : "إضافة قانون جديد"}
            actionIcon={searchQuery || categoryFilter !== "all" ? RotateCcw : Plus}
            onAction={searchQuery || categoryFilter !== "all" ? resetFilters : handleOpenAddModal}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredLaws.map((law) => (
              <div
                key={law.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition duration-200 animate-in fade-in hover:border-primary/50 hover:shadow-md"
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    {law.law_number ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
                        <Scale className="size-3" /> قانون رقم {law.law_number}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-muted bg-muted/50 px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
                        نص تشريعي
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      {law.pdf_url && (
                        <a
                          href={law.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          title="عرض النص كامل (PDF)"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(law)}
                        className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        title="تعديل القانون"
                      >
                        <Edit className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLawToDelete(law)
                          setDeleteModalOpen(true)
                        }}
                        className="grid size-8 place-items-center rounded-lg border border-border text-rose-500 transition hover:border-rose-500/20 hover:bg-rose-500/10"
                        title="حذف القانون"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="line-clamp-2 text-sm font-extrabold leading-snug text-foreground transition-colors group-hover:text-primary">
                      {law.title}
                    </h3>
                    {law.description && (
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {law.description}
                      </p>
                    )}
                  </div>

                  {/* Info Details */}
                  <div className="space-y-1 border-t border-border/40 pt-2 text-xs text-muted-foreground">
                    {law.official_gazette_number && (
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <BookOpen className="size-3.5 shrink-0 text-primary" />
                        <span>الجريدة الرسمية عدد: {law.official_gazette_number}</span>
                      </div>
                    )}

                    {law.publication_date && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
                        <span>
                          تاريخ النشر:{" "}
                          {new Date(law.publication_date).toLocaleDateString("ar-MA", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  {law.category ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted/80 px-2 py-0.5 text-[10px] font-bold text-foreground">
                      <Tag className="size-3 text-primary" />
                      {law.category.name_ar || (law.category as any).name}
                    </span>
                  ) : (
                    <span className="text-[10px]">عام</span>
                  )}

                  <span className="font-mono text-[10px] text-muted-foreground">{law.slug}</span>
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
                  {editingLaw ? "تعديل النص التشريعي" : "إضافة قانون جديد"}
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

              <form onSubmit={handleSaveLaw} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">عنوان القانون / النص التشريعي *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value)
                      if (!slug && !editingLaw) {
                        setSlug(generateSlug(e.target.value))
                      }
                    }}
                    placeholder="مثال: مدونة الشغل القانون رقم 65.99..."
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground outline-none transition focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">رقم القانون</label>
                    <input
                      type="text"
                      value={lawNumber}
                      onChange={(e) => setLawNumber(e.target.value)}
                      placeholder="مثال: 65.99 أو 09.08"
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground outline-none transition focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">عدد الجريدة الرسمية</label>
                    <input
                      type="text"
                      value={officialGazetteNumber}
                      onChange={(e) => setOfficialGazetteNumber(e.target.value)}
                      placeholder="مثال: 5210"
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground outline-none transition focus:border-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">الموجز أو الملاحظات القانونية</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="نظرة عامة على أحكام هذا القانون أو نطاق تطبيقه..."
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground outline-none transition focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">تاريخ النشر / الصدور</label>
                    <input
                      type="date"
                      value={publicationDate}
                      onChange={(e) => setPublicationDate(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none transition focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">التصنيف القانوني</label>
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

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">رابط ملف الـ PDF (اختياري)</label>
                  <input
                    type="url"
                    value={pdfUrl}
                    onChange={(e) => setPdfUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-left font-mono text-xs text-foreground outline-none transition focus:border-primary"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">الرابط الفريد (Slug)</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="law-labor-code-65-99"
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
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm transition hover:brightness-110 active:scale-95 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                    <span>حفظ النص التشريعي</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal التأكيد قبل الحذف */}
        <ConfirmDeleteModal
          isOpen={deleteModalOpen}
          title="حذف النص التشريعي"
          itemName={lawToDelete?.title}
          description={
            deleteError ? (
              <span className="font-semibold text-destructive">{deleteError}</span>
            ) : (
              "هل أنت متأكد من رغبتك في حذف هذا النص التشريعي من الأرشيف الرقمي؟ لا يمكن التراجع عن هذا الإجراء."
            )
          }
          confirmLabel="نعم، احذف القانون"
          cancelLabel="تراجع"
          isLoading={deleting}
          onConfirm={handleDeleteConfirm}
          onClose={() => {
            setDeleteModalOpen(false)
            setLawToDelete(null)
            setDeleteError(null)
          }}
        />
      </div>
    </AdminLayout>
  )
}

export default LawsPage