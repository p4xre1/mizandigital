import React, { useState, useEffect, useMemo } from "react"
import {
  Newspaper,
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
  Globe,
  Eye,
  EyeOff,
} from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import ConfirmDeleteModal from "../../components/ui/ConfirmDeleteModal"
import EmptyState from "../../components/ui/EmptyState"
import { supabase } from "../../lib/supabase/client"
import { generateSlug } from "../../lib/utils/generateSlug"
import { ImageUploadField } from "../../components/admin/ImageUploadField"
import SeoAuditWidget from "../../components/features/SeoAuditWidget"
import { KeywordSuggestions } from "../../components/features/KeywordSuggestions"
import { computeQuickSeoScore } from "../../lib/seo/quickAudit"

export interface NewsItem {
  id: string
  title: string
  summary?: string
  content?: string
  source?: string
  source_url?: string
  image_url?: string
  focus_keyword?: string | null
  is_published: boolean
  published_at?: string
  created_at?: string
  slug: string
}

interface NewsManagementPageProps {
  onNavigate?: (path: string) => void
  currentPath?: string
}

export function NewsManagementPage({ onNavigate, currentPath = "/admin/news" }: NewsManagementPageProps) {
  const [newsList, setNewsList] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // حالة Modal التأكيد والحذف
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false)
  const [newsToDelete, setNewsToDelete] = useState<NewsItem | null>(null)
  const [deleting, setDeleting] = useState<boolean>(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // حالة Modal الإضافة/التعديل
  const [formModalOpen, setFormModalOpen] = useState<boolean>(false)
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null)
  const [saving, setSaving] = useState<boolean>(false)
  const [formError, setFormError] = useState<string | null>(null)

  // حقول النموذج
  const [title, setTitle] = useState<string>("")
  const [summary, setSummary] = useState<string>("")
  const [content, setContent] = useState<string>("")
  const [source, setSource] = useState<string>("")
  const [sourceUrl, setSourceUrl] = useState<string>("")
  const [imageUrl, setImageUrl] = useState<string>("")
  const [focusKeyword, setFocusKeyword] = useState<string>("")
  const [isPublished, setIsPublished] = useState<boolean>(true)
  const [publishedAt, setPublishedAt] = useState<string>("")
  const [slug, setSlug] = useState<string>("")

  useEffect(() => {
    fetchNews()
  }, [])

  const fetchNews = async () => {
    setLoading(true)
    try {
      const { data, error } = await (supabase as any)
        .from("news")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      if (data) setNewsList(data as NewsItem[])
    } catch (err) {
      console.error("خطأ أثناء جلب الأخبار والمستجدات:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAddModal = () => {
    setEditingNews(null)
    setFormError(null)
    setTitle("")
    setSummary("")
    setContent("")
    setSource("")
    setSourceUrl("")
    setImageUrl("")
    setIsPublished(true)
    setPublishedAt(new Date().toISOString().split("T")[0])
    setSlug("")
    setFocusKeyword("")
    setFormModalOpen(true)
  }

  const handleOpenEditModal = (item: NewsItem) => {
    setEditingNews(item)
    setFormError(null)
    setTitle(item.title)
    setSummary(item.summary || "")
    setContent(item.content || "")
    setSource(item.source || "")
    setSourceUrl(item.source_url || "")
    setImageUrl(item.image_url || "")
    setIsPublished(item.is_published)
    setPublishedAt(item.published_at ? item.published_at.split("T")[0] : "")
    setSlug(item.slug)
    setFocusKeyword(item.focus_keyword || "")
    setFormModalOpen(true)
  }

  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setFormError("يرجى إدخال عنوان الخبر.")
      return
    }

    // بوابة السيو قبل النشر: نفس المنطق المستخدم في محرر المقالات
    if (isPublished) {
      const { score, issues } = computeQuickSeoScore({
        title,
        description: summary,
        content: content || summary,
        focusKeyword,
      })
      if (score < 60) {
        const confirmed = window.confirm(
          `تنبيه سيو قبل النشر: نتيجة هذا الخبر ${score}/100 فقط.\n\n` +
            issues.map((i) => `• ${i}`).join("\n") +
            "\n\nهل تريد المتابعة والنشر رغم ذلك؟"
        )
        if (!confirmed) return
      }
    }

    setSaving(true)
    setFormError(null)
    const finalSlug = slug.trim() || generateSlug(title)

    const payload: Record<string, any> = {
      title: title.trim(),
      summary: summary.trim() || null,
      content: content.trim() || null,
      source: source.trim() || null,
      source_url: sourceUrl.trim() || null,
      image_url: imageUrl.trim() || null,
      focus_keyword: focusKeyword.trim() || null,
      is_published: isPublished,
      published_at: publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString(),
      slug: finalSlug,
    }

    try {
      if (editingNews) {
        const { error } = await (supabase as any)
          .from("news")
          .update(payload)
          .eq("id", editingNews.id)

        if (error) throw error
      } else {
        const { error } = await (supabase as any)
          .from("news")
          .insert([payload])

        if (error) throw error
      }

      await fetchNews()
      setFormModalOpen(false)
    } catch (err: any) {
      console.error("خطأ أثناء حفظ الخبر:", err)
      setFormError(err?.message || "حدث خطأ غير متوقع أثناء حفظ الخبر.")
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePublish = async (item: NewsItem) => {
    try {
      const nextStatus = !item.is_published
      const { error } = await (supabase as any)
        .from("news")
        .update({ is_published: nextStatus })
        .eq("id", item.id)

      if (error) throw error

      setNewsList((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_published: nextStatus } : n))
      )
    } catch (err) {
      console.error("خطأ أثناء تغيير حالة النشر:", err)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!newsToDelete) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const { error } = await supabase
        .from("news")
        .delete()
        .eq("id", newsToDelete.id)

      if (error) throw error

      setNewsList((prev) => prev.filter((item) => item.id !== newsToDelete.id))
      setDeleteModalOpen(false)
      setNewsToDelete(null)
    } catch (err: any) {
      console.error("خطأ أثناء حذف الخبر:", err)
      setDeleteError(err?.message || "تعذر حذف الخبر. يرجى المحاولة مرة أخرى.")
    } finally {
      setDeleting(false)
    }
  }

  const resetFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
  }

  const filteredNews = useMemo(() => {
    return newsList.filter((item) => {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        item.title.toLowerCase().includes(query) ||
        (item.source && item.source.toLowerCase().includes(query)) ||
        (item.summary && item.summary.toLowerCase().includes(query))

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "published" && item.is_published) ||
        (statusFilter === "draft" && !item.is_published)

      return matchesSearch && matchesStatus
    })
  }, [newsList, searchQuery, statusFilter])

  return (
    <AdminLayout currentPath={currentPath} onNavigate={onNavigate}>
      <div className="space-y-6" dir="rtl">
        {/* الترويسة والزر الرئيسي */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black text-foreground">المستجدات والأخبار القانونية</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              متابعة وإدارة الأخبار والأنباء التشريعية والقضائية المنشورة على منصة ميزان.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:brightness-110 active:scale-95"
          >
            <Plus className="size-4" />
            <span>إضافة خبر جديد</span>
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
              placeholder="البحث في الأخبار، المصدر، أو الموجز..."
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
              <option value="published">منشور</option>
              <option value="draft">مسودة / غير منشور</option>
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
            <span>إجمالي الأخبار: <strong className="font-bold text-foreground">{filteredNews.length}</strong></span>
          </div>
        )}

        {/* قائمة الأخبار */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : filteredNews.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title="لا توجد أخبار أو مستجدات"
            description={
              searchQuery || statusFilter !== "all"
                ? "لم يتم العثور على أي نتائج تطابق معايير البحث."
                : "لم تقم بنشر أي أخبار أو مستجدات قانونية حتى الآن."
            }
            actionLabel={searchQuery || statusFilter !== "all" ? "إعادة ضبط البحث" : "إضافة خبر جديد"}
            actionIcon={searchQuery || statusFilter !== "all" ? RotateCcw : Plus}
            onAction={searchQuery || statusFilter !== "all" ? resetFilters : handleOpenAddModal}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredNews.map((item) => (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition duration-200 animate-in fade-in hover:border-primary/50 hover:shadow-md"
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(item)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
                        item.is_published
                          ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                      title="انقر لتغيير حالة النشر"
                    >
                      {item.is_published ? (
                        <>
                          <Eye className="size-3" /> منشور
                        </>
                      ) : (
                        <>
                          <EyeOff className="size-3" /> مسودة
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1">
                      {item.source_url && (
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          title="رابط المصدر الأصلي"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(item)}
                        className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        title="تعديل الخبر"
                      >
                        <Edit className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewsToDelete(item)
                          setDeleteModalOpen(true)
                        }}
                        className="grid size-8 place-items-center rounded-lg border border-border text-rose-500 transition hover:border-rose-500/20 hover:bg-rose-500/10"
                        title="حذف الخبر"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Summary */}
                  <div>
                    <h3 className="line-clamp-2 text-sm font-extrabold leading-snug text-foreground transition-colors group-hover:text-primary">
                      {item.title}
                    </h3>
                    {item.summary && (
                      <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                        {item.summary}
                      </p>
                    )}
                  </div>

                  {/* Meta Details */}
                  <div className="space-y-1 border-t border-border/40 pt-2 text-xs text-muted-foreground">
                    {item.source && (
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <Globe className="size-3.5 shrink-0 text-primary" />
                        <span>المصدر: {item.source}</span>
                      </div>
                    )}

                    {item.published_at && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
                        <span>
                          {new Date(item.published_at).toLocaleDateString("ar-MA", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Slug */}
                <div className="mt-4 border-t border-border/60 pt-2 text-left font-mono text-[10px] text-muted-foreground" dir="ltr">
                  /{item.slug}
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
              className="w-full max-w-2xl space-y-4 rounded-2xl border border-border bg-card p-6 shadow-2xl transition-all max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-base font-extrabold text-foreground">
                  {editingNews ? "تعديل الخبر القانوني" : "إضافة خبر جديد"}
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

              <form onSubmit={handleSaveNews} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">عنوان الخبر *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value)
                      if (!slug && !editingNews) {
                        setSlug(generateSlug(e.target.value))
                      }
                    }}
                    placeholder="مثال: صدور قانون تنظيم مهنة المحاماة بالجريدة الرسمية..."
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground outline-none transition focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">موجز الخبر</label>
                  <textarea
                    rows={2}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="تخليص للمستجد أو الخبر لنشره في البطاقات الرئيسية..."
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground outline-none transition focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">محتوى الخبر الكامل</label>
                  <textarea
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="تفاصيل الخبر وحيثياته..."
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground outline-none transition focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">المصدر</label>
                    <input
                      type="text"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      placeholder="مثال: وزارة العدل، الأمانة العامة..."
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground outline-none transition focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">تاريخ النشر</label>
                    <input
                      type="date"
                      value={publishedAt}
                      onChange={(e) => setPublishedAt(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none transition focus:border-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">رابط المصدر الأصلي (اختياري)</label>
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-left font-mono text-xs text-foreground outline-none transition focus:border-primary"
                    dir="ltr"
                  />
                </div>

                <ImageUploadField
                  label="صورة الخبر"
                  value={imageUrl}
                  onChange={setImageUrl}
                  folder="news"
                />

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">الكلمة المفتاحية الرئيسية (Focus Keyword)</label>
                  <input
                    type="text"
                    value={focusKeyword}
                    onChange={(e) => setFocusKeyword(e.target.value)}
                    placeholder="مثال: مدونة الشغل المغربية"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground outline-none transition focus:border-primary"
                  />
                </div>

                {/* أداة اقتراح الكلمات المفتاحية */}
                <KeywordSuggestions
                  title={title}
                  content={content || summary}
                  onSelectKeyword={setFocusKeyword}
                />

                {/* أداة فحص وتدقيق السيو */}
                <SeoAuditWidget
                  title={title}
                  description={summary}
                  content={content || summary}
                  slug={slug}
                  focusKeyword={focusKeyword}
                />

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">الرابط الفريد (Slug)</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="legal-news-title"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-left font-mono text-xs text-foreground outline-none transition focus:border-primary"
                    dir="ltr"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="is_published"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="size-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <label htmlFor="is_published" className="cursor-pointer text-xs font-bold text-foreground">
                    نشر الخبر فوراً للمستخدمين
                  </label>
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
                    <span>حفظ الخبر</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal التأكيد قبل الحذف */}
        <ConfirmDeleteModal
          isOpen={deleteModalOpen}
          title="حذف الخبر القانوني"
          itemName={newsToDelete?.title}
          description={
            deleteError ? (
              <span className="font-semibold text-destructive">{deleteError}</span>
            ) : (
              "هل أنت متأكد من رغبتك في حذف هذا الخبر؟ لا يمكن التراجع عن هذا الإجراء."
            )
          }
          confirmLabel="نعم، احذف الخبر"
          cancelLabel="تراجع"
          isLoading={deleting}
          onConfirm={handleDeleteConfirm}
          onClose={() => {
            setDeleteModalOpen(false)
            setNewsToDelete(null)
            setDeleteError(null)
          }}
        />
      </div>
    </AdminLayout>
  )
}

export default NewsManagementPage