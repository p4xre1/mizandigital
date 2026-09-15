import { useEffect, useState } from "react";
import { Gauge, AlertTriangle } from "lucide-react";

type Limit = { key: string; label: string; current: number; max: number; unit: string };

export default function LimitsMonitoringPage() {
  const [limits, setLimits] = useState<Limit[]>([]);

  useEffect(() => {
    // Mock data — in production fetch from Cloudflare Analytics + Supabase
    setLimits([
      { key: "r2_uploads", label: "رفع R2 / 10 دقائق", current: 42, max: 120, unit: "" },
      { key: "comments", label: "تعليقات / 10 دقائق / IP", current: 1, max: 3, unit: "" },
      { key: "quiz_submit", label: "محاولات اختبار / 10 دقائق / IP", current: 5, max: 20, unit: "" },
      { key: "reports", label: "بلاغات / ساعة / مستخدم", current: 2, max: 5, unit: "" },
      { key: "storage", label: "تخزين Supabase", current: 2.3, max: 8, unit: "GB" },
      { key: "bandwidth", label: "نطاق R2", current: 12, max: 100, unit: "GB" },
    ]);
  }, []);

  return (
    <div className="p-6" dir="rtl">
      <h1 className="mb-6 flex items-center gap-2 text-xl font-black text-foreground"><Gauge className="size-5" /> مراقبة الحدود</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {limits.map((l) => {
          const pct = Math.round((l.current / l.max) * 100);
          const isHigh = pct >= 80;
          return (
            <div key={l.key} className={`rounded-2xl border p-5 ${isHigh ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20" : "border-border bg-card"}`}>
              <p className="text-[12px] font-bold text-foreground">{l.label}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{l.current} / {l.max} {l.unit} — {pct}%</p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"><div className={`h-full ${isHigh ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div>
              {isHigh && <p className="mt-2 flex items-center gap-1 text-[11px] font-bold text-amber-700"><AlertTriangle className="size-3.5" /> قريب من الحد</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
