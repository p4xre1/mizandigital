import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";

// ── SECURITY NOTICE ─────────────────────────────────────────────────────────────
// Real access control and authorization are managed through Supabase Auth + RLS.
// This module provides client-side auth state synchronization for UI components.
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

// ── Constant-Time String Comparison (Fallback Mitigation) ─────────────────
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ── Internal State Management & Sync ───────────────────────────────────────────
let isAuthenticated = false;
const listeners = new Set<() => void>();

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

// Initialize Auth State from SessionStorage or Supabase Session
if (typeof window !== "undefined") {
  try {
    isAuthenticated = sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    isAuthenticated = false;
  }

  // Subscribe to Supabase Auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      isAuthenticated = true;
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* ignore storage errors */
      }
    } else if (event === "SIGNED_OUT") {
      isAuthenticated = false;
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {
        /* ignore storage errors */
      }
    }
    notifyListeners();
  });

  // Cross-tab sync for local session fallback
  window.addEventListener("storage", (e) => {
    if (e.key === SESSION_KEY) {
      isAuthenticated = e.newValue === "1";
      notifyListeners();
    }
  });
}

// ── Public Auth API ─────────────────────────────────────────────────────────────

/**
 * Attempts authentication with Supabase Auth first, falling back to 
 * static env credentials if offline or in local prototype mode.
 */
export async function adminLoginAsync(user: string, pass: string): Promise<boolean> {
  // 1. Try Supabase Authentication
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: user,
      password: pass,
    });

    if (!error && data.session) {
      isAuthenticated = true;
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* ignore storage errors */
      }
      notifyListeners();
      return true;
    }
  } catch (err) {
    console.warn("[adminAuth] Supabase Auth sign-in error, trying fallback:", err);
  }

  // 2. Synchronous Fallback (Environment Prototype Credentials)
  return adminLogin(user, pass);
}

/**
 * Synchronous local login fallback
 */
export function adminLogin(user: string, pass: string): boolean {
  if (!ADMIN_USER || !ADMIN_PASS) return false;

  const normalizedUser = user.trim().toLowerCase();
  const targetUser = ADMIN_USER.trim().toLowerCase();

  const userMatches = timingSafeEqual(normalizedUser, targetUser);
  const passMatches = timingSafeEqual(pass, ADMIN_PASS);

  if (userMatches && passMatches) {
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
 * Signs out both Supabase session and local prototype state
 */
export async function adminLogout(): Promise<void> {
  isAuthenticated = false;
  try {
    sessionStorage.removeItem(SESSION_KEY);
    await supabase.auth.signOut();
  } catch {
    /* ignore storage errors */
  }
  notifyListeners();
}

/**
 * React hook to subscribe to authentication state changes
 */
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