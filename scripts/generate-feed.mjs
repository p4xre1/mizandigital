// scripts/generate-feed.mjs
// يولّد public/feed.xml (RSS 2.0) من المقالات والأخبار المحلية (JSON) وأيضاً
// من المحتوى المنشور عبر CMS (Supabase)، لتمكين التجميع والنشر عبر أطراف
// ثالثة (قارئات RSS، مجمّعات الأخبار، ووكلاء الذكاء الاصطناعي القادرين على
// متابعة feed.xml بدل إعادة زحف الموقع كاملاً).
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SITE_ORIGIN as DOMAIN,
  articleSlug,
  canonicalArticle,
  canonicalNews,
  newsSlug,
  slugify,
} from "../shared/seo/url-policy.js";
import { fetchPublishedCmsContent } from "./lib/cms-content.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, "../public/feed.xml");
const DATA = join(__dirname, "../src/data");
const MAX_ITEMS = 60;

const readJson = async (name) => JSON.parse(await readFile(join(DATA, name), "utf8"));
const [articles, news] = await Promise.all([
  readJson("articles.json"),
  readJson("news.json"),
]);

// المحتوى المنشور من لوحة التحكم: نفس وحدة sitemap/prerender، وبنفس criterion
// النشر (articles.status = published). كان السكربت السابق يجلب المقالات
// بلا فلتر الحالة، فدخلت المسوّدات في التغذية العامة — ثم يطلب updated_at
// من جدول news وهو عمود غير موجود، فيرجع الجدول فارغاً بصمت.
const cms = await fetchPublishedCmsContent({ timeoutMs: 20000 });
const cmsArticles = cms.articles;
const cmsNews = cms.news;

if (!cms.ok) console.warn(`⚠️  feed: ${cms.error} — يُكتفى بالمحتوى المحلي.`);

// معرّفCONTENT من سياسة الروابط: الرابط في التغذية يجب أن يطابق الملف الذي
// يولّده prerender، وإلا ضغط القارئ على رابط 404.
const generateSlug = (text = "") => slugify(text);

const toRfc822 = (dateLike) => {
  const d = dateLike ? new Date(dateLike) : new Date();
  return Number.isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
};

const escapeXml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const items = [
  ...articles.map((item) => ({
    title: item.title,
    link: canonicalArticle(articleSlug(item)),
    description: item.excerpt || "",
    category: item.category || "مقالات",
    pubDate: item.publishedAt || item.updatedAt,
    guid: canonicalArticle(articleSlug(item)),
  })),
  ...news.map((item) => ({
    title: item.title,
    link: canonicalNews(newsSlug(item)),
    description: item.summary || "",
    category: item.category || "أخبار",
    pubDate: item.date,
    guid: canonicalNews(newsSlug(item)),
  })),
  ...cmsArticles
  .filter((item) => item.slug)
  .map((item) => ({
    title: item.title,
    link: canonicalArticle(item.slug),
    description: item.meta_description || item.excerpt || "",
    category: "مقالات",
    pubDate: item.published_at || item.created_at,
    guid: canonicalArticle(item.slug),
  })),
  ...cmsNews
    .filter((item) => item.slug)
    .map((item) => ({
      title: item.title,
      link: canonicalNews(item.slug),
      description: item.summary || "",
      category: "أخبار",
      pubDate: item.published_at || item.created_at,
      guid: canonicalNews(item.slug),
    })),
]
  // إزالة التكرار بحسب الرابط (المحتوى المحلي قد يتداخل مع نسخة CMS لاحقاً)
  .filter((item, index, arr) => arr.findIndex((other) => other.link === item.link) === index)
  .sort((a, b) => new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime())
  .slice(0, MAX_ITEMS);

const buildDate = new Date().toUTCString();

const rssItems = items
  .map(
    (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>
      <pubDate>${toRfc822(item.pubDate)}</pubDate>
      <category>${escapeXml(item.category)}</category>
      <description><![CDATA[${item.description}]]></description>
    </item>`
  )
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ميزان الرقمية — Mizan Digital</title>
    <link>${DOMAIN}</link>
    <atom:link href="${DOMAIN}/feed.xml" rel="self" type="application/rss+xml" />
    <description>آخر المقالات والمستجدات التشريعية والقضائية على منصة الميزان الرقمية، المرجع القانوني المغربي لطلبة القانون والمهتمين.</description>
    <language>ar-ma</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <generator>Mizan Digital Feed Generator</generator>
    <image>
      <url>${DOMAIN}/icon-512.png</url>
      <title>ميزان الرقمية — Mizan Digital</title>
      <link>${DOMAIN}</link>
    </image>
${rssItems}
  </channel>
</rss>
`;

await writeFile(OUTPUT, xml, "utf8");
console.log(
  `Generated feed.xml with ${items.length} items (${cmsArticles.length} CMS articles + ${cmsNews.length} CMS news included).`
);
