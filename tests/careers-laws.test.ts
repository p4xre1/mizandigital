/**
 * اختبارات ربط المسارات بأرشيف القوانين (القسم A من تصحيح المعمار).
 *
 * القاعدة التي تحميها: لا معرّف نص قانوني مُخترع، ولا UUID قاعدة بيانات داخل
 * ملف تحريري، ولا رابط داخلي إلى نص غير موجود، وحالة «بانتظار الإضافة» صريحة
 * بالنصّ الحرفي المتفق عليه.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import careersData from "../src/data/careers.json";
import lawSnapshot from "../src/data/laws.client.json";
import { CAREERS_LAW_NOT_ARCHIVED, LAW_VERIFICATION_LABELS, SECTION_TITLES } from "../shared/careers/copy.js";
import { getLawBySlug, lawHref, resolveCareerLaws } from "../src/lib/careers/laws";
import { buildCareerPages } from "../scripts/lib/career-pages.mjs";
import type { CareerRecord } from "../src/lib/careers/types";

const CAREERS = careersData as unknown as CareerRecord[];
const ARCHIVE = (lawSnapshot as unknown as { laws: Array<{ slug: string; public_path: string | null }> }).laws ?? [];
const ARCHIVE_SLUGS = new Set(ARCHIVE.map((record) => record.slug));

const RELATIONSHIP_TYPES = new Set([
  "governing_framework",
  "access_conditions",
  "training",
  "professional_ethics",
  "public_employment",
  "annual_notice_reference",
]);

describe("بيانات الربط في careers.json", () => {
  it("كل مسار يحمل law_slugs و legal_framework بالشكل المتفق عليه", () => {
    for (const career of CAREERS) {
      expect(Array.isArray(career.law_slugs), career.slug).toBe(true);
      expect(career.legal_framework.length, career.slug).toBeGreaterThanOrEqual(1);
      for (const entry of career.legal_framework) {
        expect(entry.label_ar.trim().length, career.slug).toBeGreaterThan(3);
        expect(RELATIONSHIP_TYPES.has(entry.relationship_type), `${career.slug}:${entry.relationship_type}`).toBe(true);
        expect(entry.relationship_ar.trim().length, career.slug).toBeGreaterThan(2);
        expect(
          ["verified", "needs_archive_entry", "needs_official_verification"].includes(entry.verification_status),
          career.slug
        ).toBe(true);
        expect(entry.last_verified, career.slug).toBeNull();
      }
    }
  });

  it("لا UUID قاعدة بيانات في ملف البيانات، ولا أرقام نصوص مُخترعة", () => {
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const raw = readFileSync("src/data/careers.json", "utf8");
    expect(uuidPattern.test(raw)).toBe(false);

    // أرقام القوانين تُقرأ من الأرشيف فقط: لا رقم نصّ في أي تسمية تحريرية
    for (const career of CAREERS) {
      for (const entry of career.legal_framework) {
        expect(/\d/.test(entry.label_ar), `${career.slug}:${entry.label_ar}`).toBe(false);
        expect(/\d/.test(entry.relationship_ar), `${career.slug}:${entry.relationship_ar}`).toBe(false);
      }
      for (const source of career.sources) {
        expect(/\d/.test(source.title_ar), `${career.slug}:${source.title_ar}`).toBe(false);
      }
    }
  });

  it("كل معرّف غير فارغ في law_slugs له سجل حقيقي في الأرشيف", () => {
    for (const career of CAREERS) {
      for (const slug of career.law_slugs) {
        expect(ARCHIVE_SLUGS.has(slug), `${career.slug}:${slug}`).toBe(true);
      }
      for (const entry of career.legal_framework) {
        if (entry.law_slug !== null) {
          expect(ARCHIVE_SLUGS.has(entry.law_slug), `${career.slug}:${entry.law_slug}`).toBe(true);
          expect(entry.verification_status, career.slug).toBe("verified");
        } else {
          // غياب السجل معلن صراحةً: لا نتظاهر بأن النص موجود
          expect(entry.verification_status, career.slug).toBe("needs_archive_entry");
        }
      }
    }
  });
});

describe("حلّ الإطار القانوني في الواجهة", () => {
  it("بلا سجل أرشيف: لا رابط مطلقاً والنصّ الحرفي معروض", () => {
    for (const career of CAREERS) {
      const resolved = resolveCareerLaws(career);
      expect(resolved.length, career.slug).toBe(career.legal_framework.length);
      for (const entry of resolved) {
        expect(entry.archive, career.slug).toBeNull();
        expect(entry.href, career.slug).toBeNull();
      }
    }
    expect(CAREERS_LAW_NOT_ARCHIVED).toBe("⚠️ النص القانوني لم يضف بعد إلى أرشيف ميزان.");
    expect(LAW_VERIFICATION_LABELS.needs_archive_entry.length).toBeGreaterThan(5);
  });

  it("معرّف غير موجود في الأرشيف لا يُنتج رابطاً ولو مرّرته الواجهة", () => {
    expect(getLawBySlug("loi-inexistante-xyz")).toBeUndefined();
    expect(lawHref(undefined)).toBeNull();
    expect(lawHref(null)).toBeNull();
    expect(lawHref({ slug: "x", public_path: null } as never)).toBeNull();

    const resolved = resolveCareerLaws({
      law_slugs: ["loi-inexistante-xyz"],
      legal_framework: [
        {
          law_slug: "loi-inexistante-xyz",
          label_ar: "نص تنظيمي غير متوفر",
          relationship_type: "governing_framework",
          relationship_ar: "القانون المنظم للمهنة",
          verification_status: "needs_archive_entry",
          last_verified: null,
        },
      ],
    });
    expect(resolved[0].archive).toBeNull();
    expect(resolved[0].href).toBeNull();
  });

  it("مسار بلا إطار مفصّل يستخرج العنوان من الأرشيف عند وجوده", () => {
    const resolved = resolveCareerLaws({ law_slugs: ["loi-inexistante-xyz"] });
    expect(resolved).toHaveLength(1);
    expect(resolved[0].verification_status).toBe("needs_archive_entry");
    expect(resolved[0].href).toBeNull();
  });
});

describe("قسم القوانين في الصفحات المولَّدة", () => {
  it("الصفحات المولَّدة تعرض العنوان والنصّ الحرفي بلا أي رابط قانوني مُفترض", async () => {
    const pages = (await buildCareerPages()) as Array<{ path: string; staticBody: string }>;
    const details = pages.filter((page) => page.path.startsWith("/careers/") && page.path !== "/careers");
    expect(details.length).toBe(CAREERS.length);

    for (const page of details) {
      expect(page.staticBody, page.path).toContain(`<h2>${SECTION_TITLES.laws}</h2>`);
      expect(page.staticBody, page.path).toContain(CAREERS_LAW_NOT_ARCHIVED);
      // لا رابط إلى مسار قوانين لا وجود له في الموقع
      expect(page.staticBody.includes('href="/laws/'), page.path).toBe(false);
      // ولا رابط إلى نص غير موجود في الأرشيف
      for (const href of page.staticBody.match(/href="\/pdf\/[^"]*"/g) ?? []) {
        const slug = href.slice(11, -1);
        expect(ARCHIVE_SLUGS.has(slug), `${page.path}:${slug}`).toBe(true);
      }
    }
  });

  it("اللقطة المولَّدة تعلن عددها وتاريخ توليدها (شفافية المصدر)", () => {
    const snapshot = lawSnapshot as unknown as { generated_at: string; count: number };
    expect(snapshot.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(snapshot.count).toBe(ARCHIVE.length);
  });
});
