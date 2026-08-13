import { useState, useEffect, useMemo } from "react"
import {
  FileText,
  Plus,
  Search,
  Trash2,
  Loader2,
  X,
  Check,
  Filter,
  Copy,
  ExternalLink,
  Download,
  UploadCloud,
  Tag,
  GraduationCap,
} from "lucide-react"
import AdminLayout from "../../../components/layout/AdminLayout"
import ConfirmDeleteModal from "../../../components/ui/ConfirmDeleteModal"
import EmptyState from "../../../components/ui/EmptyState"
import { ProgressBar } from "../../../components/ui/ProgressBar"
import { PdfDropzone } from "../../../components/features/PdfDropzone"
import { supabase } from "../../../lib/supabase/client"
import type { Category, Faculty } from "../../../types/cms"

export interface PdfDocument {
  id: string
  title: string
  description?: string
  file_url: string
  file_size?: string
  category_id?: string
  faculty_id?: string
  created_at: string
  category?: Category
  faculty?: Faculty
}

interface LibraryPageProps {
  onNavigate?: (path: string) => void
}

// دالة مساعدة لرفع الملف إلى Supabase Storage وحساب التقدم
async function uploadDocumentFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  onProgress?.(20)
  const fileExt = file.name.split(".").pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
  const filePath = `library/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, file, { cacheControl: "3600", upsert: false })

  onProgress?.(70)

  if (uploadError) {
    console.error("خطأ أثناء رفع الملف إلى Supabase Storage:", uploadError)
    throw uploadError
  }

  const { data } = supabase.storage.from("documents").getPublicUrl(filePath)
  onProgress?.(100)
  return data.publicUrl
}

export default function LibraryPage({ onNavigate }: LibraryPageProps) {
  const [documents, setDocuments] = useState<PdfDocument[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [faculties, setFaculties] = useState<Faculty[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // حالة Modal التأكيد والحذف
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false)
  const [docToDelete, setDocToDelete] = useState<PdfDocument | null>(null)
  const [deleting, setDeleting] = useState<boolean>(false)

  // حالة Modal رفع ملف جديد
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false)
  const [uploading, setUploading] = useState<boolean>(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)

  // حقول النموذج
  const [title, setTitle] = useState<string>("")
  const [description, setDescription] = useState<string>("")
  const [categoryId, setCategoryId] = useState<string>("")
  const [facultyId, setFacultyId] = useState<string>("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [docsRes, catsRes, facsRes] = await Promise.all([
        supabase
          .from("documents")
          .select(`
            *,
            category:categories(id, name_ar, name_fr, slug),
            faculty:faculties(id, name_ar, name_fr, city, slug)
          `)
          .order("created_at", { ascending: false }),
        supabase.from("categories").select("*"),
        supabase.from("faculties").select("*"),
      ])

      if (docsRes.data) setDocuments(docsRes.data as unknown as PdfDocument[])
      if (catsRes.data) setCategories(catsRes.data as Category[])
      if (facsRes.data) setFaculties(facsRes.data as Faculty[])
    } catch (err) {
      console.error("خطأ أثناء جلب المستندات:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenUploadModal = () => {
    setTitle("")
    setDescription("")
    setCategoryId("")
    setFacultyId("")
    setSelectedFile(null)
    setUploadProgress(0)
    setUploadModalOpen(true)
  }

  const handleUploadAndSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !selectedFile) return

    setUploading(true)
    setUploadProgress(15)

    try {
      // 1. رفع الملف إلى Storage
      const fileUrl = await uploadDocumentFile(selectedFile, (progress: number) => {
        setUploadProgress(Math.round(progress))
      })

      // 2. حساب حجم الملف
      const sizeMB = (selectedFile.size / (1024 * 1024)).toFixed(2) + " MB"

      // 3. حفظ بيانات المستند في قاعدة البيانات
      const payload = {
        title,
        description,
        file_url: fileUrl,
        file_size: sizeMB,
        category_id: categoryId || null,
        faculty_id: facultyId || null,
      }

      const { error } = await supabase.from("documents").insert([payload])
      if (error) throw error

      await fetchData()
      setUploadModalOpen(false)
    } catch (err) {
      console.error("خطأ أثناء رفع وإضافة المستند:", err)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!docToDelete) return
    setDeleting(true)
    try {
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", docToDelete.id)

      if (error) throw error

      setDocuments((prev) => prev.filter((item) => item.id !== docToDelete.id))
      setDeleteModalOpen(false)
      setDocToDelete(null)
    } catch (err) {
      console.error("خطأ أثناء حذف المستند:", err)
    } finally {
      setDeleting(false)
    }
  }

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesCategory =
        categoryFilter === "all" || doc.category_id === categoryFilter

      return matchesSearch && matchesCategory
    })
  }, [documents, searchQuery, categoryFilter])

  return (
    <AdminLayout currentPath="/library" onNavigate={onNavigate}>
      <div className="space-y-6" dir="rtl">
        {/* الترويسة وزر الرفع */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black text-foreground">المكتبة القانونية الرقمية</h1>
            <p className="text-xs text-muted-foreground">
              إدارة وملفات الـ PDF والوثائق والنصوص القانونية المنشورة.
            </p>
          </div>
          <button
            onClick={handleOpenUploadModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:brightness-110"
          >
            <UploadCloud className="size-4" />
            رفع مستند PDF جديد
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
              placeholder="البحث بعنوان الوثيقة أو الوصف..."
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

        {/* شبكة عرض المستندات */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="لا توجد مستندات قانونية"
            description={
              searchQuery || categoryFilter !== "all"
                ? "لم يتم العثور على أي ملف يطابق خيارات البحث."
                : "لم تقم برفع أي ملفات أو وثائق PDF حتى الآن."
            }
            actionLabel="رفع مستند جديد"
            onAction={handleOpenUploadModal}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/50"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                      <FileText className="size-5" />
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyLink(doc.file_url, doc.id)}
                        className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        title="نسخ رابط المستند"
                      >
                        {copiedId === doc.id ? (
                          <Check className="size-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>

                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        title="معاينة الملف"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>

                      <button
                        onClick={() => {
                          setDocToDelete(doc)
                          setDeleteModalOpen(true)
                        }}
                        className="grid size-8 place-items-center rounded-lg border border-border text-destructive transition hover:bg-destructive/10"
                        title="حذف المستند"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="line-clamp-2 text-sm font-bold text-foreground">
                      {doc.title}
                    </h3>
                    {doc.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {doc.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {doc.category && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        <Tag className="size-3" />
                        {doc.category.name_ar}
                      </span>
                    )}
                    {doc.faculty && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        <GraduationCap className="size-3" />
                        {doc.faculty.name_ar}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                  <span>{doc.file_size || "PDF Document"}</span>
                  <a
                    href={doc.file_url}
                    download
                    className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                  >
                    <Download className="size-3" /> تحميل
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal رفع المستند */}
        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-base font-bold text-foreground">رفع مستند PDF جديد</h2>
                <button
                  onClick={() => setUploadModalOpen(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleUploadAndSave} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">عنوان المستند *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: قانون الالتزامات والعقود - النسخة المحينة..."
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">الوصف أو الموجز</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="ملاحظات حول هذا المستند أو المرجع القانوني..."
                    className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground outline-none focus:border-primary"
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
                      <option value="">اختر التصنيف...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name_ar}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">الكلية المرفقة</label>
                    <select
                      value={facultyId}
                      onChange={(e) => setFacultyId(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                    >
                      <option value="">اختر الكلية...</option>
                      {faculties.map((fac) => (
                        <option key={fac.id} value={fac.id}>
                          {fac.name_ar}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* مكون إسقاط واختيار الملف */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">ملف المستند (PDF) *</label>
                  <PdfDropzone
                    file={selectedFile}
                    onFileSelect={(file: File | null) => setSelectedFile(file)}
                  />
                </div>

                {uploading && (
                  <ProgressBar progress={uploadProgress} label="جاري رفع الملف إلى السيرفر..." />
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setUploadModalOpen(false)}
                    className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-foreground transition hover:bg-muted"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !selectedFile || !title}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Plus className="size-3.5" />
                    )}
                    حفظ ورفع
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal التأكيد قبل الحذف */}
        <ConfirmDeleteModal
          isOpen={deleteModalOpen}
          title="حذف المستند"
          description={`هل أنت تأكد من رغبتك في حذف مستند "${docToDelete?.title}"؟`}
          isLoading={deleting}
          onConfirm={handleDeleteConfirm}
          onClose={() => {
            setDeleteModalOpen(false)
            setDocToDelete(null)
          }}
        />
      </div>
    </AdminLayout>
  )
}