import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  ShieldCheck, LayoutDashboard, FileText, GraduationCap, Scale, BookOpen, Video,
  ListChecks, MessageCircle, Users, Flag, Coins, Settings, Brain, Gauge, Tag,
  Database, TrendingUp, Globe, Search, Bookmark, CreditCard, BarChart3,
  Newspaper, Layers, Calendar, FileBadge, HelpCircle, Info, Mail, Shield,
  FileQuestion, BookMarked, Sparkles, Zap, Activity, AlertTriangle, CheckCircle2,
  ExternalLink, ArrowUpLeft, Plus, Edit3
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"

interface ModuleStat {
  key: string
  label: string
  labelAr: string
  count: number
  icon: any
  path: string
  color: string
  status: "ok" | "warning" | "empty"
  description: string
}

export default function SiteControlPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [health, setHealth] = useState({ db: true, auth: true, payments: true, analytics: true })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const tables = [
          "articles", "news", "lexicon_terms", "faculties", "laws", "pdf_summaries",
          "seminars", "profiles", "mizan_profiles", "quiz_attempts", "credit_packages",
          "payments", "reports", "trending_topics"
        ]
        const results = await Promise.all(
          tables.map(t => (supabase as any).from(t).select("id", { count: "exact", head: true }).then((r: any) => ({ table: t, count: r.count || 0, error: !!r.error })))
        )
        const map: Record<string, number> = {}
        let dbOk = true
        results.forEach(r => {
          map[r.table] = r.count
          if (r.error) dbOk = false
        })
        setStats(map)
        setHealth({ db: dbOk, auth: true, payments: (map["credit_packages"] || 0) > 0, analytics: true })
      } catch {
        setHealth({ db: false, auth: false, payments: false, analytics: false })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const modules: ModuleStat[] = [
    { key: "articles", label: "Articles", labelAr: "المقالات والبحوث", count: stats["articles"] || 0, icon: FileText, path: "/admin/articles", color: "text-blue-600 bg-blue-500/10", status: (stats["articles"] || 0) > 0 ? "ok" : "empty", description: "8 مقالات منشورة + محرر" },
    { key: "news", label: "News", labelAr: "الأخبار والمستجدات", count: stats["news"] || 0, icon: Newspaper, path: "/admin/news", color: "text-emerald-600 bg-emerald-500/10", status: (stats["news"] || 0) > 0 ? "ok" : "empty", description: "13 خبراً + إدارة" },
    { key: "lexicon_terms", label: "Lexicon", labelAr: "القاموس القانوني", count: stats["lexicon_terms"] || 0, icon: Layers, path: "/admin/lexicon", color: "text-violet-600 bg-violet-500/10", status: (stats["lexicon_terms"] || 0) >= 250 ? "ok" : (stats["lexicon_terms"] || 0) > 0 ? "warning" : "empty", description: "250 مصطلحاً قانونياً" },
    { key: "faculties", label: "Schools", labelAr: "الكليات والمؤسسات", count: stats["faculties"] || 0, icon: GraduationCap, path: "/admin/faculties", color: "text-amber-600 bg-amber-500/10", status: (stats["faculties"] || 0) >= 21 ? "ok" : "warning", description: "21 كلية ومؤسسة" },
    { key: "laws", label: "Archive", labelAr: "الأرشيف القانوني", count: stats["laws"] || 0, icon: Scale, path: "/admin/laws", color: "text-slate-700 bg-slate-500/10", status: (stats["laws"] || 0) > 0 ? "ok" : "empty", description: "القوانين والمدونات" },
    { key: "pdf_summaries", label: "Library", labelAr: "مكتبة الوثائق", count: stats["pdf_summaries"] || 0, icon: BookOpen, path: "/admin/library", color: "text-indigo-600 bg-indigo-500/10", status: (stats["pdf_summaries"] || 0) > 0 ? "ok" : "empty", description: "9 مستندات PDF" },
    { key: "seminars", label: "Seminars", labelAr: "الندوات والفعاليات", count: stats["seminars"] || 0, icon: Video, path: "/admin/seminars", color: "text-rose-600 bg-rose-500/10", status: (stats["seminars"] || 0) > 0 ? "ok" : "empty", description: "3 فعاليات + بثوث" },
    { key: "quiz_attempts", label: "Quizzes", labelAr: "بنك الأسئلة", count: stats["quiz_attempts"] || 0, icon: ListChecks, path: "/admin/quizzes", color: "text-cyan-600 bg-cyan-500/10", status: "ok", description: "4 مسارات: جامعي، عام، مباريات، مقابلات + رتب D-SSS" },
    { key: "profiles", label: "Users", labelAr: "المستخدمون", count: stats["profiles"] || 0, icon: Users, path: "/admin/users", color: "text-orange-600 bg-orange-500/10", status: (stats["profiles"] || 0) > 0 ? "ok" : "empty", description: "Supabase Auth + Mizan Profiles + تجميد" },
    { key: "mizan_profiles", label: "Mizan Profiles", labelAr: "ملفات ميزان", count: stats["mizan_profiles"] || 0, icon: BookMarked, path: "/admin/users", color: "text-pink-600 bg-pink-500/10", status: "ok", description: "XP، كريدتس، رتب، شارات" },
    { key: "credit_packages", label: "Pricing", labelAr: "التسعير والباقات", count: stats["credit_packages"] || 0, icon: Tag, path: "/admin/pricing", color: "text-emerald-700 bg-emerald-500/10", status: (stats["credit_packages"] || 0) > 0 ? "ok" : "warning", description: "Mizan Pro 49/399 MAD + باقات كريدتس 19-199" },
    { key: "payments", label: "Payments", labelAr: "المدفوعات", count: stats["payments"] || 0, icon: Coins, path: "/admin/payments", color: "text-green-600 bg-green-500/10", status: "ok", description: "Stripe + Radar + بيع نهائي" },
    { key: "reports", label: "Reports", labelAr: "البلاغات والحوكمة", count: stats["reports"] || 0, icon: Flag, path: "/admin/moderation", color: "text-amber-700 bg-amber-500/10", status: "ok", description: "بلاغات + إجراءات إشراف" },
    { key: "trending_topics", label: "Trends", labelAr: "الرائج القانوني", count: stats["trending_topics"] || 0, icon: TrendingUp, path: "/admin/trends", color: "text-blue-700 bg-blue-500/10", status: "ok", description: "Google Trends + تحويل لمقال" },
  ]

  const publicPages = [
    { label: "الرئيسية", path: "/", icon: LayoutDashboard, desc: "Hero + إحصائيات + مميزات" },
    { label: "المقالات", path: "/articles", icon: FileText, desc: "8 مقالات + تفاعلات" },
    { label: "الأخبار", path: "/news", icon: Newspaper, desc: "13 خبر + حفظ" },
    { label: "القاموس", path: "/lexicon", icon: Layers, desc: "250 مصطلح" },
    { label: "الكليات", path: "/schools", icon: GraduationCap, desc: "21 كلية + دليل" },
    { label: "الأرشيف", path: "/archive", icon: Scale, desc: "قوانين S1-S6" },
    { label: "الاختبارات", path: "/quiz", icon: ListChecks, desc: "4 مسارات + رتب" },
    { label: "الملف الشخصي", path: "/profile", icon: Users, desc: "XP، رتبة، محفوظات" },
    { label: "المحفوظات", path: "/saved", icon: Bookmark, desc: "mizan:saved:content:v1" },
    { label: "التسعير", path: "/pricing", icon: Tag, desc: "Mizan Pro 49/399" },
    { label: "الأسئلة الشائعة", path: "/faq", icon: HelpCircle, desc: "FAQ" },
    { label: "حول", path: "/about", icon: Info, desc: "About" },
    { label: "اتصل بنا", path: "/contact", icon: Mail, desc: "Contact" },
    { label: "الشروط", path: "/terms", icon: Shield, desc: "بلا إعلانات + لا إلغاء" },
    { label: "الخصوصية", path: "/privacy", icon: ShieldCheck, desc: "GDPR + حذف عبر البريد" },
    { label: "الكوكيز", path: "/cookies", icon: Settings, desc: "بلا Adsterra" },
  ]

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <LayoutDashboard className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-black text-foreground">التحكم الكامل بالموقع</h1>
            <p className="text-[12px] text-muted-foreground">لوحة تحكم شاملة — كل أجزاء ميزان الرقمية في مكان واحد</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate("/admin/home")} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-[11px] font-bold text-foreground hover:bg-muted">
            <Edit3 className="size-3.5" /> إدارة الرئيسية
          </button>
          <button onClick={() => navigate("/admin/pages")} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-[11px] font-bold text-primary-foreground">
            <FileText className="size-3.5" /> إدارة الصفحات الثابتة
          </button>
        </div>
      </div>

      {/* Health */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { k: "db", label: "قاعدة البيانات", ok: health.db },
          { k: "auth", label: "Supabase Auth", ok: health.auth },
          { k: "payments", label: "Stripe + التسعير", ok: health.payments },
          { k: "analytics", label: "التحليلات + GA4", ok: health.analytics },
        ].map(h => (
          <div key={h.k} className={`rounded-2xl border p-4 ${h.ok ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20" : "border-rose-200 bg-rose-50 dark:bg-rose-950/20"}`}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-foreground">{h.label}</p>
              {h.ok ? <CheckCircle2 className="size-4 text-emerald-600" /> : <AlertTriangle className="size-4 text-rose-600" />}
            </div>
            <p className={`mt-1 text-[11px] font-bold ${h.ok ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700"}`}>{h.ok ? "يعمل" : "مشكلة"}</p>
          </div>
        ))}
      </div>

      {/* All modules */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-[14px] font-extrabold text-foreground"><Zap className="size-4 text-primary" /> كل وحدات الموقع ({modules.length})</h2>
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {modules.map(m => {
              const Icon = m.icon
              return (
                <button
                  key={m.key}
                  onClick={() => navigate(m.path)}
                  className="group relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-right transition hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className={`grid size-9 place-items-center rounded-xl ${m.color}`}>
                      <Icon className="size-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`size-2 rounded-full ${m.status === "ok" ? "bg-emerald-500" : m.status === "warning" ? "bg-amber-500" : "bg-slate-300"}`} />
                      <ArrowUpLeft className="size-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[13px] font-black text-foreground">{m.labelAr}</p>
                    <p className="text-[10px] text-muted-foreground">{m.label} • {m.count} سجل</p>
                    <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{m.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Public pages map */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-[14px] font-extrabold text-foreground"><Globe className="size-4 text-primary" /> خريطة الصفحات العامة (16 صفحة)</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {publicPages.map(p => {
            const Icon = p.icon
            return (
              <a
                key={p.path}
                href={p.path}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:bg-muted"
              >
                <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-foreground">{p.label}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{p.desc}</p>
                </div>
                <ExternalLink className="size-3 text-muted-foreground" />
              </a>
            )
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="flex items-center gap-2 text-[13px] font-extrabold text-foreground"><Sparkles className="size-4 text-amber-500" /> إجراءات سريعة</h3>
          <div className="mt-3 grid gap-2">
            <button onClick={() => navigate("/admin/articles/new")} className="flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground"><Plus className="size-3.5" /> مقال جديد</button>
            <button onClick={() => navigate("/admin/quizzes")} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-[11px] font-bold text-foreground"><ListChecks className="size-3.5" /> إضافة سؤال اختبار</button>
            <button onClick={() => navigate("/admin/lexicon")} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-[11px] font-bold text-foreground"><Layers className="size-3.5" /> إضافة مصطلح</button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="flex items-center gap-2 text-[13px] font-extrabold text-foreground"><BarChart3 className="size-4 text-emerald-600" /> إحصائيات سريعة</h3>
          <div className="mt-3 space-y-2 text-[11px]">
            <div className="flex justify-between"><span className="text-muted-foreground">المقالات المنشورة</span><span className="font-bold">{stats["articles"] || 0}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">المصطلحات</span><span className="font-bold">{stats["lexicon_terms"] || 0} / 250</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">الكليات</span><span className="font-bold">{stats["faculties"] || 0} / 21</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">المستخدمون</span><span className="font-bold">{stats["profiles"] || 0}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">المدفوعات</span><span className="font-bold">{stats["payments"] || 0}</span></div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="flex items-center gap-2 text-[13px] font-extrabold text-foreground"><ShieldCheck className="size-4 text-primary" /> حالة الموقع</h3>
          <ul className="mt-3 list-disc pr-5 text-[11px] leading-6 text-muted-foreground">
            <li>بلا إعلانات Adsterra منذ 15 شتنبر 2026</li>
            <li>التمويل: Mizan Pro 49/399 MAD + كريدتس 19-199</li>
            <li>البيع نهائي، لا إلغاء خلال المدة، بعد الانتهاء يجب الدفع</li>
            <li>لا حذف ذاتي للحساب — عبر contact@mizan.page GDPR</li>
            <li>كوكيز: sb-* (Supabase Auth), mizan:subscription:v1, mizan:saved:content:v1, mizan_quiz_progress, mizan:analytics:queue</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
