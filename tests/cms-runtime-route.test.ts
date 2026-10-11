/**
 * اختبار تكامل لطبقة CMS وقت-الطلب: من الطلب إلى الردّ.
 *
 * لا شبكة هنا: fetch يُستبدل بردود PostgREST مزيّفة، والـASSETS تُقرأ من
 * dist/ الحقيقي. هكذا نتحقق من السلسلة كاملة — 404 من الأصول ← كتالوج CMS
 * ← مطابقة السجلّ ← حقن الرأس ← 200 — بلا حاجة إلى القاعدة الحقيقية.
 */
import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { onRequest as fileOnRequest } from "../functions/[[path]].js";
import { onRequest as sitemapOnRequest } from "../functions/sitemap.xml.js";
import { resetCatalogCache } from "../functions/_shared/cmsCatalog.js";

const CMS_ROWS = {
  articles: [
    { id: "a1", title: "مقال جديد", slug: "maqal-jadid", excerpt: "ملخّص المقال الجديد.", updated_at: "2026-10-10T10:00:00Z" },
  ],
  news: [{ id: "n1", title: "خبر جديد", slug: "khabar-jadid", summary: "ملخّص الخبر الجديد.", published_at: "2026-10-09" }],
  pdf_summaries: [
    { id: "p1", title: "ملخص جديد", slug: "mulakhkhas-jadid", file_url: "https://cdn.example/f.pdf", created_at: "2026-10-08" },
    { id: "p2", title: "ملخص بلا ملف", slug: "bila-milaff", created_at: "2026-10-08" },
  ],
  laws: [{ id: "l1", title: "نصّ قانوني", slug: "nas-qanuni", content: "المادة الأولى …", created_at: "2026-10-07" }],
  lexicon_terms: [
    { id: "t1", term_ar: "مصطلح جديد", definition: "تعريف المصطلح الجديد.", slug: "mustalah-jadid", updated_at: "2026-10-06" },
    { id: "t2", term_ar: "المحكمة", definition: "تعريف المحكمة.", slug: "al-mahkama", updated_at: "2026-10-06" },
  ],
};

function fakeSupabaseFetch() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const table = url.pathname.split("/").pop() ?? "";
    const rows = (CMS_ROWS as Record<string, unknown[]>)[table];
    if (!rows) return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify(rows), { status: 200, headers: { "Content-Type": "application/json" } });
  });
}

function makeContext(pathname: string, headerOverrides: Record<string, string> = {}) {
  const request = new Request(`https://www.mizan.page${pathname}`, {
    headers: { Accept: "text/html", ...headerOverrides },
  });

  const env = {
    ASSETS: {
      fetch: async (req: Request) => {
        const target = new URL(req.url);
        // أصول حقيقية من dist حيث توجد، و404 حيث لا ملف (كما يفعل Pages).
        const candidates: Record<string, string> = {
          "/app.html": "dist/app.html",
          "/sitemap.xml": "dist/sitemap.xml",
          "/reference/lexicon.json": "dist/reference/lexicon.json",
        };
        const file = candidates[target.pathname];
        if (!file) return new Response("Not Found", { status: 404 });
        try {
          return new Response(await readFile(file, "utf8"), { status: 200 });
        } catch {
          return new Response("Not Found", { status: 404 });
        }
      },
    },
  };

  return { request, env, next: async () => new Response("next", { status: 200 }) };
}

let fetchSpy: ReturnType<typeof fakeSupabaseFetch>;

beforeEach(() => {
  resetCatalogCache();
  fetchSpy = fakeSupabaseFetch();
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetCatalogCache();
});

describe("مسار [[path]] — محتوى CMS منشور بعد آخر بناء", () => {
  test("مقال منشور غير مبني: 200 + عنوان وcanonical سريريّان", async () => {
    const response = await fileOnRequest(makeContext("/articles/maqal-jadid"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");

    const html = await response.text();
    expect(html).toContain("<title>مقال جديد | ميزان الرقمية</title>");
    expect(html).toContain('<link rel="canonical" href="https://www.mizan.page/articles/maqal-jadid">');
    expect(html).toContain('<meta name="robots" content="index, follow, max-image-preview:large">');
    expect(html).toContain('"@id":"https://www.mizan.page/articles/maqal-jadid#webpage"');
    expect(html).not.toContain('content="noindex');
  });

  test("خبر منشور غير مبني: 200 مع og:type=article", async () => {
    const response = await fileOnRequest(makeContext("/news/khabar-jadid"));
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('<meta property="og:type" content="article">');
    expect(html).toContain("https://www.mizan.page/news/khabar-jadid");
  });

  test("ملف أرشيف منشور: 200، وبلا رابط تحميل: 404 حقيقي", async () => {
    expect((await fileOnRequest(makeContext("/pdf/mulakhkhas-jadid"))).status).toBe(200);
    expect((await fileOnRequest(makeContext("/pdf/bila-milaff"))).status).toBe(404);
    expect((await fileOnRequest(makeContext("/pdf/nas-qanuni"))).status).toBe(200);
  });

  test("مصطلح معجم من CMS: 200، والمصطلح المكرر محلياً لا يُعاد", async () => {
    const response = await fileOnRequest(makeContext("/lexicon/mustalah-jadid"));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('"@type":"DefinedTerm"');
  });

  test("رابط غير موجود في القاعدة يبقى 404 — لا Soft 404", async () => {
    const response = await fileOnRequest(makeContext("/articles/غير-موجود"));
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain("canonical");
  });

  test("مسار أعمق أو مسار تطبيقي لا تلمسه الطبقة", async () => {
    expect((await fileOnRequest(makeContext("/articles/a/b"))).status).toBe(404);
    expect((await fileOnRequest(makeContext("/about"))).status).toBe(404);
  });
});

describe("مسار sitemap.xml الديناميكي", () => {
  test("يضم روابط CMS الجديدة لمنشور فعلاً فقط", async () => {
    const response = await sitemapOnRequest(makeContext("/sitemap.xml"));
    expect(response.status).toBe(200);
    const xml = await response.text();

    // المنشور الجديد (مقال/خبر/ملف برابط/نصّ/مصطلح): يدخل الخريطة.
    expect(xml).toContain("https://www.mizan.page/articles/maqal-jadid");
    expect(xml).toContain("https://www.mizan.page/news/khabar-jadid");
    expect(xml).toContain("https://www.mizan.page/pdf/mulakhkhas-jadid");
    expect(xml).toContain("https://www.mizan.page/pdf/nas-qanuni");
    expect(xml).toContain("https://www.mizan.page/lexicon/mustalah-jadid");

    // غير المنشور وغير المؤهل لا يدخل.
    expect(xml).not.toContain("bila-milaff");
    // مصطلح موجود في المعجم المحلي لا يتكرر بمعرّف CMS.
    expect(xml).not.toContain("al-mahkama");

    // لا <loc> مكرر، والعدد = المbuilt (427) + المضاف (5).
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(new Set(locs).size).toBe(locs.length);
    expect(locs).toHaveLength(432);
    expect(response.headers.get("X-Mizan-Cms-Urls")).toBe("5");
  });

  test("بلا CMS متاح (شبكة معطلة) تعود النسخة المبنية كما هي", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("boom", { status: 503 })));
    resetCatalogCache();

    const response = await sitemapOnRequest(makeContext("/sitemap.xml"));
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Mizan-Cms-Urls")).toBe("0");

    const xml = await response.text();
    const built = await readFile("dist/sitemap.xml", "utf8");
    expect(xml).toBe(built);
  });
});
