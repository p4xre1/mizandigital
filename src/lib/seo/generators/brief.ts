/**
 * src/lib/seo/generators/brief.ts
 *
 * Content Brief Generator + Content Expansion + GEO/AEO structure.
 *
 * ما يُولَّد هنا **موجز للعمل التحريري**، لا نصاً جاهزاً للنشر. هذا قرار
 * مقصود: المحتوى قانوني، وتوليد نص آلي بلا تحقق بشري خطر على الدقة وعلى
 * E-E-A-T. الموجز يحدد ما يجب أن يغطيه المحرر، والهيكل، والمعايير.
 */

import { classifyIntent } from "../scoring/contentScores"
import { RECOMMENDED_SCHEMA_TYPES } from "../scoring/aiScores"

export interface ContentBrief {
  focusKeyword: string
  intent: ReturnType<typeof classifyIntent>
  suggestedTitle: string
  metaDescription: string
  /** عدد الكلمات المستهدف. */
  targetWords: number
  /** هيكل العناوين المقترح. */
  outline: { level: number; heading: string; note: string }[]
  /** أسئلة يجب أن يجيب عنها المحتوى (People Also Ask). */
  questionsToAnswer: string[]
  /** الكيانات التي يجب تغطيتها. */
  entitiesToCover: string[]
  /** أنواع البيانات المنظمة المقترحة. */
  schemaTypes: string[]
  /** معايير القبول — ما يجعل المحتوى جاهزاً للنشر. */
  acceptanceCriteria: string[]
}

/** قوالب هيكل حسب نية البحث. */
const OUTLINES: Record<string, { heading: string; note: string }[]> = {
  "how-to": [
    { heading: "خلاصة سريعة (إجابة مباشرة)", note: "3 جمل تجيب عن السؤال قبل التفاصيل — تُلتقط كمقتطف." },
    { heading: "لماذا يهمك هذا؟", note: "سياق يربط الموضوع بحالة الطالب العملية." },
    { heading: "الخطوة الأولى", note: "خطوة واحدة قابلة للتطبيق، مع مثال." },
    { heading: "الخطوة الثانية", note: "" },
    { heading: "الخطوة الثالثة", note: "" },
    { heading: "أخطاء شائعة", note: "قائمة نقطية — تُلتقط غالباً كمقتطف." },
    { heading: "أسئلة شائعة", note: "3 أسئلة على الأقل مع FAQPage schema." },
  ],
  definitional: [
    { heading: "تعريف مختصر", note: "جملة تعريفية واحدة 12-30 كلمة — أهم عنصر للمقتطف." },
    { heading: "الأساس التشريعي", note: "الفصل/المادة صراحةً، مع رابط المصدر الرسمي." },
    { heading: "الأركان أو الشروط", note: "قائمة مرقّمة." },
    { heading: "الآثار القانونية", note: "" },
    { heading: "التمييز عن مفاهيم قريبة", note: "جدول مقارنة إن أمكن." },
    { heading: "أمثلة تطبيقية", note: "" },
    { heading: "أسئلة شائعة", note: "" },
  ],
  informational: [
    { heading: "الخلاصة", note: "أهم 3 نقاط في البداية." },
    { heading: "الإطار العام", note: "" },
    { heading: "التفاصيل", note: "قسّمها إلى 3 عناوين فرعية على الأقل." },
    { heading: "الإحالات التشريعية", note: "فصول ومواد محددة مع المصدر." },
    { heading: "تطبيقات عملية", note: "" },
    { heading: "أسئلة شائعة", note: "" },
  ],
  navigational: [
    { heading: "ما هذا القسم؟", note: "جملة تعريفية." },
    { heading: "ماذا تجد هنا؟", note: "قائمة بالموارد." },
    { heading: "كيف تستخدمه؟", note: "" },
  ],
}

/**
 * توليد موجز محتوى من كلمة مفتاحية.
 *
 * @param focusKeyword الكلمة المفتاحية المستهدفة
 * @param options.title عنوان مبدئي اختياري
 * @param options.category تصنيف المحتوى
 * @param options.competitorWords متوسط طول المحتوى المنافس (إن عُرف)
 */
