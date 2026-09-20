// scripts/seo-audit.mjs
//
// بوابة CI لفحوص السيو التقنية. يُشغَّل بـ `pnpm seo:audit` ويفشل (exit 1)
// عند وجود مشكلة حرجة، فيمنع نشر تراجع.
//
// الفحوص نفسها دوال نقية في shared/seo/technical-checks.js — نفس الكود الذي
// تستعمله لوحة التحكم والاختبارات، فلا تنحرف النتائج بينها.
//
// الاستعمال:
//   node scripts/seo-audit.mjs            → يفحص public/ و dist/ إن وجد
//   node scripts/seo-audit.mjs --strict   → يفشل على أي تحذير أيضاً

import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { isIndexablePath } from "../shared/seo/url-policy.js";
import {
  aggregateTechnical,
  checkAccessibility,
  checkCanonicalPolicy,
  checkSitemapCoverage,
  checkAiDiscoveryFiles,
  checkHtmlHead,
  checkMetadataUniqueness,
  extractHeadMeta,
  checkHreflang,
  checkImages,
  checkRobots,
  checkRobotsAiAccess,
  checkSecurityHeaders,
  checkSitemap,
  checkStructuredData,
  checkUrlStructure,
  extractLinks,
  findOrphanPages,
} from "../shared/seo/technical-checks.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC = join(ROOT, "public");
const DIST = join(ROOT, "dist");
const SITE_URL = "https://www.mizan.page";

const STRICT = process.argv.includes("--strict");

const read = async (path) => {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
};

const listHtml = async (dir) => {
  // بحث متكرر: صفحات الموقع في dist/ موزّعة على مجلدات فرعية
  // (articles/، news/، schools/، lexicon/…)، والفحص السطحي وحده كان يجعل
  // نتيجة "الصفحات اليتيمة" بلا معنى.
  const out = [];
  const walk = async (current, depth) => {
    if (depth > 4) return;
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === "ads" || entry.name.startsWith(".")) continue;
      const full = join(current, entry.name);
      if (entry.isDirectory()) await walk(full, depth + 1);
      else if (entry.name.endsWith(".html")) out.push(full);
    }
  };
  await walk(dir, 0);
  return out;
};

