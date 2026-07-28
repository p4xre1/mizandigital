// noinspection JSUnusedGlobalSymbols, SpellCheckingInspection

/**
 * Utility type for JSON/JSONB fields in Supabase
 */
export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

/**
 * User Authorization Roles across Mizan Digital Platform
 * Synced with useRole hook & SQL user_role enum
 */
export type Role =
    | "root"
    | "security_admin"
    | "admin"
    | "marketer"
    | "writer"
    | "member"
    | "guest";

/**
 * Status Types
 */
export type ContentStatus = "draft" | "published" | "archived";
export type QuestionStatus = "pending" | "answered" | "closed";
export type InteractionType = "like" | "save";

// ── Tables Interfaces (Row Definitions matching SQL exactly) ───────────────

export interface UserProfile {
  id: string; // References auth.users(id)
  email: string;
  role: Role;
  bonus_credits: number;
  referred_by: string | null;
  created_at: string;
  updated_at: string;
  referral_code: string | null;
  referral_count: number;
  daily_credits: number;
  full_name: string | null;
  progress: Json | null; // Defaults to {"S1": 0, "S2": 0, ...}
  bio: string | null;
  avatar_url: string | null;
  admin_god_mode: boolean;
  last_updated_at: string | null;
  is_frozen: boolean;
  ads_exempt: boolean;
  preferred_lang: "ar" | "fr" | "en" | "es" | null;
  last_ip_address: string | null; // inet
  ban_reason: string | null;
  banned_at: string | null;
  banned_by: string | null;
}

export interface Tenant {
  id: string;
  name: string;
  domain_wildcard: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  name_fr: string | null;
  slug: string;
  description: string | null;
  icon: string | null;
  count: number;
}

export interface LawSchool {
  id: string;
  name: string;
  city: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  created_at: string;
}

export interface Article {
  id: string;
  title: string;
  title_fr: string | null;
  slug: string;
  content: string;
  excerpt: string | null;
  category_id: string | null;
  school_id: string | null;
  semester: string | null;
  author_id: string | null;
  pdf_url: string | null;
  views: number;
  is_featured: boolean;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
  editor_id: string | null;
  tenant_id: string | null;
}

export interface NewsItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  views: number;
  status: ContentStatus;
  author_id: string | null;
  published_at: string | null;
  created_at: string;
  editor_id: string | null;
  tenant_id: string | null;
}

export interface DocumentLibraryItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  file_url: string;
  file_size_bytes: number | null;
  category_id: string | null;
  school_id: string | null;
  download_count: number;
  uploaded_by: string | null;
  created_at: string;
}

export interface LegalQuestion {
  id: string;
  user_id: string | null;
  title: string;
  question_body: string;
  category_id: string | null;
  status: QuestionStatus;
  views: number;
  created_at: string;
}

export interface LegalAnswer {
  id: string;
  question_id: string;
  lawyer_id: string;
  answer_body: string;
  is_accepted: boolean;
  created_at: string;
}

export interface UserInteraction {
  id: string;
  user_id: string | null;
  article_id: string | null;
  interaction_type: InteractionType;
  created_at: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  created_at: string;
}

export interface AnalyticsEvent {
  id: string;
  user_id: string | null;
  session_id: string;
  event_type: string;
  path: string;
  query: string | null;
  article_id: string | null;
  school_id: string | null;
  category_id: string | null;
  metadata: Json | null;
  user_agent: string | null;
  created_at: string;
  ip_address: string | null;
}

// ── Supabase Database Schema Type Definitions ──────────────────────────────

/**
 * Standard utility for generating Insert/Update types from a Row type
 */
type InsertType<T> = Partial<Omit<T, "id" | "created_at" | "updated_at">> & { id?: string; created_at?: string; updated_at?: string };
type UpdateType<T> = Partial<Omit<T, "id">>;

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: Tenant;
        Insert: InsertType<Tenant>;
        Update: UpdateType<Tenant>;
      };
      profiles: {
        Row: UserProfile;
        Insert: InsertType<UserProfile>;
        Update: UpdateType<UserProfile>;
      };
      categories: {
        Row: Category;
        Insert: InsertType<Category>;
        Update: UpdateType<Category>;
      };
      schools: {
        Row: LawSchool;
        Insert: InsertType<LawSchool>;
        Update: UpdateType<LawSchool>;
      };
      articles: {
        Row: Article;
        Insert: InsertType<Article>;
        Update: UpdateType<Article>;
      };
      news: {
        Row: NewsItem;
        Insert: InsertType<NewsItem>;
        Update: UpdateType<NewsItem>;
      };
      documents_library: {
        Row: DocumentLibraryItem;
        Insert: InsertType<DocumentLibraryItem>;
        Update: UpdateType<DocumentLibraryItem>;
      };
      legal_questions: {
        Row: LegalQuestion;
        Insert: InsertType<LegalQuestion>;
        Update: UpdateType<LegalQuestion>;
      };
      legal_answers: {
        Row: LegalAnswer;
        Insert: InsertType<LegalAnswer>;
        Update: UpdateType<LegalAnswer>;
      };
      user_interactions: {
        Row: UserInteraction;
        Insert: InsertType<UserInteraction>;
        Update: UpdateType<UserInteraction>;
      };
      contacts: {
        Row: Contact;
        Insert: InsertType<Contact>;
        Update: UpdateType<Contact>;
      };
      analytics_events: {
        Row: AnalyticsEvent;
        Insert: InsertType<AnalyticsEvent>;
        Update: UpdateType<AnalyticsEvent>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: Role;
      content_status: ContentStatus;
      question_status: QuestionStatus;
    };
  };
}