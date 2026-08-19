import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, "../public/sitemap.xml");
const DATA = join(__dirname, "../src/data");
const DOMAIN = "https://www.mizan.page";

const readJson = async (name) => JSON.parse(await readFile(join(DATA, name), "utf8"));
const [articles, events, schools, lexicon, news] = await Promise.all([
  readJson("articles.json"),
  readJson("events.json"),
  readJson("schools.json"),
  readJson("lexicon.json"),
  readJson("news.json"),
]);

/**
 * جلب المقالات والأخبار المنشورة (status = published) من قاعدة بيانات Supabase (لوحة تحكم الـ CMS).
 * هذا أساسي لأن أي محتوى ينشره المحرر عبر لوحة التحكم لا يظهر داخل ملفات JSON المحلية إطلاقاً،
 * وبالتالي كان يبقى غائباً كلياً عن sitemap.xml وعن فهرسة Google رغم كونه منشوراً فعلياً على الموقع.
 * في حال غياب بيانات الاتصال (بيئة بدون .env) أو تعذر الاتصال بالشبكة، نتجاهل الخطأ بهدوء
 * ونكتفي بالمحتوى المحلي كي لا يفشل الـ build بالكامل بسبب السايتماب.
 */
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
          .select("slug, updated_at, published_at, created_at")
          .eq("status", "published"),
        supabase
          .from("news")
          .select("slug, updated_at, published_at, created_at")
          .eq("is_published", true),
      ]);

    if (articlesError) console.warn("⚠️  sitemap: تعذر جلب مقالات CMS —", articlesError.message);
    if (newsError) console.warn("⚠️  sitemap: تعذر جلب أخبار CMS —", newsError.message);

    return {
      cmsArticles: cmsArticles || [],
      cmsNews: cmsNews || [],
    };
  } catch (err) {
    console.warn("⚠️  sitemap: تعذر الاتصال بـ Supabase، سيتم الاعتماد على البيانات المحلية فقط —", err.message);
    return { cmsArticles: [], cmsNews: [] };
  }
}

const { cmsArticles, cmsNews } = await fetchPublishedCmsContent();

const generateSlug = (text = "") => {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[\s\/\\_]+/g, "-")
    .replace(/[^\w\u0600-\u06FF\-]+/g, "")
    .replace(/\-+$/, "");
};

const staticEntries = [
  { path: "", changefreq: "weekly", priority: "1.0" },
  { path: "/archive", changefreq: "weekly", priority: "0.9" },
  { path: "/news", changefreq: "weekly", priority: "0.9" },
  { path: "/articles", changefreq: "weekly", priority: "0.8" },
  { path: "/events", changefreq: "weekly", priority: "0.8" },
  { path: "/schools", changefreq: "monthly", priority: "0.8" },
  { path: "/lexicon", changefreq: "weekly", priority: "0.9" },
  { path: "/about", changefreq: "monthly", priority: "0.5" },
  { path: "/contact", changefreq: "yearly", priority: "0.4" },
  { path: "/faq", changefreq: "monthly", priority: "0.5" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/cookies", changefreq: "yearly", priority: "0.3" },
  { path: "/s1", changefreq: "weekly", priority: "0.9" },
  { path: "/s2", changefreq: "weekly", priority: "0.9" },
  { path: "/s3", changefreq: "weekly", priority: "0.9" },
  { path: "/s4", changefreq: "weekly", priority: "0.9" },
  { path: "/s5", changefreq: "weekly", priority: "0.9" },
  { path: "/s6", changefreq: "weekly", priority: "0.9" },
];

const dynamicEntries = [
  ...articles.map((item) => {
    const slug = item.slug || generateSlug(item.title);
    const prefix = item.type === "news" ? "/news" : "/articles";
    return {
      path: `${prefix}/${slug}`,
      lastmod: item.updatedAt,
      changefreq: "monthly",
      priority: "0.8",
    };
  }),
  ...news.map((item) => {
    const slug = item.slug || generateSlug(item.title);
    return {
      path: `/news/${slug}`,
      lastmod: item.date || item.updatedAt,
      changefreq: "monthly",
      priority: "0.8",
    };
  }),
  // مقالات لوحة تحكم الـ CMS (Supabase) — منشورة فقط
  ...cmsArticles
    .filter((item) => item.slug)
    .map((item) => ({
      path: `/articles/${item.slug}`,
      lastmod: (item.updated_at || item.published_at || item.created_at || "").slice(0, 10),
      changefreq: "monthly",
      priority: "0.8",
    })),
  // أخبار لوحة تحكم الـ CMS (Supabase) — منشورة فقط
  ...cmsNews
    .filter((item) => item.slug)
    .map((item) => ({
      path: `/news/${item.slug}`,
      lastmod: (item.updated_at || item.published_at || item.created_at || "").slice(0, 10),
      changefreq: "monthly",
      priority: "0.8",
    })),
  ...events.map((item) => {
    const slug = item.slug || generateSlug(item.title);
    return { 
      path: `/events/${slug}`, 
      lastmod: item.eventDate, 
      changefreq: "monthly", 
      priority: "0.7" 
    };
  }),
  ...schools.map((item) => {
    const slug = item.slug || generateSlug(item.name);
    return { 
      path: `/schools/${slug}`, 
      lastmod: item.verifiedAt, 
      changefreq: "monthly", 
      priority: "0.7" 
    };
  }),
  ...lexicon.map((item) => {
    const slug = generateSlug(item.term_ar) || item.id;
    return {
      path: `/lexicon/${slug}`,
      changefreq: "monthly",
      priority: "0.7",
    };
  }),
];

const today = new Date().toISOString().slice(0, 10);
const escapeXml = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const normalizePath = (value = "") => {
  const path = `/${value}`.replace(/\/+/g, "/").replace(/\/+$/, "");
  return path === "/" ? "" : path;
};

// إزالة الروابط المكررة (قد يتقاطع محتوى CMS مع ملفات JSON المحلية أثناء الترحيل)، مع تفضيل آخر ظهور (بيانات CMS الحية)
const allEntries = [...staticEntries, ...dynamicEntries];
const dedupedByPath = Array.from(
  new Map(allEntries.map((entry) => [normalizePath(entry.path), entry])).values()
);

const entries = dedupedByPath
  .map((entry) => `  <url>
    <loc>${escapeXml(`${DOMAIN}${normalizePath(entry.path)}`)}</loc>
    <lastmod>${entry.lastmod || today}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`)
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;

await writeFile(OUTPUT, xml, "utf8");
console.log(
  `Generated ${dedupedByPath.length} sitemap entries (${cmsArticles.length} CMS articles + ${cmsNews.length} CMS news included).`
);