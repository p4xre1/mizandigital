import { useEffect } from "react";
import { useI18n, type Lang } from "@/lib/i18n";

export interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  keywords?: string | string[];
  ogImage?: string;
  ogImageAlt?: string;
  ogType?: "website" | "article" | "profile" | "document";
  articleNumber?: number | string;
  codeName?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  // Master File & Photo SEO attributes
  fileUrl?: string;
  fileType?: string;
  fileSize?: number | string;
  noIndex?: boolean;
  googleSiteVerification?: string;
}

const BRAND_SUFFIX = {
  ar: "منصة ميزان القانونية المغربية - المرجع القانوني الأول",
  fr: "Plateforme Juridique Mizan Maroc - Référence Juridique",
  en: "Mizan Moroccan Legal Platform - Premier Legal Reference",
  es: "Plataforma Legal Mizan Marruecos - Referencia Legal",
} as const;

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

// Read environment variables or fallback to official domain
const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string) ||
  (import.meta.env.VITE_APP_URL as string) ||
  "https://www.mizan.page";

function getBrandSuffix(lang: Lang): string {
  return BRAND_SUFFIX[lang] || BRAND_SUFFIX.en;
}

/** Helper: Set or update meta tags in document head */
function setMetaTag(attributeName: "name" | "property", attributeValue: string, content: string) {
  let el = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attributeName, attributeValue);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/** Helper: Set or update link tags in document head */
function setLinkTag(rel: string, href: string, hreflang?: string, extraProps?: Record<string, string>) {
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"][href="${href}"]`;
  
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    if (hreflang) el.setAttribute("hreflang", hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);

  if (extraProps) {
    Object.entries(extraProps).forEach(([k, v]) => el?.setAttribute(k, v));
  }
}

/** Helper: Set or update JSON-LD Schema scripts */
function setJsonLd(id: string, schemaData: object) {
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }
  script.text = JSON.stringify(schemaData);
}

