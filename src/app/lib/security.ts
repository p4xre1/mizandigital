// ── Client-side input hardening: anti-injection + anti-spam ─────────────────────
// NOTE: client-side checks are a first line of defence for UX only. The
// authoritative enforcement MUST live in the database (RLS policies, CHECK
// constraints) and/or an edge function. Never trust the browser.

/** Strip control chars, collapse whitespace, trim, and hard-cap length. */
export function sanitizeText(input: string, maxLen = 2000): string {
  return input
    // remove NUL + C0/C1 control chars (keep \n \t) — blocks header/log injection
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
    .slice(0, maxLen);
}

/** Escape the 5 HTML-significant chars. Use before rendering ANY untrusted
 *  string via a raw-HTML sink. (React JSX children already do this for you.) */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** RFC-5322-lite email validation (length-bounded to avoid ReDoS). */
export function isValidEmail(email: string): boolean {
  const e = email.trim();
  if (e.length < 3 || e.length > 254) return false;
  return /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(e);
}

/**
 * Neutralise a value used inside a PostgREST `.or()` / `.ilike()` filter.
 * PostgREST treats , ( ) . * and " as structural — a raw user string could
 * otherwise inject extra filter conditions (e.g. `,is_admin.eq.true`).
 * We drop the structural characters and the SQL LIKE wildcards.
 */
export function isGuestRole(role: string | null | undefined): boolean {
  return role === "guest";
}

export function isCopyShortcut(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c";
}

export function isPrintScreenShortcut(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase();
  return key === "printscreen" || key === "print" || ((event.ctrlKey || event.metaKey) && event.shiftKey && ["4", "5", "s"].includes(key));
}

export function isGuestPiracyKey(event: KeyboardEvent): boolean {
  return isCopyShortcut(event) || isPrintScreenShortcut(event);
}

const BOT_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /bravechromium/i,
  /chatgpt-user/i,
  /claudebot/i,
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

export function isAllowedSeoCrawler(userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_PATTERNS.some((re) => re.test(ua));
}

export function isSearchEngineBot(userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  if (typeof navigator !== "undefined") {
    if ((navigator as any).webdriver) return true;
    const brands = (navigator as any).userAgentData?.brands;
    if (Array.isArray(brands) && brands.some((entry: any) => /bot|crawler|spider/i.test(String(entry.brand)))) {
      return true;
    }
  }
  return isAllowedSeoCrawler(ua) || /\b(bot|crawl|spider|archiver|scanner|fetcher|preview)\b/i.test(ua);
}

export function findProtectedToolElement(target: EventTarget | null): HTMLElement | null {
  let element = target instanceof HTMLElement ? target : null;
  while (element) {
    if (element.dataset?.protectedTool === "true") return element;
    element = element.parentElement;
  }
  return null;
}

/**
 * Neutralise a value used inside a PostgREST `.or()` / `.ilike()` filter.
 * PostgREST treats , ( ) . * and " as structural — a raw user string could
 * otherwise inject extra filter conditions (e.g. `,is_admin.eq.true`).
 * We drop the structural characters and the SQL LIKE wildcards.
 */
