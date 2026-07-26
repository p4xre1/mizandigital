// ── Schema.org JSON-LD Injection Helper ─────────────────────────────────────────
// Injects structured data into <head> for SEO. SSR-safe and Google Rich Result compliant.

const PRIMARY_ORIGIN = "https://www.mizan.page";

/**
 * Resolves the canonical origin for Google SEO schema generation.
 */
function getOrigin(): string {
  return PRIMARY_ORIGIN;
}

/**
 * Helper to map language code to standard locale
 */
function getLocaleCode(lang?: string): string {
  if (!lang || lang === "ar") return "ar-MA";
  if (lang === "fr") return "fr-MA";
  if (lang === "es") return "es-ES";
  return "en";
}

/**
 * Builds clean URLs without double slashes (e.g. avoids //ar/path)
 */
function normalizeUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  const origin = getOrigin();
  const cleanPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${origin}${cleanPath}`.replace(/([^:]\/)\/+/g, "$1");
}

/**
 * Injects or updates a JSON-LD <script> element in <head>
 */
function inject(id: string, data: object) {
  if (typeof window === "undefined" || !document?.head) return;

  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * Removes a specific JSON-LD schema element from <head>
 */
export function clearSchema(id: string) {
  if (typeof window === "undefined") return;
  document.getElementById(id)?.remove();
}

/**
 * Clears all injected JSON-LD schema tags during route transitions
 */
export function clearAllSchemas() {
  if (typeof window === "undefined") return;
  const ids = ["ld-org", "ld-webpage", "ld-legal", "ld-article", "ld-breadcrumb"];
  ids.forEach((id) => clearSchema(id));
}

// ─────────────────────────────────────────────────────────────────────────────────
// Schema Generators
// ─────────────────────────────────────────────────────────────────────────────────

export function setOrganizationSchema() {
  const site = getOrigin();
  inject("ld-org", {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "Mizan Platform — منصة ميزان",
    url: site,
    description: "Digital legal journal and academic archive for Moroccan law.",
    logo: `${site}/Logo.svg`,
    sameAs: [
      "https://www.facebook.com/mizandigital",
      "https://www.twitter.com/mizandigital",
      "https://www.linkedin.com/company/mizandigital",
    ],
  });
}

export function setWebSiteSchema() {
  const site = getOrigin();
  inject("ld-webpage", {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Mizan Platform — منصة ميزان",
    url: site,
    description:
      "The leading Moroccan digital legal journal and academic archive for law students, researchers, and legal professionals.",
    publisher: {
      "@type": "Organization",
      name: "Mizan Platform",
      url: site,
    },
    inLanguage: ["ar-MA", "fr-MA", "en", "es-ES"],
    potentialAction: {
      "@type": "SearchAction",
      target: normalizeUrl(`/ar/search?q={search_term_string}`),
      "query-input": "required name=search_term_string",
    },
  });
}

export interface LegalArticleSchemaProps {
  headline: string;
  description: string;
  slug: string;
  lang?: string;
  datePublished?: string;
}

export function setLegalArticleSchema(a: LegalArticleSchemaProps) {
  const path = a.slug.startsWith("/") ? a.slug : `/${a.slug}`;
  const langPrefix = a.lang === "ar" || !a.lang ? "/ar" : `/${a.lang}`;
  const fullUrl = normalizeUrl(`${langPrefix}${path}`);

  inject("ld-legal", {
    "@context": "https://schema.org",
    "@type": "LegalArticle",
    headline: a.headline,
    description: a.description,
    url: fullUrl,
    inLanguage: getLocaleCode(a.lang),
    author: {
      "@type": "Person",
      name: "Mizan Editorial",
    },
    publisher: {
      "@type": "Organization",
      name: "Mizan Platform",
      url: getOrigin(),
    },
    datePublished: a.datePublished,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": fullUrl,
    },
  });
}

export interface ArticleSchemaProps {
  title: string;
  description: string;
  slug: string;
  author?: string;
  datePublished?: string;
  category?: string;
  schemaType?: "ScholarlyArticle" | "LegalArticle" | "NewsArticle" | string;
  requiresPaidAccess?: boolean;
  lockedCssSelector?: string;
  lang?: string;
  path?: string;
}

export function setArticleSchema(a: ArticleSchemaProps) {
  const pagePath = a.path
    ? a.path.startsWith("/")
      ? a.path
      : `/${a.path}`
    : `/article/${a.slug}`;
  const langPrefix = a.lang === "ar" || !a.lang ? "/ar" : `/${a.lang}`;
  const fullUrl = normalizeUrl(`${langPrefix}${pagePath}`);

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": a.schemaType || "ScholarlyArticle",
    headline: a.title,
    description: a.description,
    url: fullUrl,
    inLanguage: getLocaleCode(a.lang),
    articleSection: a.category,
    author: { "@type": "Person", name: a.author || "Mizan Editorial" },
    publisher: { "@type": "Organization", name: "Mizan Platform", url: getOrigin() },
    datePublished: a.datePublished,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": fullUrl,
    },
  };

  // 🔒 Google Rich Result Compliant Gated Content / Paywall Schema
  if (a.requiresPaidAccess) {
    data.isAccessibleForFree = false;
    data.hasPart = {
      "@type": "WebPageElement",
      isAccessibleForFree: false,
      cssSelector: a.lockedCssSelector || ".premium-content-section",
    };
  } else {
    data.isAccessibleForFree = true;
  }

  inject("ld-article", data);
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function setBreadcrumbSchema(items: BreadcrumbItem[]) {
  inject("ld-breadcrumb", {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: normalizeUrl(it.url),
    })),
  });
}