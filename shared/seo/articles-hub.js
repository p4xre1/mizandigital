import { SITE_ORIGIN, canonicalArticle, canonicalUrl } from "./url-policy.js";

/** Metadata and introductory copy shared by the browser and prerendered page. */
export const ARTICLES_HUB_META = Object.freeze({
  title: "المقالات والدراسات القانونية",
  description: "مقالات ودراسات تحليلية في مختلف فروع القانون المغربي.",
  metaContext: "مقالات ومنهجيات قانونية موجهة لطلبة الحقوق والباحثين في المغرب.",
  intro:
    "تجمع هذه الصفحة شروحات القانون المغربي والدراسات التطبيقية وإرشادات منهجية البحث والقراءة القانونية. استخدم البحث أو التصنيف للوصول إلى الموضوع المناسب، وافتح أي عنوان لقراءة المقال كاملاً.",
});

const cleanDescription = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);

function publishedDate(item) {
  const value =
    item.date ??
    item.publishedAt ??
    item.published_at ??
    item.updatedAt ??
    item.updated_at ??
    item.created_at;
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function itemUrl(item, source) {
  const rawUrl = item.url ?? item.path ?? source.url ?? source.path;
  if (rawUrl) return canonicalUrl(rawUrl);

  const slug = item.slug ?? source.slug;
  return slug ? canonicalArticle(slug) : null;
}

/**
 * Build indexable collection/list JSON-LD from the same article records used
 * to render the hub. Accepts either UI items or prerender entries.
 */
export function buildArticlesHubSchema(items = []) {
  const url = canonicalUrl("/articles");
  const listId = `${url}#article-list`;
  const normalized = (Array.isArray(items) ? items : [])
    .map((item) => {
      const source = item?.item && typeof item.item === "object" ? item.item : item;
      const title = String(item?.title ?? item?.name ?? source?.title ?? "").trim();
      const href = itemUrl(item ?? {}, source ?? {});
      if (!title || !href) return null;

      const description = cleanDescription(
        item?.summary ?? item?.excerpt ?? source?.excerpt ?? source?.meta_description ?? source?.summary,
      );
      const datePublished = publishedDate({ ...source, ...item });

      return {
        title,
        url: href,
        description,
        datePublished,
      };
    })
    .filter(Boolean)
    .slice(0, 30);

  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${url}#collection`,
      url,
      name: ARTICLES_HUB_META.title,
      description: ARTICLES_HUB_META.description,
      inLanguage: "ar-MA",
      isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
      mainEntity: { "@id": listId },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": listId,
      name: ARTICLES_HUB_META.title,
      description: ARTICLES_HUB_META.description,
      numberOfItems: normalized.length,
      itemListElement: normalized.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Article",
          "@id": `${item.url}#article`,
          headline: item.title,
          description: item.description || undefined,
          datePublished: item.datePublished,
          url: item.url,
        },
      })),
    },
  ];
}
