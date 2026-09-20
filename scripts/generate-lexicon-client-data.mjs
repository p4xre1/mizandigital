import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/*
 * lexicon.json ← → lexicon.client.json
 *
 * الملفات في src/data تُستورد مباشرة في المتصفح، فيتحوّل كل حقل فيها إلى بايتات
 * داخل chunk المعجم (Vite يحوّل JSON إلى وحدة JS). الإثراء الذي يخدم الزاحف
 * والطلبة معاً (scripts/enrich-lexicon.mjs) كان يكلّف +35 kB gzip على كل من يفتح
 * صفحة مصطلح، حتى لو لم يقرأ الحقول الزائدة.
 *
 * هذا السكربت يولّد نسخة المتصفح بالحقول التي تعرضها الواجهة فعلاً. المصدر
 * الواحد يبقى src/data/lexicon.json: النسخة الثابتة (prerender) تقرأ منه كاملًا
 * لأن ما فيها لا يُحمَّل chunk منفصلاً، والمتصفح يقرأ النسخة المقلّصة.
 *
 * قائمة الحذف موثّقة عمداً — أي حقل يُعرض في TermPage/LexiconPage يجب أن يبقى
 * هنا، وإلا اختفى محتوى من الصفحة بعد الـ hydration رغم أنه موجود في HTML
 * الثابت (وهو أسوأ من غيابه من البداية).
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "src/data/lexicon.json");
const TARGET = join(ROOT, "src/data/lexicon.client.json");

/** حقول لا تقرأها أي وحدة في src/ (تحقّق: grep على الاسم في src). */
const DROP_TOP_LEVEL = new Set([
  // المقابلان الفرنسيان مُعدَّان لنسخة فرنسية مستقبلية وللقارئ الآلي في
  // النسخة الثابتة؛ لا يوجد تبويب FR في الواجهة اليوم.
  "simple_explanation_fr",
  "examples_fr",
  // أثر داخلي للمولّد (من كتب السطر؟) لا معنى له عند الطالب.
  "enrichment_source",
]);

const DROP_SOURCE_LEVEL = new Set([
  // البوابة تُطبع في النسخة الثابتة فقط؛ الواجهة تربط بالمصدر عبر الشجرة
  // القانونية لا برابط مباشر.
  "source_url",
  "last_verified",
]);

const DROP_ARTICLE_LEVEL = new Set([
  // الواجهة تعرض article.number + article.phrase (الحقلان الأصليان)؛
  // article_number/quotation/quotation_type إسقاط مُنمَّج لنفس المعلومة
  // يحتاجه التدقيق البشري لا المتصفح.
  "article_number",
  "quotation",
  "quotation_type",
]);

function toClientRecord(item) {
  const copy = {};
  for (const [key, value] of Object.entries(item)) {
    if (DROP_TOP_LEVEL.has(key)) continue;
    copy[key] = value;
  }

  if (Array.isArray(copy.legal_sources)) {
    copy.legal_sources = copy.legal_sources.map((source) => {
      const next = {};
      for (const [key, value] of Object.entries(source || {})) {
        if (DROP_SOURCE_LEVEL.has(key)) continue;
        next[key] = key === "articles" && Array.isArray(value)
          ? value.map((article) => {
              const clean = {};
              for (const [aKey, aValue] of Object.entries(article || {})) {
                if (DROP_ARTICLE_LEVEL.has(aKey)) continue;
                clean[aKey] = aValue;
              }
              return clean;
            })
          : value;
      }
      return next;
    });
  }

  return copy;
}

const source = JSON.parse(await readFile(SOURCE, "utf8"));
if (!Array.isArray(source)) throw new Error("lexicon.json: لائحة متوقعة");

const client = source.map(toClientRecord);
const json = `${JSON.stringify(client, null, 1)}\n`;
const next = await readFile(TARGET, "utf8").catch(() => null);

if (next === json) {
  console.log(`✓ lexicon.client.json مطابق لـ lexicon.json (${client.length} سجلاً).`);
} else {
  await writeFile(TARGET, json, "utf8");
  const before = Buffer.byteLength(JSON.stringify(source));
  const after = Buffer.byteLength(json);
  console.log(
    `✓ lexicon.client.json: ${client.length} سجلاً — ${(after / 1024).toFixed(1)} kB بدل ${(before / 1024).toFixed(1)} kB (−${(100 - (100 * after) / before).toFixed(0)}%).`
  );
}
