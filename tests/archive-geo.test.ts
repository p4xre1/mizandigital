import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { ARCHIVE_GUIDE } from "../shared/seo/archive-guide.js";

/*
 * تدقيق GEO لصفحة /archive: اختبارات على HTML المُولَّد في dist/ (ما يراه
 * الزاحف)، وتُتخطّى إن لم يوجد بناء محلي. وهناك اختبار للدليل نفسه بلا بناء.
 */

describe("دليل الأرشيف (المصدر المشترك)", () => {
  test("الأقسام بعناوين أسئلة، وكل سؤال في الأسئلة الشائعة له جواب", () => {
    // قسم الأسئلة الشائعة عنوانه وصفي، أما الأسئلة نفسها فتنتهي بعلامة استفهام.
    const questions = [
      ARCHIVE_GUIDE.semesters.title,
      ARCHIVE_GUIDE.files.title,
      ARCHIVE_GUIDE.search.title,
      ARCHIVE_GUIDE.legal.title,
    ];
    for (const title of questions) expect(title.endsWith("؟")).toBe(true);
    expect(ARCHIVE_GUIDE.faq.items.length).toBeGreaterThanOrEqual(3);
    for (const item of ARCHIVE_GUIDE.faq.items) {
      expect(item.question.endsWith("؟")).toBe(true);
      expect(item.answer.length).toBeGreaterThan(10);
    }
  });

  test("الفصول S1 إلى S6 كاملة", () => {
    expect(ARCHIVE_GUIDE.semesters.items.map((s) => s.code)).toEqual([
      "S1",
      "S2",
      "S3",
      "S4",
      "S5",
      "S6",
    ]);
  });
});

const file = resolve(__dirname, "../dist/archive.html");
const built = existsSync(file);

describe.skipIf(!built)("GEO — /archive في HTML المُولَّد", () => {
  const html = built ? readFileSync(file, "utf8") : "";

  test("هيكل العناوين بلا قفز: H1 واحد، ولا مستوى يتخطى التالي مباشرة", () => {
    const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
    expect(levels.filter((l) => l === 1).length).toBe(1);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1], `قفز من H${levels[i - 1]} إلى H${levels[i]}`).toBeLessThanOrEqual(1);
    }
  });

  test("العناوين الفرعية أسئلة، وعددها كافٍ", () => {
    const h2 = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => m[1].trim());
    expect(h2.length).toBeGreaterThanOrEqual(4);
    expect(h2.filter((t) => t.endsWith("؟")).length).toBeGreaterThanOrEqual(3);
  });

  test("المؤلف والتاريخ في المخطط، والـbyline ظاهر يطابقهما", () => {
    const nodes = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) =>
      JSON.parse(m[1]),
    );
    const page = nodes.find((n) => n["@type"] === "CollectionPage");
    expect(page?.author?.name).toBe("فريق ميزان الرقمية");
    expect(page?.dateModified).toMatch(/^2026-10-09T/);
    expect(html).toContain("آخر مراجعة: 9 أكتوبر 2026");
  });

  test("FAQPage في المخطط يطابق الأسئلة الظاهرة", () => {
    const faq = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map((m) => JSON.parse(m[1]))
      .find((n) => n["@type"] === "FAQPage");
    expect(faq).toBeDefined();
    for (const q of faq.mainEntity) {
      expect(html).toContain(q.name);
    }
  });

  test("استشهاد مسمّى برابط رسمي، ونص مقتبس منسوب", () => {
    expect(html).toContain('href="https://www.sgg.gov.ma/BulletinOfficiel.aspx"');
    expect(html).toContain('href="https://bdj.mmsp.gov.ma/');
    expect(html).toContain("<blockquote>");
    expect(html).toContain("الدستور المغربي (2011)، الفصل 1");
  });
});
