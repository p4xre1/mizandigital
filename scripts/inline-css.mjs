#!/usr/bin/env node
/**
 * inline-css.mjs — يُشغَّل في نهاية البناء (بعد prerender/enhance وقبل CSP).
 *
 * المسألة كما رصدها Lighthouse:
 *   «Render-blocking requests — /assets/index-*.css — 24.6 KiB — 650 ms»
 * ملف CSS واحد كان يحجب أول رسم للصفحة كلها. والمستند نفسه نص ثابت مُهيّأ
 * مسبقاً (prerender) ووصل قبل ذلك: أي أن أول بكسل كان ينتظر جولة شبكة كاملة
 * (طلب + تنزيل + تحليل) لا ينتظر أي محتوى حقيقي. على 4G بطيء تلك الجولة
 * تُقدَّر بمئات الملّي ثوانٍ من FCP وLCP معاً، وهي أول ما يُحسّن.
 *
 * الحل المعتمد: نقل ملف CSS داخل المستند نفسه (inline <style>) بدل طلبه.
 *   • لا طلب يحجب الرسم إطلاقاً ⇒ FCP يقترب من زمن وصول المستند.
 *   • الحجم على الشبكة لا يزيد عملياً: المستند كان يُرسَل مضغوطاً (gzip/brotli)
 *     وCSS مضغوط داخل المستند يقارب حجمه مضغوطاً في ملف منفصل.
 *   • لا خطر «CSS حرج» جزئي (Critical CSS): الملف كامل داخل الصفحة، فلا نافذة
 *     يظهر فيها المحتوى بلا تنسيق ولا FOUC ولا انزياح تخطيط.
 *   • الزيارات المتكررة لا تدفع الثمن مرتين: ترويسة المستند
 *     `Cache-Control: public, max-age=0, must-revalidate` مع ETag تعني رد 304
 *     بلا جسم ⇒ CSS المضمّن يأتي من الكاش عينه، والملف المنفصل (سنة كاملة)
 *     لم يكن يُعاد طلبه أصلاً في مسار SPA.
 *
 * ما يفعله السكربت:
 *   1) يقرأ كل ملفات dist/**\/*.html.
 *   2) يجد وسم <link rel="stylesheet" href="/assets/*.css"> الذي يحقنه Vite.
 *   3) يستبدله بـ <style data-mizan-inline-css>…</style> مع الوسم ذاته
 *      (media/السمة نفسها إن وُجدت) حتى لا يتغيّر أي شيء آخر في المستند.
 *   4) idempotent: أي مستند يحمل الوسم يُتخطّى، فيمكن تشغيله مرتين بأمان.
 *   5) يتحقق في النهاية أن لا مستند بقي فيه وسم CSS خارجي يحجب الرسم.
 *
 * ملاحظة CSP: سياسة style-src تتضمن 'unsafe-inline' (public/_headers)، فالنمط
 * المضمّن مسموح، ولا حاجة إلى hash لكل مستند (377 مستنداً × بصمة = عبث).
 * ملف CSS يبقى في dist للمراجع المباشرة (مثلاً فتحه يدوياً أو أداة خارجية).
 */
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(scriptsDir);
const DIST = join(ROOT, "dist");

const MARKER = "data-mizan-inline-css";
const STYLESHEET_TAG = /<link\b[^>]*\brel="stylesheet"[^>]*>/gi;
const HREF_OF = (tag) => {
  const m = /\bhref="([^"]+)"/i.exec(tag);
  return m ? m[1] : null;
};
const ATTR_OF = (tag, name) => {
  const m = new RegExp(`\\b${name}="([^"]*)"`, "i").exec(tag);
  return m ? m[1] : null;
};

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(full)));
    else if (entry.isFile() && entry.name.endsWith(".html")) out.push(full);
  }
  return out.sort();
}

