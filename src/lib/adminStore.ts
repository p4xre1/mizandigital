import { useSyncExternalStore } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  requireVerifiedEmail,
  sanitizeText,
  sanitizeHtml,
  looksLikeSpam,
} from "@/lib/security";

// ── ENVIRONMENT CONFIGURATION & DOMAINS ──────────────────────────────────────
export const SITE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL) ||
  "https://www.mizan.page";

export const APP_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_URL) ||
  "https://www.mizan.page";

export const GA_ID =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_GA_ID) ||
  "G-S52GPR2RWL";

export const GTM_ID =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_GTM_ID) ||
  "GTM-PTT8P94G";

export const ADSENSE_CLIENT_ID =
  (typeof import.meta !== "undefined" &&
    import.meta.env?.VITE_GOOGLE_ADSENSE_CLIENT_ID) ||
  "ca-pub-1749032173858747";

// ── STORAGE BUCKET NAMES (From Supabase Dashboard) ───────────────────────────
export const STORAGE_BUCKETS = {
  DOCUMENTS: "library-docs",
  AVATARS: "avatars",
} as const;

// ── ROLES & SECURITY CLEARANCE LEVELS ─────────────────────────────────────────
export type Role =
  | "root"
  | "security_admin"
  | "admin"
  | "marketer"
  | "writer"
  | "member"
  | "guest";

export const ROLES = {
  ROOT: ["root"],
  USER_MANAGERS: ["root", "security_admin", "admin"],
  CONTENT_WRITERS: ["root", "admin", "writer"],
  MARKETERS: ["root", "admin", "marketer"],
  STAFF: ["root", "security_admin", "admin", "marketer", "writer"],
  ALL: ["root", "security_admin", "admin", "marketer", "writer", "member", "guest"],
} as const;

async function ensurePrivilege(allowedRoles: readonly string[]) {
  const user = await requireVerifiedEmail();
  const userRole = (user.app_metadata?.role as string)?.toLowerCase().trim() || "member";

  if (!allowedRoles.includes(userRole) && userRole !== "root") {
    console.error(
      `[SECURITY BREACH ATTEMPT] Action blocked. User ${user.email} (${userRole}) lacks clearance. Required: ${allowedRoles.join(", ")}`
    );
    throw new Error("FORBIDDEN: Insufficient privileges for this operation.");
  }

  return user;
}

// ── 4-LANGUAGE MULTILINGUAL & MASTER SEO TYPES ───────────────────────────────
export type Lang = "ar" | "fr" | "en" | "es";

export interface MultilingualText {
  ar: string;
  fr?: string;
  en?: string;
  es?: string;
}

export interface PhotoMediaSEO {
  id: string;
  url: string;
  webpUrl?: string;
  avifUrl?: string;
  altText: MultilingualText;
  title: MultilingualText;
  caption?: MultilingualText;
  keywords: string[];
  width?: number;
  height?: number;
  mimeType: string;
  fileSizeKb?: number;
  uploadedAt: string;
}

export interface DocumentFileSEO {
  id: string;
  url: string;
  filename: string;
  title: MultilingualText;
  description?: MultilingualText;
  keywords: string[];
  fileType: "pdf" | "docx" | "xlsx" | "zip" | "other";
  fileSizeKb?: number;
  uploadedAt: string;
}

// ── DATA ENTITIES ─────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "banned";
  joined: string;
  avatarUrl?: string;
}

export interface LegalText {
  id: string;
  title: string;
  slug: string;
  domain: string;
  status: "published" | "draft";
  content?: string;
  reference?: string;
  officialGazetteNumber?: string;
  effectiveDate?: string;
  lastAmendedDate?: string;
  accessTier?: "free" | "premium" | "enterprise";
  attachmentUrl?: string;
  attachmentSeo?: DocumentFileSEO;
  tags?: string[];
  updated: string;
}

export interface AdminArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: "published" | "draft";
  published?: boolean;
  author: string;
  views: number;
  updated: string;
  updatedAt?: string;
  content?: string;
  excerpt?: string;
  keyword?: string;
  metaTitle?: string;
  metaDescription?: string;
  tags?: string[];
  commentsEnabled?: boolean;
  allowComments?: boolean;
  coverImage?: string;
  coverImageSeo?: PhotoMediaSEO;
  multilingualTitle?: MultilingualText;
  multilingualExcerpt?: MultilingualText;
}

export type Article = AdminArticle;

export interface Comment {
  id: string;
  articleId: string;
  name: string;
  body: string;
  at: string;
}

export interface TrafficHit {
  id: string;
  path: string;
  source: string;
  medium: string;
  campaign: string;
  referrer: string;
  at: string;
}

