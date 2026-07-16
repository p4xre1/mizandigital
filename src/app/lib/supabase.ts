import { createClient } from "@supabase/supabase-js";
import { sanitizePgFilter, sanitizeText, isValidEmail, looksLikeSpam } from "./security";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Guard: fall back to placeholder so the app renders even without env vars.
// Real queries short-circuit (see `ensureConfigured`) and pages use mock data.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);

// Throw a clean, catchable error BEFORE any network fetch is attempted
// against the placeholder host — avoids noisy "Failed to fetch" errors.
function ensureConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Using mock data.");
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface Article {
  id: string;
  title: string;
  title_fr?: string;
  slug: string;
  content?: string;
  excerpt?: string;
  category: string;
  tags?: string[];
  author?: string;
  university?: string;
  semester?: string;
  year?: number;
  pdf_url?: string;
  views: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  name_fr?: string;
  slug: string;
  description?: string;
  icon?: string;
  count: number;
}

export interface University {
  id: string;
  name: string;
  city?: string;
  slug: string;
}

export interface ContactMessage {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function getArticles(opts?: {
  category?: string;
  university?: string;
  semester?: string;
  limit?: number;
  featured?: boolean;
}) {
  ensureConfigured();
  let query = supabase.from("articles").select("*").order("created_at", { ascending: false });
  if (opts?.category) query = query.eq("category", opts.category);
  if (opts?.university) query = query.eq("university", opts.university);
  if (opts?.semester) query = query.eq("semester", opts.semester);
  if (opts?.featured) query = query.eq("is_featured", true);
  if (opts?.limit) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw error;
  return data as Article[];
}

export async function getArticleBySlug(slug: string) {
  ensureConfigured();
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error) throw error;
  return data as Article;
}

export async function searchArticles(q: string) {
  ensureConfigured();
  // Neutralise PostgREST filter metacharacters so a query like
  // `x,is_featured.eq.true` cannot inject an extra filter condition.
  const safe = sanitizePgFilter(q);
  if (!safe) return [];
  const pattern = `%${safe}%`;
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .or(`title.ilike.${pattern},excerpt.ilike.${pattern}`)
    .limit(20);
  if (error) throw error;
  return data as Article[];
}

export async function getCategories() {
  ensureConfigured();
  const { data, error } = await supabase.from("categories").select("*").order("count", { ascending: false });
  if (error) throw error;
  return data as Category[];
}

export async function getUniversities() {
  ensureConfigured();
  const { data, error } = await supabase.from("universities").select("*").order("name");
  if (error) throw error;
  return data as University[];
}

export class ValidationError extends Error {}

export async function submitContact(msg: ContactMessage) {
  ensureConfigured();

  // Validate + sanitise before it ever reaches the database.
  const name = sanitizeText(msg.name, 120);
  const email = sanitizeText(msg.email, 254);
  const subject = sanitizeText(msg.subject || "", 200);
  const message = sanitizeText(msg.message, 5000);

  if (name.length < 2) throw new ValidationError("name_too_short");
  if (!isValidEmail(email)) throw new ValidationError("invalid_email");
  if (message.length < 10) throw new ValidationError("message_too_short");
  if (looksLikeSpam(`${name} ${subject} ${message}`)) throw new ValidationError("spam_detected");

  const { error } = await supabase
    .from("contacts")
    .insert([{ name, email, subject, message }]);
  if (error) throw error;
}

export async function incrementViews(id: string) {
  if (!isSupabaseConfigured) return;
  await supabase.rpc("increment_views", { article_id: id });
}
