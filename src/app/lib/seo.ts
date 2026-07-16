import { useEffect } from "react";

// ── Master SEO helper ───────────────────────────────────────────────────────────
// Sets <title>, meta description/keywords, canonical URL, and Open Graph /
// Twitter card tags on the document head. Reverts to a sensible default on
// unmount so every route controls its own metadata.

const SITE = "https://mizan.ma";
const DEFAULT_TITLE = "منصة ميزان · Mizan Platform";
const SITE_NAME = "Mizan Platform";

interface SeoOptions {
  title: string;
  description?: string;
  keywords?: string[];
  /** Path only, e.g. "/library". Combined with SITE for the canonical URL. */
  path?: string;
  image?: string;
  type?: "website" | "article";
  lang?: string;
  noindex?: boolean;
}

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function applySeo(opts: SeoOptions) {
  const fullTitle = opts.title ? `${opts.title} · ${SITE_NAME}` : DEFAULT_TITLE;
  document.title = fullTitle;

  const desc = opts.description ?? "";
  const url = `${SITE}${opts.path ?? window.location.pathname}`;
  const image = opts.image ?? `${SITE}/og-default.jpg`;

  if (desc) upsertMeta("name", "description", desc);
  if (opts.keywords?.length) upsertMeta("name", "keywords", opts.keywords.join(", "));
  upsertMeta("name", "robots", opts.noindex ? "noindex, nofollow" : "index, follow");
  upsertLink("canonical", url);

  // Open Graph
  upsertMeta("property", "og:title", fullTitle);
  upsertMeta("property", "og:description", desc);
  upsertMeta("property", "og:type", opts.type ?? "website");
  upsertMeta("property", "og:url", url);
  upsertMeta("property", "og:site_name", SITE_NAME);
  upsertMeta("property", "og:image", image);
  upsertMeta("property", "og:locale", opts.lang === "ar" ? "ar_MA" : opts.lang ?? "ar_MA");

  // Twitter
  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", fullTitle);
  upsertMeta("name", "twitter:description", desc);
  upsertMeta("name", "twitter:image", image);
}

/** React hook — apply SEO for the lifetime of a route component. */
export function useSeo(opts: SeoOptions, deps: unknown[] = []) {
  useEffect(() => {
    applySeo(opts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
