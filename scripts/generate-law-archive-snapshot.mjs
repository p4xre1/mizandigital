// scripts/generate-law-archive-snapshot.mjs
//
// لقطة أرشيف القوانين المتاحة في ميزان — لواجهة «القوانين والمراجع المنظمة
// للمسار» في /careers/<slug>.
//
// لماذا لقطة ثابتة بدل استعلام مباشر من الصفحة؟
//   1) صفحة المسار تُفتح كثيراً ولا يجب أن تنتظر طلب شبكة لمجرد عرض مرجع.
//   2) الزائر بلا حساب يجب أن يرى نفس ما يراه المسجّل: أرشيف القوانين العام
//      (public.laws) لا يخضع لأي شرط جلسة، فقراءته وقت البناء كافية.
//   3) نفس مسار البناء المستعمل في sitemap وprerender وreference — لا نسخة
//      ثانية قد تنحرف عن أرشيف النشر.
//
// القاعدة الحاكمة هنا: لا يُخترع أي رابط. المسار العام للنص القانوني يُحسب
// بنفس الدوال المستعملة في prerender (docSlug + canonicalPdf) وبنفس ترتيب
// تخصيص المعرّفات (مستندات محلية ← CMS pdfs ← CMS laws)، لأن ترتيباً مختلفاً
// ينتج معرّفاً مختلفاً فيصير الرابط في صفحة المسار إلى صفحة غير موجودة.
//
// بلا اتصال بـ CMS (بناء معزول/بلا مفاتيح) تُكتب لقطة فارغة عن قصد: كل مسار
// يعرض «⚠️ النص القانوني لم يضف بعد إلى أرشيف ميزان.» بدل رابط مكسور.
//
// الشغّل: node scripts/generate-law-archive-snapshot.mjs  (ضمن prebuild)

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalPdf, docSlug, pathOfUrl } from "../shared/seo/url-policy.js";
import { fetchPublishedCmsContent } from "./lib/cms-content.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "../src/data");
const OUT = join(DATA, "laws.client.json");

const readJson = async (name) => JSON.parse(await readFile(join(DATA, name), "utf8"));

/** تاريخ بلا وقت — الأرشيف يعرض اليوم فقط، والوقت يوهم بدقة غير موجودة. */
const dateOnly = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const documents = await readJson("docs.json");
const { ok, error, pdfs, laws } = await fetchPublishedCmsContent();

if (!ok) {
  console.warn(`⚠️  law-archive: ${error} — تُكتب لقطة فارغة (بلا رابط مُخترع).`);
}

// نفس ترتيب prerender حرفياً: المعرّف يتقرر بحسب موضع السجل في هذا التسلسل.
const usedSlugs = new Set();
const lawEntries = [];

for (const item of documents) docSlug(item, usedSlugs);
for (const item of pdfs) docSlug(item, usedSlugs);
for (const item of laws) {
  const slug = docSlug(item, usedSlugs);
  lawEntries.push({
    // نفس معرّف الأرشيف المستعمل في أرشيف ميزان (/pdf/<slug>)
    slug,
    /** الرابط العام الفعلي للنص في أرشيف ميزان — لا يُبنى في الواجهة مرة أخرى. */
    public_path: pathOfUrl(canonicalPdf(slug)),
    db_slug: clean(item.slug) || null,
    title: clean(item.title),
    law_number: clean(item.law_number) || null,
    official_gazette_number: clean(item.official_gazette_number) || null,
    publication_date: dateOnly(item.publication_date),
    /**
     * حالة التحقق من الإسناد الرسمي. الأرشيف الحالي (CMS) لا يخزّن تاريخ
     * تحقق موثّقاً، فالقيمة تبقى null حتى يُضاف الحقل في القاعدة — ولا نكتب
     * تاريخاً من عندنا.
     */
    source_verified_at: dateOnly(item.source_verified_at),
  });
}

const payload = {
  generated_at: new Date().toISOString().slice(0, 10),
  count: lawEntries.length,
  laws: lawEntries,
};

await writeFile(OUT, JSON.stringify(payload, null, 2) + "\n", "utf8");
console.log(
  `✓ src/data/laws.client.json — ${lawEntries.length} نصاً قانونياً من الأرشيف` +
    (lawEntries.length ? "" : " (بلا CMS: لا روابط قوانين في صفحات المسارات)")
);
