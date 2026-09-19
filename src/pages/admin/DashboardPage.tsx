import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  BookOpen, Layers, Calendar, GraduationCap, Newspaper, Plus, ArrowUpLeft,
  Loader2, Clock, UploadCloud, FileText, Scale, Users, Coins, Flag,
  ListChecks, MessageCircle, BarChart3, Brain, Gauge, Tag, TrendingUp,
  ShieldCheck, Settings, Globe, Bookmark, HelpCircle, Info, Mail, Shield,
  FileQuestion, Video, Database, CreditCard, Sparkles, Zap, Activity,
  CheckCircle2, AlertTriangle
} from "lucide-react"
import { supabase } from "../../lib/supabase/client"
import { AdminSuggestions } from "../../components/admin/AdminSuggestions"
import { CountUp } from "../../components/ui/CountUp"

interface DashboardStats {
  articlesCount: number
  termsCount: number
  seminarsCount: number
  schoolsCount: number
  newsCount: number
  lawsCount: number
  usersCount: number
  paymentsCount: number
  reportsCount: number
  quizAttemptsCount: number
  commentsCount: number
  libraryCount: number
  trendingCount: number
  creditPackagesCount: number
}

interface RecentItem {
  id: string
  title: string
  created_at: string
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    articlesCount: 0, termsCount: 0, seminarsCount: 0, schoolsCount: 0,
    newsCount: 0, lawsCount: 0, usersCount: 0, paymentsCount: 0,
    reportsCount: 0, quizAttemptsCount: 0, commentsCount: 0, libraryCount: 0,
    trendingCount: 0, creditPackagesCount: 0,
  })
  const [recentArticles, setRecentArticles] = useState<RecentItem[]>([])
  const [recentUsers, setRecentUsers] = useState<any[]>([])
  const [recentPayments, setRecentPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchDashboardData() }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const [
        articlesRes, termsRes, seminarsRes, facultiesRes, newsRes, lawsRes,
        usersRes, paymentsRes, reportsRes, quizRes, commentsRes, libraryRes,
        trendingRes, packagesRes, articlesListRes, usersListRes, paymentsListRes
      ] = await Promise.all([
        supabase.from("articles").select("*", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("lexicon_terms").select("*", { count: "exact", head: true }),
        supabase.from("seminars").select("*", { count: "exact", head: true }),
        supabase.from("faculties").select("*", { count: "exact", head: true }),
        supabase.from("news").select("*", { count: "exact", head: true }).eq("is_published", true),
        (supabase as any).from("laws").select("*", { count: "exact", head: true }),
        (supabase as any).from("profiles").select("*", { count: "exact", head: true }),
        (supabase as any).from("payments").select("*", { count: "exact", head: true }),
        (supabase as any).from("reports").select("*", { count: "exact", head: true }),
        (supabase as any).from("quiz_attempts").select("*", { count: "exact", head: true }),
        (supabase as any).from("comments").select("*", { count: "exact", head: true }),
        supabase.from("pdf_summaries").select("*", { count: "exact", head: true }),
        (supabase as any).from("trending_topics").select("*", { count: "exact", head: true }),
        (supabase as any).from("credit_packages").select("*", { count: "exact", head: true }),
        supabase.from("articles").select("id, title, created_at").order("created_at", { ascending: false }).limit(5),
        (supabase as any).from("profiles").select("id, email, full_name, created_at").order("created_at", { ascending: false }).limit(5),
        (supabase as any).from("payments").select("id, user_ref, amount_mad, status, created_at").order("created_at", { ascending: false }).limit(5),
      ])

      setStats({
        articlesCount: articlesRes.count || 0,
        termsCount: termsRes.count || 0,
        seminarsCount: seminarsRes.count || 0,
        schoolsCount: facultiesRes.count || 0,
        newsCount: newsRes.count || 0,
        lawsCount: (lawsRes as any)?.count || 0,
        usersCount: (usersRes as any)?.count || 0,
        paymentsCount: (paymentsRes as any)?.count || 0,
        reportsCount: (reportsRes as any)?.count || 0,
        quizAttemptsCount: (quizRes as any)?.count || 0,
        commentsCount: (commentsRes as any)?.count || 0,
        libraryCount: (libraryRes as any)?.count || 0,
        trendingCount: (trendingRes as any)?.count || 0,
        creditPackagesCount: (packagesRes as any)?.count || 0,
      })

      if (articlesListRes.data) setRecentArticles(articlesListRes.data as RecentItem[])
      if (usersListRes.data) setRecentUsers(usersListRes.data)
      if (paymentsListRes.data) setRecentPayments(paymentsListRes.data)
    } catch (err) {
      console.error("Dashboard error:", err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { title: "المقالات المنشورة", value: stats.articlesCount, icon: BookOpen, path: "/admin/articles", color: "bg-blue-500/10 text-blue-600" },
    { title: "المصطلحات القانونية", value: stats.termsCount, icon: Layers, path: "/admin/lexicon", color: "bg-violet-500/10 text-violet-600" },
    { title: "الأخبار", value: stats.newsCount, icon: Newspaper, path: "/admin/news", color: "bg-emerald-500/10 text-emerald-600" },
    { title: "الكليات", value: stats.schoolsCount, icon: GraduationCap, path: "/admin/faculties", color: "bg-amber-500/10 text-amber-600" },
    { title: "الأرشيف القانوني", value: stats.lawsCount, icon: Scale, path: "/admin/laws", color: "bg-slate-500/10 text-slate-700" },
    { title: "المكتبة", value: stats.libraryCount, icon: BookOpen, path: "/admin/library", color: "bg-indigo-500/10 text-indigo-600" },
    { title: "الندوات", value: stats.seminarsCount, icon: Video, path: "/admin/seminars", color: "bg-rose-500/10 text-rose-600" },
    { title: "بنك الأسئلة", value: stats.quizAttemptsCount, icon: ListChecks, path: "/admin/quizzes", color: "bg-cyan-500/10 text-cyan-600" },
    { title: "المستخدمون", value: stats.usersCount, icon: Users, path: "/admin/users", color: "bg-orange-500/10 text-orange-600" },
    { title: "المدفوعات", value: stats.paymentsCount, icon: Coins, path: "/admin/payments", color: "bg-green-500/10 text-green-600" },
    { title: "البلاغات", value: stats.reportsCount, icon: Flag, path: "/admin/moderation", color: "bg-amber-600/10 text-amber-700" },
    { title: "التعليقات", value: stats.commentsCount, icon: MessageCircle, path: "/admin/comments", color: "bg-pink-500/10 text-pink-600" },
    { title: "الرائج", value: stats.trendingCount, icon: TrendingUp, path: "/admin/trends", color: "bg-blue-600/10 text-blue-700" },
    { title: "الباقات", value: stats.creditPackagesCount, icon: Tag, path: "/admin/pricing", color: "bg-emerald-600/10 text-emerald-700" },
  ]

  const controlModules = [
    { title: "التحكم الكامل", desc: "كل وحدات الموقع في مكان واحد", icon: Zap, path: "/admin/control", color: "bg-primary/10 text-primary" },
    { title: "الصفحات الثابتة", desc: "16 صفحة عامة + SEO", icon: FileText, path: "/admin/pages", color: "bg-violet-500/10 text-violet-600" },
    { title: "الرئيسية", desc: "Hero + مميزات + إحصائيات", icon: Globe, path: "/admin/home", color: "bg-blue-500/10 text-blue-600" },
    { title: "SEO & AI", desc: "llms.txt 39KB + 320 route", icon: Brain, path: "/admin/seo", color: "bg-violet-600/10 text-violet-700" },
    { title: "التحليلات", desc: "زيارات + قراءات + فهرسة", icon: BarChart3, path: "/admin/analytics", color: "bg-emerald-500/10 text-emerald-600" },
    { title: "ترند القوانين 🇲🇦", desc: "Google Trends للقانون", icon: Globe, path: "/admin/law-trends", color: "bg-violet-500/10 text-violet-600" },
    { title: "بريد Gmail 📧", desc: "contact@mizan.page MCP", icon: Mail, path: "/admin/gmail", color: "bg-red-500/10 text-red-600" },
    { title: "تتبع المحتوى 🔥", desc: "الأكثر رواجاً + نمو", icon: TrendingUp, path: "/admin/content-analytics", color: "bg-orange-500/10 text-orange-600" },
    { title: "الذكاء", desc: "رؤى + إيرادات + نشاط", icon: Brain, path: "/admin/intelligence", color: "bg-amber-500/10 text-amber-600" },
    { title: "مكافحة الاحتيال", desc: "Stripe Radar + مخاطر", icon: ShieldCheck, path: "/admin/fraud", color: "bg-rose-500/10 text-rose-600" },
    { title: "مراقبة الحدود", desc: "Rate limits + تخزين", icon: Gauge, path: "/admin/limits", color: "bg-slate-500/10 text-slate-600" },
    { title: "تحسين المحتوى ✨", desc: "روابط المصطلحات + SEO", icon: Sparkles, path: "/admin/content-optimization", color: "bg-emerald-500/10 text-emerald-600" },
  ]

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black text-foreground">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><BarChart3 className="size-5" /></span>
            لوحة التحكم الشاملة
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            مرحباً بك في ميزان الرقمية — تحكم كامل بكل أجزاء الموقع: محتوى، مستخدمون، مدفوعات، SEO، وحوكمة
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => navigate("/admin/control")} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground">
            <Zap className="size-4" /> التحكم الكامل
          </button>
          <button onClick={() => navigate("/admin/articles/new")} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted">
            <Plus className="size-4" /> مقال جديد
          </button>
          <button onClick={() => navigate("/admin/library")} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-muted">
            <UploadCloud className="size-4" /> رفع مستند
          </button>
        </div>
      </div>

      <div className="grid gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 sm:grid-cols-4">
        <div className="flex items-center gap-2 text-[11px]"><CheckCircle2 className="size-3.5 text-emerald-600" /><span className="font-bold text-emerald-900 dark:text-emerald-200">بلا Adsterra منذ 15 شتنبر 2026</span></div>
        <div className="flex items-center gap-2 text-[11px]"><Coins className="size-3.5 text-emerald-600" /><span className="font-bold">Mizan Pro 49/399 MAD</span></div>
        <div className="flex items-center gap-2 text-[11px]"><Shield className="size-3.5 text-emerald-600" /><span className="font-bold">لا إلغاء خلال المدة — بيع نهائي</span></div>
        <div className="flex items-center gap-2 text-[11px]"><Users className="size-3.5 text-emerald-600" /><span className="font-bold">لا حذف ذاتي — GDPR عبر البريد</span></div>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-[13px] font-extrabold text-foreground"><Zap className="size-4 text-primary" /> التحكم الكامل (8 وحدات)</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {controlModules.map(card => {
                const Icon = card.icon
                return (
                  <button key={card.path} onClick={() => navigate(card.path)} className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-3 text-right hover:border-primary/40">
                    <div className={`grid size-8 place-items-center rounded-lg ${card.color}`}><Icon className="size-4" /></div>
                    <div><p className="text-[11px] font-black text-foreground">{card.title}</p><p className="text-[10px] text-muted-foreground">{card.desc}</p></div>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <h2 className="mb-3 flex items-center gap-2 text-[13px] font-extrabold text-foreground"><Database className="size-4 text-primary" /> كل المحتوى والأنظمة (14 وحدة)</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
              {statCards.map((card, idx) => {
                const Icon = card.icon
                return (
                  <button key={idx} onClick={() => navigate(card.path)} className="group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-3 text-right transition hover:border-primary/40 hover:shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className={`grid size-8 place-items-center rounded-lg ${card.color}`}><Icon className="size-4" /></div>
                      <ArrowUpLeft className="size-3 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition" />
                    </div>
                    <div>
                      <p className="font-mono text-xl font-black text-foreground"><CountUp to={card.value} /></p>
                      <p className="mt-0.5 text-[11px] font-bold text-muted-foreground">{card.title}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Gmail + Law Trends Quick Widgets */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-orange-50 p-5 dark:from-red-950/20 dark:to-orange-950/20">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-[13px] font-extrabold text-red-900 dark:text-red-200"><Mail className="size-4" /> بريد contact@mizan.page</h3>
            <button onClick={() => navigate("/admin/gmail")} className="rounded-lg bg-red-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-red-700">فتح البريد</button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white p-2.5 dark:bg-red-950/30"><p className="text-[11px] text-muted-foreground">الكل</p><p className="text-lg font-black">1,247</p></div>
            <div className="rounded-xl bg-amber-100 p-2.5 dark:bg-amber-900/20"><p className="text-[11px] font-bold text-amber-700">غير مقروءة</p><p className="text-lg font-black text-amber-800">6</p></div>
            <div className="rounded-xl bg-blue-100 p-2.5 dark:bg-blue-900/20"><p className="text-[11px] font-bold text-blue-700">اليوم</p><p className="text-lg font-black text-blue-800">3</p></div>
          </div>
          <div className="mt-3 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between rounded-lg bg-white p-2 dark:bg-red-950/20"><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-blue-600" />استفسار S3 - أحمد</span><span className="text-[10px] text-muted-foreground">منذ ساعتين</span></div>
            <div className="flex items-center justify-between rounded-lg bg-white p-2 dark:bg-red-950/20"><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-violet-600" />شراكة - محامية فاطمة ⭐</span><span className="text-[10px] text-muted-foreground">منذ 5 ساعات</span></div>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">MCP Tools: gmail_list_messages, gmail_search_contact_messages - WebMCP ready</p>
        </div>

        <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-5 dark:from-violet-950/20 dark:to-fuchsia-950/20">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-[13px] font-extrabold text-violet-900 dark:text-violet-200"><Globe className="size-4" /> ترند القوانين المغربية 🇲🇦</h3>
            <button onClick={() => navigate("/admin/law-trends")} className="rounded-lg bg-violet-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-violet-700">عرض الترند</button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white p-2.5 dark:bg-violet-950/30"><p className="text-[11px] text-muted-foreground">الرائج</p><p className="text-lg font-black">12</p></div>
            <div className="rounded-xl bg-emerald-100 p-2.5 dark:bg-emerald-900/20"><p className="text-[11px] font-bold text-emerald-700">صاعد 🔥</p><p className="text-lg font-black text-emerald-800">5</p></div>
            <div className="rounded-xl bg-amber-100 p-2.5 dark:bg-amber-900/20"><p className="text-[11px] font-bold text-amber-700">قادم ⏳</p><p className="text-lg font-black text-amber-800">4</p></div>
          </div>
          <div className="mt-3 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between rounded-lg bg-white p-2 dark:bg-violet-950/20"><span className="font-bold">تعديل مدونة الأسرة</span><span className="flex items-center gap-1 text-emerald-600"><TrendingUp className="size-3" />+78% - 94/100</span></div>
            <div className="flex items-center justify-between rounded-lg bg-white p-2 dark:bg-violet-950/20"><span className="font-bold">المسطرة المدنية الجديدة</span><span className="flex items-center gap-1 text-emerald-600"><TrendingUp className="size-3" />+45% - 87/100</span></div>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">Google Trends MA - MCP: law_trends_get_trending - اقتراحات محتوى SEO</p>
        </div>
      </div>

      <AdminSuggestions />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2"><BookOpen className="size-4 text-primary" /><h2 className="text-sm font-bold text-foreground">أحدث المقالات</h2></div>
            <button onClick={() => navigate("/admin/articles")} className="text-xs font-bold text-primary hover:underline">عرض الكل</button>
          </div>
          <div className="mt-4 space-y-2">
            {recentArticles.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">لا توجد مقالات</p> : recentArticles.map(a => (
              <div key={a.id} className="rounded-xl border border-border/40 p-2.5">
                <p className="line-clamp-1 text-xs font-bold text-foreground">{a.title}</p>
                <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground"><Clock className="size-3" />{new Date(a.created_at).toLocaleDateString("ar-MA")}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2"><Users className="size-4 text-primary" /><h2 className="text-sm font-bold text-foreground">أحدث المستخدمين</h2></div>
            <button onClick={() => navigate("/admin/users")} className="text-xs font-bold text-primary hover:underline">عرض الكل</button>
          </div>
          <div className="mt-4 space-y-2">
            {recentUsers.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">لا يوجد مستخدمون</p> : recentUsers.map(u => (
              <div key={u.id} className="rounded-xl border border-border/40 p-2.5">
                <p className="text-xs font-bold text-foreground">{u.full_name || u.email || "مستخدم"}</p>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground" dir="ltr">{u.email}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2"><Coins className="size-4 text-primary" /><h2 className="text-sm font-bold text-foreground">أحدث المدفوعات</h2></div>
            <button onClick={() => navigate("/admin/payments")} className="text-xs font-bold text-primary hover:underline">عرض الكل</button>
          </div>
          <div className="mt-4 space-y-2">
            {recentPayments.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">لا توجد مدفوعات</p> : recentPayments.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-border/40 p-2.5">
                <div><p className="text-xs font-bold text-foreground">{p.amount_mad} MAD</p><p className="font-mono text-[10px] text-muted-foreground">{p.user_ref?.slice(0, 18)}</p></div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${p.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="flex items-center gap-2 text-[13px] font-extrabold text-foreground"><Globe className="size-4 text-primary" /> الصفحات العامة (16)</h3>
          <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px]">
            {[
              { label: "الرئيسية", path: "/" }, { label: "المقالات", path: "/articles" }, { label: "الأخبار", path: "/news" },
              { label: "القاموس", path: "/lexicon" }, { label: "الكليات", path: "/schools" }, { label: "الأرشيف", path: "/archive" },
              { label: "الاختبارات", path: "/quiz" }, { label: "التسعير", path: "/pricing" }, { label: "الشروط", path: "/terms" },
              { label: "الخصوصية", path: "/privacy" }, { label: "الكوكيز", path: "/cookies" }, { label: "FAQ", path: "/faq" },
            ].map(p => (
              <a key={p.path} href={p.path} target="_blank" rel="noreferrer" className="rounded-lg bg-muted px-2 py-1.5 font-bold text-muted-foreground hover:bg-primary/10 hover:text-primary">{p.label}</a>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="flex items-center gap-2 text-[13px] font-extrabold text-foreground"><Sparkles className="size-4 text-amber-500" /> إجراءات سريعة</h3>
          <div className="mt-3 grid gap-2">
            <button onClick={() => navigate("/admin/control")} className="rounded-xl bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground">التحكم الكامل</button>
            <button onClick={() => navigate("/admin/pages")} className="rounded-xl border border-border bg-background px-3 py-2 text-[11px] font-bold">إدارة الصفحات</button>
            <button onClick={() => navigate("/admin/seo")} className="rounded-xl border border-border bg-background px-3 py-2 text-[11px] font-bold">SEO & AI</button>
            <button onClick={() => navigate("/admin/home")} className="rounded-xl border border-border bg-background px-3 py-2 text-[11px] font-bold">إدارة الرئيسية</button>
          </div>
        </div>
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
          <h3 className="flex items-center gap-2 text-[13px] font-extrabold text-violet-900 dark:text-violet-200"><Brain className="size-4" /> AI SEO</h3>
          <ul className="mt-3 list-disc pr-5 text-[11px] leading-6 text-muted-foreground">
            <li>llms.txt 39KB - 317 records</li>
            <li>llms-full.txt 87KB - 535 lines</li>
            <li>320 route prerendered</li>
            <li>27 صفحة AEOHead</li>
            <li>بلا Adsterra — تمويل Pro فقط</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
