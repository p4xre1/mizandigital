import { supabase } from "./supabase";

// ── 🌐 DOMAIN & ENVIRONMENT CONFIGURATION ────────────────────────────────────
export const SITE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_URL) ||
  "https://www.mizan.page";

export const APP_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_URL) ||
  "https://www.mizan.page";

// ── 🌍 4-LANGUAGE MULTILINGUAL SYSTEM TYPES (`ar`, `fr`, `en`, `es`) ─────────
export type SupportedLang = "ar" | "fr" | "en" | "es";

export const SUPPORTED_LANGUAGES: SupportedLang[] = ["ar", "fr", "en", "es"];

export const LANG_DIR_MAP: Record<SupportedLang, "rtl" | "ltr"> = {
  ar: "rtl",
  fr: "ltr",
  en: "ltr",
  es: "ltr",
};

// ── 🔑 SECURITY ROLE & RBAC DEFINITIONS ──────────────────────────────────────
export type Role =
  | "root"
  | "security_admin"
  | "admin"
  | "marketer"
  | "writer"
  | "member"
  | "guest";

export const VALID_ROLES = new Set<Role>([
  "root",
  "security_admin",
  "admin",
  "marketer",
  "writer",
  "member",
  "guest",
]);

export const STAFF_ROLES = new Set<Role>([
  "root",
  "security_admin",
  "admin",
  "marketer",
  "writer",
]);

export const ADMIN_ROLES = new Set<Role>([
  "root",
  "security_admin",
  "admin",
]);

/** Check if a given role string is a valid system role */
export function isValidRole(role: string | null | undefined): role is Role {
  if (!role) return false;
  return VALID_ROLES.has(role as Role);
}

/** Check if a role belongs to staff */
export function isStaffRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return STAFF_ROLES.has(role as Role);
}

/** Check if a role belongs to guest */
export function isGuestRole(role: string | null | undefined): boolean {
  return !role || role === "guest";
}

// ── 🛡️ MILITARY-GRADE INPUT HARDENING & SANITIZATION ─────────────────────────

/** Strip control characters, collapse whitespace, trim, and cap maximum length. */
export function sanitizeText(input: string, maxLen = 2000): string {
  if (!input) return "";
  return input
    // Remove NUL + C0/C1 control chars (preserve newlines \n & tabs \t)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
    .slice(0, maxLen);
}

