/**
 * اختبارات تكامل الدليل مع البنية الثابتة (tests 23–30 من مواصفة الميزة).
 *
 * هذه الطبقة هي ما يفصل «ميزة تعمل في المتصفح» عن «ميزة مفهرسة»: ملف ثابت
 * مولَّد، رابط في sitemap، رابط خام في الترويسة والفوتر، لا JobPosting،
 * إخلاء مسؤولية منقوش في كل صفحة، وصفحات التدريب الشخصي خارج الفهرس.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isIndexablePath, canonicalUrl } from "../shared/seo/url-policy.js";
import { CAREERS_DISCLAIMER, CAREERS_QUIZ_DISCLAIMER } from "../shared/careers/copy.js";
import { buildCareerPages, buildCareerSitemapEntries, CAREER_QUIZ_MIN_QUESTIONS } from "../scripts/lib/career-pages.mjs";
import careersData from "../src/data/careers.json";
import competitionsData from "../src/data/career-competitions.json";

const prerender = readFileSync("scripts/prerender.mjs", "utf8");
const navigation = readFileSync("src/layouts/PublicNavigation.tsx", "utf8");
const appRoutes = readFileSync("src/routes/AppRoutes.tsx", "utf8");
const profilePage = readFileSync("src/pages/public/MyProfilePage.tsx", "utf8");
const sitemap = readFileSync("public/sitemap.xml", "utf8");
const careers = careersData as Array<{ slug: string; quiz_config: { career_quiz_slug: string } }>;

describe("توليد الصفحات الثابتة", () => {
  it("تُبنى 30 صفحة: الركنية + 14 مساراً + بوابة الاختبارات + 14 اختباراً", async () => {
    const pages = await buildCareerPages();
    expect(pages).toHaveLength(1 + careers.length + 1 + careers.length);

    const paths = pages.map((page: { path: string }) => page.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toContain("/careers");
    expect(paths).toContain("/quiz/careers");
    for (const career of careers) {
      expect(paths, career.slug).toContain(`/careers/${career.slug}`);
      expect(paths, career.slug).toContain(`/quiz/careers/${career.quiz_config.career_quiz_slug}`);
    }
  });

  it("لا تُولَّد أي صفحة تمارين مباريات (لا سجل متحقق منه بعد)", async () => {
    const pages = await buildCareerPages();
    expect(pages.some((page: { path: string }) => page.path.includes("/practice/"))).toBe(false);
    // وهذا مقصود: كل سجلات المباريات في البيانات غير متحققة
    for (const record of competitionsData as Array<{ official_notice_url: string; source_verified_at: string | null }>) {
      expect(record.official_notice_url).toBe("");
      expect(record.source_verified_at).toBeNull();
    }
  });

  it("كل صفحة تحمل إخلاء المسؤولية الإلزامي بنصّه، ووصفاً غير فارغ", async () => {
    const pages = await buildCareerPages();
    for (const page of pages as Array<{ path: string; title: string; description: string; staticBody: string }>) {
      expect(page.title.length, page.path).toBeGreaterThan(20);
      expect(page.description.length, page.path).toBeGreaterThan(80);
      expect(page.staticBody, page.path).toContain(CAREERS_DISCLAIMER);
      // صفحات التدريب/الاختبار تحمل إخلاء الاختبار أيضاً (لا اختبار رسمي)
      if (page.path.startsWith("/quiz/careers")) {
        expect(page.staticBody, page.path).toContain(CAREERS_QUIZ_DISCLAIMER);
      }
      // لا JobPosting في أي صيغة (ولا نص يدّعي إعلان توظيف)
      expect(page.staticBody.includes("JobPosting"), page.path).toBe(false);
      expect(JSON.stringify(page), page.path).not.toContain("JobPosting");
      expect(page.staticBody.includes("أنت مؤهل"), page.path).toBe(false);
    }
  });

  it("كل صفحة تحمل H1 واحداً وروابط داخلية للعودة إلى الدليل", async () => {
    const pages = await buildCareerPages();
    for (const page of pages as Array<{ path: string; staticBody: string }>) {
      const h1s = page.staticBody.match(/<h1>/g) ?? [];
      expect(h1s.length, page.path).toBe(1);
      expect(page.staticBody, page.path).toContain('<main dir="rtl" lang="ar-MA">');
      if (page.path !== "/careers") {
        expect(page.staticBody, page.path).toContain('href="/careers"');
      }
    }
  });
});

describe("الربط مع sitemap والتنقل", () => {
  it("مدخلات sitemap = الصفحات المولَّدة بلا زيادة ولا نقصان", async () => {
    const pages = await buildCareerPages();
    const entries = await buildCareerSitemapEntries();
    expect(new Set(entries.map((entry: { path: string }) => entry.path))).toEqual(
      new Set(pages.map((page: { path: string }) => page.path))
    );
  });

  it("sitemap المنشور يضم /careers و/quiz/careers وكل مسار، بلا شرطة نهاية", () => {
    expect(sitemap).toContain("<loc>https://www.mizan.page/careers</loc>");
    expect(sitemap).toContain("<loc>https://www.mizan.page/quiz/careers</loc>");
    for (const career of careers) {
      expect(sitemap, career.slug).toContain(`<loc>https://www.mizan.page/careers/${career.slug}</loc>`);
    }
    expect(sitemap).not.toContain("/careers/</loc>");
    expect(sitemap).not.toContain("/practice/");
  });

  it("الرابط القانوني بلا شرطة نهاية ولا مسارات بمدن", () => {
    expect(canonicalUrl("/careers/avocat/")).toBe("https://www.mizan.page/careers/avocat");
    expect(canonicalUrl("/careers")).toBe("https://www.mizan.page/careers");
    // لا صفحة مدينة: الترتيب المحلي يظهر داخل الصفحة لا في رابط
    expect(sitemap).not.toMatch(/careers\/(casablanca|tanger|agadir|rabat)/);
  });

  it("/careers عنصر تنقّل واحد + رابط خام في الترويسة والفوتر المولّدين", () => {
    expect((navigation.match(/to="\/careers"/g) ?? []).length).toBeGreaterThanOrEqual(2); // سطح المكتب + الجوال
    expect(navigation).toContain('to="/careers"');
    expect(navigation).toContain("المسارات المهنية");
    expect(prerender).toContain('["المسارات المهنية", "/careers", false]');
    expect(prerender).toContain('<a href="/careers">المسارات والمهن القانونية</a>');
    expect(prerender).toContain("buildCareerPages");
  });
});

describe("المسارات وصفحات الملف", () => {
  it("المسارات الخمسة مسجّلة في جدول التوجيه", () => {
    for (const path of [
      'path="/careers"',
      'path="/careers/:slug"',
      'path="/quiz/careers"',
      'path="/quiz/careers/:careerSlug"',
      'path="/quiz/careers/:careerSlug/practice/:competitionId"',
    ]) {
      expect(appRoutes, path).toContain(path);
    }
  });

  it("تبويب «تدريبي المهني» موجود في /profile مع الافتراضي «ملفي»", () => {
    expect(profilePage).toContain("CareerTrainingDashboard");
    expect(profilePage).toContain("career-training");
    expect(profilePage).toContain("SECTION_TITLES.training");
    expect(profilePage).toMatch(/useState<"profile" \| "career-training">\("profile"\)/);
  });

  it("صفحات النتائج والتدريب الشخصي خارج الفهرس، وتمارين المباريات كذلك", () => {
    expect(isIndexablePath("/careers")).toBe(true);
    expect(isIndexablePath("/careers/magistrat")).toBe(true);
    expect(isIndexablePath("/quiz/careers")).toBe(true);
    expect(isIndexablePath("/quiz/careers/magistrat")).toBe(true);
    expect(isIndexablePath("/quiz/careers/magistrat/practice/magistrat-annual")).toBe(false);
    expect(isIndexablePath("/profile")).toBe(false);
    expect(isIndexablePath("/u/someone")).toBe(false);
  });

  it("شرط تفعيل الاختبار (8 أسئلة) واضح في الواجهة وفي السكربت", () => {
    expect(CAREER_QUIZ_MIN_QUESTIONS).toBe(8);
    const quizPage = readFileSync("src/pages/public/careers/CareerQuizPage.tsx", "utf8");
    expect(quizPage).toContain("pool.length >= 8");
    expect(quizPage).toContain("has_knowledge_quiz");
  });
});
