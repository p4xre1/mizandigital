/// <reference types="vite/client" />

/**
 * Type definitions for Vite environment variables (`import.meta.env`).
 * Merges automatically with Vite's built-in client type definitions.
 */
interface ImportMetaEnv {
  /**
   * Primary canonical site URL
   * @example "https://mizanmaroc.qzz.io"
   */
  readonly VITE_SITE_URL?: string;

  /**
   * Google AdSense Client / Publisher ID
   * @example "ca-pub-XXXXXXXXXXXXXXXX"
   */
  readonly VITE_GOOGLE_ADSENSE_CLIENT_ID?: string;

  /**
   * Supabase Project Endpoint URL
   * @example "https://rfhjmtdblmarhlfftlmg.supabase.co"
   */
  readonly VITE_SUPABASE_URL?: string;

  /**
   * Supabase Anonymous / Publishable API Key
   * @example "sb_publishable_y0738q3ikStPOZMl9Ei_eg_2hDOUUe6"
   */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}