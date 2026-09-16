import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Coins, Package, CreditCard, Check, X, BarChart3, TrendingUp, Users, ShieldCheck, Globe, AlertTriangle } from "lucide-react"
import type { CreditPackage, Payment } from "@/lib/payments/types"

export default function PaymentsAdminPage() {
  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [stats, setStats] = useState({ totalRevenue: 0, completed: 0, pending: 0, failed: 0, totalCredits: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "completed" | "pending" | "failed">("all")

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [pkgRes, payRes] = await Promise.all([
          (supabase as any).from("credit_packages").select("*").order("sort_order"),
          (supabase as any).from("payments").select("*").order("created_at", { ascending: false }).limit(100),
        ])
        if (pkgRes.data) setPackages(pkgRes.data as CreditPackage[])
        if (payRes.data) {
          setPayments(payRes.data as Payment[])
          const completed = payRes.data.filter((p: any) => p.status === "completed")
          const pending = payRes.data.filter((p: any) => p.status === "pending")
          const failed = payRes.data.filter((p: any) => p.status === "failed")
          setStats({
            totalRevenue: completed.reduce((s: number, p: any) => s + Number(p.amount_mad || 0), 0),
            completed: completed.length,
            pending: pending.length,
            failed: failed.length,
            totalCredits: completed.reduce((s: number, p: any) => s + Number(p.credits_purchased || 0) + Number(p.bonus_credits || 0), 0),
          })
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const togglePackage = async (id: string, is_active: boolean) => {
    await (supabase as any).from("credit_packages").update({ is_active: !is_active }).eq("id", id)
    setPackages(prev => prev.map(p => p.id === id ? { ...p, is_active: !is_active } : p))
  }

  const completePayment = async (id: string) => {
    try {
      const { error } = await (supabase as any).rpc("complete_payment_and_grant_credits", { p_payment_id: id })
      if (error) throw error
      alert("تم إكمال الدفع ومنح الكريدتس")
      setPayments(prev => prev.map(p => p.id === id ? { ...p, status: "completed" as const } : p))
    } catch (e) {
      alert(e instanceof Error ? e.message : "فشل")
    }
  }

  const filtered = payments.filter(p => filter === "all" ? true : p.status === filter)

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600"><Coins className="size-6" /></span>
          <div>
            <h1 className="text-xl font-black text-foreground">المدفوعات والكريدتس — تحكم كامل</h1>
            <p className="text-[12px] text-muted-foreground">Mizan Pro 49/399 MAD + باقات 19-199 + Stripe + بيع نهائي + لا إلغاء خلال المدة</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:bg-emerald-950/20"><p className="text-[11px] font-bold text-emerald-700">الإيرادات</p><p className="text-xl font-black text-foreground">{stats.totalRevenue} MAD</p><p className="text-[10px] text-muted-foreground">{stats.completed} عملية مكتملة</p></div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:bg-blue-950/20"><p className="text-[11px] font-bold text-blue-700">الكريدتس الممنوحة</p><p className="text-xl font-black text-foreground">{stats.totalCredits}</p></div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:bg-amber-950/20"><p className="text-[11px] font-bold text-amber-700">قيد الانتظار</p><p className="text-xl font-black text-foreground">{stats.pending}</p></div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:bg-rose-950/20"><p className="text-[11px] font-bold text-rose-700">فشل</p><p className="text-xl font-black text-foreground">{stats.failed}</p></div>
        <div className="rounded-2xl border border-border bg-card p-4"><p className="text-[11px] text-muted-foreground">الباقات النشطة</p><p className="text-xl font-black text-foreground">{packages.filter(p => p.is_active).length}/{packages.length}</p></div>
      </div>

      {loading ? <p className="py-10 text-center text-sm text-muted-foreground">جارٍ التحميل...</p> : (
        <>
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-[14px] font-extrabold text-foreground"><Package className="size-4" /> الباقات (Mizan Pro + كريدتس)</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {packages.map(pkg => (
                <div key={pkg.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between">
                    <div><p className="text-[13px] font-black text-foreground">{pkg.title}</p><p className="mt-1 text-[11px] text-muted-foreground">{pkg.credits} + {pkg.bonus_credits} هدية</p><p className="mt-1 text-[12px] font-bold text-foreground">{pkg.price_mad} د.م.</p></div>
                    {pkg.is_popular && <span className="rounded-full bg-amber-500 px-2 py-1 text-[10px] font-bold text-white">شائع</span>}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => togglePackage(pkg.id, pkg.is_active)} className={`flex-1 rounded-xl px-3 py-1.5 text-[11px] font-bold ${pkg.is_active ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>{pkg.is_active ? "نشطة" : "معطلة"}</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-foreground"><CreditCard className="size-4" /> المدفوعات الأخيرة (100)</h2>
              <div className="flex gap-1.5">
                {[
                  { k: "all", l: "الكل" }, { k: "completed", l: "مكتمل" }, { k: "pending", l: "معلق" }, { k: "failed", l: "فشل" }
                ].map(f => (
                  <button key={f.k} onClick={() => setFilter(f.k as any)} className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${filter === f.k ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background text-muted-foreground"}`}>{f.l}</button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-right text-[12px]">
                <thead className="bg-muted text-[11px] text-muted-foreground"><tr><th className="p-3">المستخدم</th><th className="p-3">المبلغ</th><th className="p-3">الكريدتس</th><th className="p-3">الحالة</th><th className="p-3">البلد</th><th className="p-3">إجراء</th></tr></thead>
                <tbody>
                  {filtered.map(pay => (
                    <tr key={pay.id} className="border-t border-border">
                      <td className="p-3 font-mono text-[11px]" dir="ltr">{pay.user_ref?.slice(0, 20) || "—"}</td>
                      <td className="p-3 font-bold">{pay.amount_mad} د.م.</td>
                      <td className="p-3">{pay.credits_purchased + pay.bonus_credits}</td>
                      <td className="p-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${pay.status === "completed" ? "bg-emerald-100 text-emerald-700" : pay.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>{pay.status}</span></td>
                      <td className="p-3 text-[11px]">{(pay as any).card_country || (pay as any).client_ip_country || "—"}</td>
                      <td className="p-3">{pay.status === "pending" && <button onClick={() => completePayment(pay.id)} className="rounded-lg bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground">إكمال</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
            <h3 className="flex items-center gap-2 text-[12px] font-extrabold text-amber-900 dark:text-amber-200"><AlertTriangle className="size-4" /> سياسة الاشتراك الجديدة</h3>
            <ul className="mt-2 list-disc pr-5 text-[11px] leading-6 text-muted-foreground">
              <li>Mizan Pro شهري 49 MAD (500 كريدتس) + سنوي 399 MAD (7000+1000 هدية) — بيع نهائي، لا إلغاء خلال المدة</li>
              <li>بعد الانتهاء: ينتهي الوصول لـ Pro تلقائياً، يجب الدفع مجدداً للاستمرار — لا تجديد تلقائي إجباري</li>
              <li>باقات كريدتس: 100 (19) — 350 (49) — 800 (99) — 2000 (199) MAD</li>
              <li>لا حذف ذاتي للحساب — عبر contact@mizan.page GDPR — الاشتراك النشط لا يُسترد عند الحذف</li>
              <li>بلا Adsterra منذ 15 شتنبر 2026 — التمويل عبر Pro فقط</li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
