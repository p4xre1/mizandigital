import { readFileSync } from "node:fs";
import { test, expect } from "vitest";
import articles from "../src/data/articles.json";
import documents from "../src/data/docs.json";
import events from "../src/data/events.json";
import lexicon from "../src/data/lexicon.json";
import schools from "../src/data/schools.json";

const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("the document shell is Arabic-only and free from legacy advertising tags", () => {
  const index = read("index.html");
  expect(index).toContain('<html lang="ar" dir="rtl" class="dark">');
  expect(index).not.toContain("google-adsense-account");
  expect(index).not.toContain("images.unsplash.com");
  expect(index).not.toContain("challenges.cloudflare.com");
  expect(index).toContain("G-XXXXXXXXXX");
  expect(index).not.toContain('hreflang="fr"');
  expect(index).not.toContain('hreflang="en"');
  expect(index).not.toContain('hreflang="es"');
});

test("static routes and local data are available", () => {
  const sitemap = read("public/sitemap.xml");
  expect(sitemap).toContain("https://www.mizan.page/");
  expect(sitemap).toContain("https://www.mizan.page/archive");
  expect(sitemap).toContain("https://www.mizan.page/news");
  expect(sitemap).toContain("https://www.mizan.page/events");
  expect(sitemap).toContain("https://www.mizan.page/schools");
  expect(sitemap).toContain("https://www.mizan.page/lexicon");
  expect(documents.every((doc) => /^S[1-5]$/.test(doc.semester))).toBe(true);
  expect(documents.every((doc) => doc.fileUrl.startsWith("/docs/"))).toBe(true);
  expect(lexicon.every((term) => term.term_ar && term.term_fr && term.definition)).toBe(true);
  expect(articles.every((article) => article.slug && article.body.length > 0)).toBe(true);
  expect(events.every((event) => event.slug && event.sourceUrl.startsWith("https://"))).toBe(true);
  expect(schools.every((school) => school.slug && school.officialUrl.startsWith("https://"))).toBe(true);
  expect(sitemap).toContain(`https://www.mizan.page/news/${articles.find((article) => article.type === "news")?.slug}`);
  expect(sitemap).toContain(`https://www.mizan.page/events/${events[0].slug}`);
  expect(sitemap).toContain(`https://www.mizan.page/schools/${schools[0].slug}`);
  expect(sitemap).toContain(`https://www.mizan.page/lexicon/${lexicon[0].id}`);
});
