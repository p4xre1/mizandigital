/// <reference types="vite/client" />

/**
 * Type definitions for Vite environment variables (`import.meta.env`).
 * Merges automatically with Vite's built-in client type definitions.
 */
interface ImportMetaEnv {
  /** Primary canonical site URL */
  readonly VITE_SITE_URL?: string;

  /** App specific URL (often same as SITE_URL) */
  readonly VITE_APP_URL?: string;

  /** Supabase Project Endpoint URL */
  readonly VITE_SUPABASE_URL: string;

  /** Supabase Anonymous / Publishable API Key */
  readonly VITE_SUPABASE_ANON_KEY: string;

  /** Google AdSense Client / Publisher ID (e.g. ca-pub-1749032173858747) */
  readonly VITE_ADSENSE_CLIENT_ID?: string;

  /** Backward-compatible AdSense alias used by older components */
  readonly VITE_GOOGLE_ADSENSE_CLIENT_ID?: string;

  /** Google Tag Manager Container ID */
  readonly VITE_GTM_ID?: string;

  /** Google Analytics 4 Measurement ID */
  readonly VITE_GA_ID?: string;

  /** Google Search Console / site verification token */
  readonly VITE_GOOGLE_SITE_VERIFICATION?: string;

  /** Cloudflare Turnstile CAPTCHA Site Key */
  readonly VITE_TURNSTILE_SITE_KEY?: string;

  /** Backward-compatible Turnstile alias used by older components */
  readonly VITE_CLOUDFLARE_SITE_KEY?: string;

  // ── Cloudflare R2 Public Configuration ──────────────────────────────────
  /** Custom Domain or Public URL for R2 objects (e.g., https://cdn.mizan.page) */
  readonly VITE_R2_PUBLIC_URL?: string;

  /** Target Cloudflare R2 Bucket Name (e.g., mizan-storage) */
  readonly VITE_R2_BUCKET_NAME?: string;

  /** Optional API endpoint for D1-backed functionality */
  readonly VITE_D1_API_URL?: string;

  // ⚠️ تم استبعاد VITE_ADMIN_USER و VITE_ADMIN_PASS و R2_SECRET_ACCESS_KEY عمداً لأسباب أمنية.
  // لا تقم بوضع VITE_ قبل مفاتيح Secret Key أو Admin حتى لا تتسرب لمتصفح المستخدم.
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}