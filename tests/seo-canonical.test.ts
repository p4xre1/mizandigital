// اختبارات سياسة الروابط القانونية (canonical URL policy).
//
// تغطّي الحلقة كاملة التي كان الانكسار يحدث فيها:
//   المولّد (shared/seo/url-policy.js) ← واجهة React (src/lib/canonical.ts)
//   ← وسم canonical (SEOHead) ← الملفات الثابتة (prerender/index.html)
//   ← خريطة الموقع (public/sitemap.xml) ← تحويل شرطة النهاية (functions/).
//
// كل فحص هنا يمسك انحرافاً حقيقياً وقع في هذا المستودع أو كان ليقع:
// canonical بجذر «/»، نسخ مزدوجة «/x» و«/x/»، روابط ميتة في الخريطة،
// و url في JSON-LD لا يطابق رابط الصفحة.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import {
  BASE_URL,
  canonicalArchive,
  canonicalArticle,
  canonicalArticlesHub,
  canonicalEvent,
  canonicalEventsHub,
  canonicalFor,
  canonicalHome,
  canonicalLexicon,
  canonicalLexiconHub,
  canonicalNews,
  canonicalNewsHub,
  canonicalPage,
  canonicalPdf,
  canonicalSchool,
  canonicalSchools,
  canonicalUrl,
  contentSlug,
  docSlug,
  followsSlashPolicy,
  internalPath,
  isIndexablePath,
  itemPath,
  lexiconSlugMap,
  normalizePath,
  pathOfUrl,
} from "../src/lib/canonical";
import {
  generateDefinedTermSchema,
  generateFacultySchema,
  generateNewsArticleSchema,
  generateOrganizationSchema,
  generateWebSiteSchema,
  SITE_CONFIG,
} from "../src/lib/seo/schema";
import {
  checkCanonicalPolicy,
  checkSitemap,
  checkSitemapCoverage,
} from "../shared/seo/technical-checks.js";

import articles from "../src/data/articles.json";
import documents from "../src/data/docs.json";
import events from "../src/data/events.json";
import lexicon from "../src/data/lexicon.json";
import news from "../src/data/news.json";
import schools from "../src/data/schools.json";

const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

/* ── 1. التطبيع ─────────────────────────────────────────────────────────── */

describe("تطبيع المسار إلى الصيغة القانونية", () => {
  test("شرطة النهاية تُزال، والجذر يبقى بلا شرطة", () => {
    expect(canonicalUrl("/schools/fsjes-ait-melloul/")).toBe(`${BASE_URL}/schools/fsjes-ait-melloul`);
    expect(canonicalUrl("/schools/fsjes-ait-melloul")).toBe(`${BASE_URL}/schools/fsjes-ait-melloul`);
    expect(canonicalUrl("/")).toBe(BASE_URL);
    expect(canonicalUrl("")).toBe(BASE_URL);
    expect(canonicalUrl(BASE_URL)).toBe(BASE_URL);
    expect(canonicalUrl(`${BASE_URL}/`)).toBe(BASE_URL);
  });

  test("المعاملات والحزام يسقطان — وإلا توزّعت الإشارة بين utm وكل نسخة", () => {
    expect(canonicalUrl("/news/x?utm_source=fb")).toBe(`${BASE_URL}/news/x`);
    expect(canonicalUrl(`${BASE_URL}/lexicon/التقادم#m1`)).toBe(`${BASE_URL}/lexicon/التقادم`);
    expect(canonicalUrl("/schools/x/?semester=S3#top")).toBe(`${BASE_URL}/schools/x`);
  });

  test("النطاق غير الموحّد (بلا www، أو http) يُردّ إلى النطاق القانوني", () => {
    expect(canonicalUrl("https://mizan.page/schools/x/")).toBe(`${BASE_URL}/schools/x`);
    expect(canonicalUrl("http://www.mizan.page/schools/x/")).toBe(`${BASE_URL}/schools/x`);
  });

  test("الشرطات المكررة في الوسط تُدمج", () => {
    expect(normalizePath("/schools//fsjes//")).toBe("/schools/fsjes");
    expect(pathOfUrl(`${BASE_URL}//archive//`)).toBe("/archive");
  });

  test("المعرّف الصريح يُقبل كما هو (اسم الملف العربي لا يُرمَّز مرتين)", () => {
    expect(canonicalLexicon("التقادم")).toBe(`${BASE_URL}/lexicon/التقادم`);
    expect(canonicalUrl("/lexicon/%D8%A7%D9%84%D8%AA%D9%82%D8%A7%D8%AF%D9%85/")).toBe(
      `${BASE_URL}/lexicon/التقادم`.replace("التقادم", encodeURIComponent("التقادم"))
    );
  });
});

