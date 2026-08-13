/// <reference types="vite/client" />

/**
 * Type definitions for Vite environment variables (`import.meta.env`).
 * Merges automatically with Vite's built-in client type definitions.
 */
interface ImportMetaEnv {
  /** Supabase project URL. */
  readonly VITE_SUPABASE_URL: string;
  /** Supabase public anon key. */
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Application base URL. */
  readonly VITE_SITE_URL?: string;
  /** Optional Google Analytics 4 Measurement ID. */
  readonly VITE_GA_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}