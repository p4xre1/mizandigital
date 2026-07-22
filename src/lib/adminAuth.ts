import { useSyncExternalStore } from "react";

// ── SECURITY NOTICE ─────────────────────────────────────────────────────────────
// CLIENT-SIDE GATE (PROTOTYPE MODE ONLY)
// This is NOT real authentication — it's a UI gate only. Anyone can bypass it by
// calling sessionStorage.setItem(...) directly, or by calling adminStore.ts
// mutator functions from the browser console without ever logging in. There is
// no server-side authorization anywhere in this flow. Real access control must
// come from Supabase Auth + RLS before this app handles real user/legal data.
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

const ADMIN_USER = getEnvVar("VITE_ADMIN_USER", "NEXT_PUBLIC_ADMIN_USER");
const ADMIN_PASS = getEnvVar("VITE_ADMIN_PASS", "NEXT_PUBLIC_ADMIN_PASS");
const SESSION_KEY = "mizan_admin_session";

if (typeof window !== "undefined" && (!ADMIN_USER || !ADMIN_PASS)) {
  // eslint-disable-next-line no-console
  console.error(
    "[adminAuth] VITE_ADMIN_USER / VITE_ADMIN_PASS are not set. Admin login is disabled until these are configured."
  );
}

let isAuthenticated = false;

if (typeof window !== "undefined") {
  try {
    isAuthenticated = sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    isAuthenticated = false;
  }
}

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function adminLogin(user: string, pass: string): boolean {
  // Fail closed: no credentials configured => no login possible, ever.
  if (!ADMIN_USER || !ADMIN_PASS) return false;

  if (user.trim() === ADMIN_USER && pass === ADMIN_PASS) {
    isAuthenticated = true;
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore storage errors */
    }
    notifyListeners();
    return true;
  }
  return false;
}

export function adminLogout(): void {
  isAuthenticated = false;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore storage errors */
  }
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