/* ── 2. الدوال المساعدة ─────────────────────────────────────────────────── */

describe("روابط الصفحات كلها بلا شرطة نهاية", () => {
  test("كل مساعد يُعيد رابطاً مطلقاً على النطاق الموحّد", () => {
    const links = {
      home: canonicalHome(),
      school: canonicalSchool("fsjes-ait-melloul"),
      schoolsHub: canonicalSchools(),
      lexicon: canonicalLexicon("التقادم"),
      lexiconHub: canonicalLexiconHub(),
      news: canonicalNews("خبر"),
      newsHub: canonicalNewsHub(),
      article: canonicalArticle("ihtiram-qanun-assayr"),
      articlesHub: canonicalArticlesHub(),
      event: canonicalEvent("yawm-dirasi"),
      eventsHub: canonicalEventsHub(),
      pdf: canonicalPdf("medخل-إلى-قانون-الشركات-s4"),
      archive: canonicalArchive(),
      about: canonicalPage("about"),
      fromPath: canonicalFor("/schools/fsjes-ait-melloul/"),
    };

    for (const [name, href] of Object.entries(links)) {
      expect(href, name).toMatch(/^https:\/\/www\.mizan\.page(\/.*)?$/);
      expect(href.endsWith("/"), `${name} ينتهي بشرطة`).toBe(false);
      expect(href, name).not.toContain("?");
      expect(href, name).not.toContain("#");
      expect(href.replace(/^https:\/\//, "").includes("//"), name).toBe(false);
    }

    expect(links.schoolsHub).toBe(`${BASE_URL}/schools`);
    expect(links.fromPath).toBe(links.school);
  });

  test("itemPath يبني النسبة نفسها التي يبنيها الرابط المطلق", () => {
    expect(itemPath.school("x")).toBe("/schools/x");
    expect(itemPath.lexicon("x")).toBe("/lexicon/x");
    expect(itemPath.news("x")).toBe("/news/x");
    expect(itemPath.article("x")).toBe("/articles/x");
    expect(itemPath.event("x")).toBe("/events/x");
    expect(itemPath.pdf("x")).toBe("/pdf/x");
    for (const [kind, slug] of Object.entries({
      school: "x",
      lexicon: "x",
      news: "x",
      article: "x",
      event: "x",
      pdf: "x",
    })) {
      const rel = itemPath[kind as keyof typeof itemPath](slug as string);
      expect(`${BASE_URL}${rel}`).toBe(
        canonicalUrl(rel, { origin: BASE_URL })
      );
    }
  });

  test("followsSlashPolicy ترفض شرطة النهاية حتى في الجذر المطلق", () => {
    expect(followsSlashPolicy(`${BASE_URL}/schools/x`)).toBe(true);
    expect(followsSlashPolicy(`${BASE_URL}/schools/x/`)).toBe(false);
    expect(followsSlashPolicy(BASE_URL)).toBe(true);
    expect(followsSlashPolicy(`${BASE_URL}/`)).toBe(false);
    expect(followsSlashPolicy("/schools/x?utm=1")).toBe(true);
    expect(followsSlashPolicy("/schools/x/?utm=1")).toBe(false);
  });

  test("internalPath يعطي ما تضعه Link في to=", () => {
    expect(internalPath("/lexicon/التقادم/")).toBe("/lexicon/التقادم");
    expect(internalPath("/")).toBe("/");
  });

  test("صفحات الحساب والإدارة والبحث خارج الفهرسة", () => {
    for (const path of ["/admin/users", "/login", "/signup", "/profile", "/saved", "/payments", "/search?q=x", "/u/amina", "/pro-tools/grader"]) {
      expect(isIndexablePath(path), path).toBe(false);
    }
    for (const path of ["/", "/schools", "/schools/x", "/lexicon/التقادم", "/news/x", "/articles/x", "/events/x", "/pdf/x", "/archive", "/about", "/guides"]) {
      expect(isIndexablePath(path), path).toBe(true);
    }
  });
});

/* ── 3. البيانات الحقيقية: لا نسخة مكررة، لا رابط ميت ────────────────────── */

describe("روابط المحتوى المبني من البيانات", () => {
  const schoolLinks = schools.map((s: { slug: string }) => canonicalSchool(s.slug));
  const newsLinks = news.map((n) => canonicalNews(contentSlug(n as { id: string; title: string })));
  const articleLinks = articles.map((a: { slug: string }) => canonicalArticle(a.slug));
  const eventLinks = events.map((e) => canonicalEvent(contentSlug(e as { id: string; title: string })));
  const taken = new Set<string>();
  const docLinks = documents.map((d) => canonicalPdf(docSlug(d as { id: string; title: string }, taken)));
  const termSlugs = [...lexiconSlugMap(lexicon as unknown as { id: string; term_ar: string }[]).values()];
  const lexiconLinks = termSlugs.map((slug: string) => canonicalLexicon(slug));

  test("لا رابط في أي مجموعة ينتهي بشرطة ولا يحمل معاملات", () => {
    for (const group of [schoolLinks, newsLinks, articleLinks, eventLinks, docLinks, lexiconLinks]) {
      for (const href of group) {
        expect(followsSlashPolicy(href), href).toBe(true);
        expect(href.startsWith(`${BASE_URL}/`), href).toBe(true);
      }
    }
  });

  test("الخبر والمقال لا يتشاركان الرابط نفسه عندما يختلف المصدر", () => {
    // news.json → /news/<slug> و articles.json → /articles/<slug>؛ التوحيد هنا
    // كان يجعل مقالاً وخبراً بنفس العنوان يتصادمان في ملف ثابت واحد.
    const overlap = newsLinks.filter((href: string) => articleLinks.includes(href));
    expect(overlap).toEqual([]);
  });

  test("مصطلحات المعجم لا تتصادم بعد إزالة التكرار", () => {
    expect(new Set(lexiconLinks).size).toBe(lexiconLinks.length);
    expect(lexiconLinks.length).toBe(lexicon.length);
  });

  test("معرّف الوثائق فريد داخل /pdf", () => {
    expect(new Set(docLinks).size).toBe(docLinks.length);
  });

  test("المسار الداخلي المشتق من الرابط القانوني يعود إليه", () => {
    for (const href of [...schoolLinks, ...newsLinks, ...articleLinks, ...lexiconLinks]) {
      expect(canonicalUrl(pathOfUrl(href))).toBe(href);
    }
  });
});

/* ── 4. HEAD في القالب الثابت ────────────────────────────────────────────── */

describe("وسم canonical في القالب الثابت", () => {
  const index = read("index.html");

  test("canonical واحد فقط، مطابق للجذر القانوني بلا شرطة", () => {
    expect(index.match(/<link[^>]*rel="canonical"/gi)?.length).toBe(1);
    const href = /<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i.exec(index)?.[1] ?? "";
    expect(href).toBe(canonicalHome());
    expect(href.endsWith("/")).toBe(false);
  });

  test("og:url و hreflang يحملان الرابط نفسه", () => {
    const og = /<meta[^>]*property="og:url"[^>]*content="([^"]+)"/i.exec(index)?.[1] ?? "";
    expect(og).toBe(canonicalHome());
    const hreflangs = [...index.matchAll(/rel="alternate"[^>]*hreflang="(ar|x-default)"[^>]*href="([^"]+)"/gi)].map((m) => m[2]);
    expect(hreflangs.length).toBeGreaterThan(0);
    for (const value of hreflangs) {
      expect(value).toBe(canonicalHome());
      expect(followsSlashPolicy(value)).toBe(true);
    }
  });

  test("لا رابط داخلي في القالب ينتهي بشرطة", () => {
    const hrefs = [...index.matchAll(/(?:href|src)="(\/[^"]*)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      if (href === "/") continue; // الجذر في <a href="/"> صحيح صراحةً
      expect(href.endsWith("/"), href).toBe(false);
    }
  });
});