/** تحويل مسار ملف في dist إلى مسار URL. */
const fileToRoute = (file, base) => {
  const relative = file.slice(base.length).replace(/\\/g, "/").replace(/^\//, "");
  if (relative === "index.html") return "/";
  return `/${relative.replace(/\.html$/, "")}`;
};

/** روابط <loc> الخام كما هي في الخريطة — بلا تطبيع، وإلا اختفت المخالفة. */
const locsFromSitemap = (xml) => [...(xml || "").matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);

/**
 * المسارات القابلة للفهرسة من الخريطة.
 *
 * ملاحظة مهمة: التطبيع هنا كان يُزيل شرطة النهاية قبل الفحص، فتمرّ
 * المخالفة التي يُفترض أن يمسكها الفحص. المسار الخام يُمرَّر الآن كما هو،
 * و checkUrlStructure هو من يقرّر (شرطة النهاية عنده مخالفة صارمة).
 */
const routesFromSitemap = (xml) => {
  return locsFromSitemap(xml).map((loc) => {
    try {
      return new URL(loc).pathname || "/";
    } catch {
      return loc;
    }
  });
};

const results = {};
const notes = [];

console.log("🔎 فحص السيو التقني\n");

// ── robots.txt ──────────────────────────────────────────────────────────────
const robots = await read(join(PUBLIC, "robots.txt"));
results.robots = checkRobots(robots || "", { siteUrl: SITE_URL, criticalPaths: ["/articles", "/lexicon", "/schools", "/news"] });
const aiAccess = checkRobotsAiAccess(robots || "");
notes.push(...aiAccess.details);

// ── sitemap.xml ─────────────────────────────────────────────────────────────
// dist/sitemap.xml هو الملف المُقدَّم فعلاً للزاحف (يكتبه prerender بعد
// التصفية على الصفحات المولَّدة)، فيُقدَّم على نسخة public إن وُجدت.
const servedSitemap = (await read(join(DIST, "sitemap.xml"))) ?? (await read(join(PUBLIC, "sitemap.xml")));
const sitemap = servedSitemap;
const sitemapLocs = locsFromSitemap(sitemap);
const routes = routesFromSitemap(sitemap);
results.sitemap = checkSitemap(sitemap || "", routes, { siteUrl: SITE_URL });

// ── ملفات اكتشاف الذكاء الاصطناعي ───────────────────────────────────────────
const aiFiles = [];
for (const path of ["llms.txt", ".well-known/ai-catalog.json", ".well-known/agent-card.json"]) {
  const content = await read(join(PUBLIC, path));
  if (content !== null) aiFiles.push({ path, content });
}
results.aiDiscovery = checkAiDiscoveryFiles(aiFiles);

// ── ترويسات الأمان ──────────────────────────────────────────────────────────
results.securityHeaders = checkSecurityHeaders(await read(join(PUBLIC, "_headers")) || "");

// ── بنية الروابط ────────────────────────────────────────────────────────────
results.urlStructure = checkUrlStructure(routes);

// ── صفحات HTML ──────────────────────────────────────────────────────────────
// نفحص dist/ إن وُجد (HTML بعد الـ prerender = ما يراه الزاحف فعلاً)،
// وإلا index.html في الجذر.
const htmlDir = (await listHtml(DIST)).length ? DIST : ROOT;
const htmlFiles = await listHtml(htmlDir);

const headScores = [];
const canonicalScores = [];
const imageScores = [];
const a11yScores = [];
const schemaScores = [];
const hreflangScores = [];
const linkedPaths = new Set();
// نصوص الرؤوس لكل ملف مولَّد: بوابة منفصلة للّيتكرار، لأن العيّنة تخفيه.
const metaPages = [];
// فحص كل الصفحات: نتيجة "الصفحات اليتيمة" بلا معنى بعينة جزئية.
const sampledFiles = htmlFiles;

for (const file of sampledFiles) {
  const html = await read(file);
  if (!html) continue;
  const route = fileToRoute(file, htmlDir);
  const url = route === "/" ? SITE_URL : `${SITE_URL}${route}`;

  headScores.push(checkHtmlHead(html, { url }));

  const headMeta = extractHeadMeta(html);
  metaPages.push({ path: route, ...headMeta });
  canonicalScores.push(checkCanonicalPolicy(html, { url, siteUrl: SITE_URL }));
  imageScores.push(checkImages(html));
  a11yScores.push(checkAccessibility(html));
  schemaScores.push(checkStructuredData(html));

  const hreflangs = [...html.matchAll(/hreflang\s*=\s*["']([^"']+)["']/gi)].map((m) => {
    const tag = m[0];
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    return href || "";
  });
  hreflangScores.push(checkHreflang(hreflangs, { expectSingleLanguage: true }));

  const { internal } = extractLinks(html, { origin: SITE_URL });
  for (const link of internal) {
    let path = link;
    try {
      path = link.startsWith("http") ? new URL(link).pathname : link;
    } catch {
      /* رابط نسبي */
    }
    linkedPaths.add(path.replace(/\/$/, "") || "/");
  }
}

const average = (list) =>
  list.length ? Math.round(list.reduce((sum, item) => sum + item.score, 0) / list.length) : 100;

const collectIssues = (list) => {
  const seen = new Set();
  for (const item of list) for (const issue of item.issues || []) seen.add(issue);
  return [...seen];
};

results.canonical = {
  pass: canonicalScores.every((s) => s.pass),
  score: average(canonicalScores),
  issues: collectIssues(canonicalScores),
  details: [
    `${canonicalScores.length} صفحة فُحصت — وسم canonical واحد مطابق لرابط الصفحة بلا شرطة نهاية`,
  ],
};

// les coquilles applicatives (404, pages noindex) sont des fichiers comme les
// autres; la couverture sitemap ne doit pas les réclamer dans la carte.
// app.html هيكل تطبيق (لا مسار له) و404.html صفحة حالة: لا يُطلبان في الخريطة.
const SHELL_ARTIFACTS = new Set(["/app", "/404"]);

const builtRoutes = (await listHtml(DIST))
  .map((file) => fileToRoute(file, DIST))
  .filter((route) => !SHELL_ARTIFACTS.has(route) && isIndexablePath(route));

results.sitemapCoverage = builtRoutes.length
  ? checkSitemapCoverage(sitemapLocs, builtRoutes, { siteUrl: SITE_URL })
  : { pass: true, score: 100, issues: [], details: ["لا يوجد dist/ — تُفحص التغطية بعد البناء فقط."] };

results.head = {
  pass: headScores.every((s) => s.pass),
  score: average(headScores),
  issues: collectIssues(headScores),
  details: [`${headScores.length} صفحة فُحصت`],
};
results.images = {
  pass: imageScores.every((s) => s.pass),
  score: average(imageScores),
  issues: collectIssues(imageScores),
  details: [`${imageScores.length} صفحة فُحصت`],
};
results.accessibility = {
  pass: a11yScores.every((s) => s.pass),
  score: average(a11yScores),
  issues: collectIssues(a11yScores),
  details: [`${a11yScores.length} صفحة فُحصت`],
};
results.structuredData = {
  pass: schemaScores.every((s) => s.pass),
  score: average(schemaScores),
  issues: collectIssues(schemaScores),
  details: [`${schemaScores.length} صفحة فُحصت`],
};
results.metaCopy = checkMetadataUniqueness(metaPages, {
  exemptPaths: [...SHELL_ARTIFACTS],
});

results.hreflang = {
  pass: hreflangScores.every((s) => s.pass),
  score: average(hreflangScores),
  issues: collectIssues(hreflangScores),
  details: ["موقع بلغة واحدة — hreflang غير مطلوب"],
};

// ── الصفحات اليتيمة ─────────────────────────────────────────────────────────
results.orphanPages = findOrphanPages(routes, [...linkedPaths]);

// ── النتيجة المجمّعة ────────────────────────────────────────────────────────
const overall = aggregateTechnical(results);

const order = ["robots", "sitemap", "canonical", "sitemapCoverage", "head", "metaCopy", "structuredData", "images", "accessibility", "securityHeaders", "urlStructure", "orphanPages", "aiDiscovery"];
for (const key of order) {
  const value = results[key];
  if (!value) continue;
  const flag = value.pass ? "✅" : "❌";
  console.log(`${flag} ${key.padEnd(18)} ${String(value.score).padStart(3)}/100`);
  for (const detail of value.details || []) console.log(`     · ${detail}`);
  for (const issue of value.issues || []) console.log(`     ! ${issue}`);
}

console.log(`\n📊 النتيجة التقنية: ${overall.score}/100`);
for (const note of notes) console.log(`   ℹ ${note}`);

const failures = order.filter((key) => results[key] && !results[key].pass);
if (failures.length) {
  console.log(`\n❌ فحوص فاشلة: ${failures.join(", ")}`);
}
if (STRICT && overall.issues.length) {
  console.log(`\n⚠️  الوضع الصارم: ${overall.issues.length} مشكلة`);
  process.exit(1);
}
if (failures.length) process.exit(1);

console.log("\n✅ لا توجد إخفاقات حرجة.");
