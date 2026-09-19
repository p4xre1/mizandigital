import { useEffect, useState } from "react"
import {
  Search, Globe, FileText, Brain, CheckCircle2, AlertTriangle, ExternalLink,
  Sparkles, BarChart3, Layers, GraduationCap, Scale, BookOpen, Tag, ShieldCheck
} from "lucide-react"

interface SeoFile {
  name: string
  path: string
  size: string
  status: "ok" | "needs_update"
  desc: string
}

export default function SeoManagementPage() {
  const [files, setFiles] = useState<SeoFile[]>([])

  useEffect(() => {
    setFiles([
      { name: "llms.txt", path: "/llms.txt", size: "39KB - 248 lines - 317 records", status: "ok", desc: "لـ ChatGPT, Perplexity, Claude — كل الصفحات + المميزات" },
      { name: "llms-full.txt", path: "/llms-full.txt", size: "87KB - 535 lines", status: "ok", desc: "نسخة كاملة مفصلة للذكاء الاصطناعي" },
      { name: "ai.txt", path: "/ai.txt", size: "1.3KB", status: "ok", desc: "توجيه للذكاء الاصطناعي" },
      { name: "ai-sitemap.xml", path: "/ai-sitemap.xml", size: "959B", status: "ok", desc: "خريطة للذكاء الاصطناعي" },
      { name: "sitemap.xml", path: "/sitemap.xml", size: "320 routes", status: "ok", desc: "320 مسار prerendered" },
      { name: "robots.txt", path: "/robots.txt", size: "~500B", status: "ok", desc: "Allow all + Sitemap + llms.txt" },
      { name: "ai-plugin.json", path: "/.well-known/ai-plugin.json", size: "877B", status: "ok", desc: "لـ ChatGPT plugins" },
      { name: "openapi.json", path: "/.well-known/openapi.json", size: "949B", status: "ok", desc: "OpenAPI للذكاء الاصطناعي" },
    ])
  }, [])

  const pages = [
    { path: "/", label: "الرئيسية", aeo: "AEOHead + directAnswer + breadcrumbs + FAQ + speakable", status: "ok" },
    { path: "/articles", label: "المقالات", aeo: "AEOHead + CollectionPage", status: "ok" },
    { path: "/lexicon", label: "القاموس", aeo: "AEOHead + 250 terms prerendered", status: "ok" },
    { path: "/schools", label: "الكليات", aeo: "AEOHead + 21 schools prerendered", status: "ok" },
    { path: "/quiz", label: "الاختبارات", aeo: "AEOHead + HowTo + FAQ", status: "ok" },
    { path: "/pricing", label: "التسعير", aeo: "AEOHead + Product + Offer", status: "ok" },
    { path: "/terms", label: "الشروط", aeo: "AEOHead + directAnswer (لا إعلانات + لا إلغاء)", status: "ok" },
    { path: "/privacy", label: "الخصوصية", aeo: "AEOHead + directAnswer (GDPR + لا بيع بيانات)", status: "ok" },
    { path: "/cookies", label: "الكوكيز", aeo: "AEOHead + directAnswer (بلا Adsterra + كوكيز جديدة)", status: "ok" },
  ]

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-violet-500/10 text-violet-600">
          <Search className="size-6" />
        </span>
        <div>
          <h1 className="text-xl font-black text-foreground">إدارة SEO و AEO والذكاء الاصطناعي</h1>
          <p className="text-[12px] text-muted-foreground">تحكم كامل بـ SEO + AEO + llms.txt + sitemap + AI crawl optimization</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:bg-emerald-950/20">
          <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">320 مسار</p>
          <p className="text-[11px] text-muted-foreground">prerendered</p>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:bg-violet-950/20">
          <p className="text-[11px] font-bold text-violet-700 dark:text-violet-300">27 صفحة</p>
          <p className="text-[11px] text-muted-foreground">AEOHead</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:bg-blue-950/20">
          <p className="text-[11px] font-bold text-blue-700 dark:text-blue-300">39KB llms.txt</p>
          <p className="text-[11px] text-muted-foreground">317 records</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:bg-amber-950/20">
          <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300">بلا Adsterra</p>
          <p className="text-[11px] text-muted-foreground">منذ 15 شتنبر</p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-[14px] font-extrabold text-foreground"><Brain className="size-4 text-violet-600" /> ملفات AI و SEO</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {files.map(f => (
            <div key={f.name} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[12px] font-bold text-foreground" dir="ltr">{f.name}</p>
                {f.status === "ok" ? <CheckCircle2 className="size-4 text-emerald-600" /> : <AlertTriangle className="size-4 text-amber-600" />}
              </div>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground" dir="ltr">{f.path}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{f.size}</p>
              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{f.desc}</p>
              <a href={f.path} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">
                <ExternalLink className="size-3" /> فتح
              </a>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-[14px] font-extrabold text-foreground"><Globe className="size-4 text-primary" /> صفحات بـ AEOHead</h2>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-right text-[12px]">
            <thead className="bg-muted text-[11px] text-muted-foreground">
              <tr><th className="p-3">المسار</th><th className="p-3">الصفحة</th><th className="p-3">AEO</th><th className="p-3">الحالة</th></tr>
            </thead>
            <tbody>
              {pages.map(p => (
                <tr key={p.path} className="border-t border-border">
                  <td className="p-3 font-mono text-[11px]" dir="ltr">{p.path}</td>
                  <td className="p-3 font-bold">{p.label}</td>
                  <td className="p-3 text-[11px] text-muted-foreground">{p.aeo}</td>
                  <td className="p-3"><span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">مُحسن</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="flex items-center gap-2 text-[13px] font-extrabold text-foreground"><Sparkles className="size-4 text-amber-500" /> كيف تعمل AEO؟</h3>
          <ul className="mt-3 list-disc pr-5 text-[11px] leading-7 text-muted-foreground">
            <li><code>AEOHead</code> يولد: title, meta description, OG, Twitter, JSON-LD (Breadcrumb, FAQ, HowTo, Product, Article)</li>
            <li><code>directAnswer</code> — إجابة مباشرة للذكاء الاصطناعي (ChatGPT, Perplexity)</li>
            <li><code>speakable</code> — للمساعدات الصوتية</li>
            <li><code>generate-llms-enhanced.mjs</code> يولد llms.txt من Supabase (articles, news, lexicon, faculties, etc)</li>
            <li><code>optimize-ai-seo.mjs</code> يولد ai.txt, ai-sitemap.xml, ai-plugin.json, openapi.json</li>
            <li>320 route prerendered + 21 school + 250 lexicon + sitemap.xml</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
          <h3 className="flex items-center gap-2 text-[13px] font-extrabold text-violet-900 dark:text-violet-200"><Brain className="size-4" /> تحديث AI SEO</h3>
          <div className="mt-3 space-y-2">
            <p className="text-[11px] leading-6 text-muted-foreground">
              لتحديث ملفات AI بعد إضافة محتوى جديد:
            </p>
            <code className="block rounded-lg bg-black/10 p-2 font-mono text-[11px]" dir="ltr">
              node scripts/generate-llms-enhanced.mjs<br />
              node scripts/optimize-ai-seo.mjs<br />
              pnpm build
            </code>
            <p className="text-[11px] text-muted-foreground">يولد: llms.txt (39KB), llms-full.txt (87KB), ai.txt, ai-sitemap.xml, sitemap.xml (320 routes)</p>
          </div>
        </div>
      </div>
    </div>
  )
}
