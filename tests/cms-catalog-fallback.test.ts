/**
 * اختبار كتالوج CMS وقت-الطلب عند اختلاف مخطط القاعدة.
 *
 * الحالة الواقعية: lexicon_terms في الإنتاج **ليس فيها عمود slug**، فيرجع
 * PostgREST 400 («Could not find the 'slug' column») وتفرغ نتيجة الجدول كله —
 * أي أن المصطلح الجديد لا يظهر في sitemap.xml ولا تُخدم صفحته. الاستعلام
 * البديل (بدون slug) يجب أن يُجرَّب تلقائياً، لأن slug يُحسب وقت الطلب من
 * term_ar في cmsUrls.js و contentFallback.js.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { loadPublishedCatalog, resetCatalogCache } from "../functions/_shared/cmsCatalog.js";

const LEXICON_ROWS = [
  { id: "t1", term_ar: "مصطلح جديد", definition: "تعريف المصطلح الجديد.", updated_at: "2026-10-06" },
];

function errorResponse(message: string) {
  return new Response(JSON.stringify({ message, code: "42703", details: null, hint: null }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonResponse(rows: unknown[]) {
  return new Response(JSON.stringify(rows), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/** يستبدل fetch: 400 لأي طلب lexicon يطلب عمود slug، ونجاح لغيره. */
function stubFetch(options: { lexiconWithoutSlugFails?: boolean } = {}) {
  const calls: string[] = [];
  const spy = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const table = url.pathname.split("/").pop() ?? "";
    calls.push(url.toString());

    if (table === "lexicon_terms") {
      const asksForSlug = /[?&]select=[^&]*\bslug\b/.test(url.search);
      if (asksForSlug) return errorResponse(`Could not find the 'public.lexicon_terms.slug' column`);
      if (options.lexiconWithoutSlugFails) return errorResponse("nope");
      return jsonResponse(LEXICON_ROWS);
    }
    return jsonResponse([]);
  });
  vi.stubGlobal("fetch", spy);
  return { spy, calls };
}

beforeEach(() => resetCatalogCache());
afterEach(() => {
  vi.unstubAllGlobals();
  resetCatalogCache();
});

describe("cmsCatalog — استعلام بديل عند 400", () => {
  test("lexicon_terms بدون عمود slug: يُعاد الطلب ويستعيد الصفوف", async () => {
    const { calls } = stubFetch();
    const catalog = await loadPublishedCatalog({});

    expect(catalog.lexicon).toEqual(LEXICON_ROWS);
    expect(catalog.ok).toBe(true);

    const lexiconCalls = calls.filter((url) => url.includes("/lexicon_terms?"));
    expect(lexiconCalls).toHaveLength(2);
    // الأول يطلب slug (المخطط المتوقع)، والثاني بدونه.
    expect(lexiconCalls[0]).toMatch(/select=[^&]*slug/);
    expect(lexiconCalls[1]).not.toMatch(/select=[^&]*slug/);
  });

  test("slug يُحسب من term_ar رغم غيابه عن الصفوف", async () => {
    stubFetch();
    const catalog = await loadPublishedCatalog({});
    const { buildCmsEntries, cmsLexiconSlug } = await import("../functions/_shared/cmsUrls.js");

    expect(cmsLexiconSlug(catalog.lexicon[0])).not.toBe("");

    const entries = buildCmsEntries({ lexicon: catalog.lexicon }, { localLexiconTerms: new Set<string>() });
    expect(entries).toHaveLength(1);
    expect(entries[0].url).toMatch(/^https:\/\/www\.mizan\.page\/lexicon\/[^/]+$/);
    expect(entries[0].lastmod).toBe("2026-10-06");
  });

  test("فشل الجدولين معاً لا يكسر الخريطة: ok=false وصفوف فارغة", async () => {
    stubFetch({ lexiconWithoutSlugFails: true });
    const catalog = await loadPublishedCatalog({});

    expect(catalog.ok).toBe(false);
    expect(catalog.lexicon).toEqual([]);
    expect(catalog.errors.some((error) => String(error).includes("lexicon_terms: HTTP 400"))).toBe(true);
  });

  test("خطأ غير 400 (مهلة/شبكة) لا يُعيد المحاولة", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
        calls.push(url.toString());
        if (url.pathname.includes("lexicon_terms")) {
          return new Response("gateway timeout", { status: 504 });
        }
        return jsonResponse([]);
      }),
    );

    const catalog = await loadPublishedCatalog({});
    expect(catalog.lexicon).toEqual([]);
    expect(calls.filter((url) => url.includes("/lexicon_terms?"))).toHaveLength(1);
  });

  test("seminars وfaculties يدخلان الكتالوج — الندوات مفلترة بالنشر", async () => {
    const SEMINAR_ROWS = [{ id: "e1", title: "ندوة", created_at: "2026-10-01" }];
    const FACULTY_ROWS = [{ id: "f1", name: "كلية", slug: "fsjes-tetouan", created_at: "2026-09-01" }];
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
        const table = url.pathname.split("/").pop() ?? "";
        calls.push(url.toString());
        if (table === "seminars") return jsonResponse(SEMINAR_ROWS);
        if (table === "faculties") return jsonResponse(FACULTY_ROWS);
        return jsonResponse([]);
      }),
    );

    const catalog = await loadPublishedCatalog({});
    expect(catalog.events).toEqual(SEMINAR_ROWS);
    expect(catalog.schools).toEqual(FACULTY_ROWS);

    // الندوات: منشورة فقط — نفس فلتر EventsPage، وإلا دخلت ندوة مسودّة الخريطة.
    expect(calls.find((url) => url.includes("/seminars?"))).toMatch(/status=eq\.published/);
    expect(calls.find((url) => url.includes("/faculties?"))).toBeDefined();
  });
});
