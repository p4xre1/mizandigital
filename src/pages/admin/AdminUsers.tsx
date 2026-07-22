import { useState } from "react";
import { Ban, ShieldCheck, Trash2, Search } from "lucide-react";
import { useI18n, serifFont, sansFont } from "../../lib/i18n";
import { useCms, setUserStatus, setUserRole, deleteUser, type AdminUser } from "../../lib/adminStore";
import { sanitizePgFilter } from "../../lib/security";

const ROLES: AdminUser["role"][] = ["admin", "editor", "student"];

export default function AdminUsers() {
  const { lang, dir, t } = useI18n();
  const cms = useCms();
  const [q, setQ] = useState("");

  const term = sanitizePgFilter(q).toLowerCase();
  const rows = cms.users.filter(u => `${u.name} ${u.email}`.toLowerCase().includes(term));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: serifFont(lang) }}>{t("admin_users")}</h1>
        <div className="relative">
          <Search size={14} className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground ${dir === "rtl" ? "right-3" : "left-3"}`} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={t("admin_search")} maxLength={80}
            className={`py-2 text-sm border border-border rounded-lg bg-card outline-none focus:border-primary ${dir === "rtl" ? "pr-8 pl-3" : "pl-8 pr-3"}`}
            style={{ fontFamily: sansFont(lang) }} />
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm" style={{ fontFamily: sansFont(lang) }}>
          <thead>
            <tr className="text-start text-xs text-muted-foreground uppercase border-b border-border">
              <th className="p-4 text-start">User</th>
              <th className="p-4 text-start">{t("admin_role")}</th>
              <th className="p-4 text-start">{t("admin_status")}</th>
              <th className="p-4 text-start">{t("school_established")}</th>
              <th className="p-4 text-end">—</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(u => (
              <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="p-4">
                  <div className="font-semibold text-foreground">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </td>
                <td className="p-4">
                  <select value={u.role} onChange={e => setUserRole(u.id, e.target.value as AdminUser["role"])}
                    className="text-xs border border-border rounded-md px-2 py-1 bg-card outline-none focus:border-primary">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td className="p-4">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${u.status === "banned" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                    {u.status === "banned" ? t("admin_banned") : t("admin_active")}
                  </span>
                </td>
                <td className="p-4 text-muted-foreground text-xs">{u.joined}</td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-2">
                    {u.status === "banned" ? (
                      <button onClick={() => setUserStatus(u.id, "active")} title={t("admin_unban")}
                        className="p-2 rounded-lg text-green-600 hover:bg-green-50"><ShieldCheck size={15} /></button>
                    ) : (
                      <button onClick={() => setUserStatus(u.id, "banned")} title={t("admin_ban")}
                        className="p-2 rounded-lg text-amber-600 hover:bg-amber-50"><Ban size={15} /></button>
                    )}
                    <button onClick={() => { if (confirm(t("admin_confirm_delete"))) deleteUser(u.id); }} title={t("admin_delete")}
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
