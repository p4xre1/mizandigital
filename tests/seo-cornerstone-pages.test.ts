import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  MAX_DESC,
  MAX_TITLE,
  MIN_DESC,
  MIN_TITLE,
  buildMetaDescription,
  fitTitle,
} from "../shared/seo/meta-copy.js";

/**
 * الصفحات الركنية الثلاث في خطة السيو: /platform و /guides/free-legal-resources-morocco
 * و /guides/new-law-student-morocco.
 *
 * الاختبار لا يعيد كتابة النصوص، بل يحوك الوصلات: أن المسار مسجَّل في Routes،
 * وموصول من الفوتر (وإلا وُلِد يتيماً لا يصله زاحف)، ومطبوعاً في prerender
 * (وإلا رجع التحميل المباشر 404 على Cloudflare Pages)، وموجوداً في sitemap،
 * وأن العنوان والوصف هما السلسلة نفسها في المكوّن وفي prerender — الطبقتان
 * تعرضان الوسم نفسه بحروفه، وإلا اختلفت نسخة المتصفح عن نسخة الملف الثابت.
 */

type CornerstonePage = {
  path: string;
  component: string;
  importSpec: string;
  titleConst: string;
  descConst: string;
  /** إما اسم ثابت العنوان المعروض في H1، أو نصّ ظاهر داخل H1. */
  h1Const?: string;
  h1Visible?: string;
};

const read = (file: string) =>
  readFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), "utf8");

const PAGES: CornerstonePage[] = [
  {
    path: "/platform",
    component: "src/pages/public/PlatformPage.tsx",
    importSpec: "@/pages/public/PlatformPage",
    titleConst: "PLATFORM_TITLE",
    descConst: "PLATFORM_DESCRIPTION",
    h1Const: "PLATFORM_TITLE",
  },
  {
    path: "/guides/free-legal-resources-morocco",
    component: "src/pages/public/guides/FreeLegalResourcesPage.tsx",
    importSpec: "@/pages/public/guides/FreeLegalResourcesPage",
    titleConst: "TITLE",
    descConst: "DESCRIPTION",
    h1Visible: "أفضل الموارد المجانية لطلبة القانون في المغرب 2026",
  },
  {
    path: "/guides/new-law-student-morocco",
    component: "src/pages/public/guides/NewLawStudentGuidePage.tsx",
    importSpec: "@/pages/public/guides/NewLawStudentGuidePage",
    titleConst: "TITLE",
    descConst: "DESCRIPTION",
    h1Visible: "دليل طالب الحقوق الجديد في المغرب 2026",
  },
];

/** يسرق الثابت من الملف المصدري بدل استنساخه هنا: نصّ الصفحة يبقى مصدر الحقيقة. */
function stringConst(source: string, name: string): string {
  const declaration = new RegExp(
    `(?:const|let)\\s+${name}\\s*=\\s*\\n?\\s*"([^"]+)"`,
  );
  const match = source.match(declaration);
  if (!match) throw new Error(`لم يُعثر على الثابت ${name} بالمصدر`);
  return match[1];
}

function prerenderField(
  path: string,
  field: "title" | "description",
): string | null {
  const source = read("scripts/prerender.mjs");
  const start = source.indexOf(`path: "${path}"`);
  if (start < 0) return null;
  const window = source.slice(start, start + 1500);
  const match =
    field === "title"
      ? window.match(/title:\s*\n?\s*"([^"]+)"/)
      : window.match(/description:\s*\n?\s*"([^"]+)"/);
  return match ? match[1] : null;
}

function prerenderBody(path: string): string {
  const source = read("scripts/prerender.mjs");
  const start = source.indexOf(`path: "${path}"`);
  expect(start, `مسار ${path} غير مطبوع في prerender`).toBeGreaterThan(-1);
  return source.slice(start, start + 7000);
}

