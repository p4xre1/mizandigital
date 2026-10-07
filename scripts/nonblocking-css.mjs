#!/usr/bin/env node
/**
 * nonblocking-css.mjs — يُشغَّل في نهاية البناء (بعد prerender/enhance وقبل CSP).
 *
 * القرار (2026-09-29) — لماذا «preload + قَلب» بدل تضمين CSS داخل كل مستند:
 *
 *   كانت النسخة السابقة (scripts/inline-css.mjs) تنقل ملف CSS (181KB) داخل
 *   <style> في كل صفحة: 66.6MB من CSS مكرر عبر 377 مستنداً. ذلك أصلح طلب
 *   Lighthouse «render-blocking» (FCP/LCP)، لكنه أفلس مؤشر «text/HTML ratio»
 *   في تدقيق SEO لاحق: كل صفحة أصبحت ~209KB HTML مقابل ~3-6KB نص، فنسبة
 *   النص/HTML هبطت إلى 0.02-0.05 ورسبت 81 صفحة. النسبة تُحسب على بايتات
 *   المستند كما هو، فلا تنفع زيادة النص وحدها (لاصطدامها بحائط 181KB).
 *
 *   الحل المعتمد الآن يحافظ على الهدفين معاً:
 *   • لا طلب يحجب الرسم: الوسم يصير <link rel="preload" as="style"> (التنزيل
 *     يبدأ فوراً أثناء تحليل <head>، لكن التحليل لا ينتظره) ⇒ FCP يبقى
 *     قريباً من زمن وصول المستند كما كان مع التضمين.
 *   • لا FOUC عملياً: سكربت السمة المضمّن (theme bootstrap، أول سكربت في
 *     <head>) يقلب الـpreload إلى stylesheet في أول إطار يتوفر فيه الوسم،
 *     والتنزيل يكون غالباً وصل قبلها ⇒ النمط يطبق عند أول رسم تقريباً.
 *   • المستند يصبح ~28KB بدل ~209KB ⇒ text/HTML ratio يقفز 5-7 أضعاف.
 *   • بلا «unsafe-inline» جديد في script-src: القَلب جزء من سكربت السمة
 *     الواحد (hash يُعاد حسابه تلقائياً في csp-hashes.mjs)، فلا سكربت مضمّن
 *     ثانٍ ولا معالِج inline event (CSP هنا hash-only).
 *   • بلا طلب إضافي: لا ملف JS جديد؛ الـpreload نفسه هو ناقل CSS.
 *   • fallback: <noscript> يحمل وسم stylesheet عادي للمتصفحات بلا JS.
 *   • الكاش: قاعدة / *.css في _headers (max-age=31536000, immutable) تغطي
 *     الملف — الزيارات المتكررة لا تعيد تنزيله.
 *
 * إضافة (2026-10-07) — الكتلة الحرجة (critical CSS) ضد انزياح أول رسم:
 *
 *   تقرير Agentic Browsing (PageSpeed، الجوال) رصد CLS 0.186 على الرئيسية:
 *   النمط الكامل غير حاجب للرسم، فبين أول رسم (HTML بلا أنماط) ولحظة وصول
 *   الملف (‏186KB مضغوطاً) يُعاد تنسيق الرأس والواجهة ⇒ انزياح حقيقي. الحل:
 *   يُضمَّن في <head> وسم <style data-mizan-critical-css> صغير يحمل الخصائص
 *   الهندسية للهيكل الأولي فقط، مقتطعةً من ملف الأنماط المبنى نفسه
 *   (scripts/lib/critical-css.mjs) ⇒ صفر طلبات إضافية، صفر حجب رسم، وعند وصول
 *   النمط الكامل تُطبَّق القيم ذاتها فلا انزياح. الألوان/الظلال/الانتقالات
 *   مستثناة (لا تُحرّك شيئاً) والحجم مُقيَّد بحُرّاس:
 *     • MAX_CRITICAL_BYTES وحصة لا تتجاوز ثلث المستند،
 *     • حد أدنى لنسبة النص/HTML بعد الإضافة (MIN_RATIO_AFTER) فلا تُدفع صفحة
 *       رقيقة إلى منطقة الفشل التي عالجها القرار السابق؛ الصفحات الرقيقة
 *       (‏أهمها أغلفة SPA ومسارات القاموس القصيرة) تُتخطّى وتُعدّ في السجل،
 *     • الرئيسية (dist/index.html) إلزامية: غياب الكتلة فيها يُسقط البناء.
 *   وسوم <style> مسموحة في CSP أصلاً (style-src 'self' 'unsafe-inline')،
 *   والوسم ليس سكربتاً فلا يمسّ hashes الخاصة بـscript-src.
 *
 * ما يفعله السكربت:
 *   1) يقرأ كل ملفات dist (تكراراً).
 *   2) يجد كل <link rel="stylesheet" href="/assets/*.css"> الذي يحقنه Vite.
 *   3) يستبدله بـ <link rel="preload" as="style" data-mizan-async-css>
 *      (+ <noscript> يحمل stylesheet عادي).
 *   4) idempotent: أي مستند يحمل data-mizan-async-css يُتخطّى.
 *   5) يضيف الكتلة الحرجة قبل رابط النمط (idempotent كذلك).
 *   6) يتحقق في النهاية أن لا وسم stylesheet حاجب بقي خارج <noscript>، وأن
 *      الرئيسية حملت الكتلة الحرجة، وأن حجمها داخل الحدود.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CRITICAL_MARKER,
  MAX_CRITICAL_BYTES,
  buildCriticalCss,
  criticalStyleTag,
  htmlTextBytes,
} from "./lib/critical-css.mjs";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(scriptsDir);
const DIST = join(ROOT, "dist");

const MARKER = "data-mizan-async-css";
const STYLESHEET_TAG = /<link\b[^>]*\brel="stylesheet"[^>]*>/gi;
const ASYNC_TAG = /<link rel="preload" as="style" href="([^"]+)" [^>]*data-mizan-async-css[^>]*>/;
/** أدنى نسبة نص/HTML مقبولة بعد إضافة الكتلة الحرجة (منطقة الفشل التاريخية 0.02-0.05). */
const MIN_RATIO_AFTER = 0.06;
/** أقصى حصة للكتلة من بايتات المستند نفسه. */
const MAX_RATIO_SHARE = 0.35;
const HREF_OF = (tag) => {
  const m = /\bhref="([^"]+)"/i.exec(tag);
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