/** يحوّل مسار الأصل (/assets/x.css) إلى مسار على القرص داخل dist. */
function assetPathInDist(href) {
  const clean = href.split("?")[0].split("#")[0];
  if (!clean.startsWith("/")) return null;
  const segments = clean.split("/").filter(Boolean).map((s) => decodeURIComponent(s));
  // لا شرائح نسبية: الوسم يُبنى من Vite لا من إدخال مستعمل
  if (segments.some((s) => s === ".." || s === "." || s.includes("\\"))) return null;
  return join(DIST, ...segments);
}

/** CSS داخل <style>: لا يجوز أن يظهر فيه </style> حرفياً وإلا انتهى الوسم مبكراً. */
function safeForStyleTag(css) {
  return css.replace(/<\/style/gi, "<\\/style");
}

async function main() {
  let files;
  try {
    files = await htmlFiles(DIST);
  } catch {
    console.error("[inline-css] ✗ لا يوجد dist/ — شغّل البناء أولاً.");
    process.exit(1);
  }

  const cache = new Map(); // مسار الأصل → محتواه
  let inlined = 0;
  let alreadyInlined = 0;
  let skippedNoStylesheet = 0;
  const remaining = [];
  let bytesTotal = 0;

  for (const file of files) {
    const html = await readFile(file, "utf8");
    const rel = relative(DIST, file);

    if (html.includes(MARKER)) {
      alreadyInlined += 1;
      continue;
    }

    const tags = html.match(STYLESHEET_TAG) ?? [];
    const blocking = tags.filter((tag) => {
      const href = HREF_OF(tag);
      const media = ATTR_OF(tag, "media");
      return href && href.endsWith(".css") && (!media || /all|screen/i.test(media));
    });

    if (blocking.length === 0) {
      skippedNoStylesheet += 1;
      continue;
    }

    let next = html;
    for (const tag of blocking) {
      const href = HREF_OF(tag);
      const diskPath = assetPathInDist(href);
      if (!diskPath) continue;

      let css = cache.get(diskPath);
      if (css === undefined) {
        try {
          css = await readFile(diskPath, "utf8");
        } catch {
          console.warn(`[inline-css] ✗ ${rel}: تعذّر قراءة ${href} — بقي الوسم كما هو.`);
          continue;
        }
        const info = await stat(diskPath);
        console.log(
          `[inline-css] • ${relative(DIST, diskPath)} → ${(info.size / 1024).toFixed(1)}KB تُضمَّن في كل مستند`
        );
        cache.set(diskPath, css);
      }

      const media = ATTR_OF(tag, "media");
      const open = `<style ${MARKER}${media ? ` media="${media}"` : ""}>`;
      // دالة بدل نص الاستبدال: محتوى CSS يحمل "$" (مثل var(--x)) و"$&" له معنى
      // خاص في نصوص الاستبدال، فالدالة تمنع أي تفسير.
      next = next.replace(tag, () => `${open}${safeForStyleTag(css)}</style>`);
      bytesTotal += Buffer.byteLength(css);
      inlined += 1;
    }

    if (next !== html) await writeFile(file, next, "utf8");
    else remaining.push(rel);
  }

  // تحقّق ختامي: لا مستند بقي فيه طلب CSS من نفس الأصل يحجب الرسم
  for (const file of files) {
    const html = await readFile(file, "utf8");
    if (html.includes(MARKER)) continue;
    const stillBlocking = (html.match(STYLESHEET_TAG) ?? []).filter((tag) => {
      const href = HREF_OF(tag);
      return href && href.endsWith(".css") && !/^https?:/i.test(href);
    });
    if (stillBlocking.length) remaining.push(relative(DIST, file));
  }

  console.log(
    `[inline-css] ✓ CSS مضمّن في ${inlined} مستند ` +
      `(${(bytesTotal / 1024 / 1024).toFixed(1)}MB إجمالاً)، ` +
      `${alreadyInlined} مضمّن سابقاً، ${skippedNoStylesheet} بلا CSS خارجي.`
  );

  if (remaining.length) {
    console.warn(
      `[inline-css] ⚠ ملفات بقيت فيها إشارة CSS خارجي: ${remaining.slice(0, 5).join(", ")}` +
        (remaining.length > 5 ? ` … (${remaining.length})` : "")
    );
    process.exit(1);
  }
}

await main();
