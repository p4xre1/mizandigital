import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Database, Download, Trash2 } from "lucide-react";

export default function UserDataPage() {
  const [userId, setUserId] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!userId.trim()) return;
    setLoading(true);
    try {
      const [profile, attempts, payments, reports] = await Promise.all([
        (supabase as any).from("profiles").select("*").eq("id", userId).maybeSingle(),
        (supabase as any).from("quiz_attempts").select("*").eq("user_ref", userId).limit(20),
        (supabase as any).from("payments").select("*").eq("user_ref", userId).limit(20),
        (supabase as any).from("reports").select("*").eq("reporter_ref", userId).limit(20),
      ]);
      setData({ profile: profile.data, attempts: attempts.data, payments: payments.data, reports: reports.data });
    } finally {
      setLoading(false);
    }
  };

  const exportJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user-${userId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6" dir="rtl">
      <h1 className="mb-4 flex items-center gap-2 text-xl font-black text-foreground"><Database className="size-5" /> بيانات المستخدم (GDPR)</h1>
      <div className="mb-4 flex gap-2">
        <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="معرف المستخدم أو البريد" className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-[13px]" />
        <button onClick={fetchData} disabled={loading} className="rounded-xl bg-primary px-4 py-2 text-[12px] font-bold text-primary-foreground disabled:opacity-60">جلب</button>
        {data && <button onClick={exportJson} className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-2 text-[11px] font-bold"><Download className="size-3.5" /> تصدير JSON</button>}
      </div>
      {loading ? <p className="text-sm text-muted-foreground">جارٍ التحميل...</p> : data ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4"><h3 className="text-[13px] font-bold">الملف الشخصي</h3><pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 text-[11px]">{JSON.stringify(data.profile, null, 2)}</pre></div>
          <div className="rounded-2xl border border-border bg-card p-4"><h3 className="text-[13px] font-bold">المحاولات ({data.attempts?.length || 0})</h3><pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-muted p-3 text-[11px]">{JSON.stringify(data.attempts, null, 2)}</pre></div>
          <div className="rounded-2xl border border-border bg-card p-4"><h3 className="text-[13px] font-bold">المدفوعات ({data.payments?.length || 0})</h3><pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-muted p-3 text-[11px]">{JSON.stringify(data.payments, null, 2)}</pre></div>
        </div>
      ) : <p className="text-[12px] text-muted-foreground">أدخل معرف المستخدم لعرض بياناته — يلبي متطلبات GDPR للوصول والتصدير.</p>}
    </div>
  );
}
