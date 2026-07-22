import { useSyncExternalStore } from "react";

// ── Lightweight CMS store ──────────────────────────────────────────────────────
// A localStorage-backed mock store for the admin dashboard. This powers the
// prototype UI (users, articles, pages, SEO keywords). When a Supabase backend
// is wired up, these reads/writes can be swapped for PostgREST calls + RLS —
// the shapes below intentionally mirror typical CMS tables.

export interface AdminUser {
  id: string; name: string; email: string;
  role: "admin" | "editor" | "student";
  status: "active" | "banned";
  joined: string;
}

export interface LegalText {
  id: string; title: string; slug: string;
  domain: string;            // قانون الأسرة / الشغل / الجنائي / التجاري / المدني...
  status: "published" | "draft";
  content?: string;          // sanitised rich HTML (full text)
  reference?: string;        // رقم الظهير / رقم القانون (e.g. "ظهير 1.04.22")
  officialGazetteNumber?: string;   // رقم الجريدة الرسمية
  effectiveDate?: string;    // تاريخ النفاذ
  lastAmendedDate?: string;  // تاريخ آخر تعديل
  accessTier?: "free" | "premium" | "enterprise";
  attachmentUrl?: string;    // PDF of official text, if any
  tags?: string[];
  updated: string;
} 
export interface AdminArticle {
  id: string; title: string; slug: string; category: string;
  status: "published" | "draft"; author: string; views: number; updated: string;
  content?: string;          // sanitised rich HTML
  excerpt?: string;
  keyword?: string;          // focus keyword
  metaTitle?: string;
  metaDescription?: string;
  tags?: string[];
  commentsEnabled?: boolean;
  coverImage?: string;
}

export interface Comment {
  id: string; articleId: string; name: string; body: string; at: string;
}

export interface TrafficHit {
  id: string; path: string; source: string; medium: string; campaign: string;
  referrer: string; at: string;
}

export interface AdminPage {
  id: string; title: string; slug: string;
  status: "published" | "draft"; updated: string;
}

export interface SeoKeyword {
  id: string; keyword: string; clicks: number; impressions: number; position: number;
}

export interface SecurityEvent {
  id: string; type: string; detail: string; severity: "info" | "warning" | "critical"; at: string;
}

interface CmsState {
  users: AdminUser[];
  articles: AdminArticle[];
  pages: AdminPage[];
  keywords: SeoKeyword[];
  security: SecurityEvent[];
  comments: Comment[];
  traffic: TrafficHit[];
}

const KEY = "mizan_cms_v1";

const SEED: CmsState = {
  users: [
    { id: "u1", name: "أمين البقالي", email: "amine@mizan.ma", role: "admin", status: "active", joined: "2025-11-02" },
    { id: "u2", name: "سلمى الفاسي", email: "salma@mizan.ma", role: "editor", status: "active", joined: "2026-01-14" },
    { id: "u3", name: "يوسف الإدريسي", email: "youssef@um5.ac.ma", role: "student", status: "active", joined: "2026-03-21" },
    { id: "u4", name: "نادية بنعلي", email: "nadia@uh2.ac.ma", role: "student", status: "banned", joined: "2026-02-08" },
    { id: "u5", name: "Karim Alaoui", email: "karim@uca.ma", role: "student", status: "active", joined: "2026-05-30" },
  ],
  articles: [
    { id: "a1", title: "أسئلة وأجوبة امتحان قانون الأسرة S1", slug: "family-law-s1-2026", category: "قانون الأسرة", status: "published", author: "سلمى الفاسي", views: 4200, updated: "2026-07-13", commentsEnabled: true, tags: ["S1", "2026", "مدوّنة الأسرة"], excerpt: "نماذج إجابات شاملة تغطي مدوّنة الأسرة.", metaDescription: "نماذج إجابات شاملة لامتحان قانون الأسرة S1 بالمغرب 2026: الزواج، الطلاق، النسب والحضانة.", keyword: "قانون الأسرة" },
    { id: "a2", title: "مستجدات قانون المسطرة الجنائية 2025", slug: "criminal-procedure-2025", category: "القانون الجنائي", status: "published", author: "أمين البقالي", views: 2800, updated: "2026-07-12", commentsEnabled: true, tags: ["مسطرة جنائية", "2025"] },
    { id: "a3", title: "عقد الشركة وأحكام محكمة النقض", slug: "company-contract-cassation", category: "القانون التجاري", status: "draft", author: "سلمى الفاسي", views: 0, updated: "2026-07-09", commentsEnabled: false, tags: ["شركات"] },
  ],
  pages: [
    { id: "p1", title: "عن المنصة", slug: "about", status: "published", updated: "2026-06-01" },
    { id: "p2", title: "سياسة الخصوصية", slug: "legal/privacy", status: "published", updated: "2026-06-01" },
    { id: "p3", title: "شروط الاستخدام", slug: "legal/terms", status: "published", updated: "2026-06-01" },
    { id: "p4", title: "اتصل بنا", slug: "contact", status: "published", updated: "2026-06-01" },
  ],
  keywords: [
    { id: "k1", keyword: "مدونة الأسرة المغربية", clicks: 3120, impressions: 48200, position: 2.4 },
    { id: "k2", keyword: "امتحانات القانون S1", clicks: 2140, impressions: 31900, position: 3.1 },
    { id: "k3", keyword: "قانون المسطرة الجنائية", clicks: 1780, impressions: 27400, position: 4.8 },
    { id: "k4", keyword: "law schools morocco", clicks: 940, impressions: 15600, position: 5.2 },
    { id: "k5", keyword: "jurisprudence marocaine", clicks: 610, impressions: 12100, position: 6.7 },
  ],
  security: [
    { id: "s1", type: "auth", detail: "5 محاولات دخول فاشلة من IP 41.xx.xx.12", severity: "warning", at: "2026-07-15 09:22" },
    { id: "s2", type: "rate_limit", detail: "تم حظر إرسال نموذج التواصل (كشف رسائل مزعجة)", severity: "info", at: "2026-07-15 08:10" },
    { id: "s3", type: "injection", detail: "تم تحييد محاولة حقن في بحث المقالات", severity: "critical", at: "2026-07-14 21:47" },
    { id: "s4", type: "auth", detail: "تسجيل دخول ناجح للمدير أمين البقالي", severity: "info", at: "2026-07-14 18:03" },
  ],
  comments: [
    { id: "c1", articleId: "a1", name: "طالب مجتهد", body: "شرح ممتاز، شكراً جزيلاً على المجهود!", at: "2026-07-14 12:20" },
    { id: "c2", articleId: "a1", name: "Fatima", body: "هل يمكن إضافة نماذج امتحانات S2؟", at: "2026-07-14 15:44" },
  ],
  traffic: [
    { id: "t1", path: "/article/family-law-s1-2026", source: "google", medium: "organic", campaign: "", referrer: "https://www.google.com/", at: "2026-07-15 08:00" },
    { id: "t2", path: "/article/family-law-s1-2026", source: "facebook", medium: "social", campaign: "share", referrer: "https://facebook.com/", at: "2026-07-15 09:12" },
    { id: "t3", path: "/schools", source: "whatsapp", medium: "share", campaign: "school", referrer: "", at: "2026-07-15 10:03" },
    { id: "t4", path: "/", source: "direct", medium: "none", campaign: "", referrer: "", at: "2026-07-15 10:30" },
    { id: "t5", path: "/article/criminal-procedure-2025", source: "twitter", medium: "social", campaign: "share", referrer: "https://t.co/", at: "2026-07-15 11:15" },
  ],
};

