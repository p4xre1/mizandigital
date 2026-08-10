import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, "../public/sitemap.xml");

const DOMAIN = "https://www.mizan.page";
const LANGS = ["ar", "fr", "en", "es"];

const PATHS = [
  "",
  "/about",
  "/archive",
  "/library",
  "/news",
  "/schools",
];

const TODAY = new Date().toISOString().split("T")[0];

function normalizePath(path = "") {
  const normalized = `/${path}`
    .replace(/\/+/g, "/")
    .replace(/\/+$/, "");

  return normalized === "/" ? "" : normalized;
}

function buildUrl(lang, path = "") {
  return `${DOMAIN}/${lang}${normalizePath(path)}`;
}

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildAlternateLinks(path) {
  const links = LANGS.map((lang) => {
    const href = escapeXml(buildUrl(lang, path));

    return `    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}" />`;
  });

  const defaultHref = escapeXml(buildUrl("ar", path));

  links.push(
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${defaultHref}" />`
  );

  return links.join("\n");
}

function generateSitemapEntries() {
  const entries = [];

  for (const path of PATHS) {
    for (const lang of LANGS) {
      const loc = escapeXml(buildUrl(lang, path));
      const isHome = path === "";
      const isNews = path === "/news";

      const priority = isHome
        ? "1.0"
        : isNews
          ? "0.95"
          : path === "/about"
            ? "0.8"
            : "0.9";

      const changefreq =
        isHome || isNews || path === "/archive" ? "daily" : "weekly";

      entries.push(`  <url>
    <loc>${loc}</loc>
${buildAlternateLinks(path)}
    <lastmod>${TODAY}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`);
    }
  }

  return entries.join("\n");
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
${generateSitemapEntries()}
</urlset>
`;

await writeFile(OUTPUT, xml, "utf8");

console.log("✅ Master clean sitemap.xml generated successfully at:", OUTPUT);