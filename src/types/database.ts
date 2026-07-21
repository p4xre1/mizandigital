/**
 * User Authorization Roles across Mizan Digital Platform
 */
export type Role =
  | "guest"
  | "member"
  | "premium_member"
  | "writer"
  | "security_admin"
  | "root";

/**
 * Subscription Tiers for Platform Access & Feature Quotas
 */
export type Tier = "free" | "premium" | "enterprise";

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

  /** Access tier for monetization & rate limits */
  tier: Tier;

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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      role: Role;
      tier: Tier;
    };
  };
}