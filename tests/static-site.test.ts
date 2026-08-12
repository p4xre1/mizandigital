import { readFileSync } from "node:fs";
import { test, expect } from "vitest";
import documents from "../src/data/docs.json";
import lexicon from "../src/data/lexicon.json";

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
  expect(sitemap).toContain("https://www.mizan.page/s4");
  expect(sitemap).toContain("https://www.mizan.page/lexicon");
  expect(documents.every((doc) => /^S[1-5]$/.test(doc.semester))).toBe(true);
  expect(documents.every((doc) => doc.fileUrl.startsWith("/docs/"))).toBe(true);
  expect(lexicon.every((term) => term.term_ar && term.term_fr && term.definition)).toBe(true);
});
