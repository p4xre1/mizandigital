import React, { useState, useEffect, useMemo } from "react"
import {
  MessageCircle,
  Search,
  Trash2,
  Loader2,
  X,
  Check,
  RotateCcw,
  Filter,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Clock,
} from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import ConfirmDeleteModal from "../../components/ui/ConfirmDeleteModal"
import EmptyState from "../../components/ui/EmptyState"
import { supabase } from "../../lib/supabase/client"

export interface CommentItem {
  id: string
  article_id: string | null
  pdf_id: string | null
  news_id: string | null
  author_name: string
  body: string
  is_approved: boolean
  created_at: string | null
  source_type: "articles" | "news" | null
  source_slug: string | null
}

interface CommentsPageProps {
  onNavigate?: (path: string) => void
  currentPath?: string
}

export function CommentsPage({ onNavigate, currentPath = "/admin/comments" }: CommentsPageProps) {
  const [comments, setComments] = useState<CommentItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("pending")

  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false)
  const [commentToDelete, setCommentToDelete] = useState<CommentItem | null>(null)
  const [deleting, setDeleting] = useState<boolean>(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // تتبّع أي تعليق قيد المعالجة حالياً (موافقة/رفض) لتعطيل زره فقط
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    fetchComments()
  }, [])

  const fetchComments = async () => {
    setLoading(true)
    try {
      const { data, error } = await (supabase as any)
        .from("comments")
        .select(
          "id, article_id, pdf_id, news_id, author_name, body, is_approved, created_at, source_type, source_slug"
        )
        .order("created_at", { ascending: false })

      if (error) throw error
      if (data) setComments(data as CommentItem[])
    } catch (err) {
      console.error("خطأ أثناء جلب التعليقات:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleApproval = async (item: CommentItem) => {
    setProcessingId(item.id)
    try {
      const nextStatus = !item.is_approved
      const { error } = await (supabase as any)
        .from("comments")
        .update({ is_approved: nextStatus })
        .eq("id", item.id)

      if (error) throw error

      setComments((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, is_approved: nextStatus } : c))
      )
    } catch (err) {
      console.error("خطأ أثناء تحديث حالة التعليق:", err)
    } finally {
      setProcessingId(null)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!commentToDelete) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const { error } = await supabase.from("comments").delete().eq("id", commentToDelete.id)

      if (error) throw error

      setComments((prev) => prev.filter((c) => c.id !== commentToDelete.id))
      setDeleteModalOpen(false)
      setCommentToDelete(null)
    } catch (err: any) {
      console.error("خطأ أثناء حذف التعليق:", err)
      setDeleteError(err?.message || "تعذر حذف التعليق. يرجى المحاولة مرة أخرى.")
    } finally {
      setDeleting(false)
    }
  }

  const resetFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
  }

  const buildContentUrl = (item: CommentItem) => {
    if (!item.source_slug) return null
    if (item.source_type === "news") return `/news/${item.source_slug}`
    return `/articles/${item.source_slug}`
  }

  const filteredComments = useMemo(() => {
    return comments.filter((item) => {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        item.author_name.toLowerCase().includes(query) ||
        item.body.toLowerCase().includes(query) ||
        (item.source_slug && item.source_slug.toLowerCase().includes(query))

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "pending" && !item.is_approved) ||
        (statusFilter === "approved" && item.is_approved)

      return matchesSearch && matchesStatus
    })
  }, [comments, searchQuery, statusFilter])

  const pendingCount = useMemo(() => comments.filter((c) => !c.is_approved).length, [comments])

  return (
    <AdminLayout currentPath={currentPath} onNavigate={onNavigate}>
      <div className="space-y-6" dir="rtl">
        {/* الترويسة */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black text-foreground">التعليقات</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              مراجعة والموافقة على تعليقات الزوار على المقالات والأخبار قبل ظهورها للعموم.
            </p>
          </div>
          {pendingCount > 0 && (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
              <Clock className="size-3.5" />
              {pendingCount} تعليق بانتظار المراجعة
            </span>
          )}
        </div>

        {/* شريط البحث والفلترة */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث بالاسم، نص التعليق، أو رابط المقال..."
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
              <option value="all">جميع التعليقات</option>
              <option value="pending">بانتظار المراجعة</option>
              <option value="approved">موافَق عليها</option>
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
              إجمالي التعليقات: <strong className="font-bold text-foreground">{filteredComments.length}</strong>
            </span>
          </div>
        )}

        {/* قائمة التعليقات */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : filteredComments.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="لا توجد تعليقات"
            description={
              searchQuery || statusFilter !== "all"
                ? "لم يتم العثور على أي نتائج تطابق معايير البحث."
                : "لم يترك الزوار أي تعليقات حتى الآن."
            }
            actionLabel={searchQuery || statusFilter !== "all" ? "إعادة ضبط البحث" : undefined}
            actionIcon={RotateCcw}
            onAction={searchQuery || statusFilter !== "all" ? resetFilters : undefined}
          />
        ) : (
          <ul className="space-y-3">
            {filteredComments.map((item) => {
              const contentUrl = buildContentUrl(item)
              const isProcessing = processingId === item.id

              return (
                <li
                  key={item.id}
                  className="rounded-2xl border border-border bg-card p-4 shadow-sm transition duration-200 animate-in fade-in sm:p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      {/* الحالة + الاسم + التاريخ */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                            item.is_approved
                              ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {item.is_approved ? (
                            <>
                              <CheckCircle2 className="size-3" /> منشور
                            </>
                          ) : (
                            <>
                              <Clock className="size-3" /> بانتظار المراجعة
                            </>
                          )}
                        </span>
                        <span className="text-sm font-bold text-foreground">{item.author_name}</span>
                        {item.created_at && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Calendar className="size-3" />
                            {new Date(item.created_at).toLocaleDateString("ar-MA", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                        )}
                      </div>

                      {/* نص التعليق */}
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                        {item.body}
                      </p>

                      {/* رابط المصدر */}
                      {contentUrl && (
                        <a
                          href={contentUrl}
                          title={`فتح ${item.source_type === "news" ? "الخبر" : "المقال"} المصدر`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
                        >
                          <ExternalLink className="size-3" />
                          {item.source_type === "news" ? "الخبر" : "المقال"}: {item.source_slug}
                        </a>
                      )}
                    </div>

                    {/* أزرار الإجراءات */}
                    <div className="flex shrink-0 items-center gap-2 sm:flex-col">
                      <button
                        type="button"
                        onClick={() => handleToggleApproval(item)}
                        disabled={isProcessing}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${
                          item.is_approved
                            ? "border border-border text-muted-foreground hover:bg-muted"
                            : "bg-primary text-primary-foreground shadow-sm hover:brightness-110"
                        }`}
                      >
                        {isProcessing ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : item.is_approved ? (
                          <X className="size-3.5" />
                        ) : (
                          <Check className="size-3.5" />
                        )}
                        {item.is_approved ? "إلغاء النشر" : "موافقة ونشر"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCommentToDelete(item)
                          setDeleteModalOpen(true)
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-rose-500 transition hover:border-rose-500/20 hover:bg-rose-500/10"
                      >
                        <Trash2 className="size-3.5" />
                        حذف
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {/* Modal التأكيد قبل الحذف */}
        <ConfirmDeleteModal
          isOpen={deleteModalOpen}
          title="حذف التعليق"
          itemName={commentToDelete?.author_name}
          description={
            deleteError ? (
              <span className="font-semibold text-destructive">{deleteError}</span>
            ) : (
              "هل أنت متأكد من رغبتك في حذف هذا التعليق؟ لا يمكن التراجع عن هذا الإجراء."
            )
          }
          confirmLabel="نعم، احذف التعليق"
          cancelLabel="تراجع"
          isLoading={deleting}
          onConfirm={handleDeleteConfirm}
          onClose={() => {
            setDeleteModalOpen(false)
            setCommentToDelete(null)
            setDeleteError(null)
          }}
        />
      </div>
    </AdminLayout>
  )
}

export default CommentsPage