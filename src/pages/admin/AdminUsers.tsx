import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Ban,
  ShieldCheck,
  Trash2,
  Search,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { useI18n, serifFont, sansFont } from "@/lib/i18n";
import {
  useCms,
  setUserStatus,
  setUserRole,
  deleteUser,
  type AdminUser,
} from "@/lib/adminStore";
import { sanitizePgFilter } from "@/lib/security";
import { AdminWrapper } from "@/components/AdminWrapper";
import { supabase } from "@/lib/supabase";
import { Role } from "@/hooks/useRole";

// Site Domain Constants
const SITE_URL = import.meta.env.VITE_SITE_URL || "https://www.mizan.page";

// 1. Supabase Profiles Database Row Contract
interface ProfileRow {
  id: string;
  full_name: string | null;
  username?: string | null;
  email: string | null;
  role: Role | null;
  is_frozen: boolean | null;
  created_at: string | null;
  avatar_url?: string | null;
}

// 2. Formatted UI User Model
export interface FormattedAdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "banned";
  joined: string;
  avatarUrl?: string;
}

// 3. Valid Master System Roles
const ALL_ROLES: Role[] = [
  "root",
  "security_admin",
  "admin",
  "marketer",
  "writer",
  "member",
  "guest",
];

// 4. Multilingual Dictionary (AR, FR, EN, ES)
/* cspell:disable */
const I18N_DICT = {
  ar: {
    title: "إدارة المستخدمين",
    registeredUsers: "مستخدمين مسجلين",
    searchPlaceholder: "البحث بالاسم أو البريد الإلكتروني...",
    user: "المستخدم",
    role: "الصلاحية / الدور",
    status: "الحالة",
    joined: "تاريخ الانضمام",
    actions: "الإجراءات",
    active: "نشط",
    banned: "محظور",
    ban: "حظر الحساب",
    unban: "إلغاء الحظر",
    delete: "حذف الحساب",
    confirmDelete: "هل أنت متأكد من رغبتك في حذف هذا المستخدم نهائياً؟",
    noUsers: "لم يتم العثور على أي مستخدمين مطبقين للبحث.",
    loading: "جاري تحميل بيانات المستخدمين...",
    refresh: "تحديث القائمة",
  },
  fr: {
    title: "Gestion des Utilisateurs",
    registeredUsers: "utilisateurs enregistrés",
    searchPlaceholder: "Rechercher par nom ou email...",
    user: "Utilisateur",
    role: "Rôle",
    status: "Statut",
    joined: "Inscrit le",
    actions: "Actions",
    active: "Actif",
    banned: "Banni",
    ban: "Bannir l'utilisateur",
    unban: "Débannir",
    delete: "Supprimer",
    confirmDelete: "Êtes-vous sûr de vouloir supprimer cet utilisateur définitivement ?",
    noUsers: "Aucun utilisateur ne correspond à votre recherche.",
    loading: "Chargement des profils...",
    refresh: "Actualiser la liste",
  },
  en: {
    title: "User Management",
    registeredUsers: "registered users",
    searchPlaceholder: "Search by name or email...",
    user: "User",
    role: "Role",
    status: "Status",
    joined: "Joined Date",
    actions: "Actions",
    active: "Active",
    banned: "Banned",
    ban: "Ban User",
    unban: "Unban User",
    delete: "Delete Account",
    confirmDelete: "Are you sure you want to permanently delete this user?",
    noUsers: "No users matching search query.",
    loading: "Loading system profiles...",
    refresh: "Refresh table",
  },
  es: {
    title: "Gestión de Usuarios",
    registeredUsers: "usuarios registrados",
    searchPlaceholder: "Buscar por nombre o correo...",
    user: "Usuario",
    role: "Rol",
    status: "Estado",
    joined: "Fecha de registro",
    actions: "Acciones",
    active: "Activo",
    banned: "Suspendido",
    ban: "Suspender usuario",
    unban: "Reactivar usuario",
    delete: "Eliminar cuenta",
    confirmDelete: "¿Está seguro de que desea eliminar permanentemente a este usuario?",
    noUsers: "No se encontraron usuarios coincidentes.",
    loading: "Cargando perfiles...",
    refresh: "Actualizar tabla",
  },
};
/* cspell:enable */