/** Escape HTML-significant characters for prevention of XSS attacks. */
export function escapeHtml(input: string): string {
  if (!input) return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Sanitize PostgREST / Supabase filter strings to block filter manipulation attacks */
export function sanitizePgFilter(input: string, maxLen = 100): string {
  return sanitizeText(input, maxLen)
    .replace(/[,()".*%\\]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** RFC-5322-lite email validation with length bounds to prevent ReDoS */
export function isValidEmail(email: string): boolean {
  const e = email.trim();
  if (e.length < 3 || e.length > 254) return false;
  return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(e);
}

/** Phone-first UI phone number validator (supports international formats) */
export function isValidPhone(phone: string): boolean {
  const p = phone.trim();
  if (p.length < 7 || p.length > 20) return false;
  return /^\+?[0-9\s\-()]{7,20}$/.test(p);
}

// ── 🖼️ MASTER PHOTO & FILE SEO SECURITY SANITIZERS ───────────────────────────

export interface SafeSeoPhoto {
  url: string;
  alt: string;
  title?: string;
  width?: number;
  height?: number;
}

export interface SafeSeoFile {
  url: string;
  title: string;
  description?: string;
  fileFormat: string;
  contentSizeBytes?: number;
}

const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "svg", "avif"]);
const ALLOWED_DOCUMENT_EXTENSIONS = new Set(["pdf", "doc", "docx", "epub", "txt"]);

/** Validates whether an image URL is safe and points to a supported image type */
export function isValidImageUrl(url: string): boolean {
  const safe = safeUrl(url, true);
  if (!safe) return false;
  
  if (safe.startsWith("data:image/")) {
    return /^data:image\/(png|jpeg|webp|gif|svg\+xml|avif);base64,/i.test(safe);
  }

  try {
    const parsed = new URL(safe, SITE_URL);
    const ext = parsed.pathname.split(".").pop()?.toLowerCase();
    return ext ? ALLOWED_IMAGE_EXTENSIONS.has(ext) || parsed.pathname.startsWith("/storage/") : true;
  } catch {
    return false;
  }
}

/** Validates whether a file/document URL is safe and supported */
export function isValidFileFormat(url: string, extension?: string): boolean {
  const safe = safeUrl(url, true);
  if (!safe) return false;

  const ext = (extension || url.split(".").pop() || "").toLowerCase();
  return ALLOWED_DOCUMENT_EXTENSIONS.has(ext) || ext === "pdf";
}

/** Sanitizes Photo SEO payload before injecting into metadata */
export function sanitizeSeoPhoto(photo: Partial<SafeSeoPhoto>): SafeSeoPhoto | null {
  if (!photo.url) return null;
  const cleanUrl = safeUrl(photo.url, true);
  if (!cleanUrl) return null;

  return {
    url: cleanUrl,
    alt: escapeHtml(sanitizeText(photo.alt || "", 150)),
    title: photo.title ? escapeHtml(sanitizeText(photo.title, 150)) : undefined,
    width: typeof photo.width === "number" && photo.width > 0 ? photo.width : undefined,
    height: typeof photo.height === "number" && photo.height > 0 ? photo.height : undefined,
  };
}

/** Sanitizes File/Document SEO payload for secure structured data indexing */
export function sanitizeSeoFile(file: Partial<SafeSeoFile>): SafeSeoFile | null {
  if (!file.url || !file.title) return null;
  const cleanUrl = safeUrl(file.url, true);
  if (!cleanUrl) return null;

  return {
    url: cleanUrl,
    title: escapeHtml(sanitizeText(file.title, 200)),
    description: file.description ? escapeHtml(sanitizeText(file.description, 500)) : undefined,
    fileFormat: sanitizeText(file.fileFormat || "application/pdf", 50),
    contentSizeBytes: typeof file.contentSizeBytes === "number" ? file.contentSizeBytes : undefined,
  };
}

// ── 🛑 PIRACY PREVENTION & PROTECTED UI CONTROLS ────────────────────────────

export function isCopyShortcut(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c";
}

export function isPrintScreenShortcut(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase();
  return (
    key === "printscreen" ||
    key === "print" ||
    ((event.ctrlKey || event.metaKey) && event.shiftKey && ["4", "5", "s"].includes(key))
  );
}

export function isGuestPiracyKey(event: KeyboardEvent): boolean {
  return isCopyShortcut(event) || isPrintScreenShortcut(event);
}

export function findProtectedToolElement(target: EventTarget | null): HTMLElement | null {
  let element = target instanceof HTMLElement ? target : null;
  while (element) {
    if (element.dataset?.protectedTool === "true") return element;
    element = element.parentElement;
  }
  return null;
}

// ── 🤖 GOOGLE BOT & CRAWLER SECURITY VERIFICATION ───────────────────────────

const BOT_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /bravechromium/i,
  /chatgpt-user/i,
  /claudebot/i,
  /perplexitybot/i,
  /google-extended/i,
  /applebot/i,
  /slurp/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /pinterest/i,
  /archive\.org_bot/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /sogou/i,
  /petalbot/i,
  /chatgpt/i,
  /openai/i,
  /gptbot/i,
  /huggingface/i,
];

export function isAllowedSeoCrawler(
  userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""
): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_PATTERNS.some((re) => re.test(ua));
}

export function isSearchEngineBot(
  userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""
): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  if (typeof navigator !== "undefined") {
    if ((navigator as any).webdriver) return true;
    const brands = (navigator as any).userAgentData?.brands;
    if (
      Array.isArray(brands) &&
      brands.some((entry: any) => /bot|crawler|spider/i.test(String(entry.brand)))
    ) {
      return true;
    }
  }
  return isAllowedSeoCrawler(ua) || /\b(bot|crawl|spider|archiver|scanner|fetcher|preview)\b/i.test(ua);
}

// ── 🧹 RICH-TEXT HTML SANITIZER (MILITARY GRADE) ──────────────────────────────

const ALLOWED_TAGS = new Set([
  "P", "BR", "HR", "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "SUB", "SUP",
  "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "UL", "OL", "LI",
  "A", "IMG", "IFRAME", "FIGURE", "FIGCAPTION", "SPAN", "DIV", "FONT",
  "PRE", "CODE", "MARK",
]);

const ALLOWED_ATTR: Record<string, string[]> = {
  A: ["href", "target", "rel"],
  IMG: ["src", "alt", "title", "width", "height", "loading"],
  IFRAME: ["src", "width", "height", "allow", "allowfullscreen", "frameborder", "title"],
  FONT: ["face", "color", "size"],
};

const GLOBAL_ATTR = ["style", "class", "dir", "lang"];

const ALLOWED_STYLE = new Set([
  "color", "background-color", "font-family", "font-size", "font-weight",
  "font-style", "text-align", "text-decoration", "line-height", "letter-spacing",
  "max-width", "width", "height",
]);

const ALLOWED_IFRAME_HOSTS = [
  "www.youtube.com", "youtube.com", "www.youtube-nocookie.com",
  "player.vimeo.com", "www.dailymotion.com",
];

