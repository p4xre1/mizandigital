import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Save,
  ArrowRight,
  Globe,
  Image as ImageIcon,
  Loader2,
  Check,
  Tag,
  GraduationCap,
  Sparkles,
  AlertCircle,
} from "lucide-react"
import AdminLayout from "../../../components/layout/AdminLayout"
import RichTextEditor from "../../../components/features/RichTextEditor"
import SeoAuditWidget from "../../../components/features/SeoAuditWidget"
import KeywordSuggestions from "../../../components/features/KeywordSuggestions"
import { generateSlug } from "../../../lib/utils/generateSlug"
import { supabase } from "../../../lib/supabase/client"
import type { ArticleStatus, Category, Faculty } from "../../../types/cms"

interface ArticleEditorPageProps {
  articleId?: string
  onBack?: () => void
  onNavigate?: (path: string) => void
}

export default function ArticleEditorPage({
  articleId: initialArticleId,
  onBack,
  onNavigate,
}: ArticleEditorPageProps) {
  const [searchParams] = useSearchParams()
  const [currentArticleId, setCurrentArticleId] = useState<string | undefined>(initialArticleId)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  // البيانات
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [autoSlug, setAutoSlug] = useState(true)
  const [content, setContent] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [coverImage, setCoverImage] = useState("")
  const [status, setStatus] = useState<ArticleStatus>("draft")
  const [categoryId, setCategoryId] = useState("")
  const [facultyId, setFacultyId] = useState("")
  const [targetKeyword, setTargetKeyword] = useState("")
  const [metaTitle, setMetaTitle] = useState("")
  const [metaDescription, setMetaDescription] = useState("")
  const [publishedAt, setPublishedAt] = useState<string | null>(null)

  // القوائم المنسدلة
  const [categories, setCategories] = useState<Category[]>([])
  const [faculties, setFaculties] = useState<Faculty[]>([])

  useEffect(() => {
    setCurrentArticleId(initialArticleId)
  }, [initialArticleId])

  useEffect(() => {
    fetchMetadata()
    if (currentArticleId) {
      fetchArticle(currentArticleId)
    }
  }, [currentArticleId])

  // تعبئة الكلمة المفتاحية تلقائياً عند القدوم من صفحة "الاتجاهات القانونية" (?keyword=...)
  useEffect(() => {
    if (!currentArticleId) {
      const kwFromTrends = searchParams.get("keyword")
      if (kwFromTrends) {
        setTargetKeyword(kwFromTrends)
        if (!title) handleTitleChange(kwFromTrends)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // تحديث الرابط التلقائي عند تغيير العنوان
  const handleTitleChange = (value: string) => {
    setTitle(value)
    if (autoSlug) {
      setSlug(generateSlug(value))
    }
  }

  // جلب التصنيفات والكليات
  const fetchMetadata = async () => {
    try {
      const [catsRes, facsRes] = await Promise.all([
        supabase.from("categories").select("*"),
        supabase.from("faculties").select("*"),
      ])
      if (catsRes.error) console.error("خطأ في التصنيفات:", catsRes.error)
      if (facsRes.error) console.error("خطأ في الكليات:", facsRes.error)

      if (catsRes.data) setCategories(catsRes.data)
      if (facsRes.data) setFaculties(facsRes.data)
    } catch (err) {
      console.error("خطأ أثناء جلب البيانات الأساسية:", err)
    }
  }

  // جلب المقال المختار في حالة التعديل
  const fetchArticle = async (id: string) => {
    setLoading(true)
    setErrorMsg("")
    try {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("id", id)
        .single()

      if (error) throw error
      if (data) {
        setTitle(data.title || "")
        setSlug(data.slug || "")
        setContent(data.content || "")
        setExcerpt(data.excerpt || "")
        setCoverImage(data.cover_image || "")
        setStatus((data.status as any) || "draft")
        setCategoryId(data.category_id || "")
        setFacultyId(data.faculty_id || "")
        setTargetKeyword(data.target_keyword || "")
        setMetaTitle(data.meta_title || "")
        setMetaDescription(data.meta_description || "")
        setPublishedAt(data.published_at || null)
        setAutoSlug(false)
      }
    } catch (err: any) {
      console.error("خطأ في جلب بيانات المقال:", err)
      setErrorMsg("حدث خطأ أثناء تحميل بيانات المقال.")
    } finally {
      setLoading(false)
    }
  }

  // حفظ المقال
  const handleSave = async (targetStatus?: ArticleStatus) => {
    const finalStatusCheck = targetStatus || status

    // بوابة السيو قبل النشر: تنبيه بسيط (غير حاجب) إن كانت الحقول الأساسية ناقصة
    if (finalStatusCheck === "published") {
      const missing: string[] = []
      if (!targetKeyword.trim()) missing.push("الكلمة المفتاحية المستهدفة")
      if (!(metaTitle || title).trim()) missing.push("عنوان السيو")
      if (!(metaDescription || excerpt).trim()) missing.push("وصف السيو")
      if (missing.length > 0) {
        const proceed = window.confirm(
          `تنبيه SEO: الحقول التالية غير مكتملة قبل النشر:\n- ${missing.join("\n- ")}\n\nهل تريد المتابعة والنشر رغم ذلك؟`
        )
        if (!proceed) return
      }
    }

    setSaving(true)
    setSuccessMsg("")
    setErrorMsg("")

    const finalStatus = targetStatus || status
    const nowIso = new Date().toISOString()

    let newPublishedAt = publishedAt
    if (finalStatus === "published" && !publishedAt) {
      newPublishedAt = nowIso
    }

    const articlePayload = {
      title,
      slug: slug || generateSlug(title),
      content,
      excerpt,
      cover_image: coverImage,
      status: finalStatus,
      category_id: categoryId || null,
      faculty_id: facultyId || null,
      target_keyword: targetKeyword,
      meta_title: metaTitle || title,
      meta_description: metaDescription || excerpt,
      updated_at: nowIso,
      published_at: newPublishedAt,
    }

    try {
      if (currentArticleId) {
        const { error } = await supabase
          .from("articles")
          .update(articlePayload)
          .eq("id", currentArticleId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from("articles")
          .insert([articlePayload])
          .select("id")
          .single()

        if (error) throw error
        if (data?.id) {
          setCurrentArticleId(data.id)
        }
      }

      setStatus(finalStatus)
      setPublishedAt(newPublishedAt)
      setSuccessMsg(
        finalStatus === "published"
          ? "تم نشر المقال بنجاح!"
          : "تم حفظ المسودة بنجاح!"
      )
      setTimeout(() => setSuccessMsg(""), 4000)
    } catch (err: any) {
      console.error("خطأ أثناء حفظ المقال:", err)
      setErrorMsg(err.message || "حدث خطأ أثناء حفظ المقال.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout currentPath="/articles" onNavigate={onNavigate}>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout currentPath="/articles" onNavigate={onNavigate}>
      <div className="space-y-6" dir="rtl">
        {/* شريط الإجراءات والترويسة */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => (onBack ? onBack() : onNavigate?.("/articles"))}
              className="grid size-9 place-items-center rounded-xl border border-border text-muted-foreground transition hover:bg-muted"
              title="رجوع"
            >
              <ArrowRight className="size-4" />
            </button>
            <div>
              <h1 className="text-xl font-black text-foreground">
                {currentArticleId ? "تعديل مقال قانوني" : "إضافة مقال جديد"}
              </h1>
              <p className="text-xs text-muted-foreground">
                إدارة وصياغة البحوث والمقالات القانونية ومراجعة معايير السيو.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {errorMsg && (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive">
                <AlertCircle className="size-3.5" /> {errorMsg}
              </span>
            )}
            {successMsg && (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600">
                <Check className="size-3.5" /> {successMsg}
              </span>
            )}
            <button
              onClick={() => handleSave("draft")}
              disabled={saving || !title}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground transition hover:bg-muted disabled:opacity-50"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              حفظ كمسودة
            </button>
            <button
              onClick={() => handleSave("published")}
              disabled={saving || !title}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
            >
              <Globe className="size-3.5" />
              نشر الآن
            </button>
          </div>
        </div>

        {/* شبكة تحرير المقال */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* محرر المحتوى الرئيسي */}
          <div className="space-y-5 lg:col-span-2">
            {/* عنوان المقال */}
            <div className="space-y-1.5 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <label className="text-xs font-bold text-foreground">عنوان المقال القانوني *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="مثال: مبدأ الحجية في الأحكام القضائية وفق القانون المغربي..."
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground outline-none transition focus:border-primary"
              />

              {/* الرابط الصديق */}
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span>الرابط:</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value)
                    setAutoSlug(false)
                  }}
                  className="flex-1 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground outline-none"
                />
              </div>
            </div>

            {/* محرر النص الغني */}
            <RichTextEditor
              label="نص المقال والبحث القانوني *"
              value={content}
              onChange={setContent}
              minHeight="380px"
            />

            {/* الملخص */}
            <div className="space-y-1.5 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <label className="text-xs font-bold text-foreground">الملخص التنفيذي</label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={3}
                placeholder="موجز قصير عن موضوع المقال يظهر في البطاقات المرفقة ونتائج البحث..."
                className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground outline-none transition focus:border-primary"
              />
            </div>
          </div>

          {/* الإعدادات الجانبية وأدوات السيو */}
          <div className="space-y-5">
            {/* حالة ونشر المقال */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-foreground border-b border-border pb-3">
                إعدادات النشر
              </h3>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">الحالة الحالية</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ArticleStatus)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground outline-none focus:border-primary"
                >
                  <option value="draft">مسودة (Draft)</option>
                  <option value="under_review">قيد المراجعة (Under Review)</option>
                  <option value="published">منشور (Published)</option>
                  <option value="archived">مؤرشف (Archived)</option>
                </select>
              </div>

              {/* التصنيف */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Tag className="size-3.5" /> التصنيف الرئيسي
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                >
                  <option value="">اختر التصنيف...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} {cat.name_fr ? `(${cat.name_fr})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* الكلية القانونية */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <GraduationCap className="size-3.5" /> الكلية / المؤسسة
                </label>
                <select
                  value={facultyId}
                  onChange={(e) => setFacultyId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                >
                  <option value="">اختر الكلية المرفقة...</option>
                  {faculties.map((fac) => (
                    <option key={fac.id} value={fac.id}>
                      {fac.name} - {fac.city}
                    </option>
                  ))}
                </select>
              </div>

              {/* صورة الغلاف */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <ImageIcon className="size-3.5" /> رابط صورة الغلاف (R2 / CDN)
                </label>
                <input
                  type="text"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://cdn.mizan.page/images/..."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* إعدادات السيو والكلمات المفتاحية */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Sparkles className="size-4 text-primary" />
                <h3 className="text-sm font-extrabold text-foreground">إعدادات SEO</h3>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">الكلمة المفتاحية المستهدفة</label>
                <input
                  type="text"
                  value={targetKeyword}
                  onChange={(e) => setTargetKeyword(e.target.value)}
                  placeholder="مثال: القانون المدني"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">عنوان SEO</label>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder={title || "عنوان المقال لمحركات البحث"}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">وصف SEO</label>
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  rows={2}
                  placeholder={excerpt || "وصف المقال الذي يتوافق مع معايير البحث..."}
                  className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* أداة فحص وتدقيق السيو */}
            <SeoAuditWidget
              title={metaTitle || title}
              description={metaDescription || excerpt}
              content={content}
              slug={slug}
              focusKeyword={targetKeyword}
            />

            {/* بنك اقتراح الكلمات المفتاحية */}
            <KeywordSuggestions
              onUseAsFocusKeyword={(kw) => setTargetKeyword(kw)}
              onInsertKeyword={(kw) =>
                setMetaDescription((prev) => (prev ? prev : `${excerpt || title} — ${kw}`.slice(0, 160)))
              }
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}