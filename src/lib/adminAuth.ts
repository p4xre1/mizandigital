import { useSyncExternalStore } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// ── SECURITY NOTICE ─────────────────────────────────────────────────────────────
// Real access control and authorization MUST be managed through Supabase Auth + RLS.
// Client-side state strictly dictates UI navigation visibility.
// ────────────────────────────────────────────────────────────────────────────────

const getEnvVar = (viteKey: string, nextKey: string): string | undefined => {
  if (typeof import.meta !== "undefined" && import.meta.env?.[viteKey]) {
    return import.meta.env[viteKey] as string;
  }
  if (typeof process !== "undefined" && process.env?.[nextKey]) {
    return process.env[nextKey] as string;
  }
  return undefined;
};

const IS_DEV = import.meta.env.DEV;
const ADMIN_USER = IS_DEV ? getEnvVar("VITE_ADMIN_USER", "NEXT_PUBLIC_ADMIN_USER") : undefined;
const ADMIN_PASS = IS_DEV ? getEnvVar("VITE_ADMIN_PASS", "NEXT_PUBLIC_ADMIN_PASS") : undefined;

const SESSION_KEY = "mizan_admin_session";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

let isAuthenticated = false;
const listeners = new Set<() => void>();

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

function isUserAdmin(user: User | null): boolean {
  if (!user) return false;

  // 🛡️ Strict Security Requirement: 
  // Admin accounts MUST have a confirmed email via Resend/Supabase.
  // This prevents unverified users from attempting to exploit admin roles.
  if (!user.email_confirmed_at) {
    console.warn("[adminAuth] Access denied: Admin email is not verified.");
    return false;
  }

  const role = user.app_metadata?.role as string | undefined;
  if (role === "admin" || role === "super_admin") {
    return true;
  }

  const adminEmail = getEnvVar("VITE_ADMIN_USER", "NEXT_PUBLIC_ADMIN_USER");
  if (adminEmail && user.email?.toLowerCase() === adminEmail.toLowerCase()) {
    return true;
  }

  return false;
}

if (typeof window !== "undefined") {
  try {
    isAuthenticated = sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    isAuthenticated = false;
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    const isAdmin = isUserAdmin(session?.user ?? null);

    if (isAdmin) {
      isAuthenticated = true;
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch { /* ignore */ }
    } else {
      isAuthenticated = false;
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch { /* ignore */ }
    }
    notifyListeners();
  });

  window.addEventListener("storage", (e) => {
    if (e.key === SESSION_KEY) {
      isAuthenticated = e.newValue === "1";
      notifyListeners();
    }
  });
}

export async function adminLoginAsync(user: string, pass: string): Promise<boolean> {
  // 🛡️ Local Brute-Force Throttle (3 seconds between attempts)
  try {
    const storageKey = "mizan_rl_admin_login";
    const lastAttempt = Number(localStorage.getItem(storageKey) || 0);
    if (Date.now() - lastAttempt < 3000) {
      console.warn("[adminAuth] Login throttled to prevent spam.");
      return false;
    }
    localStorage.setItem(storageKey, String(Date.now()));
  } catch { /* ignore if localStorage is unavailable */ }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: user,
      password: pass,
    });

    if (!error && data.session && isUserAdmin(data.session.user)) {
      isAuthenticated = true;
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch { /* ignore */ }
      notifyListeners();
      return true;
    } else if (data.session && !isUserAdmin(data.session.user)) {
      // 🛡️ Immediate sign out if they authenticate successfully but aren't an admin/verified
      await supabase.auth.signOut();
    }
  } catch (err) {
    console.warn("[adminAuth] Supabase Auth sign-in error:", err);
  }

  // Fallback to DEV environment variables if configured
  if (IS_DEV) {
    return adminLogin(user, pass);
  }

  return false;
}

export function adminLogin(user: string, pass: string): boolean {
  if (!IS_DEV || !ADMIN_USER || !ADMIN_PASS) return false;

  const normalizedUser = user.trim().toLowerCase();
  const targetUser = ADMIN_USER.trim().toLowerCase();

  const userMatches = timingSafeEqual(normalizedUser, targetUser);
  const passMatches = timingSafeEqual(pass, ADMIN_PASS);

  if (userMatches && passMatches) {
    isAuthenticated = true;
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch { /* ignore */ }
    notifyListeners();
    return true;
  }

  return false;
}

export async function adminLogout(): Promise<void> {
  isAuthenticated = false;
  try {
    sessionStorage.removeItem(SESSION_KEY);
    await supabase.auth.signOut();
  } catch { /* ignore */ }
  notifyListeners();
}

export function useAdminAuth(): boolean {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => isAuthenticated,
    () => false
  );
}