/**
 * اختبارات بيانات دليل المسارات والمهن القانونية (tests 1–8 من مواصفة الميزة).
 *
 * هذه الاختبارات تحمي القاعدة التحريرية نفسها لا الشكل فقط: لا سنّ مُفبرك،
 * لا مصدر وُضع كأنه متحقق منه، لا معرّف مصطلح غير موجود في القاموس، ولا جملة
 * تعد الطالب بالقبول أو الأهلية. أي انحراف في careers.json يُسقط الاختبار هنا
 * قبل أن يصل إلى زاحف أو طالب.
 */
import { describe, expect, it } from "vitest";
import careersData from "../src/data/careers.json";
import categoriesData from "../src/data/career-categories.json";
import citiesData from "../src/data/morocco-cities.json";
import competitionsData from "../src/data/career-competitions.json";
import careerLexiconData from "../src/data/career-lexicon.json";
import lexiconData from "../src/data/lexicon.json";
import schoolsData from "../src/data/schools.json";
import type { CareerCompetition, CareerRecord, MoroccoCity } from "../src/lib/careers/types";

const CAREERS = careersData as unknown as CareerRecord[];
const CATEGORIES = categoriesData as unknown as Array<{ id: string; order: number; slug: string }>;
const CITIES = citiesData as unknown as MoroccoCity[];
const COMPETITIONS = competitionsData as unknown as CareerCompetition[];
const CAREER_LEXICON = careerLexiconData as unknown as Array<{ id: string; slug: string }>;
const LEXICON_IDS = new Set((lexiconData as Array<{ id: string }>).map((term) => term.id));

const WORK_MODELS = new Set(["public_sector", "liberal_regulated", "private_sector", "academic", "mixed"]);
const EDUCATION_NEEDS = new Set(["required", "recommended", "depends", "not_required"]);
const COMPETITION_PATHS = new Set([
  "annual_public_competition",
  "regulated_profession",
  "private_recruitment",
  "academic_competition",
  "not_applicable",
]);

/** العبارات الممنوعة نصاً — لا أهلية ولا ضمان قبول ولا اختبار رسمي. */
const FORBIDDEN_CLAIMS = [
  "أنت مؤهل",
  "يمكنك الترشح بالتأكيد",
  "هذه المهنة مناسبة لك قانونياً",
  "أنت جاهز للنجاح",
  "فرص قبولك مرتفعة",
  "مضمون النجاح",
  "مضمون القبول",
  "تضمن القبول",
  "أفضل كلية",
];

describe("بنية بيانات المسارات", () => {
  it("14 مساراً بمعرّفات فريدة تساوي الروابط", () => {
    expect(CAREERS).toHaveLength(14);
    const slugs = CAREERS.map((career) => career.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const career of CAREERS) {
      expect(career.id, career.slug).toBe(career.slug);
      expect(career.canonical_url).toBe(`https://www.mizan.page/careers/${career.slug}`);
      expect(career.canonical_url.endsWith("/")).toBe(false);
    }
  });

  it("الحقول التصنيفية محصورة في القيم المسموح بها", () => {
    for (const career of CAREERS) {
      expect(WORK_MODELS.has(career.work_model), career.slug).toBe(true);
      expect(EDUCATION_NEEDS.has(career.requires_legal_education), career.slug).toBe(true);
      expect(COMPETITION_PATHS.has(career.quiz_config.competition_path), career.slug).toBe(true);
      expect(career.title_ar.length, career.slug).toBeGreaterThan(2);
      expect(career.title_fr.length, career.slug).toBeGreaterThan(2);
      expect(career.short_description.length, career.slug).toBeGreaterThan(40);
      expect(career.work_model_ar.length, career.slug).toBeGreaterThan(2);
    }
  });

  it("كل مسار له خط ولوج من خطوتين على الأقل، ومهارات، وأين يناسب", () => {
    for (const career of CAREERS) {
      expect(career.entry_path.length, career.slug).toBeGreaterThanOrEqual(2);
      career.entry_path.forEach((step, index) => {
        expect(step.step, career.slug).toBe(index + 1);
        expect(step.title_ar.trim().length, career.slug).toBeGreaterThan(2);
        expect(step.description_ar.trim().length, career.slug).toBeGreaterThan(10);
      });
      expect(career.skills.length, career.slug).toBeGreaterThanOrEqual(3);
      expect(career.best_for.length, career.slug).toBeGreaterThanOrEqual(2);
      expect(career.main_areas.length, career.slug).toBeGreaterThanOrEqual(2);
      expect(career.employment_modes.length, career.slug).toBeGreaterThanOrEqual(1);
    }
  });

  it("دلالات التصنيفات موجودة لكل مسار", () => {
    const categoryIds = new Set(CATEGORIES.map((category) => category.id));
    for (const career of CAREERS) {
      expect(categoryIds.has(career.category_id), career.slug).toBe(true);
      expect(career.category_ar.length, career.slug).toBeGreaterThan(2);
    }
    expect(CATEGORIES).toHaveLength(6);
    expect(new Set(CATEGORIES.map((category) => category.order)).size).toBe(CATEGORIES.length);
  });
});

