// اختبارات وسم مصطلح المعجم (shared/seo/meta-copy.js → lexiconDisplayLabel).
//
// العطل الذي تحرسه هذه الاختبارات وقع فعلاً في المستودع:
//   «فصل السلط» و«ملتمس الرقابة» أُضيفا مرّتين بنفس المقابل الفرنسي، فصار
//   لكل مصطلح صفحتان بعنوان واحد — تُقرأ في Search Console «Duplicate, Google
//   chose different canonical»، وكانت بوابة metaCopy في `pnpm seo:audit`
//   تفشل (عنوان مكرر على صفحتين).
//
// ثم وقع نصف العطل نفسه في الواجهة: الفصل كان في prerender وحده، وTermPage
// يكتب «المصطلح في القانون المغربي» بلا مقابل فرنسي — فيُستبدل عنوان الملف
// الثابت بعد hydration ويعود التكرار في النسخة المرسومة التي يقرأها Google.

import { describe, expect, test } from "vitest";

import { lexiconDisplayLabel, sectionContextFor } from "../shared/seo/meta-copy.js";
import { lexiconSlugMap } from "../shared/seo/url-policy.js";
import lexicon from "../src/data/lexicon.json";

const term = (id: string) => lexicon.find((item: any) => item.id === id);

describe("lexiconDisplayLabel — فصل السجلّات المتشابهة", () => {
  test("مصطلح فريد: العربي وحده بلا أقواس", () => {
    const item = term("personne-morale");
    expect(lexiconDisplayLabel(item as any, lexicon as any)).toBe("الشخص المعنوي");
  });

  test("عربية مكرّرة بمقابلين فرنسيين مختلفين: الفرنسية هي الفاصل", () => {
    const pool = lexicon as any[];
    const nantissement = term("nantissement");
    const gage = term("gage-civil");

    expect(lexiconDisplayLabel(nantissement as any, pool)).toBe("الرهن الحيازي (Nantissement)");
    expect(lexiconDisplayLabel(gage as any, pool)).toBe("الرهن الحيازي (Gage)");
    expect(lexiconDisplayLabel(nantissement as any, pool)).not.toBe(
      lexiconDisplayLabel(gage as any, pool)
    );
  });

  test("عربية وفرنسية متطابقتان (تكرار حقيقي في البيانات): المعرّف آخر فاصل", () => {
    const pool = [
      { id: "motion-censure", term_ar: "ملتمس الرقابة", term_fr: "Motion de censure" },
      { id: "motion-censure-copy", term_ar: "ملتمس الرقابة", term_fr: "Motion de censure" },
    ];
    const labels = pool.map((item) => lexiconDisplayLabel(item, pool));
    expect(new Set(labels).size).toBe(2);
    expect(labels[1]).toContain("motion-censure-copy");
  });

  test("بلا قائمة (نداء المتصفح قبل وصول كل السجلّات): لا انفجار", () => {
    expect(lexiconDisplayLabel({ term_ar: "التقادم", term_fr: "Prescription" }, [])).toBe("التقادم");
    expect(lexiconDisplayLabel(null, [])).toBe("");
  });

  test("مسافات زائدة لا تكسر كشف التكرار", () => {
    const pool = [
      { id: "a", term_ar: " الصلح ", term_fr: "Transaction" },
      { id: "b", term_ar: "الصلح", term_fr: "Conciliation" },
    ];
    expect(lexiconDisplayLabel(pool[0], pool)).toBe("الصلح (Transaction)");
    expect(lexiconDisplayLabel(pool[1], pool)).toBe("الصلح (Conciliation)");
  });
});

describe("بيانات المعجم — ثوابت تُفشل البناء قبل النشر", () => {
  test("لا سجلّين بنفس العربية والفرنسية معاً (سبب صفحات التكرار)", () => {
    const seen = new Map<string, string>();
    for (const item of lexicon as any[]) {
      const key = `${String(item.term_ar).replace(/\s+/g, " ").trim()}|${String(
        item.term_fr ?? ""
      )
        .replace(/\s+/g, " ")
        .trim()}`;
      expect(seen.get(key), `تكرار «${item.term_ar}» (${item.term_fr})`).toBeUndefined();
      seen.set(key, item.id);
    }
  });

  test("وسم كل مصطلح فريد — فلا عنوانان متطابقان في dist", () => {
    const pool = lexicon as any[];
    const labels = pool.map((item) => lexiconDisplayLabel(item, pool));
    const duplicates = labels.filter((label, index) => labels.indexOf(label) !== index);
    expect(duplicates).toEqual([]);
  });

  test("وسم كل مصطلح يولّد رابطاً فريداً", () => {
    const slugs = lexiconSlugMap(lexicon as any[]);
    expect(new Set([...slugs.values()]).size).toBe((lexicon as any[]).length);
  });

  test("كل إحالة related_terms موجودة فعلاً (لا رابط ميت في الشجرة)", () => {
    const ids = new Set((lexicon as any[]).map((item) => item.id));
    const dangling: string[] = [];
    for (const item of lexicon as any[]) {
      for (const related of item.related_terms ?? []) {
        if (!ids.has(related)) dangling.push(`${item.id} → ${related}`);
      }
    }
    expect(dangling).toEqual([]);
  });
});

describe("sectionContextFor — عبارة سياق القسم", () => {
  test("القسم من أول مقطع، والجذر عند مسار غير معروف", () => {
    expect(sectionContextFor("/lexicon/فصل-السلط")).toContain("قاموس المصطلحات");
    expect(sectionContextFor("/schools")).toContain("كليات الحقوق");
    expect(sectionContextFor("/route-inconnue")).toBe(sectionContextFor("/"));
    expect(sectionContextFor("")).toBe(sectionContextFor("/"));
  });
});
