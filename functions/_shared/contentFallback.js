/**
 * بديل وقت-الطلب لرابط CMS لم يُبنَ بعد.
 *
 * الحالة: محرّر ينشر مقالاً/نصّاً/مصطلحاً في لوحة التحكم، والموقع ثابت
 * بُني قبل النشر. الرابط الجديد ليس له ملف في dist، فالطلب عليه يعود 404 —
 * بينما الرابط حقيقي ومنشور، وقد يكون مشتركاً في واتساب أو مدرجاً في
 * sitemap الديناميكي. الحل هنا:
 *
 *   1) نتحقق من القاعدة وقت الطلب: هل السجلّ موجود ومنشور فعلاً؟
 *      (لا: يبقى 404 حقيقياً — لا Soft 404 ولا فهرسة لصفحة غير موجودة.)
 *   2) نعم: نخدم هيكل التطبيق 200 بعد حقن وسوم head الصحيحة — عنوان ووصف
 *      وcanonical وJSON-LD — فيقرأ الزاحف صفحة مطابقة لما يبنيه البناء.
 *      والواجهة تجلب المحتوى بنفسها (ArticlePage/TermPage يقرآن Supabase
 *      بالـslug أصلاً) فيراه المستخدم كاملاً.
 *
 * بعد أول بناء تالٍ يصبح للرابط ملف ثابت، فلا يصل الطلب إلى هذا المسار
 * أصلاً. أي أن هذه الطبقة نافذة انتقالية، لا بديل عن البناء.
 *
 * الوسوم هنا تُبنى بنفس دوال الموقع (brandTitle/buildMetaDescription من
 * shared/seo/meta-copy.js) حتى لا يرى الزاحف عنواناً في الحافة وعنواناً
 * آخر بعد hydration — نفس العطل الذي عالجه مسار brandTitle في SEOHead.
 */

import { buildMetaDescription, brandTitle, sectionContextFor } from "../../shared/seo/meta-copy.js";
import { SITE_ORIGIN, articleSlug, newsSlug } from "../../shared/seo/url-policy.js";
import { isArchivableItem } from "../../shared/archive/links.js";
import { archiveSlug, cmsLexiconSlug, termKey } from "./cmsUrls.js";

/** أقسام المحتوى التي قد تحمل رابط CMS غير مبني: البادئة → النوع. */
const CONTENT_PREFIXES = {
  "/articles/": "article",
  "/news/": "news",
  "/pdf/": "pdf",
  "/lexicon/": "lexicon",
};

/**
 * يطابق مساراً بمقطع واحد بعد البادئة (لا مسارات أعمق: تلك صفحات تطبيقية
 * أو غير موجودة أصلاً، ولا يجوز أن تُخدع بـ200).
 * @returns {{kind: string, slug: string}|null}
 */
export function matchContentPath(pathname) {
  for (const [prefix, kind] of Object.entries(CONTENT_PREFIXES)) {
    if (!pathname.startsWith(prefix)) continue;
    const rest = pathname.slice(prefix.length);
    if (!rest || rest.includes("/")) return null;
    let slug = rest;
    try {
      slug = decodeURIComponent(rest);
    } catch {
      // ترميز غير سليم: نُبقي النصّ كما هو وندع المطابقة تفشل.
    }
    return { kind, slug: slug.trim() };
  }
  return null;
}

/** مطابقة سجلّ في الكتالوج بنفس سلّم معرّفات البناء (slug ← عنوان ← id). */
export function findRecord(catalog = {}, kind, slug) {
  if (!slug) return null;

  const bySlug = (rows, slugOf) => {
    const rowsList = rows ?? [];
    const exact = rowsList.find((row) => slugOf(row) === slug);
    if (exact) return exact;
    // معرّف البناء يفصل تكرار المعرّفات بلاحقة المعرّف (-<id>) — نطابقها كذلك.
    // تحويل صريح إلى Boolean: سابقاً كان `row.id && slug === ...` يُسلسَل إلى
    // النصّ "false" وهو truthy فيقبل find أي صفّ — أي صفحة لأي معرّف مجهول.
    return rowsList.find((row) => {
      const base = slugOf(row);
      const id = row?.id;
      return Boolean(base && id) && slug === `${base}-${id}`;
    });
  };

  if (kind === "article" || kind === "news") {
    // نفس دالة المعرّف المستعملة في البناء والواجهة: slug ← عنوان ← id.
    const rows = kind === "article" ? catalog.articles : catalog.news;
    return bySlug(rows, (row) => (kind === "article" ? articleSlug(row) : newsSlug(row))) ?? null;
  }

  if (kind === "pdf") {
    const rows = [...(catalog.pdfs ?? []), ...(catalog.laws ?? [])].filter(isArchivableItem);
    return bySlug(rows, archiveSlug) ?? null;
  }

  if (kind === "lexicon") {
    const rows = catalog.lexicon ?? [];
    return (
      rows.find((row) => cmsLexiconSlug(row) === slug) ??
      rows.find((row) => String(row?.id ?? "") === slug) ??
      rows.find((row) => termKey(row?.term_ar) && termKey(row.term_ar) === termKey(slug)) ??
      null
    );
  }

  return null;
}

