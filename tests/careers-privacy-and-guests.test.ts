/**
 * اختبارات الخصوصية والزوار ونصوص الامتثال (tests 16–17 و21–22 و30).
 *
 * ما تحميه هذه الطبقة: الزائر لا يكتب شيئاً، ولا تُستخدم حقول خاصة في
 * الترشيح، ولا خدمة خرائط خارجية، والنصوص الممنوعة لا تظهر في أي ملف من
 * ملفات الميزة، وإخلاء المسؤولية الإلزامي منقوش بنصّه الواحد في الواجهة.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CAREERS_ANNUAL_NOTICE_BADGE,
  CAREERS_DISCLAIMER,
  CAREERS_GUEST_SAVE_HINT,
  CAREERS_NO_SOURCE_NOTE,
  CAREERS_PLAN_DISCLAIMER,
  CAREERS_QUIZ_DISCLAIMER,
  CAREERS_TRAINING_NOTE,
  CAREERS_VERIFY_BADGE,
  FILTER_ADVISORY,
} from "../shared/careers/copy.js";
import { buildCareerTrainingStats, buildTrainingOverview, buildTrainingPlan } from "../src/lib/careers/training";
import questionsData from "../src/data/quiz-questions.json";
import careersData from "../src/data/careers.json";
import type { CareerRecord } from "../src/lib/careers/types";
import type { QuizAttempt, QuizQuestion } from "../src/types/quiz";

const careers = careersData as unknown as CareerRecord[];
const bank = questionsData as unknown as QuizQuestion[];

const featureFiles = [
  ...readdirSync("src/lib/careers").map((file) => join("src/lib/careers", file)),
  ...readdirSync("src/components/careers").map((file) => join("src/components/careers", file)),
  ...readdirSync("src/pages/public/careers").map((file) => join("src/pages/public/careers", file)),
  "shared/careers/copy.js",
];

describe("نصوص الامتثال", () => {
  it("إخلاء المسؤولية الإلزامي بنصّه الحرفي", () => {
    expect(CAREERS_DISCLAIMER).toBe(
      "هذه المعلومات للتوجيه الدراسي والمهني فقط، وليست إعلان توظيف ولا استشارة قانونية. شروط الولوج والسن والشهادات وعدد المناصب قد تتغير حسب النصوص القانونية والإعلانات الرسمية. تحقق دائماً من المصدر الرسمي قبل الترشح."
    );
    expect(CAREERS_QUIZ_DISCLAIMER).toContain("لا تمثل اختباراً رسمياً");
    expect(CAREERS_QUIZ_DISCLAIMER).toContain("ولا تضمن القبول في المباراة أو النجاح فيها");
  });

  it("شارات التحقق بصيغتها المطلوبة، ونصّ «بلا مصدر» واضح", () => {
    expect(CAREERS_VERIFY_BADGE).toBe("⚠️ يحتاج إلى التحقق من المصدر الرسمي");
    expect(CAREERS_ANNUAL_NOTICE_BADGE).toBe("🟡 راجع الإعلان السنوي الجاري به العمل");
    expect(CAREERS_NO_SOURCE_NOTE.length).toBeGreaterThan(20);
    expect(CAREERS_TRAINING_NOTE.length).toBeGreaterThan(20);
    expect(CAREERS_PLAN_DISCLAIMER.length).toBeGreaterThan(20);
    expect(CAREERS_GUEST_SAVE_HINT).toContain("أنشئ حساباً لحفظ تقدمك");
  });

  it("نصوص الفلاتر توجيهية لا حاكمة", () => {
    expect(FILTER_ADVISORY.join(" ")).toContain("قد يناسب اهتمامك");
    expect(FILTER_ADVISORY.join(" ")).not.toContain("أنت مؤهل");
    expect(FILTER_ADVISORY.join(" ")).not.toContain("بالتأكيد");
  });

  it("لا عبارة محظورة في أي ملف من ملفات الميزة", () => {
    const forbidden = [
      "أنت مؤهل",
      "أنت مقبول",
      "لديك فرصة مرتفعة",
      "هذه الشهادة تكفي حتماً",
      "يمكنك الترشح بالتأكيد",
      "هذه المهنة مناسبة لك قانونياً",
      "أنت جاهز للنجاح",
      "فرص قبولك مرتفعة",
      "مضمون القبول",
      "مضمون النجاح",
      "أفضل كلية",
      "اختبار رسمي",
    ];
    for (const file of featureFiles) {
      const source = readFileSync(file, "utf8");
      for (const phrase of forbidden) {
        // النص المحظور مسموح فقط داخل سياق النهي في التعليقات (لا في نص معروض)
        const occurrences = source.split(phrase).length - 1;
        if (occurrences > 0) {
          const lines = source.split("\n").filter((line) => line.includes(phrase));
          for (const line of lines) {
            const isComment = /^\s*(\/\/|\*|<!--)/.test(line);
            const isNegated = /لا\s|ليس|ممنوع|دون\s/.test(line);
            expect(isComment || isNegated, `${file}: ${line.trim()}`).toBe(true);
          }
        }
      }
    }
  });

  it("الإخلاء الإلزامي حاضر في كل صفحة عامة، وإخلاء الاختبار في صفحات التدريب", () => {
    const required = [
      "src/pages/public/careers/CareersPage.tsx",
      "src/pages/public/careers/CareerDetailPage.tsx",
      "src/pages/public/careers/CareerQuizHubPage.tsx",
      "src/pages/public/careers/CareerQuizPage.tsx",
      "src/pages/public/careers/CareerCompetitionPracticePage.tsx",
    ];
    for (const file of required) {
      const source = readFileSync(file, "utf8");
      expect(source, file).toContain("CareerDisclaimer");
    }
    for (const file of required.slice(2)) {
      const source = readFileSync(file, "utf8");
      expect(source, file).toContain('variant="quiz"');
    }
  });
});

describe("خصوصية الزوار والبيانات", () => {
  it("لا خدمة خرائط ولا ترميز جغرافي ولا طلب شبكة في مسار الكليات", () => {
    const nearby = readFileSync("src/components/careers/NearbyLawSchools.tsx", "utf8");
    const schools = readFileSync("src/lib/careers/schools.ts", "utf8");
    for (const source of [nearby, schools]) {
      expect(source.includes("googleapis"), "google").toBe(false);
      expect(source.includes("maps.google"), "maps").toBe(false);
      expect(source.includes("navigator.geolocation"), "gps").toBe(false);
      expect(source.includes("geocod"), "geocoding").toBe(false);
    }
    // الحساب يجري محلياً: Haversine في src/lib/careers/distance.ts
    expect(readFileSync("src/lib/careers/distance.ts", "utf8")).toContain("EARTH_RADIUS_KM");
  });

  it("لا استخدام لحقول خاصة في الترشيح ولا لجدول mizan_profiles للتدريب", () => {
    const service = readFileSync("src/lib/careers/trainingService.ts", "utf8");
    expect(service.includes("last_ip_address")).toBe(false);
    expect(service.includes("banned_at")).toBe(false);
    expect(service).toContain("career_training_profiles");
    expect(service).toContain("career_training_progress");
    // حفظ المدينة يمرّ عبر خدمة البروفايل الرسمية (ولا يستدعي update مباشراً على جدول آخر)
    expect(service).toContain("@/lib/profiles/service");
  });

  it("اختيار المدينة اختياري، والحفظ بفعل صريح من المستخدم", () => {
    const nearby = readFileSync("src/components/careers/NearbyLawSchools.tsx", "utf8");
    expect(nearby).toContain("اختياري");
    expect(nearby).toContain("saveCityToProfile");
    // لا يستدعي الحفظ داخل onChange للاختيار
    const onChangeBlock = nearby.slice(nearby.indexOf("onChange"), nearby.indexOf("onChange") + 400);
    expect(onChangeBlock.includes("saveCityToProfile")).toBe(false);
  });

  it("الزائر لا يكتب في قاعدة البيانات: كل دوال التدريب تُرجع NO_SESSION", async () => {
    const service = await import("../src/lib/careers/trainingService");
    // بلا جلسة Supabase (بيئة الاختبار)، لا يُنشأ عميل ولا يُكتب شيء — النتيجة صريحة
    const followed = await service.fetchFollowedCareers();
    expect(followed.ok).toBe(false);
    expect(followed.slugs).toEqual([]);

    const progress = await service.fetchTrainingProgress();
    expect(progress.ok).toBe(false);
    expect(progress.rows).toEqual([]);

    const write = await service.setCareerFollowing("avocat", true);
    expect(write.ok).toBe(false);

    const city = await service.saveCityToProfile("طنجة");
    expect(city.ok).toBe(false);
  });
});

describe("حساب ملخّص التدريب", () => {
  const career = careers[0];
  const pool = bank.filter((question) => (question as QuizQuestion & { career_ids?: string[] }).career_ids?.includes(career.slug));

  const attempt = (overrides: Partial<QuizAttempt>): QuizAttempt => ({
    id: "a1",
    mode: "general",
    label: `career:${career.slug}`,
    tier: "general",
    total: 10,
    correct: 6,
    score: 60,
    xpEarned: 80,
    creditsEarned: 10,
    bestStreak: 3,
    durationMs: 60_000,
    finishedAt: "2026-09-20T10:00:00.000Z",
    answers: pool.slice(0, 10).map((question, index) => ({
      questionId: question.id,
      chosen: index % 2,
      correct: index % 2 === 0,
      elapsedMs: 5_000,
    })),
    ...overrides,
  });

  it("الإحصاءات تقيس محتوى ميزان فقط وتحمل إشارة تعليمية", () => {
    const stats = buildCareerTrainingStats(career, [attempt({})], bank);
    expect(stats.career.slug).toBe(career.slug);
    expect(stats.sessions).toBe(1);
    expect(stats.bestScore).toBe(60);
    expect(stats.totalQuestions).toBe(pool.length);
    expect(stats.coveragePercent).toBeGreaterThan(0);
    expect(stats.coveragePercent).toBeLessThanOrEqual(100);
    expect(stats.suggestedNextStepAr.length).toBeGreaterThan(10);
    // لا كلمة أهلية ولا ضمان في أي نص مُشتق
    expect(stats.suggestedNextStepAr).not.toContain("مؤهل");
    expect(stats.suggestedNextStepAr).not.toContain("مضمون");
  });

  it("محاولة مسار آخر لا تُحسب على هذا المسار", () => {
    const other = buildCareerTrainingStats(career, [attempt({ label: "career:notaire" })], bank);
    expect(other.sessions).toBe(0);
    expect(other.bestScore).toBe(0);
    expect(other.lastPracticedAt).toBeNull();
  });

  it("الملخّص العام يحسب الجلسات والأسئلة والمسارات المتابَعة", () => {
    const overview = buildTrainingOverview(careers, [attempt({})], bank);
    expect(overview.totals.sessions).toBe(1);
    expect(overview.totals.questions).toBe(10);
    expect(overview.totals.correctAnswers).toBeGreaterThan(0);
    expect(overview.totals.followedCareers).toBe(1);
    expect(overview.stats.map((entry) => entry.career.slug)).toEqual([career.slug]);
  });

  it("خطة المراجعة من أربعة أسابيع، وكل أسبوع له عنوان ومستوى ووجهة تدريب", () => {
    const stats = buildCareerTrainingStats(career, [attempt({})], bank);
    const plan = buildTrainingPlan(career, stats);
    expect(plan).toHaveLength(4);
    plan.forEach((week, index) => {
      expect(week.week).toBe(index + 1);
      expect(week.title_ar.length).toBeGreaterThan(5);
      expect(week.description_ar.length).toBeGreaterThan(10);
      expect(week.level).toMatch(/^(easy|medium|hard)$/);
      expect(week.quizHref).toBe(`/quiz/careers/${career.slug}`);
      expect(week.careerSlug).toBe(career.slug);
    });
  });
});
