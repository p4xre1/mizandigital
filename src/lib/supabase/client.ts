import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail fast with a helpful message if environment variables are missing
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables! Check your .env or .env.local file for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

// Initialize client with your actual environment variables
export const supabase = createClient(supabaseUrl, supabaseAnonKey);