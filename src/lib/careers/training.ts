/**
 * «تدريبي المهني» — حساب ملخّص التدريب من محاولات المنصة.
 *
 * قواعد ثابتة:
 *   • النتائج تعليمية: تقيس الأداء في تمارين ميزان فقط، ولا تُقرأ كأهلية أو
 *     احتمال قبول (انظر CAREERS_TRAINING_NOTE في shared/careers/copy.js).
 *   • مصدر الأرقام هو محاولات المستخدم نفسه (محلية للزائر، وسحابية للمسجّل
 *     عبر quiz_attempts الذي يقرأ صاحبه فقط بموجب RLS منفصلة للجداول الجديدة).
 *   • النسبة المئوية محسوبة على محتوى ميزان المتاح فقط لا على «مستوى» مهني.
 */

import {
  CAREER_ATTEMPT_LABEL_PREFIX,
  COMPETITION_ATTEMPT_LABEL_PREFIX,
  TRAINING_PLAN_WEEKS,
} from "../../../shared/careers/copy.js";
import { getCareerTerms } from "./data";
import type { CareerLexiconTerm, CareerRecord } from "./types";
import type { QuizAttempt, QuizQuestion } from "@/types/quiz";

export interface AttemptRef {
  kind: "career" | "competition";
  slug: string;
}

/** يفكّ وسم المحاولة (`career:avocat` / `competition:greffe-annual`). */
export function parseAttemptLabel(label: string | null | undefined): AttemptRef | null {
  const value = String(label ?? "");
  if (value.startsWith(CAREER_ATTEMPT_LABEL_PREFIX)) {
    const slug = value.slice(CAREER_ATTEMPT_LABEL_PREFIX.length).trim();
    return slug ? { kind: "career", slug } : null;
  }
  if (value.startsWith(COMPETITION_ATTEMPT_LABEL_PREFIX)) {
    const slug = value.slice(COMPETITION_ATTEMPT_LABEL_PREFIX.length).trim();
    return slug ? { kind: "competition", slug } : null;
  }
  return null;
}

/** أسئلة المسار: بالوسم الصريح career_ids، وبالمطابقة الاحتياطية للـ slug. */
export function careerQuestions(career: CareerRecord, questions: QuizQuestion[]): QuizQuestion[] {
  return questions.filter((question) => {
    const ids = (question as QuizQuestion & { career_ids?: string[] }).career_ids;
    if (Array.isArray(ids) && ids.includes(career.slug)) return true;
    return (
      (question as QuizQuestion & { career_slug?: string | null }).career_slug === career.slug
    );
  });
}

export interface CareerTrainingStats {
  career: CareerRecord;
  /** عدد الجلسات التدريبية المسجلة لهذا المسار. */
  sessions: number;
  bestScore: number;
  lastPracticedAt: string | null;
  /** مجموع الأسئلة التي واجهها الطالب في هذا المسار (من كل الجلسات). */
  attemptedQuestions: number;
  correctAnswers: number;
  /** إجمالي أسئلة هذا المسار المتاحة في ميزان. */
  totalQuestions: number;
  /** نسبة تغطية محتوى المسار (0..100) — تغطية تمارين لا كفاءة مهنية. */
  coveragePercent: number;
  /** مصطلحات تحتاج مراجعة، مشتقة من الأسئلة التي أُخطئ فيها. */
  weakTerms: CareerLexiconTerm[];
  suggestedQuizLevel: "easy" | "medium" | "hard";
  suggestedNextStepAr: string;
}

function termsOfQuestion(question: QuizQuestion | undefined): string[] {
  const ids = (question as QuizQuestion & { lexicon_term_ids?: string[] })?.lexicon_term_ids;
  return Array.isArray(ids) ? ids : [];
}

/**
 * يبني ملخّص مسار واحد من محاولات المستخدم.
 * `questions` هي بنك أسئلة ميزان المتاح (المحلي + CMS) كما يرجعه useQuizQuestions.
 */
