import { useState } from "react"
import { Link } from "react-router-dom"
import {
  FileText, HelpCircle, Info, Mail, Shield, ShieldCheck, Settings,
  BookOpen, Tag, ExternalLink, Edit3, Eye, CheckCircle2, AlertTriangle,
  FileQuestion, Scale, Bookmark
} from "lucide-react"

interface StaticPage {
  key: string
  label: string
  path: string
  icon: any
  status: "ok" | "needs_review" | "updated"
  lastUpdated: string
  description: string
  seo: string
  aeo: boolean
  hasAdmin: boolean
}

export default function PagesManagementPage() {
  const [filter, setFilter] = useState<"all" | "legal" | "content" | "system">("all")

  const pages: StaticPage[] = [
    { key: "home", label: "الرئيسية", path: "/", icon: FileText, status: "ok", lastUpdated: "15 شتنبر 2026", description: "Hero + إحصائيات + 6 مميزات + 250 مصطلح + 21 كلية", seo: "AEOHead + directAnswer + breadcrumbs", aeo: true, hasAdmin: true },
    { key: "articles", label: "المقالات", path: "/articles", icon: FileText, status: "ok", lastUpdated: "15 شتنبر 2026", description: "8 مقالات + فلترة + تفاعلات + حفظ", seo: "AEO + sitemap", aeo: true, hasAdmin: true },
    { key: "news", label: "الأخبار", path: "/news", icon: FileText, status: "ok", lastUpdated: "15 شتنبر 2026", description: "13 خبر + حفظ + تفاعلات", seo: "AEO", aeo: true, hasAdmin: true },
    { key: "lexicon", label: "القاموس", path: "/lexicon", icon: BookOpen, status: "ok", lastUpdated: "15 شتنبر 2026", description: "250 مصطلح قانوني + بحث", seo: "AEO + 250 prerendered", aeo: true, hasAdmin: true },
    { key: "schools", label: "الكليات", path: "/schools", icon: FileText, status: "ok", lastUpdated: "15 شتنبر 2026", description: "21 كلية + دليل + خريطة", seo: "AEO + 21 prerendered", aeo: true, hasAdmin: true },
    { key: "archive", label: "الأرشيف", path: "/archive", icon: Scale, status: "ok", lastUpdated: "15 شتنبر 2026", description: "قوانين S1-S6 + تحميل", seo: "AEO", aeo: true, hasAdmin: true },
    { key: "quiz", label: "الاختبارات", path: "/quiz", icon: FileQuestion, status: "ok", lastUpdated: "15 شتنبر 2026", description: "4 مسارات + رتب D-SSS + XP", seo: "AEO + HowTo", aeo: true, hasAdmin: true },
    { key: "pricing", label: "التسعير", path: "/pricing", icon: Tag, status: "updated", lastUpdated: "15 شتنبر 2026", description: "Mizan Pro 49/399 MAD + باقات 19-199 + لا إلغاء", seo: "AEO + Product schema", aeo: true, hasAdmin: true },
    { key: "about", label: "حول", path: "/about", icon: Info, status: "ok", lastUpdated: "15 شتنبر 2026", description: "قصة المنصة + بلا إعلانات", seo: "AEOHead", aeo: true, hasAdmin: false },
    { key: "contact", label: "اتصل بنا", path: "/contact", icon: Mail, status: "ok", lastUpdated: "15 شتنبر 2026", description: "contact@mizan.page + نموذج", seo: "AEOHead", aeo: true, hasAdmin: false },
    { key: "faq", label: "الأسئلة الشائعة", path: "/faq", icon: HelpCircle, status: "ok", lastUpdated: "15 شتنبر 2026", description: "FAQ + لا حذف ذاتي + لا إلغاء اشتراك", seo: "AEOHead + FAQ schema", aeo: true, hasAdmin: false },
    { key: "guidelines", label: "الإرشادات", path: "/guidelines", icon: BookOpen, status: "ok", lastUpdated: "15 شتنبر 2026", description: "قواعد الاستخدام + الحوكمة", seo: "AEOHead", aeo: true, hasAdmin: false },
    { key: "terms", label: "الشروط والأحكام", path: "/terms", icon: Shield, status: "updated", lastUpdated: "15 شتنبر 2026", description: "بلا Adsterra + Mizan Pro بيع نهائي + لا حذف ذاتي", seo: "AEOHead + directAnswer + FAQ", aeo: true, hasAdmin: false },
    { key: "privacy", label: "سياسة الخصوصية", path: "/privacy", icon: ShieldCheck, status: "updated", lastUpdated: "15 شتنبر 2026", description: "GDPR + بيانات الاشتراك + لا بيع بيانات + حذف عبر البريد", seo: "AEOHead + directAnswer + FAQ", aeo: true, hasAdmin: false },
    { key: "cookies", label: "سياسة الكوكيز", path: "/cookies", icon: Settings, status: "updated", lastUpdated: "15 شتنبر 2026", description: "بلا Adsterra + sb-* (Supabase Auth), mizan:subscription:v1, mizan:saved:content:v1, mizan_quiz_progress", seo: "AEOHead + directAnswer + FAQ", aeo: true, hasAdmin: false },
    { key: "saved", label: "المحفوظات", path: "/saved", icon: Bookmark, status: "ok", lastUpdated: "15 شتنبر 2026", description: "mizan:saved:content:v1 + تفاعلات", seo: "AEOHead", aeo: true, hasAdmin: false },
  ]

  const filtered = pages.filter(p => {
    if (filter === "all") return true
    if (filter === "legal") return ["terms", "privacy", "cookies"].includes(p.key)
    if (filter === "content") return ["articles", "news", "lexicon", "schools", "archive", "quiz"].includes(p.key)
    if (filter === "system") return ["home", "pricing", "about", "contact", "faq", "guidelines", "saved"].includes(p.key)
    return true
  })

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <FileText className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-black text-foreground">إدارة الصفحات الثابتة</h1>
            <p className="text-[12px] text-muted-foreground">كل صفحات الموقع العامة — 16 صفحة + SEO/AEO + حالة التحديث</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/home" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-[11px] font-bold text-foreground hover:bg-muted">
            <Edit3 className="size-3.5" /> الرئيسية
          </Link>
          <Link to="/admin/seo" className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-[11px] font-bold text-primary-foreground">
            <Settings className="size-3.5" /> SEO & AI
          </Link>
        </div>
      </div>

      <div className="flex gap-2">
        {[
          { k: "all", label: "الكل (16)" },
          { k: "content", label: "المحتوى (6)" },
          { k: "legal", label: "قانونية (3)" },
          { k: "system", label: "النظام (7)" },
        ].map(f => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k as any)}
            className={`rounded-full border px-3.5 py-1.5 text-[11px] font-bold ${filter === f.k ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background text-muted-foreground"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(p => {
          const Icon = p.icon
          return (
            <div key={p.key} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <p className="text-[13px] font-black text-foreground">{p.label}</p>
                    <p className="font-mono text-[10px] text-muted-foreground" dir="ltr">{p.path}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${p.status === "ok" ? "bg-emerald-100 text-emerald-700" : p.status === "updated" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                  {p.status === "ok" ? "محدث" : p.status === "updated" ? "محدث 15 شتنبر" : "يحتاج مراجعة"}
                </span>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-muted-foreground">{p.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">{p.seo}</span>
                {p.aeo && <span className="rounded-full bg-violet-500/10 px-2 py-1 text-[10px] font-bold text-violet-700">AEO</span>}
                {p.hasAdmin && <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-700">له لوحة إدارة</span>}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
                <span className="text-[10px] text-muted-foreground">{p.lastUpdated}</span>
                <div className="flex gap-1.5">
                  <a href={p.path} target="_blank" rel="noreferrer" className="grid size-7 place-items-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground">
                    <Eye className="size-3.5" />
                  </a>
                  <a href={p.path} target="_blank" rel="noreferrer" className="grid size-7 place-items-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground">
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
        <h3 className="flex items-center gap-2 text-[13px] font-extrabold text-amber-900 dark:text-amber-200">
          <AlertTriangle className="size-4" /> ملاحظات التحديث الأخير (15 شتنبر 2026)
        </h3>
        <ul className="mt-3 list-disc pr-5 text-[11px] leading-6 text-muted-foreground">
          <li>تمت إزالة Adsterra نهائياً من /cookies, /terms, /privacy — لا إعلانات خارجية</li>
          <li>/terms و /privacy و /cookies محدثة بـ Mizan Pro 49/399 MAD بيع نهائي لا إلغاء خلال المدة، بعد الانتهاء يجب الدفع، لا حذف ذاتي للحساب</li>
          <li>كوكيز جديدة: sb-* (Supabase Auth), mizan:subscription:v1, mizan:saved:content:v1, mizan_quiz_progress (D-SSS), mizan:analytics:queue</li>
          <li>كل الصفحات الآن AEOHead مع directAnswer + breadcrumbs + FAQ + speakable</li>
          <li>الصفحات الثابتة (About, Contact, FAQ, Guidelines) تحتاج لوحة تحرير مستقبلية — حالياً تعديل عبر الكود</li>
        </ul>
      </div>
    </div>
  )
}
