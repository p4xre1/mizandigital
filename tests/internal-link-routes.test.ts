/**
 * بوابة الروابط الداخلية — تحقّق ثابت (لا يحتاج بناء) من أن كل رابط داخلي
 * مكتوب في المصدر يطابق مساراً معرّفاً في `src/routes/AppRoutes.tsx`.
 * -------------------------------------------------------------------------
 * لماذا وُجد هذا الاختبار؟ اكتشف فحصٌ لاحق للبناء رابطين ميتين في صفحات
 * ثابتة أنشأها prerender، وأحدهما (`/guides` في BreadcrumbList) لم يكن
 * ليظهر في أي فحص روابط داخلية لأنه ليس وسم <a> بل قيمة في مخطط.
 * القراءة هنا تجري على المصدر لا على المخرجات، فتُلتقط هذه الحالة قبل البناء.
 *
 * الاستثناءات المقصودة:
 *   • القوالب (`/${x}`): قيم تُبنى وقت التشغيل — تُستبدل بـ x ثم تُطابق،
 *     و`/x` يطابق المسار ذا الوسيط `/:…`.
 *   • `/404` و`/*` : صفحة الخطأ وأي مسار لم يُطابق — مقصودان.
 *   • الأمثلة داخل `src/data/*.json` وملفات التوثيق خارج نطاق الفحص.
 *   • مسارات الملفات (`.../logo.svg`, `.../x.json`) ليست مسارات صفحات.
 */

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const ROUTES_FILE = join(ROOT, "src/routes/AppRoutes.tsx");

/** مسارات الموقع: كل <Route path>، والمسارات الفرعية داخل /admin مُسبقة. */
function routePatterns(): string[] {
  const source = readFileSync(ROUTES_FILE, "utf8");
  return [...source.matchAll(/<Route\s+path="([^"]+)"/g)].map((match) =>
    match[1].startsWith("/") ? match[1] : `/admin/${match[1]}`
  );
}

/**
 * توحيد قطعة بقطعة بدل تحويل النمط إلى regex حرفي:
 *   • الوسيط في المسار (`:slug`) والقالب في الرابط (`${...}`) رمزان
 *     «متغيّران» يتوافقان مع أي قطعة واحدة.
 *   • `*` في نهاية المسار يبتلع ما بعده.
 * فـ `/s${x}` و`/:semester` متوافقان، و`/nope/${x}` لا يمر إلا إن وُجد
 * مسار فعلي يبدأ بـ`/nope/` — وهو بالضبط ما نريد منعه.
 */
function segments(pattern: string): string[] {
  const trimmed = pattern.split("?")[0].split("#")[0].replace(/^\/+|\/+$/g, "");
  return trimmed === "" ? [] : trimmed.split("/");
}

const isVariable = (segment: string) => segment.startsWith(":") || /^\$\{.*\}$/.test(segment);

function compatible(link: string, route: string): boolean {
  const linkParts = segments(link);
  const routeParts = segments(route);
  for (let i = 0; i < routeParts.length; i += 1) {
    const routePart = routeParts[i];
    if (routePart === "*") return true;
    if (i >= linkParts.length) return false;
    const linkPart = linkParts[i];
    if (isVariable(linkPart) || isVariable(routePart)) continue;
    if (linkPart !== routePart) return false;
  }
  return linkParts.length === routeParts.length;
}

function isKnownRoute(url: string, patterns: string[]): boolean {
  return patterns.some((pattern) => compatible(url, pattern));
}

/** ملفات المصدر التي قد تحمل روابط داخلية. */
function sourceFiles(): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if ([".ts", ".tsx"].includes(extname(entry.name))) files.push(full);
    }
  };
  walk(join(ROOT, "src"));
  for (const extra of [
    "scripts/prerender.mjs",
    "scripts/generate-sitemap.mjs",
    "scripts/generate-feed.mjs",
    "scripts/generate-llms.mjs",
    "scripts/generate-llms-enhanced.mjs",
    "scripts/generate-reference.mjs",
  ]) {
    files.push(join(ROOT, extra));
  }
  return files;
}

const LINK_PATTERN =
  /(?:to|href|url|path|link)\s*[:=]\s*[`"'](\/[A-Za-z0-9_\u0600-\u06FF\-./%?=&:{}$]*)[`"']/g;
const ASSET_PATTERN = /\.(json|xml|txt|png|svg|jpe?g|webp|ico|pdf|css|js|mjs|woff2?)$/;
const EXEMPT = new Set(["/404"]);

describe("الروابط الداخلية مقابل جدول المسارات", () => {
  const patterns = routePatterns();

  test("جدول المسارات نفسه غير فارغ", () => {
    expect(patterns.length).toBeGreaterThan(50);
  });

  const cases: { raw: string; concrete: string; where: string }[] = [];
  for (const file of sourceFiles()) {
    const text = readFileSync(file, "utf8");
    text.split("\n").forEach((line, index) => {
      if (/^\s*(\*|\/\/|<!--)/.test(line)) return; // تعليقات
      for (const match of line.matchAll(LINK_PATTERN)) {
        const raw = match[1];
        if (ASSET_PATTERN.test(raw)) continue;
        const concrete = raw.replace(/\$\{[^}]*\}/g, "x");
        if (concrete === "/" || concrete.startsWith("//")) continue;
        if (EXEMPT.has(concrete)) continue;
        cases.push({ raw, concrete, where: `${file.replace(ROOT + "/", "")}:${index + 1}` });
      }
    });
  }

  test("لا رابط داخلي إلى مسار غير معرّف", () => {
    // يُفحص النمط الأصلي (بـ `${...}`) لا النسخة المستبدلة: التوحيد يعرف
    // التعامل مع المتغيّرات، والاستبدال بـ x كان يولّد إخفاقات وهمية.
    const unresolved = [...new Map(cases.map((c) => [c.raw, c])).values()].filter(
      ({ raw }) => !isKnownRoute(raw, patterns)
    );
    expect(
      unresolved.map(({ raw, where }) => `${raw}  ←  ${where}`),
      "روابط إلى مسارات غير موجودة في AppRoutes — أصلحها أو أضف المسار"
    ).toEqual([]);
  });

  test("النصوص المرشّحة للفحص غير فارغة (الفحص فعّال)", () => {
    expect(cases.length).toBeGreaterThan(100);
  });
});
