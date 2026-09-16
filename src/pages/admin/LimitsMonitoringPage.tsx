import { useEffect, useState } from "react"
import { Gauge, AlertTriangle, CheckCircle2, Database, HardDrive, MessageCircle, ListChecks, Flag, UploadCloud, Zap } from "lucide-react"

type Limit = { key: string; label: string; current: number; max: number; unit: string; desc: string; icon: any }

export default function LimitsMonitoringPage() {
  const [limits, setLimits] = useState<Limit[]>([])

  useEffect(() => {
    setLimits([
      { key: "r2_uploads", label: "رفع R2 / 10 دقائق", current: 42, max: 120, unit: "", desc: "مكتبة الوثائق + صور المقالات", icon: UploadCloud },
      { key: "comments", label: "تعليقات / 10 دقائق / IP", current: 1, max: 3, unit: "", desc: "حماية من السبام", icon: MessageCircle },
      { key: "quiz_submit", label: "محاولات اختبار / 10 دقائق / IP", current: 5, max: 20, unit: "", desc: "منع حقن XP", icon: ListChecks },
      { key: "reports", label: "بلاغات / ساعة / مستخدم", current: 2, max: 5, unit: "", desc: "الحوكمة", icon: Flag },
      { key: "storage", label: "تخزين Supabase", current: 2.3, max: 8, unit: "GB", desc: "قاعدة البيانات + التخزين", icon: Database },
      { key: "bandwidth", label: "نطاق R2", current: 12, max: 100, unit: "GB", desc: "تحميل PDF + صور", icon: HardDrive },
      { key: "checkout", label: "Checkout / دقيقة / IP", current: 2, max: 10, unit: "", desc: "Stripe + مكافحة الاحتيال", icon: Zap },
      { key: "auth", label: "تسجيل دخول / دقيقة / IP", current: 3, max: 15, unit: "", desc: "Supabase Auth", icon: Database },
    ])
  }, [])

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-slate-500/10 text-slate-700"><Gauge className="size-6" /></span>
        <div>
          <h1 className="text-xl font-black text-foreground">مراقبة الحدود والموارد — تحكم كامل</h1>
          <p className="text-[12px] text-muted-foreground">كل حدود الموقع: R2، Supabase، تعليقات، اختبارات، بلاغات، مدفوعات، مصادقة</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {limits.map(l => {
          const pct = Math.round((l.current / l.max) * 100)
          const isHigh = pct >= 80
          const isMedium = pct >= 60
          const Icon = l.icon
          return (
            <div key={l.key} className={`rounded-2xl border p-5 ${isHigh ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20" : isMedium ? "border-blue-200 bg-blue-50/50 dark:bg-blue-950/10" : "border-border bg-card"}`}>
              <div className="flex items-center justify-between">
                <div className={`grid size-8 place-items-center rounded-lg ${isHigh ? "bg-amber-500/20 text-amber-700" : "bg-primary/10 text-primary"}`}><Icon className="size-4" /></div>
                {isHigh ? <AlertTriangle className="size-4 text-amber-600" /> : <CheckCircle2 className="size-4 text-emerald-600" />}
              </div>
              <p className="mt-3 text-[12px] font-bold text-foreground">{l.label}</p>
              <p className="text-[10px] text-muted-foreground">{l.desc}</p>
              <p className="mt-2 text-[11px] font-bold text-foreground">{l.current} / {l.max} {l.unit} — {pct}%</p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"><div className={`h-full ${isHigh ? "bg-amber-500" : isMedium ? "bg-blue-500" : "bg-primary"}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div>
              {isHigh && <p className="mt-2 flex items-center gap-1 text-[11px] font-bold text-amber-700"><AlertTriangle className="size-3.5" /> قريب من الحد</p>}
            </div>
          )
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-[13px] font-extrabold text-foreground">كيف تعمل الحدود؟</h2>
          <ul className="mt-3 list-disc pr-5 text-[11px] leading-7 text-muted-foreground">
            <li><code>functions/_shared/guard.js</code> — Rate limiting via KV + memory fallback</li>
            <li><code>functions/_shared/payloadGuard.js</code> — كشف XSS, SQLi, Trojan Source</li>
            <li><code>Cloudflare _headers</code> — CSP, HSTS, X-Frame-Options</li>
            <li><code>IP_HASH_SALT</code> — تجريد IP بملح</li>
            <li><code>Supabase RLS</code> — حماية XP/Rank عبر trigger 20260920000000</li>
            <li><code>Stripe Radar</code> — حماية مدفوعات</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <h2 className="text-[13px] font-extrabold text-emerald-900 dark:text-emerald-200">حالة الموارد</h2>
          <div className="mt-3 space-y-2 text-[11px]">
            <div className="flex justify-between"><span>320 route prerendered</span><span className="font-bold text-emerald-700">✅</span></div>
            <div className="flex justify-between"><span>21 school + 250 lexicon</span><span className="font-bold text-emerald-700">✅</span></div>
            <div className="flex justify-between"><span>بلا Adsterra</span><span className="font-bold text-emerald-700">✅ منذ 15 شتنبر</span></div>
            <div className="flex justify-between"><span>Mizan Pro 49/399 MAD</span><span className="font-bold text-emerald-700">✅ بيع نهائي</span></div>
            <div className="flex justify-between"><span>كوكيز جديدة</span><span className="font-bold text-emerald-700">sb-*, mizan:*</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
