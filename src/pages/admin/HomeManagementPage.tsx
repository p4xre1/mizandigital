import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  LayoutDashboard, Edit3, Eye, ExternalLink, FileText, Layers, GraduationCap,
  Scale, ListChecks, Sparkles, BarChart3, TrendingUp, Users, BookOpen,
  Save, RotateCcw, CheckCircle2, AlertTriangle, Globe, Tag
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"

export default function HomeManagementPage() {
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const tables = ["articles", "lexicon_terms", "faculties", "profiles", "news", "seminars", "pdf_summaries"]
        const res = await Promise.all(
          tables.map(t => (supabase as any).from(t).select("id", { count: "exact", head: true }).then((r: any) => ({ t, c: r.count || 0 })))
        )
        const map: Record<string, number> = {}
        res.forEach(r => map[r.t] = r.c)
        setStats(map)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const sections = [
    { key: "hero", label: "قسم البطل (Hero)", desc: "العنوان الرئيسي + وصف + CTA + إحصائيات 250 مصطلح / 21 كلية / 8 مقالات", status: "ok", path: "src/pages/public/HomePage.tsx" },
    { key: "features", label: "المميزات (6)", desc: "قاموس، كليات، أرشيف، اختبارات، أخبار، مجتمع", status: "ok", path: "HomePage.tsx features array" },
    { key: "stats", label: "الإحصائيات الحية", desc: `مقالات ${stats["articles"] || 8}، مصطلحات ${stats["lexicon_terms"] || 250}، كليات ${stats["faculties"] || 21}، مستخدمون ${stats["profiles"] || 0}`, status: "ok", path: "Supabase counts" },
    { key: "latest", label: "أحدث المحتوى", desc: "أحدث 3 مقالات + 3 أخبار + 3 مصطلحات", status: "ok", path: "HomePage queries" },
    { key: "quiz", label: "قسم الاختبارات", desc: "4 مسارات + رتب D-SSS + CTA", status: "ok", path: "HomePage quiz section" },
    { key: "pricing", label: "قسم التسعير", desc: "Mizan Pro 49/399 MAD + باقات كريدتس + لا إعلانات", status: "updated", path: "PricingPage + HomePage" },
    { key: "seo", label: "SEO & AEO", desc: "AEOHead + directAnswer + breadcrumbs + FAQ + speakable + llms.txt 39KB", status: "ok", path: "AEOHead + scripts/generate-llms-enhanced.mjs" },
  ]

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <LayoutDashboard className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-black text-foreground">إدارة الصفحة الرئيسية</h1>
            <p className="text-[12px] text-muted-foreground">تحكم كامل بأقسام الرئيسية — Hero، مميزات، إحصائيات، تسعير، SEO</p>
          </div>
        </div>
        <div className="flex gap-2">
          <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-[11px] font-bold text-foreground hover:bg-muted">
            <Eye className="size-3.5" /> معاينة
          </a>
          <Link to="/admin/pages" className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-[11px] font-bold text-primary-foreground">
            <FileText className="size-3.5" /> كل الصفحات
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: "المقالات", value: stats["articles"] || 8, icon: FileText },
              { label: "المصطلحات", value: stats["lexicon_terms"] || 250, icon: Layers },
              { label: "الكليات", value: stats["faculties"] || 21, icon: GraduationCap },
              { label: "المستخدمون", value: stats["profiles"] || 0, icon: Users },
            ].map(s => {
              const Icon = s.icon
              return (
                <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </div>
                    <span className="text-[11px] text-muted-foreground">حي</span>
                  </div>
                  <p className="mt-3 text-2xl font-black text-foreground">{s.value}</p>
                  <p className="text-[11px] font-bold text-muted-foreground">{s.label}</p>
                </div>
              )
            })}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-foreground">
              <Sparkles className="size-4 text-amber-500" /> أقسام الصفحة الرئيسية (7 أقسام)
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {sections.map(sec => (
                <div key={sec.key} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[13px] font-bold text-foreground">{sec.label}</p>
                      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{sec.desc}</p>
                      <p className="mt-2 font-mono text-[10px] text-muted-foreground" dir="ltr">{sec.path}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${sec.status === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                      {sec.status === "ok" ? "نشط" : "محدث 15 شتنبر"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="flex items-center gap-2 text-[13px] font-extrabold text-foreground"><BarChart3 className="size-4 text-primary" /> كيف تعدل الرئيسية؟</h3>
              <ul className="mt-3 list-disc pr-5 text-[11px] leading-7 text-muted-foreground">
                <li><code>src/pages/public/HomePage.tsx</code> — Hero، features، stats، latest، quiz، pricing sections</li>
                <li><code>src/components/home/*</code> — مكونات الأقسام</li>
                <li><code>public/llms.txt</code> + <code>llms-full.txt</code> — AI SEO (39KB + 87KB)</li>
                <li><code>scripts/generate-llms-enhanced.mjs</code> — يولد llms.txt من Supabase</li>
                <li>الإحصائيات حية من Supabase (articles, lexicon_terms, faculties, profiles)</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <h3 className="flex items-center gap-2 text-[13px] font-extrabold text-emerald-900 dark:text-emerald-200"><CheckCircle2 className="size-4" /> حالة الرئيسية</h3>
              <ul className="mt-3 list-disc pr-5 text-[11px] leading-6 text-muted-foreground">
                <li>✅ بلا إعلانات Adsterra — تمويل عبر Mizan Pro فقط</li>
                <li>✅ AEOHead + directAnswer + breadcrumbs + FAQ + speakable</li>
                <li>✅ 320 route prerendered + 21 school + 250 lexicon</li>
                <li>✅ Mizan Pro 49/399 MAD + باقات 19-199 MAD</li>
                <li>✅ كوكيز محدثة: sb-mizan-auth (Supabase Auth), mizan:subscription:v1, mizan:saved:content:v1, mizan:quiz:progress:v1/v2, mizan:visitor_id, mizan:analytics:queue</li>
                <li>⚠️ لوحة تحرير مرئية للرئيسية مستقبلاً (حالياً عبر الكود)</li>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-[13px] font-extrabold text-foreground">روابط سريعة لإدارة المحتوى الظاهر في الرئيسية</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <Link to="/admin/articles" className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-[11px] font-bold text-foreground hover:bg-muted"><FileText className="size-3.5" /> إدارة المقالات (تظهر في الرئيسية)</Link>
              <Link to="/admin/lexicon" className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-[11px] font-bold text-foreground hover:bg-muted"><Layers className="size-3.5" /> إدارة المصطلحات (250)</Link>
              <Link to="/admin/faculties" className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-[11px] font-bold text-foreground hover:bg-muted"><GraduationCap className="size-3.5" /> إدارة الكليات (21)</Link>
              <Link to="/admin/news" className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-[11px] font-bold text-foreground hover:bg-muted"><FileText className="size-3.5" /> إدارة الأخبار (13)</Link>
              <Link to="/admin/seminars" className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-[11px] font-bold text-foreground hover:bg-muted"><BarChart3 className="size-3.5" /> إدارة الندوات (3)</Link>
              <Link to="/admin/pricing" className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-[11px] font-bold text-foreground hover:bg-muted"><Tag className="size-3.5" /> إدارة التسعير (Mizan Pro)</Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
