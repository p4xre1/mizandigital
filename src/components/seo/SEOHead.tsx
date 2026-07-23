"use client";

import { useEffect } from "react";
import { useI18n, type Lang } from "@/lib/i18n";

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  keywords?: string;
  articleNumber?: number;
  codeName?: string;
  ogImage?: string;
}

const BRAND_SUFFIX = {
  ar: "منصة ميزان القانونية المغربية",
  fr: "Plateforme Juridique Mizan Maroc",
  en: "Mizan Moroccan Legal Platform",
  es: "Plataforma Legal Mizan Marruecos",
} as const;

function getBrandSuffix(lang: Lang): string {
  return BRAND_SUFFIX[lang] || BRAND_SUFFIX.en;
}

/** Helper to set or update meta tag content */
function setMetaTag(attributeName: "name" | "property", attributeValue: string, content: string) {
  let el = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attributeName, attributeValue);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function SEOHead({
  title,
  description,
  canonical,
  keywords = "القانون المغربي, مدونة الأسرة, المسطرة المدنية, مدونة الشغل, الاستشارات القانونية المغرب",
  articleNumber,
  codeName,
  ogImage = "https://mizandigital.com/og-image.png",
}: SEOProps) {
  const { lang, dir } = useI18n();

  useEffect(() => {
    const currentUrl =
      canonical || (typeof window !== "undefined" ? window.location.href : "");

    // 1. Update Document Language & Direction Attributes
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;

    // 2. Title tag
    const fullTitle = `${title} | ${getBrandSuffix(lang)}`;
    document.title = fullTitle;

    // 3. Primary Meta Tags
    setMetaTag("name", "description", description);
    setMetaTag("name", "keywords", keywords);

    // 4. Open Graph / Facebook Meta Tags
    setMetaTag("property", "og:title", fullTitle);
    setMetaTag("property", "og:description", description);
    setMetaTag("property", "og:url", currentUrl);
    setMetaTag("property", "og:type", articleNumber ? "article" : "website");
    setMetaTag("property", "og:image", ogImage);

    // 5. Twitter Card Meta Tags
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:title", fullTitle);
    setMetaTag("name", "twitter:description", description);
    setMetaTag("name", "twitter:image", ogImage);

    // 6. Canonical Link Tag
    if (currentUrl) {
      let canonicalLink = document.querySelector('link[rel="canonical"]');
      if (!canonicalLink) {
        canonicalLink = document.createElement("link");
        canonicalLink.setAttribute("rel", "canonical");
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute("href", currentUrl);
    }

    // 7. Schema.org Legislation Data for Google Rich Snippets
    if (articleNumber && codeName) {
      const schema = {
        "@context": "https://schema.org",
        "@type": "Legislation",
        "name": `الفصل ${articleNumber} - ${codeName}`,
        "description": description,
        "legislationJurisdiction": "MA", // Morocco Country Code
        "inLanguage": ["ar-MA", "fr-MA"],
        "url": currentUrl,
      };

      let script = document.getElementById("jsonld-legislation") as HTMLScriptElement;
      if (!script) {
        script = document.createElement("script");
        script.id = "jsonld-legislation";
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.text = JSON.stringify(schema);
    }

    // Cleanup Schema script if component unmounts on navigation
    return () => {
      const script = document.getElementById("jsonld-legislation");
      if (script) {
        script.remove();
      }
    };
  }, [title, description, canonical, keywords, articleNumber, codeName, ogImage, lang, dir]);

  return null;
}