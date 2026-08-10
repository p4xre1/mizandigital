// noinspection SpellCheckingInspection
import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";

// ── ENVIRONMENT CONFIGURATION ────────────────────────────────────────────────
export const SITE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_URL) ||
  "https://www.mizan.page";

const rawUrl =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  "";
const rawAnonKey =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  "";

/**
 * Validates whether a given string is a valid HTTP/HTTPS URL.
 */
function isValidHttpUrl(urlString: string): boolean {
  if (!urlString) return false;
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validates whether Supabase credentials are configured correctly.
 */
export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawAnonKey &&
  isValidHttpUrl(rawUrl) &&
  rawUrl !== "https://your-supabase-id.supabase.co" &&
  rawUrl !== "https://your-project-ref.supabase.co" &&
  rawAnonKey !== "your-supabase-anon-key" &&
  rawAnonKey !== "your-actual-anon-key"
);

const safeUrl = isSupabaseConfigured
  ? rawUrl
  : "https://placeholder-project.supabase.co";

const safeAnonKey = isSupabaseConfigured
  ? rawAnonKey
  : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

// ── SUPABASE CLIENT CONFIGURATION ───────────────────────────────────────────
export const supabase = createClient<Database>(safeUrl, safeAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce", // High security OAuth 2.0 PKCE implementation
    storageKey: "mizan_secure_auth_token",
  },
  global: {
    headers: {
      "X-Client-Info": "mizan-web-phone-first-v1",
    },
  },
});

// ── 🌐 4-Language System Types ──────────────────────────────────────────────
export type SupportedLang = "ar" | "fr" | "en" | "es";

export interface MultilingualField {
  ar: string;
  fr?: string | null;
  en?: string | null;
  es?: string | null;
}

// ── 📰 Articles & Content Query Helpers ─────────────────────────────────────
export type Article =
  Database["public"]["Tables"]["articles"]["Row"];

export interface GetArticlesOptions {
  limit?: number;
  offset?: number;
  category?: string;
  categoryId?: string;
  schoolId?: string;
  semester?: string;
  lang?: SupportedLang;
  featured?: boolean;
  searchQuery?: string;
}

export interface GetArticlesResult {
  data: Article[];
  count: number;
  error: unknown | null;
}

export async function getArticles(
  options: GetArticlesOptions = {}
): Promise<GetArticlesResult> {
  if (!isSupabaseConfigured) {
    return { data: [], count: 0, error: null };
  }

  try {
    let query = supabase
      .from("articles")
      .select("*", { count: "exact" });

    const categoryId = options.categoryId ?? options.category;

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    if (options.schoolId) {
      query = query.eq("school_id", options.schoolId);
    }

    if (options.semester) {
      query = query.eq("semester", options.semester);
    }

    if (options.featured !== undefined) {
      query = query.eq("is_featured", options.featured);
    }

    if (options.searchQuery) {
      const search = options.searchQuery
        .replace(/[,%()]/g, " ")
        .trim();

      if (search) {
        query = query.or(
          `title.ilike.%${search}%,excerpt.ilike.%${search}%`
        );
      }
    }

    query = query.order("created_at", { ascending: false });

    if (options.limit) {
      const from = options.offset ?? 0;
      const to = from + options.limit - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;

    return {
      data: (data ?? []) as Article[],
      count: count ?? 0,
      error,
    };
  } catch (error) {
    console.error("[SUPABASE GET_ARTICLES ERROR]", error);
    return { data: [], count: 0, error };
  }
}




/**
 * Fetches a single article by its unique slug
 */
export async function getArticleBySlug(slug: string) {
  if (!isSupabaseConfigured) {
    return { data: null, error: null };
  }

  try {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    return { data, error };
  } catch (err) {
    console.error("[SUPABASE GET_ARTICLE_BY_SLUG ERROR]", err);
    return { data: null, error: err };
  }
}

// ── 🔍 SEO & Keyword Utilities (Text, Photos, Files) ─────────────────────────

export interface PhotoSeoMetadata {
  url: string;
  altText: MultilingualField;
  title: MultilingualField;
  caption?: MultilingualField;
  keywords: string[];
  dimensions?: { width: number; height: number };
}

export interface DocumentSeoMetadata {
  fileUrl: string;
  filename: string;
  title: MultilingualField;
  description?: MultilingualField;
  keywords: string[];
  fileSizeBytes?: number;
  categorySlug?: string;
}

/**
 * Generates SEO metadata and Schema.org ImageObject for visual assets
 */
export function generatePhotoSeoSchema(
  photo: PhotoSeoMetadata,
  lang: SupportedLang = "ar"
) {
  const title = photo.title[lang] || photo.title.ar;
  const alt = photo.altText[lang] || photo.altText.ar;

  return {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    contentUrl: photo.url,
    url: photo.url,
    name: title,
    description: alt,
    caption: photo.caption ? photo.caption[lang] || photo.caption.ar : title,
    keywords: photo.keywords.join(", "),
    ...(photo.dimensions
      ? {
          width: `${photo.dimensions.width}px`,
          height: `${photo.dimensions.height}px`,
        }
      : {}),
  };
}

/**
 * Generates SEO document download tags and metadata keywords for file assets
 */
export function generateDocumentSeoSchema(
  doc: DocumentSeoMetadata,
  lang: SupportedLang = "ar"
) {
  const title = doc.title[lang] || doc.title.ar;
  const description = doc.description
    ? doc.description[lang] || doc.description.ar
    : title;

  return {
    "@context": "https://schema.org",
    "@type": "DigitalDocument",
    name: title,
    description,
    url: doc.fileUrl,
    fileFormat: doc.filename.split(".").pop() || "pdf",
    keywords: doc.keywords.join(", "),
  };
}

// ── 🛡️ Security Audit & Analytics Helper ────────────────────────────────────

export async function logAuditEvent(
  action: string,
  tableName: string,
  oldData?: Record<string, unknown>,
  newData?: Record<string, unknown>
) {
  if (!isSupabaseConfigured) return;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    type AuditLogInsert = Database["public"]["Tables"]["audit_logs"]["Insert"];

    const auditPayload: AuditLogInsert = {
      user_id: session?.user?.id || null,
      action,
      table_name: tableName,
      old_data: oldData ? (oldData as Json) : null,
      new_data: newData ? (newData as Json) : null,
    };

    await supabase.from("audit_logs").insert(auditPayload as never);
  } catch (err) {
    console.error("[SECURITY LOG ERROR]", err);
  }
}