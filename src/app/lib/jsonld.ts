// ── Schema.org JSON-LD injection helper ─────────────────────────────────────────
// Injects structured data into <head> for SEO. Removes prior tags on route change.

const SITE = "https://mizan.ma";

function inject(id: string, data: object) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function setOrganizationSchema() {
  inject("ld-org", {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "Mizan Platform — منصة ميزان",
    url: SITE,
    description: "Digital legal journal and academic archive for Moroccan law.",
    logo: "https://mizan.ma/logo.svg",
    sameAs: [
      "https://www.facebook.com/mizan.ma",
      "https://www.twitter.com/mizan_ma",
      "https://www.linkedin.com/company/mizan-ma"
    ],
  });
}

export function setWebSiteSchema() {
  inject("ld-webpage", {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Mizan Platform — منصة ميزان",
    url: SITE,
    description: "The leading Moroccan digital legal journal and academic archive for law students, researchers, and legal professionals.",
    publisher: {
      "@type": "Organization",
      name: "Mizan Platform",
      url: SITE,
    },
    inLanguage: "ar-MA",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE}/ar/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  });
}

export function setLegalArticleSchema(a: {
  headline: string;
  description: string;
  slug: string;
  lang?: string;
  datePublished?: string;
}) {
  const path = a.slug.startsWith("/") ? a.slug : `/${a.slug}`;
  const localePath = `${a.lang === "ar" ? "/ar" : `/${a.lang || "ar"}`}${path}`;

  inject("ld-legal", {
    "@context": "https://schema.org",
    "@type": "LegalArticle",
    headline: a.headline,
    description: a.description,
    url: `${SITE}${localePath}`,
    inLanguage: a.lang === "ar" ? "ar-MA" : `${a.lang}-MA`,
    author: {
      "@type": "Person",
      name: "Mizan Editorial",
    },
    publisher: {
      "@type": "Organization",
      name: "Mizan Platform",
      url: SITE,
    },
    datePublished: a.datePublished,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE}${localePath}`,
    },
  });
}

export function setArticleSchema(a: {
  title: string; description: string; slug: string;
  author?: string; datePublished?: string; category?: string;
  schemaType?: "ScholarlyArticle" | "LegalArticle" | "NewsArticle" | string;
  requiresPaidAccess?: boolean;
  lockedCssSelector?: string;
  lang?: string;
  path?: string;
}) {
  const pagePath = a.path ? (a.path.startsWith("/") ? a.path : `/${a.path}`) : `/article/${a.slug}`;
  const localePath = `${a.lang === "ar" ? "/ar" : `/${a.lang || "ar"}`}${pagePath}`;
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": a.schemaType || "ScholarlyArticle",
    headline: a.title,
    description: a.description,
    url: `${SITE}${localePath}`,
    inLanguage: a.lang === "ar" ? "ar-MA" : `${a.lang}-MA`,
    articleSection: a.category,
    author: { "@type": "Person", name: a.author || "Mizan Editorial" },
    publisher: { "@type": "Organization", name: "Mizan Platform" },
    datePublished: a.datePublished,
  };

  if (a.requiresPaidAccess) {
    data.isAccessibleForFree = "False";
    data.hasPart = {
      "@type": "WebPageElement",
      isAccessibleForFree: "False",
      cssSelector: a.lockedCssSelector || ".premium-content-section",
    };
  }

  inject("ld-article", data);
}

export function setBreadcrumbSchema(items: { name: string; url: string }[]) {
  inject("ld-breadcrumb", {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE}${it.url}`,
    })),
  });
}

export function clearSchema(id: string) {
  document.getElementById(id)?.remove();
}
