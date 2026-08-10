// Schema.org JSON-LD helpers for SEO

const PRIMARY_ORIGIN = "https://www.mizan.page";

function getOrigin(): string {
  return PRIMARY_ORIGIN;
}

function getLocaleCode(lang?: string): string {
  if (!lang || lang === "ar") return "ar-MA";
  if (lang === "fr") return "fr-MA";
  if (lang === "es") return "es-ES";
  return "en";
}

function normalizeUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;

  return `${getOrigin()}${path}`.replace(/([^:]\/)\/+/g, "$1");
}

function normalizeImages(images?: string | string[]): string[] {
  const values = Array.isArray(images) ? images : images ? [images] : [];

  return [
    ...new Set(
      values
        .map((image) => image.trim())
        .filter(Boolean)
        .map(normalizeUrl),
    ),
  ];
}

function buildAuthor(
  name?: string,
  type: "Person" | "Organization" = "Organization",
  url?: string,
): Record<string, unknown> {
  const author: Record<string, unknown> = {
    "@type": type,
    name: name?.trim() || "ميزان الرقمية",
  };

  if (url) {
    author.url = normalizeUrl(url);
  }

  return author;
}

function getPublisherSchema(): Record<string, unknown> {
  const site = getOrigin();

  return {
    "@type": "Organization",
    "@id": `${site}/#organization`,
    name: "ميزان الرقمية",
    alternateName: "Mizan Digital",
    url: site,
    logo: {
      "@type": "ImageObject",
      "@id": `${site}/#logo`,
      url: `${site}/Logo.svg`,
      contentUrl: `${site}/Logo.svg`,
    },
  };
}

function inject(id: string, data: object): void {
  if (typeof window === "undefined" || !document.head) return;

  let element = document.getElementById(id) as HTMLScriptElement | null;

  if (!element) {
    element = document.createElement("script");
    element.type = "application/ld+json";
    element.id = id;
    document.head.appendChild(element);
  }

  element.textContent = JSON.stringify(data);
}

export function clearSchema(id: string): void {
  if (typeof window === "undefined") return;
  document.getElementById(id)?.remove();
}

export function clearAllSchemas(): void {
  if (typeof window === "undefined") return;

  [
    "ld-org",
    "ld-webpage",
    "ld-legal",
    "ld-article",
    "ld-breadcrumb",
  ].forEach(clearSchema);
}

// Organization schema

export function setOrganizationSchema(): void {
  const site = getOrigin();

  inject("ld-org", {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${site}/#organization`,
    name: "ميزان الرقمية",
    alternateName: "Mizan Digital",
    url: site,
    description:
      "منصة رقمية للخدمات والبحوث القانونية والاجتهادات القضائية بالمغرب.",
    logo: {
      "@type": "ImageObject",
      "@id": `${site}/#logo`,
      url: `${site}/Logo.svg`,
      contentUrl: `${site}/Logo.svg`,
    },

    // Keep these only if they are real, active Mizan profiles.
    sameAs: [
      "https://www.facebook.com/mizandigital",
      "https://www.twitter.com/mizandigital",
      "https://www.linkedin.com/company/mizandigital",
    ],
  });
}

// Website schema

export function setWebSiteSchema(): void {
  const site = getOrigin();

  inject("ld-webpage", {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${site}/#website`,
    name: "ميزان الرقمية",
    alternateName: "Mizan Digital",
    url: site,
    description:
      "منصة رقمية للخدمات والبحوث القانونية والاجتهادات القضائية بالمغرب.",
    publisher: {
      "@id": `${site}/#organization`,
    },
    inLanguage: ["ar-MA", "fr-MA", "en", "es-ES"],
  });
}

// Legal article schema

export interface LegalArticleSchemaProps {
  headline: string;
  description: string;
  slug: string;
  lang?: string;
  author?: string;
  authorUrl?: string;
  authorType?: "Person" | "Organization";
  image?: string | string[];
  datePublished?: string;
  dateModified?: string;
}

export function setLegalArticleSchema(
  article: LegalArticleSchemaProps,
): void {
  const path = article.slug.startsWith("/")
    ? article.slug
    : `/${article.slug}`;

  const langPrefix =
    article.lang === "ar" || !article.lang ? "/ar" : `/${article.lang}`;

  const fullUrl = normalizeUrl(`${langPrefix}${path}`);
  const images = normalizeImages(article.image);

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.headline,
    description: article.description,
    url: fullUrl,
    inLanguage: getLocaleCode(article.lang),
    author: buildAuthor(
      article.author,
      article.authorType || "Organization",
      article.authorUrl,
    ),
    publisher: getPublisherSchema(),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": fullUrl,
      url: fullUrl,
    },
  };

  if (article.datePublished) {
    data.datePublished = article.datePublished;
  }

  if (article.dateModified) {
    data.dateModified = article.dateModified;
  }

  if (images.length > 0) {
    data.image = images;
  }

  inject("ld-legal", data);
}

// General article schema

export interface ArticleSchemaProps {
  title: string;
  description: string;
  slug: string;
  author?: string;
  authorUrl?: string;
  authorType?: "Person" | "Organization";
  image?: string | string[];
  datePublished?: string;
  dateModified?: string;
  category?: string;

  // Use Article, NewsArticle, or BlogPosting for Google Article results.
  schemaType?: string;

  requiresPaidAccess?: boolean;
  lockedCssSelector?: string;
  lang?: string;
  path?: string;
}

export function setArticleSchema(article: ArticleSchemaProps): void {
  const pagePath = article.path
    ? article.path.startsWith("/")
      ? article.path
      : `/${article.path}`
    : `/article/${article.slug}`;

  const langPrefix =
    article.lang === "ar" || !article.lang ? "/ar" : `/${article.lang}`;

  const fullUrl = normalizeUrl(`${langPrefix}${pagePath}`);
  const images = normalizeImages(article.image);

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": article.schemaType || "Article",
    headline: article.title,
    description: article.description,
    url: fullUrl,
    inLanguage: getLocaleCode(article.lang),

    author: buildAuthor(
      article.author,
      article.authorType || "Organization",
      article.authorUrl,
    ),

    publisher: getPublisherSchema(),

    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": fullUrl,
      url: fullUrl,
    },

    isAccessibleForFree: !article.requiresPaidAccess,
  };

  if (article.category?.trim()) {
    data.articleSection = article.category.trim();
  }

  if (article.datePublished) {
    data.datePublished = article.datePublished;
  }

  if (article.dateModified) {
    data.dateModified = article.dateModified;
  }

  if (images.length > 0) {
    data.image = images;
  }

  if (article.requiresPaidAccess) {
    data.hasPart = {
      "@type": "WebPageElement",
      isAccessibleForFree: false,
      cssSelector:
        article.lockedCssSelector || ".premium-content-section",
    };
  }

  inject("ld-article", data);
}

// Breadcrumb schema

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function setBreadcrumbSchema(items: BreadcrumbItem[]): void {
  inject("ld-breadcrumb", {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: normalizeUrl(item.url),
    })),
  });
}