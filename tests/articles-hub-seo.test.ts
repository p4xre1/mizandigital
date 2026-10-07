import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { ARTICLES_HUB_META, buildArticlesHubSchema } from "../shared/seo/articles-hub.js";
import {
  SITE_ORIGIN,
  canonicalArticlesHub,
  isIndexablePath,
} from "../shared/seo/url-policy.js";
import { buildMetaDescription } from "../shared/seo/meta-copy.js";

const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

describe("SEO for the articles hub", () => {
  test("uses a self-canonical, indexable hub URL", () => {
    expect(canonicalArticlesHub()).toBe(`${SITE_ORIGIN}/articles`);
    expect(isIndexablePath("/articles")).toBe(true);
    expect(read("public/sitemap.xml")).toContain(`<loc>${SITE_ORIGIN}/articles</loc>`);
  });

  test("describes the collection and only links to canonical article pages", () => {
    const schemas = buildArticlesHubSchema([
      {
        title: "قراءة النص القانوني",
        slug: "reading-legal-text",
        summary: "خطوات لفهم النص وتحليله.",
        date: "2026-07-27",
      },
      {
        name: "مقال من لوحة التحكم",
        path: "/articles/cms-guide",
        summary: "شرح تطبيقي.",
        item: { published_at: "2026-10-01" },
      },
      { title: "سجل بلا رابط" },
    ]);

    expect(schemas.map((schema) => schema["@type"])).toEqual(["CollectionPage", "ItemList"]);
    expect(schemas[0]!.url).toBe(`${SITE_ORIGIN}/articles`);
    expect(schemas[0]!.mainEntity!["@id"]).toBe(`${SITE_ORIGIN}/articles#article-list`);
    expect(schemas[1]!.numberOfItems).toBe(2);
    expect(schemas[1]!.itemListElement!.map((entry) => entry.item.url)).toEqual([
      `${SITE_ORIGIN}/articles/reading-legal-text`,
      `${SITE_ORIGIN}/articles/cms-guide`,
    ]);
    expect(schemas[1]!.itemListElement![0]!.item.datePublished).toBe("2026-07-27T00:00:00.000Z");
  });

  test("browser and prerender share the same title, description, and intro", () => {
    const browser = read("src/pages/public/ArticlesPage.tsx");
    const prerender = read("scripts/prerender.mjs");
    const expectedMetaDescription = buildMetaDescription(ARTICLES_HUB_META.description, [
      ARTICLES_HUB_META.metaContext,
    ]);

    expect(browser).toContain("const pageTitle = ARTICLES_HUB_META.title");
    expect(browser).toContain("buildMetaDescription(ARTICLES_HUB_META.description");
    expect(browser).toContain("{ARTICLES_HUB_META.intro}");
    expect(prerender).toContain("title: ARTICLES_HUB_META.title");
    expect(prerender).toContain("description: ARTICLES_HUB_META.description");
    expect(prerender).toContain("metaContext: [ARTICLES_HUB_META.metaContext]");
    expect(prerender).toContain("escapeHtml(ARTICLES_HUB_META.intro)");
    expect(expectedMetaDescription.length).toBeGreaterThanOrEqual(140);
    expect(expectedMetaDescription.length).toBeLessThanOrEqual(160);
  });
});
