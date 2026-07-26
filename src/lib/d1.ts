/**
 * Mizan Digital - Enterprise Cloudflare D1 Edge Service & Analytics Engine
 * Path: /workspaces/mizandigital/src/lib/d1.ts
 * 
 * Features:
 * - 📱 Phones-First & Low-Bandwidth Optimizations (Cache-First, Abort Timeouts, Mobile Offloading)
 * - 🛡️ Military-Grade Security & Sanitization (XSS Stripping, PII Redaction, Input Scrubbing, Token Defense)
 * - 🔍 Master SEO & Keyword Extraction (Articles, Media/Images, PDF/Documents)
 * - 🌐 4-Language Localization Support (Arabic [AR], French [FR], English [EN], Spanish [ES])
 * - 📊 Complete Google Ecosystem Integration (GA4, GTM, AdSense Telemetry, Conversions Tracking)
 * - ⚡ Cloudflare D1 Edge Distributed SQL Query Engine with In-Memory Caching
 */

import {
  trackPageView,
  trackSearch,
  trackImageSEO,
  trackFileSEO,
  trackConversion,
  getDeviceTelemetry,
  type SupportedLang,
} from "@/lib/analytics";

// Export Supported Languages
export type { SupportedLang };

// Site Canonical Base URLs
export const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string | undefined) ||
  (import.meta.env.VITE_APP_URL as string | undefined) ||
  "https://www.mizan.page";

const D1_API = (import.meta.env.VITE_D1_API_URL as string | undefined)?.replace(/\/$/, "");

// ==========================================
// 📐 ARCHITECTURE TYPES & SCHEMAS
// ==========================================

export interface D1ImageSEO {
  id: string;
  url: string;
  altText: Record<SupportedLang, string> | string;
  keywords: string[];
  width?: number;
  height?: number;
  format?: "webp" | "avif" | "png" | "jpg" | "svg";
  fileSizeBytes?: number;
}

export interface D1FileSEO {
  id: string;
  title: Record<SupportedLang, string> | string;
  fileUrl: string;
  mimeType: string;
  fileSizeBytes?: number;
  category?: string;
  keywords: string[];
  downloadCount?: number;
}

export interface D1TrendingArticle {
  id: string;
  title: string;
  titleFr?: string;
  titleEn?: string;
  titleEs?: string;
  views: number;
  slug: string;
  excerpt?: string;
  coverImage?: D1ImageSEO;
  pdfDocument?: D1FileSEO;
  category?: string;
  updatedAt?: string;
}

export interface D1SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category?: string;
  keywords?: string[];
  matchScore?: number;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// In-memory TTL Cache for mobile latency minimization
const memoryD1Cache = new Map<string, CacheEntry<any>>();

// ==========================================
// 🛡️ MILITARY-GRADE SECURITY & SANITIZERS
// ==========================================

/**
 * Strips dangerous XSS vectors, scripts, and unsafe HTML tags
 */
