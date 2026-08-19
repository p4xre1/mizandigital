import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  BookOpen,
  Layers,
  Calendar,
  GraduationCap,
  Newspaper,
  Plus,
  ArrowUpRight,
  Loader2,
  Clock,
  UploadCloud,
  FileText,
} from "lucide-react"
import { supabase } from "../../lib/supabase/client"

interface DashboardStats {
  articlesCount: number
  termsCount: number
  seminarsCount: number
  schoolsCount: number
  newsCount: number
}

interface RecentArticle {
  id: string
  title: string
  created_at: string
}

interface RecentDocument {
  id: string
  title: string
  created_at: string
  file_size_bytes?: number
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    articlesCount: 0,
    termsCount: 0,
    seminarsCount: 0,
    schoolsCount: 0,
    newsCount: 0,
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
        articlesRes,
        termsRes,
        seminarsRes,
        facultiesRes,
        newsRes,
        articlesListRes,
        docsListRes,
      ] = await Promise.all([
        // العداد يجب أن يعكس فعلياً المقالات "المنشورة" فقط تماشياً مع عنوان البطاقة، وليس كل الحالات (مسودة/مراجعة/أرشيف)
        supabase
          .from("articles")
          .select("*", { count: "exact", head: true })
          .eq("status", "published"),
        supabase.from("lexicon_terms").select("*", { count: "exact", head: true }),
        supabase.from("seminars").select("*", { count: "exact", head: true }),
        supabase.from("faculties").select("*", { count: "exact", head: true }),
        supabase.from("news").select("*", { count: "exact", head: true }).eq("is_published", true),
        supabase
          .from("articles")
          .select("id, title, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("pdf_summaries")
          .select("id, title, created_at, file_size_bytes")
          .order("created_at", { ascending: false })
          .limit(5),
      ])

      setStats({
        articlesCount: articlesRes.count || 0,
        termsCount: termsRes.count || 0,
        seminarsCount: seminarsRes.count || 0,
        schoolsCount: facultiesRes.count || 0,
        newsCount: newsRes.count || 0,
      })

      if (articlesListRes.data) setRecentArticles(articlesListRes.data as RecentArticle[])
      if (docsListRes.data) setRecentDocuments(docsListRes.data as RecentDocument[])
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
      title: "المصطلحات القانونية",
      value: stats.termsCount,
      icon: Layers,
      color: "text-emerald-500 bg-emerald-500/10",
      path: "/admin/lexicon",
    },
    {
      title: "الأخبار والمستجدات",
      value: stats.newsCount,
      icon: Newspaper,
      color: "text-purple-500 bg-purple-500/10",
      path: "/admin/news",
    },
    {
      title: "الندوات والبثوث",
      value: stats.seminarsCount,
      icon: Calendar,
      color: "text-indigo-500 bg-indigo-500/10",
      path: "/admin/seminars",
    },
    {
      title: "الكليات والمؤسسات",
      value: stats.schoolsCount,
      icon: GraduationCap,
      color: "text-amber-500 bg-amber-500/10",
      path: "/admin/faculties",
    },
  ]

  return (
    <div className="space-y-6" dir="rtl">
      {/* ترويسة الصفحة */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-foreground">لوحة التحكم الرئيسية</h1>
          <p className="text-xs text-muted-foreground">
            مرحباً بك في منصة ميزان الرقمية. نظرة عامة على المحتوى والإحصائيات الحالية.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate("/admin/articles/new")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground transition hover:brightness-110"
          >
            <Plus className="size-4" />
            مقال جديد
          </button>
          <button
            onClick={() => navigate("/admin/library")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground transition hover:bg-muted"
          >
            <UploadCloud className="size-4 text-primary" />
            رفع مستند
          </button>
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {statCards.map((card, idx) => {
            const Icon = card.icon
            return (
              <div
                key={idx}
                onClick={() => navigate(card.path)}
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

      {/* أحدث المقالات والمستندات */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">أحدث المقالات المنشورة</h2>
            </div>
            <button
              onClick={() => navigate("/admin/articles")}
              className="text-xs font-bold text-primary hover:underline"
            >
              عرض الكل
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {recentArticles.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">لا توجد مقالات منشورة مؤخراً.</p>
            ) : (
              recentArticles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-center justify-between rounded-xl border border-border/40 p-3 transition hover:bg-muted/50"
                >
                  <div className="space-y-1">
                    <p className="line-clamp-1 text-xs font-bold text-foreground">{article.title}</p>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(article.created_at).toLocaleDateString("ar-MA")}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">أحدث مستندات المكتبة</h2>
            </div>
            <button
              onClick={() => navigate("/admin/library")}
              className="text-xs font-bold text-primary hover:underline"
            >
              عرض الكل
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {recentDocuments.length === 0 ? (
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
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}