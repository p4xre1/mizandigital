import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Users, Ban, Shield, Search } from "lucide-react";

export default function UsersManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await (supabase as any).from("profiles").select("*").order("created_at", { ascending: false }).limit(50);
        setUsers(data || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = users.filter((u) => !q || (u.email || "").toLowerCase().includes(q.toLowerCase()) || (u.full_name || "").includes(q));

  const toggleBan = async (id: string, banned: boolean) => {
    await (supabase as any).from("profiles").update({ is_frozen: !banned }).eq("id", id);
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, is_frozen: !banned } : u)));
  };

  return (
    <div className="p-6" dir="rtl">
      <h1 className="mb-4 flex items-center gap-2 text-xl font-black text-foreground"><Users className="size-5" /> إدارة المستخدمين</h1>
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالبريد أو الاسم..." className="w-full rounded-xl border border-border bg-background py-2 pr-9 pl-3 text-[13px]" />
        </div>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">جارٍ التحميل...</p> : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-right text-[12px]">
            <thead className="bg-muted text-[11px]"><tr><th className="p-3">البريد</th><th className="p-3">الاسم</th><th className="p-3">الكريدتس</th><th className="p-3">الحالة</th><th className="p-3">إجراء</th></tr></thead>
            <tbody>{filtered.map((u) => (
              <tr key={u.id} className="border-t border-border"><td className="p-3 font-mono text-[11px]">{u.email}</td><td className="p-3">{u.full_name || "—"}</td><td className="p-3">{u.bonus_credits || 0}</td><td className="p-3">{u.is_frozen ? <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] text-rose-700">مجمد</span> : <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] text-emerald-700">نشط</span>}</td><td className="p-3"><button onClick={() => toggleBan(u.id, !!u.is_frozen)} className="rounded-lg bg-muted px-2 py-1 text-[11px]">{u.is_frozen ? "إلغاء التجميد" : "تجميد"}</button></td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
