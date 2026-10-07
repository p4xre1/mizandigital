// التحقق من خريطة الإحالات — لماذا سكربت مستقل؟
// ---------------------------------------------
// المجموعة المنسّقة (src/data/reference-map.json) هي محتوى قانوني منشور للعموم.
// خطأ واحد فيها ليس «خللاً في العرض»: اقتباس منسوب إلى نصّ رسمي وهو ليس منه،
// أو رابط هدف مؤكد لا يفتح، يُقرأ بوصفه معلومة قانونية خاطئة. لذلك يُتحقق منها
// آلياً في كل بناء، وقبل الواجهة وقبل الجدول.
//
// ما لا يتحقق منه هذا السكربت: صحة الاقتباس مقابل النص الرسمي. تلك مقابلة بشرية
// موثّقة في تاريخ Git عند كل تعديل، ولا يمكن التحقق منها بلا النص الأصلي.
// لذا يشترط السكربت وجود الاقتباس وطوله الأدنى، ويترك تصديقه للمراجع.
//
// الشغّل: node scripts/validate-reference-map.mjs  (يُستدعى ضمن prebuild)

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, "../src/data/reference-map.json");

const TYPES = ["explicit", "delegation", "procedural", "penal", "hierarchy", "interpretive"];

/** رابط https صالح بلا بيانات اعتماد في الرابط. نفس قاعدة safeHref في الواجهة. */
function isSafeHttps(value) {
  if (typeof value !== "string" || value.trim() === "") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

const errors = [];
const warnings = [];
const fail = (id, message) => errors.push(`❌ ${id}: ${message}`);
const warn = (id, message) => warnings.push(`⚠️  ${id}: ${message}`);

const raw = JSON.parse(await readFile(FILE, "utf8"));
const meta = raw?.meta;
const list = raw?.references;

if (!meta || typeof meta !== "object") fail("meta", "كتلة meta مفقودة: بلا مصدر ولا بيان مراجعة لا يجوز النشر.");
if (!Array.isArray(list) || list.length === 0) fail("references", "لا توجد إحالات.");

const seenIds = new Set();
const seenPairs = new Set();

for (const item of list ?? []) {
  const id = item?.id ?? "(بلا معرّف)";

  if (!item?.id) fail(id, "معرّف مفقود.");
  if (seenIds.has(item.id)) fail(id, "معرّف مكرر.");
  seenIds.add(item.id);

  for (const key of ["fromText", "fromArticle", "toText", "toArticle", "type", "topic", "relationship", "excerpt"]) {
    if (typeof item[key] !== "string" || item[key].trim() === "") {
      fail(id, `حقل إلزامي فارغ: ${key}`);
    }
  }

  if (!TYPES.includes(item.type)) {
    fail(id, `نوع علاقة غير معروف: ${item.type} — القيم المقبولة: ${TYPES.join(", ")}`);
  }

  // الاقتباس هو دليل الإحالة. إحالة بلا اقتباس رأي، لا إحالة.
  if (typeof item.excerpt === "string" && item.excerpt.trim().length > 0) {
    if (item.excerpt.trim().length < 20) warn(id, "الاقتباس قصير جداً؛ تأكد أنه النص الدستوري لا تلخيص له.");
    if (/[«»]/.test(item.excerpt)) warn(id, "الاقتباس يحتوي علامتَي تنصيص داخليتين؛ تُضاف تلقائياً في العرض.");
  }

  const pair = `${item.fromText}|${item.fromArticle}|${item.toText}|${item.toArticle}|${item.type}`;
  if (seenPairs.has(pair)) fail(id, `إحالة مكررة: ${item.fromArticle} ← ${item.toArticle}`);
  seenPairs.add(pair);

  // المصدر: إحالة بلا مصدر رسمي لا تُقبل، لأنها بلا سند يمكن التحقق منه.
  const sourceUrl = item.sourceUrl || meta?.sourceUrl;
  if (!isSafeHttps(sourceUrl)) fail(id, "رابط مصدر غير صالح (يلزم https بلا بيانات اعتماد).");

  // الهدف المؤكد يستلزم رابطاً آمناً. ادّعاء التثبيت بلا رابط يوهم المستخدم.
  if (item.targetVerified === true) {
    if (!isSafeHttps(item.targetUrl)) {
      fail(id, "targetVerified = true بلا رابط هدف صالح: إما رابط https وإما targetVerified = false.");
    }
  } else if (item.targetUrl && item.targetVerified !== true) {
    warn(id, "يوجد targetUrl مع targetVerified غير مؤكد؛ الرابط لن يظهر في الواجهة.");
  }

  if (item.evidenceUrl && !isSafeHttps(item.evidenceUrl)) fail(id, "رابط مصدر التأكيد غير صالح.");

  if (item.also != null) {
    if (!Array.isArray(item.also)) fail(id, "also يجب أن يكون مصفوفة نصية.");
    else if (item.also.some((value) => typeof value !== "string" || value.trim() === "")) {
      fail(id, "also يحتوي قيمة فارغة.");
    }
  }
}

if (errors.length === 0) {
  const byType = {};
  for (const item of list) byType[item.type] = (byType[item.type] ?? 0) + 1;
  console.log(`✅ خريطة الإحالات: ${list.length} إحالة سليمة.`);
  console.log(`   الأنواع: ${Object.entries(byType).map(([k, v]) => `${k}=${v}`).join("  ")}`);
  console.log(`   أهداف مؤكدة بمصدرها: ${list.filter((item) => item.targetVerified === true).length}`);
}

for (const warning of warnings) console.log(warning);
for (const error of errors) console.error(error);

if (errors.length > 0) {
  console.error(`\n❌ ${errors.length} خطأً في src/data/reference-map.json — يُمنع النشر قبل إصلاحها.`);
  process.exit(1);
}
