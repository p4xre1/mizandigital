import React, { useState, useEffect, useMemo } from "react"
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
  Scale,
  GitBranch,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import AdminLayout from "../../../components/layout/AdminLayout"
import ConfirmDeleteModal from "../../../components/ui/ConfirmDeleteModal"
import EmptyState from "../../../components/ui/EmptyState"
import { supabase } from "../../../lib/supabase/client"
import { LegalTermTree } from "../../../components/lexicon/LegalTermTree"
import type { LexiconTerm, LegalSource } from "../../../types/cms"

interface LexiconPageProps {
  onNavigate?: (path: string) => void
}

// عنصر شجرة قانونية فارغ (قانون/مدونة جديدة بدون فصول بعد)
function emptyLegalSource(): LegalSource {
  return { code_ar: "", code_short: "", code_fr: "", articles: [{ number: "", phrase: "" }] }
}

export default function LexiconPage({ onNavigate }: LexiconPageProps) {
  const [terms, setTerms] = useState<LexiconTerm[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  // حالة Modal التأكيد والحذف
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false)
  const [termToDelete, setTermToDelete] = useState<LexiconTerm | null>(null)
  const [deleting, setDeleting] = useState<boolean>(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // حالة Modal الإضافة/التعديل
  const [formModalOpen, setFormModalOpen] = useState<boolean>(false)
  const [editingTerm, setEditingTerm] = useState<LexiconTerm | null>(null)
  const [saving, setSaving] = useState<boolean>(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // حقول النموذج
  const [termAr, setTermAr] = useState<string>("")
  const [termFr, setTermFr] = useState<string>("")
  const [definition, setDefinition] = useState<string>("")
  const [category, setCategory] = useState<string>("")

  // "الشجرة القانونية": مصفوفة القوانين/المدونات وفصولها المرتبطة بالمصطلح
  const [legalSources, setLegalSources] = useState<LegalSource[]>([])
  const [treeExpanded, setTreeExpanded] = useState<boolean>(false)

  useEffect(() => {
    fetchTerms()
  }, [])

  const fetchTerms = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("lexicon_terms")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      if (data) setTerms(data as any)
    } catch (err) {
      console.error("خطأ في جلب بيانات المعجم:", err)
    } finally {
      setLoading(false)
    }
  }

  // التصنيفات المتاحة مستخرجة من المصطلحات الحالية (لا يوجد جدول تصنيفات مرتبط)
  const availableCategories = useMemo(() => {
    const set = new Set<string>()
    terms.forEach((t) => {
      if (t.category) set.add(t.category)
    })
    return Array.from(set)
  }, [terms])

  const handleOpenAddModal = () => {
    setEditingTerm(null)
    setTermAr("")
    setTermFr("")
    setDefinition("")
    setCategory("")
    setLegalSources([])
    setTreeExpanded(false)
    setSaveError(null)
    setFormModalOpen(true)
  }

  const handleOpenEditModal = (term: LexiconTerm) => {
    setEditingTerm(term)
    setTermAr(term.term_ar)
    setTermFr(term.term_fr)
    setDefinition(term.definition)
    setCategory(term.category)
    setLegalSources(term.legal_sources && term.legal_sources.length > 0 ? term.legal_sources : [])
    setTreeExpanded(Boolean(term.legal_sources && term.legal_sources.length > 0))
    setSaveError(null)
    setFormModalOpen(true)
  }

  // ==== دوال التحكم في الشجرة القانونية ====

  const addLegalSource = () => {
    setLegalSources((prev) => [...prev, emptyLegalSource()])
    setTreeExpanded(true)
  }

  const removeLegalSource = (sourceIndex: number) => {
    setLegalSources((prev) => prev.filter((_, i) => i !== sourceIndex))
  }

  const updateLegalSource = (sourceIndex: number, field: keyof LegalSource, value: string) => {
    setLegalSources((prev) =>
      prev.map((source, i) => (i === sourceIndex ? { ...source, [field]: value } : source))
    )
  }

  const addArticle = (sourceIndex: number) => {
    setLegalSources((prev) =>
      prev.map((source, i) =>
        i === sourceIndex
          ? { ...source, articles: [...source.articles, { number: "", phrase: "" }] }
          : source
      )
    )
  }

  const removeArticle = (sourceIndex: number, articleIndex: number) => {
    setLegalSources((prev) =>
      prev.map((source, i) =>
        i === sourceIndex
          ? { ...source, articles: source.articles.filter((_, ai) => ai !== articleIndex) }
          : source
      )
    )
  }

  const updateArticle = (
    sourceIndex: number,
    articleIndex: number,
    field: "number" | "phrase",
    value: string
  ) => {
    setLegalSources((prev) =>
      prev.map((source, i) =>
        i === sourceIndex
          ? {
              ...source,
              articles: source.articles.map((article, ai) =>
                ai === articleIndex ? { ...article, [field]: value } : article
              ),
            }
          : source
      )
    )
  }

  // شجرة صالحة للمعاينة: فقط القوانين التي لها اسم وفصل واحد على الأقل بأرقام غير فارغة
  const previewSources = useMemo(
    () =>
      legalSources
        .filter((s) => s.code_ar.trim())
        .map((s) => ({ ...s, articles: s.articles.filter((a) => a.number.trim()) }))
        .filter((s) => s.articles.length > 0),
    [legalSources]
  )

  const handleSaveTerm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!termAr || !termFr || !definition || !category) return

    setSaving(true)
    setSaveError(null)

    // تنظيف الشجرة القانونية قبل الحفظ: حذف القوانين والفصول الفارغة تماماً
    const cleanedLegalSources: LegalSource[] = legalSources
      .filter((s) => s.code_ar.trim())
      .map((s) => ({
        code_ar: s.code_ar.trim(),
        code_short: s.code_short?.trim() || undefined,
        code_fr: s.code_fr?.trim() || undefined,
        articles: s.articles
          .filter((a) => a.number.trim())
          .map((a) => ({ number: a.number.trim(), phrase: a.phrase.trim() })),
      }))
      .filter((s) => s.articles.length > 0)

    const payload = {
      term_ar: termAr,
      term_fr: termFr,
      definition,
      category,
      legal_sources: cleanedLegalSources,
    }

    try {
      if (editingTerm) {
        const { error } = await supabase
          .from("lexicon_terms")
          .update(payload as any)
          .eq("id", editingTerm.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("lexicon_terms").insert([payload as any])
        if (error) throw error
      }

      await fetchTerms()
      setFormModalOpen(false)
    } catch (err: any) {
      console.error("خطأ أثناء حفظ المصطلح:", err)
      // إذا كان عمود legal_sources غير موجود بعد في قاعدة البيانات، نوضح ذلك للمستخدم
      const message: string = err?.message || ""
      if (message.toLowerCase().includes("legal_sources")) {
        setSaveError(
          "عمود \"الشجرة القانونية\" (legal_sources) غير موجود بعد في قاعدة البيانات. نفّذ ملف migration المرفق (20260823_create_laws_table.sql) من SQL Editor في Supabase ثم أعد المحاولة."
        )
      } else {
        setSaveError(message || "حدث خطأ غير متوقع أثناء حفظ المصطلح.")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!termToDelete) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const { error } = await supabase
        .from("lexicon_terms")
        .delete()
        .eq("id", termToDelete.id)

      if (error) throw error

      setTerms((prev) => prev.filter((item) => item.id !== termToDelete.id))
      setDeleteModalOpen(false)
      setTermToDelete(null)
    } catch (err: any) {
      console.error("خطأ أثناء حذف المصطلح:", err)
      setDeleteError(err?.message || "تعذر حذف المصطلح. يرجى المحاولة مرة أخرى.")
    } finally {
      setDeleting(false)
    }
  }

  const filteredTerms = useMemo(() => {
    return terms.filter((term) => {
      const matchesSearch =
        term.term_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.term_fr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.definition.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory =
        categoryFilter === "all" || term.category === categoryFilter

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
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
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
                    <th className="px-4 py-3.5 font-bold">التعريف</th>
                    <th className="px-4 py-3.5 font-bold">التصنيف</th>
                    <th className="px-4 py-3.5 font-bold text-center">الشجرة القانونية</th>
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
                        <p className="line-clamp-2 max-w-xs">{term.definition}</p>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {term.category ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] font-medium">
                            <Tag className="size-3" />
                            {term.category}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {term.legal_sources && term.legal_sources.length > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary">
                            <GitBranch className="size-3" />
                            {term.legal_sources.length} قوانين
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
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
            <div className="max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
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

              {saveError && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-semibold leading-relaxed text-rose-600 dark:text-rose-400">
                  {saveError}
                </div>
              )}

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
                      onChange={(e) => setTermAr(e.target.value)}
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
                    التعريف القانوني *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={definition}
                    onChange={(e) => setDefinition(e.target.value)}
                    placeholder="شرح مفهوم المصطلح وأحكامه وفق التشريع..."
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">التصنيف *</label>
                  <input
                    type="text"
                    required
                    list="lexicon-categories"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="مثال: القانون المدني"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                  />
                  <datalist id="lexicon-categories">
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>

                {/* ==== محرر الشجرة القانونية ==== */}
                <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
                  <button
                    type="button"
                    onClick={() => setTreeExpanded((v) => !v)}
                    className="flex w-full items-center justify-between text-right"
                  >
                    <span className="flex items-center gap-2 text-xs font-bold text-foreground">
                      <GitBranch className="size-4 text-primary" />
                      الشجرة القانونية للمصطلح (اختياري)
                      {legalSources.length > 0 && (
                        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                          {legalSources.length}
                        </span>
                      )}
                    </span>
                    {treeExpanded ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </button>

                  {treeExpanded && (
                    <div className="space-y-4 pt-1">
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        أضف كل قانون أو مدونة يرد فيها هذا المصطلح، مع أرقام الفصول/المواد والمقتضى
                        القانوني لكل واحدة منها. تُعرض هذه البيانات كشجرة تفاعلية في صفحة المصطلح
                        بالموقع العام.
                      </p>

                      {legalSources.length === 0 && (
                        <p className="rounded-xl border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground">
                          لم تُضف بعد أي قوانين لهذا المصطلح.
                        </p>
                      )}

                      <div className="space-y-4">
                        {legalSources.map((source, sIdx) => (
                          <div
                            key={sIdx}
                            className="space-y-3 rounded-xl border border-border bg-card p-3.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
                                <input
                                  type="text"
                                  value={source.code_ar}
                                  onChange={(e) => updateLegalSource(sIdx, "code_ar", e.target.value)}
                                  placeholder="اسم القانون بالعربية *"
                                  className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] text-foreground outline-none focus:border-primary sm:col-span-1"
                                />
                                <input
                                  type="text"
                                  value={source.code_short || ""}
                                  onChange={(e) => updateLegalSource(sIdx, "code_short", e.target.value)}
                                  placeholder="اختصار (مثال: ق.ل.ع)"
                                  className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] text-foreground outline-none focus:border-primary"
                                />
                                <input
                                  type="text"
                                  value={source.code_fr || ""}
                                  onChange={(e) => updateLegalSource(sIdx, "code_fr", e.target.value)}
                                  placeholder="بالفرنسية (اختياري)"
                                  dir="ltr"
                                  className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] text-foreground outline-none focus:border-primary text-right"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeLegalSource(sIdx)}
                                className="grid size-7 shrink-0 place-items-center rounded-lg text-destructive transition hover:bg-destructive/10"
                                title="حذف هذا القانون"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>

                            <div className="space-y-2 border-t border-border/60 pt-2.5">
                              {source.articles.map((article, aIdx) => (
                                <div key={aIdx} className="flex items-start gap-2">
                                  <input
                                    type="text"
                                    value={article.number}
                                    onChange={(e) =>
                                      updateArticle(sIdx, aIdx, "number", e.target.value)
                                    }
                                    placeholder="رقم الفصل/المادة *"
                                    className="w-28 shrink-0 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] text-foreground outline-none focus:border-primary"
                                  />
                                  <input
                                    type="text"
                                    value={article.phrase}
                                    onChange={(e) =>
                                      updateArticle(sIdx, aIdx, "phrase", e.target.value)
                                    }
                                    placeholder="النص/المقتضى القانوني المرتبط بالمصطلح"
                                    className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] text-foreground outline-none focus:border-primary"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeArticle(sIdx, aIdx)}
                                    className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                                    title="حذف هذا الفصل"
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => addArticle(sIdx)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                              >
                                <Plus className="size-3" />
                                إضافة فصل/مادة
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={addLegalSource}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-xs font-bold text-foreground transition hover:border-primary hover:text-primary"
                      >
                        <Plus className="size-3.5" />
                        إضافة قانون/مدونة جديد
                      </button>

                      {previewSources.length > 0 && (
                        <div className="space-y-2 border-t border-border/60 pt-3">
                          <p className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                            <Scale className="size-3.5 text-primary" />
                            معاينة الشجرة كما ستظهر في الموقع
                          </p>
                          <LegalTermTree
                            termAr={termAr || "المصطلح"}
                            termFr={termFr}
                            legalSources={previewSources}
                          />
                        </div>
                      )}
                    </div>
                  )}
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
        <ConfirmDeleteModal
          isOpen={deleteModalOpen}
          title="حذف مصطلح"
          description={
            deleteError ? (
              <span className="font-semibold text-destructive">{deleteError}</span>
            ) : (
              `هل أنت تأكد من رغبتك في حذف مصطلح "${termToDelete?.term_ar}"؟`
            )
          }
          isLoading={deleting}
          onConfirm={handleDeleteConfirm}
          onClose={() => {
            setDeleteModalOpen(false)
            setTermToDelete(null)
            setDeleteError(null)
          }}
        />
      </div>
    </AdminLayout>
  )
}