export interface AdminPage {
  id: string;
  title: string;
  slug: string;
  status: "published" | "draft";
  updated: string;
  multilingualTitle?: MultilingualText;
}

export interface SeoKeyword {
  id: string;
  keyword: string;
  clicks: number;
  impressions: number;
  position: number;
  lang?: Lang;
}

export interface SecurityEvent {
  id: string;
  type: string;
  detail: string;
  severity: "info" | "warning" | "critical";
  at: string;
}

export interface CmsState {
  users: AdminUser[];
  articles: AdminArticle[];
  legalTexts: LegalText[];
  pages: AdminPage[];
  keywords: SeoKeyword[];
  security: SecurityEvent[];
  comments: Comment[];
  traffic: TrafficHit[];
  photosSeo: PhotoMediaSEO[];
  documentsSeo: DocumentFileSEO[];
}

const KEY = "mizan_cms_v1";

// ⚠️ SEED DATA CLEANED: No fake comments or mock reviews!
const SEED: CmsState = {
  users: [],
  articles: [],
  legalTexts: [
    { id: "lt1", title: "مدونة الأسرة - القانون رقم 70.03", slug: "moudawana-family-code", domain: "قانون الأسرة", status: "published", updated: "2026-06-10" },
  ],
  pages: [
    { id: "p1", title: "عن المنصة", slug: "about", status: "published", updated: "2026-06-01" },
  ],
  keywords: [],
  security: [],
  comments: [], // 👈 CLEAN: Zero fake reviews
  traffic: [],
  photosSeo: [],
  documentsSeo: [],
};

// ── STORE READ/WRITE UTILITIES ────────────────────────────────────────────────
function read(): CmsState {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...SEED,
        ...parsed,
        comments: parsed.comments || [],
        photosSeo: parsed.photosSeo || [],
        documentsSeo: parsed.documentsSeo || [],
      };
    }
  } catch {
    /* Safe fallback */
  }
  return structuredClone(SEED);
}

let state: CmsState = read();
const listeners = new Set<() => void>();

function commit(next: CmsState) {
  state = next;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* Safe fallback */
    }
  }
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      state = read();
      listeners.forEach((l) => l());
    }
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useCms(): CmsState {
  return useSyncExternalStore(subscribe, () => state, () => SEED);
}

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 9);

const today = () => new Date().toISOString().slice(0, 10);

// ── DYNAMIC STORAGE MANAGEMENT (Supabase Storage / Cloudflare R2) ─────────────

/**
 * Uploads legal PDFs or office documents directly to Supabase `library-docs` bucket.
 * Returns the public CDN URL to attach to articles or legal texts.
 */
export async function uploadLibraryDocument(file: File): Promise<string> {
  await ensurePrivilege(ROLES.CONTENT_WRITERS);

  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Cannot upload to cloud storage.");
  }

  const fileExt = file.name.split(".").pop();
  const filePath = `${Date.now()}_${uid()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.DOCUMENTS)
    .upload(filePath, file, { cacheControl: "3600", upsert: false });

  if (error) {
    console.error("[STORAGE ERROR]", error.message);
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from(STORAGE_BUCKETS.DOCUMENTS)
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}

/**
 * Uploads user avatars directly to Supabase `avatars` bucket.
 */
export async function uploadUserAvatar(file: File, userId: string): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Cannot upload avatar.");
  }

  const fileExt = file.name.split(".").pop();
  const filePath = `avatar_${userId}_${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.AVATARS)
    .upload(filePath, file, { cacheControl: "3600", upsert: true });

  if (error) throw error;

  const { data: publicUrlData } = supabase.storage
    .from(STORAGE_BUCKETS.AVATARS)
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}

// ── GOOGLE ANALYTICS & EVENT TRACKER ──────────────────────────────────────────
export function trackGoogleEvent(eventName: string, params: Record<string, any> = {}) {
  if (typeof window !== "undefined") {
    const dataLayer = (window as any).dataLayer || [];
    dataLayer.push({
      event: eventName,
      ga_id: GA_ID,
      gtm_id: GTM_ID,
      site_domain: SITE_URL,
      timestamp: new Date().toISOString(),
      ...params,
    });
  }
}

// ── USER MANAGEMENT ──────────────────────────────────────────────────────────
export const setUserStatus = async (id: string, status: AdminUser["status"]) => {
  await ensurePrivilege(ROLES.USER_MANAGERS);
  commit({ ...state, users: state.users.map((u) => (u.id === id ? { ...u, status } : u)) });

  if (isSupabaseConfigured) {
    await (supabase.from("profiles") as any).update({ is_frozen: status === "banned" }).eq("id", id);
  }
};

