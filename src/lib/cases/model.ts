export type LawCode = 'constitution-2011' | 'mudawana-70-03';
export type Difficulty = 'easy' | 'medium' | 'hard';

export const LAW_LABELS: Record<LawCode, string> = {
  'constitution-2011': 'دستور 2011',
  'mudawana-70-03': 'مدونة الأسرة (القانون 70.03)',
};
export const DIFFICULTY_LABELS: Record<Difficulty, string> = { easy: 'سهلة', medium: 'متوسطة', hard: 'صعبة' };
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const IMAGE_PATTERN = /^(\/|https:\/\/)[^\s]+$/;

/** الحالة كما تُعرض للزائر: بلا الجواب ولا الشرح ولا نصوص المواد. */
export interface PublicCase {
  id: string;
  slug: string;
  title: string;
  law_code: LawCode;
  difficulty: Difficulty;
  story: string;
  question: string;
  options: string[];
  hint: string;
  image_url: string;
  image_alt: string;
  reviewed_by: string;
  reviewed_on: string | null;
  updated_at: string;
}

export interface CaseArticle { law: LawCode; article: number; text: string }

/** صفوف الجدول الكامل: تظهر للإدارة فقط. */
export interface LegalCase extends Omit<PublicCase, 'options'> {
  options: string[];
  answer_index: number;
  explanation: string;
  articles: CaseArticle[];
  published: boolean;
}

/** نموذج التحرير في لوحة الإدارة، قبل التحويل إلى صف. */
export interface CaseDraft {
  id?: string;
  slug: string;
  title: string;
  law_code: LawCode;
  difficulty: Difficulty;
  story: string;
  question: string;
  options: string[];
  answer_index: number;
  hint: string;
  explanation: string;
  articles: { law: LawCode; article: string; text: string }[];
  image_url: string;
  image_alt: string;
  reviewed_by: string;
  reviewed_on: string;
  published: boolean;
}

export const emptyDraft = (): CaseDraft => ({
  slug: '', title: '', law_code: 'constitution-2011', difficulty: 'medium', story: '', question: '',
  options: ['', '', '', ''], answer_index: 0, hint: '', explanation: '',
  articles: [{ law: 'constitution-2011', article: '', text: '' }],
  image_url: '', image_alt: '', reviewed_by: '', reviewed_on: '', published: false,
});

export function draftFromCase(row: LegalCase): CaseDraft {
  return {
    id: row.id, slug: row.slug, title: row.title, law_code: row.law_code, difficulty: row.difficulty,
    story: row.story, question: row.question, options: [...row.options], answer_index: row.answer_index,
    hint: row.hint, explanation: row.explanation,
    articles: row.articles.map(a => ({ law: a.law, article: String(a.article), text: a.text })),
    image_url: row.image_url, image_alt: row.image_alt, reviewed_by: row.reviewed_by,
    reviewed_on: row.reviewed_on ?? '', published: row.published,
  };
}

