import { useState } from "react";
import { Ban, ShieldCheck, Trash2, Search, Calendar } from "lucide-react";
import { useI18n, serifFont, sansFont } from "../../lib/i18n";
import { useCms, setUserStatus, setUserRole, deleteUser, type AdminUser } from "../../lib/adminStore";
import { sanitizePgFilter } from "../../lib/security";
import { AdminWrapper } from "../../components/AdminWrapper";

const ROLES: AdminUser["role"][] = ["admin", "editor", "student"];

export default function AdminUsers() {
  const { lang, dir, t } = useI18n();
  const cms = useCms();
  const [q, setQ] = useState("");

  const term = sanitizePgFilter(q).toLowerCase();
  const rows = cms.users.filter((u) =>
    `${u.name} ${u.email}`.toLowerCase().includes(term)
  );

  return (
    <AdminWrapper title={t("admin_users")}>
      <div className="space-y-6">
        {/* Top Header & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: serifFont(lang) }}
            >
              {t("admin_users")}
            </h1>
            <p
              className="text-xs text-muted-foreground mt-0.5"
              style={{ fontFamily: sansFont(lang) }}
            >
              {rows.length}{" "}
              {lang === "ar"
                ? "مستخدمين مسجلين"
                : lang === "fr"
                ? "utilisateurs enregistrés"
                : "registered users"}
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search
              size={14}
              className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground ${
                dir === "rtl" ? "right-3" : "left-3"
              }`}
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("admin_search")}
              maxLength={80}
              className={`w-full py-2 text-xs border border-border rounded-xl bg-card text-foreground placeholder:text-muted-foreground outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all ${
                dir === "rtl" ? "pr-8 pl-3 text-right" : "pl-8 pr-3 text-left"
              }`}
              style={{ fontFamily: sansFont(lang) }}
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ fontFamily: sansFont(lang) }}>
              <thead>
                <tr className="text-[11px] text-muted-foreground uppercase border-b border-border bg-muted/40 tracking-wider">
                  <th className="p-4 text-start font-bold">
                    {lang === "ar" ? "المستخدم" : lang === "fr" ? "Utilisateur" : "User"}
                  </th>
                  <th className="p-4 text-start font-bold">{t("admin_role")}</th>
                  <th className="p-4 text-start font-bold">{t("admin_status")}</th>
                  <th className="p-4 text-start font-bold">
                    {lang === "ar" ? "تاريخ الانضمام" : lang === "fr" ? "Inscrit le" : "Joined"}
                  </th>
                  <th className="p-4 text-end font-bold">—</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground text-xs font-mono">
                      {lang === "ar" ? "لم يتم العثور على أي مستخدمين." : "No users matching search query."}
                    </td>
                  </tr>
                ) : (
                  rows.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-muted/50 transition-colors group"
                    >
                      {/* User Identity Column */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors truncate">
                              {u.name}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono truncate">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Selector Column */}
                      <td className="p-4">
                        <select
                          value={u.role}
                          onChange={(e) =>
                            setUserRole(u.id, e.target.value as AdminUser["role"])
                          }
                          className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background text-foreground outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono uppercase"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Status Badge Column */}
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                            u.status === "banned"
                              ? "bg-rose-950/40 border-rose-500/30 text-rose-400"
                              : "bg-emerald-950/40 border-emerald-500/30 text-emerald-400"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.status === "banned" ? "bg-rose-400" : "bg-emerald-400 animate-pulse"
                            }`}
                          />
                          {u.status === "banned" ? t("admin_banned") : t("admin_active")}
                        </span>
                      </td>

                      {/* Joined Date Column */}
                      <td className="p-4 text-muted-foreground text-xs font-mono">
                        <span className="flex items-center gap-1.5 text-[11px]">
                          <Calendar size={12} className="text-muted-foreground/60" />
                          {u.joined}
                        </span>
                      </td>

                      {/* Actions Column */}
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1">
                          {u.status === "banned" ? (
                            <button
                              onClick={() => setUserStatus(u.id, "active")}
                              title={t("admin_unban")}
                              className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-950/30 transition-all"
                            >
                              <ShieldCheck size={16} />
                            </button>
                          ) : (
                            <button
                              onClick={() => setUserStatus(u.id, "banned")}
                              title={t("admin_ban")}
                              className="p-2 rounded-lg text-amber-400 hover:bg-amber-950/30 transition-all"
                            >
                              <Ban size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (confirm(t("admin_confirm_delete"))) deleteUser(u.id);
                            }}
                            title={t("admin_delete")}
                            className="p-2 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-950/30 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminWrapper>
  );
}