function read(): CmsState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...SEED, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return structuredClone(SEED);
}

let state: CmsState = read();
const listeners = new Set<() => void>();

function commit(next: CmsState) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  listeners.forEach(l => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useCms() {
  return useSyncExternalStore(subscribe, () => state);
}

const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);

// ── Users ──
export const setUserStatus = (id: string, status: AdminUser["status"]) =>
  commit({ ...state, users: state.users.map(u => u.id === id ? { ...u, status } : u) });
export const setUserRole = (id: string, role: AdminUser["role"]) =>
  commit({ ...state, users: state.users.map(u => u.id === id ? { ...u, role } : u) });
export const deleteUser = (id: string) =>
  commit({ ...state, users: state.users.filter(u => u.id !== id) });

// ── Articles ──
export const upsertArticle = (a: Partial<AdminArticle> & { id?: string }) => {
  if (a.id && state.articles.some(x => x.id === a.id)) {
    commit({ ...state, articles: state.articles.map(x => x.id === a.id ? { ...x, ...a, updated: today() } as AdminArticle : x) });
  } else {
    const na: AdminArticle = {
      id: uid(), title: a.title || "", slug: a.slug || uid(), category: a.category || "",
      status: a.status || "draft", author: a.author || "—", views: 0, updated: today(),
    };
    commit({ ...state, articles: [na, ...state.articles] });
  }
};
export const deleteArticle = (id: string) =>
  commit({ ...state, articles: state.articles.filter(a => a.id !== id) });

// ── Pages ──
export const upsertPage = (p: Partial<AdminPage> & { id?: string }) => {
  if (p.id && state.pages.some(x => x.id === p.id)) {
    commit({ ...state, pages: state.pages.map(x => x.id === p.id ? { ...x, ...p, updated: today() } as AdminPage : x) });
  } else {
    const np: AdminPage = { id: uid(), title: p.title || "", slug: p.slug || uid(), status: p.status || "draft", updated: today() };
    commit({ ...state, pages: [np, ...state.pages] });
  }
};
export const deletePage = (id: string) =>
  commit({ ...state, pages: state.pages.filter(p => p.id !== id) });

// ── Comments ──
export const addComment = (articleId: string, name: string, body: string) => {
  const c: Comment = { id: uid(), articleId, name, body, at: new Date().toISOString().slice(0, 16).replace("T", " ") };
  commit({ ...state, comments: [...state.comments, c] });
  return c;
};
export const deleteComment = (id: string) =>
  commit({ ...state, comments: state.comments.filter(c => c.id !== id) });
export const getComments = (articleId: string) => state.comments.filter(c => c.articleId === articleId);

// ── Traffic / referral tracking ──
export const logTraffic = (hit: Omit<TrafficHit, "id" | "at">) => {
  const h: TrafficHit = { ...hit, id: uid(), at: new Date().toISOString().slice(0, 16).replace("T", " ") };
  // keep the most recent 200 hits
  commit({ ...state, traffic: [h, ...state.traffic].slice(0, 200) });
};