export function sanitizeXSS(input: string): string {
  if (!input) return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .replace(/javascript:[^\s"']+/gi, "");
}

/**
 * Masks personally identifiable information (PII) before cloud telemetry
 */
export function maskPII(text: string): string {
  if (typeof text !== "string") return "";
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[REDACTED_EMAIL]")
    .replace(/(?:\+?212|0)[5-7]\d{8}/g, "[REDACTED_PHONE]")
    .replace(/(bearer|token|auth|key|secret|password)=([^\s&]+)/gi, "$1=[REDACTED]");
}

/**
 * Cleans search query inputs against SQLi and malicious syntax
 */
export function sanitizeQuery(query: string): string {
  if (!query) return "";
  return sanitizeXSS(query).replace(/['";\--\/\*]/g, "").trim();
}

/**
 * Maps arbitrary MIME types to strictly typed FileSEOMetadata file types
 */
function resolveFileType(mimeType: string): "pdf" | "docx" | "xlsx" | "zip" | "other" {
  const mime = mimeType.toLowerCase();
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("word") || mime.includes("docx")) return "docx";
  if (mime.includes("excel") || mime.includes("spreadsheet") || mime.includes("xlsx")) return "xlsx";
  if (mime.includes("zip") || mime.includes("compressed") || mime.includes("archive")) return "zip";
  return "other";
}

// ==========================================
// 🚀 SEO KEYWORD & JSON-LD ENGINE
// ==========================================

/**
 * Dynamic Keyword Extraction engine with multi-language stopword awareness
 */
export function extractKeywordsFromText(
  text: string,
  lang: SupportedLang = "ar",
  maxKeywords = 10
): string[] {
  const clean = sanitizeXSS(text).toLowerCase();

  const stopWordsMap: Record<SupportedLang, Set<string>> = {
    ar: new Set(["في", "من", "على", "إلى", "عن", "مع", "هذا", "التي", "الذي", "أن", "كان", "أو", "قانون", "المغرب"]),
    fr: new Set(["dans", "sur", "avec", "pour", "dans", "cette", "avec", "plus", "est", "des", "les", "une", "droit"]),
    en: new Set(["this", "that", "with", "from", "for", "have", "with", "about", "your", "they", "law", "right"]),
    es: new Set(["este", "esta", "para", "como", "sobre", "con", "donde", "tiene", "entre", "derecho"]),
  };

  const stopwords = stopWordsMap[lang] || stopWordsMap.ar;

  const rawWords = clean
    .replace(/[^\w\s\u0600-\u06FF]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopwords.has(w));

  return Array.from(new Set(rawWords)).slice(0, maxKeywords);
}

/**
 * Generates Structured JSON-LD for Cloudflare D1 Articles
 */
export function generateD1ArticleJSONLD(
  article: D1TrendingArticle,
  lang: SupportedLang = "ar"
): string {
  const canonicalUrl = `${SITE_URL}/${lang}/article/${article.slug}`;
  const title =
    lang === "fr" && article.titleFr
      ? article.titleFr
      : lang === "en" && article.titleEn
      ? article.titleEn
      : lang === "es" && article.titleEs
      ? article.titleEs
      : article.title;

  const keywords = extractKeywordsFromText(`${title} ${article.excerpt || ""}`, lang);

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    "headline": title,
    "description": article.excerpt || title,
    "image": article.coverImage?.url ? [article.coverImage.url] : [`${SITE_URL}/Logo.svg`],
    "dateModified": article.updatedAt || new Date().toISOString(),
    "inLanguage": lang,
    "keywords": keywords.join(", "),
    "publisher": {
      "@type": "Organization",
      "name": "Mizan Digital",
      "logo": {
        "@type": "ImageObject",
        "url": `${SITE_URL}/Logo.svg`,
      },
    },
  };

  return JSON.stringify(schema);
}

// ==========================================
// ⚡ CLOUDFLARE D1 FETCH CLIENT
// ==========================================

interface FetchOptions extends RequestInit {
  cacheTtlMs?: number;
  timeoutMs?: number;
}

/**
 * Core D1 Fetch wrapper with network timeout, local TTL cache, and security handling
 */
async function d1Fetch<T>(endpoint: string, options?: FetchOptions): Promise<T> {
  const cacheKey = `${endpoint}_${JSON.stringify(options?.body || {})}`;
  const cacheTtl = options?.cacheTtlMs ?? 180000; // Default 3 mins cache for mobile optimization

  // 1. Check Mobile In-Memory Cache
  if (memoryD1Cache.has(cacheKey)) {
    const cached = memoryD1Cache.get(cacheKey)!;
    if (Date.now() < cached.expiresAt) {
      return cached.data as T;
    }
    memoryD1Cache.delete(cacheKey);
  }

  // 2. Validate API Availability
  if (!D1_API) {
    console.warn("VITE_D1_API_URL is not set. D1 database features are running in fallback mode.");
    throw new Error("VITE_D1_API_URL is not configured.");
  }

  const url = `${D1_API}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const timeoutMs = options?.timeoutMs ?? 6000; // Fast 6s timeout for mobile connections

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Client-Platform": "MizanDigital-Web",
        ...options?.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unknown D1 Error");
      throw new Error(`D1 API Error [${res.status}]: ${maskPII(errorText)}`);
    }

    const data = (await res.json()) as T;

    // Save to cache for phone bandwidth saving
    if (cacheTtl > 0) {
      memoryD1Cache.set(cacheKey, {
        data,
        expiresAt: Date.now() + cacheTtl,
      });
    }

    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      console.warn(`D1 Request timed out after ${timeoutMs}ms: ${endpoint}`);
    } else {
      console.error(`D1 Request Failed for ${endpoint}:`, maskPII(error?.message || ""));
    }
    throw error;
  }
}

// ==========================================
// 📊 CORE EXPORTED D1 & GOOGLE TELEMETRY API
// ==========================================

/**
 * Fetch trending legal articles from Cloudflare D1 with language translation & GA4 sync
 */
export async function getTrendingFromD1(
  limit = 10,
  lang: SupportedLang = "ar"
): Promise<D1TrendingArticle[]> {
  try {
    const data = await d1Fetch<D1TrendingArticle[]>(
      `/trending?limit=${limit}&lang=${lang}`,
      { cacheTtlMs: 300000 } // 5 minutes cache
    );

    if (Array.isArray(data)) {
      return data.map((item) => ({
        ...item,
        title: sanitizeXSS(
          lang === "fr" && item.titleFr
            ? item.titleFr
            : lang === "en" && item.titleEn
            ? item.titleEn
            : lang === "es" && item.titleEs
            ? item.titleEs
            : item.title
        ),
        excerpt: item.excerpt ? sanitizeXSS(item.excerpt) : undefined,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Logs page view to Cloudflare D1 database & Google Analytics / Tag Manager
 */
export async function logPageViewToD1(
  path: string,
  referrer?: string,
  lang: SupportedLang = "ar"
): Promise<{ success: boolean }> {
  const sanitizedPath = sanitizeXSS(path);
  const sanitizedReferrer = sanitizeXSS(
    referrer || (typeof document !== "undefined" ? document.referrer : "")
  );

  // Trigger GA4 & GTM telemetry
  trackPageView(sanitizedPath, `D1 Path: ${sanitizedPath}`, lang);

  try {
    return await d1Fetch<{ success: boolean }>("/analytics/pageview", {
      method: "POST",
      cacheTtlMs: 0,
      body: JSON.stringify({
        path: sanitizedPath,
        referrer: sanitizedReferrer,
        lang,
        ts: Date.now(),
        telemetry: getDeviceTelemetry(),
      }),
    });
  } catch {
    // Non-blocking background telemetry
    return { success: false };
  }
}

/**
 * Performs cached legal search query on D1 Edge with Search Console / GA4 Keyword Tracking
 */
export async function searchD1(
  query: string,
  lang: SupportedLang = "ar"
): Promise<D1SearchResult[]> {
  const cleanQ = sanitizeQuery(query);
  if (!cleanQ) return [];

  try {
    const results = await d1Fetch<D1SearchResult[]>(
      `/search?q=${encodeURIComponent(cleanQ)}&lang=${lang}`,
      { cacheTtlMs: 120000 }
    );

    const sanitizedResults = Array.isArray(results)
      ? results.map((res) => ({
          ...res,
          title: sanitizeXSS(res.title),
          excerpt: sanitizeXSS(res.excerpt),
        }))
      : [];

    // 📊 Track search term in Google Analytics and Tag Manager
    trackSearch(cleanQ, sanitizedResults.length, lang);

    return sanitizedResults;
  } catch {
    return [];
  }
}

/**
 * Tracks Master Image SEO & Media Impressions on Cloudflare D1
 */
export async function trackD1ImageImpression(
  image: D1ImageSEO,
  lang: SupportedLang = "ar"
): Promise<void> {
  if (!image || !image.url) return;

  const alt =
    typeof image.altText === "object"
      ? image.altText[lang] || image.altText.ar
      : image.altText;

  trackImageSEO({
    imageId: image.id,
    src: image.url,
    altText: sanitizeXSS(alt || ""),
    keywords: image.keywords || [],
    lang,
    context: "d1_media_gallery",
  });

  try {
    await d1Fetch("/analytics/media-impression", {
      method: "POST",
      cacheTtlMs: 0,
      body: JSON.stringify({
        imageId: image.id,
        url: image.url,
        lang,
        ts: Date.now(),
      }),
    });
  } catch {
    // Non-blocking telemetry
  }
}

/**
 * Tracks Master File / PDF Document Downloads with Google AdSense/GA4 Conversions
 */
export async function trackD1FileDownload(
  file: D1FileSEO,
  lang: SupportedLang = "ar"
): Promise<void> {
  if (!file || !file.fileUrl) return;

  const title =
    typeof file.title === "object"
      ? file.title[lang] || file.title.ar
      : file.title;

  // 1. Send Google Analytics & File SEO Telemetry with resolved file type
  trackFileSEO({
    fileId: file.id,
    fileName: sanitizeXSS(title),
    fileUrl: file.fileUrl,
    fileType: resolveFileType(file.mimeType),
    fileSizeBytes: file.fileSizeBytes,
    category: file.category || "d1_library",
    keywords: file.keywords || [],
    lang,
  });

  // 2. Track Ads & Revenue Conversion Event with valid event name
  trackConversion("pdf_download", 15, "MAD");

  // 3. Log download hit to D1
  try {
    await d1Fetch("/analytics/file-download", {
      method: "POST",
      cacheTtlMs: 0,
      body: JSON.stringify({
        fileId: file.id,
        fileUrl: file.fileUrl,
        lang,
        ts: Date.now(),
      }),
    });
  } catch {
    // Silent background fallback
  }
}

export { d1Fetch };