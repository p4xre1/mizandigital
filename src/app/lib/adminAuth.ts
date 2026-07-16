import { useSyncExternalStore } from "react";

// ── Admin gate (prototype) ──────────────────────────────────────────────────────
// ⚠️ SECURITY NOTE: this is a CLIENT-SIDE gate only. The credential below ships
// in the frontend bundle and can be read by anyone who inspects the code. It
// keeps casual visitors out of the CMS UI, but it is NOT real protection. For
// production, move authentication server-side (Supabase Auth + an `is_admin`
// role enforced by Row-Level Security on every table the CMS touches).

const ADMIN_USER = "reda";
const ADMIN_PASS = "Mohamedreda@2008";
const KEY = "mizan_admin_session";

let authed = (() => {
  try { return sessionStorage.getItem(KEY) === "1"; } catch { return false; }
})();
const listeners = new Set<() => void>();

function emit() { listeners.forEach(l => l()); }

export function adminLogin(user: string, pass: string): boolean {
  if (user.trim() === ADMIN_USER && pass === ADMIN_PASS) {
    authed = true;
    try { sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ }
    emit();
    return true;
  }
  return false;
}

export function adminLogout() {
  authed = false;
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  emit();
}

export function useAdminAuth() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => authed,
  );
}
