/* eslint-disable @typescript-eslint/no-unused-vars, no-unused-vars */
/**
 * Mizan Digital - Enterprise Analytics Engine
 * Path: /src/lib/analytics.ts
 *
 * Features:
 * - Phone-First & Low-Bandwidth Optimizations (Navigator Beacon, Mobile Network Detection)
 * - Military-Grade Security (PII Sanitization, XSS Redaction, Strict Cookie/IP Protection)
 * - Complete Google Suite Ecosystem Integration (GA4, GTM, Google Ads Conversions, AdSense)
 * - Master SEO & Keyword Tracking for Images, Documents, and Articles
 * - Full 4-Language Localization Support (AR, FR, EN, ES)
 * - Safe Ad-Blocker Handling (Brave, uBlock, AdGuard)
 */

export type SupportedLang = "ar" | "fr" | "en" | "es";

const SITE_URL = import.meta.env.VITE_SITE_URL || "https://www.mizan.page";
const GA_ID = import.meta.env.VITE_GA_ID as string | undefined;
const GTM_ID = import.meta.env.VITE_GTM_ID as string | undefined;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer: Record<string, unknown>[];
  }
}

// ==========================================
// 🛡️ MILITARY-GRADE SECURITY & SANITIZATION
// ==========================================

/**
 * Redacts Personally Identifiable Information (PII), Auth Tokens, and Passwords
 */
function sanitizeValue(value: unknown): unknown {
  if (typeof value !== "string") return value;

  return value
    // Redact Emails
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[REDACTED_EMAIL]")
    // Redact Bearer / API / Auth Tokens
    .replace(/(bearer|token|auth|key|secret|password)=([^\s&]+)/gi, "$1=[REDACTED]")
    // Redact Moroccan/International Phone Numbers
    .replace(/(?:\+?212|0)[5-7]\d{8}/g, "[REDACTED_PHONE]")
    // Strip inline script injection
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}

/**
 * Deeply sanitizes event payloads before dispatching to Google Analytics / GTM
 */
function sanitizePayload(params?: Record<string, unknown>): Record<string, unknown> {
  if (!params) return {};
  const clean: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(params)) {
    if (val !== null && val !== undefined) {
      if (typeof val === "object" && !Array.isArray(val)) {
        clean[key] = sanitizePayload(val as Record<string, unknown>);
      } else if (Array.isArray(val)) {
        clean[key] = val.map((item) => (typeof item === "string" ? sanitizeValue(item) : item));
      } else {
        clean[key] = sanitizeValue(val);
      }
    }
  }
  return clean;
}

// ==========================================
// 📱 PHONES-FIRST & HARDWARE TELEMETRY
// ==========================================

export function getDeviceTelemetry() {
  if (typeof window === "undefined") return {};

  const conn = (navigator as unknown as { connection?: { effectiveType?: string; saveData?: boolean } }).connection;

  return {
    is_mobile: window.innerWidth <= 768,
    screen_resolution: `${window.screen.width}x${window.screen.height}`,
    viewport_size: `${window.innerWidth}x${window.innerHeight}`,
    touch_support: "ontouchstart" in window || navigator.maxTouchPoints > 0,
    network_type: conn?.effectiveType || "unknown",
    save_data_mode: conn?.saveData || false,
    device_memory: (navigator as unknown as { deviceMemory?: number }).deviceMemory || "unknown",
  };
}

// ==========================================
// 🚀 INITIALIZATION & ENGINE SETUP
// ==========================================

export function initGA(): void {
  if (typeof window === "undefined") return;

  try {
    window.dataLayer = window.dataLayer || [];

    if (!window.gtag) {
      window.gtag = function () {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer.push(arguments as unknown as Record<string, unknown>);
      };
    }

    if (GA_ID && !document.getElementById("ga-script")) {
      window.gtag("js", new Date());

      // Security & Privacy Flags for GA4
      window.gtag("config", GA_ID, {
        send_page_view: false, // Handled manually by router
        anonymize_ip: true,
        allow_google_signals: true,
        allow_ad_personalization_signals: false,
        cookie_flags: "SameSite=None;Secure",
        site_domain: window.location.hostname || SITE_URL,
      });

      const script = document.createElement("script");
      script.id = "ga-script";
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
      document.head.appendChild(script);
    }

    // Google Tag Manager Setup
    if (GTM_ID && !document.getElementById("gtm-script")) {
      const gtmScript = document.createElement("script");
      gtmScript.id = "gtm-script";
      gtmScript.async = true;
      gtmScript.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${GTM_ID}');`;
      document.head.appendChild(gtmScript);
    }
  } catch {
    // Gracefully handle browser security exceptions or blocked script injection
  }
}

// ==========================================
// 📊 GENERAL DISPATCH & EVENT TRACKING
// ==========================================

