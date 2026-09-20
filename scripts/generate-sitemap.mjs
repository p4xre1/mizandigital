/**
 * توليد خريطة الموقع public/sitemap.xml
 *
 * القواعد التي يحميها هذا الملف (سياسة الروابط في shared/seo/url-policy.js):
 *   1. رابط واحد قانوني لكل صفحة: بلا شرطة مائلة في النهاية، وعلى النطاق
 *      الموحّد https://www.mizan.page.
 *   2. لا رابط في الخريطة إلا لصفحة تُولَّد فعلاً — كل مسار هنا يُبنى بنفس
 *      دوال الـ slug المستعملة في src (الواجهة) وفي prerender.mjs (الملفات
 *      الثابتة). نسخة sitemap السابقة كانت تملك خوارزمية slug رابعة، فنتج
 *      عنها 13 رابطاً ميتاً: /lexicon/الرهن-الحيازي-gage (الصفحة الحقيقية
 *      تنتهي بـ -gage-civil)، و 9 روابط /pdf بشرطة مزدوجة --، و 3 أخبار
 *      وُضعت تحت /news بينما تُولَّد تحت /articles.
 *   3. المحتوى المنشور فقط (CMS: status=published / is_published=true).
 *   4. لا صفحات حساب ولا إدارة ولا بحث داخلي — تُستبعد بـ isIndexablePath.
 *
 * بعد prerender تُكتب نسخة مُصفّاة في dist/sitemap.xml (ما يُقدَّم فعلياً
 * لمحركات البحث) فلا يخرج للزاحف رابط بلا ملف، ولو تعطلت الشبكة وقت البناء.
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SITE_ORIGIN,
  articleSlug,
  canonicalArticle,
  canonicalEvent,
  canonicalLexicon,
  canonicalNews,
  canonicalPdf,
  canonicalSchool,
  canonicalUrl,
  docSlug,
  isItemPath,
  eventSlug,
  isIndexablePath,
  lexiconSlug,
  newsSlug,
  pathOfUrl,
  schoolSlug,
} from "../shared/seo/url-policy.js";
import { dateOf, fetchPublishedCmsContent } from "./lib/cms-content.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, "../public/sitemap.xml");
const DATA = join(__dirname, "../src/data");
const DOMAIN = SITE_ORIGIN;

const readJson = async (name) => JSON.parse(await readFile(join(DATA, name), "utf8"));

const [articles, events, schools, lexicon, news, docs] = await Promise.all([
  readJson("articles.json"),
  readJson("events.json"),
  readJson("schools.json"),
  readJson("lexicon.json"),
  readJson("news.json"),
  readJson("docs.json"),
]);

const { ok: cmsOk, error: cmsError, articles: cmsArticles, news: cmsNews, pdfs: cmsPdfs, laws: cmsLaws } =
  await fetchPublishedCmsContent();

if (!cmsOk) {
  console.warn(`⚠️  sitemap: ${cmsError} — يُكتفى بالبيانات المحلية.`);
}

/* ── المسارات الثابتة ───────────────────────────────────────────────────────
   forceTodayLastmod: صفحات تُحدَّث فعلاً مع كل بناء (الأرشيف، المعجم،
   الاختبارات)، فبتاريخ اليوم معنى. الباقي بلا lastmod افتراضي — انظر
   Comment أدناه في بناء المخرجات.
   ──────────────────────────────────────────────────────────────────────── */
