import { useEffect } from "react";

export interface SeoOptions {
  title?: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
  path?: string;
  ogImage?: string;
  type?: string;
  keywords?: string[] | string;
  lang?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export function useSeo(config: SeoOptions, deps: React.DependencyList = []) {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const previousTitle = document.title;

    // 1. Document Title & Basic OG/Twitter Titles
    if (config.title) {
      document.title = config.title;
      setMetaTag("property", "og:title", config.title);
      setMetaTag("name", "twitter:title", config.title);
    }

    // 2. Meta Description
    if (config.description) {
      setMetaTag("name", "description", config.description);
      setMetaTag("property", "og:description", config.description);
      setMetaTag("name", "twitter:description", config.description);
    }

    // 3. Keywords
    if (config.keywords) {
      const keywordsStr = Array.isArray(config.keywords)
        ? config.keywords.join(", ")
        : config.keywords;
      setMetaTag("name", "keywords", keywordsStr);
    }

    // 4. OpenGraph Image & Twitter Cards
    if (config.ogImage) {
      setMetaTag("property", "og:image", config.ogImage);
      setMetaTag("name", "twitter:image", config.ogImage);
      setMetaTag("name", "twitter:card", "summary_large_image");
    }

    // 5. OpenGraph Type & Site Name
    setMetaTag("property", "og:type", config.type || "website");
    setMetaTag("property", "og:site_name", "Mizan Digital — ميزان الرقمية");

    // 6. Language & OG Locale
    if (config.lang) {
      document.documentElement.lang = config.lang;
      const locale =
        config.lang === "ar"
          ? "ar_MA"
          : config.lang === "fr"
          ? "fr_FR"
          : "en_US";
      setMetaTag("property", "og:locale", locale);
    }

    // 7. Canonical URL & Path
    if (config.canonical || config.path) {
      const href =
        config.canonical || `${window.location.origin}${config.path}`;
      let linkCanonical = document.querySelector<HTMLLinkElement>(
        'link[rel="canonical"]'
      );
      if (!linkCanonical) {
        linkCanonical = document.createElement("link");
        linkCanonical.setAttribute("rel", "canonical");
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.setAttribute("href", href);
      setMetaTag("property", "og:url", href);
    }

    // 8. Robots / Indexing Directives
    if (config.noindex) {
      setMetaTag("name", "robots", "noindex, nofollow");
    } else {
      setMetaTag("name", "robots", "index, follow, max-snippet:-1, max-image-preview:large");
    }

    // 9. JSON-LD Structured Data Insertion
    if (config.jsonLd) {
      setJsonLd(config.jsonLd);
    }

    // Teardown / Cleanup on page unmount
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ...deps,
  ]);
}

/**
 * Helper utility to create or update meta tags cleanly
 */
function setMetaTag(
  attrName: "name" | "property",
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

/**
 * Helper to manage dynamic JSON-LD structured scripts
 */
function setJsonLd(data: Record<string, unknown> | Array<Record<string, unknown>>) {
  let script = document.querySelector<HTMLScriptElement>(
    'script[id="mizan-seo-jsonld"]'
  );
  if (!script) {
    script = document.createElement("script");
    script.setAttribute("type", "application/ld+json");
    script.setAttribute("id", "mizan-seo-jsonld");
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

function removeJsonLd() {
  const script = document.querySelector('script[id="mizan-seo-jsonld"]');
  if (script) {
    script.remove();
  }
}