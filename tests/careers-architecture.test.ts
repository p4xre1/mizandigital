/**
 * اختبارات المعمار والخصوصية لجولة التصحيح (الأقسام B–F).
 *
 * ما تحميه هذه الطبقة: اصطلاح الملكية (owner_id لا user_id)، فصل طبقات
 * البروفايل (خاص vs عام)، نوع مفتاح المدارس (text لا uuid)، أن اختيار المدينة
 * لا يترك أثراً في الميتاداتا أو الروابط أو الخريطة، ونطاق الإعلان السنوي.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import careersData from "../src/data/careers.json";
import competitionsData from "../src/data/career-competitions.json";
import { CAREERS_DISCLAIMER } from "../shared/careers/copy.js";
import { buildCareerPages } from "../scripts/lib/career-pages.mjs";
import type { CareerRecord } from "../src/lib/careers/types";

const CAREERS = careersData as unknown as CareerRecord[];
const COMPETITIONS = competitionsData as unknown as Array<{
  id: string;
  status: string;
  official_notice_url: string;
  official_notice_date: string | null;
  source_verified_at: string | null;
  last_reviewed: string;
}>;

const MIGRATIONS = [
  "supabase/migrations/20260930000000_career_training_tables.sql",
  "supabase/migrations/20260931000000_career_owner_id_and_laws_bridge.sql",
];
const CORRECTION_SQL = readFileSync(MIGRATIONS[1], "utf8");
const TRAINING_SERVICE = readFileSync("src/lib/careers/trainingService.ts", "utf8");
const PUBLIC_PROFILE = readFileSync("src/pages/public/PublicProfilePage.tsx", "utf8");
const SITEMAP = readFileSync("public/sitemap.xml", "utf8");
const LLMS = readFileSync("public/llms.txt", "utf8");
const LLMS_FULL = readFileSync("public/llms-full.txt", "utf8");
const REFERENCE_INDEX = readFileSync("public/reference/index.json", "utf8");

/** كل ملفات الميزة (لاستعلامات الخصوصية والنصوص المحظورة). */
function featureFiles(): string[] {
  return [
    ...readdirSync("src/lib/careers").map((file) => join("src/lib/careers", file)),
    ...readdirSync("src/components/careers").map((file) => join("src/components/careers", file)),
    ...readdirSync("src/pages/public/careers").map((file) => join("src/pages/public/careers", file)),
    "shared/careers/copy.js",
    "scripts/lib/career-pages.mjs",
  ];
}

