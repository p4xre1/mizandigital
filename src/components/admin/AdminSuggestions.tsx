import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Sparkles,
  MessageCircle,
  GitBranch,
  FileText,
  BookOpen,
  Scale,
  Newspaper,
  Video,
  Loader2,
  ArrowLeft,
} from "lucide-react"
import { supabase } from "../../lib/supabase/client"

type Severity = "high" | "medium" | "low"

interface Suggestion {
  id: string
  icon: any
  title: string
  description: string
  actionLabel: string
  path: string
  severity: Severity
}

const SEVERITY_STYLES: Record<Severity, string> = {
  high: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  medium: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  low: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
}

/**
 * لوحة "اقتراحات ذكية": خوارزمية بسيطة قائمة على قواعد (Rule-based) تفحص
 * حالة المحتوى الحالية في قاعدة البيانات وتقترح على المشرف أولويات العمل
 * القادمة (تعليقات بانتظار المراجعة، مصطلحات بدون شجرة قانونية، فصول
 * دراسية شبه فارغة في الأرشيف...). لا تعتمد على أي خدمة خارجية أو نموذج
 * تعلّم آلي، فقط استعلامات Supabase + قواعد أولوية ثابتة.
 */
export function AdminSuggestions() {
  const navigate = useNavigate()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    computeSuggestions()
  }, [])

  const computeSuggestions = async () => {
    setLoading(true)
    const results: Suggestion[] = []

    try {
      const [
        pendingCommentsRes,
        draftArticlesRes,
        lexiconTermsRes,
        pdfSummariesRes,
        facultiesRes,
        newsRes,
        lawsRes,
      ] = await Promise.all([
        supabase.from("comments").select("*", { count: "exact", head: true }).eq("is_approved", false),
        supabase.from("articles").select("*", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("lexicon_terms").select("id, legal_sources"),
        supabase.from("pdf_summaries").select("semester"),
        supabase.from("faculties").select("id, description"),
        supabase
          .from("news")
          .select("*", { count: "exact", head: true })
          .eq("is_published", true)
          .gte("published_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()),
        (supabase as any).from("laws").select("*", { count: "exact", head: true }),
      ])

      // 1) تعليقات بانتظار المراجعة
      const pendingCount = pendingCommentsRes.count || 0
      if (pendingCount > 0) {
        results.push({
          id: "pending-comments",
          icon: MessageCircle,
          title: `${pendingCount} تعليقات بانتظار المراجعة`,
          description: "هناك تعليقات من الزوار لم تتم الموافقة عليها أو رفضها بعد.",
          actionLabel: "مراجعة التعليقات",
          path: "/admin/comments",
          severity: pendingCount >= 5 ? "high" : "medium",
        })
      }

      // 2) مقالات في وضع المسودة منذ فترة
      const draftCount = draftArticlesRes.count || 0
      if (draftCount > 0) {
        results.push({
          id: "draft-articles",
          icon: FileText,
          title: `${draftCount} مقالات لا تزال في وضع المسودة`,
          description: "أكمل تحريرها وانشرها حتى تظهر للزوار.",
          actionLabel: "عرض المقالات",
          path: "/admin/articles",
          severity: "low",
        })
      }

      // 3) مصطلحات قانونية بدون شجرة (legal_sources فارغة)
      if (lexiconTermsRes.data) {
        const withoutTree = lexiconTermsRes.data.filter(
          (t: any) => !t.legal_sources || (Array.isArray(t.legal_sources) && t.legal_sources.length === 0)
        ).length
        if (withoutTree > 0) {
          results.push({
            id: "lexicon-no-tree",
            icon: GitBranch,
            title: `${withoutTree} مصطلحات بدون شجرة قانونية`,
            description: "أضف القوانين والفصول المرتبطة بهذه المصطلحات لإثراء صفحاتها.",
            actionLabel: "فتح المعجم القانوني",
            path: "/admin/lexicon",
            severity: "low",
          })
        }
      }

      // 4) فصول دراسية شبه فارغة في مكتبة الأرشيف (S1-S6)
      if (pdfSummariesRes.data) {
        const bySemester: Record<string, number> = {}
        pdfSummariesRes.data.forEach((row: any) => {
          const sem = row.semester || "بدون فصل"
          bySemester[sem] = (bySemester[sem] || 0) + 1
        })
        const ALL_SEMESTERS = ["S1", "S2", "S3", "S4", "S5", "S6"]
        const emptySemesters = ALL_SEMESTERS.filter((s) => !bySemester[s] || bySemester[s] === 0)
        if (emptySemesters.length > 0) {
          results.push({
            id: "archive-empty-semesters",
            icon: BookOpen,
            title: `الأرشيف فارغ في الفصول: ${emptySemesters.join("، ")}`,
            description: "لا توجد أي وثيقة مرفوعة بعد لهذه الفصول الدراسية.",
            actionLabel: "رفع وثيقة",
            path: "/admin/library",
            severity: emptySemesters.length >= 4 ? "medium" : "low",
          })
        }
      }

      // 5) الأرشيف القانوني (laws) فارغ بالكامل
      const lawsCount = (lawsRes as any)?.count || 0
      if (!lawsRes.error && lawsCount === 0) {
        results.push({
          id: "laws-empty",
          icon: Scale,
          title: "الأرشيف القانوني (القوانين العامة) فارغ",
          description: "لم تُضف بعد أي نصوص تشريعية عامة خارج المواد الدراسية.",
          actionLabel: "إضافة نص قانوني",
          path: "/admin/laws",
          severity: "low",
        })
      }

      // 6) كليات بدون وصف
      if (facultiesRes.data) {
        const withoutDescription = facultiesRes.data.filter((f: any) => !f.description).length
        if (withoutDescription > 0) {
          results.push({
            id: "faculties-no-description",
            icon: FileText,
            title: `${withoutDescription} كليات بدون وصف`,
            description: "أضف وصفاً تعريفياً لكل كلية لتحسين ظهورها في الدليل الأكاديمي.",
            actionLabel: "عرض الكليات",
            path: "/admin/faculties",
            severity: "low",
          })
        }
      }

      // 7) لا أخبار منشورة خلال آخر أسبوعين
      const recentNewsCount = newsRes.count || 0
      if (recentNewsCount === 0) {
        results.push({
          id: "news-stale",
          icon: Newspaper,
          title: "لا توجد أخبار جديدة منذ أسبوعين",
          description: "أضف خبراً جديداً للحفاظ على تحديث الصفحة الرئيسية وتحسين الظهور في محركات البحث.",
          actionLabel: "إضافة خبر",
          path: "/admin/news",
          severity: "medium",
        })
      }

      // ترتيب الاقتراحات حسب الأولوية (عالية ثم متوسطة ثم منخفضة)
      const order: Record<Severity, number> = { high: 0, medium: 1, low: 2 }
      results.sort((a, b) => order[a.severity] - order[b.severity])

      setSuggestions(results)
    } catch (err) {
      console.error("خطأ أثناء حساب الاقتراحات الذكية:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center rounded-2xl border border-border bg-card">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  if (suggestions.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center">
        <Sparkles className="mx-auto mb-2 size-6 text-emerald-500" />
        <p className="text-xs font-bold text-foreground">لا توجد اقتراحات حالياً — كل شيء يبدو محدّثاً 👏</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <Sparkles className="size-4 text-primary" />
        <h2 className="text-sm font-extrabold text-foreground">اقتراحات ذكية لما يمكنك فعله الآن</h2>
      </div>

      <div className="space-y-2.5">
        {suggestions.map((s) => {
          const Icon = s.icon
          return (
            <button
              key={s.id}
              onClick={() => navigate(s.path)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/60 p-3 text-right transition hover:border-primary/40 hover:bg-muted/40"
            >
              <div className="flex items-start gap-3">
                <span className={`grid size-9 shrink-0 place-items-center rounded-xl border ${SEVERITY_STYLES[s.severity]}`}>
                  <Icon className="size-4" />
                </span>
                <div>
                  <p className="text-xs font-bold text-foreground">{s.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{s.description}</p>
                </div>
              </div>
              <span className="hidden shrink-0 items-center gap-1 text-[11px] font-bold text-primary sm:flex">
                {s.actionLabel}
                <ArrowLeft className="size-3.5" />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default AdminSuggestions
