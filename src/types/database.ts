/**
 * User Authorization Roles across Mizan Digital Platform
 */
export type Role =
  | "guest"
  | "member"
  | "writer"
  | "security_admin"
  | "root";

/**
 * Categories for Court Rulings
 */
export type CourtRulingCategory =
  | "court-of-cassation"
  | "courts-of-appeal"
  | "administrative-courts";

/**
 * Categories for Legal Doctrine
 */
export type DoctrineCategory =
  | "academic-articles"
  | "case-commentaries"
  | "comparative-studies";

/**
 * User Profile record stored in `public.profiles`
 */
export interface UserProfile {
  /** Unique User UUID matching `auth.users.id` */
  id: string;

  /** Display full name */
  full_name: string | null;

  /** Role assigned for RBAC (Role-Based Access Control) */
  role: Role;

  /** Daily recurring research credits */
  daily_credits?: number;

  /** Bonus / Earned ad credits */
  bonus_credits?: number;

  /** Avatar image URL */
  avatar_url?: string | null;

  /** ISO 8601 Timestamp of account creation */
  created_at?: string;

  /** ISO 8601 Timestamp of last update */
  updated_at?: string;
}

/**
 * Court Ruling record stored in `public.court_rulings`
 */
export interface CourtRuling {
  id: string;
  title: string;
  slug: string;
  category: CourtRulingCategory;
  case_number: string | null;
  ruling_date: string | null;
  summary: string | null;
  content: string;
  published: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Doctrinal Study record stored in `public.doctrinal_articles`
 */
export interface DoctrinalArticle {
  id: string;
  title: string;
  slug: string;
  category: DoctrineCategory;
  author_name: string;
  excerpt: string | null;
  content: string;
  published: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Supabase Database Schema Type Definitions
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<UserProfile, "id">>;
      };
      court_rulings: {
        Row: CourtRuling;
        Insert: Omit<CourtRuling, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<CourtRuling, "id">>;
      };
      doctrinal_articles: {
        Row: DoctrinalArticle;
        Insert: Omit<DoctrinalArticle, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DoctrinalArticle, "id">>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      role: Role;
      court_ruling_category: CourtRulingCategory;
      doctrine_category: DoctrineCategory;
    };
  };
}