import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

const entries = [...staticEntries, ...dynamicEntries].map((entry) => `  <url>
    <loc>${escapeXml(`${DOMAIN}${normalizePath(entry.path)}`)}</loc>
    <lastmod>${entry.lastmod ?? today}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;

await writeFile(OUTPUT, xml, "utf8");
console.log(`Generated ${staticEntries.length + dynamicEntries.length} sitemap entries.`);