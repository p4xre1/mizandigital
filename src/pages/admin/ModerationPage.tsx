import { useEffect, useState } from "react";
import { fetchReportsForAdmin, REPORT_REASONS, type Report, type ReportStatus } from "@/lib/governance/service";
import { supabase } from "@/lib/supabase/client";
import { Flag, Check, X, Clock, Shield } from "lucide-react";

export default function ModerationPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<ReportStatus | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchReportsForAdmin(filter === "all" ? undefined : filter);
      setReports(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleAction = async (id: string, status: ReportStatus, note?: string) => {
    setActionLoading(id);
    try {
      const { error } = await (supabase as any).from("reports").update({ status, moderator_note: note || null }).eq("id", id);
      if (error) throw error;
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "فشل التحديث");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6" dir="rtl">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
          <Shield className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-black text-foreground">الحوكمة والإبلاغات</h1>
          <p className="text-[12px] text-muted-foreground">مراجعة البلاغات واتخاذ إجراءات الإشراف</p>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {(["all", "pending", "reviewing", "resolved", "dismissed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s as any)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold border ${filter === s ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background text-muted-foreground"}`}
          >
            {s === "all" ? "الكل" : s === "pending" ? "قيد الانتظار" : s === "reviewing" ? "قيد المراجعة" : s === "resolved" ? "تم الحل" : "مرفوض"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">جارٍ التحميل...</p>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Flag className="mx-auto mb-2 size-6 text-muted-foreground" />
          <p className="text-sm font-bold text-foreground">لا توجد بلاغات</p>
          <p className="mt-1 text-[12px] text-muted-foreground">عندما يبلغ المستخدمون عن محتوى، سيظهر هنا</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {reports.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-black text-amber-700">{REPORT_REASONS[r.reason]?.label || r.reason}</span>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground">{r.target_type}:{r.target_id.slice(0, 20)}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${r.status === "pending" ? "bg-amber-100 text-amber-800" : r.status === "resolved" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{r.status}</span>
                  </div>
                  {r.details && <p className="mt-2 text-[12px] leading-6 text-foreground">{r.details}</p>}
                  <p className="mt-2 text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString("ar-MA")}</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleAction(r.id, "reviewing")}
                    disabled={!!actionLoading}
                    className="grid size-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground"
                    title="قيد المراجعة"
                  >
                    <Clock className="size-4" />
                  </button>
                  <button
                    onClick={() => handleAction(r.id, "resolved", "تمت المراجعة والمعالجة")}
                    disabled={!!actionLoading}
                    className="grid size-8 place-items-center rounded-lg bg-emerald-500 text-white hover:opacity-90"
                    title="حل"
                  >
                    <Check className="size-4" />
                  </button>
                  <button
                    onClick={() => handleAction(r.id, "dismissed", "بلاغ غير مستحق")}
                    disabled={!!actionLoading}
                    className="grid size-8 place-items-center rounded-lg bg-rose-500 text-white hover:opacity-90"
                    title="رفض"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
