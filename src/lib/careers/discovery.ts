/**
 * اختبار الاستكشاف (Career discovery) — تقييم محلي في المتصفح فقط.
 *
 * لماذا لا يُخزَّن في جدول quiz_questions؟ لأن الجدول مبني على «سؤال له جواب
 * صحيح» (answer 0..3 + explanation + tier)، واختبار الاستكشاف ليس كذلك: كل
 * خيار يحمل أوزاناً لعائلات مهنية، والنتيجة ترتيب اقتراحي لا صواب/خطأ.
 * إدخاله في الجدول كان سيفسد دلالة الحقل answer ويخلط محتوى توجيهياً ببنك
 * أسئلة الامتحانات. لذلك يعمل كمنطق عميل نقي، ونتيجته لا تُصنَّف تقييماً.
 *
 * اللغة المستعملة مقيَّدة عمداً: «قد تناسب اهتمامك»، «تحتاج إلى تحقق من
 * الشروط» — لا «أنت مؤهل» ولا «مناسب لك قانونياً».
 */

import { CAREERS } from "./data";
import type { CareerRecord, WorkModel } from "./types";

export type CareerFamilyId = "liberal" | "public" | "technical" | "private" | "academic";

export interface CareerFamily {
  id: CareerFamilyId;
  label_ar: string;
  lead_ar: string;
  /** نماذج المسارات التي تعرض لصاحب أعلى نتيجة. */
  careers: string[];
  workModels: WorkModel[];
}

export const CAREER_FAMILIES: CareerFamily[] = [
  {
    id: "liberal",
    label_ar: "مهنة حرة منظمة",
    lead_ar:
      "قد يناسب اهتمامك العمل المستقل داخل إطار تنظيمي (مكتب مهني أو شراكة) مع مسؤولية مباشرة تجاه الزبناء.",
    careers: ["avocat", "notaire", "adoul", "commissaire-judiciaire"],
    workModels: ["liberal_regulated"],
  },
  {
    id: "public",
    label_ar: "وظيفة عمومية وقضاء",
    lead_ar:
      "قد يناسب اهتمامك العمل داخل مؤسسة قضائية أو إدارية بعلاقة نظامية، والولوج يمر عادة عبر إعلانات ومباريات رسمية.",
    careers: ["magistrat", "greffe", "delegue-judiciaire", "redacteur-judiciaire", "juriste-administration-publique"],
    workModels: ["public_sector"],
  },
  {
    id: "technical",
    label_ar: "مهنة تقنية أو متخصصة",
    lead_ar:
      "قد يناسب اهتمامك الجمع بين تخصص تقني أو لغوي والشروط التنظيمية المرتبطة بالعدالة.",
    careers: ["expert-judiciaire", "traducteur-assermente"],
    workModels: ["mixed"],
  },
  {
    id: "private",
    label_ar: "قطاع خاص وشركات",
    lead_ar:
      "قد يناسب اهتمامك العمل على العقود والحكامة والامتثال داخل الشركات والمكاتب، والشروط يحددها المشغل في إعلانه.",
    careers: ["juriste-entreprise", "responsable-conformite"],
    workModels: ["private_sector"],
  },
  {
    id: "academic",
    label_ar: "تعليم وبحث",
    lead_ar:
      "قد يناسب اهتمامك البحث والتدريس، وهذا مسار طويل يمر عبر الماستر ثم الدكتوراه ثم مساطر التأهيل العلمي.",
    careers: ["enseignant-chercheur-droit"],
    workModels: ["academic"],
  },
];

export interface DiscoveryOption {
  id: string;
  label_ar: string;
  weights: Partial<Record<CareerFamilyId, number>>;
}

export interface DiscoveryQuestion {
  id: string;
  question_ar: string;
  options: DiscoveryOption[];
}

const ALL: CareerFamilyId[] = ["liberal", "public", "technical", "private", "academic"];
const spread = (value: number): Partial<Record<CareerFamilyId, number>> =>
  Object.fromEntries(ALL.map((id) => [id, value])) as Partial<Record<CareerFamilyId, number>>;

