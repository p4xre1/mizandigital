#!/usr/bin/env node
/**
 * csp-hashes.mjs — يُشغَّل في نهاية البناء (بعد vite build + prerender).
 *
 * مخطط CSP في public/_headers مصمَّم كسياسة «لا يمكن تجاوزها» حسب متطلبات
 * Lighthouse (تدقيق csp-xss): في المتصفحات الحديثة (CSP3) يعمل
 * 'strict-dynamic' فتُتجاهل 'self' و'unsafe-inline' وقائمة المضيفين، ولا
 * يعمل إلّا ما يحمل hash/nonce وما يحمّله سكربت «موثوق»:
 *
 *   1) السكربت المضمّن الوحيد (theme bootstrap) في index.html — محتوى ثابت
 *      في المستودع، hash محسوب من dist/index.html بعد البناء.
 *   2) حزمة التطبيق entry (assets/index-<hash>.js) — محتواها يتغيّر مع كل
 *      بناء، لذلك hash يُملأ هنا في dist/_headers من الملف الفعلي.
 *
 * بقية السكربتات (chunks الديناميكية import()، ومحمّل gtag الذي يحقنه
 * src/lib/analytics/gtag.ts، وأي سكربت يحقنه المتصفح) ترث «الثقة» عبر
 * trust chain الخاص بـ 'strict-dynamic'.
 *
 * للمتصفحات الأقدم (CSP2) يبقى 'self' و'unsafe-inline' وقائمة
 * googletagmanager/microsoft احتياطياً — هذه المصادر تُتجاهل في CSP3.
 *
 * أي فشل في هذا السكربت يُسقط البناء حتى لا يُنشر موقع بسياسة CSP مكسورة.
 */
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const rootDir = dirname(scriptsDir);
const DIST = join(rootDir, "dist");

const sha256b64 = (buf) =>
  "sha256-" + createHash("sha256").update(buf).digest("base64");

const fail = (msg) => {
  console.error(`[csp-hashes] ✗ ${msg}`);
  process.exit(1);
};

const indexHtml = await readFile(join(DIST, "index.html"), "utf8").catch(() =>
  fail("dist/index.html غير موجود — شغّل vite build أولاً")
);

// 1) حزمة الدخول: وسم <script type="module" ... src="..."> الوحيد في dist/index.html
const moduleTag =
  /<script[^>]*\stype="module"[^>]*\ssrc="([^"]+)"[^>]*>/i.exec(indexHtml) ||
  /<script[^>]*\ssrc="([^"]+)"[^>]*\stype="module"[^>]*>/i.exec(indexHtml);
if (!moduleTag) fail("لم يُعثر على <script type=\"module\"> في dist/index.html");
const entryFile = moduleTag[1].replace(/^\//, "");
const entryBuf = await readFile(join(DIST, entryFile)).catch(() =>
  fail(`ملف الحزمة ${entryFile} غير موجود في dist/`)
);
const entryHash = sha256b64(entryBuf);

// 2) السكربتات المضمّنة الخالية من attributes — يجب أن يكون هناك واحد واحد (theme)
// \s*/[^>]* داخل الوسوم: HTML يسمح بمسافات أو حتى سوابق قبل > في وسم الإغلاق (CodeQL).
const inlineMatches = [...indexHtml.matchAll(/<script\s*>([\s\S]*?)<\/script[^>]*>/gi)];
if (inlineMatches.length !== 1) {
  fail(
    `المتوقع سكربت مضمّن واحد بلا attributes في dist/index.html، وُجد ${inlineMatches.length}. ` +
      "إذا أضفت سكربتاً مضمّناً جديداً فحدّث هذا السكربت (hash خاص به في public/_headers)."
  );
}
const inlineHash = sha256b64(Buffer.from(inlineMatches[0][1], "utf8"));

// 3) تعبئة public/_headers → dist/_headers
const headersTpl = await readFile(join(rootDir, "public/_headers"), "utf8");
if (!headersTpl.includes("__MIZAN_ENTRY_HASH__"))
  fail("الplaceholder __MIZAN_ENTRY_HASH__ مفقود من public/_headers");
if (!headersTpl.includes("__MIZAN_INLINE_HASH__"))
  fail("الplaceholder __MIZAN_INLINE_HASH__ مفقود من public/_headers");

const headers = headersTpl
  .replaceAll("__MIZAN_ENTRY_HASH__", entryHash.slice("sha256-".length))
  .replaceAll("__MIZAN_INLINE_HASH__", inlineHash.slice("sha256-".length));
if (headers.includes("__MIZAN_")) fail("بقي placeholder بعد التعبئة");

await writeFile(join(DIST, "_headers"), headers);

console.log(`[csp-hashes] entry  ${entryFile} → ${entryHash}`);
console.log(`[csp-hashes] inline theme script      → ${inlineHash}`);
console.log("[csp-hashes] ✓ dist/_headers محسَّن وجاهز للنشر");