describe("الصفحات الركنية — الربط والتوليد", () => {
  for (const page of PAGES) {
    test(`${page.path}: مسار مسجَّل في التطبيق ومكوّن كسول التحميل`, () => {
      const routes = read("src/routes/AppRoutes.tsx");
      expect(routes, `الراوية ${page.path}`).toContain(`path="${page.path}"`);
      expect(routes, `lazy import لـ ${page.path}`).toContain(
        `import("${page.importSpec}")`,
      );

      const component = read(page.component);
      expect(component).toContain("export default function");
      // AEOHead لا SEOHead المجردة: الطبقة المشتركة تضبط العنوان والوصف.
      expect(component).toContain("<AEOHead");
    });

    test(`${page.path}: موصولة من الفوتر حتى لا تُولَد يتيمة`, () => {
      expect(read("src/layouts/PublicNavigation.tsx"), page.path).toContain(
        `to="${page.path}"`,
      );
    });

    test(`${page.path}: صفحة ثابتة مُولَّدة في prerender وفي sitemap`, () => {
      const body = prerenderBody(page.path);
      expect(body).toContain("<main");
      expect(body).toContain("<h1>");
      expect(body).toContain("</article>");
      expect(body, "عنوان قسم واحد على الأقل").toContain("<h2>");
      // الروابط الداخلية في النسخة الثابتة بلا شرطة نهاية أيضاً.
      const internal = [...body.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);
      expect(internal.length, "روابط داخلية في النسخة الثابتة").toBeGreaterThan(
        3,
      );
      for (const href of internal) {
        // الجذر استثناء مشروع: «/» هو الشكل الصحيح الوحيد فيه.
        if (href === "/") continue;
        expect(href.endsWith("/"), `رابط بشرطة نهاية: ${href}`).toBe(false);
      }

      const sitemap = read("public/sitemap.xml");
      expect(sitemap).toContain(
        `<loc>https://www.mizan.page${page.path}</loc>`,
      );
      expect(sitemap).not.toContain(
        `<loc>https://www.mizan.page${page.path}/</loc>`,
      );
      expect(read("scripts/generate-sitemap.mjs")).toContain(
        `path: "${page.path}"`,
      );
    });
  }
});

describe("الصفحات الركنية — عناوين وأوصاف في السياسة نفسها", () => {
  for (const page of PAGES) {
    const source = read(page.component);
    const title = stringConst(source, page.titleConst);
    const description = stringConst(source, page.descConst);

    test(`${page.path}: العنوان والوصف داخل النطاق ولا يعدّلانهما طبقتا المعاينة`, () => {
      expect(title.length, `طول العنوان: ${title}`).toBeGreaterThanOrEqual(
        MIN_TITLE,
      );
      expect(title.length).toBeLessThanOrEqual(MAX_TITLE);
      expect(fitTitle(title), "fitTitle لا يجب أن يقطع العنوان").toBe(title);

      expect(
        description.length,
        `طول الوصف: ${description}`,
      ).toBeGreaterThanOrEqual(MIN_DESC);
      expect(description.length).toBeLessThanOrEqual(MAX_DESC);
      expect(
        buildMetaDescription(description, ["منصة مجانية لطلبة الحقوق بالمغرب"]),
      ).toBe(description);
    });

    test(`${page.path}: وسم المتصفح هو وسم الملف الثابت حرفياً`, () => {
      expect(prerenderField(page.path, "title"), "عنوان prerender").toBe(title);
      expect(prerenderField(page.path, "description"), "وصف prerender").toBe(
        description,
      );
    });

    test(`${page.path}: H1 يحمل نصّ العنوان نفسه`, () => {
      const h1 = source.slice(
        source.indexOf("<h1"),
        source.indexOf("</h1>") + 5,
      );
      expect(h1.length, "<h1> موجود في المكوّن").toBeGreaterThan(10);

      if (page.h1Const) {
        // الصفحة تعرض ثابت العنوان كما هو: التطابق الحرفي بالبناء.
        expect(h1).toContain(`{${page.h1Const}}`);
      } else {
        expect(h1).toContain(page.h1Visible!);
        // والعلامة التجارية داخل H1 نفسه (sr-only) ليتطابق نصّ العنصر مع <title>.
        expect(h1, "العلامة داخل H1").toContain("sr-only");
        expect(h1).toContain(title.slice(title.indexOf(" | ")));
      }

      // والنسخة الثابتة تكتب H1 بنصّ العنوان كاملاً.
      expect(prerenderBody(page.path)).toContain(`<h1>${title}</h1>`);
    });

    test(`${page.path}: ثلاثة روابط داخلية على الأقل بلا شرطة نهاية`, () => {
      const internal = [...source.matchAll(/to="(\/[^"]*)"/g)].map((m) => m[1]);
      expect(
        new Set(internal).size,
        "روابط داخلية فريدة",
      ).toBeGreaterThanOrEqual(3);
      for (const href of internal) {
        expect(href, `رابط بشرطة نهاية: ${href}`).not.toMatch(/\/$/);
        expect(href).not.toContain("index.html");
        expect(href).not.toContain("://");
      }
    });
  }
});
