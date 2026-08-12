import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, "../public/sitemap.xml");

const DOMAIN = "https://www.mizan.page";
const PATHS = [
  "",
  "/s4",
  "/lexicon",
];

const TODAY = new Date().toISOString().split("T")[0];

function normalizePath(path = "") {
  const normalized = `/${String(path).trim()}`
    .replace(/\/+/g, "/")
    .replace(/\/+$/, "");

  return normalized === "/" ? "" : normalized;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function generateSitemapEntries() {
  const entries = [];

  for (const path of PATHS) {
    const loc = escapeXml(`${DOMAIN}${normalizePath(path)}`);
    const isHome = path === "";
    entries.push(`  <url>
    <loc>${loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${isHome ? "daily" : "weekly"}</changefreq>
    <priority>${isHome ? "1.0" : "0.9"}</priority>
  </url>`);
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

console.log("✅ Clean sitemap.xml generated successfully:", OUTPUT);