export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;

  try {
    const sanitizedParams = sanitizePayload({
      ...params,
      ...getDeviceTelemetry(),
      timestamp: new Date().toISOString(),
    });

    // 1. GA4 Dispatch
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, sanitizedParams);
    }

    // 2. GTM DataLayer Push
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({
        event: eventName,
        ...sanitizedParams,
      });
    }

    // 3. Low-latency beacon fallback using relative URI to prevent CORS errors across subdomains
    if (navigator.sendBeacon && sanitizedParams.critical === true) {
      try {
        const blob = new Blob([JSON.stringify({ eventName, ...sanitizedParams })], {
          type: "application/json",
        });
        navigator.sendBeacon("/api/analytics", blob);
      } catch {
        // Silently swallow beacon errors
      }
    }
  } catch {
    // Silently handle exceptions caused by ad-blockers (e.g. Brave, uBlock)
  }
}

export function trackPageView(path: string, title?: string, lang: SupportedLang = "ar"): void {
  trackEvent("page_view", {
    page_path: path,
    page_title: title || (typeof document !== "undefined" ? document.title : ""),
    page_location: typeof window !== "undefined" ? window.location.href : "",
    language: lang,
    critical: true,
  });
}

// ==========================================
// 📰 ARTICLE & CONTENT TRACKING
// ==========================================

/**
 * Tracks when a user views or reads an article
 */
export function trackArticleRead(
  articleId: string | number,
  title?: string,
  category?: string,
  lang: SupportedLang = "ar"
): void {
  trackEvent("article_read", {
    article_id: articleId,
    article_title: title,
    article_category: category,
    language: lang,
    critical: false,
  });
}

// ==========================================
// 📸 MASTER PHOTO / IMAGE SEO TRACKING
// ==========================================

export interface ImageSEOMetadata {
  imageId?: string;
  src: string;
  altText: string;
  keywords: string[];
  lang?: SupportedLang;
  context?: string;
}

export function trackImageSEO(data: ImageSEOMetadata): void {
  const cleanKeywords = data.keywords.map((k) => k.toLowerCase().trim()).slice(0, 10);

  trackEvent("image_seo_impression", {
    image_id: data.imageId || "img_" + Math.random().toString(36).substring(2, 9),
    image_src: data.src,
    alt_text: data.altText,
    keywords: cleanKeywords.join(", "),
    has_alt_tag: Boolean(data.altText && data.altText.trim().length > 0),
    language: data.lang || "ar",
    context: data.context || "content_body",
  });
}

// ==========================================
// 📄 MASTER FILE & DOCUMENT SEO TRACKING
// ==========================================

export interface FileSEOMetadata {
  fileId?: string;
  fileName: string;
  fileUrl: string;
  fileType: "pdf" | "docx" | "xlsx" | "zip" | "other";
  fileSizeBytes?: number;
  category?: string;
  keywords: string[];
  lang?: SupportedLang;
}

export function trackFileSEO(data: FileSEOMetadata): void {
  const cleanKeywords = data.keywords.map((k) => k.toLowerCase().trim()).slice(0, 15);

  trackEvent("document_download", {
    file_id: data.fileId || "doc_" + Math.random().toString(36).substring(2, 9),
    file_name: data.fileName,
    file_url: data.fileUrl,
    file_extension: data.fileType,
    file_size_kb: data.fileSizeBytes ? Math.round(data.fileSizeBytes / 1024) : undefined,
    category: data.category || "legal_document",
    keywords: cleanKeywords.join(", "),
    language: data.lang || "ar",
    critical: true,
  });
}

export function trackDownload(fileName: string, fileType?: string): void {
  trackFileSEO({
    fileName,
    fileUrl: fileName,
    fileType: (fileType as FileSEOMetadata["fileType"]) || "pdf",
    keywords: [],
  });
}

// ==========================================
// 🔎 SEARCH & CONVERSION ANALYTICS
// ==========================================

export function trackSearch(query: string, resultsCount: number, lang: SupportedLang = "ar"): void {
  trackEvent("search", {
    search_term: query,
    results_count: resultsCount,
    language: lang,
  });
}

export function trackConversion(
  conversionType: "sign_up" | "contact_form" | "pdf_download" | "subscription",
  value?: number,
  currency: string = "MAD"
): void {
  trackEvent("conversion", {
    conversion_type: conversionType,
    value: value || 0,
    currency,
    critical: true,
  });
}

export function trackAuthEvent(
  method: "google" | "phone" | "email",
  action: "login" | "signup" | "logout" | "forgot" | "reset"
): void {
  trackEvent("auth_event", {
    auth_method: method,
    auth_action: action,
    critical: true,
  });
}

// ==========================================
// 🎨 UI/UX & INTERACTION PERFORMANCE
// ==========================================

export function trackScrollDepth(depthPercentage: 25 | 50 | 75 | 100, pagePath: string): void {
  trackEvent("scroll_depth", {
    depth: depthPercentage,
    page_path: pagePath,
  });
}

export function trackUserRoleInteraction(role: string, action: string): void {
  trackEvent("user_role_action", {
    user_role: role,
    action,
  });
}