export function safeUrl(url: string, allowRelative = true): string | null {
  const v = url.trim();
  // Neutralize obfuscated javascript/data/vbscript scheme attacks
  if (/^\s*(javascript|data|vbscript):/i.test(v)) {
    if (!/^\s*data:image\/(png|jpeg|webp|gif|svg\+xml|avif);base64,/i.test(v)) return null;
  }
  if (/^(https?:)?\/\//i.test(v) || /^mailto:/i.test(v) || /^tel:/i.test(v)) return v;
  if (/^data:image\/(png|jpeg|webp|gif|svg\+xml|avif);base64,/i.test(v)) return v;
  if (allowRelative && /^[/#]/.test(v)) return v;
  return null;
}

function sanitizeStyle(style: string): string {
  return style
    .split(";")
    .map((rule) => {
      const [propRaw, ...valParts] = rule.split(":");
      const prop = propRaw.trim().toLowerCase();
      const val = valParts.join(":").trim();
      if (!prop || !val) return "";
      if (!ALLOWED_STYLE.has(prop)) return "";
      if (/expression|url\s*\(|javascript:/i.test(val)) return "";
      return `${prop}: ${val}`;
    })
    .filter(Boolean)
    .join("; ");
}

function cleanNode(el: Element) {
  const tag = el.tagName.toUpperCase();

  if (!ALLOWED_TAGS.has(tag)) {
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "LINK" || tag === "META") {
      el.remove();
    } else {
      el.replaceWith(...Array.from(el.childNodes));
    }
    return;
  }

  const allowed = new Set([...(ALLOWED_ATTR[tag] || []), ...GLOBAL_ATTR]);
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    if (name.startsWith("on") || !allowed.has(name)) {
      el.removeAttribute(attr.name);
      continue;
    }
    if (name === "style") {
      const cleaned = sanitizeStyle(attr.value);
      if (cleaned) el.setAttribute("style", cleaned);
      else el.removeAttribute("style");
    }
    if (name === "href" || name === "src") {
      const ok = safeUrl(attr.value, name === "href");
      if (!ok) {
        el.remove();
        return;
      }
      el.setAttribute(name, ok);
    }
  }

  if (tag === "IFRAME") {
    try {
      const host = new URL(el.getAttribute("src") || "", window.location.origin).hostname;
      if (!ALLOWED_IFRAME_HOSTS.includes(host)) {
        el.remove();
        return;
      }
      el.setAttribute("allowfullscreen", "");
    } catch {
      el.remove();
      return;
    }
  }

  if (tag === "A") {
    el.setAttribute("rel", "noopener noreferrer nofollow");
    if (el.getAttribute("target") !== "_blank") {
      el.removeAttribute("target");
    }
  }

  if (tag === "IMG") {
    el.setAttribute("loading", "lazy");
  }

  Array.from(el.children).forEach(cleanNode);
}

export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined" || !html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  Array.from(doc.body.children).forEach(cleanNode);
  return doc.body.innerHTML;
}

export function toEmbedUrl(url: string): string | null {
  const v = url.trim();
  let m: RegExpMatchArray | null;
  if ((m = v.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/)))
    return `https://www.youtube-nocookie.com/embed/${m[1]}`;
  if ((m = v.match(/vimeo\.com\/(?:video\/)?(\d+)/)))
    return `https://player.vimeo.com/video/${m[1]}`;
  if ((m = v.match(/dailymotion\.com\/video\/([\w]+)/)))
    return `https://www.dailymotion.com/embed/video/${m[1]}`;
  return null;
}

// ── 🚨 ANTI-SPAM & RATE LIMITING CONTROLS ─────────────────────────────────────

const SPAM_PATTERNS: RegExp[] = [
  /\b(viagra|cialis|casino|porn|crypto\s?airdrop|forex\s?signals)\b/i,
  /\b(seo\s?services|backlinks|guest\s?post)\b/i,
  /\[url=|\[link=|<a\s+href=/i,
];

export function looksLikeSpam(text: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  if (SPAM_PATTERNS.some((re) => re.test(t))) return true;
  const links = (t.match(/https?:\/\//g) || []).length;
  if (links >= 3) return true;
  if (/(.)\1{20,}/.test(t)) return true;
  return false;
}

export function throttle(key: string, minIntervalMs = 30_000): number {
  const storageKey = `mizan_rl_${key}`;
  try {
    const last = Number(localStorage.getItem(storageKey) || 0);
    const elapsed = Date.now() - last;
    if (elapsed < minIntervalMs) {
      return Math.ceil((minIntervalMs - elapsed) / 1000);
    }
    localStorage.setItem(storageKey, String(Date.now()));
    return 0;
  } catch {
    return 0;
  }
}

// ── 🔒 STRICT SESSION & AUTHENTICATION VERIFICATION ───────────────────────────

export async function requireVerifiedEmail() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    throw new Error("UNAUTHORIZED");
  }

  const user = session.user;

  if (!user.email_confirmed_at) {
    await supabase.auth.signOut();
    throw new Error("UNVERIFIED_EMAIL");
  }

  return user;
}