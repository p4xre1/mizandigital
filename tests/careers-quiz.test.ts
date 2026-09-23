/**
 * اختبارات أسئلة المسارات المهنية (tests 12–15 من مواصفة الميزة).
 *
 * تحمي عقد بنك الأسئلة نفسه الذي يفرضه tests/quiz-engine.test.ts (أربعة خيارات،
 * شرح، تصنيف)، وتضيف شرط الميزة الجديد: 8 أسئلة على الأقل لكل مسار قبل أن
 * يظهر زرّ الاختبار، والوسوم التعليمية (career_ids / lexicon_term_ids) صحيحة.
 */
import { describe, expect, it } from "vitest";
import questionsData from "../src/data/quiz-questions.json";
import careersData from "../src/data/careers.json";
import careerLexiconData from "../src/data/career-lexicon.json";
import lexiconData from "../src/data/lexicon.json";
import type { QuizQuestion } from "../src/types/quiz";
import type { CareerRecord } from "../src/lib/careers/types";
import { careerQuestions, parseAttemptLabel } from "../src/lib/careers/training";
import {
  attemptLabelForCareer,
  attemptLabelForCompetition,
  attemptModeForQuizType,
} from "../shared/careers/copy.js";
import { CAREER_QUIZ_MIN_QUESTIONS } from "../scripts/lib/career-pages.mjs";

type CareerQuestion = QuizQuestion & {
  career_ids?: string[];
  lexicon_term_ids?: string[];
  quiz_type?: string;
  competition_id?: string | null;
  source_status?: string;
  source_url?: string | null;
};

const BANK = questionsData as unknown as CareerQuestion[];
const CAREERS = careersData as unknown as CareerRecord[];
const LEXICON_IDS = new Set((lexiconData as Array<{ id: string }>).map((term) => term.id));
const SLIM_IDS = new Set((careerLexiconData as Array<{ id: string }>).map((term) => term.id));

describe("أسئلة المسارات المهنية في بنك الأسئلة", () => {
  it("كل مسار له 8 أسئلة تعليمية على الأقل، وكل سؤال مرتبط بمسار موجود", () => {
    const slugs = new Set(CAREERS.map((career) => career.slug));
    const tagged = BANK.filter((question) => (question.career_ids ?? []).length > 0);

    expect(tagged.length).toBeGreaterThanOrEqual(CAREERS.length * CAREER_QUIZ_MIN_QUESTIONS);

    for (const question of tagged) {
      expect(question.quiz_type, question.id).toBe("career_knowledge");
      expect(question.tier, question.id).toBe("general");
      for (const careerId of question.career_ids ?? []) {
        expect(slugs.has(careerId), `${question.id}:${careerId}`).toBe(true);
      }
    }

    for (const career of CAREERS) {
      const pool = careerQuestions(career, BANK);
      expect(pool.length, career.slug).toBeGreaterThanOrEqual(CAREER_QUIZ_MIN_QUESTIONS);
    }
  });

  it("الشكل الأربعة خيارات/شرح/إجابة صحيحة مطبَّق على الأسئلة المضافة", () => {
    for (const question of BANK) {
      expect(question.options, question.id).toHaveLength(4);
      expect(new Set(question.options).size, question.id).toBe(4);
      expect(question.answer, question.id).toBeGreaterThanOrEqual(0);
      expect(question.answer, question.id).toBeLessThan(4);
      expect(question.question.trim().length, question.id).toBeGreaterThan(10);
      expect(question.explanation.trim().length, question.id).toBeGreaterThan(20);
    }
    const ids = BANK.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("معرّفات مصطلحات الأسئلة موجودة في القاموس، وحالة المصدر معلنة", () => {
    for (const question of BANK.filter((item) => (item.career_ids ?? []).length > 0)) {
      const terms = question.lexicon_term_ids ?? [];
      expect(terms.length, question.id).toBeGreaterThanOrEqual(1);
      for (const termId of terms) {
        expect(LEXICON_IDS.has(termId), `${question.id}:${termId}`).toBe(true);
        expect(SLIM_IDS.has(termId), `${question.id}:${termId}`).toBe(true);
      }
      expect(question.source_status, question.id).toBe("internal_review");
      expect(question.source_url, question.id).toBeNull();
      expect(question.competition_id, question.id).toBeNull();
      expect(question.career_ids).toHaveLength(1);
    }
  });

  it("لا سؤال يُقدَّم كاختبار رسمي أو يعد بنتيجة", () => {
    const forbidden = ["اختبار رسمي", "أنت جاهز للنجاح", "فرص قبولك مرتفعة", "مضمون القبول"];
    for (const question of BANK.filter((item) => (item.career_ids ?? []).length > 0)) {
      const text = [question.question, ...question.options, question.explanation, question.reference ?? ""].join(" ");
      for (const phrase of forbidden) {
        expect(text.includes(phrase), `${question.id}:${phrase}`).toBe(false);
      }
    }
  });
});

describe("وسم المحاولات وحسابه", () => {
  it("وسم المسار والمباراة يُقرأ بلا لبس، وغير المعروف يُرفض", () => {
    expect(parseAttemptLabel("career:avocat")).toEqual({ kind: "career", slug: "avocat" });
    expect(parseAttemptLabel("competition:delegue-judiciaire-annual")).toEqual({
      kind: "competition",
      slug: "delegue-judiciaire-annual",
    });
    expect(parseAttemptLabel("career:")).toBeNull();
    expect(parseAttemptLabel("القانون المدني — S2")).toBeNull();
    expect(parseAttemptLabel(null)).toBeNull();
  });

  it("وضع المحاولة المحفوظ في قاعدة البيانات يبقى داخل الأنماط المسموح بها", () => {
    // نفس القيد في quiz_attempts (mode ∈ university|general|concours|interview|placement):
    // اختبار معرفي عن مسار ⇒ general، وتمارين مباراة ⇒ concours.
    expect(attemptModeForQuizType("career_knowledge")).toBe("general");
    expect(attemptModeForQuizType("career_discovery")).toBe("general");
    expect(attemptModeForQuizType("competition_practice")).toBe("concours");

    const allowed = new Set(["university", "general", "concours", "interview", "placement"]);
    for (const quizType of ["career_knowledge", "career_discovery", "competition_practice"]) {
      expect(allowed.has(attemptModeForQuizType(quizType)), quizType).toBe(true);
    }
  });

  it("وسم المسار والمنافسة مطابق للبادئات المتفق عليها", () => {
    expect(attemptLabelForCareer("avocat")).toBe("career:avocat");
    expect(attemptLabelForCompetition("greffe-annual")).toBe("competition:greffe-annual");
  });
});