describe("الشروط والمصادر — لا معلومة غير متحقق منها", () => {
  it("شرط السن بلا أرقام مُفبركة ويحمل حالة تحقق", () => {
    for (const career of CAREERS) {
      expect(career.age_requirement.minimum, career.slug).toBeNull();
      expect(career.age_requirement.maximum, career.slug).toBeNull();
      expect(career.age_requirement.status, career.slug).toBe("verify_official_source");
      expect(career.age_requirement.note_ar.length, career.slug).toBeGreaterThan(10);
    }
  });

  it("كل شرط يحمل نوعه وحالة تحققه ومصدره الفارغ بدل رابط مُخترع", () => {
    for (const career of CAREERS) {
      expect(career.requirements.length, career.slug).toBeGreaterThanOrEqual(2);
      for (const requirement of career.requirements) {
        expect(requirement.id, career.slug).toBeTruthy();
        expect(requirement.label_ar.length, career.slug).toBeGreaterThan(2);
        expect(requirement.value_ar.length, career.slug).toBeGreaterThan(10);
        expect(requirement.requirement_type, career.slug).toBeTruthy();
        // في هذه النسخة لا يوجد مصدر رسمي متحقق بعد لأي شرط رقمي.
        expect(requirement.source_url, career.slug).toBeNull();
        expect(requirement.last_verified, career.slug).toBeNull();
        expect(requirement.status, career.slug).toBe("verify_official_source");
      }
    }
  });

  it("المصادر كلها معلَّمة بأنها تحتاج تحققاً رسمياً (بلا رابط مطبوع)", () => {
    for (const career of CAREERS) {
      expect(career.sources.length, career.slug).toBeGreaterThanOrEqual(1);
      for (const source of career.sources) {
        expect(source.url, career.slug).toBe("");
        expect(source.status, career.slug).toBe("needs_official_verification");
        expect(source.last_verified, career.slug).toBeNull();
      }
      expect(career.review_status, career.slug).toBe("internal_review");
      expect(career.last_reviewed, career.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("كل شرط مرتبط بإعلان يحمل نطاقاً صريحاً (لا قاعدة دائمة من إعلان قديم)", () => {
    for (const career of CAREERS) {
      for (const requirement of career.requirements) {
        const annual =
          requirement.requirement_type === "annual_notice" ||
          requirement.requirement_type === "legal_or_annual_notice";
        expect(requirement.notice_year, `${career.slug}:${requirement.id}`).toBeNull();
        expect(requirement.notice_status, `${career.slug}:${requirement.id}`).toBe(
          annual ? "check_current_notice" : "not_applicable"
        );
      }
    }
  });

  it("كل مسار يعلن إطاره القانوني وروابط الأرشيف (بلا معرّفات مُخترعة)", () => {
    for (const career of CAREERS) {
      expect(Array.isArray(career.law_slugs), career.slug).toBe(true);
      expect(career.legal_framework.length, career.slug).toBeGreaterThanOrEqual(1);
      // الإطار الحاكم: نصّ مهني منظم أو نظام أساسي للوظيفة العمومية/الأكاديمية
      const relationships = new Set(career.legal_framework.map((entry) => entry.relationship_type));
      expect(
        relationships.has("governing_framework") || relationships.has("public_employment"),
        career.slug
      ).toBe(true);
      for (const entry of career.legal_framework) {
        // لا سجل أرشيف ⇒ القانون لا يُقدَّم كمرجع متحقق منه
        if (entry.law_slug === null) {
          expect(entry.verification_status, career.slug).toBe("needs_archive_entry");
        }
        expect(entry.last_verified, career.slug).toBeNull();
      }
    }
  });

  it("الشهادة المعتادة والمسار المعلن يحملان حالة تحقق لا ادعاء نهائياً", () => {
    for (const career of CAREERS) {
      expect(career.typical_degree.status, career.slug).toBe("verify_official_source");
      expect(career.typical_degree.label_ar.length, career.slug).toBeGreaterThan(3);
      expect(career.training_after_admission.status, career.slug).toBe("verify_official_source");
      expect(career.quiz_config.competition_note_ar.length, career.slug).toBeGreaterThan(30);
    }
  });
});

describe("سلامة الربط بالقاموس والمسارات القريبة", () => {
  it("معرّفات المصطلحات موجودة في قاموس ميزان وفي الملف المقلَّص", () => {
    const slimIds = new Set(CAREER_LEXICON.map((term) => term.id));
    for (const career of CAREERS) {
      expect(career.lexicon_term_ids.length, career.slug).toBeGreaterThanOrEqual(4);
      expect(career.lexicon_term_ids.length, career.slug).toBeLessThanOrEqual(8);
      for (const termId of career.lexicon_term_ids) {
        expect(LEXICON_IDS.has(termId), `${career.slug}:${termId}`).toBe(true);
        expect(slimIds.has(termId), `${career.slug}:${termId}`).toBe(true);
      }
    }
  });

  it("المسارات القريبة تشير إلى مسارات موجودة ولا تشير إلى نفسها", () => {
    const slugs = new Set(CAREERS.map((career) => career.slug));
    for (const career of CAREERS) {
      expect(career.related_career_ids.length, career.slug).toBeGreaterThanOrEqual(2);
      for (const related of career.related_career_ids) {
        expect(slugs.has(related), `${career.slug}→${related}`).toBe(true);
        expect(related, career.slug).not.toBe(career.slug);
      }
    }
  });
});

describe("مدن المغرب وإحداثيات الكليات", () => {
  it("قائمة المدن مغربية الإحداثيات وبلا تكرار", () => {
    expect(CITIES.length).toBeGreaterThanOrEqual(15);
    const ids = CITIES.map((city) => city.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const city of CITIES) {
      expect(city.latitude, city.id).toBeGreaterThan(20);
      expect(city.latitude, city.id).toBeLessThan(36.5);
      expect(city.longitude, city.id).toBeGreaterThan(-14);
      expect(city.longitude, city.id).toBeLessThan(-0.5);
      expect(city.name_ar.length, city.id).toBeGreaterThan(2);
    }
  });

  it("كل كلية في الدليل لها موقع بمدينة معروفة (تغطية 21/21)", () => {
    const schools = schoolsData as Array<{ city?: string; location?: { latitude?: number; longitude?: number } }>;
    expect(schools).toHaveLength(21);
    const cityNames = new Set(CITIES.map((city) => city.name_ar));
    for (const school of schools) {
      expect(school.city, "school city").toBeTruthy();
      expect(cityNames.has(String(school.city)), String(school.city)).toBe(true);
      expect(typeof school.location?.latitude, String(school.city)).toBe("number");
      expect(typeof school.location?.longitude, String(school.city)).toBe("number");
    }
  });
});

describe("سجلات المباريات — لا إعلان بلا مصدر رسمي", () => {
  it("كل سجل مرتبط بمسار موجود وحالته معلنة", () => {
    const slugs = new Set(CAREERS.map((career) => career.slug));
    const statuses = new Set(["upcoming", "open", "closed", "historical", "unverified"]);
    for (const record of COMPETITIONS) {
      expect(slugs.has(record.career_id), record.id).toBe(true);
      expect(statuses.has(record.status), record.id).toBe(true);
      expect(record.title_ar.length, record.id).toBeGreaterThan(5);
      expect(record.disclaimer_ar.length, record.id).toBeGreaterThan(30);
      expect(record.last_reviewed, record.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("لا سجل بحالة open/upcoming، وكل السجلات بلا رابط إعلان ولا تاريخ مُخترع", () => {
    for (const record of COMPETITIONS) {
      expect(record.status, record.id).toBe("unverified");
      expect(record.official_notice_url, record.id).toBe("");
      expect(record.official_notice_date, record.id).toBeNull();
      expect(record.source_verified_at, record.id).toBeNull();
    }
  });

  it("لا عبارات تعد بالأهلية أو بالقبول في أي حقل من حقول الدليل", () => {
    const haystack = JSON.stringify([careersData, categoriesData, competitionsData]);
    for (const claim of FORBIDDEN_CLAIMS) {
      expect(haystack.includes(claim), claim).toBe(false);
    }
  });
});