export function buildCareerTrainingStats(
  career: CareerRecord,
  attempts: QuizAttempt[],
  questions: QuizQuestion[]
): CareerTrainingStats {
  const pool = careerQuestions(career, questions);
  const questionById = new Map(pool.map((question) => [question.id, question]));

  const careerAttempts = attempts.filter((attempt) => {
    const ref = parseAttemptLabel(attempt.label);
    return ref?.kind === "career" && ref.slug === career.slug;
  });

  let bestScore = 0;
  let attemptedQuestions = 0;
  let correctAnswers = 0;
  let lastPracticedAt: string | null = null;
  const wrongTermIds = new Map<string, number>();

  for (const attempt of careerAttempts) {
    bestScore = Math.max(bestScore, attempt.score ?? 0);
    if (attempt.finishedAt && (!lastPracticedAt || attempt.finishedAt > lastPracticedAt)) {
      lastPracticedAt = attempt.finishedAt;
    }
    for (const answer of attempt.answers ?? []) {
      attemptedQuestions += 1;
      if (answer.correct) {
        correctAnswers += 1;
        continue;
      }
      for (const termId of termsOfQuestion(questionById.get(answer.questionId))) {
        wrongTermIds.set(termId, (wrongTermIds.get(termId) ?? 0) + 1);
      }
    }
  }

  const orderedTermIds = [...wrongTermIds.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  const weakTerms = getCareerTerms(career)
    .filter((term) => orderedTermIds.includes(term.id))
    .slice(0, 5);

  const totalQuestions = pool.length;
  const coveragePercent = totalQuestions
    ? Math.min(100, Math.round((attemptedQuestions / totalQuestions) * 100))
    : 0;

  const suggestedQuizLevel: CareerTrainingStats["suggestedQuizLevel"] =
    careerAttempts.length === 0 ? "easy" : bestScore >= 80 ? "hard" : bestScore >= 55 ? "medium" : "easy";

  const suggestedNextStepAr =
    careerAttempts.length === 0
      ? "ابدأ باختبار تعليمي قصير حول المسار لتتعرف على المفاهيم الأساسية."
      : weakTerms.length
        ? `راجع مصطلحات: ${weakTerms.map((term) => term.term_ar).join("، ")} ثم أعد الاختبار.`
        : "أعد الاختبار بمستوى أعلى ثم راجع المصادر الرسمية الخاصة بالمسار.";

  return {
    career,
    sessions: careerAttempts.length,
    bestScore,
    lastPracticedAt,
    attemptedQuestions,
    correctAnswers,
    totalQuestions,
    coveragePercent,
    weakTerms,
    suggestedQuizLevel,
    suggestedNextStepAr,
  };
}

export interface TrainingOverview {
  stats: CareerTrainingStats[];
  totals: {
    sessions: number;
    questions: number;
    correctAnswers: number;
    followedCareers: number;
  };
}

/** ملخّص كل المسارات — للملف الشخصي ولخطة المراجعة. */
export function buildTrainingOverview(
  careers: CareerRecord[],
  attempts: QuizAttempt[],
  questions: QuizQuestion[]
): TrainingOverview {
  const stats = careers
    .map((career) => buildCareerTrainingStats(career, attempts, questions))
    .filter((entry) => entry.sessions > 0)
    .sort((a, b) => (b.lastPracticedAt ?? "").localeCompare(a.lastPracticedAt ?? ""));

  const totals = stats.reduce(
    (acc, entry) => {
      acc.sessions += entry.sessions;
      acc.questions += entry.attemptedQuestions;
      acc.correctAnswers += entry.correctAnswers;
      if (entry.sessions > 0) acc.followedCareers += 1;
      return acc;
    },
    { sessions: 0, questions: 0, correctAnswers: 0, followedCareers: 0 }
  );

  return { stats, totals };
}

export interface TrainingPlanStep {
  week: number;
  title_ar: string;
  description_ar: string;
  /** مصطلحات الأسبوع (من مصطلحات المسار ومن نقاط الضعف). */
  terms: CareerLexiconTerm[];
  /** معرّف المسار المستهدف في هذا الأسبوع. */
  careerSlug: string;
  level: "easy" | "medium" | "hard";
  quizHref: string;
}

/**
 * خطة أربعة أسابيع مبنية على: مصطلحات المسار → المفاهيم → نقاط الضعف →
 * اختبار تعليمي شامل مع مراجعة المصادر الرسمية.
 * المحتوى تعليمي بحت، وتُرفق به إخلاء المسؤولية الإلزامي في الواجهة.
 */
export function buildTrainingPlan(
  career: CareerRecord,
  stats: CareerTrainingStats | null
): TrainingPlanStep[] {
  const terms = getCareerTerms(career);
  const weak = stats?.weakTerms ?? [];
  const levels: TrainingPlanStep["level"][] = ["easy", "medium", "medium", "hard"];
  const termSets: CareerLexiconTerm[][] = [
    terms.slice(0, 4),
    terms.slice(0, 6),
    weak.length ? weak : terms.slice(0, 4),
    terms.slice(0, 3),
  ];

  return TRAINING_PLAN_WEEKS.map((week, index) => ({
    week: week.week,
    title_ar: week.title_ar,
    description_ar: week.description_ar,
    terms: termSets[index] ?? [],
    careerSlug: career.slug,
    level: levels[index] ?? "medium",
    quizHref: `/quiz/careers/${career.slug}`,
  }));
}
