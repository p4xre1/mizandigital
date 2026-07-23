/// <reference types="vite/client" />

/**
 * Type definitions for Vite environment variables (`import.meta.env`).
 * Merges automatically with Vite's built-in client type definitions.
 */
interface ImportMetaEnv {
  /**
   * Primary canonical site URL
   * @example "https://www.mizan.page"
   */
  readonly VITE_SITE_URL?: string;

  /**
   * Google AdSense Client / Publisher ID
   * @example "ca-pub-1749032173858747"
   */
  readonly VITE_GOOGLE_ADSENSE_CLIENT_ID?: string;

  /**
   * Google Tag Manager Container ID
   * @example "GTM-PTT8P94G"
   */
  readonly VITE_GTM_ID?: string;

  /**
   * Google Analytics 4 Measurement ID
   * @example "G-XXXXXXXXXX"
   */
  readonly VITE_GA_MEASUREMENT_ID?: string;

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

  /**
   * Cloudflare Turnstile CAPTCHA Site Key
   * @example "0x4AAAAAAD7kaEjAcOwwsXHc"
   */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}