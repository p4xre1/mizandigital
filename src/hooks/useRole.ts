import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { trackUserRoleInteraction } from "@/lib/analytics";

export type Role =
    | "root"
    | "security_admin"
    | "admin"
    | "marketer"
    | "writer"
    | "member"
    | "guest";

const VALID_ROLES = new Set<Role>([
  "root",
  "security_admin",
  "admin",
  "marketer",
  "writer",
  "member",
  "guest",
]);

export interface UseRoleResult {
  role: Role;
  userId: string | null;
  loading: boolean;
  // Role Helper Flags
  isRoot: boolean;
  isSecurityAdmin: boolean;
  isAdmin: boolean;
  isMarketer: boolean;
  isWriter: boolean;
  isMember: boolean;
  isGuest: boolean;
  // Tiered Permissions
  isStaff: boolean;
  canManageUsers: boolean;
  canWriteContent: boolean;
  refresh: () => Promise<void>;
}

export function useRole(): UseRoleResult {
  const [role, setRole] = useState<Role>("guest");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const isMounted = useRef<boolean>(true);

  const fetchRole = useCallback(async () => {
    if (!isSupabaseConfigured) {
      if (isMounted.current) {
        setRole("guest");
        setUserId(null);
        setLoading(false);
      }
      return;
    }

    if (isMounted.current) {
      setLoading(true);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        if (isMounted.current) {
          setRole("guest");
          setUserId(null);
          trackUserRoleInteraction("guest", "session_unauthenticated");
        }
        return;
      }

      if (isMounted.current) {
        setUserId(session.user.id);
      }

      const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

      if (!isMounted.current) return;

      const profile = data as { role?: string } | null;
      let resolvedRole: Role = "member";

      if (!error && profile?.role) {
        const rawRole = profile.role.toLowerCase().trim() as Role;
        if (VALID_ROLES.has(rawRole)) {
          resolvedRole = rawRole;
        }
      }

      setRole(resolvedRole);
      trackUserRoleInteraction(resolvedRole, "role_loaded");
    } catch {
      if (isMounted.current) {
        setRole("guest");
        setUserId(null);
        trackUserRoleInteraction("guest", "fetch_error");
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;

    if (!isSupabaseConfigured) {
      setLoading(false);
      return () => {
        isMounted.current = false;
      };
    }

    // onAuthStateChange fires an initial event immediately upon subscription,
    // handling both initial load and subsequent auth state changes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        if (isMounted.current) {
          setRole("guest");
          setUserId(null);
          setLoading(false);
          trackUserRoleInteraction("guest", "auth_sign_out");
        }
      } else {
        void fetchRole();
      }
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, [fetchRole]);

  return useMemo(() => {
    const isRoot = role === "root";
    const isSecurityAdmin = role === "security_admin" || isRoot;
    const isAdmin = role === "admin" || isSecurityAdmin;
    const isMarketer = role === "marketer" || isAdmin;
    const isWriter = role === "writer" || isRoot;
    const isMember = role === "member";
    const isGuest = role === "guest";

    const isStaff = ["writer", "marketer", "admin", "security_admin", "root"].includes(role);
    const canManageUsers = ["admin", "security_admin", "root"].includes(role);
    const canWriteContent = ["writer", "admin", "root"].includes(role);

    return {
      role,
      userId,
      loading,
      isRoot,
      isSecurityAdmin,
      isAdmin,
      isMarketer,
      isWriter,
      isMember,
      isGuest,
      isStaff,
      canManageUsers,
      canWriteContent,
      refresh: fetchRole,
    };
  }, [role, userId, loading, fetchRole]);
}