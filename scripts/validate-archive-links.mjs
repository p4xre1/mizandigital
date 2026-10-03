#!/usr/bin/env node
/**
 * فحص روابط الأرشيف قبل البناء — لا ملف مفقود يصل إلى الخريطة.
 *
 * المشكلة التي يحميها هذا الفحص
 * ------------------------------
 * كان `src/data/docs.json` يضمّ تسعة سجلات تشير إلى `/docs/*.pdf`. لا مجلد
 * `public/docs/` موجود في المستودع أصلاً، فكل رابط منها يعطي 404 في الإنتاج:
 * صفحة «تحميل» كاملة في sitemap.xml بزرّ لا يفتح شيئاً، وتسع بطاقات ميتة في
 * واجهة الأرشيف. الخلل لم يظهر في أي اختبار لأن الاختبارات تتحقق من شكل
 * الرابط (`startsWith("/docs/")`) لا من وجود الملف.
 *
 * القاعدة
 * -------
 *   كل رابط محلي (يبدأ بـ `/`) في بيانات الأرشيف يجب أن يقابله ملف موجود في
 *   `public/`. الروابط المطلقة (http/https — تخزين R2 أو موقع رسمي) لا تُفحص
 *   هنا: لا يمكن التحقق منها بلا شبكة وقت البناء.
 *
 *   سجلّ بلا رابط تحميل حقيقي ولا نصّ قانوني يُقرأ على صفحته سجلّ ميت كذلك،
 *   ويُرفض بالمنطق نفسه المستعمل في shared/archive/links.js.
 *
 * الشغّل: node scripts/validate-archive-links.mjs [--strict]
 *   --strict  → إخفاق البناء عند أي رابط ميت (مستحسن في CI).
 */

import { access, readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { downloadLinkOf, isArchivableItem } from "../shared/archive/links.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA = join(ROOT, "src", "data");
const PUBLIC = join(ROOT, "public");

const STRICT = process.argv.includes("--strict");

/** هل الملف موجود فعلاً في public/؟ (URL-decoded لأن الأسماء عربية) */
async function localFileExists(publicPath) {
  const relative = decodeURIComponent(String(publicPath).replace(/^\/+/, "").split("?")[0].split("#")[0]);
  if (!relative) return false;
  // حماية من تجاوز المجلد (../..)
  if (relative.split(/[\\/]/).includes("..")) return false;
  try {
    await access(join(PUBLIC, relative));
    return true;
  } catch {
    return false;
  }
}

const readJson = async (name) => JSON.parse(await readFile(join(DATA, name), "utf8"));

const problems = [];
let checked = 0;

const docs = await readJson("docs.json");

for (const doc of docs) {
  checked += 1;
  const label = doc?.title || doc?.id || "(بلا عنوان)";

  if (!isArchivableItem(doc)) {
    problems.push(`«${label}» — سجلّ بلا رابط تحميل ولا نصّ يُقرأ.`);
    continue;
  }

  const link = downloadLinkOf(doc);
  if (!link.startsWith("/")) continue; // رابط مطلق: خارج نطاق هذا الفحص
  if (await localFileExists(link)) continue;

  problems.push(`«${label}» — الرابط ${link} لا يقابله ملف في public/.`);
}

if (problems.length) {
  const head = `\n❌ أرشيف: ${problems.length} من ${checked} سجلّاً برابط تحميل ميت:`;
  console.error(head);
  for (const problem of problems) console.error(`   • ${problem}`);
  console.error(
    `\n   أصلِح الروابط في src/data/docs.json (أو أضِف الملفات إلى public/docs/) — ` +
      `صفحات التحميل الفارغة تُقرأ «Soft 404» في محركات البحث.\n`
  );

  if (STRICT) process.exit(1);
  console.warn("   ⚠️  يُكمل البناء لأن الفحص ليس في وضع --strict.\n");
} else {
  console.log(`✓ أرشيف: ${checked} سجلّاً وكل روابط التحميل المحلية موجودة.`);
}

// فحص إضافي: أي مجلد docs/ في public/ يضمّ ملفات غير مستعملة يُذكر بها فقط
// (تحذير لا خطأ) — الملف المرفوع بلا سجلّ في docs.json ملف يتبعثر بلا أثر.
try {
  const files = (await readdir(join(PUBLIC, "docs"))).filter((name) => name.toLowerCase().endsWith(".pdf"));
  if (files.length) {
    const used = new Set(
      docs
        .map((doc) => downloadLinkOf(doc))
        .filter((link) => link.startsWith("/docs/"))
        .map((link) => decodeURIComponent(link.replace(/^\/docs\//, "")))
    );
    const orphans = files.filter((name) => !used.has(name));
    if (orphans.length) {
      console.warn(`⚠️  أرشيف: ${orphans.length} ملف PDF في public/docs/ بلا سجلّ في docs.json: ${orphans.slice(0, 5).join(", ")}`);
    }
  }
} catch {
  /* لا مجلد public/docs/ — لا شيء يُفحص */
}
