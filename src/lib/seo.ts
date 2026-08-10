import { useEffect } from "react";

// ── ENVIRONMENT & DOMAIN CONFIGURATION ───────────────────────────────────────
export const SITE_URL = "https://www.mizan.page";

export const APP_URL = SITE_URL;

// ── 🌐 4-LANGUAGE SYSTEM TYPES (`ar`, `fr`, `en`, `es`) ──────────────────────
export type SupportedLang = "ar" | "fr" | "en" | "es";

export const LOCALE_MAP: Record<SupportedLang, string> = {
  ar: "ar_MA",
  fr: "fr_FR",
  en: "en_US",
  es: "es_ES",
};
const LANGUAGE_PREFIX = /^\/(ar|fr|en|es)(?=\/|$)/;

function normalizePath(path: string): string {
  const normalized = `/${path}`
    .replace(/\/+/g, "/")
    .replace(/\/+$/, "");

  return normalized || "/";
}

function getNeutralPath(path: string): string {
  return normalizePath(path).replace(LANGUAGE_PREFIX, "") || "/";
}

function buildLocalizedUrl(lang: SupportedLang, path: string): string {
  const neutralPath = getNeutralPath(path);
  return neutralPath === "/"
    ? `${SITE_URL}/${lang}`
    : `${SITE_URL}/${lang}${neutralPath}`;
}

function buildCanonicalUrl(
  value: string,
  lang: SupportedLang
): string {
  const repaired = value.trim().replace(/^\/+(?=https?:\/\/)/i, "");

  if (/^https?:\/\//i.test(repaired)) {
    try {
      const url = new URL(repaired);

      url.protocol = "https:";
      url.hostname = "www.mizan.page";
      url.port = "";
      url.pathname = normalizePath(url.pathname);

      return url.toString();
    } catch {
      return buildLocalizedUrl(lang, "/");
    }
  }

  return buildLocalizedUrl(lang, repaired);
}
// ── MASTER PHOTO SEO INTERFACE ───────────────────────────────────────────────
export interface SeoPhoto {
  url: string;
  alt?: string;
  width?: number | string;
  height?: number | string;
  mimeType?: string;
}

// ── MASTER FILE / DOCUMENT SEO INTERFACE ─────────────────────────────────────
export interface SeoFile {
  url: string;
  title?: string;
  description?: string;
  fileFormat?: string; // e.g., 'application/pdf'
  contentSizeBytes?: number | string;
  author?: string;
  datePublished?: string;
}

// ── SEO CONFIGURATION OPTIONS ────────────────────────────────────────────────
export interface SeoOptions {
  title?: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
  path?: string;
  ogImage?: string | SeoPhoto;
  type?: "website" | "article" | "profile" | "document";
  keywords?: string[] | string;
  lang?: SupportedLang;

  // Master Photo SEO
  photos?: SeoPhoto[];

  // Master File / PDF SEO
  file?: SeoFile;

  // Rich Content Meta
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;

  // Mobile / UI/UX
  themeColor?: string;

