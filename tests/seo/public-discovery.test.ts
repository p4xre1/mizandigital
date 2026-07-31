import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const readText = (relativePath: string) => {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
};

test("robots.txt exposes discovery files and keeps private areas blocked", () => {
  const robots = readText("public/robots.txt");

  assert.ok(robots.includes("Allow: /feed.xml"));
  assert.ok(robots.includes("Allow: /manifest.json"));
  assert.ok(robots.includes("Disallow: /api/"));
  assert.ok(robots.includes("User-agent: GPTBot"));
});

test("sitemap.xml only lists current public route families", () => {
  const sitemap = readText("public/sitemap.xml");

  for (const route of [
    "https://www.mizan.page/ar/about",
    "https://www.mizan.page/ar/contact",
    "https://www.mizan.page/ar/legal",
    "https://www.mizan.page/ar/news",
    "https://www.mizan.page/ar/library",
    "https://www.mizan.page/ar/archive",
    "https://www.mizan.page/ar/schools",
    "https://www.mizan.page/ar/glossary",
  ]) {
    assert.ok(sitemap.includes(route), `Expected sitemap to include ${route}`);
  }

  for (const legacyRoute of [
    "/ar/law-schools",
    "/ar/laws",
    "/ar/exams/qcm-practice",
    "/ar/dictionary",
  ]) {
    assert.ok(!sitemap.includes(legacyRoute), `Expected sitemap to exclude ${legacyRoute}`);
  }
});

test("_redirects points old aliases to current routes", () => {
  const redirects = readText("public/_redirects");

  assert.match(redirects, /^\/laws\s+\/ar\/library\s+302$/m);
  assert.match(redirects, /^\/law-schools\s+\/ar\/schools\s+301$/m);
  assert.match(redirects, /^\/dictionary\s+\/ar\/glossary\s+301$/m);
  assert.match(redirects, /^\/rss\s+\/feed\.xml\s+301$/m);
});
