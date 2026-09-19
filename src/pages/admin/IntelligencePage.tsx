import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import {
  Brain, TrendingUp, Users, FileText, Coins, BarChart3, Activity,
  BookOpen, Layers, GraduationCap, MessageCircle, Flag, ListChecks,
  Zap, ShieldCheck, Globe, CheckCircle2, AlertTriangle, ArrowUpRight
} from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function IntelligencePage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState<string[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [
          profiles, mizanProfiles, attempts, articles, payments, reports,
          lexicon, faculties, news, comments, library, laws
        ] = await Promise.all([
          (supabase as any).from("profiles").select("id", { count: "exact", head: true }),
          (supabase as any).from("mizan_profiles").select("id, xp, credits, rank", { count: "exact" }),
          (supabase as any).from("quiz_attempts").select("id, score, xp_earned", { count: "exact" }),
          (supabase as any).from("articles").select("id, status", { count: "exact" }),
          (supabase as any).from("payments").select("amount_mad, status").eq("status", "completed"),
          (supabase as any).from("reports").select("id, status", { count: "exact" }),
          (supabase as any).from("lexicon_terms").select("id", { count: "exact", head: true }),
          (supabase as any).from("faculties").select("id", { count: "exact", head: true }),
          (supabase as any).from("news").select("id", { count: "exact", head: true }),
          (supabase as any).from("comments").select("id", { count: "exact", head: true }),
          supabase.from("pdf_summaries").select("id", { count: "exact", head: true }),
          (supabase as any).from("laws").select("id", { count: "exact", head: true }),
        ])

        const totalRevenue = (payments.data || []).reduce((s: number, p: any) => s + Number(p.amount_mad || 0), 0)
        const totalXP = (mizanProfiles.data || []).reduce((s: number, p: any) => s + Number(p.xp || 0), 0)
        const avgScore = attempts.data?.length ? (attempts.data.reduce((s: number, a: any) => s + Number(a.score || 0), 0) / attempts.data.length).toFixed(1) : "0"

        setStats({
          users: profiles.count || 0,
          mizanUsers: mizanProfiles.count || 0,
          attempts: attempts.count || 0,
          articles: articles.count || 0,
          revenue: totalRevenue,
          reports: reports.count || 0,
          lexicon: lexicon.count || 0,
          faculties: faculties.count || 0,
          news: news.count || 0,
          comments: comments.count || 0,
          library: (library as any).count || 0,
          laws: (laws as any).count || 0,
          totalXP,
          avgScore,
          paymentsCount: payments.data?.length || 0,
        })

        const ins: string[] = []
        if ((attempts.count || 0) > 100) ins.push(`🔥 ${attempts.count} محاولة اختبار — المسار الأكثر نشاطاً يحتاج تحديات يومية`)
        if ((profiles.count || 0) > 0 && (mizanProfiles.count || 0) / (profiles.count || 1) < 0.5) ins.push(`⚠️ فقط ${Math.round(((mizanProfiles.count || 0) / (profiles.count || 1)) * 100)}% من المستخدمين أكملوا ملف ميزان — حسّن onboarding`)
        if (totalRevenue > 0) ins.push(`💰 إيرادات ${totalRevenue} MAD من ${payments.data?.length || 0} عملية دفع — Mizan Pro يعمل`)
        if ((reports.count || 0) > 5) ins.push(`🚩 ${reports.count} بلاغ — راجع الحوكمة`)
        ins.push(`📚 ${lexicon.count || 0}/250 مصطلح + ${faculties.count || 0}/21 كلية — اكتمال المحتوى الأساسي`)
        ins.push(`🎯 متوسط نتيجة الاختبارات ${avgScore}% — XP إجمالي ${totalXP}`)
        ins.push(`✅ بلا Adsterra منذ 15 شتنبر 2026 — التمويل عبر Pro فقط`)
        setInsights(ins)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const cards = [
    { label: "المستخدمون", value: stats.users, icon: Users, color: "text-blue-600 bg-blue-500/10", path: "/admin/users" },
    { label: "ملفات ميزان", value: stats.mizanUsers, icon: BookOpen, label2: `${stats.totalXP || 0} XP`, icon2: Zap, color: "text-violet-600 bg-violet-500/10", path: "/admin/users" },
    { label: "محاولات الاختبارات", value: stats.attempts, icon: ListChecks, label2: `متوسط ${stats.avgScore || 0}%`, color: "text-cyan-600 bg-cyan-500/10", path: "/admin/quizzes" },
    { label: "المقالات", value: stats.articles, icon: FileText, color: "text-emerald-600 bg-emerald-500/10", path: "/admin/articles" },
    { label: "المصطلحات", value: stats.lexicon, icon: Layers, sub: "/ 250", color: "text-indigo-600 bg-indigo-500/10", path: "/admin/lexicon" },
    { label: "الكليات", value: stats.faculties, icon: GraduationCap, sub: "/ 21", color: "text-amber-600 bg-amber-500/10", path: "/admin/faculties" },
    { label: "الأخبار", value: stats.news, icon: FileText, color: "text-green-600 bg-green-500/10", path: "/admin/news" },
    { label: "المكتبة", value: stats.library, icon: BookOpen, color: "text-slate-600 bg-slate-500/10", path: "/admin/library" },
    { label: "التعليقات", value: stats.comments, icon: MessageCircle, color: "text-pink-600 bg-pink-500/10", path: "/admin/comments" },
    { label: "البلاغات", value: stats.reports, icon: Flag, color: "text-rose-600 bg-rose-500/10", path: "/admin/moderation" },
    { label: "الإيرادات", value: `${stats.revenue || 0} MAD`, icon: Coins, label2: `${stats.paymentsCount || 0} دفع`, color: "text-emerald-700 bg-emerald-500/10", path: "/admin/payments" },
    { label: "الأرشيف", value: stats.laws, icon: BookOpen, color: "text-slate-700 bg-slate-500/10", path: "/admin/laws" },
  ]

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-violet-500/10 text-violet-600"><Brain className="size-6" /></span>
          <div>
            <h1 className="text-xl font-black text-foreground">لوحة الاستخبارات الشاملة</h1>
            <p className="text-[12px] text-muted-foreground">رؤى كاملة عن كل أجزاء الموقع — مستخدمون، محتوى، مدفوعات، حوكمة</p>
          </div>
        </div>
        <button onClick={() => navigate("/admin/control")} className="rounded-xl bg-primary px-3.5 py-2 text-[11px] font-bold text-primary-foreground">التحكم الكامل</button>
      </div>

      {loading ? <p className="py-10 text-center text-sm text-muted-foreground">جارٍ التحميل...</p> : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            {cards.map(c => {
              const Icon = c.icon
              return (
                <button key={c.label} onClick={() => navigate(c.path)} className="rounded-2xl border border-border bg-card p-4 text-right hover:border-primary/40">
                  <div className={`mb-2 grid size-9 place-items-center rounded-xl ${c.color}`}><Icon className="size-5" /></div>
                  <p className="text-[11px] font-bold text-muted-foreground">{c.label}</p>
                  <p className="text-lg font-black text-foreground">{c.value}{c.sub || ""}</p>
                  {c.label2 && <p className="text-[10px] text-muted-foreground">{c.label2}</p>}
                </button>
              )
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-foreground"><TrendingUp className="size-4 text-emerald-600" /> رؤى مقترحة</h2>
              <ul className="mt-3 space-y-2">
                {insights.map((ins, i) => (
                  <li key={i} className="rounded-xl bg-muted p-2.5 text-[11px] leading-6 text-foreground">{ins}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-foreground"><BarChart3 className="size-4 text-primary" /> خريطة الموقع الكاملة</h2>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                {[
                  { l: "الرئيسية", p: "/" }, { l: "المقالات", p: "/articles" }, { l: "الأخبار", p: "/news" },
                  { l: "القاموس 250", p: "/lexicon" }, { l: "الكليات 21", p: "/schools" }, { l: "الأرشيف", p: "/archive" },
                  { l: "الاختبارات 4", p: "/quiz" }, { l: "التسعير Pro", p: "/pricing" }, { l: "الشروط", p: "/terms" },
                  { l: "الخصوصية", p: "/privacy" }, { l: "الكوكيز", p: "/cookies" }, { l: "FAQ", p: "/faq" },
                ].map(item => (
                  <a key={item.p} href={item.p} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-border bg-background px-2.5 py-1.5 hover:bg-muted">
                    <span className="font-bold">{item.l}</span><ArrowUpRight className="size-3 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <h3 className="flex items-center gap-2 text-[13px] font-extrabold text-emerald-900 dark:text-emerald-200"><CheckCircle2 className="size-4" /> حالة المنصة</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-3 text-[11px]">
              <div className="rounded-xl bg-card p-3 border border-border"><p className="font-bold">بلا إعلانات</p><p className="text-muted-foreground">Adsterra أُزيلت 15 شتنبر 2026</p></div>
              <div className="rounded-xl bg-card p-3 border border-border"><p className="font-bold">Mizan Pro</p><p className="text-muted-foreground">49 MAD شهري / 399 سنوي - بيع نهائي</p></div>
              <div className="rounded-xl bg-card p-3 border border-border"><p className="font-bold">GDPR</p><p className="text-muted-foreground">لا حذف ذاتي — عبر contact@mizan.page</p></div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
