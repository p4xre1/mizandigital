// shared/careers/copy.d.ts
// أنواع TypeScript فوق نصوص دليل المسارات المهنية (shared/careers/copy.js)،
// فلا تعيد الواجهة كتابة نصوص موجودة أصلاً في المصدر الواحد.

export declare const CAREERS_HUB_PATH: string;
export declare const CAREERS_QUIZ_PATH: string;

export declare const CAREERS_DISCLAIMER: string;
export declare const CAREERS_QUIZ_DISCLAIMER: string;
export declare const CAREERS_PLAN_DISCLAIMER: string;
export declare const CAREERS_TRAINING_NOTE: string;
export declare const CAREERS_GUEST_SAVE_HINT: string;
export declare const CAREERS_VERIFY_BADGE: string;
export declare const CAREERS_ANNUAL_NOTICE_BADGE: string;
export declare const CAREERS_NO_SOURCE_NOTE: string;
export declare const CAREERS_NO_VERIFIED_COMPETITION: string;
export declare const CAREERS_LAW_NOT_ARCHIVED: string;
export declare const LAW_VERIFICATION_LABELS: Record<string, string>;

export declare const WORK_MODEL_LABELS: Record<string, string>;
export declare const EDUCATION_LEVEL_LABELS: Record<string, string>;
export declare const DEGREE_LEVEL_LABELS: Record<string, string>;
export declare const LEGAL_EDUCATION_MESSAGES: Record<string, string>;
export declare const LEGAL_EDUCATION_LABELS: Record<string, string>;
export declare const COMPETITION_PATH_LABELS: Record<string, string>;
export declare const COMPETITION_STATUS_LABELS: Record<string, string>;
export declare const REQUIREMENT_TYPE_LABELS: Record<string, string>;
export declare const REVIEW_STATUS_LABELS: Record<string, string>;
export declare const ROADMAP_STAGE_ICONS: string[];
export declare const CAREERS_REQUIRED_LINKS: string[];
export declare const CAREER_ATTEMPT_LABEL_PREFIX: string;
export declare const COMPETITION_ATTEMPT_LABEL_PREFIX: string;

export declare const FILTER_LABELS: {
  education: string[];
  age: string[];
  work: string[];
  interest: string[];
};

export declare const FILTER_ADVISORY: string[];

export declare const SECTION_TITLES: Record<string, string>;

export declare const CAREERS_HUB_COPY: {
  title: string;
  description: string;
  h1: string;
  directAnswer: string;
  hubLead: string;
  statsLabels: Record<string, string>;
  comparisonTitle: string;
  comparison: Array<{ heading: string; body: string }>;
  degreeVsCompetitionTitle: string;
  degreeVsCompetition: string[];
  decisionTreeTitle: string;
  decisionTree: Array<{ question: string; answer: string }>;
  faqTitle: string;
  faq: Array<{ question: string; answer: string }>;
  internalLinksTitle: string;
  internalLinks: Array<{ path: string; label: string; description: string }>;
  careerCardsTitle: string;
  filtersTitle: string;
  filtersHint: string;
  emptyFilterResult: string;
  nearbySectionTitle: string;
};

export declare const CAREERS_QUIZ_HUB_COPY: {
  title: string;
  description: string;
  h1: string;
  directAnswer: string;
  discoveryTitle: string;
  discoveryLead: string;
  discoveryNote: string;
  careersListTitle: string;
};

export declare const TRAINING_PLAN_WEEKS: Array<{
  week: number;
  title_ar: string;
  description_ar: string;
}>;

export declare function buildCareerH1(role: string): string;
export declare function buildCareerQuizH1(role: string): string;
export declare function buildCareerPageTitle(role: string): string;
export declare function buildCareerAnswerFirst(career: {
  title_ar: string;
  short_description: string;
  work_model_ar: string;
}): string;
export declare function buildCareerPageDescription(career: {
  title_ar: string;
  short_description: string;
}): string;
export declare function buildCareerQuizTitle(role: string): string;
export declare function buildCareerQuizDescription(role: string): string;
export declare function buildCompetitionPageTitle(careerTitle: string): string;
export declare function buildCompetitionPageDescription(careerTitle: string): string;
export declare function attemptModeForQuizType(quizType: string): string;
export declare function attemptLabelForCareer(slug: string): string;
export declare function attemptLabelForCompetition(competitionId: string): string;
