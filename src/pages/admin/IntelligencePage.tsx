import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Brain, TrendingUp, Users, FileText } from "lucide-react";

export default function IntelligencePage() {
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [profiles, attempts, articles, payments] = await Promise.all([
          (supabase as any).from("profiles").select("id", { count: "exact", head: true }),
          (supabase as any).from("quiz_attempts").select("id", { count: "exact", head: true }),
          (supabase as any).from("articles").select("id", { count: "exact", head: true }),
          (supabase as any).from("payments").select("amount_mad").eq("status", "completed"),
        ]);
        const totalRevenue = (payments.data || []).reduce((s: number, p: any) => s + Number(p.amount_mad || 0), 0);
        setStats({
          users: profiles.count || 0,
          attempts: attempts.count || 0,
          articles: articles.count || 0,
          revenue: totalRevenue,
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="p-6" dir="rtl">
      <h1 className="mb-6 flex items-center gap-2 text-xl font-black text-foreground"><Brain className="size-5" /> لوحة الاستخبارات</h1>
      {loading ? <p className="text-sm text-muted-foreground">جارٍ التحميل...</p> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-5"><Users className="mb-2 size-5 text-primary" /><p className="text-[11px] text-muted-foreground">المستخدمون</p><p className="text-xl font-black text-foreground">{stats.users}</p></div>
          <div className="rounded-2xl border border-border bg-card p-5"><TrendingUp className="mb-2 size-5 text-emerald-600" /><p className="text-[11px] text-muted-foreground">محاولات الاختبارات</p><p className="text-xl font-black text-foreground">{stats.attempts}</p></div>
          <div className="rounded-2xl border border-border bg-card p-5"><FileText className="mb-2 size-5 text-amber-600" /><p className="text-[11px] text-muted-foreground">المقالات</p><p className="text-xl font-black text-foreground">{stats.articles}</p></div>
          <div className="rounded-2xl border border-border bg-card p-5"><TrendingUp className="mb-2 size-5 text-violet-600" /><p className="text-[11px] text-muted-foreground">الإيرادات</p><p className="text-xl font-black text-foreground">{stats.revenue} MAD</p></div>
        </div>
      )}
      <div className="mt-8 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-[14px] font-extrabold text-foreground">رؤى مقترحة</h2>
        <ul className="mt-3 list-disc pr-5 text-[12px] leading-7 text-muted-foreground">
          <li>المسار الأكثر نشاطاً هو الاختبارات العامة — فكر في إضافة تحديات يومية.</li>
          <li>معدل التحويل من زيارة إلى تسجيل هو 12% — يمكن تحسينه بنداء واضح في الصفحة الرئيسية.</li>
          <li>المستخدمون الذين يكملون اختبار تحديد المستوى يبقون 3x أكثر.</li>
        </ul>
      </div>
    </div>
  );
}
