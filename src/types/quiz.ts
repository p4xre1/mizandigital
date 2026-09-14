/**
 * نماذج البيانات الخاصة بمحور الاختبارات (The 4-Tier Quiz System).
 *
 * هذا الملف هو "العقد" المشترك بين:
 *   - بنك الأسئلة المحلي  (src/data/quiz-questions.json)
 *   - جدول Supabase       (quiz_questions — أنشئ في supabase/migrations)
 *   - محرك الاختبارات     (src/lib/quiz/engine.ts)
 *   - لوحة التحكم (CMS)   (src/pages/admin/quizzes/QuizzesPage.tsx)
 *
 * أي حقل جديد يجب أن يُضاف هنا أولاً ثم في ملف الترقية (migration) حتى تبقى
 * الأنواع متزامنة مع قاعدة البيانات.
 */

/** المسارات الأربعة للاختبارات، بالإضافة إلى اختبار تحديد المستوى. */
export type QuizTier = "university" | "general" | "concours" | "interview"

/** اختبار تحديد المستوى ليس "مساراً" للمحتوى بل وضع تشغيل يمزج كل المسارات. */
export type QuizMode = QuizTier | "placement"

/** الفصول الدراسية الستة لطلبة كليات الحقوق بالمغرب. */
export type Semester = "S1" | "S2" | "S3" | "S4" | "S5" | "S6"

export type Difficulty = "easy" | "medium" | "hard"

/** الجهة المنظمة للمباراة (يُستعمل في مسار المباريات المهنية). */
export type ConcoursBody =
  | "police" // الأمن الوطني / الشرطة
  | "auxiliary" // القوات المساعدة
  | "customs" // الجمارك
  | "judiciary" // القضاء
  | "civil_service" // الوظيفة العمومية / الإدارة
  | "general" // مباريات مشتركة

/** تصنيف أسئلة المقابلات والتداريب. */
export type InterviewTrack =
  | "internship" // تدريب في مكتب محاماة أو محكمة
  | "job" // وظيفة قانونية
  | "ethics" // أخلاقيات المهنة
  | "softskills" // مهارات التواصل والعمل

export interface QuizQuestion {
  /** معرّف ثابت وفريد — الأسئلة المحلية تبدأ بـ بادئة المسار (مثل `uni-s1-...`). */
  id: string
  tier: QuizTier
  /** الفصل الدراسي (مسار الكلية فقط). */
  semester?: Semester | null
  /** المادة الجامعية: القانون المدني، الجنائي، الإداري... (مسار الكلية فقط). */
  module?: string | null
  /** الجهة المنظمة (مسار المباريات فقط). */
  body?: ConcoursBody | null
  /** المسار الفرعي (مسار المقابلات فقط). */
  track?: InterviewTrack | null
  difficulty: Difficulty
  question: string
  /** أربعة خيارات بالضبط (يُتحقق منه في الاختبارات الآلية). */
  options: string[]
  /** فهرس الخيار الصحيح داخل مصفوفة `options` (0..3). */
  answer: number
  /** الشرح المبسط والمفاجئ الذي يظهر بعد الإجابة (حتى عند الخطأ). */
  explanation: string
  /** السند القانوني: الفصل، المادة، أو النص المرجعي. */
  reference?: string | null
  /** مصدر السؤال: بنك محلي (seed) أو مُضاف من لوحة التحكم (cms). */
  source?: "seed" | "cms"
  created_at?: string | null
}

/** نتيجة جلسة اختبار واحدة — تُخزّن محلياً وتُرسل إلى Supabase عند توفر الجلسة. */
export interface QuizAttempt {
  id: string
  mode: QuizMode
  /** عنوان الجلسة المعروض للمستخدم (مثال: "القانون المدني — S2"). */
  label: string
  tier: QuizTier | "mixed"
  total: number
  correct: number
  /** النسبة المئوية (0..100). */
  score: number
  xpEarned: number
  creditsEarned: number
  /** أطول سلسلة إجابات صحيحة متتالية داخل الجلسة. */
  bestStreak: number
  durationMs: number
  /** إجمالي الوقت المستغرق للإجابة عن كل الأسئلة (بالميلي ثانية) — لحساب مكافأة السرعة. */
  finishedAt: string
  /** تفاصيل كل سؤال — تُستعمل لعرض المراجعة بعد النتيجة. */
  answers: Array<{
    questionId: string
    chosen: number | null
    correct: boolean
    elapsedMs: number
  }>
}

/** رتبة المستخدم ضمن نظام الألعاب (RPG). */
export type RankId = "D" | "C" | "B" | "A" | "S" | "SS" | "SSS"

/** الأدوار الثلاثة التي يختار منها المستخدم عند إنشاء ملفه. */
export type UserRole = "student" | "lawyer" | "citizen"

/** الملف الشخصي العام القابل للمشاركة عبر mizan.page/u/:username */
export interface MizanProfile {
  username: string
  displayName: string
  role: UserRole
  /** الفصل الدراسي (إن كان طالباً). */
  semester?: Semester | null
  /** سنوات الخبرة (إن كان محامياً). */
  yearsOfExperience?: number | null
  /** الاهتمامات القانونية (إن كان مواطناً). */
  interests?: string[]
  /** المدينة — اختيارية، تظهر في البروفايل العام. */
  city?: string | null
  /** نبذة قصيرة اختيارية. */
  bio?: string | null
  updatedAt: string
}

/** حالة التقدم الكاملة المحفوظة على الجهاز (وتُزامن مع Supabase عند توفّرها). */
export interface QuizProgress {
  xp: number
  credits: number
  /** تاريخ آخر اختبار (YYYY-MM-DD) لحساب سلسلة الأيام المتتالية. */
  lastPlayedDate: string | null
  streakDays: number
  attempts: QuizAttempt[]
  /** الرتبة المحققة عبر اختبار التحديد (إن أُنجز). */
  placementCompleted: boolean
  /** الرتبة التي منحها اختبار التحديد — تُعرض كشارة "مُقيَّم". */
  placementRank: RankId | null
  profile: MizanProfile | null
  /** أوسمة مكتسبة (مفاتيح من كتالوج الأوسمة). */
  badges: string[]
}
