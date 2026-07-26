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

  /** Google AdSense Client / Publisher ID */
  readonly VITE_GOOGLE_ADSENSE_CLIENT_ID?: string;

  /** Google Tag Manager Container ID */
  readonly VITE_GTM_ID?: string;

  /** Google Analytics 4 Measurement ID */
  readonly VITE_GA_ID?: string; // تم التحديث ليتطابق مع VITE_GA_ID

  /** Cloudflare Turnstile CAPTCHA Site Key */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  
  // ⚠️ تم استبعاد VITE_ADMIN_USER و VITE_ADMIN_PASS عمداً لأسباب أمنية
  // يجب عليك إزالة VITE_ من أسمائها في ملف .env حتى لا تتسرب للعموم.
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}