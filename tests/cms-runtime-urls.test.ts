/**
 * طبقة CMS وقت-الطلب — اختبارات الوحدات الخالصة.
 *
 * ماذا تحمي؟
 * -----------
 * 1) أن روابط CMS تُبنى بنفس دوال المعرّفات المستعملة في البناء
 *    (shared/seo/url-policy.js) — لا خوارزمية سادسة تُنشر في sitemap.xml.
 * 2) أن الدمج مع الخريطة المبنية لا يُنشئ <loc> مكرراً ولا وسم XML مكسوراً
 *    (الخريطة كلها تُرفض بخطأ XML واحد).
 * 3) أن مسار المحتوى غير المبني لا يخدم إلا سجلاً موجوداً فعلاً، وأن حقن
 *    الرأس يقلب noindex إلى index ويضيف canonical — وإلا عاد سؤال URL
 *    Inspection «Indexing allowed? = No» على محتوى منشور.
 */
import { describe, expect, test } from "vitest";

import { buildCmsEntries, cmsLexiconSlug, mergeSitemapXml, parseSitemapLocs, termKey } from "../functions/_shared/cmsUrls.js";
import {
  buildContentHead,
  findRecord,
  injectContentHead,
  matchContentPath,
} from "../functions/_shared/contentFallback.js";

const BASE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.mizan.page/</loc>
    <lastmod>2026-01-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.mizan.page/lexicon/%D8%A7%D9%84%D9%85%D8%AD%D9%83%D9%85%D8%A9</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>