export default function AdminUsers() {
  const { lang, dir } = useI18n();
  const cms = useCms();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [dbUsers, setDbUsers] = useState<FormattedAdminUser[]>([]);
  const isMounted = useRef(true);

  // Active language dictionary with fallback to English
  const dict = I18N_DICT[lang as keyof typeof I18N_DICT] || I18N_DICT.en;

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    if (isMounted.current) setLoading(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, email, role, is_frozen, created_at, avatar_url")
        .order("created_at", { ascending: false });

      if (!error && data) {
        const rawProfiles = data as unknown as ProfileRow[];
        const formatted: FormattedAdminUser[] = rawProfiles.map((p) => {
          const rawRole = (p.role?.toLowerCase().trim() || "member") as Role;
          const safeRole: Role = ALL_ROLES.includes(rawRole) ? rawRole : "member";

          return {
            id: p.id,
            name: p.full_name || p.username || p.email?.split("@")[0] || "User",
            email: p.email || "no-email@mizan.page",
            role: safeRole,
            status: p.is_frozen ? "banned" : "active",
            joined: p.created_at ? new Date(p.created_at).toISOString().split("T")[0] : "N/A",
            avatarUrl: p.avatar_url || undefined,
          };
        });

        if (isMounted.current) {
          setDbUsers(formatted);
          setHasFetched(true);
        }
      }
    } catch (err) {
      console.error("Failed to fetch profiles from Supabase:", err);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    void fetchUsers();

    return () => {
      isMounted.current = false;
    };
  }, [fetchUsers]);

  // Fallback to CMS store users only if initial Supabase fetch has not completed
  const activeUsersList: FormattedAdminUser[] = useMemo(() => {
    if (hasFetched) return dbUsers;

    return cms.users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: ALL_ROLES.includes(u.role as Role) ? (u.role as Role) : "member",
      status: u.status === "banned" ? "banned" : "active",
      joined: u.joined,
    }));
  }, [hasFetched, dbUsers, cms.users]);

  // Sanitized Search Filtering
  const rows = useMemo(() => {
    const term = sanitizePgFilter(q).toLowerCase().trim();
    if (!term) return activeUsersList;

    return activeUsersList.filter((u) =>
      `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(term)
    );
  }, [activeUsersList, q]);

  // Role Update Handler
  const handleRoleChange = async (userId: string, newRole: Role) => {
    try {
      await setUserRole(userId, newRole as unknown as AdminUser["role"]);
      setDbUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      const updatePayload: Partial<ProfileRow> = { role: newRole };
      const { error } = await supabase
        .from("profiles")
        .update(updatePayload as never)
        .eq("id", userId);

      if (error) {
        console.error("Error updating user role in DB:", error.message);
        void fetchUsers();
      }
    } catch (err) {
      console.error("Exception handling role change:", err);
      void fetchUsers();
    }
  };

  // Status Toggle Handler (Active / Banned)
  const handleStatusToggle = async (userId: string, targetStatus: "active" | "banned") => {
    const isFrozen = targetStatus === "banned";

    try {
      await setUserStatus(userId, targetStatus);
      setDbUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: targetStatus } : u))
      );

      const updatePayload: Partial<ProfileRow> = { is_frozen: isFrozen };
      const { error } = await supabase
        .from("profiles")
        .update(updatePayload as never)
        .eq("id", userId);

      if (error) {
        console.error("Error updating user status in DB:", error.message);
        void fetchUsers();
      }
    } catch (err) {
      console.error("Exception handling status toggle:", err);
      void fetchUsers();
    }
  };

  // User Deletion Handler
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm(dict.confirmDelete)) return;

    try {
      await deleteUser(userId);
      setDbUsers((prev) => prev.filter((u) => u.id !== userId));

      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (error) {
        console.error("Error deleting user profile from DB:", error.message);
        void fetchUsers();
      }
    } catch (err) {
      console.error("Exception deleting user profile:", err);
      void fetchUsers();
    }
  };

  return (
    <AdminWrapper title={dict.title}>
      <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-4">
        {/* Top Header & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1
              className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2"
              style={{ fontFamily: serifFont(lang) }}
            >
              <span>{dict.title}</span>
              <button
                onClick={() => {
                  void fetchUsers();
                }}
                className="p-2 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center text-muted-foreground hover:text-emerald-500 transition-colors rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                title={dict.refresh}
                aria-label={dict.refresh}
              >
                <RefreshCw size={18} className={loading ? "animate-spin text-emerald-500" : ""} />
              </button>
            </h1>
            <p
              className="text-xs text-muted-foreground mt-0.5"
              style={{ fontFamily: sansFont(lang) }}
            >
              <strong className="text-foreground font-mono">{rows.length}</strong> {dict.registeredUsers}
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search
              size={16}
              className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground ${
                dir === "rtl" ? "right-3.5" : "left-3.5"
              }`}
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={dict.searchPlaceholder}
              maxLength={80}
              className={`w-full py-2.5 sm:py-2 text-sm sm:text-xs border border-border rounded-xl bg-card text-foreground placeholder:text-muted-foreground outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all ${
                dir === "rtl" ? "pr-10 pl-3 text-right" : "pl-10 pr-3 text-left"
              }`}
              style={{ fontFamily: sansFont(lang) }}
            />
          </div>
        </div>

        {/* 📱 MOBILE VIEW (< sm) */}
        <div className="grid grid-cols-1 gap-3 sm:hidden">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs font-mono bg-card border border-border rounded-2xl">
              {loading ? dict.loading : dict.noUsers}
            </div>
          ) : (
            rows.map((u) => (
              <div
                key={u.id}
                className="p-4 bg-card border border-border rounded-2xl shadow-sm space-y-3"
                style={{ fontFamily: sansFont(lang) }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={u.avatarUrl || `${SITE_URL}/Logo.svg`}
                      alt={`Mizan profile avatar for ${u.name}`}
                      loading="lazy"
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-xl bg-emerald-950/40 border border-emerald-500/20 object-cover shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = `${SITE_URL}/Logo.svg`;
                      }}
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-foreground text-sm truncate">{u.name}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate">{u.email}</div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border shrink-0 ${
                      u.status === "banned"
                        ? "bg-rose-950/40 border-rose-500/30 text-rose-400"
                        : "bg-emerald-950/40 border-emerald-500/30 text-emerald-400"
                    }`}
                  >
                    {u.status === "banned" ? dict.banned : dict.active}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                  <div>
                    <label className="text-[10px] text-muted-foreground font-semibold uppercase block mb-1">
                      {dict.role}
                    </label>
                    <select
                      value={u.role}
                      onChange={(e) => {
                        void handleRoleChange(u.id, e.target.value as Role);
                      }}
                      className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background text-foreground outline-none focus:border-emerald-500 font-mono uppercase"
                    >
                      {ALL_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted-foreground font-semibold uppercase block mb-1">
                      {dict.joined}
                    </label>
                    <div className="flex items-center gap-1 text-muted-foreground font-mono py-1.5">
                      <Calendar size={13} />
                      <span>{u.joined}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  {u.status === "banned" ? (
                    <button
                      onClick={() => {
                        void handleStatusToggle(u.id, "active");
                      }}
                      className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium text-xs active:scale-[0.98] transition-transform"
                    >
                      <ShieldCheck size={16} />
                      <span>{dict.unban}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        void handleStatusToggle(u.id, "banned");
                      }}
                      className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium text-xs active:scale-[0.98] transition-transform"
                    >
                      <Ban size={16} />
                      <span>{dict.ban}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      void handleDeleteUser(u.id);
                    }}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 active:scale-[0.98] transition-transform"
                    title={dict.delete}
                    aria-label={dict.delete}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 🖥️ DESKTOP VIEW (>= sm) */}
        <div className="hidden sm:block bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ fontFamily: sansFont(lang) }}>
              <thead>
                <tr className="text-[11px] text-muted-foreground uppercase border-b border-border bg-muted/40 tracking-wider">
                  <th className="p-4 text-start font-bold">{dict.user}</th>
                  <th className="p-4 text-start font-bold">{dict.role}</th>
                  <th className="p-4 text-start font-bold">{dict.status}</th>
                  <th className="p-4 text-start font-bold">{dict.joined}</th>
                  <th className="p-4 text-end font-bold">{dict.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground text-xs font-mono">
                      {loading ? dict.loading : dict.noUsers}
                    </td>
                  </tr>
                ) : (
                  rows.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/50 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatarUrl || `${SITE_URL}/Logo.svg`}
                            alt={`Profile representation for ${u.name}`}
                            loading="lazy"
                            width={36}
                            height={36}
                            className="w-9 h-9 rounded-xl bg-emerald-950/40 border border-emerald-500/20 object-cover shrink-0"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = `${SITE_URL}/Logo.svg`;
                            }}
                          />
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

                      <td className="p-4">
                        <select
                          value={u.role}
                          onChange={(e) => {
                            void handleRoleChange(u.id, e.target.value as Role);
                          }}
                          className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background text-foreground outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono uppercase cursor-pointer"
                        >
                          {ALL_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>

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
                          {u.status === "banned" ? dict.banned : dict.active}
                        </span>
                      </td>

                      <td className="p-4 text-muted-foreground text-xs font-mono">
                        <span className="flex items-center gap-1.5 text-[11px]">
                          <Calendar size={13} className="text-muted-foreground/60" />
                          {u.joined}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1">
                          {u.status === "banned" ? (
                            <button
                              onClick={() => {
                                void handleStatusToggle(u.id, "active");
                              }}
                              title={dict.unban}
                              aria-label={dict.unban}
                              className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-950/30 transition-all"
                            >
                              <ShieldCheck size={16} />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                void handleStatusToggle(u.id, "banned");
                              }}
                              title={dict.ban}
                              aria-label={dict.ban}
                              className="p-2 rounded-lg text-amber-400 hover:bg-amber-950/30 transition-all"
                            >
                              <Ban size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              void handleDeleteUser(u.id);
                            }}
                            title={dict.delete}
                            aria-label={dict.delete}
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