export function sanitizePgFilter(input: string, maxLen = 100): string {
  return sanitizeText(input, maxLen)
    .replace(/[,()".*%\\]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ── Rich-text HTML sanitiser ────────────────────────────────────────────────────
// Admin-authored article bodies are stored as HTML. Even though authors are
// trusted, we sanitise on the way IN and render the sanitised result — this
// blocks stored-XSS if an account is compromised and keeps the markup to a
// known-good allowlist. Runs in the browser via DOMParser.

const ALLOWED_TAGS = new Set([
  "P", "BR", "HR", "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "SUB", "SUP",
  "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "UL", "OL", "LI",
  "A", "IMG", "IFRAME", "FIGURE", "FIGCAPTION", "SPAN", "DIV", "FONT",
  "PRE", "CODE", "MARK",
]);

const ALLOWED_ATTR: Record<string, string[]> = {
  A: ["href", "target", "rel"],
  IMG: ["src", "alt", "title", "width", "height"],
  IFRAME: ["src", "width", "height", "allow", "allowfullscreen", "frameborder", "title"],
  FONT: ["face", "color", "size"],
};
const GLOBAL_ATTR = ["style", "class", "dir"];

const ALLOWED_STYLE = new Set([
  "color", "background-color", "font-family", "font-size", "font-weight",
  "font-style", "text-align", "text-decoration", "line-height", "letter-spacing",
]);

// Only allow <iframe> embeds from these video hosts.
const ALLOWED_IFRAME_HOSTS = [
  "www.youtube.com", "youtube.com", "www.youtube-nocookie.com",
  "player.vimeo.com", "www.dailymotion.com",
];

function safeUrl(url: string, allowRelative = true): string | null {
  const v = url.trim();
  if (/^\s*javascript:/i.test(v) || /^\s*data:(?!image\/)/i.test(v) || /^\s*vbscript:/i.test(v)) return null;
  if (/^(https?:)?\/\//i.test(v) || /^mailto:/i.test(v)) return v;
  if (/^data:image\//i.test(v)) return v;
  if (allowRelative && /^[/#]/.test(v)) return v;
  return null;
}

function sanitizeStyle(style: string): string {
  return style.split(";").map(rule => {
    const [propRaw, ...valParts] = rule.split(":");
    const prop = propRaw.trim().toLowerCase();
    const val = valParts.join(":").trim();
    if (!prop || !val) return "";
    if (!ALLOWED_STYLE.has(prop)) return "";
    if (/expression|url\s*\(|javascript:/i.test(val)) return "";
    return `${prop}: ${val}`;
  }).filter(Boolean).join("; ");
}

function cleanNode(el: Element) {
  const tag = el.tagName.toUpperCase();
  if (!ALLOWED_TAGS.has(tag)) {
    // Unwrap unknown elements (keep their text/children), drop dangerous ones.
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
    if (name.startsWith("on") || !allowed.has(name)) { el.removeAttribute(attr.name); continue; }
    if (name === "style") {
      const cleaned = sanitizeStyle(attr.value);
      if (cleaned) el.setAttribute("style", cleaned); else el.removeAttribute("style");
    }
    if ((name === "href" || name === "src") ) {
      const ok = safeUrl(attr.value, name === "href");
      if (!ok) { el.remove(); return; }
      el.setAttribute(name, ok);
    }
  }

  if (tag === "IFRAME") {
    try {
      const host = new URL(el.getAttribute("src") || "", window.location.origin).hostname;
      if (!ALLOWED_IFRAME_HOSTS.includes(host)) { el.remove(); return; }
      el.setAttribute("allowfullscreen", "");
    } catch { el.remove(); return; }
  }
  if (tag === "A") {
    el.setAttribute("rel", "noopener noreferrer nofollow");
    if (el.getAttribute("target") === "_blank") { /* keep */ } else el.removeAttribute("target");
  }

  Array.from(el.children).forEach(cleanNode);
}

export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined" || !html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  Array.from(doc.body.children).forEach(cleanNode);
  return doc.body.innerHTML;
}

/** Convert a YouTube / Vimeo / Dailymotion watch URL into an embeddable one. */
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

const SPAM_PATTERNS: RegExp[] = [
  /\b(viagra|cialis|casino|porn|crypto\s?airdrop|forex\s?signals)\b/i,
  /\b(seo\s?services|backlinks|guest\s?post)\b/i,
  /\[url=|\[link=|<a\s+href=/i, // BBCode / raw anchor injection
];

/** Heuristic spam detection for free-text (contact messages, bios). */
export function looksLikeSpam(text: string): boolean {
  const t = text.toLowerCase();
  if (SPAM_PATTERNS.some((re) => re.test(t))) return true;
  // Excessive link density
  const links = (t.match(/https?:\/\//g) || []).length;
  if (links >= 3) return true;
  // Repeated-character flooding (e.g. "aaaaaaaaaa...")
  if (/(.)\1{20,}/.test(t)) return true;
  return false;
}

/**
 * Lightweight client-side rate limiter backed by localStorage. Prevents a
 * user from hammering a form. `key` scopes the limit; returns the number of
 * seconds remaining, or 0 if the action is allowed (and records it).
 */
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
    return 0; // localStorage unavailable — fail open (UX), server still guards
  }
}
