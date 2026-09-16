import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Tag, Save, Plus, Coins, Crown, Zap, CheckCircle2, AlertTriangle, Edit3 } from "lucide-react"

export default function PricingManagementPage() {
  const [packages, setPackages] = useState<any[]>([])
  const [proPlans, setProPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await (supabase as any).from("credit_packages").select("*").order("sort_order")
      setPackages(data || [])
      // Mock Pro plans - in real app these would be in a separate table or config
      setProPlans([
        { id: "monthly", title: "Mizan Pro شهري", price_mad: 49, credits: 500, bonus: 0, popular: false, features: ["شجرة قوانين متقدمة", "تحديات مميزة", "دعم أولوية"] },
        { id: "yearly", title: "Mizan Pro سنوي", price_mad: 399, credits: 7000, bonus: 1000, popular: true, features: ["كل مزايا الشهري", "7000 + 1000 هدية", "خصم 32%", "شارات حصرية"] },
      ])
      setLoading(false)
    }
    load()
  }, [])

  const update = (id: string, field: string, value: any) => {
    setPackages(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const save = async (pkg: any) => {
    const { error } = await (supabase as any).from("credit_packages").update({
      title: pkg.title,
      price_mad: pkg.price_mad,
      credits: pkg.credits,
      bonus_credits: pkg.bonus_credits,
      is_popular: pkg.is_popular,
      is_active: pkg.is_active,
    }).eq("id", pkg.id)
    if (error) alert(error.message)
    else alert("تم الحفظ")
  }

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600"><Tag className="size-6" /></span>
        <div>
          <h1 className="text-xl font-black text-foreground">إدارة التسعير — Mizan Pro + الكريدتس — تحكم كامل</h1>
          <p className="text-[12px] text-muted-foreground">تحكم كامل بأسعار Mizan Pro 49/399 MAD + باقات كريدتس 19-199 + سياسة بيع نهائي</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:bg-violet-950/20">
          <div className="flex items-center gap-2"><Crown className="size-4 text-violet-600" /><p className="text-[12px] font-bold text-violet-800 dark:text-violet-300">Mizan Pro شهري</p></div>
          <p className="mt-1 text-xl font-black text-foreground">49 MAD</p>
          <p className="text-[11px] text-muted-foreground">500 كريدتس • بيع نهائي • لا إلغاء خلال الشهر</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:bg-amber-950/20">
          <div className="flex items-center gap-2"><Crown className="size-4 text-amber-600" /><p className="text-[12px] font-bold text-amber-800 dark:text-amber-300">Mizan Pro سنوي — الأكثر توفيراً</p></div>
          <p className="mt-1 text-xl font-black text-foreground">399 MAD</p>
          <p className="text-[11px] text-muted-foreground">7000 + 1000 هدية • خصم 32% • بيع نهائي</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2"><Coins className="size-4 text-emerald-600" /><p className="text-[12px] font-bold text-emerald-800 dark:text-emerald-300">باقات كريدتس</p></div>
          <p className="mt-1 text-xl font-black text-foreground">19 - 199 MAD</p>
          <p className="text-[11px] text-muted-foreground">100 - 2000 كريدتس + بونص</p>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <h3 className="flex items-center gap-2 text-[12px] font-extrabold text-amber-900 dark:text-amber-200"><AlertTriangle className="size-4" /> سياسة الاشتراك الجديدة (15 شتنبر 2026)</h3>
        <ul className="mt-2 list-disc pr-5 text-[11px] leading-6 text-muted-foreground">
          <li><strong>البيع نهائي:</strong> Mizan Pro شهري/سنوي + باقات كريدتس — لا إلغاء ولا استرداد خلال المدة النشطة</li>
          <li><strong>بعد الانتهاء:</strong> ينتهي الوصول لمزايا Pro تلقائياً، يجب الدفع مجدداً للاستمرار — لا تجديد تلقائي إجباري</li>
          <li><strong>الكريدتس:</strong> تبقى بعد انتهاء Pro، لكن بونص Pro ينتهي</li>
          <li><strong>حذف الحساب:</strong> لا يوجد زر ذاتي، يجب طلب عبر contact@mizan.page — الاشتراك النشط لا يُسترد عند الحذف</li>
          <li><strong>بلا إعلانات:</strong> Adsterra أُزيلت نهائياً — التمويل عبر Pro فقط</li>
        </ul>
      </div>

      {loading ? <p className="py-10 text-center text-sm text-muted-foreground">جارٍ التحميل...</p> : (
        <>
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-[14px] font-extrabold text-foreground"><Crown className="size-4 text-violet-600" /> خطط Mizan Pro (ثابتة — تعديل عبر الكود)</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {proPlans.map(plan => (
                <div key={plan.id} className={`rounded-2xl border p-5 ${plan.popular ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20" : "border-border bg-card"}`}>
                  <div className="flex items-start justify-between">
                    <div><p className="text-[14px] font-black text-foreground">{plan.title}</p><p className="mt-1 text-[12px] font-bold text-foreground">{plan.price_mad} MAD • {plan.credits} + {plan.bonus} هدية</p></div>
                    {plan.popular && <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold text-white">الأكثر توفيراً</span>}
                  </div>
                  <ul className="mt-3 list-disc pr-5 text-[11px] leading-6 text-muted-foreground">
                    {plan.features.map((f: string) => <li key={f}>{f}</li>)}
                  </ul>
                  <p className="mt-3 text-[10px] text-muted-foreground">المسار: <code>src/lib/billing/plans.ts</code> + <code>PricingPage.tsx</code> + <code>MizanProCard.tsx</code></p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 flex items-center gap-2 text-[14px] font-extrabold text-foreground"><Coins className="size-4 text-emerald-600" /> باقات الكريدتس (قابلة للتعديل)</h2>
            <div className="grid gap-4">
              {packages.map(pkg => (
                <div key={pkg.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="grid gap-3 sm:grid-cols-6">
                    <input value={pkg.title} onChange={e => update(pkg.id, "title", e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-[12px]" placeholder="العنوان" />
                    <input type="number" value={pkg.price_mad} onChange={e => update(pkg.id, "price_mad", Number(e.target.value))} className="rounded-xl border border-border bg-background px-3 py-2 text-[12px]" placeholder="MAD" />
                    <input type="number" value={pkg.credits} onChange={e => update(pkg.id, "credits", Number(e.target.value))} className="rounded-xl border border-border bg-background px-3 py-2 text-[12px]" placeholder="Credits" />
                    <input type="number" value={pkg.bonus_credits} onChange={e => update(pkg.id, "bonus_credits", Number(e.target.value))} className="rounded-xl border border-border bg-background px-3 py-2 text-[12px]" placeholder="Bonus" />
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1.5 text-[11px]"><input type="checkbox" checked={!!pkg.is_popular} onChange={e => update(pkg.id, "is_popular", e.target.checked)} /> شائع</label>
                      <label className="flex items-center gap-1.5 text-[11px]"><input type="checkbox" checked={!!pkg.is_active} onChange={e => update(pkg.id, "is_active", e.target.checked)} /> نشط</label>
                    </div>
                    <button onClick={() => save(pkg)} className="inline-flex items-center justify-center gap-1 rounded-xl bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground"><Save className="size-3.5" /> حفظ</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