export const setUserRole = async (id: string, role: AdminUser["role"]) => {
  await ensurePrivilege(ROLES.ROOT);
  commit({ ...state, users: state.users.map((u) => (u.id === id ? { ...u, role } : u)) });

  if (isSupabaseConfigured) {
    await (supabase.from("profiles") as any).update({ role }).eq("id", id);
  }
};

export const deleteUser = async (id: string) => {
  await ensurePrivilege(ROLES.ROOT);
  commit({ ...state, users: state.users.filter((u) => u.id !== id) });

  if (isSupabaseConfigured) {
    await (supabase.from("profiles") as any).delete().eq("id", id);
  }
};

// ── ARTICLE MANAGEMENT ────────────────────────────────────────────────────────
export const saveArticle = async (
  a: Partial<AdminArticle> & { id?: string }
) => {
  const user = await ensurePrivilege(ROLES.CONTENT_WRITERS);

  const existingId =
    typeof a.id === "string" &&
    state.articles.some((article) => article.id === a.id)
      ? a.id
      : undefined;

  const localId = sanitizeText(existingId || uid(), 50);
  const isPublished = a.published ?? a.status === "published";

  const title = sanitizeText(a.title || "");
  const slug = sanitizeText(a.slug || localId);
  const excerpt = sanitizeText(a.excerpt || "", 500);
  const content = sanitizeHtml(a.content || "");
  const now = new Date().toISOString();

  let savedId = localId;

  if (isSupabaseConfigured) {
    const payload = {
      title,
      slug,
      excerpt: excerpt || null,
      content,
      status: isPublished ? "published" : "draft",
      
      updated_at: now,
      author_id: user.id,
    };

    const table = supabase.from("articles") as any;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(localId);

    const result = isUuid
      ? await table
          .upsert({ id: localId, ...payload }, { onConflict: "id" })
          .select("id")
          .single()
      : await table.insert(payload).select("id").single();

    if (result.error) {
      console.error("Article save failed:", result.error);
      throw new Error(result.error.message);
    }

    savedId = result.data.id;
  }

  const previous = existingId
    ? state.articles.find((article) => article.id === existingId)
    : undefined;

  const article: AdminArticle = {
    ...previous,
    id: savedId,
    title,
    slug,
    category: sanitizeText(a.category || "General"),
    status: isPublished ? "published" : "draft",
    published: isPublished,
    author: sanitizeText(a.author || "Mizan Editor"),
    views: previous?.views ?? 0,
    updated: today(),
    updatedAt: now,
    excerpt,
    content,
    coverImage: sanitizeText(a.coverImage || "", 1000),
    allowComments: a.allowComments ?? true,
    commentsEnabled: a.allowComments ?? true,
  };

  const articles = existingId
    ? state.articles.map((item) =>
        item.id === existingId ? article : item
      )
    : [article, ...state.articles];

  commit({ ...state, articles });

  trackGoogleEvent("article_saved", {
    article_id: savedId,
    slug,
  });
};

export const deleteArticle = async (id: string) => {
  await ensurePrivilege(["root", "admin"]);
  commit({ ...state, articles: state.articles.filter((a) => a.id !== id) });

  if (isSupabaseConfigured) {
    await (supabase.from("articles") as any).delete().eq("id", id);
  }
};

// ── COMMENTS MANAGEMENT (100% REAL & DYNAMIC) ──────────────────────────────
export const addComment = async (
  articleId: string,
  authorName: string,
  bodyText: string
): Promise<Comment> => {
  const cleanName = sanitizeText(authorName, 60) || "Guest";
  const cleanBody = sanitizeText(bodyText, 1000);

  if (cleanBody.length < 3) {
    throw new Error("Comment is too short.");
  }

  if (looksLikeSpam(`${cleanName} ${cleanBody}`)) {
    throw new Error("Comment rejected by security spam filter.");
  }

  const newComment: Comment = {
    id: `c_${uid()}`,
    articleId,
    name: cleanName,
    body: cleanBody,
    at: new Date().toISOString().replace("T", " ").slice(0, 16),
  };

  commit({
    ...state,
    comments: [newComment, ...state.comments],
  });

  trackGoogleEvent("comment_created", { article_id: articleId, comment_id: newComment.id });

  if (isSupabaseConfigured) {
    await (supabase.from("comments") as any).insert({
      id: newComment.id,
      article_id: articleId,
      author_name: cleanName,
      body: cleanBody,
      created_at: new Date().toISOString(),
    });
  }

  return newComment;
};

export const deleteComment = async (commentId: string): Promise<void> => {
  await ensurePrivilege(ROLES.STAFF);

  commit({
    ...state,
    comments: state.comments.filter((c) => c.id !== commentId),
  });

  if (isSupabaseConfigured) {
    await (supabase.from("comments") as any).delete().eq("id", commentId);
  }
};

