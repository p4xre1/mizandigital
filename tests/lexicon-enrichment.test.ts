import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import lexicon from "../src/data/lexicon.json";
import lexiconClient from "../src/data/lexicon.client.json";
import news from "../src/data/news.json";
import schools from "../src/data/schools.json";

/**
 * عقد بيانات المعجم بعد الإثراء (scripts/enrich-lexicon.mjs).
 *
 * هذه الاختبارات لا تكرّر محتوى البطاقات بل تحرس *الاتفاق*: كل سجل يحمل الحقول
 * التسعة، والقيم ضمنEnums المتفق عليها، و canonical_url مطابق لسياسة
 * بلا-شرطة-نهاية، و related_terms لا يشير إلى id غير موجود. الإتفاق هو ما
 * يجعل حقولاً أضيفت إلى 250 سجلاً آلياً قابلة للاستعمال في الواجهة وفي
 * prerender دون مراجعة يدوية لكل سجل.
 */

const BASE = "https://www.mizan.page";
const REVIEW_STATUSES = ["draft", "internal_review", "expert_review", "published"];
const QUOTATION_TYPES = ["exact", "excerpt", "paraphrase"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type LexiconRecord = {
  id: string;
  term_ar?: string;
  term_fr?: string;
  definition?: string;
  category?: string;
  canonical_url?: string;
  simple_explanation?: string;
  simple_explanation_fr?: string;
  examples?: string[];
  examples_fr?: string[];
  exam_keywords?: string[];
  related_terms?: string[];
  last_reviewed?: string;
  review_status?: string;
  enrichment_source?: string;
  legal_sources?: Array<{
    source_url?: string;
    last_verified?: string;
    articles?: Array<Record<string, string>>;
  }>;
};

const terms = lexicon as unknown as LexiconRecord[];
const ids = new Set(terms.map((t) => t.id));

describe("lexicon.json — الحقول المُثراة", () => {
  test("كل سجل يحمل الحقول التسعة المتفق عليها وغير فارغة", () => {
    for (const term of terms) {
      const where = term.id || term.term_ar || "?";
      expect(term.simple_explanation, `simple_explanation في ${where}`).toBeTruthy();
      expect(term.simple_explanation_fr, `simple_explanation_fr في ${where}`).toBeTruthy();
      expect(term.examples?.length, `examples في ${where}`).toBeGreaterThan(0);
      expect(term.examples_fr?.length, `examples_fr في ${where}`).toBeGreaterThan(0);
      expect(term.exam_keywords?.length, `exam_keywords في ${where}`).toBeGreaterThan(0);
      expect(term.related_terms?.length, `related_terms في ${where}`).toBeGreaterThan(0);
      expect(term.canonical_url, `canonical_url في ${where}`).toBeTruthy();
      expect(term.last_reviewed, `last_reviewed في ${where}`).toMatch(ISO_DATE);
      expect(REVIEW_STATUSES, `review_status في ${where}`).toContain(term.review_status);
      expect(["auto", "editorial"], `enrichment_source في ${where}`).toContain(term.enrichment_source);
    }
  });

  test("لا حقل أصلي حُذف: التعريف والاسمان والتصنيف باقية", () => {
    for (const term of terms) {
      expect(term.term_ar, `term_ar في ${term.id}`).toBeTruthy();
      expect(term.definition, `definition في ${term.id}`).toBeTruthy();
      expect(term.category, `category في ${term.id}`).toBeTruthy();
    }
  });

  test("canonical_url يطابق سياسة رابط المعجم: النطاق www وبلا شرطة نهاية", () => {
    for (const term of terms) {
      expect(term.canonical_url?.startsWith(`${BASE}/lexicon/`), term.id).toBe(true);
      expect(term.canonical_url?.endsWith("/"), `شرطة نهاية في ${term.id}`).toBe(false);
      expect(term.canonical_url).not.toContain("?");
      expect(term.canonical_url).not.toContain("__index");
    }
  });

  test("النطاقات الرقمية كما في الاتفاق: 2–3 أمثلة، 3–6 كلمات، 2–5 وصلات", () => {
    for (const term of terms) {
      const where = term.id;
      expect(term.examples!.length, `عدد الأمثلة في ${where}`).toBeGreaterThanOrEqual(2);
      expect(term.examples!.length, `عدد الأمثلة في ${where}`).toBeLessThanOrEqual(3);
      expect(term.examples_fr!.length, `عدد الأمثلة FR في ${where}`).toBeGreaterThanOrEqual(2);
      expect(term.exam_keywords!.length, `كلمات المراجعة في ${where}`).toBeGreaterThanOrEqual(3);
      expect(term.exam_keywords!.length, `كلمات المراجعة في ${where}`).toBeLessThanOrEqual(6);
      expect(term.related_terms!.length, `الوصلات في ${where}`).toBeGreaterThanOrEqual(2);
      expect(term.related_terms!.length, `الوصلات في ${where}`).toBeLessThanOrEqual(5);
      // مثال من سطرين لا يُدرّس شيئاً: الحدّ الأدنى يمنع القوالب الفارغة.
      for (const example of term.examples!) {
        expect(example.length, `مثال قصير في ${where}`).toBeGreaterThanOrEqual(20);
      }
    }
  });

  test("related_terms يشير دائماً إلى id موجود، بلا تكرار ولا إحالة للذات", () => {
    for (const term of terms) {
      const related = term.related_terms!;
      expect(new Set(related).size, `مكرّر في ${term.id}`).toBe(related.length);
      for (const id of related) {
        expect(ids.has(id), `${term.id} → ${id} غير موجود`).toBe(true);
        expect(id, `إحالة للذات في ${term.id}`).not.toBe(term.id);
      }
    }
  });
});

describe("lexicon.json — تفاصيل المصادر القانونية", () => {
  const withSources = terms.filter((t) => Array.isArray(t.legal_sources) && t.legal_sources.length > 0);

  test("كل مصدر يحمل بوابة تحقق وتاريخاً، وكل فصل يحمل نصّه ونوع الاقتباس", () => {
    expect(withSources.length, "عدد السجلات ذات legal_sources").toBeGreaterThan(0);

    for (const term of withSources) {
      for (const source of term.legal_sources!) {
        expect(source.source_url?.startsWith("https://"), `source_url في ${term.id}`).toBe(true);
        expect(source.last_verified, `last_verified في ${term.id}`).toMatch(ISO_DATE);

        for (const article of source.articles || []) {
          // الحقلان الأصليان لا يُمسّان: الواجهة (TermPage) تقرأ number/phrase.
          expect(article.number, `number في ${term.id}`).toBeTruthy();
          expect(article.phrase, `phrase في ${term.id}`).toBeTruthy();
          expect(article.article_number, `article_number في ${term.id}`).toBeTruthy();
          expect(article.quotation, `quotation في ${term.id}`).toBeTruthy();
          expect(QUOTATION_TYPES, `quotation_type في ${term.id}`).toContain(article.quotation_type);
        }
      }
    }
  });
});

describe("lexicon.client.json — نسخة المتصفح", () => {
  const dropped = ["simple_explanation_fr", "examples_fr", "enrichment_source"];

  test("نفس عدد السجلات ونفس المعرّفات", () => {
    const client = lexiconClient as unknown as LexiconRecord[];
    expect(client.length).toBe(terms.length);
    expect(client.map((t) => t.id)).toEqual(terms.map((t) => t.id));
  });

  test("الحقول التي تعرضها الواجهة موجودة، والحقول المؤجَّلة محذوفة", () => {
    for (const term of lexiconClient as unknown as LexiconRecord[]) {
      expect(term.simple_explanation, `simple_explanation في ${term.id}`).toBeTruthy();
      expect(term.examples?.length, `examples في ${term.id}`).toBeGreaterThan(0);
      expect(term.exam_keywords?.length, `exam_keywords في ${term.id}`).toBeGreaterThan(0);
      expect(term.related_terms?.length, `related_terms في ${term.id}`).toBeGreaterThan(0);

      for (const field of dropped) {
        expect(term, `${field} لا يجب أن يُحمَّل إلى المتصفح`).not.toHaveProperty(field);
      }
    }
  });

  test("نسخة المتصفح أخفّ من المصدر بوضوح", () => {
    const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");
    const full = Buffer.byteLength(read("../src/data/lexicon.json"));
    const client = Buffer.byteLength(read("../src/data/lexicon.client.json"));
    expect(client).toBeLessThan(full * 0.9);
  });
});

describe("schools.json / news.json — الحقول المساعدة", () => {
  test("كل كلية لها اسم مختصر ومدينة", () => {
    for (const school of schools as Array<{ id?: string; short_name?: string; city?: string; name?: string }>) {
      const where = school.id || school.name || "?";
      expect(school.short_name, `short_name في ${where}`).toBeTruthy();
      expect(school.short_name).not.toContain("كلية العلوم القانونية والاقتصادية والاجتماعية");
      expect(school.city, `city في ${where}`).toBeTruthy();
    }
  });

  test("كل خبر له بطاقة واحدة على الأقل وكل صفة غير فارغة", () => {
    for (const item of news as Array<{ id?: string; tags?: string[] }>) {
      expect(Array.isArray(item.tags), `tags في ${item.id}`).toBe(true);
      expect(item.tags!.length, `tags في ${item.id}`).toBeGreaterThan(0);
      for (const tag of item.tags!) expect(tag.trim().length, `وسم فارغ في ${item.id}`).toBeGreaterThan(1);
    }
  });
});

describe("المولّد نفسه", () => {
  test("`pnpm seo:enrich:check` لا يجد انحرافاً بين البيانات والمولّد", () => {
    // البناء idempotent: تشغيل المولّد على ناتجه لا يغيّر شيئاً، وإلا صارت
    // diffs عشوائية في كل فرع يلمس lexicon.json.
    expect(() =>
      execFileSync("node", ["scripts/enrich-lexicon.mjs", "--check"], {
        cwd: fileURLToPath(new URL("..", import.meta.url)),
        stdio: "pipe",
      })
    ).not.toThrow();
  });
});
