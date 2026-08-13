import { useState, useEffect, useMemo } from "react"
import {
  BookOpen,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  X,
  Check,
  Filter,
  Tag,
} from "lucide-react"
import AdminLayout from "../../../components/layout/AdminLayout"
import ConfirmDeleteModal from "../../../components/ui/ConfirmDeleteModal"
import EmptyState from "../../../components/ui/EmptyState"
import { supabase } from "../../../lib/supabase/client"
import { generateSlug } from "../../../lib/utils/generateSlug"
import type { DictionaryTerm, Category } from "../../../types/cms"

interface LexiconPageProps {
  onNavigate?: (path: string) => void
}

export default function LexiconPage({ onNavigate }: LexiconPageProps) {
  const [terms, setTerms] = useState<DictionaryTerm[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  // حالة Modal التأكيد والحذف
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false)
  const [termToDelete, setTermToDelete] = useState<DictionaryTerm | null>(null)
  const [deleting, setDeleting] = useState<boolean>(false)

  // حالة Modal الإضافة/التعديل
  const [formModalOpen, setFormModalOpen] = useState<boolean>(false)
  const [editingTerm, setEditingTerm] = useState<DictionaryTerm | null>(null)
  const [saving, setSaving] = useState<boolean>(false)

  // حقول النموذج
  const [termAr, setTermAr] = useState<string>("")
  const [termFr, setTermFr] = useState<string>("")
  const [defAr, setDefAr] = useState<string>("")
  const [defFr, setDefFr] = useState<string>("")
  const [slug, setSlug] = useState<string>("")
  const [categoryId, setCategoryId] = useState<string>("")

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      const [termsRes, catsRes] = await Promise.all([
        supabase
          .from("dictionary_terms")
          .select(`
            *,
            category:categories(id, name_ar, name_fr, slug)
          `)
          .order("created_at", { ascending: false }),
        supabase.from("categories").select("*"),
      ])

      if (termsRes.error) throw termsRes.error
      if (catsRes.error) throw catsRes.error

      if (termsRes.data) setTerms(termsRes.data as unknown as DictionaryTerm[])
      if (catsRes.data) setCategories(catsRes.data as Category[])
    } catch (err) {
      console.error("خطأ في جلب بيانات المعجم:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAddModal = () => {
    setEditingTerm(null)
    setTermAr("")
    setTermFr("")
    setDefAr("")
    setDefFr("")
    setSlug("")
    setCategoryId("")
    setFormModalOpen(true)
  }

  const handleOpenEditModal = (term: DictionaryTerm) => {
    setEditingTerm(term)
    setTermAr(term.term_ar)
    setTermFr(term.term_fr)
    setDefAr(term.definition_ar)
    setDefFr(term.definition_fr || "")
    setSlug(term.slug)
    setCategoryId(term.category_id || "")
    setFormModalOpen(true)
  }

  const handleSaveTerm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!termAr || !termFr || !defAr) return

    setSaving(true)
    const finalSlug = slug || generateSlug(termFr || termAr)

    const payload = {
      term_ar: termAr,
      term_fr: termFr,
      definition_ar: defAr,
      definition_fr: defFr || null,
      slug: finalSlug,
      category_id: categoryId || null,
    }

    try {
      if (editingTerm) {
        const { error } = await supabase
          .from("dictionary_terms")
          .update(payload)
          .eq("id", editingTerm.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("dictionary_terms").insert([payload])
        if (error) throw error
      }

      await fetchInitialData()
      setFormModalOpen(false)
    } catch (err) {
      console.error("خطأ أثناء حفظ المصطلح:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!termToDelete) return
    setDeleting(true)
    try {
      const { error } = await supabase
        .from("dictionary_terms")
        .delete()
        .eq("id", termToDelete.id)

      if (error) throw error

      setTerms((prev) => prev.filter((item) => item.id !== termToDelete.id))
      setDeleteModalOpen(false)
      setTermToDelete(null)
    } catch (err) {
      console.error("خطأ أثناء حذف المصطلح:", err)
    } finally {
      setDeleting(false)
    }
  }

  const filteredTerms = useMemo(() => {
    return terms.filter((term) => {
      const matchesSearch =
        term.term_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.term_fr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.definition_ar.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory =
        categoryFilter === "all" || term.category_id === categoryFilter

      return matchesSearch && matchesCategory
    })
  }, [terms, searchQuery, categoryFilter])

  return (
    <AdminLayout currentPath="/lexicon" onNavigate={onNavigate}>
      <div className="space-y-6" dir="rtl">
        {/* الترويسة والزر الرئيسي */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black text-foreground">المعجم القانوني</h1>
            <p className="text-xs text-muted-foreground">
              إدارة المصطلحات القانونية المزدوجة (عربي / فرنسي) وتعريفاتها.
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:brightness-110"
          >
            <Plus className="size-4" />
            إضافة مصطلح جديد
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
              placeholder="البحث بالمصطلح أو التعريف (عربي/فرنسي)..."
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

        {/* جدول المصطلحات */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : filteredTerms.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="لا توجد مصطلحات قانونية"
              description={
                searchQuery || categoryFilter !== "all"
                  ? "لم يتم العثور على أي نتائج تطابق البحث."
                  : "لم تقم بإضافة أي مصطلحات حتى الآن."
              }
              actionLabel="إضافة مصطلح جديد"
              onAction={handleOpenAddModal}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3.5 font-bold">المصطلح بالعربية</th>
                    <th className="px-4 py-3.5 font-bold">المصطلح بالفرنسية</th>
                    <th className="px-4 py-3.5 font-bold">التعريف بالعربية</th>
                    <th className="px-4 py-3.5 font-bold">التصنيف</th>
                    <th className="px-4 py-3.5 font-bold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTerms.map((term) => (
                    <tr key={term.id} className="transition hover:bg-muted/30">
                      <td className="px-4 py-3.5 font-bold text-foreground">
                        {term.term_ar}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-muted-foreground dir-ltr text-right">
                        {term.term_fr}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        <p className="line-clamp-2 max-w-xs">{term.definition_ar}</p>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {term.category ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] font-medium">
                            <Tag className="size-3" />
                            {term.category.name_ar}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(term)}
                            className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            title="تعديل المصطلح"
                          >
                            <Edit className="size-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setTermToDelete(term)
                              setDeleteModalOpen(true)
                            }}
                            className="grid size-8 place-items-center rounded-lg border border-border text-destructive transition hover:bg-destructive/10"
                            title="حذف المصطلح"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal الإضافة والتعديل */}
        {formModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-base font-bold text-foreground">
                  {editingTerm ? "تعديل مصطلح قانوني" : "إضافة مصطلح جديد"}
                </h2>
                <button
                  onClick={() => setFormModalOpen(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleSaveTerm} className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      المصطلح (بالعربية) *
                    </label>
                    <input
                      type="text"
                      required
                      value={termAr}
                      onChange={(e) => {
                        setTermAr(e.target.value)
                        if (!slug && !editingTerm) {
                          setSlug(generateSlug(e.target.value))
                        }
                      }}
                      placeholder="مثال: القوة القاهرة"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      المصطلح (بالفرنسية) *
                    </label>
                    <input
                      type="text"
                      required
                      value={termFr}
                      onChange={(e) => setTermFr(e.target.value)}
                      placeholder="مثال: Force Majeure"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary dir-ltr text-right"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    التعريف القانوني (بالعربية) *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={defAr}
                    onChange={(e) => setDefAr(e.target.value)}
                    placeholder="شرح مفهوم المصطلح وأحكامه وفق التشريع..."
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    التعريف القانوني (بالفرنسية)
                  </label>
                  <textarea
                    rows={2}
                    value={defFr}
                    onChange={(e) => setDefFr(e.target.value)}
                    placeholder="Définition juridique en français..."
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground outline-none focus:border-primary dir-ltr text-right"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">التصنيف</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                    >
                      <option value="">بدون تصنيف...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name_ar}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">الرابط الفريد (Slug)</label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="force-majeure"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary dir-ltr text-right"
                    />
                  </div>
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
          title="حذف مصطلح"
          description={`هل أنت تأكد من رغبتك في حذف مصطلح "${termToDelete?.term_ar}"؟`}
          isLoading={deleting}
          onConfirm={handleDeleteConfirm}
          onClose={() => {
            setDeleteModalOpen(false)
            setTermToDelete(null)
          }}
        />
      </div>
    </AdminLayout>
  )
}