/** اقتراح رابط ثابت من العنوان. العناوين العربية لا تنتج شيئاً، فيكتب المحرّر الرابط يدوياً. */
export function suggestSlug(title: string): string {
  const ascii = title.normalize('NFKD').toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/[\s-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
  return ascii.length >= 3 ? ascii : '';
}

/** يعيد أول خطأ بالعربية، أو null إن كان النموذج صالحاً. يطابق قيود قاعدة البيانات. */
export function validateDraft(d: CaseDraft): string | null {
  const slug = d.slug.trim();
  if (!SLUG_PATTERN.test(slug) || slug.length < 3 || slug.length > 120) return 'الرابط الثابت يجب أن يكون بالحروف اللاتينية الصغيرة والأرقام والشرطة فقط (3 إلى 120 حرفاً).';
  if (d.title.trim().length < 4 || d.title.trim().length > 160) return 'عنوان الحالة يجب أن يكون بين 4 و160 حرفاً.';
  if (!(d.law_code in LAW_LABELS)) return 'اختر القانون المرجعي.';
  if (!(d.difficulty in DIFFICULTY_LABELS)) return 'اختر مستوى الصعوبة.';
  const story = d.story.trim();
  if (story.length < 40 || story.length > 6000) return 'قصة الحالة يجب أن تكون بين 40 و6000 حرف.';
  const question = d.question.trim();
  if (question.length < 8 || question.length > 400) return 'سؤال الحالة يجب أن يكون بين 8 و400 حرف.';
  const options = d.options.map(o => o.trim());
  if (options.some(o => o.length < 2 || o.length > 300)) return 'كل خيار يجب أن يكون بين 2 و300 حرف.';
  if (new Set(options).size !== 4) return 'الخيارات الأربعة يجب أن تكون مختلفة.';
  if (!Number.isInteger(d.answer_index) || d.answer_index < 0 || d.answer_index > 3) return 'حدّد الخيار الصحيح.';
  const hint = d.hint.trim();
  if (hint.length < 4 || hint.length > 400) return 'التلميح يجب أن يكون بين 4 و400 حرف.';
  const explanation = d.explanation.trim();
  if (explanation.length < 10 || explanation.length > 2000) return 'الشرح يجب أن يكون بين 10 و2000 حرف.';
  if (d.articles.length < 1 || d.articles.length > 6) return 'أضف من مادة إلى ست مواد مرجعية.';
  for (const a of d.articles) {
    const n = Number(a.article);
    if (!(a.law in LAW_LABELS)) return 'اختر القانون لكل مادة مرجعية.';
    if (!Number.isInteger(n) || n < 1 || n > 500) return 'رقم المادة يجب أن يكون عدداً صحيحاً بين 1 و500.';
    if (!a.text.trim() || a.text.trim().length > 5000) return `نص المادة ${a.article} مطلوب (حتى 5000 حرف).`;
  }
  if (d.image_url && !IMAGE_PATTERN.test(d.image_url.trim())) return 'رابط الصورة يجب أن يبدأ بـ / أو https://';
  if (d.image_alt.length > 300) return 'النص البديل للصورة أطول من 300 حرف.';
  if (d.published && !d.reviewed_by.trim()) return 'لا تُنشر الحالة قبل تسجيل اسم المراجع.';
  return null;
}

/** يحوّل النموذج المتحقَّق منه إلى حمولة الإدراج. */
export function draftToPayload(d: CaseDraft) {
  return {
    ...(d.id ? { id: d.id } : {}),
    slug: d.slug.trim(),
    title: d.title.trim(),
    law_code: d.law_code,
    difficulty: d.difficulty,
    story: d.story.trim(),
    question: d.question.trim(),
    options: d.options.map(o => o.trim()),
    answer_index: d.answer_index,
    hint: d.hint.trim(),
    explanation: d.explanation.trim(),
    articles: d.articles.map(a => ({ law: a.law, article: Number(a.article), text: a.text.trim() })),
    image_url: d.image_url.trim(),
    image_alt: d.image_alt.trim(),
    reviewed_by: d.reviewed_by.trim(),
    reviewed_on: d.reviewed_on || null,
    published: d.published,
  };
}

export type CheckResult =
  | { status: 'correct'; correctIndex: number; explanation: string; articles: CaseArticle[] }
  | { status: 'wrong'; hint: string }
  | { status: 'unavailable' };

function isArticle(v: unknown): v is CaseArticle {
  if (!v || typeof v !== 'object') return false;
  const a = v as Record<string, unknown>;
  return typeof a.law === 'string' && typeof a.article === 'number' && typeof a.text === 'string';
}

/** يحلل ردّ دالة legal_case_check. أي شكل غير متوقع يصبح «unavailable». */
export function parseCheck(raw: unknown): CheckResult {
  if (!raw || typeof raw !== 'object') return { status: 'unavailable' };
  const r = raw as Record<string, unknown>;
  if (r.status === 'correct' && typeof r.correct_index === 'number' && typeof r.explanation === 'string') {
    return {
      status: 'correct',
      correctIndex: r.correct_index,
      explanation: r.explanation,
      articles: Array.isArray(r.articles) ? r.articles.filter(isArticle) : [],
    };
  }
  if (r.status === 'wrong' && typeof r.hint === 'string') return { status: 'wrong', hint: r.hint };
  return { status: 'unavailable' };
}
