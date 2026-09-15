import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Users, Ban, Shield, Search, Trophy, Coins, Mail, Calendar, Filter, CheckCircle2, AlertTriangle, Zap } from "lucide-react"

export default function UsersManagementPage() {
  const [users, setUsers] = useState<any[]>([])
  const [mizanProfiles, setMizanProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [filter, setFilter] = useState<"all" | "frozen" | "active" | "pro">("all")

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [profilesRes, mizanRes] = await Promise.all([
          (supabase as any).from("profiles").select("*").order("created_at", { ascending: false }).limit(100),
          (supabase as any).from("mizan_profiles").select("*").order("xp", { ascending: false }).limit(100),
        ])
        setUsers(profilesRes.data || [])
        setMizanProfiles(mizanRes.data || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = users.filter(u => {
    if (q && !((u.email || "").toLowerCase().includes(q.toLowerCase()) || (u.full_name || "").includes(q))) return false
    if (filter === "frozen" && !u.is_frozen) return false
    if (filter === "active" && u.is_frozen) return false
    if (filter === "pro" && !u.ads_exempt) return false
    return true
  })

  const toggleBan = async (id: string, banned: boolean) => {
    await (supabase as any).from("profiles").update({ is_frozen: !banned }).eq("id", id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, is_frozen: !banned } : u))
  }

  const togglePro = async (id: string, isPro: boolean) => {
    await (supabase as any).from("profiles").update({ ads_exempt: !isPro }).eq("id", id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ads_exempt: !isPro } : u))
  }

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-orange-500/10 text-orange-600"><Users className="size-6" /></span>
          <div>
            <h1 className="text-xl font-black text-foreground">إدارة المستخدمين — تحكم كامل</h1>
            <p className="text-[12px] text-muted-foreground">Clerk + Supabase + Mizan Profiles + XP + Ranks D-SSS + Pro + تجميد</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4"><p className="text-[11px] text-muted-foreground">الإجمالي</p><p className="text-xl font-black">{users.length}</p></div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:bg-emerald-950/20"><p className="text-[11px] font-bold text-emerald-700">نشط</p><p className="text-xl font-black">{users.filter(u => !u.is_frozen).length}</p></div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:bg-rose-950/20"><p className="text-[11px] font-bold text-rose-700">مجمد</p><p className="text-xl font-black">{users.filter(u => u.is_frozen).length}</p></div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:bg-violet-950/20"><p className="text-[11px] font-bold text-violet-700">Mizan Pro</p><p className="text-xl font-black">{users.filter(u => u.ads_exempt).length}</p></div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="بحث بالبريد أو الاسم..." className="w-full rounded-xl border border-border bg-background py-2.5 pr-10 pl-3 text-[13px]" />
        </div>
        <div className="flex gap-2">
          {[
            { k: "all", l: "الكل" }, { k: "active", l: "نشط" }, { k: "frozen", l: "مجمد" }, { k: "pro", l: "Pro" }
          ].map(f => (
            <button key={f.k} onClick={() => setFilter(f.k as any)} className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${filter === f.k ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background text-muted-foreground"}`}>{f.l}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {loading ? <p className="py-10 text-center text-sm text-muted-foreground">جارٍ التحميل...</p> : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-right text-[12px]">
                <thead className="bg-muted text-[11px]"><tr><th className="p-3">البريد</th><th className="p-3">الاسم</th><th className="p-3">كريدتس</th><th className="p-3">Pro</th><th className="p-3">الحالة</th><th className="p-3">إجراءات</th></tr></thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id} className="border-t border-border">
                      <td className="p-3 font-mono text-[11px]" dir="ltr">{u.email}</td>
                      <td className="p-3 font-bold">{u.full_name || "—"}</td>
                      <td className="p-3">{u.bonus_credits || 0}</td>
                      <td className="p-3">{u.ads_exempt ? <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-bold text-violet-700">Pro</span> : <span className="text-[10px] text-muted-foreground">—</span>}</td>
                      <td className="p-3">{u.is_frozen ? <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] text-rose-700">مجمد</span> : <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] text-emerald-700">نشط</span>}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <button onClick={() => toggleBan(u.id, !!u.is_frozen)} className="rounded-lg bg-muted px-2 py-1 text-[10px] font-bold">{u.is_frozen ? "إلغاء التجميد" : "تجميد"}</button>
                          <button onClick={() => togglePro(u.id, !!u.ads_exempt)} className="rounded-lg bg-violet-500/10 px-2 py-1 text-[10px] font-bold text-violet-700">{u.ads_exempt ? "إلغاء Pro" : "منح Pro"}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="flex items-center gap-2 text-[13px] font-extrabold text-foreground"><Trophy className="size-4 text-amber-500" /> أفضل المستخدمين XP</h3>
            <div className="mt-3 space-y-2">
              {mizanProfiles.slice(0, 8).map((p, i) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-background p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded-full bg-amber-500/10 text-[10px] font-black text-amber-700">{i + 1}</span>
                    <div><p className="text-[11px] font-bold text-foreground">{p.username || p.display_name || "مجهول"}</p><p className="text-[10px] text-muted-foreground">{p.rank || "D"} • {p.xp || 0} XP</p></div>
                  </div>
                  <span className="text-[10px] font-bold">{p.credits || 0} cr</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
            <h3 className="flex items-center gap-2 text-[12px] font-extrabold text-amber-900 dark:text-amber-200"><Shield className="size-4" /> سياسات</h3>
            <ul className="mt-2 list-disc pr-5 text-[11px] leading-6 text-muted-foreground">
              <li>التجميد: is_frozen — يمنع التعليق والاختبارات</li>
              <li>Mizan Pro: ads_exempt — وصول Pro 49/399 MAD</li>
              <li>لا حذف ذاتي — عبر contact@mizan.page GDPR</li>
              <li>XP/Rank محمي بـ trigger — لا تعديل من الواجهة</li>
              <li>البيع نهائي — لا إلغاء خلال المدة</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