const staticEntries = [
  { path: "/", changefreq: "weekly", priority: "1.0", forceTodayLastmod: true },
  { path: "/archive", changefreq: "weekly", priority: "0.9", forceTodayLastmod: true },
  { path: "/news", changefreq: "weekly", priority: "0.9", forceTodayLastmod: true },
  { path: "/articles", changefreq: "weekly", priority: "0.8", forceTodayLastmod: true },
  { path: "/events", changefreq: "weekly", priority: "0.8", forceTodayLastmod: true },
  { path: "/schools", changefreq: "monthly", priority: "0.8" },
  // الصفحات الركنية: تصف المنصة والأدلة، وتستحق الظهور في الخريطة لأنها مرتبطة
  // من الفوتر ومن بعضها بعضاً، لكنها ليست مُولَّدة من بيانات فـ lastmod فيها
  // تاريخ البناء.
  { path: "/platform", changefreq: "monthly", priority: "0.8" },
  { path: "/guides/new-law-student-morocco", changefreq: "monthly", priority: "0.8" },
  { path: "/guides/free-legal-resources-morocco", changefreq: "monthly", priority: "0.8" },
  { path: "/lexicon", changefreq: "weekly", priority: "0.9", forceTodayLastmod: true },
  { path: "/quiz", changefreq: "weekly", priority: "0.9", forceTodayLastmod: true },
  { path: "/quiz/university", changefreq: "weekly", priority: "0.8", forceTodayLastmod: true },
  { path: "/quiz/general", changefreq: "weekly", priority: "0.8", forceTodayLastmod: true },
  { path: "/quiz/concours", changefreq: "weekly", priority: "0.8", forceTodayLastmod: true },
  { path: "/quiz/interview", changefreq: "weekly", priority: "0.8", forceTodayLastmod: true },
  { path: "/quiz/placement", changefreq: "monthly", priority: "0.7" },
  { path: "/about", changefreq: "monthly", priority: "0.5" },
  { path: "/contact", changefreq: "yearly", priority: "0.4" },
  { path: "/faq", changefreq: "monthly", priority: "0.5" },
  { path: "/pricing", changefreq: "monthly", priority: "0.5" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/cookies", changefreq: "yearly", priority: "0.3" },
  ...["s1", "s2", "s3", "s4", "s5", "s6"].map((semester) => ({
    path: `/${semester}`,
    changefreq: "weekly",
    priority: "0.9",
    forceTodayLastmod: true,
  })),
];

/* ── المسارات الديناميكية — بنفس دوال توليد المعرّفات في الواجهة ─────────── */
const lexiconTaken = new Set();

// ملفات الأرشيف: المحلية (docs.json) ومن لوحة التحكم في قائمة واحدة وبنفس
// ترتيب prerender ومجموعة منع التكرار نفسها — فالثبات بين الملف المولَّد
// والرابط المنشور هو الضمان الوحيد ضد رابط 404 داخل الخريطة.
const docTaken = new Set();
const pdfEntries = [...docs, ...cmsPdfs, ...cmsLaws].map((item) => ({
  path: pathOfUrl(canonicalPdf(docSlug(item, docTaken))),
  lastmod: dateOf(item, ["updatedAt", "updated_at", "createdAt", "created_at"]),
  changefreq: "yearly",
  priority: "0.6",
}));

const droppedEntries = [];

/** عنصر صالح للنشر: مسار «/قسم/معرّف» حقيقي، لا مسار بوابة ولا undefined. */
function usableEntry(entry) {
  if (entry && isItemPath(entry.path)) return true;
  if (entry?.path) droppedEntries.push(entry.path);
  return false;
}

const dynamicEntries = [
  // كل عناصر articles.json تُولد تحت /articles/ — بمن فيها ما يحمل
  // type: "news". كان السكربت السابق يحوّلها إلى /news/ بحسب النوع، بينما
  // prerender والواجهة (ArticlePage → canonical) يبقيان على /articles/،
  // فخرجت ثلاثة روابط ميتة. المصدر الوحيد للقاعدة الآن: canonicalArticle.
  ...articles.map((item) => ({
    path: pathOfUrl(canonicalArticle(articleSlug(item))),
    lastmod: dateOf(item, ["updatedAt", "updated_at", "publishedAt", "published_at", "date"]),
    changefreq: "monthly",
    priority: "0.8",
  })),
  ...news.map((item) => ({
    path: pathOfUrl(canonicalNews(newsSlug(item))),
    lastmod: dateOf(item, ["updatedAt", "updated_at", "date", "publishedAt", "published_at"]),
    changefreq: "monthly",
    priority: "0.8",
  })),
  // سجلّات لوحة التحكم بنفس دالة المعرّف المستعملة في الواجهة وprerender:
  // slug مملوء ← عنوان ← id. القراءة المباشرة لـ item.slug كانت تنشر
  // «/articles/undefined» حين ينساه المحرّر، أي رابط ميت في الخريطة.
  ...cmsArticles
    .map((item) => ({
      path: pathOfUrl(canonicalArticle(articleSlug(item))),
      lastmod: dateOf(item),
      changefreq: "monthly",
      priority: "0.8",
    }))
    .filter(usableEntry),
  ...cmsNews
    .map((item) => ({
      path: pathOfUrl(canonicalNews(newsSlug(item))),
      lastmod: dateOf(item),
      changefreq: "monthly",
      priority: "0.8",
    }))
    .filter(usableEntry),
  ...events.map((item) => ({
    path: pathOfUrl(canonicalEvent(eventSlug(item))),
    lastmod: dateOf(item, ["eventDate", "updatedAt", "updated_at"]),
    changefreq: "monthly",
    priority: "0.7",
  })),
  ...schools.map((item) => ({
    path: pathOfUrl(canonicalSchool(schoolSlug(item))),
    lastmod: dateOf(item, ["verifiedAt", "verified_at", "updatedAt", "updated_at"]),
    changefreq: "monthly",
    priority: "0.7",
  })),
  ...lexicon.map((item) => ({
    path: pathOfUrl(canonicalLexicon(lexiconSlug(item, lexiconTaken))),
    changefreq: "monthly",
    priority: "0.7",
  })),
  ...pdfEntries,
];

/* ── البناء والنشر ────────────────────────────────────────────────────────── */
const today = new Date().toISOString().slice(0, 10);
const escapeXml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const allEntries = [...staticEntries, ...dynamicEntries];

// التطبيع يتم قبل التجميع، فمفاتيح Map تلتقط /schools/x و /schools/x/ كصفحة
// واحدة. بلا هذا كانت أي نسخة مكررة تدخل الخريطة برابطين فيضعف الرابطان معاً.
const dedupedByPath = Array.from(
  new Map(
    allEntries
      .filter((entry) => isIndexablePath(entry.path))
      .map((entry) => {
        const path = pathOfUrl(entry.path);
        return [path, { ...entry, path, url: canonicalUrl(path) }];
      }),
  ).values(),
);

const urls = dedupedByPath
  .map((entry) => {
    // ⚠️ ما كنحطوش <lastmod> بتاريخ اليوم كـ fallback لكل URL بلا تاريخ
    // حقيقي (مثلاً مصطلحات المعجم اللي ما عندهاش updatedAt فـ البيانات).
    // كنا قبل كنكتبو «اليوم» لـ 250 صفحة فـ كل مرة كيتبنى الموقع، وهاد
    // الشيء كيبعث لمحركات البحث إشارة كاذبة بأن الصفحة «تحدّثت البارح» بلا أي
    // تغيير حقيقي فـ المحتوى ديالها — إشارة سلبية عند التكرار على مئات
    // الصفحات المتشابهة. الصفحات الرئيسية (staticEntries) عندها تاريخ اليوم
    // بشكل مقصود لأنها فعلاً كتتحدث بانتظام.
    const lastmodTag = entry.lastmod
      ? `\n    <lastmod>${entry.lastmod}</lastmod>`
      : entry.forceTodayLastmod
        ? `\n    <lastmod>${today}</lastmod>`
        : "";

    return `  <url>
    <loc>${escapeXml(entry.url)}</loc>${lastmodTag}
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`;
  })
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

await writeFile(OUTPUT, xml, "utf8");

const slashViolations = dedupedByPath.filter((entry) => entry.url.endsWith("/"));
if (slashViolations.length) {
  throw new Error(
    `sitemap: ${slashViolations.length} رابط ينتهي بشرطة مائلة يخالف السياسة: ${slashViolations
      .slice(0, 5)
      .map((entry) => entry.url)
      .join(", ")}`,
  );
}

if (droppedEntries.length) {
  console.warn(
    `⚠️  sitemap: ${droppedEntries.length} سجلّاً من لوحة التحكم بلا معرّف صالح — أمثلة: ` +
    [...new Set(droppedEntries)].slice(0, 4).join(", ")
  );
}

console.log(
  `Generated ${dedupedByPath.length} sitemap entries ` +
    `(${cmsArticles.length} CMS articles + ${cmsNews.length} CMS news + ${cmsPdfs.length + cmsLaws.length} CMS pdfs/laws` +
    `${cmsOk ? "" : " — فشل جلب CMS، البيانات المحلية فقط"}).`,
);
