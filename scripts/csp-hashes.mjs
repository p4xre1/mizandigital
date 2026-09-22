#!/usr/bin/env node
/**
 * csp-hashes.mjs — يُشغَّل في نهاية البناء (بعد vite build + prerender + enhance).
 *
 * ماذا يفعل؟
 *   1) يفحص كل ملفات dist/**\/*.html بحثاً عن السكربتات:
 *        - سكربت مضمّن قابل للتنفيذ (بلا src) — عندنا واحد فقط: theme bootstrap.
 *        - سكربت خارجي (له src) — عندنا واحد فقط: حزمة الدخول assets/index-*.js.
 *        - كتل البيانات `<script type="application/ld+json">` مستثناة: ليست
 *          سكربتات قابلة للتنفيذ، فلا يخصّها توجيه script-src إطلاقاً.
 *   2) يتحقق أن السياسة الناتجة **تسمح فعلاً بما بُني**، لا العكس:
 *        - hash السكربت المضمّن موجود في script-src.
 *        - السكربت الخارجي من نفس الأصل و'`self`' موجود في script-src.
 *        - لا 'strict-dynamic' مع سكربت خارجي بلا integrity — وهذا بالضبط
 *          العطل الذي أخرج الموقع عن العمل: hash لا يطابق سكربتاً خارجياً
 *          إلا إن حمل الوسم integrity مطابقاً (CSP3 §6.7.2.4)، ووسم الحزمة
 *          عندنا بلا integrity ⇒ 'strict-dynamic' يحجب 'self' ⇒ لا JavaScript.
 *        - لا 'unsafe-inline' ولا 'unsafe-eval' في script-src.
 *   3) يملأ `__MIZAN_INLINE_HASH__` في public/_headers ويكتب dist/_headers.
 *
 * أي فشل هنا يُسقط البناء: سياسة CSP مكسورة تعني موقعاً بلا تطبيق، وهي أسوأ
 * من عدم النشر.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const rootDir = dirname(scriptsDir);
const DIST = join(rootDir, "dist");

const PLACEHOLDER = "__MIZAN_INLINE_HASH__";

const sha256b64 = (buf) =>
  "sha256-" + createHash("sha256").update(buf).digest("base64");

const fail = (msg) => {
  console.error(`[csp-hashes] ✗ ${msg}`);
  process.exit(1);
};

/** كل ملفات HTML في dist (المسارات النسبية داخل dist). */
async function distHtmlFiles(dir = DIST) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await distHtmlFiles(full)));
    else if (entry.isFile() && entry.name.endsWith(".html")) out.push(full);
  }
  return out.sort();
}

const SCRIPT_TAG = /<script(\s[^>]*)?>([\s\S]*?)<\/script[^>]*>/gi;
const ATTR = (attrs, name) => {
  const m = new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, "i").exec(attrs || "");
  return m ? m[1] : null;
};

/** أنواع MIME التي تعني «سكربت قابل للتنفيذ»؛ غيرها كتل بيانات لا يخصّها CSP. */
function isExecutableType(type) {
  if (type === null) return true; // بلا type ⇒ JavaScript
  const value = type.split(";")[0].trim().toLowerCase();
  return (
    value === "" ||
    value === "module" ||
    value === "text/javascript" ||
    value === "application/javascript" ||
    value === "text/ecmascript" ||
    value === "application/ecmascript"
  );
}

/**
 * يستخرج السكربتات من HTML واحد.
 * @returns {{inline: {body:string,attrs:string}[], external: {src:string,attrs:string}[], dataBlocks:number}}
 */
function scriptsOf(html) {
  const inline = [];
  const external = [];
  let dataBlocks = 0;
  for (const match of html.matchAll(SCRIPT_TAG)) {
    const attrs = match[1] || "";
    const body = match[2];
    const src = ATTR(attrs, "src");
    if (src) external.push({ src, attrs });
    else if (isExecutableType(ATTR(attrs, "type"))) inline.push({ body, attrs });
    else dataBlocks += 1;
  }
  return { inline, external, dataBlocks };
}

/** توجيه واحد من نص السياسة (يفصل بـ ; ويأخذ أول مطابقة). */
function directive(policy, name) {
  const m = new RegExp(`(?:^|;)\\s*${name}\\s+([^;]+)`, "i").exec(policy);
  return m ? m[1].trim() : null;
}

const htmlFiles = await distHtmlFiles().catch(() =>
  fail("dist/ غير موجود — شغّل vite build أولاً")
);
if (htmlFiles.length === 0) fail("لم يُعثر على أي ملف HTML في dist/");

/* ── 1) جمع السكربتات من كل الصفحات ─────────────────────────────────────── */

const inlineHashes = new Map(); // hash ⇒ مثال مسار
const externalScripts = new Map(); // src ⇒ {pages, withoutIntegrity}
let dataBlocks = 0;

for (const file of htmlFiles) {
  const { inline, external, dataBlocks: blocks } = scriptsOf(
    await readFile(file, "utf8")
  );
  dataBlocks += blocks;
  for (const { body } of inline) {
    const hash = sha256b64(Buffer.from(body, "utf8"));
    if (!inlineHashes.has(hash)) inlineHashes.set(hash, relative(DIST, file));
  }
  for (const { src, attrs } of external) {
    const stat = externalScripts.get(src) || { pages: 0, withoutIntegrity: 0 };
    stat.pages += 1;
    if (!ATTR(attrs, "integrity")) stat.withoutIntegrity += 1;
    externalScripts.set(src, stat);
  }
}

