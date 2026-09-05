import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  FileText,
  Filter,
  Loader2,
  Globe,
  Clock,
  Archive,
  AlertCircle,
} from "lucide-react"
import AdminLayout from "../../../components/layout/AdminLayout"
import ConfirmDeleteModal from "../../../components/ui/ConfirmDeleteModal"
import EmptyState from "../../../components/ui/EmptyState"
import { supabase } from "../../../lib/supabase/client"
import type { Article, ArticleStatus } from "../../../types/cms"

// المقال مع العلاقات المرفقة (تصنيف وكلية) القادمة من الـ join
type ArticleWithRelations = Article & {
  category?: { id: string; name: string; name_fr?: string | null; slug: string } | null
  faculty?: { id: string; name: string; city: string; slug: string } | null
}

interface ArticlesPageProps {
  onNavigate?: (path: string) => void
  onEditArticle?: (id: string) => void
}

export default function ArticlesPage({ onNavigate, onEditArticle }: ArticlesPageProps) {
  // إصلاح خلل: هاد الصفحة كتوصل بلا onNavigate/onEditArticle مادام مُدرجة
  // مباشرة فـ AppRoutes.tsx بلا غلاف يمرر هاد الـ props، فيبقى زر "مقال
  // جديد" وزر "تعديل" فـ الجدول بلا أي تأثير (onNavigate?.(...) كيبقى
  // undefined). هنا كنستعملو useNavigate الحقيقي ديال الراوتر كقيمة
  // احتياطية دائماً شغّالة، بنفس المنطق المستعمل ديجا فـ AdminSidebar.
  const navigate = useNavigate()
  const goTo = (path: string) => (onNavigate ? onNavigate(path) : navigate(path))
  const goToEdit = (id: string) =>
    onEditArticle ? onEditArticle(id) : goTo(`/admin/articles/edit/${id}`)

  const [articles, setArticles] = useState<ArticleWithRelations[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // حالة النوافذ المنبثقة
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false)
  const [articleToDelete, setArticleToDelete] = useState<ArticleWithRelations | null>(null)
  const [deleting, setDeleting] = useState<boolean>(false)

  useEffect(() => {
    fetchArticles()
  }, [])

  const fetchArticles = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("articles")
        .select(`
          *,
          category:categories(id, name, name_fr, slug),
          faculty:faculties(id, name, city, slug)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      if (data) setArticles(data as unknown as ArticleWithRelations[])
    } catch (err) {
      console.error("خطأ في جلب المقالات:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!articleToDelete) return
    setDeleting(true)
    try {
      const { error } = await supabase
        .from("articles")
        .delete()
        .eq("id", articleToDelete.id)

      if (error) throw error

      setArticles((prev) => prev.filter((item) => item.id !== articleToDelete.id))
      setDeleteModalOpen(false)
      setArticleToDelete(null)
    } catch (err) {
      console.error("خطأ أثناء حذف المقال:", err)
    } finally {
      setDeleting(false)
    }
  }

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const matchesSearch =
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.slug.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus =
        statusFilter === "all" || article.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [articles, searchQuery, statusFilter])

  const renderStatusBadge = (status: ArticleStatus) => {
    switch (status) {
      case "published":
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <Globe className="size-3" /> منشور
          </span>
        )
      case "draft":
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
            <Clock className="size-3" /> مسودة
          </span>
        )
      case "under_review":
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400">
            <AlertCircle className="size-3" /> قيد المراجعة
          </span>
        )
      case "archived":
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-gray-500/10 px-2.5 py-1 text-xs font-bold text-gray-600 dark:text-gray-400">
            <Archive className="size-3" /> مؤرشف
          </span>
        )
      default:
        return null
    }
  }

  return (
    <AdminLayout currentPath="/admin/articles">
      <div className="space-y-6" dir="rtl">
        {/* الترويسة والأزرار الرئيسية */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black text-foreground">المقالات والبحوث القانونية</h1>
            <p className="text-xs text-muted-foreground">
              عرض وإدارة جميع المقالات المنشورة والمسودات داخل المنصة.
            </p>
          </div>
          <button
            onClick={() => goTo("/admin/articles/new")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:brightness-110"
          >
            <Plus className="size-4" />
            مقال جديد
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
              placeholder="البحث باسم المقال أو الرابط..."
              className="w-full rounded-xl border border-border bg-background py-2 pr-9 pl-4 text-xs text-foreground outline-none transition focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-primary"
            >
              <option value="all">جميع الحالات</option>
              <option value="published">منشور</option>
              <option value="draft">مسودة</option>
              <option value="under_review">قيد المراجعة</option>
              <option value="archived">مؤرشف</option>
            </select>
          </div>
        </div>

        {/* جدول عرض المقالات */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : filteredArticles.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="لا توجد مقالات"
              description={
                searchQuery || statusFilter !== "all"
                  ? "لم يتم العثور على أي مقال يطابق خيارات البحث."
                  : "لم تقم بإضافة أي مقالات قانونية حتى الآن."
              }
              actionLabel="إضافة مقال جديد"
              onAction={() => goTo("/admin/articles/new")}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3.5 font-bold">المقال</th>
                    <th className="px-4 py-3.5 font-bold">التصنيف</th>
                    <th className="px-4 py-3.5 font-bold">الكلية / المؤسسة</th>
                    <th className="px-4 py-3.5 font-bold">الحالة</th>
                    <th className="px-4 py-3.5 font-bold">تاريخ الإنشاء</th>
                    <th className="px-4 py-3.5 font-bold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredArticles.map((article) => (
                    <tr key={article.id} className="transition hover:bg-muted/30">
                      <td className="px-4 py-3.5 font-bold text-foreground">
                        <div className="flex flex-col gap-0.5">
                          <span className="line-clamp-1">{article.title}</span>
                          <span className="text-[10px] font-normal text-muted-foreground dir-ltr text-right">
                            /{article.slug}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {article.category?.name || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {article.faculty?.name || "—"}
                      </td>
                      <td className="px-4 py-3.5">{renderStatusBadge(article.status)}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {article.created_at
                          ? new Date(article.created_at).toLocaleDateString("ar-MA")
                          : "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => goToEdit(article.id)}
                            className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            title="تعديل المقال"
                          >
                            <Edit className="size-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setArticleToDelete(article)
                              setDeleteModalOpen(true)
                            }}
                            className="grid size-8 place-items-center rounded-lg border border-border text-destructive transition hover:bg-destructive/10"
                            title="حذف المقال"
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

        {/* مودال تأكيد الحذف */}
        <ConfirmDeleteModal
          isOpen={deleteModalOpen}
          title="حذف المقال"
          description={`هل أنت تأكد من رغبتك في حذف مقال "${articleToDelete?.title}"؟ لا يمكن التراجع عن هذا الإجراء.`}
          isLoading={deleting}
          onConfirm={handleDeleteConfirm}
          onClose={() => {
            setDeleteModalOpen(false)
            setArticleToDelete(null)
          }}
        />
      </div>
    </AdminLayout>
  )
}