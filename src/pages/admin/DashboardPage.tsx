import { useState, useEffect } from "react"
import {
  FileText,
  BookOpen,
  Calendar,
  GraduationCap,
  Plus,
  ArrowUpRight,
  Loader2,
  TrendingUp,
  Clock,
  UploadCloud,
  Layers,
} from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"
import { supabase } from "../../lib/supabase/client"

interface DashboardStats {
  articlesCount: number
  documentsCount: number
  seminarsCount: number
  facultiesCount: number
}

interface RecentArticle {
  id: string
  title: string
  created_at: string
  category?: { name_ar: string }
}

interface RecentDocument {
  id: string
  title: string
  created_at: string
  file_size?: string
}

interface DashboardPageProps {
  onNavigate?: (path: string) => void
  currentPath?: string
}

export default function DashboardPage({ onNavigate, currentPath = "/admin" }: DashboardPageProps) {
  const [stats, setStats] = useState<DashboardStats>({
    articlesCount: 0,
    documentsCount: 0,
    seminarsCount: 0,
    facultiesCount: 0,
  })
  const [recentArticles, setRecentArticles] = useState<RecentArticle[]>([])
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const [
        { count: articlesCount },
        { count: documentsCount },
        { count: seminarsCount },
        { count: facultiesCount },
        articlesRes,
        docsRes,
      ] = await Promise.all([
        supabase.from("articles").select("*", { count: "exact", head: true }),
        supabase.from("documents").select("*", { count: "exact", head: true }),
        supabase.from("seminars").select("*", { count: "exact", head: true }),
        supabase.from("faculties").select("*", { count: "exact", head: true }),
        supabase
          .from("articles")
          .select("id, title, created_at, category:categories(name_ar)")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("documents")
          .select("id, title, created_at, file_size")
          .order("created_at", { ascending: false })
          .limit(5),
      ])

      setStats({
        articlesCount: articlesCount || 0,
        documentsCount: documentsCount || 0,
        seminarsCount: seminarsCount || 0,
        facultiesCount: facultiesCount || 0,
      })

      if (articlesRes.data) setRecentArticles(articlesRes.data as unknown as RecentArticle[])
      if (docsRes.data) setRecentDocuments(docsRes.data as RecentDocument[])
    } catch (err) {
      console.error("خطأ أثناء جلب إحصائيات لوحة التحكم:", err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: "المقالات المنشورة",
      value: stats.articlesCount,
      icon: BookOpen,
      color: "text-blue-500 bg-blue-500/10",
      path: "/admin/articles",
    },
    {
      title: "وثائق المكتبة",
      value: stats.documentsCount,
      icon: FileText,
      color: "text-emerald-500 bg-emerald-500/10",
      path: "/admin/library",
    },
    {
      title: "الندوات والمؤتمرات",
      value: stats.seminarsCount,
      icon: Calendar,
      color: "text-purple-500 bg-purple-500/10",
      path: "/admin/seminars",
    },
    {
      title: "الكليات والمؤسسات",
      value: stats.facultiesCount,
      icon: GraduationCap,
      color: "text-amber-500 bg-amber-500/10",
      path: "/admin/faculties",
    },
  ]

  return (
    <AdminLayout currentPath={currentPath} onNavigate={onNavigate}>
      <div className="space-y-6" dir="rtl">
        {/* الترويسة الرئيسية */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black text-foreground">لوحة التحكم الرئيسية</h1>
            <p className="text-xs text-muted-foreground">
              مرحباً بك في منصة ميزان. نظرة عامة على المحتوى والإحصائيات الحالية.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate?.("/admin/articles/new")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground transition hover:brightness-110"
            >
              <Plus className="size-4" />
              مقال جديد
            </button>
            <button
              onClick={() => onNavigate?.("/admin/library")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground transition hover:bg-muted"
            >
              <UploadCloud className="size-4 text-primary" />
              رفع مستند
            </button>
          </div>
        </div>

        {/* بطاقات الإحصائيات (KPIs) */}
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card, idx) => {
              const Icon = card.icon
              return (
                <div
                  key={idx}
                  onClick={() => onNavigate?.(card.path)}
                  className="group relative flex cursor-pointer items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/50 hover:shadow-md"
                >
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-black text-foreground">{card.value}</p>
                  </div>
                  <div className={`grid size-12 place-items-center rounded-2xl ${card.color}`}>
                    <Icon className="size-6" />
                  </div>
                  <ArrowUpRight className="absolute left-3 top-3 size-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                </div>
              )
            })}
          </div>
        )}

        {/* القسم الأوسط: أحدث المقالات والمستندات */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* أحدث المقالات */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">أحدث المقالات المنشورة</h2>
              </div>
              <button
                onClick={() => onNavigate?.("/admin/articles")}
                className="text-xs font-bold text-primary hover:underline"
              >
                عرض الكل
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="py-8 text-center text-xs text-muted-foreground">جاري التحميل...</div>
              ) : recentArticles.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">لا توجد مقالات منشورة مؤخراً.</p>
              ) : (
                recentArticles.map((article) => (
                  <div
                    key={article.id}
                    className="flex items-center justify-between rounded-xl border border-border/40 p-3 transition hover:bg-muted/50"
                  >
                    <div className="space-y-1">
                      <p className="line-clamp-1 text-xs font-bold text-foreground">
                        {article.title}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {new Date(article.created_at).toLocaleDateString("ar-MA")}
                        </span>
                        {article.category && (
                          <span className="rounded bg-muted px-1.5 py-0.5 font-semibold">
                            {article.category.name_ar}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* أحدث مستندات المكتبة */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">أحدث مستندات المكتبة</h2>
              </div>
              <button
                onClick={() => onNavigate?.("/admin/library")}
                className="text-xs font-bold text-primary hover:underline"
              >
                عرض الكل
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="py-8 text-center text-xs text-muted-foreground">جاري التحميل...</div>
              ) : recentDocuments.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">لا توجد وثائق مرفوعة مؤخراً.</p>
              ) : (
                recentDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-xl border border-border/40 p-3 transition hover:bg-muted/50"
                  >
                    <div className="space-y-1">
                      <p className="line-clamp-1 text-xs font-bold text-foreground">{doc.title}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>{new Date(doc.created_at).toLocaleDateString("ar-MA")}</span>
                        <span>{doc.file_size || "PDF"}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* وصول سريع للاقسام */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-bold text-foreground border-b border-border/60 pb-3">
            روابط سريعة للإدارة
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              onClick={() => onNavigate?.("/admin/lexicon")}
              className="flex items-center gap-2 rounded-xl border border-border p-3 text-xs font-bold text-foreground transition hover:border-primary/50 hover:bg-muted"
            >
              <Layers className="size-4 text-primary" />
              القاموس القانوني
            </button>
            <button
              onClick={() => onNavigate?.("/admin/faculties")}
              className="flex items-center gap-2 rounded-xl border border-border p-3 text-xs font-bold text-foreground transition hover:border-primary/50 hover:bg-muted"
            >
              <GraduationCap className="size-4 text-primary" />
              الكليات
            </button>
            <button
              onClick={() => onNavigate?.("/admin/seminars")}
              className="flex items-center gap-2 rounded-xl border border-border p-3 text-xs font-bold text-foreground transition hover:border-primary/50 hover:bg-muted"
            >
              <Calendar className="size-4 text-primary" />
              الندوات والمؤتمرات
            </button>
            <button
              onClick={() => onNavigate?.("/admin/analytics")}
              className="flex items-center gap-2 rounded-xl border border-border p-3 text-xs font-bold text-foreground transition hover:border-primary/50 hover:bg-muted"
            >
              <TrendingUp className="size-4 text-primary" />
              الإحصائيات
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}