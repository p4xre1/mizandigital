export type Role =
  | "guest"
  | "member"
  | "premium_member"
  | "writer"
  | "security_admin"
  | "root";

export type Tier = "free" | "premium" | "enterprise";

export interface UserProfile {
  id: string;
  full_name: string | null;
  role: Role;
  tier: Tier;
  daily_credits?: number;
  bonus_credits?: number;
  avatar_url?: string | null;
  updated_at?: string;
  created_at?: string;
}