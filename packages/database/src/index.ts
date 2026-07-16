import { createClient } from '@supabase/supabase-js';

// Type-cast import.meta to 'any' so TypeScript doesn't throw errors in this sub-package
const env = (import.meta as any).env || {};

const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing inside @mizan/database environment context.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Profile {
  id: string;
  tenant_id: string | null;
  full_name: string | null;
  tier: 'free' | 'premium' | 'enterprise';
  created_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  domain_wildcard: string | null;
  tier: 'free' | 'premium' | 'enterprise';
}