export function SEOHead({
  title,
  description,
  canonical,
  keywords,
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
}: SEOProps) {
  const { lang, dir } = useI18n();

  useEffect(() => {
    const rawKeywords = Array.isArray(keywords)
      ? keywords.join(", ")
      : keywords || DEFAULT_KEYWORDS.join(", ");

    const currentUrl =
      canonical ||
      (typeof window !== "undefined"
        ? window.location.href
        : `${SITE_URL}/${lang}`);

    const fullOgImage = ogImage.startsWith("http")
      ? ogImage
      : `${SITE_URL}${ogImage.startsWith("/") ? "" : "/"}${ogImage}`;

    // Clean Path without current language prefix for hreflang links
    const pathWithoutLang = typeof window !== "undefined"
      ? window.location.pathname.replace(/^\/(ar|fr|en|es)/, "")
      : "";

    // -------------------------------------------------------------
    // 1. Language, Direction, and Document Title
    // -------------------------------------------------------------
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;

    const fullTitle = `${title} | ${getBrandSuffix(lang)}`;
    document.title = fullTitle;

    // -------------------------------------------------------------
    // 2. Google & Performance Resource Hints (DNS Prefetch & Preconnect)
    // -------------------------------------------------------------
    setLinkTag("preconnect", "https://fonts.googleapis.com");
    setLinkTag("preconnect", "https://fonts.gstatic.com", undefined, { crossorigin: "anonymous" });
    setLinkTag("preconnect", "https://www.googletagmanager.com");
    setLinkTag("preconnect", "https://pagead2.googlesyndication.com");

    // -------------------------------------------------------------
    // 3. Mobile-First & UI/UX Meta Controls
    // -------------------------------------------------------------
    setMetaTag("name", "viewport", "width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover");
    setMetaTag("name", "theme-color", "#0f172a");
    setMetaTag("name", "mobile-web-app-capable", "yes");
    setMetaTag("name", "apple-mobile-web-app-capable", "yes");
    setMetaTag("name", "apple-mobile-web-app-status-bar-style", "black-translucent");
    setMetaTag("name", "apple-mobile-web-app-title", "Mizan");
    setMetaTag("name", "format-detection", "telephone=no, date=no, address=no, email=no");

    // -------------------------------------------------------------
    // 4. Security & Hardening Meta Headers
    // -------------------------------------------------------------
    setMetaTag("name", "referrer", "strict-origin-when-cross-origin");
    setMetaTag("property", "X-Content-Type-Options", "nosniff");
    setMetaTag("property", "X-UA-Compatible", "IE=edge");

    // Google Search Engine Verification
    if (googleSiteVerification) {
      setMetaTag("name", "google-site-verification", googleSiteVerification);
    }

    // -------------------------------------------------------------
    // 5. SEO Core Meta Tags & Search Crawler Directives
    // -------------------------------------------------------------
    setMetaTag("name", "description", description);
    setMetaTag("name", "keywords", rawKeywords);
    setMetaTag("name", "author", author);

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

    // Canonical Link
    setLinkTag("canonical", currentUrl);

    // -------------------------------------------------------------
    // 6. 4 Languages (ar, fr, en, es) Hreflang Alternates
    // -------------------------------------------------------------
    const languages: Lang[] = ["ar", "fr", "en", "es"];
    languages.forEach((l) => {
      setLinkTag("alternate", `${SITE_URL}/${l}${pathWithoutLang}`, l);
    });
    // Default fallback language (ar)
    setLinkTag("alternate", `${SITE_URL}/ar${pathWithoutLang}`, "x-default");

    // -------------------------------------------------------------
    // 7. Master Photo & Open Graph (OG) Meta Data
    // -------------------------------------------------------------
    setMetaTag("property", "og:site_name", "Mizan");
    setMetaTag("property", "og:title", fullTitle);
    setMetaTag("property", "og:description", description);
    setMetaTag("property", "og:url", currentUrl);
    setMetaTag("property", "og:type", ogType);
    setMetaTag("property", "og:locale", `${lang}_MA`);
    setMetaTag("property", "og:image", fullOgImage);
    setMetaTag("property", "og:image:secure_url", fullOgImage);
    setMetaTag("property", "og:image:alt", ogImageAlt || title);

    if (publishedTime) {
      setMetaTag("property", "article:published_time", publishedTime);
    }
    if (modifiedTime) {
      setMetaTag("property", "article:modified_time", modifiedTime);
    }

    // Twitter Card Data
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:site", "@MizanLegal");
    setMetaTag("name", "twitter:title", fullTitle);
    setMetaTag("name", "twitter:description", description);
    setMetaTag("name", "twitter:image", fullOgImage);
    setMetaTag("name", "twitter:image:alt", ogImageAlt || title);

    // -------------------------------------------------------------
    // 8. JSON-LD Schemas (Structured Data for Google)
    // -------------------------------------------------------------

    // A. Website & Organization Master Schema
    const websiteSchema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": `${SITE_URL}/#website`,
          "url": SITE_URL,
          "name": "Mizan Legal Platform",
          "description": description,
          "inLanguage": ["ar-MA", "fr-MA", "en-US", "es-ES"],
          "publisher": { "@id": `${SITE_URL}/#organization` },
        },
        {
          "@type": "Organization",
          "@id": `${SITE_URL}/#organization`,
          "name": "Mizan",
          "url": SITE_URL,
          "logo": {
            "@type": "ImageObject",
            "url": `${SITE_URL}/Logo.svg`,
            "caption": "Mizan Logo",
          },
        },
      ],
    };
    setJsonLd("jsonld-website", websiteSchema);

    // B. Master Photo (ImageObject) Schema
    const imageSchema = {
      "@context": "https://schema.org",
      "@type": "ImageObject",
      "contentUrl": fullOgImage,
      "url": fullOgImage,
      "caption": ogImageAlt || title,
      "description": description,
      "keywords": rawKeywords,
      "inLanguage": lang,
    };
    setJsonLd("jsonld-image", imageSchema);

    // C. Master File / Document Schema (for downloadable PDF/Docs)
    if (fileUrl) {
      const fullFileUrl = fileUrl.startsWith("http") ? fileUrl : `${SITE_URL}${fileUrl}`;
      const fileSchema = {
        "@context": "https://schema.org",
        "@type": "DigitalDocument",
        "name": title,
        "description": description,
        "url": fullFileUrl,
        "encodingFormat": fileType,
        "fileSize": fileSize ? String(fileSize) : undefined,
        "keywords": rawKeywords,
        "inLanguage": lang,
        "publisher": { "@id": `${SITE_URL}/#organization` },
      };
      setJsonLd("jsonld-document", fileSchema);
    }

    // D. Moroccan Legislation Schema (When inspecting legal codes/articles)
    if (articleNumber && codeName) {
      const legislationSchema = {
        "@context": "https://schema.org",
        "@type": "Legislation",
        "name": `الفصل ${articleNumber} - ${codeName}`,
        "description": description,
        "legislationJurisdiction": "MA",
        "inLanguage": ["ar-MA", "fr-MA", "en-MA", "es-MA"],
        "url": currentUrl,
      };
      setJsonLd("jsonld-legislation", legislationSchema);
    }

    // Cleanup Schema scripts on unmount
    return () => {
      ["jsonld-legislation", "jsonld-document"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.remove();
      });
    };
  }, [
    title,
    description,
    canonical,
    keywords,
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