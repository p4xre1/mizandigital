// scripts/generate-career-lexicon.mjs
//
// ─────────────────────────────────────────────────────────────────────────────
// lexicon.json ← → career-lexicon.json
// ─────────────────────────────────────────────────────────────────────────────
// صفحات المسارات المهنية تحتاج تعريفات 4–8 مصطلحات لكل مسار (وفي نتائج
// الاختبارات مصطلحات مشابهة). استيراد lexicon.json كاملاً (605 kB) في حزمة
// المسارات كان سيثقل صفحة عامة لا تحتاج أكثر من ستين مصطلحاً.
//
// هذا السكربت يبني ملفاً صغيراً بالمصطلحات المشار إليها فعلاً من careers.json
// ومن أسئلة الاختبارات (quiz-questions.json) — بنفس دالة توليد المعرّف
// (lexiconSlugMap من shared/seo/url-policy.js) المستعملة في prerender وفي
// sitemap، فلا يُنشأ رابط /lexicon/<slug> لا وجود لصفحته.
//
// المصدر الواحد يبقى lexicon.json: هذا الملف مشتقّ، ويُعاد توليده في prebuild.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { lexiconSlugMap } from "../shared/seo/url-policy.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "src", "data");

const readJson = async (name) => JSON.parse(await readFile(join(DATA, name), "utf8"));

const [lexicon, careers, quiz] = await Promise.all([
  readJson("lexicon.json"),
  readJson("careers.json"),
  readJson("quiz-questions.json"),
]);

const referenced = new Set();
for (const career of careers) {
  for (const id of career.lexicon_term_ids ?? []) referenced.add(id);
}
for (const question of quiz) {
  for (const id of question.lexicon_term_ids ?? []) referenced.add(id);
}

const slugs = lexiconSlugMap(lexicon);
const byId = new Map(lexicon.map((item) => [item.id, item]));

const missing = [...referenced].filter((id) => !byId.has(id));
if (missing.length) {
  throw new Error(
    `career-lexicon: ${missing.length} معرّف مصطلح غير موجود في lexicon.json — ${missing.slice(0, 6).join(", ")}`
  );
}

/** الحقول التي تعرضها واجهات المسارات والاختبارات فعلاً. */
function toRecord(item) {
  return {
    id: item.id,
    slug: slugs.get(item.id) ?? item.id,
    term_ar: item.term_ar,
    term_fr: item.term_fr ?? null,
    definition: item.definition ?? "",
    category: item.category ?? null,
    last_reviewed: item.last_reviewed ?? null,
  };
}

const selected = lexicon.filter((item) => referenced.has(item.id)).map(toRecord);
const json = `${JSON.stringify(selected, null, 1)}\n`;
const target = join(DATA, "career-lexicon.json");
const previous = await readFile(target, "utf8").catch(() => null);

if (previous === json) {
  console.log(`✓ career-lexicon.json مطابق (${selected.length} مصطلحاً).`);
} else {
  await writeFile(target, json, "utf8");
  console.log(
    `✓ career-lexicon.json: ${selected.length} مصطلحاً من أصل ${lexicon.length} (${(Buffer.byteLength(json) / 1024).toFixed(1)} kB).`
  );
}