/** ستة أسئلة قصيرة — نتيجة تقريبية للقراءة فقط. */
export const DISCOVERY_QUESTIONS: DiscoveryQuestion[] = [
  {
    id: "disc-1",
    question_ar: "ما الذي يجذبك أكثر في العمل القانوني اليومي؟",
    options: [
      { id: "disc-1-a", label_ar: "الدفاع عن مواقف ومناقشة الخصوم", weights: { liberal: 3, public: 1 } },
      { id: "disc-1-b", label_ar: "تحرير عقود وتدقيق وثائق بدقة", weights: { liberal: 2, private: 2 } },
      { id: "disc-1-c", label_ar: "تحليل فني أو لغوي يخدم قراراً قضائياً", weights: { technical: 3 } },
      { id: "disc-1-d", label_ar: "بحث ودراسة نصوص قانونية بعمق", weights: { academic: 3, public: 1 } },
    ],
  },
  {
    id: "disc-2",
    question_ar: "كيف تتصور شكل يوم عملك؟",
    options: [
      { id: "disc-2-a", label_ar: "مكتب مستقل أو شراكة مهنية", weights: { liberal: 3 } },
      { id: "disc-2-b", label_ar: "مؤسسة عمومية بمواعيد ومساطر واضحة", weights: { public: 3 } },
      { id: "disc-2-c", label_ar: "شركة خاصة بوتيرة مشاريع متغيرة", weights: { private: 3 } },
      { id: "disc-2-d", label_ar: "جامعة ومختبر بحث أو قسم أكاديمي", weights: { academic: 3 } },
    ],
  },
  {
    id: "disc-3",
    question_ar: "ما نوع المسؤولية الذي ترتاح له أكثر؟",
    options: [
      { id: "disc-3-a", label_ar: "مسؤولية مباشرة أمام زبناء ومكتب خاص", weights: { liberal: 3, private: 1 } },
      { id: "disc-3-b", label_ar: "مسؤولية مهنية منظمة بقواعد وقسم يمين", weights: { liberal: 1, public: 2 } },
      { id: "disc-3-c", label_ar: "تقرير فني أو ترجمة تعتمد في ملف قضائي", weights: { technical: 3 } },
      { id: "disc-3-d", label_ar: "مسؤولية إدارية داخل هيكل مؤسسي", weights: { public: 3 } },
    ],
  },
  {
    id: "disc-4",
    question_ar: "أي موضوع ترغب في التعمق فيه؟",
    options: [
      { id: "disc-4-a", label_ar: "الأسرة والإراثة والتصرفات العدلية", weights: { liberal: 3 } },
      { id: "disc-4-b", label_ar: "المساطر القضائية والتنفيذ", weights: { public: 2, technical: 1 } },
      { id: "disc-4-c", label_ar: "الشركات والبنوك والامتثال", weights: { private: 3 } },
      { id: "disc-4-d", label_ar: "نظرية القانون والحقوق والحريات", weights: { academic: 3 } },
    ],
  },
  {
    id: "disc-5",
    question_ar: "ما مدى استعدادك لمسار انتقائي طويل؟",
    options: [
      { id: "disc-5-a", label_ar: "أستطيع المثابرة سنوات مع إنتاج علمي منتظم", weights: { academic: 3 } },
      { id: "disc-5-b", label_ar: "أفضل مسطرة واضحة بشروط منشورة ومباراة", weights: { public: 3 } },
      { id: "disc-5-c", label_ar: "أفضّل بناء تجربة عملية داخل سوق الشغل", weights: { private: 3, technical: 1 } },
      {
        id: "disc-5-d",
        label_ar: "أفضّل التدرج داخل المهنة مع تكوين وتدريب مهني",
        weights: { liberal: 3 },
      },
    ],
  },
  {
    id: "disc-6",
    question_ar: "كيف تفكر في المدى القريب؟",
    options: [
      { id: "disc-6-a", label_ar: "أتبع إعلانات المباريات الرسمية بانتظام", weights: { public: 3 } },
      { id: "disc-6-b", label_ar: "أبحث عن تداريب في مكاتب وشركات", weights: { private: 2, liberal: 2 } },
      { id: "disc-6-c", label_ar: "أحرص على التواصل الأكاديمي والنشر", weights: { academic: 2 } },
      { id: "disc-6-d", label_ar: "أبني تخصصاً تقنياً موازياً للقانون", weights: { technical: 3 } },
    ],
  },
];

export interface DiscoveryResultEntry {
  family: CareerFamily;
  score: number;
  /** نسبة من مجموع النقاط — عرض فقط، وليست حكماً على الأهلية. */
  percent: number;
  careers: CareerRecord[];
}

export interface DiscoveryResult {
  entries: DiscoveryResultEntry[];
  answered: number;
  total: number;
  /** جملة النتيجة بالنبرة المسموح بها فقط. */
  verdict_ar: string;
}

/**
 * حساسية النتيجة: نحسب مجموع الأوزان لكل عائلة ثم نرتّبها تنازلياً.
 * العائلات التي لم تُجمع لها أي نقطة تُعرض أخيراً بنصّ محايد.
 */
export function scoreDiscovery(answers: Array<string | null | undefined>): DiscoveryResult {
  const totals = new Map<CareerFamilyId, number>(ALL.map((id) => [id, 0]));
  let answered = 0;

  for (const answerId of answers) {
    if (!answerId) continue;
    for (const question of DISCOVERY_QUESTIONS) {
      const option = question.options.find((item) => item.id === answerId);
      if (!option) continue;
      answered += 1;
      for (const [family, weight] of Object.entries(option.weights)) {
        const key = family as CareerFamilyId;
        totals.set(key, (totals.get(key) ?? 0) + (weight ?? 0));
      }
    }
  }

  const sum = [...totals.values()].reduce((acc, value) => acc + value, 0);

  const entries: DiscoveryResultEntry[] = CAREER_FAMILIES.map((family) => {
    const score = totals.get(family.id) ?? 0;
    return {
      family,
      score,
      percent: sum > 0 ? Math.round((score / sum) * 100) : 0,
      careers: family.careers
        .map((slug) => CAREERS.find((career) => career.slug === slug))
        .filter((career): career is CareerRecord => Boolean(career)),
    };
  }).sort((a, b) => b.score - a.score);

  const top = entries[0];
  const verdict_ar =
    answered === 0
      ? "لم تجب عن أي سؤال بعد؛ النتيجة ستظهر بعد اختيار أجوبة الاستكشاف."
      : `أعلى تقارب مع ${top.family.label_ar}: قد يناسب اهتمامك هذا الاتجاه، لكن يبقى التحقق من شروط كل مسار في مصدره الرسمي ضرورياً.`;

  return { entries, answered, total: DISCOVERY_QUESTIONS.length, verdict_ar };
}

/** كل الأسئلة — احتياطاً لاستعمالات مستقبلية (تصدير صريح حفاظاً على العقد). */
export { spread as DISCOVERY_WEIGHT_SPREAD };