/* ── 5. خريطة الموقع ─────────────────────────────────────────────────────── */

describe("خريطة الموقع تُقدَّم الروابط القانونية فقط", () => {
  const xml = read("public/sitemap.xml");
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);

  test("لا <loc> بشرطة نهاية ولا .html ولا معاملات", () => {
    expect(locs.length).toBeGreaterThan(50);
    for (const loc of locs) {
      expect(loc.endsWith("/"), loc).toBe(false);
      expect(loc.endsWith(".html"), loc).toBe(false);
      expect(loc.includes("?"), loc).toBe(false);
      expect(loc.startsWith(`${BASE_URL}`), loc).toBe(true);
    }
  });

  test("لا نسخة مزدوجة «/x» و«/x/» ولا تكرار مطلق", () => {
    expect(new Set(locs).size).toBe(locs.length);
    const paths = locs.map((loc) => new URL(loc).pathname);
    for (const path of paths) {
      expect(paths.includes(`${path}/`), `${path} و ${path}/`).toBe(false);
    }
  });

  test("الجذر موجود مرة واحدة وبلا شرطة", () => {
    expect(locs.filter((loc) => new URL(loc).pathname === "/")).toEqual([BASE_URL]);
  });

  test("الأقسام الأساسية في الخريطة", () => {
    for (const path of ["/schools", "/lexicon", "/news", "/articles", "/events", "/archive", "/about"]) {
      expect(locs).toContain(`${BASE_URL}${path}`);
    }
  });

  test("robots.txt يشير إلى الخريطة على النطاق الموحّد", () => {
    const robots = read("public/robots.txt");
    expect(robots).toContain(`Sitemap: ${BASE_URL}/sitemap.xml`);
  });

  test("فاحص الخريطة يرفض الشرطة المزدوجة والنطاق الغريب", () => {
    const bad = [
      "<urlset><url><loc>https://www.mizan.page/schools/x/</loc></url>",
      "<url><loc>https://www.mizan.page/schools/x</loc></url>",
      "<url><loc>https://mizan.page/lexicon/y</loc></url></urlset>",
    ].join("");
    const result = checkSitemap(bad, ["/schools/x"], { siteUrl: BASE_URL });
    expect(result.pass).toBe(false);
    const text = result.issues.join(" | ");
    expect(text).toContain("شرطة");
    expect(text.toLowerCase()).toContain("mizan.page");
  });
});

