import { useEffect } from "react";
import { useI18n, type Lang } from "@/lib/i18n";

export interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  keywords?: string | string[];
  jsonLd?: object;
  ogImage?: string;
  ogImageAlt?: string;
  ogType?: "website" | "article" | "profile" | "document";
  articleNumber?: number | string;
  codeName?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number | string;
  noIndex?: boolean;
  googleSiteVerification?: string;
}

const BRAND_SUFFIX: Record<Lang, string> = {
  ar: "منصة ميزان القانونية المغربية - المرجع القانوني الأول",
  fr: "Plateforme Juridique Mizan Maroc - Référence Juridique",
  en: "Mizan Moroccan Legal Platform - Premier Legal Reference",
  es: "Plataforma Legal Mizan Marruecos - Referencia Legal",
};

const DEFAULT_KEYWORDS = [
  "القانون المغربي",
  "مدونة الأسرة",
  "المسطرة المدنية",
  "المسطرة الجنائية",
  "مدونة الشغل",
  "الجريدة الرسمية المغربية",
  "الاستشارات القانونية المغرب",
  "Droit Marocain",
  "Moroccan Law",
];

const SITE_URL = "https://www.mizan.page";
const LANGUAGE_PREFIX = /^\/(ar|fr|en|es)(?=\/|$)/;

const LOCALE_MAP: Record<Lang, string> = {
  ar: "ar_MA",
  fr: "fr_FR",
  en: "en_US",
  es: "es_ES",
};

function normalizePath(path: string): string {
  const normalized = `/${path}`
    .replace(/\/+/g, "/")
    .replace(/\/+$/, "");

  return normalized || "/";
}

function getNeutralPath(path: string): string {
  return normalizePath(path).replace(LANGUAGE_PREFIX, "") || "/";
}

function buildLocalizedUrl(lang: Lang, path: string): string {
  const neutralPath = getNeutralPath(path);

  return neutralPath === "/"
    ? `${SITE_URL}/${lang}`
    : `${SITE_URL}/${lang}${neutralPath}`;
}

function buildCanonicalUrl(value: string, lang: Lang): string {
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

function buildAssetUrl(value: string): string {
  const repaired = value.trim().replace(/^\/+(?=https?:\/\/)/i, "");

  if (/^https?:\/\//i.test(repaired)) {
    return repaired;
  }

  if (repaired.startsWith("//")) {
    return `https:${repaired}`;
  }

  return `${SITE_URL}${normalizePath(repaired)}`;
}

function getBrandSuffix(lang: Lang): string {
  return BRAND_SUFFIX[lang] || BRAND_SUFFIX.en;
}

function setMetaTag(
  attributeName: "name" | "property" | "http-equiv",
  attributeValue: string,
  content: string
): void {
  let element = document.querySelector<HTMLMetaElement>(
    `meta[${attributeName}="${attributeValue}"]`
  );

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function setLinkTag(
  rel: string,
  href: string,
  hreflang?: string,
  extraProps?: Record<string, string>
): void {
  const links = Array.from(
    document.querySelectorAll<HTMLLinkElement>(`link[rel="${rel}"]`)
  );

  let element: HTMLLinkElement | null = hreflang
    ? links.find((link) => link.getAttribute("hreflang") === hreflang) || null
    : rel === "canonical"
      ? links[0] || null
      : links.find((link) => link.getAttribute("href") === href) || null;

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);

    if (hreflang) {
      element.setAttribute("hreflang", hreflang);
    }

    document.head.appendChild(element);
  }

  element.setAttribute("href", href);

  if (extraProps) {
    Object.entries(extraProps).forEach(([key, value]) => {
      element?.setAttribute(key, value);
    });
  }
}

function setJsonLd(id: string, schemaData: object): void {
  let script = document.getElementById(id) as HTMLScriptElement | null;

  if (!script) {
    script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }

  script.text = JSON.stringify(schemaData).replace(/</g, "\\u003c");
}

