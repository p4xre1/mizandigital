import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = "https://www.mizan.page";
const OUTPUT_PATH = path.join(__dirname, "../public/feed.xml");

const rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Mizan Digital - Legal &amp; Technology Platform</title>
    <link>${SITE_URL}</link>
    <description>Official RSS feed for Mizan Digital articles and legal research.</description>
    <language>ar</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  </channel>
</rss>`;

try {
  fs.writeFileSync(OUTPUT_PATH, rssXml, "utf8");
  console.log("✅ Master clean feed.xml generated successfully at:", OUTPUT_PATH);
} catch (err) {
  console.error("❌ Failed to generate feed.xml:", err);
  process.exit(1);
}