/* ── 6. بوابات الفحص ─────────────────────────────────────────────────────── */

describe("البوابات التي تمنع الانحدار", () => {
  const good = [
    `<link rel="canonical" href="${BASE_URL}/schools/x">`,
    `<meta property="og:url" content="${BASE_URL}/schools/x">`,
  ].join("\n");

  test("checkCanonicalPolicy يقبل الصفحة المطابقة ويرفض كل انحراف", () => {
    const at = (html: string) => checkCanonicalPolicy(html, { url: "/schools/x", siteUrl: BASE_URL });

    expect(at(good).pass).toBe(true);
    expect(at(`<link rel="canonical" href="${BASE_URL}/schools/x/">`).pass).toBe(false);
    expect(at(`<link rel="canonical" href="/schools/x">`).pass).toBe(false);
    expect(at(`<link rel="canonical" href="https://mizan.page/schools/x">`).pass).toBe(false);
    expect(at(`<link rel="canonical" href="${BASE_URL}/schools/y">`).pass).toBe(false);
    expect(at(`<link rel="canonical" href="${BASE_URL}/schools/x?utm=1">`).pass).toBe(false);
    expect(
      at(
        [
          `<link rel="canonical" href="${BASE_URL}/schools/x">`,
          `<link rel="canonical" href="${BASE_URL}/schools/x/">`,
          `<meta property="og:url" content="${BASE_URL}/schools/x">`,
        ].join("\n")
      ).pass
    ).toBe(false);
    expect(at("<title>خ</title>").pass).toBe(false);
  });

  test("og:url المخالف يُسقط البوابة حتى لو canonical صحيح", () => {
    const html = [
      `<link rel="canonical" href="${BASE_URL}/news/x">`,
      `<meta property="og:url" content="${BASE_URL}/news/x/">`,
    ].join("");
    const result = checkCanonicalPolicy(html, { url: "/news/x", siteUrl: BASE_URL });
    expect(result.pass).toBe(false);
    expect(result.issues.join(" ")).toContain("og:url");
  });

  test("checkSitemapCoverage تمسك الطرفين: رابط ميت وصفحة خارج الخريطة", () => {
    const missing = checkSitemapCoverage([`${BASE_URL}/schools/ghost`], ["/schools/real"], {
      siteUrl: BASE_URL,
    });
    expect(missing.pass).toBe(false);
    expect(missing.issues.join(" ")).toContain("ghost");

    const unlisted = checkSitemapCoverage([`${BASE_URL}/schools/real`], ["/schools/real", "/news/new-page"], {
      siteUrl: BASE_URL,
    });
    expect(unlisted.pass).toBe(false);
    expect(unlisted.issues.join(" ")).toContain("/news/new-page");

    const ok = checkSitemapCoverage([`${BASE_URL}/schools/real`], ["/schools/real"], { siteUrl: BASE_URL });
    expect(ok.pass).toBe(true);
  });
});

