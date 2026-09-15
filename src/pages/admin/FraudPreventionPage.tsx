import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { ShieldAlert, AlertTriangle } from "lucide-react";
import { evaluatePaymentRisk } from "../../../shared/billing/risk.js";

export default function FraudPreventionPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await (supabase as any).from("payments").select("*").order("created_at", { ascending: false }).limit(100);
      const enriched = (data || []).map((p: any) => {
        const risk = evaluatePaymentRisk(p, data || []);
        return { ...p, risk };
      });
      setPayments(enriched.filter((p: any) => p.risk.level !== "low"));
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="p-6" dir="rtl">
      <h1 className="mb-4 flex items-center gap-2 text-xl font-black text-foreground"><ShieldAlert className="size-5" /> مكافحة الاحتيال</h1>
      {loading ? <p className="text-sm text-muted-foreground">جارٍ التحميل...</p> : payments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center"><p className="text-sm font-bold text-foreground">لا توجد معاملات مشبوهة</p></div>
      ) : (
        <div className="grid gap-3">
          {payments.map((p) => (
            <div key={p.id} className={`rounded-2xl border p-4 ${p.risk.level === "high" ? "border-rose-300 bg-rose-50 dark:bg-rose-950/20" : "border-amber-300 bg-amber-50 dark:bg-amber-950/20"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-bold text-foreground">{p.user_ref || "مجهول"} — {p.amount_mad} MAD — {p.credits_purchased} كريدتس</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">مستوى الخطر: {p.risk.level} (نقاط: {p.risk.score})</p>
                  <ul className="mt-2 list-disc pr-5 text-[11px] text-foreground">{p.risk.issues.map((i: any) => <li key={i.code}>{i.message}</li>)}</ul>
                </div>
                <AlertTriangle className={`size-6 ${p.risk.level === "high" ? "text-rose-600" : "text-amber-600"}`} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
