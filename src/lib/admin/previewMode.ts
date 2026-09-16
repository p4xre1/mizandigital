/**
 * Preview mode for admin — allows viewing site as different roles / users
 */

export type PreviewRole = "guest" | "student" | "pro" | "admin";

const STORAGE_KEY = "mizan:admin:preview:v1";

export function getPreviewRole(): PreviewRole {
  if (typeof window === "undefined") return "guest";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return "guest";
    const parsed = JSON.parse(raw);
    return (parsed.role as PreviewRole) || "guest";
  } catch {
    return "guest";
  }
}

export function setPreviewRole(role: PreviewRole) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ role, at: Date.now() }));
    window.location.reload();
  } catch {}
}

export function clearPreviewRole() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export const PREVIEW_ROLES: { id: PreviewRole; label: string; description: string }[] = [
  { id: "guest", label: "زائر", description: "بدون تسجيل" },
  { id: "student", label: "طالب مجاني", description: "رتبة D-C" },
  { id: "pro", label: "ميزان برو", description: "اشتراك نشط" },
  { id: "admin", label: "إدارة", description: "صلاحيات كاملة" },
];
