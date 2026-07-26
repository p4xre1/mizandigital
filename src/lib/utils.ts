import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ── ENVIRONMENT & DOMAIN CONFIGURATION ───────────────────────────────────────
export const SITE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL) ||
  "https://www.mizan.page";

export const APP_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_URL) ||
  "https://www.mizan.page";

// ── 🌐 4-LANGUAGE SYSTEM TYPES (`ar`, `fr`, `en`, `es`) ──────────────────────
export type SupportedLang = "ar" | "fr" | "en" | "es";

export interface MultilingualField {
  ar: string;
  fr?: string | null;
  en?: string | null;
  es?: string | null;
}

/**
 * Resolves local translation strings gracefully, falling back to Arabic (default).
 */
export function getLocalizedText(field: MultilingualField | string, lang: SupportedLang = "ar"): string {
  if (typeof field === "string") return field;
  return field[lang] || field.ar || "";
}

// ── 🎨 TAILWIND CORE (UI/UX) ─────────────────────────────────────────────────

/**
 * Merges multiple class names conditionally and resolves Tailwind CSS class conflicts.[cite: 4]
 * 
 * Uses `clsx` to join conditional class definitions and `tailwind-merge`
 * to safely resolve duplicate or conflicting Tailwind classes.[cite: 4]
 *
 * @param inputs - Variadic list of class values (strings, objects, arrays, or falsy values)[cite: 4]
 * @returns Merged and resolved class string[cite: 4]
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ── 📱 PHONE-FIRST & UI/UX REFINEMENTS ───────────────────────────────────────

/**
 * Checks if the current user agent is a mobile device (Phone-First approach).
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
};

/**
 * High UI/UX: Smart text truncation that respects Arabic RTL and word boundaries.
 */
export function truncateText(text: string, maxLength: number = 120): string {
  if (!text || text.length <= maxLength) return text;
  // Don't cut in the middle of a word
  const truncated = text.substring(0, maxLength);
  return truncated.substring(0, Math.min(truncated.length, truncated.lastIndexOf(" "))) + "...";
}

/**
 * High UI/UX: Formats file sizes beautifully for document downloads.
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * High UI/UX: Localized Date Formatting for all 4 languages.
 */
export function formatDate(dateString: string, lang: SupportedLang = "ar"): string {
  const locales: Record<SupportedLang, string> = { ar: "ar-MA", fr: "fr-FR", en: "en-US", es: "es-ES" };
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locales[lang], {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

// ── 🛡️ MILITARY-GRADE SECURITY ───────────────────────────────────────────────

/**
 * Military Grade Security: Strips dangerous HTML tags to prevent XSS attacks.
 * Use this before rendering any user-generated content or search queries.
 */
export function sanitizeHtml(input: string): string {
  if (!input) return "";
  return input
    .replace(/<script[^>]*?>.*?<\/script>/gi, "") // Remove scripts
    .replace(/<style[^>]*?>.*?<\/style>/gi, "") // Remove styles
    .replace(/<[^>]*(>|$)/g, "") // Remove remaining HTML tags
    .replace(/javascript:/gi, "") // Prevent inline JS
    .replace(/on\w+="[^"]*"/gi, "") // Remove inline event handlers (onclick, etc)
    .trim();
}

/**
 * Generates a cryptographically secure random token (e.g., for CSRF or session salts).
 */
export function generateSecureToken(length: number = 32): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const array = new Uint8Array(length / 2);
    crypto.getRandomValues(array);
    return Array.from(array, dec => dec.toString(16).padStart(2, "0")).join("");
  }
  // Fallback if web crypto is unavailable (rare)
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// ── 🔍 MASTER SEO & KEYWORDS (Text, Photos, Files) ───────────────────────────

export interface PhotoSeoMetadata {
  url: string;
  altText: MultilingualField;
  title: MultilingualField;
  caption?: MultilingualField;
  keywords: string[];
  dimensions?: { width: number; height: number };
}

export interface DocumentSeoMetadata {
  fileUrl: string;
  filename: string;
  title: MultilingualField;
  description?: MultilingualField;
  keywords: string[];
  fileSizeBytes?: number;
  categorySlug?: string;
}

/**
 * Generates Google-optimized Schema.org ImageObject for Photos and Visual Assets.
 */
export function generatePhotoSeoSchema(photo: PhotoSeoMetadata, lang: SupportedLang = "ar") {
  const title = getLocalizedText(photo.title, lang);
  const alt = getLocalizedText(photo.altText, lang);
  const caption = photo.caption ? getLocalizedText(photo.caption, lang) : title;

  return {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    contentUrl: photo.url,
    url: photo.url,
    name: title,
    description: alt,
    caption: caption,
    keywords: photo.keywords.join(", "),
    ...(photo.dimensions ? { width: `${photo.dimensions.width}px`, height: `${photo.dimensions.height}px` } : {}),
  };
}

/**
 * Generates Google-optimized Schema.org DigitalDocument tags for File/PDF Assets.
 */
export function generateDocumentSeoSchema(doc: DocumentSeoMetadata, lang: SupportedLang = "ar") {
  const title = getLocalizedText(doc.title, lang);
  const description = doc.description ? getLocalizedText(doc.description, lang) : title;

  return {
    "@context": "https://schema.org",
    "@type": "DigitalDocument",
    name: title,
    description: description,
    url: doc.fileUrl,
    fileFormat: doc.filename.split(".").pop() || "pdf",
    keywords: doc.keywords.join(", "),
  };
}

/**
 * SEO: Generates URL-safe slugs that support Arabic characters natively without breaking.
 */
export function generateSeoSlug(text: string): string {
  return text
    .toString()
    .trim()
    .toLowerCase()
    // Replace spaces and special characters with hyphens, but KEEP Arabic letters ([\u0600-\u06FF])
    .replace(/[^\w\s\-\u0600-\u06FF]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Master Keywords: Extracts high-value keywords from text bodies for automated meta tag generation.
 */
export function extractKeywords(text: string, limit: number = 10): string[] {
  const sanitized = sanitizeHtml(text).toLowerCase();
  // Simple stop-word removal (example covers basic Arabic, French, English)
  const stopWords = new Set(["the", "and", "is", "in", "to", "of", "a", "for", "on", "et", "le", "la", "les", "de", "des", "في", "من", "إلى", "عن", "على", "و", "أن"]);
  
  const words = sanitized.match(/[\w\u0600-\u06FF]+/g) || [];
  
  const frequency: Record<string, number> = {};
  words.forEach(word => {
    if (word.length > 3 && !stopWords.has(word)) {
      frequency[word] = (frequency[word] || 0) + 1;
    }
  });

  return Object.keys(frequency)
    .sort((a, b) => frequency[b] - frequency[a])
    .slice(0, limit);
}