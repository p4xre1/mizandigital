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
    sameAs: [],
  });
}

export function setArticleSchema(a: {
  title: string; description: string; slug: string;
  author?: string; datePublished?: string; category?: string;
}) {
  inject("ld-article", {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    headline: a.title,
    description: a.description,
    url: `${SITE}/article/${a.slug}`,
    inLanguage: "ar",
    articleSection: a.category,
    author: { "@type": "Person", name: a.author || "Mizan Editorial" },
    publisher: { "@type": "Organization", name: "Mizan Platform" },
    datePublished: a.datePublished,
  });
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