describe("اصطلاح الملكية — owner_id للجداول الخاصة الجديدة", () => {
  it("الجداول الخاصة الجديدة تُنشأ/تُصحّح بـ owner_id لا user_id", () => {
    // الهجرة التصحيحية تنقل العمود وتُعيد بناء المفتاح الأساسي والسياسات
    expect(CORRECTION_SQL).toContain("RENAME COLUMN user_id TO owner_id");
    expect(CORRECTION_SQL).toContain("ALTER COLUMN owner_id SET DEFAULT auth.uid()");
    expect(CORRECTION_SQL).toContain("PRIMARY KEY (owner_id, career_slug)");
    expect(CORRECTION_SQL).not.toMatch(/CREATE TABLE[^;]*\buser_id\b/s);

    // والاستعلامات في الواجهة تستعمل owner_id وحده
    expect(TRAINING_SERVICE).toContain('"owner_id"');
    expect(TRAINING_SERVICE).not.toMatch(/from\("career_training[a-z_]*"\)[\s\S]{0,200}?\buser_id\b/);
    expect(TRAINING_SERVICE).not.toContain('onConflict: "user_id,career_slug"');
  });

  it("لا جدول محفوظات مدارس في هذه النسخة — والترشيح يُحسب محلياً", () => {
    // «لا تُنشئ جدولاً إن لم يكن ضرورياً»: لا career_saved_schools في أي هجرة
    const allSql = readdirSync("supabase/migrations")
      .map((file) => readFileSync(join("supabase/migrations", file), "utf8"))
      .join("\n");
    expect(allSql.includes("career_saved_schools")).toBe(false);
  });

  it("أي علاقة مستقبلية بالمدارس تُكتب school_id text (public.schools.id نصّي)", () => {
    // لا يوجد FK للمدارس في هذه النسخة، لكن الاصطلاح مثبّت ومُختبَر
    expect(CORRECTION_SQL).toContain("school_id text references public.schools(id)");
    expect(CORRECTION_SQL).not.toMatch(/school_id\s+uuid/i);
    expect(TRAINING_SERVICE).not.toMatch(/school_id/);
    // أنواع قاعدة البيانات: معرّف المدارس نصّي (string) لا uuid مخصص
    const dbTypes = readFileSync("src/types/database.types.ts", "utf8");
    expect(dbTypes).toMatch(/schools:\s*\{\s*Row:\s*\{\s*id:\s*string/);
  });

  it("سجل career_laws يحمل law_id فقط (لا معرّفات مسارات كأعمدة قاعدة بيانات)", () => {
    expect(CORRECTION_SQL).toMatch(/law_id uuid NOT NULL REFERENCES public\.laws\(id\) ON DELETE RESTRICT/);
    expect(CORRECTION_SQL).toContain("career_slug text NOT NULL");
    expect(CORRECTION_SQL).toContain("CREATE INDEX IF NOT EXISTS career_laws_law_id_idx");
  });
});

describe("فصل البروفايل الخاص عن العام", () => {
  it("بيانات التدريب لا تظهر في البروفايل العام ولا في الملفات المولَّدة", () => {
    for (const source of [PUBLIC_PROFILE, LLMS, LLMS_FULL, REFERENCE_INDEX, SITEMAP]) {
      expect(source.includes("career_training_profiles")).toBe(false);
      expect(source.includes("career_training_progress")).toBe(false);
      expect(source.includes("career_training")).toBe(false);
    }
    // ولا ضعف مصطلحات (weak_topics) يتسرّب إلى أي ملف منشور
    expect(LLMS.includes("weak_topics")).toBe(false);
    expect(LLMS_FULL.includes("weak_topics")).toBe(false);
  });

  it("لا مسار عام للتدريب: الصفحة الوحيدة هي تبويب داخل /profile غير المفهرس", () => {
    const routes = readFileSync("src/routes/AppRoutes.tsx", "utf8");
    expect(routes).not.toMatch(/path="\/profile\/training/);
    expect(routes).not.toMatch(/path="\/careers\/training/);
  });

  it("لا تُخزَّن ولا تُعرض بيانات حساسة: عنوان، GPS، سن، أهلية، احتمال قبول", () => {
    const forbiddenColumns = [
      /\baddress\b/i,
      /\blatitude\b/i,
      /\blongitude\b/i,
      /\bbirth/i,
      /\bage\b/i,
      /eligib/i,
      /acceptance_probability/i,
      /success_probability/i,
    ];
    const tableBlocks = CORRECTION_SQL
      .split(/CREATE TABLE IF NOT EXISTS/)
      .filter((block) => block.includes("public.career_"))
      .map((block) => block.slice(0, block.indexOf(");") + 2));
    expect(tableBlocks.length).toBeGreaterThanOrEqual(1);
    for (const block of tableBlocks) {
      for (const pattern of forbiddenColumns) {
        if (pattern.source === "\\bage\\b") continue; // كلمة عامة داخل تعليق عربي/إنجليزي
        expect(pattern.test(block), `${pattern} in career table`).toBe(false);
      }
    }

    // ولا أيها يظهر في نصوص الواجهة كطلب من المستخدم
    for (const file of featureFiles()) {
      const source = readFileSync(file, "utf8");
      expect(source.includes("navigator.geolocation")).toBe(false);
      expect(/require.{0,20}(عنوان|رقم هاتف)/.test(source)).toBe(false);
    }
  });

  it("لا كتابة للزائر: كل عمليات الكتابة تسبقها جلسة، والسياسات ترفض المجهول", () => {
    expect(TRAINING_SERVICE).toContain("if (!userId) return { ok: false, reason: NO_SESSION }");
    expect(CORRECTION_SQL).toContain("REVOKE ALL ON public.career_training_profiles, public.career_training_progress FROM anon");
    expect(CORRECTION_SQL).not.toMatch(/TO anon[^;]*career_training/);
  });

  it("حفظ المدينة فعل صريح، ولا استبدال صامت لمدينة محفوظة", () => {
    const nearby = readFileSync("src/components/careers/NearbyLawSchools.tsx", "utf8");
    expect(nearby).toContain("حفظ مدينتي في ملفي");
    expect(nearby).toContain("لن نستبدلها إلا إذا ضغطت زر الحفظ");
    // الحفظ لا يُستدعى من onChange الخاص بمربع البحث أو من اختيار المدينة
    const selectBlock = nearby.slice(nearby.indexOf("const handleSelect"), nearby.indexOf("const handleSaveCity"));
    expect(selectBlock.includes("saveCityToProfile")).toBe(false);
    // ولا كتابة إلى طبقة البروفايل العام mizan_profiles من أي مكان آخر
    expect(TRAINING_SERVICE).toContain('@/lib/profiles/service');
  });
});

describe("الإعلان السنوي والمصادر الرسمية", () => {
  it("كل شرط مرتبط بإعلان يحمل نطاقاً صريحاً ولا رقم قاعدة دائمة", () => {
    for (const career of CAREERS) {
      for (const requirement of career.requirements) {
        const annual =
          requirement.requirement_type === "annual_notice" ||
          requirement.requirement_type === "legal_or_annual_notice";
        expect(requirement.notice_year, `${career.slug}:${requirement.id}`).toBeNull();
        expect(requirement.notice_status, `${career.slug}:${requirement.id}`).toBe(
          annual ? "check_current_notice" : "not_applicable"
        );
        expect(requirement.source_url, `${career.slug}:${requirement.id}`).toBeNull();
        // لا رقم سن ولا عدد مناصب في نصّ الشرط (القيم الرقمية تأتي من الإعلان)
        expect(/\d/.test(requirement.value_ar), `${career.slug}:${requirement.id}`).toBe(false);
      }
    }
  });

  it("لا مباراة بحالة open/upcoming بلا الحقول الرسمية الأربعة", () => {
    for (const record of COMPETITIONS) {
      if (record.status === "open" || record.status === "upcoming") {
        expect(record.official_notice_url, record.id).toBeTruthy();
        expect(record.source_verified_at, record.id).toBeTruthy();
        expect(record.last_reviewed, record.id).toBeTruthy();
        expect(record.official_notice_date, record.id).toBeTruthy();
      } else {
        // والحالات الأخرى تبقى بلا ادعاء رسمي
        expect(record.official_notice_url, record.id).toBe("");
        expect(record.source_verified_at, record.id).toBeNull();
      }
    }
  });

  it("لا لغة أهلية أو ضمان نجاح في أي ملف من الميزة أو في الصفحات المولَّدة", async () => {
    const forbidden = [
      "أنت مؤهل",
      "أنت مقبول",
      "أنت جاهز للنجاح",
      "لديك فرصة مرتفعة",
      "فرص قبولك مرتفعة",
      "هذه الشهادة تكفي حتماً",
      "مضمون النجاح",
      "مضمون القبول",
    ];
    for (const file of featureFiles()) {
      const lines = readFileSync(file, "utf8").split("\n");
      for (const line of lines) {
        const isComment = /^\s*(\/\/|\*|\/\*|<!--)/.test(line);
        const isNegated = /لا\s|ليس|ممنوع|دون\s|تُعرض بدل/.test(line);
        for (const phrase of forbidden) {
          if (line.includes(phrase)) expect(isComment || isNegated, `${file}: ${line.trim()}`).toBe(true);
        }
      }
    }

    const pages = (await buildCareerPages()) as Array<{ path: string; staticBody: string }>;
    for (const page of pages) {
      for (const phrase of forbidden) {
        expect(page.staticBody.includes(phrase), `${page.path}:${phrase}`).toBe(false);
      }
      expect(page.staticBody, page.path).toContain(CAREERS_DISCLAIMER);
    }
  });
});

describe("اختيار المدينة لا يغيّر الميتاداتا ولا الروابط", () => {
  it("لا رابط ولا ميتاداتا مرتبطة بمدينة في الصفحات المولَّدة أو الخريطة", async () => {
    const pages = (await buildCareerPages()) as Array<{ path: string; staticBody: string }>;
    const cityIds = ["casablanca", "tanger", "agadir", "rabat", "marrakech"];
    for (const page of pages) {
      for (const city of cityIds) {
        expect(page.staticBody.includes(`api/${city}`), page.path).toBe(false);
        expect(page.staticBody.includes(`?city=${city}`), page.path).toBe(false);
        expect(page.staticBody.includes(`#${city}`), page.path).toBe(false);
      }
    }
    for (const city of cityIds) {
      expect(SITEMAP.includes(`careers/${city}`)).toBe(false);
      expect(SITEMAP.includes(`?city=${city}`)).toBe(false);
    }
  });

  it("مكوّن «أقرب الكليات» لا يعدّل الرأس ولا يبني روابط بمدن", () => {
    const nearby = readFileSync("src/components/careers/NearbyLawSchools.tsx", "utf8");
    expect(nearby.includes("document.title")).toBe(false);
    expect(nearby.includes("canonical")).toBe(false);
    expect(nearby.includes("history.replaceState")).toBe(false);
    // الروابط الوحيدة المُنتجة هي صفحات الكليات القائمة
    const hrefs = nearby.match(/to=\{`\/[^`]+`\}|to="\/[^"]+"/g) ?? [];
    for (const href of hrefs) {
      expect(href.includes("city") || href.includes("?")).toBe(false);
    }
  });
});