`;

describe("buildCmsEntries — روابط CMS بمعرّفات البناء نفسها", () => {
  test("مقال منشور يدخل بمسار /articles/<slug> وتاريخ آخر تعديل", () => {
    const entries = buildCmsEntries({
      articles: [
        { id: "a1", title: "مقال تجريبي", slug: "maqal-tajribi", updated_at: "2026-10-01T09:00:00Z" },
      ],
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].path).toBe("/articles/maqal-tajribi");
    expect(entries[0].url).toBe("https://www.mizan.page/articles/maqal-tajribi");
    expect(entries[0].lastmod).toBe("2026-10-01");
  });

  test("سجلّ بلا slug يُبنى من العنوان (نفس سلّم contentSlug) ولا يخرج رابط undefined", () => {
    const entries = buildCmsEntries({ news: [{ id: "n1", title: "خبر قانوني" }] });
    expect(entries).toHaveLength(1);
    expect(entries[0].path).toBe("/news/خبر-قانوني");
    expect(entries[0].path).not.toContain("undefined");
  });

  test("سجلّ بلا معرّف ولا عنوان ولا id يُسقط", () => {
    expect(buildCmsEntries({ articles: [{ excerpt: "بلا عنوان" }] })).toHaveLength(0);
  });

  test("ملف أرشيف بلا رابط تحميل وبلا نصّ لا يُنشر (نفس شرط isArchivableItem)", () => {
    const entries = buildCmsEntries({
      pdfs: [
        { id: "p1", title: "ملخص بلا ملف", slug: "mulakhkhas-bila-milaff" },
        { id: "p2", title: "ملخص بملف", slug: "mulakhkhas", file_url: "https://cdn.example/x.pdf" },
      ],
      laws: [{ id: "l1", title: "نصّ بلا رابط", content: "المادة الأولى: ...", slug: "nas-bila-rabet" }],
    });
    expect(entries.map((entry) => entry.path)).toEqual(["/pdf/mulakhkhas", "/pdf/nas-bila-rabet"]);
  });

  test("مصطلح معجم موجود محلياً لا يتكرر بمعرّف CMS آخر", () => {
    const local = new Set([termKey("المحكمة")]);
    const entries = buildCmsEntries(
      { lexicon: [{ id: "t1", term_ar: "المحكمة", slug: "al-mahkama" }, { id: "t2", term_ar: "مصطلح جديد", slug: "mustalah-jadid" }] },
      { localLexiconTerms: local },
    );
    expect(entries.map((entry) => entry.path)).toEqual(["/lexicon/mustalah-jadid"]);
  });

  test("معرّف مصطلح بلا عمود slug يُبنى من الاسم العربي", () => {
    expect(cmsLexiconSlug({ id: "t9", term_ar: "الالتزام الطبيعي" })).toBe("الالتزام-الطبيعي");
  });
});

describe("mergeSitemapXml — دمج بلا تكرار وبلا XML مكسور", () => {
  test("يضيف الروابط الجديدة قبل </urlset> ويسقط المنشور أصلاً", () => {
    const entries = [
      { url: "https://www.mizan.page/articles/جديد", lastmod: "2026-10-02", changefreq: "monthly", priority: "0.8" },
      { url: "https://www.mizan.page/", lastmod: "2026-10-02", changefreq: "weekly", priority: "1.0" },
    ];
    const { xml, added, skipped } = mergeSitemapXml(BASE_XML, entries);

    expect(added).toEqual(["https://www.mizan.page/articles/جديد"]);
    expect(skipped).toEqual(["https://www.mizan.page/"]);
    expect(xml.indexOf("</urlset>")).toBeGreaterThan(xml.indexOf("articles/%D8%AC"));
    expect(xml.match(/<loc>/g)).toHaveLength(3);
    expect(xml.endsWith("</urlset>\n")).toBe(true);
  });

  test("يهرب أحرف XML — عنوان فيه & لا يكسر الملف", () => {
    const { xml } = mergeSitemapXml(BASE_XML, [
      { url: "https://www.mizan.page/pdf/a&b", lastmod: "", changefreq: "yearly", priority: "0.6" },
    ]);
    expect(xml).toContain("<loc>https://www.mizan.page/pdf/a&amp;b</loc>");
    expect(xml).not.toContain("a&b</loc>");
  });

  test("بلا عناصر جديدة يعود الملف حرفياً كما هو", () => {
    const { xml, added } = mergeSitemapXml(BASE_XML, []);
    expect(xml).toBe(BASE_XML);
    expect(added).toHaveLength(0);
  });

  test("ملف بلا </urlset> لا يُلمس (لا XML مبتور)", () => {
    const broken = "<urlset><url></url>";
    expect(mergeSitemapXml(broken, [{ url: "https://www.mizan.page/x" }]).xml).toBe(broken);
  });

  test("parseSitemapLocs يقرأ الموجود فعلاً", () => {
    const locs = parseSitemapLocs(BASE_XML);
    expect(locs.has("https://www.mizan.page/")).toBe(true);
    expect(locs.size).toBe(2);
  });
});

describe("contentFallback — رابط منشور غير مبني", () => {
  test("matchContentPath يقبل مقطعاً واحداً فقط ويرفض المسارات الأعمق والح hubs", () => {
    expect(matchContentPath("/articles/maqal")).toEqual({ kind: "article", slug: "maqal" });
    expect(matchContentPath("/pdf/mulakhkhas")).toEqual({ kind: "pdf", slug: "mulakhkhas" });
    expect(matchContentPath("/articles/a/b")).toBeNull();
    expect(matchContentPath("/articles")).toBeNull();
    expect(matchContentPath("/about")).toBeNull();
  });

  test("findRecord يطابق بمعرّف العنوان حين يغيب slug وبملحق التفريد -<id>", () => {
    const catalog = {
      articles: [{ id: "a1", title: "محكمة الأسرة" }],
      pdfs: [{ id: "p1", title: "ملخص", slug: "mulakhkhas", file_url: "x.pdf", updated_at: "2026-01-02" }],
      laws: [],
      news: [],
      lexicon: [{ id: "t1", term_ar: "الرهن الحيازي" }],
    };
    expect(findRecord(catalog, "article", "محكمة-الأسرة")?.id).toBe("a1");
    expect(findRecord(catalog, "pdf", "mulakhkhas-p1")?.id).toBe("p1");
    expect(findRecord(catalog, "lexicon", "الرهن-الحيازي")?.id).toBe("t1");
    expect(findRecord(catalog, "article", "غير-موجود")).toBeNull();
  });

  test("injectContentHead يقلب noindex ويضيف canonical وJSON-LD", () => {
    const shell = `<!doctype html><html><head><title>ميزان الرقمية — المنصة</title>
    <meta name="robots" content="noindex, follow">
    <meta property="og:title" content="ميزان الرقمية | ملخصات وموارد">
    </head><body><div id="root"></div></body></html>`;

    const head = buildContentHead(
      { title: "مقال تجريبي", excerpt: "شرح مبسّط.", updated_at: "2026-10-01" },
      "article",
      { canonical: "https://www.mizan.page/articles/ماقال" },
    );
    const jsonLd = head.jsonLd as unknown as Record<string, unknown>[];
    const html = injectContentHead(shell, {
      title: "مقال تجريبي | ميزان الرقمية",
      description: "شرح مبسّط.",
      canonical: "https://www.mizan.page/articles/ماقال",
      ogType: "article",
      jsonLd,
    });

    expect(html).toContain('<meta name="robots" content="index, follow, max-image-preview:large">');
    expect(html).not.toContain("noindex");
    expect(html).toContain('<link rel="canonical" href="https://www.mizan.page/articles/ماقال">');
    expect(html).toContain('<meta property="og:type" content="article">');
    expect(html).toContain("<title>مقال تجريبي | ميزان الرقمية</title>");
    const blocks = html.match(/application\/ld\+json/g) ?? [];
    expect(blocks).toHaveLength(jsonLd.length);
    expect(html).not.toContain("og:title\" content=\"ميزان الرقمية | ملخصات وموارد\"");
  });

  test("buildContentHead يضيف علامة المنصة ولا يترك عنواناً فارغاً", () => {
    const head = buildContentHead({ title: "خبر قانوني" }, "news", { canonical: "https://www.mizan.page/news/x" });
    expect(head.title.endsWith("ميزان الرقمية")).toBe(true);
    expect(head.description.length).toBeGreaterThan(40);
    expect(head.jsonLd[0]["@id"]).toBe("https://www.mizan.page/news/x#webpage");
    expect(head.jsonLd.some((node) => node["@type"] === "Article")).toBe(true);
  });
});

describe("ندوات وكليات CMS — seminars/faculties في الخريطة وصفحات حقيقية", () => {
  test("ندوة تدخل بمعرّف seminar-<id> — نفس الرابط الذي تبنيه الواجهة", () => {
    const entries = buildCmsEntries({
      events: [
        { id: "e1", title: "ندوة القانون المقارن", event_date: "2026-05-16", created_at: "2026-10-02T08:00:00Z" },
      ],
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].path).toBe("/events/seminar-e1");
    expect(entries[0].url).toBe("https://www.mizan.page/events/seminar-e1");
    expect(entries[0].lastmod).toBe("2026-10-02");
    // نفس أولوية generate-sitemap.mjs للفعاليات.
    expect(entries[0].priority).toBe("0.7");
    expect(entries[0].changefreq).toBe("monthly");
  });

  test("ندوة بلا معرّف تُسقط — لا رابط seminar-undefined", () => {
    expect(buildCmsEntries({ events: [{ title: "ندوة بلا معرّف" }] })).toHaveLength(0);
  });

  test("كلية من لوحة التحكم تدخل بـ /schools/<slug> من عمود slug", () => {
    const entries = buildCmsEntries({
      schools: [{ id: "f1", name: "كلية العلوم القانونية", slug: "fsjes-tetouan", created_at: "2026-09-01" }],
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].path).toBe("/schools/fsjes-tetouan");
    expect(entries[0].priority).toBe("0.7");
    expect(entries[0].lastmod).toBe("2026-09-01");
  });

  test("matchContentPath وfindRecord يقبلان القسمين الجديدين ويطابقان صيغة الواجهة", () => {
    expect(matchContentPath("/events/seminar-e1")).toEqual({ kind: "event", slug: "seminar-e1" });
    expect(matchContentPath("/schools/fsjes-tetouan")).toEqual({ kind: "school", slug: "fsjes-tetouan" });

    const catalog = {
      events: [{ id: "e1", title: "ندوة" }],
      schools: [{ id: "f1", name: "كلية", slug: "fsjes-tetouan" }],
    };
    expect(findRecord(catalog, "event", "seminar-e1")?.id).toBe("e1");
    // الواجهة تقبل slug أو id للكليات — نفعل الشيء نفسه.
    expect(findRecord(catalog, "school", "fsjes-tetouan")?.id).toBe("f1");
    expect(findRecord(catalog, "school", "f1")?.id).toBe("f1");
    // الندوة بمعرّف عارٍ (بلا seminar-) لا توجد: EventPage لا تحلّها أصلاً.
    expect(findRecord(catalog, "event", "e1")).toBeNull();
    expect(findRecord(catalog, "event", "seminar-missing")).toBeNull();
  });

  test("buildContentHead لندوة: EducationEvent وعنوان بلاحقة القسم كما في EventPage", () => {
    const head = buildContentHead(
      { id: "e1", title: "ندوة المنافسة", agenda: "برنامج الندوة العلمية الدولية.", event_date: "2026-05-16", event_time: "09:30" },
      "event",
      { canonical: "https://www.mizan.page/events/seminar-e1" },
    );
    // نفس نصّ EventPage ثم brandTitle (SEOHead) — لا يرى الزاحف عنواناً آخر بعد hydration.
    expect(head.title).toBe("ندوة المنافسة - الندوات والأيام الدراسية | ميزان الرقمية");
    expect(head.ogType).toBe("website");
    const eventNode = head.jsonLd.find((node) => node["@type"] === "EducationEvent");
    expect(eventNode?.startDate).toBe("2026-05-16T09:30:00");
    expect(eventNode?.url).toBe("https://www.mizan.page/events/seminar-e1");
  });

  test("buildContentHead لكلية: EducationalOrganization بنفس @id الذي تبنيه generateFacultySchema", () => {
    const head = buildContentHead(
      { id: "f1", name: "كلية تطوان", slug: "fsjes-tetouan", city: "تطوان", founded_year: 1999, description: "كلية الحقوق بتطوان." },
      "school",
      { canonical: "https://www.mizan.page/schools/fsjes-tetouan" },
    );
    expect(head.title).toBe("كلية تطوان - دليل كليات الحقوق بالمغرب | ميزان الرقمية");
    const schoolNode = head.jsonLd.find((node) => node["@type"] === "EducationalOrganization");
    expect(schoolNode?.["@id"]).toBe("https://www.mizan.page/schools/fsjes-tetouan#organization");
    expect(schoolNode?.address?.addressLocality).toBe("تطوان");
    expect(schoolNode?.foundingDate).toBe("1999");
  });
});