/* ── 7. JSON-LD: url = الرابط القانوني ───────────────────────────────────── */

describe("البيانات المهيكلة تحمل الرابط القانوني نفسه", () => {
  test("مؤسسة الكلية: url للر الصفحة وسameAs للموقع الرسمي", () => {
    const school = schools[0] as { name: string; slug: string; city?: string; officialUrl?: string };
    const canonical = canonicalSchool(school.slug);
    const schema = generateFacultySchema({
      name: school.name,
      canonical,
      city: school.city,
      officialUrl: school.officialUrl ?? null,
    });
    expect(schema.url).toBe(canonical);
    expect(schema["@id"]).toBe(`${canonical}#organization`);
    expect(String(schema.url).endsWith("/")).toBe(false);
    if (school.officialUrl) expect(schema.sameAs).toBe(school.officialUrl);
  });

  test("المصطلح: url و inDefinedTermSet.url قانونيان", () => {
    const term = lexicon[0] as { id: string; term_ar: string; term_fr?: string; definition: string };
    const slug = [...lexiconSlugMap([term]).values()][0] as string;
    const canonical = canonicalLexicon(slug);
    const schema = generateDefinedTermSchema({
      termAr: term.term_ar,
      termFr: term.term_fr ?? null,
      definition: term.definition,
      canonical,
    });
    expect(schema.url).toBe(canonical);
    expect(schema.inDefinedTermSet.url).toBe(canonicalLexiconHub());
    expect(schema["@id"]).toBe(`${canonical}#term`);
  });

  test("الخبر: url/headline/publisher، والكاتب Person عند وجود توقيع حقيقي", () => {
    const item = news[0] as { title: string; summary?: string; date?: string };
    const canonical = canonicalNews(contentSlug({ id: String((news[0] as { id: string }).id), title: item.title }));
    const schema = generateNewsArticleSchema({
      title: item.title,
      description: item.summary || "",
      url: canonical,
      datePublished: item.date || "2026-01-01",
      authorName: "أ. محمد رضا",
    });
    expect(schema.url).toBe(canonical);
    expect(schema.headline).toBe(item.title);
    expect(schema.author["@type"]).toBe("Person");
    expect(schema.publisher["@type"]).toBe("Organization");
    expect(schema.publisher.url).toBe(BASE_URL);
    expect(schema.dateModified).toBeTruthy();

    const team = generateNewsArticleSchema({
      title: item.title,
      description: item.summary || "",
      url: canonical,
      datePublished: item.date || "2026-01-01",
      authorName: SITE_CONFIG.name,
    });
    expect(team.author["@type"]).toBe("Organization");
  });

  test("Organization و WebSite على النطاق الموحّد، والبحث بمعامل q", () => {
    const org = generateOrganizationSchema();
    const site = generateWebSiteSchema();
    expect(SITE_CONFIG.url).toBe(BASE_URL);
    expect(org.url).toBe(BASE_URL);
    expect(site.url).toBe(BASE_URL);
    expect(site["@id"]).toBe(`${BASE_URL}/#website`);
    const target = site.potentialAction.target.urlTemplate as string;
    expect(target).toBe(`${BASE_URL}/search?q={search_term_string}`);
    expect(target.endsWith("/")).toBe(false);
  });
});

