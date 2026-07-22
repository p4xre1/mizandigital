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
}

export function useSeo(config: SeoOptions, deps: React.DependencyList = []) {
  useEffect(() => {
    // 1. Document Title
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

    // 4. OpenGraph Image
    if (config.ogImage) {
      setMetaTag("property", "og:image", config.ogImage);
      setMetaTag("name", "twitter:image", config.ogImage);
      setMetaTag("name", "twitter:card", "summary_large_image");
    }

    // 5. OpenGraph Type
    if (config.type) {
      setMetaTag("property", "og:type", config.type || "website");
    }

    // 6. Language
    if (config.lang) {
      document.documentElement.lang = config.lang;
    }

    // 7. Canonical URL & Path
    if (config.canonical || config.path) {
      const href = config.canonical || `${window.location.origin}${config.path}`;
      let linkCanonical = document.querySelector('link[rel="canonical"]');
      if (!linkCanonical) {
        linkCanonical = document.createElement("link");
        linkCanonical.setAttribute("rel", "canonical");
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.setAttribute("href", href);
      setMetaTag("property", "og:url", href);
    }

    // 8. Robots / NoIndex
    if (config.noindex) {
      setMetaTag("name", "robots", "noindex, nofollow");
    } else {
      setMetaTag("name", "robots", "index, follow");
    }
  }, [
    config.title,
    config.description,
    config.keywords,
    config.ogImage,
    config.canonical,
    config.path,
    config.noindex,
    config.lang,
    ...deps,
  ]);
}

/**
 * Helper utility to create or update meta tags cleanly
 */
function setMetaTag(attrName: "name" | "property", attrValue: string, content: string) {
  let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}