export function generateContentBrief(
  focusKeyword: string,
  options: { title?: string; category?: string; competitorWords?: number } = {}
): ContentBrief {
  const keyword = (focusKeyword || "").trim()
  const title = options.title?.trim() || keyword
  const intent = classifyIntent(title)
  const base = OUTLINES[intent] || OUTLINES.informational

  const targetWords = options.competitorWords
    ? Math.max(600, Math.round(options.competitorWords * 1.2))
    : intent === "how-to"
      ? 900
      : intent === "definitional"
        ? 700
        : 800

  const outline = base.map((item, index) => ({
    level: index === 0 ? 2 : 2,
    heading: item.heading,
    note: item.note,
  }))

  const questionsToAnswer = buildQuestions(keyword, intent)

  return {
    focusKeyword: keyword,
    intent,
    suggestedTitle: options.title?.trim() || `${keyword} — دليل عملي`,
    metaDescription: `${keyword}: شرح مبسّط مع الإحالات التشريعية اللازمة وأمثلة تطبيقية لطلبة القانون بالمغرب.`,
    targetWords,
    outline,
    questionsToAnswer,
    entitiesToCover: [
      `الإحالة التشريعية المتعلقة ب«${keyword}» (فصل/مادة محددة)`,
      "المفاهيم المرتبطة بالموضوع",
      "الجهة الرسمية المختصة",
      "الآثار القانونية المترتبة",
    ],
    schemaTypes: intent === "definitional"
      ? ["Article", "DefinedTerm", "BreadcrumbList", "FAQPage"]
      : ["Article", "BreadcrumbList", "FAQPage", "HowTo"],
    acceptanceCriteria: [
      `${targetWords} كلمة على الأقل`,
      "إجابة مباشرة في أول 60 كلمة (12-45 كلمة، جملة خبرية)",
      "3 عناوين H2 على الأقل",
      "قائمة نقطية أو مرقّمة واحدة على الأقل",
      "إحالة تشريعية محددة (فصل/مادة) مع رابط مصدر رسمي",
      "3 أسئلة شائعة مع FAQPage schema",
      "رابطان داخليان لمحتوى ذي صلة",
      "إخلاء مسؤولية بأن المحتوى تعليمي لا استشارة قانونية",
      "اسم مؤلف وتاريخ تحديث",
    ],
  }
}

function buildQuestions(keyword: string, intent: string): string[] {
  const common = [
    `ما المقصود ب${keyword}؟`,
    `ما الأساس القانوني ل${keyword}؟`,
    `ما الآثار المترتبة على ${keyword}؟`,
  ]
  if (intent === "how-to") {
    return [`كيف أطبّق ${keyword} عملياً؟`, ...common, `ما الأخطاء الشائعة في ${keyword}؟`]
  }
  return [...common, `ما الفرق بين ${keyword} والمفاهيم المشابهة؟`, `هل توجد استثناءات على ${keyword}؟`]
}

/**
 * Content Expansion: يقترح محاور ناقصة في نص موجود، مبنية على قياسه الفعلي.
 */
export function suggestExpansions(input: {
  body: string
  wordCount: number
  h2Count: number
  hasLists: boolean
  hasFaq: boolean
  legalRefs: number
  targetWords: number
}): string[] {
  const suggestions: string[] = []

  if (input.wordCount < input.targetWords) {
    suggestions.push(`المحتوى ${input.wordCount} كلمة والمستهدف ${input.targetWords} — أضف ${input.targetWords - input.wordCount} كلمة على الأقل.`)
  }
  if (input.h2Count < 3) suggestions.push("أضف عناوين H2 إضافية لتقسيم الموضوع (3 على الأقل).")
  if (!input.hasLists) suggestions.push("أضف قائمة نقطية أو مرقّمة — أكثر صيغة تُلتقط كمقتطف.")
  if (!input.hasFaq) suggestions.push("أضف قسم أسئلة شائعة (3 أسئلة) مع FAQPage schema.")
  if (input.legalRefs === 0) suggestions.push("أضف إحالة تشريعية محددة (فصل/مادة) مع رابط المصدر الرسمي.")
  if (suggestions.length === 0) suggestions.push("البنية مكتملة — راجع حداثة الإحالات التشريعية بدل التوسيع.")

  return suggestions
}

export { RECOMMENDED_SCHEMA_TYPES }