if (inlineHashes.size !== 1) {
  fail(
    `المتوقع سكربت مضمّن قابل للتنفيذ واحد (theme bootstrap) في كل الصفحات، ` +
      `وُجد ${inlineHashes.size} نصاً مختلفاً: ` +
      [...inlineHashes.entries()].map(([h, f]) => `${h} (${f})`).join(" ، ") +
      ". كل سكربت مضمّن جديد يحتاج hash خاصاً به في script-src."
  );
}
if (externalScripts.size === 0) {
  fail("لم يُعثر على سكربت الحزمة (assets/index-*.js) في أي صفحة HTML");
}
const [[inlineHash]] = [...inlineHashes.entries()];

/* ── 2) تعبئة placeholder والتحقق من السياسة الناتجة ─────────────────────── */

const headersTpl = await readFile(join(rootDir, "public/_headers"), "utf8");
if (!headersTpl.includes(PLACEHOLDER)) {
  fail(`الplaceholder ${PLACEHOLDER} مفقود من public/_headers`);
}

const headers = headersTpl.replaceAll(
  PLACEHOLDER,
  inlineHash.slice("sha256-".length)
);
if (headers.includes("__MIZAN_")) fail("بقي placeholder بعد التعبئة");

const policy = /Content-Security-Policy:\s*([^\n]+)/.exec(headers)?.[1];
if (!policy) fail("لا يوجد توجيه Content-Security-Policy في public/_headers");

const scriptSrc = directive(policy, "script-src");
if (!scriptSrc) fail("لا يوجد script-src في CSP");
const scriptSources = scriptSrc.split(/\s+/).filter(Boolean);
const has = (token) => scriptSources.includes(token);

if (has("'strict-dynamic'")) {
  // الوسوم التي بلا integrity لا يمكن أن يطابقها أي hash في script-src، ومع
  // 'strict-dynamic' تُتجاهل 'self' وقائمة المضيفين ⇒ الحزمة تُحجب بالكامل.
  const withoutIntegrity = [...externalScripts.entries()]
    .filter(([, stat]) => stat.withoutIntegrity > 0)
    .map(([src]) => src);
  if (withoutIntegrity.length > 0) {
    fail(
      "script-src يحتوي 'strict-dynamic' وهذا يكسر الموقع: الـhash لا يطابق " +
        "سكربتاً خارجياً إلا بوجود integrity مطابق على الوسم " +
        "(CSP3 §6.7.2.4)، وهذه الوسوم بلا integrity: " +
        `${withoutIntegrity.join(" ، ")} — فتُحجب الحزمة كاملة. ` +
        "أزل 'strict-dynamic' أو أضف integrity إلى الوسم (مع تطابق البايتات)."
    );
  }
}
if (!has("'self'")) {
  fail("script-src بلا 'self' — حزمة التطبيق نفسها لن تُحمَّل");
}
if (!has(`'${inlineHash}'`)) {
  fail(
    `hash السكربت المضمّن ${inlineHash} غير موجود في script-src — ` +
      "سكربت السمة (theme) سيُحجب."
  );
}
if (has("'unsafe-inline'")) {
  fail(
    "script-src يحتوي 'unsafe-inline': وجود hash يُلغي مفعولها في CSP2+ " +
      "ويوهم بوجود سماح غير قائم — تُزال لتبقى السياسة صادقة."
  );
}
if (has("'unsafe-eval'")) fail("script-src يحتوي 'unsafe-eval' — مرفوض أمنياً");

for (const src of externalScripts.keys()) {
  const sameOrigin = src.startsWith("/") && !src.startsWith("//");
  const allowedHost = /^https:\/\/(www\.)?(googletagmanager\.com|google-analytics\.com|gstatic\.com|challenges\.cloudflare\.com)\//.test(
    src
  );
  if (!sameOrigin && !allowedHost) {
    fail(
      `السكربت الخارجي ${src} ليس من نفس الأصل ولا في قائمة المضيفين — ` +
        "سيُحجب، والتطبيق لن يعمل."
    );
  }
}

/* ── 3) كتابة dist/_headers ─────────────────────────────────────────────── */

await writeFile(join(DIST, "_headers"), headers);

const entryFile = [...externalScripts.keys()].find((s) => s.startsWith("/"));
const entryHash = entryFile
  ? sha256b64(await readFile(join(DIST, entryFile.replace(/^\//, ""))))
  : null;

console.log(
  `[csp-hashes] الصفحات المفحوصة: ${htmlFiles.length} (كتل LD+JSON: ${dataBlocks})`
);
if (entryHash) {
  console.log(
    `[csp-hashes] حزمة الدخول ${entryFile} → ${entryHash} (تُحمَّل عبر 'self'، لا hash)`
  );
}
console.log(`[csp-hashes] سكربت السمة المضمّن → ${inlineHash}`);
console.log("[csp-hashes] ✓ السياسة تسمح بما بُني، وdist/_headers جاهز للنشر");
