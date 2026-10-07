/**
 * فحص الروابط الداخلية في المخرجات المبنية (dist/).
 * -------------------------------------------------------------------------
 * كان هذا السكربت يعتمد على حزمة `globby` غير المثبّتة في المشروع، فينهار
 * عند الاستيراد (ERR_MODULE_NOT_FOUND) قبل أن يفحص شيئاً — وبقي في المستودع
 * أداة ميتة لا يعرفها package.json ولا CI.
 *
 * النسخة الحالية بلا أي اعتمادية: node:fs فقط، وتقارن كل رابط داخلي
 * (href/src/action) في صفحات dist بملف حقيقي في dist.
 *
 * الاستعمال:
 *   node scripts/check-links.mjs          → تقرير، ويخرج 1 عند وجود رابط ميت
 *   node scripts/check-links.mjs --quiet  → الملخّص فقط
 *
 * ملاحظات دقّة:
 *   • المسارات العربية مُرمَّزة في HTML (%D8%…)، فنُفكّ الترميز قبل المطابقة.
 *   • المسار يطابق: ملفاً، أو ملفاً بامتداد .html، أو مجلداً فيه index.html.
 *   • تُتجاهل: الروابط الخارجية، mailto/tel/data/javascript، والمراسي (#…).
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const DIST = "dist";
const QUIET = process.argv.includes("--quiet");

if (!existsSync(DIST)) {
  console.error("❌ لا مجلد dist/ — شغّل `npm run build` أولاً.");
  process.exit(1);
}

// ── جمع صفحات HTML ──────────────────────────────────────────────────────────
const pages = [];
(function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".html")) pages.push(full);
  }
})(DIST);

// ── مطابقة المسار بملف في dist ──────────────────────────────────────────────
const resolveTarget = (rawPath) => {
  let path = rawPath.split("#")[0].split("?")[0];
  try {
    path = decodeURIComponent(path);
  } catch {
    /* ترميز غير صالح — نكمل بالمسار كما هو */
  }
  if (path === "" || path === "/") path = "/index.html";

  const relative = path.replace(/^\//, "");
  const candidates = [
    join(DIST, relative),
    join(DIST, `${relative}.html`),
    join(DIST, relative, "index.html"),
  ];
  return candidates.some((candidate) => {
    try {
      return existsSync(candidate) && statSync(candidate).isFile();
    } catch {
      return false;
    }
  });
};

const SKIP = /^(#|data:|mailto:|tel:|javascript:|blob:)/i;
const ATTRIBUTE = /(?:href|src|action)\s*=\s*["']([^"']+)["']/gi;

const broken = new Map(); // الرابط الميت ← الصفحات التي تشير إليه
let checked = 0;

for (const file of pages) {
  const html = readFileSync(file, "utf8");
  const page = file.slice(DIST.length + 1);
  for (const match of html.matchAll(ATTRIBUTE)) {
    const raw = match[1];
    if (!raw || SKIP.test(raw)) continue;
    if (/^https?:\/\//i.test(raw)) {
      // الروابط المطلقة على نطاق المنصة تُفحص أيضاً، وغيرها يُترك للشبكة.
      try {
        const url = new URL(raw);
        if (url.host !== "www.mizan.page" && url.host !== "mizan.page") continue;
        raw = url.pathname + url.search;
      } catch {
        continue;
      }
    }
    if (!raw.startsWith("/")) continue; // نسبي داخل صفحة (نادر) — ليس مسار موقع
    checked++;
    if (!resolveTarget(raw)) {
      if (!broken.has(raw)) broken.set(raw, new Set());
      broken.get(raw).add(page);
    }
  }
}

if (!QUIET) {
  for (const [target, refs] of [...broken.entries()].sort((a, b) => b[1].size - a[1].size)) {
    console.log(`⚠️  رابط ميت: ${target}`);
    console.log(`    في: ${[...refs].slice(0, 5).join(", ")}${refs.size > 5 ? ` … (${refs.size})` : ""}`);
  }
}

if (broken.size === 0) {
  console.log(`✨ كل الروابط الداخلية سليمة (${checked} رابطاً في ${pages.length} صفحة).`);
  process.exit(0);
}

console.error(`\n❌ روابط ميتة: ${broken.size} هدفاً فريداً في ${pages.length} صفحة.`);
process.exit(1);
