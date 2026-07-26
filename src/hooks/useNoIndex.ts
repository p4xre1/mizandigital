import { useEffect } from "react";

export type SupportedLang = "ar" | "fr" | "en" | "es";

export interface PhotoSEOMetadata {
  imageUrl?: string;
  altText?: string;
  title?: string;
}

export interface MasterSEOOptions {
  /** Target path or route slug (e.g., 'news/government') */
  path?: string;
  /** Active UI language context */
  lang?: SupportedLang;
  /** Photo SEO & Social Sharing Metadata */
  photoMeta?: PhotoSEOMetadata;
  /** Master SEO keywords for document, file, or article context */
  keywords?: string[];
  /** Force index override if needed */
  forceIndex?: boolean;
}

const SITE_DOMAIN =
  import.meta.env.VITE_SITE_URL ||
  import.meta.env.VITE_APP_URL ||
  "https://www.mizan.page";

const SUPPORTED_LANGS: SupportedLang[] = ["ar", "fr", "en", "es"];

/**
 * Phones-first, military-grade SEO & NoIndex hook.
 * Multi-language aware (AR, FR, EN, ES) with complete Google engine directives.
 */
export const useNoIndex = (options?: MasterSEOOptions) => {
  useEffect(() => {
    if (typeof window === "undefined" || !document?.head) return;

    const currentLang: SupportedLang =
      options?.lang && SUPPORTED_LANGS.includes(options.lang)
        ? options.lang
        : "ar";

    const cleanPath = options?.path ? options.path.replace(/^\/+/, "") : "";
    const canonicalUrl = `${SITE_DOMAIN.replace(/\/+$/, "")}/${cleanPath}`;

    const createdElements: HTMLElement[] = [];

    // Military-grade secure meta tag builder
    const setMetaTag = (
      nameOrProperty: string,
      content: string,
      isProperty = false
    ) => {
      const attributeName = isProperty ? "property" : "name";
      const selector = `meta[${attributeName}="${CSS.escape(nameOrProperty)}"]`;
      let element = document.querySelector<HTMLMetaElement>(selector);

      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attributeName, nameOrProperty);
        document.head.appendChild(element);
        createdElements.push(element);
      }

      element.setAttribute("content", content);
    };

    // 1. Primary Engine Directives (Googlebot, Googlebot-News, Bingbot)
    if (options?.forceIndex) {
      const indexContent = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
      setMetaTag("robots", indexContent);
      setMetaTag("googlebot", "index, follow");
      setMetaTag("googlebot-news", "index, follow");
      setMetaTag("bingbot", "index, follow");
    } else {
      const noIndexContent = "noindex, nofollow, noarchive, nosnippet, max-image-preview:none, max-snippet:-1";
      setMetaTag("robots", noIndexContent);
      setMetaTag("googlebot", noIndexContent);
      setMetaTag("googlebot-news", noIndexContent);
      setMetaTag("bingbot", noIndexContent);
    }

    // 2. Dynamic Canonical Tag
    let canonicalElement = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    let createdCanonical = false;
    if (!canonicalElement) {
      canonicalElement = document.createElement("link");
      canonicalElement.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalElement);
      createdCanonical = true;
    }
    const previousCanonical = canonicalElement.getAttribute("href");
    canonicalElement.setAttribute("href", canonicalUrl);

    // 3. Multi-Language HREFLANG Links (AR, FR, EN, ES)
    const hreflangElements: HTMLLinkElement[] = [];
    SUPPORTED_LANGS.forEach((lang) => {
      const langUrl = `${SITE_DOMAIN.replace(/\/+$/, "")}/${lang}/${cleanPath}`;
      let link = document.querySelector<HTMLLinkElement>(`link[hreflang="${lang}"]`);
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "alternate");
        link.setAttribute("hreflang", lang);
        document.head.appendChild(link);
        hreflangElements.push(link);
      }
      link.setAttribute("href", langUrl);
    });

    // 4. Photo & Media SEO Tags
    if (options?.photoMeta?.imageUrl) {
      setMetaTag("og:image", options.photoMeta.imageUrl, true);
      setMetaTag("twitter:image", options.photoMeta.imageUrl);
      if (options.photoMeta.altText) {
        setMetaTag("og:image:alt", options.photoMeta.altText, true);
      }
    }

    // 5. File & Page Master Keywords
    if (options?.keywords && options.keywords.length > 0) {
      setMetaTag("keywords", options.keywords.join(", "));
    }

    // Unmount Cleanup
    return () => {
      // Restore standard index state on unmount
      setMetaTag("robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
      setMetaTag("googlebot", "index, follow");
      setMetaTag("googlebot-news", "index, follow");
      setMetaTag("bingbot", "index, follow");

      if (canonicalElement) {
        if (createdCanonical) {
          canonicalElement.remove();
        } else if (previousCanonical) {
          canonicalElement.setAttribute("href", previousCanonical);
        }
      }

      createdElements.forEach((el) => el.parentNode?.removeChild(el));
      hreflangElements.forEach((el) => el.parentNode?.removeChild(el));
    };
  }, [
    options?.path,
    options?.lang,
    options?.forceIndex,
    JSON.stringify(options?.keywords),
    JSON.stringify(options?.photoMeta),
  ]);
};