  // JSON-LD Structured Data
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

/**
 * 🛡️ MILITARY-GRADE SECURITY: Sanitizes strings before setting dynamic DOM attributes
 * to prevent XSS injection attacks in SEO meta elements.
 */
function sanitizeText(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * 🚀 REACT SEO HOOK - Google Master Engine
 */
export function useSeo(config: SeoOptions, deps: React.DependencyList = []) {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const previousTitle = document.title;
    const currentLang: SupportedLang = config.lang || "ar";

    // 1. 🌐 Language, Direction & Document Attributes
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === "ar" ? "rtl" : "ltr";
    setMetaTag("property", "og:locale", LOCALE_MAP[currentLang] || "ar_MA");

    // 2. 🛡️ Security & Google Crawler Directives
    setMetaTag("name", "referrer", "strict-origin-when-cross-origin");
    setMetaTag("http-equiv", "X-UA-Compatible", "IE=edge");

    // 3. 📱 Phone-First UI/UX & Mobile Optimization
    setMetaTag(
      "name",
      "viewport",
      "width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover"
    );
    setMetaTag("name", "mobile-web-app-capable", "yes");
    setMetaTag("name", "apple-mobile-web-app-capable", "yes");
    setMetaTag("name", "apple-mobile-web-app-status-bar-style", "black-translucent");
    setMetaTag("name", "format-detection", "telephone=no, address=no, email=no");
    setMetaTag("name", "theme-color", config.themeColor || "#0f172a");

    // 4. ⚡ Fast Performance Preconnects
    setupPerformancePreconnects();

    // 5. 🏷️ Title & Core Descriptions
    if (config.title) {
      const cleanTitle = sanitizeText(config.title);
      document.title = cleanTitle;
      setMetaTag("property", "og:title", cleanTitle);
      setMetaTag("name", "twitter:title", cleanTitle);
    }

    if (config.description) {
      const cleanDesc = sanitizeText(config.description);
      setMetaTag("name", "description", cleanDesc);
      setMetaTag("property", "og:description", cleanDesc);
      setMetaTag("name", "twitter:description", cleanDesc);
    }

    // 6. 🗝️ Master Keywords SEO
    if (config.keywords) {
      const keywordsArr = Array.isArray(config.keywords)
        ? config.keywords
        : config.keywords.split(",").map((k) => k.trim());
      const cleanKeywords = keywordsArr.map(sanitizeText).join(", ");
      setMetaTag("name", "keywords", cleanKeywords);
    }

    // 7. 🖼️ Master Photo SEO (Single & Multi-Photo Support)
    const primaryPhoto: SeoPhoto | undefined =
      typeof config.ogImage === "string"
        ? { url: config.ogImage }
        : config.ogImage || (config.photos && config.photos[0]);

    if (primaryPhoto?.url) {
      const fullImgUrl = primaryPhoto.url.startsWith("http")
        ? primaryPhoto.url
        : `${SITE_URL}${primaryPhoto.url.startsWith("/") ? "" : "/"}${primaryPhoto.url}`;

      setMetaTag("property", "og:image", fullImgUrl);
      setMetaTag("property", "og:image:secure_url", fullImgUrl);
      setMetaTag("name", "twitter:image", fullImgUrl);
      setMetaTag("name", "twitter:card", "summary_large_image");

      if (primaryPhoto.alt) {
        setMetaTag("property", "og:image:alt", sanitizeText(primaryPhoto.alt));
        setMetaTag("name", "twitter:image:alt", sanitizeText(primaryPhoto.alt));
      }
      if (primaryPhoto.width) {
        setMetaTag("property", "og:image:width", String(primaryPhoto.width));
      }
      if (primaryPhoto.height) {
        setMetaTag("property", "og:image:height", String(primaryPhoto.height));
      }
      if (primaryPhoto.mimeType) {
        setMetaTag("property", "og:image:type", primaryPhoto.mimeType);
      }
    }

    // 8. Canonical & 4-Language Hreflang System
    const rawPath = config.path || window.location.pathname;
    const targetUrl = buildCanonicalUrl(
      config.canonical || rawPath,
      currentLang
    );

    setLinkTag("canonical", targetUrl);
    setMetaTag("property", "og:url", targetUrl);

    setupHreflangTags(new URL(targetUrl).pathname);

    // 9. 🤖 Google Robots / Indexing Controls
    if (config.noindex) {
      setMetaTag("name", "robots", "noindex, nofollow, noarchive");
      setMetaTag("name", "googlebot", "noindex, nofollow");
    } else {
      setMetaTag(
        "name",
        "robots",
        "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
      );
      setMetaTag("name", "googlebot", "index, follow");
    }

    // 10. 📄 Master Article / Document Meta Tags
    setMetaTag("property", "og:type", config.type || "website");
    setMetaTag("property", "og:site_name", "Mizan Digital — ميزان الرقمية");

    if (config.author) {
      setMetaTag("name", "author", sanitizeText(config.author));
      setMetaTag("property", "article:author", sanitizeText(config.author));
    }
    if (config.publishedTime) {
      setMetaTag("property", "article:published_time", config.publishedTime);
    }
    if (config.modifiedTime) {
      setMetaTag("property", "article:modified_time", config.modifiedTime);
    }
    if (config.section) {
      setMetaTag("property", "article:section", sanitizeText(config.section));
    }

    // 11. 📜 Master JSON-LD Structured Data (Files, Articles, Site)
    const jsonLdPayload = buildJsonLdPayload(config, targetUrl, primaryPhoto);
    if (jsonLdPayload) {
      setJsonLd(jsonLdPayload);
    }

    // Teardown on unmount
    return () => {
      if (previousTitle) {
        document.title = previousTitle;
      }
      removeJsonLd();
    };
  }, [
    config.title,
    config.description,
    config.keywords,
    config.ogImage,
    config.canonical,
    config.path,
    config.noindex,
    config.type,
    config.lang,
    config.file,
    config.themeColor,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ...deps,
  ]);
}

