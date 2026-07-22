import { useSyncExternalStore } from "react";

// ── SECURITY NOTICE ─────────────────────────────────────────────────────────────
// CLIENT-SIDE GATE (PROTOTYPE MODE ONLY)
// Credentials use Vite environment variables (VITE_ADMIN_USER / VITE_ADMIN_PASS)
// with fallback defaults for local dev.
// ────────────────────────────────────────────────────────────────────────────────

// Helper to safely fetch env variables across Vite & Next.js environments
const getEnvVar = (viteKey: string, nextKey: string, fallback: string): string => {
  if (typeof import.meta !== "undefined" && import.meta.env?.[viteKey]) {
    return import.meta.env[viteKey] as string;
  }
  if (typeof process !== "undefined" && process.env?.[nextKey]) {
    return process.env[nextKey] as string;
  }
  return fallback;
};

const ADMIN_USER = getEnvVar("VITE_ADMIN_USER", "NEXT_PUBLIC_ADMIN_USER", "reda");
const ADMIN_PASS = getEnvVar("VITE_ADMIN_PASS", "NEXT_PUBLIC_ADMIN_PASS", "Mohamedreda@2008");
const SESSION_KEY = "mizan_admin_session";

// Global in-memory state
let isAuthenticated = false;

// Initialize state safely on client side
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

/**
 * Attempts admin login using environment/fallback credentials.
 */
export function adminLogin(user: string, pass: string): boolean {
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

/**
 * Clears admin session state.
 */
export function adminLogout(): void {
  isAuthenticated = false;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore storage errors */
  }
  notifyListeners();
}

/**
 * React hook for subscribing to admin authentication state.
 */
export function useAdminAuth(): boolean {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => isAuthenticated, // Client snapshot
    () => false            // Server snapshot fallback
  );
}