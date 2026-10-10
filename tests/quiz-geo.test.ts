import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

/*
 * تدقيق GEO لصفحة /quiz: هذه الاختبارات تقرأ HTML المُولَّد فعلاً في dist/
 * (ما يراه الزاحف)، وتُتخطّى إن لم يوجد بناء محلي.
 */

const file = resolve(__dirname, "../dist/quiz.html");
const built = existsSync(file);

describe.skipIf(!built)("GEO — /quiz في HTML المُولَّد", () => {
  const html = built ? readFileSync(file, "utf8") : "";

  test("العنوان يحمل اسم العلامة الكامل نفسه المستعمل في المخطط", () => {
    const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "";
    expect(title).toContain("ميزان الرقمية");
    expect(title.length).toBeLessThanOrEqual(60);
  });

  test("هيكل العناوين: H1 واحد، وعدة H2 منها أسئلة", () => {
    expect(html.match(/<h1[\s>]/g)?.length).toBe(1);
    const h2 = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => m[1]);
    expect(h2.length).toBeGreaterThanOrEqual(4);
    expect(h2.filter((t) => t.trim().endsWith("؟")).length).toBeGreaterThanOrEqual(3);
  });

  test("إجابة مباشرة في أول فقرة بعد العنوان", () => {
    const lead = html.match(/<h1[^>]*>[\s\S]*?<\/h1>\s*<p class="byline">[\s\S]*?<\/p>\s*<p>\s*<strong>([\s\S]*?)<\/strong>/);
    expect(lead?.[1]).toMatch(/بنك من \d+ سؤالاً/);
  });

  test("المؤلف والتاريخ في المخطط، والـbyline ظاهر يطابقهما", () => {
    const itemList = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map((m) => JSON.parse(m[1]))
      .find((node) => node["@type"] === "ItemList");
    expect(itemList).toBeDefined();
    expect(itemList.author?.name).toBe("فريق ميزان الرقمية");
    expect(itemList.dateModified).toMatch(/^2026-10-09T/);
    expect(html).toContain("آخر مراجعة: 9 أكتوبر 2026");
  });

  test("استشهاد باسم مصدر رسمي برابط خارجي يعمل", () => {
    expect(html).toContain('href="https://bdj.mmsp.gov.ma/');
    expect(html).toContain('href="https://www.sgg.gov.ma/BulletinOfficiel.aspx"');
    expect(html).not.toContain("JournalOfficiel.aspx");
    expect(html).toContain("<blockquote>");
  });
});
