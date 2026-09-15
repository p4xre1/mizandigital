import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { CreditPackage, Payment } from "@/lib/payments/types";
import { Coins, Package, CreditCard, Check, X } from "lucide-react";

export default function PaymentsAdminPage() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [pkgRes, payRes] = await Promise.all([
          (supabase as any).from("credit_packages").select("*").order("sort_order"),
          (supabase as any).from("payments").select("*").order("created_at", { ascending: false }).limit(50),
        ]);
        if (pkgRes.data) setPackages(pkgRes.data as CreditPackage[]);
        if (payRes.data) setPayments(payRes.data as Payment[]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const togglePackage = async (id: string, is_active: boolean) => {
    await (supabase as any).from("credit_packages").update({ is_active: !is_active }).eq("id", id);
    setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: !is_active } : p)));
  };

  const completePayment = async (id: string) => {
    try {
      const { error } = await (supabase as any).rpc("complete_payment_and_grant_credits", { p_payment_id: id });
      if (error) throw error;
      alert("تم إكمال الدفع ومنح الكريدتس");
      setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, status: "completed" as const } : p)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "فشل");
    }
  };

  return (
    <div className="p-6" dir="rtl">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
          <Coins className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-black text-foreground">المدفوعات والكريدتس</h1>
          <p className="text-[12px] text-muted-foreground">إدارة الحزم ومتابعة عمليات الشراء</p>
        </div>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
      ) : (
        <>
          <section className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 text-[14px] font-extrabold text-foreground">
              <Package className="size-4" /> الحزم
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {packages.map((pkg) => (
                <div key={pkg.id} className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-[13px] font-black text-foreground">{pkg.title}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{pkg.credits} + {pkg.bonus_credits} هدية</p>
                  <p className="mt-1 text-[12px] font-bold text-foreground">{pkg.price_mad} د.م.</p>
                  <button onClick={() => togglePackage(pkg.id, pkg.is_active)} className={`mt-3 w-full rounded-xl px-3 py-1.5 text-[11px] font-bold ${pkg.is_active ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                    {pkg.is_active ? "نشطة" : "معطلة"}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-[14px] font-extrabold text-foreground">
              <CreditCard className="size-4" /> المدفوعات الأخيرة
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-right text-[12px]">
                <thead className="bg-muted text-[11px] text-muted-foreground">
                  <tr>
                    <th className="p-3">المستخدم</th>
                    <th className="p-3">المبلغ</th>
                    <th className="p-3">الكريدتس</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((pay) => (
                    <tr key={pay.id} className="border-t border-border">
                      <td className="p-3 font-mono text-[11px]">{pay.user_ref?.slice(0, 20) || "—"}</td>
                      <td className="p-3">{pay.amount_mad} د.م.</td>
                      <td className="p-3">{pay.credits_purchased + pay.bonus_credits}</td>
                      <td className="p-3">
                        <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${pay.status === "completed" ? "bg-emerald-100 text-emerald-700" : pay.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>{pay.status}</span>
                      </td>
                      <td className="p-3">
                        {pay.status === "pending" && (
                          <button onClick={() => completePayment(pay.id)} className="rounded-lg bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground">
                            إكمال
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
