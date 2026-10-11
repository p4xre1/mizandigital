/**
 * اختبار تكامل لطبقة CMS وقت-الطلب: من الطلب إلى الردّ.
 *
 * لا شبكة هنا: fetch يُستبدل بردود PostgREST مزيّفة، والـASSETS تُقرأ من
 * dist/ الحقيقي حيث يوجد. هكذا نتحقق من السلسلة كاملة — 404 من الأصول ←
 * كتالوج CMS ← مطابقة السجلّ ← حقن الرأس ← 200 — بلا حاجة إلى القاعدة
 * الحقيقية.
 *
 * ولأن job «validate» في ci.yml يشغّل `pnpm test` **بدون بناء**، لا يوجد
 * dist/ هناك؛ فيُستعمل بديل مصغّر (fixture) يحمل نفس الخصائص التي تعتمد
 * عليها الطبقة: هيكل تطبيق بوسم `noindex, follow` و`og:type=website`،
 * خريطة مبنية بـ<loc>ات، ومعجم محلي فيه المصطلح المكرر. الاختبارات تقيس
 * دائماً «قاعدة + إضافات CMS» لا أرقاماً مطلقة، فتنجح في الحالتين.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { onRequest as fileOnRequest } from "../functions/[[path]].js";
import { onRequest as sitemapOnRequest } from "../functions/sitemap.xml.js";
import { resetCatalogCache } from "../functions/_shared/cmsCatalog.js";
import { resetLocalLexiconCache } from "../functions/_shared/localLexicon.js";

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

/** هيكل تطبيق مصغّر: نفس الوسوم التي تعدّلها الطبقة في dist/app.html. */
const FIXTURE_SHELL = `<!doctype html>
<html lang="ar-MA" dir="rtl" class="dark">
<head>
<meta charset="UTF-8">
<title>ميزان الرقمية — المنصة</title>
<meta name="description" content="صفحة داخل منصة ميزان الرقمية.">
<meta name="robots" content="noindex, follow">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ميزان الرقمية">
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[{"@type":"WebSite","@id":"https://www.mizan.page/#website","url":"https://www.mizan.page","name":"ميزان الرقمية"}]}
</script>
</head>
<body><div id="root"></div></body>
</html>
`;

/** خريطة مبنية مصغّرة: 3 روابط ثابتة. */
const FIXTURE_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.mizan.page/</loc>
    <lastmod>2026-10-01</lastmod>
  </url>
  <url>
    <loc>https://www.mizan.page/about</loc>
    <lastmod>2026-10-01</lastmod>
  </url>
  <url>
    <loc>https://www.mizan.page/lexicon</loc>
    <lastmod>2026-10-01</lastmod>
  </url>
</urlset>
`;

/** معجم محلي مصغّر: يحوي «المحكمة» ليُختبر استثناء المكرر. */
const FIXTURE_LEXICON = JSON.stringify({
  dataset: "lexicon",
  count: 2,
  items: [
    { id: "al-mahkama", term_ar: "المحكمة", definition: "جهة القضاء." },
    { id: "personne-morale", term_ar: "الشخص المعنوي", definition: "شخصية مستقلة." },
  ],
});

const DIST_FILES: Record<string, string> = {
  "/app.html": "dist/app.html",
  "/sitemap.xml": "dist/sitemap.xml",
  "/reference/lexicon.json": "dist/reference/lexicon.json",
};
const FIXTURE_FILES: Record<string, string> = {
  "/app.html": FIXTURE_SHELL,
  "/sitemap.xml": FIXTURE_SITEMAP,
  "/reference/lexicon.json": FIXTURE_LEXICON,
};

const DIST_READY = Object.values(DIST_FILES).every((file) => existsSync(file));

/** مصدر الأصل: الملف الحقيقي من dist إن بُني، وإلا البديل المصغّر. */
async function assetSource(pathname: string) {
  if (!DIST_READY) return FIXTURE_FILES[pathname];
  try {
    return await readFile(DIST_FILES[pathname], "utf8");
  } catch {
    return undefined;
  }
}

/** عدد <loc> في الخريطة المبنية (القاعدة التي تُقاس عليها الإضافات). */
async function baseLocCount() {
  const base = (await assetSource("/sitemap.xml")) ?? "";
  return [...base.matchAll(/<loc>/g)].length;
}

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
        // الأصول كما يخدمها Pages: ملف حيث يوجد، و404 حيث لا يوجد.
        const body = await assetSource(target.pathname);
        if (body === undefined) return new Response("Not Found", { status: 404 });
        return new Response(body, { status: 200 });
      },
    },
  };

  return { request, env, next: async () => new Response("next", { status: 200 }) };
}

let fetchSpy: ReturnType<typeof fakeSupabaseFetch>;

beforeEach(() => {
  resetCatalogCache();
  resetLocalLexiconCache();
  fetchSpy = fakeSupabaseFetch();
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetCatalogCache();
  resetLocalLexiconCache();
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

    // «المحكمة» مبنية محلياً: لا تُخدَم من طبقة CMS (تفادي محتوى مكرر).
    const duplicate = await fileOnRequest(makeContext("/lexicon/al-mahkama"));
    expect(duplicate.status).toBe(404);
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
    const base = await baseLocCount();
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

    // لا <loc> مكرر، والعدد = المبنى + المضاف (5).
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(new Set(locs).size).toBe(locs.length);
    expect(locs).toHaveLength(base + 5);
    expect(response.headers.get("X-Mizan-Cms-Urls")).toBe("5");
  });

  test("بلا CMS متاح (شبكة معطلة) تعود النسخة المبنية كما هي", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("boom", { status: 503 })));
    resetCatalogCache();

    const response = await sitemapOnRequest(makeContext("/sitemap.xml"));
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Mizan-Cms-Urls")).toBe("0");

    // byte-identical: الفهرسة لا تتغير إطلاقاً بتعطل خدمة خارجية.
    expect(await response.text()).toBe(await assetSource("/sitemap.xml"));
  });
});