// ── DOM HELPER UTILITIES ──────────────────────────────────────────────────────

function setMetaTag(
  attrName: "name" | "property" | "http-equiv",
  attrValue: string,
  content: string
) {
  let element = document.querySelector<HTMLMetaElement>(
    `meta[${attrName}="${attrValue}"]`
  );
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function setLinkTag(rel: string, href: string, hreflang?: string) {
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]`;

  let element = document.querySelector<HTMLLinkElement>(selector);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    if (hreflang) element.setAttribute("hreflang", hreflang);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

/**
 * Generates 4-Language hreflang tags for Google International SEO
 */
function setupHreflangTags(path: string) {
  const langs: SupportedLang[] = ["ar", "fr", "en", "es"];
  const neutralPath = getNeutralPath(path);

  langs.forEach((lang) => {
    setLinkTag(
      "alternate",
      buildLocalizedUrl(lang, neutralPath),
      lang
    );
  });

  setLinkTag(
    "alternate",
    buildLocalizedUrl("ar", neutralPath),
    "x-default"
  );
}

/**
 * Early DNS and Connection optimization
 */
function setupPerformancePreconnects() {
  const domains = [
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com",
    "https://zqfllvxtuxbwyazbvwqs.supabase.co", // Supabase domain
  ];

  domains.forEach((domain) => {
    setLinkTag("preconnect", domain);
    setLinkTag("dns-prefetch", domain);
  });
}

/**
 * Constructs structured JSON-LD data for Google Rich Results
 */
function buildJsonLdPayload(
  config: SeoOptions,
  currentUrl: string,
  photo?: SeoPhoto
): Record<string, unknown> | Array<Record<string, unknown>> | null {
  const schemas: Array<Record<string, unknown>> = [];

  // Manual JSON-LD injected by user
  if (config.jsonLd) {
    if (Array.isArray(config.jsonLd)) {
      schemas.push(...config.jsonLd);
    } else {
      schemas.push(config.jsonLd);
    }
  }

  // File / PDF SEO Schema
  if (config.file) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "DigitalDocument",
      name: config.file.title || config.title,
      description: config.file.description || config.description,
      url: config.file.url,
      encodingFormat: config.file.fileFormat || "application/pdf",
      fileSize: config.file.contentSizeBytes
        ? String(config.file.contentSizeBytes)
        : undefined,
      author: config.file.author
        ? { "@type": "Person", name: config.file.author }
        : undefined,
      datePublished: config.file.datePublished || config.publishedTime,
    });
  }

  // Article Schema
  if (config.type === "article") {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      mainEntityOfPage: { "@type": "WebPage", "@id": currentUrl },
      headline: config.title,
      description: config.description,
      image: photo?.url ? [photo.url] : undefined,
      datePublished: config.publishedTime,
      dateModified: config.modifiedTime || config.publishedTime,
      author: {
        "@type": "Person",
        name: config.author || "Mizan Digital Editor",
      },
      publisher: {
        "@type": "Organization",
        name: "Mizan Digital — ميزان الرقمية",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/Logo.svg`,
        },
      },
    });
  }

  if (schemas.length === 0) return null;
  return schemas.length === 1 ? schemas[0] : schemas;
}

/**
 * Safely inserts JSON-LD scripts avoiding inline script breaking (XSS defense)
 */
function setJsonLd(
  data: Record<string, unknown> | Array<Record<string, unknown>>
) {
  let script = document.querySelector<HTMLScriptElement>(
    'script[id="mizan-seo-jsonld"]'
  );
  if (!script) {
    script = document.createElement("script");
    script.setAttribute("type", "application/ld+json");
    script.setAttribute("id", "mizan-seo-jsonld");
    document.head.appendChild(script);
  }

  // Prevent script injection attacks inside JSON string
  const jsonString = JSON.stringify(data).replace(/</g, "\\u003c");
  script.textContent = jsonString;
}

function removeJsonLd() {
  const script = document.querySelector('script[id="mizan-seo-jsonld"]');
  if (script) {
    script.remove();
  }
}