/* ── 8. التحويل من شرطة النهاية ──────────────────────────────────────────── */

describe("شرطة النهاية تُحوَّل 301 إلى الصيغة القانونية", () => {
  test("دالة Pages Functions تزيل الشرطة وتُحوّل نهائياً", () => {
    const source = read("functions/[[path]].js");
    expect(source).toContain('endsWith("/")');
    expect(source).toMatch(/Response\.redirect\([\s\S]{0,80}, 301\)/);
    // الجذر مستثنى، وإلا تحول «/» إلى نفسها في حلقة لا تنتهي.
    expect(source).toContain('!== "/"');
  });

  test("لا سياسة ثانية تضيف شرطة: لا trailingSlash في إعداد Vite", () => {
    const config = read("vite.config.ts");
    expect(config).not.toMatch(/trailingSlash\s*:\s*true/);
  });

  test("التحويل يعمل فعلاً: /x/ → /x بمعاملاته، والجذر لا يُحوَّل", async () => {
    const mod = (await import("../functions/[[path]].js")) as unknown as {
      onRequest: (ctx: unknown) => Promise<Response>;
    };
    const call = (href: string) =>
      mod.onRequest({
        request: new Request(href),
        env: { ASSETS: { fetch: () => Promise.resolve(new Response("ok", { status: 200 })) } },
        context: { waitUntil: () => {}, requestTimeoutMs: 0 },
        next: async () => new Response("ok", { status: 200 }),
      });

    const slashed = await call("https://www.mizan.page/schools/fsjes-x/?utm=1");
    expect(slashed.status).toBe(301);
    expect(slashed.headers.get("location")).toBe("https://www.mizan.page/schools/fsjes-x?utm=1");

    const doubleSlash = await call("https://www.mizan.page/lexicon/x//");
    expect(doubleSlash.headers.get("location")).toBe("https://www.mizan.page/lexicon/x");

    // الجذر لا يُحوَّل إلى نفسه (حلقة لا نهائية)، فهو استثناء مقصود.
    const root = await call("https://www.mizan.page/");
    expect(root.status).not.toBe(301);
  });

  test("قواعد _redirects صيغة Pages صالحة ولا تُنتج نسخة بشرطة", () => {
    // الصيغة المطلقة (https://host/…) واللاحقة «!» غير مدعومتين في Pages:
    // السطر يُتجاهل بصمت مع «invalid redirect rules» في سجل البناء، فتبقى
    // القاعدة بلا أثر بينما يظنّها المطوّر فعّالة.
    const rules = read("public/_redirects")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));

    expect(rules.length).toBeGreaterThan(5);
    for (const rule of rules) {
      const [from, to, status] = rule.split(/\s+/);
      expect(from, rule).toMatch(/^\//);
      expect(to, rule).toMatch(/^\//);
      expect(status, rule).toMatch(/^(200|301|302|303|307|308)$/);
      // الجذر وحده يُكتب «/»؛ أي مسار آخر بلا شرطة.
      if (to !== "/") expect(to.endsWith("/"), rule).toBe(false);
      expect(rule, rule).not.toContain("mizan.page");
    }
  });
});
