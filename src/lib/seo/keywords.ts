// /workspaces/mizandigital/src/lib/seo/keywords.ts

export type KeywordCategory =
  | "general"
  | "labor_law"
  | "data_protection"
  | "consumer_protection"
  | "academic_exams"
  | "commercial_law"
  | "legal_dictionary"
  | "educational_summaries"

/**
 * الكلمات المفتاحية الأساسية للمنصة (التركيز على التعليم والبحث القانوني)
 */
export const DEFAULT_KEYWORDS: string[] = [
  "منصة الميزان الرقمية",
  "mizan.page",
  "القانون المغربي",
  "المستجدات القانونية المغربية",
  "الجريدة الرسمية المغربية",
  "مدونة الشغل المغربية",
  "امتحانات كلية الحقوق المغرب",
  "المعجم القانوني المغربي",
  "ملخصات القانون المغربي",
  "دروس ومحاضرات القانون",
]

/**
 * الكلمات المفتاحية المقسمة حسب التخصص والفرع الأكاديمي
 */
export const CATEGORY_KEYWORDS: Record<KeywordCategory, string[]> = {
  general: [
    "التشريع المغربي",
    "الدستور المغربي",
    "القوانين التنظيمية بالمغرب",
    "المساطر القانونية بالمغرب",
    "البوابة القانونية المغربية",
    "الأحكام القضائية المغربية",
  ],
  labor_law: [
    "مدونة الشغل 65.99",
    "قانون الشغل المغربي",
    "عقد الشغل بالمغرب",
    "حقوق الأجراء بالمغرب",
    "حوادث الشغل والSession",
    "نزاعات الشغل الفردية والجماعية",
    "حد الأجور الأدنى بالمغرب SMIG",
  ],
  data_protection: [
    "حماية المعطيات ذات الطابع الشخصي",
    "القانون 09.08 المغرب",
    "اللجنة الوطنية لحماية المعطيات CNDP",
    "الخصوصية الرقمية بالمغرب",
    "الأمن السيبراني والقانون المغربي",
  ],
  consumer_protection: [
    "قانون حماية المستهلك 31.09",
    "حقوق المستهلك بالمغرب",
    "ضمانات الاستهلاك بالمغرب",
    "التجارة الإلكترونية والقانون المغربي",
  ],
  academic_exams: [
    "امتحانات كلية الحقوق FSJES",
    "مباريات الملحقين القضائيين",
    "مباراة المنتدبين القضائيين",
    "مباراة المحاماة بالمغرب",
    "نماذج امتحانات S1 S2 S3 S4 S5 S6",
    "منهجية تحليل سؤال قانوني",
  ],
  commercial_law: [
    "القانون التجاري المغربي",
    "مدونة التجارة 15.95",
    "السجل التجاري بالمغرب",
    "الشركات التجارية بالمغرب SARL SA",
    "الأصل التجاري وعقود الكراء",
  ],
  legal_dictionary: [
    "مصطلحات قانونية عربية فرنسية",
    "المعجم القانوني العربي",
    "شرح المصطلحات القانونية المغربية",
    "قاموس القانون المغربي",
  ],
  educational_summaries: [
    "ملخصات دروس القانون المغربي",
    "منهجية الإجابة في امتحانات الحقوق",
    "بحوث ومذكرات تخرج قانونية",
    "دليل الطالب في كلية الحقوق FSJES",
    "محاضرات وبحوث قانونية",
  ],
}

/**
 * دمج وقواعد دمج الكلمات المفتاحية ومنع التكرار
 */
export function combineKeywords(
  ...keywordInputs: (string | string[] | undefined | null)[]
): string[] {
  const keywordSet = new Set<string>()

  keywordInputs.forEach((input) => {
    if (!input) return
    if (Array.isArray(input)) {
      input.forEach((kw) => {
        const trimmed = kw.trim()
        if (trimmed) keywordSet.add(trimmed)
      })
    } else if (typeof input === "string") {
      input.split(",").forEach((kw) => {
        const trimmed = kw.trim()
        if (trimmed) keywordSet.add(trimmed)
      })
    }
  })

  return Array.from(keywordSet)
}

/**
 * تحويل مصفوفة الكلمات المفتاحية إلى النص المستخدم في وسم Meta Keywords
 */
export function formatKeywordsString(keywords: string[]): string {
  return keywords.filter(Boolean).join(", ")
}

/**
 * جلب نص الكلمات المفتاحية الجاهز للسيو بناءً على الكلمات المخصصة والتصنيف
 */
export function getSEOKeywordsString(
  customKeywords: string[] = [],
  category?: KeywordCategory
): string {
  const categoryKws = category ? CATEGORY_KEYWORDS[category] || [] : []
  const combined = combineKeywords(DEFAULT_KEYWORDS, categoryKws, customKeywords)
  return formatKeywordsString(combined)
}

/**
 * جلب الكلمات المفتاحية المقترحة تلقائياً حسب نوع الصفحة الأكاديمية
 */
export function getKeywordsForPage(
  pageType: "home" | "articles" | "exams" | "dictionary" | "summaries" | "privacy"
): string[] {
  switch (pageType) {
    case "articles":
      return combineKeywords(DEFAULT_KEYWORDS, CATEGORY_KEYWORDS.general, CATEGORY_KEYWORDS.labor_law)
    case "exams":
      return combineKeywords(DEFAULT_KEYWORDS, CATEGORY_KEYWORDS.academic_exams)
    case "dictionary":
      return combineKeywords(DEFAULT_KEYWORDS, CATEGORY_KEYWORDS.legal_dictionary)
    case "summaries":
      return combineKeywords(DEFAULT_KEYWORDS, CATEGORY_KEYWORDS.educational_summaries)
    case "privacy":
      return combineKeywords(DEFAULT_KEYWORDS, CATEGORY_KEYWORDS.data_protection)
    case "home":
    default:
      return DEFAULT_KEYWORDS
  }
}