export function SEOHead({
  title,
  description,
  canonical,
  keywords,
  jsonLd,
  ogImage = `${SITE_URL}/Logo.svg`,
  ogImageAlt,
  ogType = "website",
  articleNumber,
  codeName,
  publishedTime,
  modifiedTime,
  author = "Mizan Legal Team",
  fileUrl,
  fileType = "application/pdf",
  fileSize,
  noIndex = false,
  googleSiteVerification = import.meta.env.VITE_GOOGLE_SITE_VERIFICATION || "",
}: SEOProps): null {
  const { lang, dir } = useI18n();

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const rawKeywords = Array.isArray(keywords)
      ? keywords.join(", ")
      : keywords || DEFAULT_KEYWORDS.join(", ");

    const rawPath =
      canonical || window.location.pathname || `/${lang}`;

    const currentUrl = buildCanonicalUrl(rawPath, lang);
    const pathWithoutLang = getNeutralPath(
      new URL(currentUrl).pathname
    );
    const fullOgImage = buildAssetUrl(ogImage);

    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    document.title = `${title} | ${getBrandSuffix(lang)}`;

    setMetaTag("name", "description", description);
    setMetaTag("name", "keywords", rawKeywords);
    setMetaTag("name", "author", author);
    setMetaTag("name", "referrer", "strict-origin-when-cross-origin");
    setMetaTag("name", "viewport", "width=device-width, initial-scale=1");
    setMetaTag("name", "theme-color", "#0f172a");
    setMetaTag("name", "mobile-web-app-capable", "yes");
    setMetaTag("name", "apple-mobile-web-app-capable", "yes");
    setMetaTag(
      "name",
      "apple-mobile-web-app-status-bar-style",
      "black-translucent"
    );
    setMetaTag(
      "name",
      "format-detection",
      "telephone=no, date=no, address=no, email=no"
    );

    setMetaTag("http-equiv", "X-Content-Type-Options", "nosniff");
    setMetaTag("http-equiv", "X-UA-Compatible", "IE=edge");

    if (googleSiteVerification) {
      setMetaTag(
        "name",
        "google-site-verification",
        googleSiteVerification
      );
    }

    if (noIndex) {
      setMetaTag("name", "robots", "noindex, nofollow");
      setMetaTag("name", "googlebot", "noindex, nofollow");
    } else {
      setMetaTag(
        "name",
        "robots",
        "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
      );
      setMetaTag(
        "name",
        "googlebot",
        "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
      );
    }

    setLinkTag("canonical", currentUrl);

    const languages: Lang[] = ["ar", "fr", "en", "es"];

    languages.forEach((language) => {
      setLinkTag(
        "alternate",
        buildLocalizedUrl(language, pathWithoutLang),
        language
      );
    });

    setLinkTag(
      "alternate",
      buildLocalizedUrl("ar", pathWithoutLang),
      "x-default"
    );

    setLinkTag("preconnect", "https://fonts.googleapis.com");
    setLinkTag(
      "preconnect",
      "https://fonts.gstatic.com",
      undefined,
      { crossorigin: "anonymous" }
    );
    setLinkTag("preconnect", "https://www.googletagmanager.com");
    setLinkTag(
      "preconnect",
      "https://pagead2.googlesyndication.com"
    );

    const fullTitle = `${title} | ${getBrandSuffix(lang)}`;

    setMetaTag("property", "og:site_name", "Mizan");
    setMetaTag("property", "og:title", fullTitle);
    setMetaTag("property", "og:description", description);
    setMetaTag("property", "og:url", currentUrl);
    setMetaTag("property", "og:type", ogType);
    setMetaTag("property", "og:locale", LOCALE_MAP[lang]);
    setMetaTag("property", "og:image", fullOgImage);
    setMetaTag("property", "og:image:secure_url", fullOgImage);
    setMetaTag("property", "og:image:alt", ogImageAlt || title);

    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:site", "@MizanLegal");
    setMetaTag("name", "twitter:title", fullTitle);
    setMetaTag("name", "twitter:description", description);
    setMetaTag("name", "twitter:image", fullOgImage);
    setMetaTag(
      "name",
      "twitter:image:alt",
      ogImageAlt || title
    );

    if (publishedTime) {
      setMetaTag(
        "property",
        "article:published_time",
        publishedTime
      );
    }

    if (modifiedTime) {
      setMetaTag(
        "property",
        "article:modified_time",
        modifiedTime
      );
    }

    const websiteSchema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": `${SITE_URL}/#website`,
          url: SITE_URL,
          name: "Mizan Legal Platform",
          description,
          inLanguage: ["ar-MA", "fr-FR", "en-US", "es-ES"],
          publisher: {
            "@id": `${SITE_URL}/#organization`,
          },
        },
        {
          "@type": "Organization",
          "@id": `${SITE_URL}/#organization`,
          name: "Mizan",
          url: SITE_URL,
          logo: {
            "@type": "ImageObject",
            url: `${SITE_URL}/Logo.svg`,
            caption: "Mizan Logo",
          },
        },
      ],
    };

    setJsonLd("jsonld-website", websiteSchema);

    const imageSchema = {
      "@context": "https://schema.org",
      "@type": "ImageObject",
      contentUrl: fullOgImage,
      url: fullOgImage,
      caption: ogImageAlt || title,
      description,
      keywords: rawKeywords,
      inLanguage: lang,
    };

    setJsonLd("jsonld-image", imageSchema);

    if (jsonLd) {
      setJsonLd("jsonld-page", jsonLd);
    }

    if (fileUrl) {
      const fullFileUrl = buildAssetUrl(fileUrl);

      setJsonLd("jsonld-document", {
        "@context": "https://schema.org",
        "@type": "DigitalDocument",
        name: title,
        description,
        url: fullFileUrl,
        encodingFormat: fileType,
        fileSize: fileSize ? String(fileSize) : undefined,
        keywords: rawKeywords,
        inLanguage: lang,
        publisher: {
          "@id": `${SITE_URL}/#organization`,
        },
      });
    }

    if (articleNumber && codeName) {
      setJsonLd("jsonld-legislation", {
        "@context": "https://schema.org",
        "@type": "Legislation",
        name: `الفصل ${articleNumber} - ${codeName}`,
        description,
        legislationJurisdiction: "MA",
        inLanguage: ["ar-MA", "fr-FR", "en-US", "es-ES"],
        url: currentUrl,
      });
    }

    return () => {
      [
        "jsonld-legislation",
        "jsonld-document",
        "jsonld-page",
      ].forEach((id) => {
        document.getElementById(id)?.remove();
      });
    };
  }, [
    title,
    description,
    canonical,
    keywords,
    jsonLd,
    ogImage,
    ogImageAlt,
    ogType,
    articleNumber,
    codeName,
    publishedTime,
    modifiedTime,
    author,
    fileUrl,
    fileType,
    fileSize,
    noIndex,
    googleSiteVerification,
    lang,
    dir,
  ]);

  return null;
}