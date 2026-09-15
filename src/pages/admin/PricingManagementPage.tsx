import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Tag, Save } from "lucide-react";

export default function PricingManagementPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await (supabase as any).from("credit_packages").select("*").order("sort_order");
      setPackages(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const update = async (id: string, field: string, value: any) => {
    setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const save = async (pkg: any) => {
    const { error } = await (supabase as any).from("credit_packages").update({
      title: pkg.title,
      price_mad: pkg.price_mad,
      credits: pkg.credits,
      bonus_credits: pkg.bonus_credits,
      is_popular: pkg.is_popular,
      is_active: pkg.is_active,
    }).eq("id", pkg.id);
    if (error) alert(error.message);
    else alert("تم الحفظ");
  };

  return (
    <div className="p-6" dir="rtl">
      <h1 className="mb-6 flex items-center gap-2 text-xl font-black text-foreground"><Tag className="size-5" /> إدارة التسعير</h1>
      {loading ? <p className="text-sm text-muted-foreground">جارٍ التحميل...</p> : (
        <div className="grid gap-4">
          {packages.map((pkg) => (
            <div key={pkg.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="grid gap-3 sm:grid-cols-5">
                <input value={pkg.title} onChange={(e) => update(pkg.id, "title", e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-[12px]" />
                <input type="number" value={pkg.price_mad} onChange={(e) => update(pkg.id, "price_mad", Number(e.target.value))} className="rounded-xl border border-border bg-background px-3 py-2 text-[12px]" placeholder="MAD" />
                <input type="number" value={pkg.credits} onChange={(e) => update(pkg.id, "credits", Number(e.target.value))} className="rounded-xl border border-border bg-background px-3 py-2 text-[12px]" placeholder="Credits" />
                <input type="number" value={pkg.bonus_credits} onChange={(e) => update(pkg.id, "bonus_credits", Number(e.target.value))} className="rounded-xl border border-border bg-background px-3 py-2 text-[12px]" placeholder="Bonus" />
                <div className="flex gap-2">
                  <label className="flex items-center gap-1 text-[11px]"><input type="checkbox" checked={!!pkg.is_popular} onChange={(e) => update(pkg.id, "is_popular", e.target.checked)} /> شائع</label>
                  <label className="flex items-center gap-1 text-[11px]"><input type="checkbox" checked={!!pkg.is_active} onChange={(e) => update(pkg.id, "is_active", e.target.checked)} /> نشط</label>
                </div>
              </div>
              <button onClick={() => save(pkg)} className="mt-3 inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground"><Save className="size-3.5" /> حفظ</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