function truncate(value, max) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/**
 * وسوم الرأس لسجلّ CMS: عنوان، وصف، ونوع og، وعقد JSON-LD.
 *
 * @param {any} record سجلّ CMS (عنوان/وصف/تاريخ حسب النوع)
 * @param {"article"|"news"|"pdf"|"lexicon"} kind
 * @param {{ origin?: string, canonical?: string }} [options]
 * @returns {{title: string, description: string, ogType: string, jsonLd: any[]}}
 */
export function buildContentHead(record, kind, { origin = SITE_ORIGIN, canonical } = {}) {
  const rawTitle = record?.meta_title || record?.title || record?.term_ar || "";
  const title = brandTitle(rawTitle);

  const contextPath =
    kind === "article" ? "/articles" : kind === "news" ? "/news" : kind === "pdf" ? "/pdf" : "/lexicon";
  const description = buildMetaDescription(
    record?.meta_description || record?.excerpt || record?.summary || record?.description || record?.definition,
    [sectionContextFor(contextPath)],
  );

  const url = canonical || origin;
  const datePublished = record?.published_at || record?.created_at || "";
  const dateModified = record?.updated_at || datePublished;

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: title,
    description,
    inLanguage: "ar-MA",
    isPartOf: { "@id": `${origin}/#website` },
    publisher: { "@id": `${origin}/#organization` },
  };

  /** @type {any[]} */
  const jsonLd = [webPage];

  if (kind === "article" || kind === "news") {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "Article",
      "@id": `${url}#article`,
      headline: truncate(record?.title || rawTitle, 110),
      description,
      mainEntityOfPage: { "@id": url },
      inLanguage: "ar-MA",
      publisher: { "@id": `${origin}/#organization` },
      ...(datePublished ? { datePublished: String(datePublished).slice(0, 10) } : {}),
      ...(dateModified ? { dateModified: String(dateModified).slice(0, 10) } : {}),
    });
  } else if (kind === "lexicon") {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "DefinedTerm",
      "@id": `${url}#term`,
      name: truncate(record?.term_ar, 80),
      description,
      inDefinedTermSet: { "@id": `${origin}/lexicon` },
      ...(record?.term_fr ? { alternateName: truncate(record.term_fr, 80) } : {}),
    });
  }

  return {
    title,
    description,
    ogType: kind === "article" || kind === "news" ? "article" : "website",
    jsonLd,
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * يستبدل محتوى وسم meta إن وُجد، ويُضيفه قبل </head> إن غاب.
 * الإضافة مقصودة: هيكل التطبيق قد يتغيّر، والسقوط الصامت إلى وسم الرئيسية
 * (og:type=website على مقال) عطل لا يظهر في أي فحص — فلا نتركه للصدفة.
 */
function setMetaContent(html, attr, name, value) {
  const pattern = new RegExp(`(<meta\\s+${attr}="${name}"\\s+content=")[^"]*(")`, "i");
  if (pattern.test(html)) return html.replace(pattern, `$1${escapeHtml(value)}$2`);
  return html.replace(/<\/head>/i, `  <meta ${attr}="${name}" content="${escapeHtml(value)}">\n  </head>`);
}

/**
 * يحقن وسوم head في هيكل التطبيق (app.html):
 *   • استبدال ما هو موجود أصلاً (title/description/robots/og/twitter) فلا
 *     يبقى وسمان يتناقضان — app.html نفسه noindex ويصف الرئيسية.
 *   • إضافة canonical وJSON-LD قبل </head>.
 * دالة خالصة (نصّ → نصّ) لتقيسها الاختبارات.
 */
/**
 * @param {string} html
 * @param {{ title: string, description: string, canonical: string, ogType?: string, jsonLd?: any[] }} head
 * @returns {string}
 */
export function injectContentHead(html, { title, description, canonical, ogType = "website", jsonLd = [] }) {
  let out = String(html ?? "");

  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

  out = setMetaContent(out, "name", "description", description);
  // app.html يحمل noindex لأن مساراته التطبيقية خاصة؛ هنا الصفحة محتوى
  // منشور فعلاً، فتُقلب إلى index — وإلا عاد سؤال URL Inspection
  // «Indexing allowed? = No» على محتوى سليم.
  out = setMetaContent(out, "name", "robots", "index, follow, max-image-preview:large");
  out = setMetaContent(out, "name", "googlebot", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
  out = setMetaContent(out, "name", "bingbot", "index, follow, max-image-preview:large");
  out = setMetaContent(out, "property", "og:type", ogType);
  out = setMetaContent(out, "property", "og:url", canonical);
  out = setMetaContent(out, "property", "og:title", title);
  out = setMetaContent(out, "property", "og:description", description);
  out = setMetaContent(out, "name", "twitter:title", title);
  out = setMetaContent(out, "name", "twitter:description", description);

  const tags = [
    // canonical: لا يُضاف إن كان المستند يحمله أصلاً (نظافة، لا تكرار).
    ...(/<link\s+rel="canonical"/i.test(out) ? [] : [`<link rel="canonical" href="${escapeHtml(canonical)}">`]),
    ...jsonLd.map(
      (node) => `<script type="application/ld+json">${JSON.stringify(node).replace(/</g, "\\u003c")}</script>`,
    ),
  ].filter(Boolean);

  return out.replace(/<\/head>/i, `    ${tags.join("\n    ")}\n  </head>`);
}
