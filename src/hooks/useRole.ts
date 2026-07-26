import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

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
  isStaff: boolean;        // Writers, Marketers, Admins, Security, Root
  canManageUsers: boolean; // Security, Admin, Root
  canWriteContent: boolean;// Writer, Admin, Root
  refresh: () => Promise<void>;
}

export function useRole(): UseRoleResult {
  const [role, setRole] = useState<Role>("guest");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Track mount status to avoid state updates on unmounted components
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
        }
        return;
      }

      if (isMounted.current) {
        setUserId(session.user.id);
      }

      // Fetch user role from Supabase 'profiles' table
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!isMounted.current) return;

      // Safe Type Assertion to avoid TS 'never' error
      const profile = data as { role?: string } | null;

      if (error || !profile?.role) {
        setRole("member");
      } else {
        const rawRole = profile.role.toLowerCase().trim() as Role;
        setRole(VALID_ROLES.has(rawRole) ? rawRole : "member");
      }
    } catch {
      if (isMounted.current) {
        setRole("guest");
        setUserId(null);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;

    void fetchRole();

    if (!isSupabaseConfigured) {
      return () => {
        isMounted.current = false;
      };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        if (isMounted.current) {
          setRole("guest");
          setUserId(null);
          setLoading(false);
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

  // Derived Boolean Flags (Memoized for optimal render performance)
  return useMemo(() => {
    const isRoot = role === "root";
    const isSecurityAdmin = role === "security_admin" || isRoot;
    const isAdmin = role === "admin" || isRoot;
    const isMarketer = role === "marketer" || isAdmin;
    const isWriter = role === "writer" || isRoot;
    const isMember = role === "member";
    const isGuest = role === "guest";

    // Tiered Capability Flags
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