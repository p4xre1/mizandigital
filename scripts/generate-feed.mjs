// scripts/generate-feed.mjs
// يولّد public/feed.xml (RSS 2.0) من المقالات والأخبار المحلية (JSON) وأيضاً
// من المحتوى المنشور عبر CMS (Supabase)، لتمكين التجميع والنشر عبر أطراف
// ثالثة (قارئات RSS، مجمّعات الأخبار، ووكلاء الذكاء الاصطناعي القادرين على
// متابعة feed.xml بدل إعادة زحف الموقع كاملاً).
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, "../public/feed.xml");
const DATA = join(__dirname, "../src/data");
const DOMAIN = "https://www.mizan.page";
const MAX_ITEMS = 60;

const readJson = async (name) => JSON.parse(await readFile(join(DATA, name), "utf8"));
const [articles, news] = await Promise.all([
  readJson("articles.json"),
  readJson("news.json"),
]);

async function fetchPublishedCmsContent() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://rfhjmtdblmarhlfftlmg.supabase.co";
  const supabaseAnonKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmaGptdGRibG1hcmhsZmZ0bG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMTE5NzgsImV4cCI6MjA5OTc4Nzk3OH0.uI2_WCQSERz0jgYPuy1-AiWuVtDcJlFKd7hZsaQ1r5Q";

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const [{ data: cmsArticles, error: articlesError }, { data: cmsNews, error: newsError }] =
      await Promise.all([
        supabase
          .from("articles")
          .select("title, slug, excerpt, meta_description, published_at, created_at")
          .order("published_at", { ascending: false })
          .limit(MAX_ITEMS),
        supabase
          .from("news")
          .select("title, slug, summary, source, published_at, created_at")
          .eq("is_published", true)
          .order("published_at", { ascending: false })
          .limit(MAX_ITEMS),
      ]);

    if (articlesError) console.warn("⚠️  feed: تعذر جلب مقالات CMS —", articlesError.message);
    if (newsError) console.warn("⚠️  feed: تعذر جلب أخبار CMS —", newsError.message);

    return { cmsArticles: cmsArticles || [], cmsNews: cmsNews || [] };
  } catch (err) {
    console.warn("⚠️  feed: تعذر الاتصال بـ Supabase، سيتم الاعتماد على البيانات المحلية فقط —", err.message);
    return { cmsArticles: [], cmsNews: [] };
  }
}

const { cmsArticles, cmsNews } = await fetchPublishedCmsContent();

const generateSlug = (text = "") =>
  String(text)
    .trim()
    .toLowerCase()
    .replace(/[\s\/\\_]+/g, "-")
    .replace(/[^\w\u0600-\u06FF\-]+/g, "")
    .replace(/\-+$/, "");

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
    link: `${DOMAIN}/articles/${item.slug || generateSlug(item.title)}`,
    description: item.excerpt || "",
    category: item.category || "مقالات",
    pubDate: item.publishedAt || item.updatedAt,
    guid: `${DOMAIN}/articles/${item.slug || generateSlug(item.title)}`,
  })),
  ...news.map((item) => ({
    title: item.title,
    link: `${DOMAIN}/news/${item.slug || item.id}`,
    description: item.summary || "",
    category: item.category || "أخبار",
    pubDate: item.date,
    guid: `${DOMAIN}/news/${item.slug || item.id}`,
  })),
  ...cmsArticles
  .filter((item) => item.slug)
  .map((item) => ({
    title: item.title,
    link: `${DOMAIN}/articles/${item.slug}`,
    description: item.meta_description || item.excerpt || "",
    category: "مقالات",
    pubDate: item.published_at || item.created_at,
    guid: `${DOMAIN}/articles/${item.slug}`,
  })),
  ...cmsNews
    .filter((item) => item.slug)
    .map((item) => ({
      title: item.title,
      link: `${DOMAIN}/news/${item.slug}`,
      description: item.summary || "",
      category: "أخبار",
      pubDate: item.published_at || item.created_at,
      guid: `${DOMAIN}/news/${item.slug}`,
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