/** يبني بديلاً غير حاجب لنفس ملف CSS. بلا crossorigin: الـpreload يجب أن يطابق
 *  طلب stylesheet (بلا CORS) وإلا صارت جولة مهدرة. */
function nonblockingPair(href) {
  return (
    `<link rel="preload" as="style" href="${href}" ${MARKER}>` +
    `<noscript><link rel="stylesheet" href="${href}"></noscript>`
  );
}

async function main() {
  let files;
  try {
    files = await htmlFiles(DIST);
  } catch {
    console.error("[nonblocking-css] ✗ لا يوجد dist/ — شغّل البناء أولاً.");
    process.exit(1);
  }

  let converted = 0;
  let alreadyAsync = 0;
  let withoutStylesheet = 0;
  const remaining = [];

  /* ── 1) تحويل وسوم النمط إلى preload + قَلب ─────────────────────────── */
  for (const file of files) {
    const html = await readFile(file, "utf8");
    const rel = relative(DIST, file);

    // ملاحظة: نص "data-mizan-async-css" يظهر أيضاً في سكربت السمة (querySelector)،
    // لذا الفحص على الوسم الكامل لا على السلسلة وحدها.
    if (/<link rel="preload" as="style" [^>]*data-mizan-async-css/.test(html)) {
      alreadyAsync += 1;
      continue;
    }

    // نحذف <noscript> قبل الفحص/الاستبدال: ما بداخله fallback مقصود لا حاجب.
    const withoutNoscript = html.replace(/<noscript>[\s\S]*?<\/noscript>/gi, "");
    const tags = withoutNoscript.match(STYLESHEET_TAG) ?? [];
    const blocking = tags.filter((tag) => {
      const href = HREF_OF(tag);
      return href && href.endsWith(".css") && href.startsWith("/assets/");
    });

    if (blocking.length === 0) {
      withoutStylesheet += 1;
      continue;
    }

    let next = html;
    for (const tag of blocking) {
      const href = HREF_OF(tag);
      if (!next.includes(tag)) {
        remaining.push(rel);
        continue;
      }
      // دالة بدل نص الاستبدال (محتوى CSS/وسوم يحمل "$" و"$&" لهما معنى خاص).
      next = next.replace(tag, () => nonblockingPair(href));
      converted += 1;
    }

    if (next !== html) await writeFile(file, next, "utf8");
  }

  /* ── 2) الكتلة الحرجة: خصائص هندسية للهيكل الأولي، من ملف الأنماط نفسه ── */
  const cssCache = new Map();
  const readCss = async (href) => {
    if (!cssCache.has(href)) {
      cssCache.set(href, await readFile(join(DIST, href.replace(/^\//, "")), "utf8"));
    }
    return cssCache.get(href);
  };

  let criticalAdded = 0;
  let criticalAlready = 0;
  let criticalSkippedThin = 0;
  let criticalSkippedBig = 0;
  let criticalNoShell = 0;
  const thinSamples = [];

  for (const file of files) {
    const rel = relative(DIST, file);
    const html = await readFile(file, "utf8");
    if (html.includes(CRITICAL_MARKER)) {
      criticalAlready += 1;
      continue;
    }
    const asyncMatch = ASYNC_TAG.exec(html);
    if (!asyncMatch) continue; // مستند بلا نمط خارجي (لا شيء لاقتطاعه)

    const cssText = await readCss(asyncMatch[1]);
    const built = buildCriticalCss({ html, cssText });
    if (!built.css) {
      criticalNoShell += 1;
      continue;
    }

    const htmlBytes = Buffer.byteLength(html, "utf8");
    const textBytes = htmlTextBytes(html);
    const docFloor = Buffer.byteLength(`<style ${CRITICAL_MARKER}></style>`) + built.bytes;
    const ratioAfter = textBytes / (htmlBytes + docFloor);
    const tooBig = built.bytes > MAX_CRITICAL_BYTES || built.bytes > htmlBytes * MAX_RATIO_SHARE;

    if (tooBig) {
      criticalSkippedBig += 1;
      continue;
    }
    if (ratioAfter < MIN_RATIO_AFTER) {
      criticalSkippedThin += 1;
      if (thinSamples.length < 3) thinSamples.push(`${rel} (${ratioAfter.toFixed(3)})`);
      continue;
    }

    const tag = criticalStyleTag(built.css);
    let next = html.replace(asyncMatch[0], () => tag + asyncMatch[0]);
    if (next === html) next = html.replace("</head>", () => `${tag}</head>`);
    if (next === html) continue;
    await writeFile(file, next, "utf8");
    criticalAdded += 1;
  }

  /* ── 3) تحقّق ختامي ─────────────────────────────────────────────────── */
  let homeHasCritical = false;
  for (const file of files) {
    const html = await readFile(file, "utf8");
    const rel = relative(DIST, file);
    if (rel === "index.html") homeHasCritical = html.includes(CRITICAL_MARKER);
    const withoutNoscript = html.replace(/<noscript>[\s\S]*?<\/noscript>/gi, "");
    const stillBlocking = (withoutNoscript.match(STYLESHEET_TAG) ?? []).filter((tag) => {
      const href = HREF_OF(tag);
      return href && href.endsWith(".css") && !/^https?:/i.test(href);
    });
    if (stillBlocking.length) remaining.push(rel);
  }

  console.log(
    `[nonblocking-css] ✓ ${converted} وسم CSS حُوِّل إلى preload+قَلب ` +
      `(${alreadyAsync} مستند سبق تحويله، ${withoutStylesheet} بلا CSS خارجي).`
  );
  console.log(
    `[nonblocking-css] ✓ ${criticalAdded} كتلة حرجة أُضيفت (${criticalAlready} موجودة، ` +
      `${criticalSkippedThin} صفحة تخطّتها لنسبة نص/HTML < ${MIN_RATIO_AFTER}` +
      `${thinSamples.length ? ` مثل: ${thinSamples.join("، ")}` : ""}، ` +
      `${criticalSkippedBig} تجاوزت سقف الحجم، ${criticalNoShell} بلا هيكل أولي).`
  );

  if (!homeHasCritical) {
    console.error("[nonblocking-css] ✗ الرئيسية بلا كتلة حرجة — CLS يعود. تحقق من الهيكل والحدود.");
    process.exit(1);
  }

  if (remaining.length) {
    console.warn(
      `[nonblocking-css] ⚠ ملفات بقيت فيها إشارة CSS حاجبة: ${remaining.slice(0, 5).join(", ")}` +
        (remaining.length > 5 ? ` … (${remaining.length})` : "")
    );
    process.exit(1);
  }
}

await main();