// ── LEGAL TEXTS MANAGEMENT ────────────────────────────────────────────────────
export const upsertLegalText = async (lt: Partial<LegalText> & { id?: string }) => {
  await ensurePrivilege(ROLES.CONTENT_WRITERS);

  const isExisting = lt.id && state.legalTexts.some((x) => x.id === lt.id);
  const targetId = sanitizeText(lt.id || uid(), 50);
  const cleanTitle = sanitizeText(lt.title || "");
  const cleanSlug = sanitizeText(lt.slug || targetId);
  const cleanDomain = sanitizeText(lt.domain || "General");
  const cleanContent = sanitizeHtml(lt.content || "");

  if (isExisting) {
    commit({
      ...state,
      legalTexts: state.legalTexts.map((x) =>
        x.id === targetId
          ? ({ ...x, ...lt, title: cleanTitle, slug: cleanSlug, content: cleanContent, updated: today() } as LegalText)
          : x
      ),
    });
  } else {
    const nlt: LegalText = {
      id: targetId,
      title: cleanTitle,
      slug: cleanSlug,
      domain: cleanDomain,
      content: cleanContent,
      status: lt.status || "draft",
      accessTier: lt.accessTier || "free",
      updated: today(),
    };
    commit({ ...state, legalTexts: [nlt, ...state.legalTexts] });
  }

  if (isSupabaseConfigured) {
    await (supabase.from("legal_texts") as any).upsert({
      id: targetId,
      title: cleanTitle,
      slug: cleanSlug,
      domain: cleanDomain,
      content: cleanContent,
      status: lt.status,
      access_tier: lt.accessTier,
      updated_at: new Date().toISOString(),
    });
  }
};

export const deleteLegalText = async (id: string) => {
  await ensurePrivilege(["root", "admin"]);
  commit({ ...state, legalTexts: state.legalTexts.filter((lt) => lt.id !== id) });

  if (isSupabaseConfigured) {
    await (supabase.from("legal_texts") as any).delete().eq("id", id);
  }
};

// ── PAGES MANAGEMENT ──────────────────────────────────────────────────────────
export const upsertPage = async (p: Partial<AdminPage> & { id?: string }) => {
  await ensurePrivilege(["root", "admin"]);
  const isExisting = p.id && state.pages.some((x) => x.id === p.id);
  const targetId = sanitizeText(p.id || uid(), 50);
  const cleanTitle = sanitizeText(p.title || "");
  const cleanSlug = sanitizeText(p.slug || targetId);

  if (isExisting) {
    commit({
      ...state,
      pages: state.pages.map((x) =>
        x.id === targetId
          ? ({ ...x, ...p, title: cleanTitle, slug: cleanSlug, updated: today() } as AdminPage)
          : x
      ),
    });
  } else {
    commit({
      ...state,
      pages: [
        { id: targetId, title: cleanTitle, slug: cleanSlug, status: p.status || "draft", updated: today() },
        ...state.pages,
      ],
    });
  }
};

export const deletePage = async (id: string) => {
  await ensurePrivilege(ROLES.ROOT);
  commit({ ...state, pages: state.pages.filter((p) => p.id !== id) });
};

// ── PHOTO & FILE MASTER SEO MANAGEMENT ───────────────────────────────────────
export const upsertPhotoSEO = async (photo: PhotoMediaSEO) => {
  await ensurePrivilege(ROLES.CONTENT_WRITERS);

  const exists = state.photosSeo.some((p) => p.id === photo.id);
  const updatedList = exists
    ? state.photosSeo.map((p) => (p.id === photo.id ? photo : p))
    : [photo, ...state.photosSeo];

  commit({ ...state, photosSeo: updatedList });
};

export const deletePhotoSEO = async (id: string) => {
  await ensurePrivilege(["root", "admin"]);
  commit({ ...state, photosSeo: state.photosSeo.filter((p) => p.id !== id) });
};

export const upsertDocumentSEO = async (doc: DocumentFileSEO) => {
  await ensurePrivilege(ROLES.CONTENT_WRITERS);

  const exists = state.documentsSeo.some((d) => d.id === doc.id);
  const updatedList = exists
    ? state.documentsSeo.map((d) => (d.id === doc.id ? doc : d))
    : [doc, ...state.documentsSeo];

  commit({ ...state, documentsSeo: updatedList });
};

export const deleteDocumentSEO = async (id: string) => {
  await ensurePrivilege(["root", "admin"]);
  commit({ ...state, documentsSeo: state.documentsSeo.filter((d) => d.id !== id) });
};

// ── UTILITIES & HELPER EXPORTS ────────────────────────────────────────────────
export const getArticleById = (cmsState: CmsState, id: string) =>
  cmsState.articles.find((a) => a.id === id);

export const upsertArticle = saveArticle;