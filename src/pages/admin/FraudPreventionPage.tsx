import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { ShieldAlert, AlertTriangle, CheckCircle2, Ban, Eye, Coins, Globe, CreditCard } from "lucide-react"
import { evaluatePaymentRisk } from "../../../shared/billing/risk.js"

export default function FraudPreventionPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [allPayments, setAllPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "high" | "medium">("all")

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await (supabase as any).from("payments").select("*").order("created_at", { ascending: false }).limit(200)
      const enriched = (data || []).map((p: any) => {
        const risk = evaluatePaymentRisk(p, data || [])
        return { ...p, risk }
      })
      setAllPayments(data || [])
      setPayments(enriched)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = payments.filter(p => {
    if (filter === "all") return p.risk.level !== "low"
    return p.risk.level === filter
  })

  const highCount = payments.filter(p => p.risk.level === "high").length
  const medCount = payments.filter(p => p.risk.level === "medium").length
  const lowCount = payments.filter(p => p.risk.level === "low").length

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-rose-500/10 text-rose-600"><ShieldAlert className="size-6" /></span>
          <div>
            <h1 className="text-xl font-black text-foreground">مكافحة الاحتيال — Stripe Radar + Risk Engine</h1>
            <p className="text-[12px] text-muted-foreground">تحكم كامل بمدفوعات Mizan Pro والكريدتس — كشف الاحتيال والبلد والمخاطر</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:bg-rose-950/20"><p className="text-[11px] font-bold text-rose-700">خطر عالي</p><p className="text-xl font-black text-foreground">{highCount}</p></div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:bg-amber-950/20"><p className="text-[11px] font-bold text-amber-700">خطر متوسط</p><p className="text-xl font-black text-foreground">{medCount}</p></div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:bg-emerald-950/20"><p className="text-[11px] font-bold text-emerald-700">آمن</p><p className="text-xl font-black text-foreground">{lowCount}</p></div>
        <div className="rounded-2xl border border-border bg-card p-4"><p className="text-[11px] font-bold text-muted-foreground">الإجمالي</p><p className="text-xl font-black text-foreground">{payments.length}</p></div>
      </div>

      <div className="flex gap-2">
        {[
          { k: "all", l: `الكل المشبوه (${highCount + medCount})` },
          { k: "high", l: `عالي (${highCount})` },
          { k: "medium", l: `متوسط (${medCount})` },
        ].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k as any)} className={`rounded-full border px-3.5 py-1.5 text-[11px] font-bold ${filter === f.k ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background text-muted-foreground"}`}>{f.l}</button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-[13px] font-extrabold text-foreground">كيف يعمل كشف الاحتيال؟</h2>
        <ul className="mt-2 list-disc pr-5 text-[11px] leading-6 text-muted-foreground">
          <li><code>evaluatePaymentRisk</code> في <code>shared/billing/risk.js</code> — يحلل: سرعة إنشاء Checkout، بلد البطاقة vs IP، أكواد الرفض (stolen_card, fraudulent)</li>
          <li><code>Stripe Radar</code> — يحمي تلقائياً من البطاقات المسروقة</li>
          <li><code>provider_payment_id</code> + <code>card_country</code> + <code>client_ip_country</code> — للكشف الجغرافي</li>
          <li>البيع نهائي — لا إلغاء خلال المدة — يقلل chargebacks</li>
        </ul>
      </div>

      {loading ? <p className="py-10 text-center text-sm text-muted-foreground">جارٍ التحميل...</p> : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <CheckCircle2 className="mx-auto mb-2 size-8 text-emerald-500" />
          <p className="text-sm font-bold text-foreground">لا توجد معاملات مشبوهة</p>
          <p className="mt-1 text-[12px] text-muted-foreground">كل المدفوعات آمنة — {lowCount} عملية آمنة</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(p => (
            <div key={p.id} className={`rounded-2xl border p-4 ${p.risk.level === "high" ? "border-rose-300 bg-rose-50 dark:bg-rose-950/20" : "border-amber-300 bg-amber-50 dark:bg-amber-950/20"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-bold" dir="ltr">{p.user_ref?.slice(0, 24) || "مجهول"}</span>
                    <span className="rounded-full bg-card px-2 py-1 text-[11px] font-bold border border-border">{p.amount_mad} MAD - {p.credits_purchased + (p.bonus_credits || 0)} كريدتس</span>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${p.risk.level === "high" ? "bg-rose-500 text-white" : "bg-amber-500 text-white"}`}>{p.risk.level} - {p.risk.score} نقطة</span>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${p.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{p.status}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><CreditCard className="size-3" /> بطاقة: {p.card_country || "—"}</span>
                    <span className="flex items-center gap-1"><Globe className="size-3" /> IP: {p.client_ip_country || p.ip_country || "—"}</span>
                    <span className="flex items-center gap-1"><Coins className="size-3" /> {p.package_id || "—"}</span>
                  </div>
                  <ul className="mt-2 list-disc pr-5 text-[11px] text-foreground">
                    {p.risk.issues.map((i: any) => <li key={i.code}>{i.message} <span className="font-mono text-[10px] text-muted-foreground">({i.code})</span></li>)}
                  </ul>
                  <p className="mt-1 text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleString("ar-MA")}</p>
                </div>
                <AlertTriangle className={`size-6 shrink-0 ${p.risk.level === "high" ? "text-rose-600" : "text-amber-600"}`} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
