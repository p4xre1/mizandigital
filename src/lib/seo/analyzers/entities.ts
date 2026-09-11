/**
 * src/lib/seo/analyzers/entities.ts
 *
 * استخراج الكيانات القانونية المغربية من النص. الكيانات هي عمود Semantic SEO
 * و Entity Optimization و Knowledge Graph Optimization: محرك البحث (ونماذج
 * اللغة) يفهمان النص عبر الكيانات والعلاقات بينها، لا عبر الكلمات وحدها.
 */

export type EntityKind =
  | "legal-article" // فصل / مادة
  | "law" // قانون رقم ...
  | "court" // محكمة
  | "institution" // مؤسسة رسمية
  | "concept" // مفهوم قانوني
  | "place"

export interface Entity {
  kind: EntityKind
  value: string
  count: number
}

export interface EntityReport {
  entities: Entity[]
  uniqueCount: number
  totalCount: number
  density: number
  byKind: Record<EntityKind, number>
  /** كيانات مسنودة بمصدر رسمي صريح (عدالة/الأمانة العامة/الجريدة الرسمية). */
  sourcedCount: number
  hasOfficialSource: boolean
}

/** مراجع الفصول والمواد: "الفصل 77"، "المادة 12"، "الفصل 1-1-1". */
const LEGAL_ARTICLE_RE =
  /(?:الفصل|الفصول|المادة|المواد)\s+(?:رقم\s+)?(\d+(?:[-–]\d+)?(?:\s*(?:و|أو)\s*\d+)?)/g

/** القوانين: "قانون رقم 65.00"، "القانون الجنائي"، "مدونة الأسرة". */
const LAW_RE =
  /(?:قانون|القانون|مدونة|المدونة|مرسوم|ظهير)\s+(?:رقم\s+)?([\d.\-]+)?\s*([^\s،.]{0,40})?/g

const COURT_RE =
  /(?:محكمة\s+النقض|المحكمة\s+الدستورية|المحكمة\s+الابتدائية|محكمة\s+الاستئناف|المحكمة\s+الإدارية|المحكمة\s+التجارية|مجلس\s+الدولة|المحاكم\s+المغربية)/g

const INSTITUTION_RE =
  /(?:وزارة\s+العدل|الأمانة\s+العامة\s+للحكومة|المجلس\s+الأعلى\s+للسلطة\s+القضائية|رئاسة\s+النيابة\s+العامة|الهيئة\s+الوطنية\s+للمفوضين\s+القضائيين|هيئة\s+المحامين|بوابة\s+عدالة|الجريدة\s+الرسمية|وزارة\s+التعليم\s+العالي)/g

const CONCEPT_RE =
  /(?:المسؤولية\s+التقصيرية|المسؤولية\s+العقدية|العقد|الالتزام|التقادم|الدفع|الطعن\s+بالنقض|القوة\s+القاهرة|الخطأ|الضرر|العلاقة\s+السببية|الشخصية\s+القانونية|الأهلية|حسن\s+النية|النظام\s+العام|الحجية|الإثبات|الشرط\s+الجزائي)/g

/** نطاقات رسمية تُحتسب إسناداً موثوقاً. */
const OFFICIAL_SOURCE_RE =
  /(?:adala\.justice\.gov\.ma|sgg\.gov\.ma|enssup\.gov\.ma|justice\.gov\.ma|maroc\.ma)/i

function countMatches(text: string, re: RegExp, kind: EntityKind, normalize = true): Entity[] {
  const map = new Map<string, number>()
  const source = normalize ? text.replace(/\s+/g, " ") : text
  for (const match of source.matchAll(re)) {
    const value = (match[0] || "").trim().replace(/\s+/g, " ")
    if (!value || value.length < 3) continue
    map.set(value, (map.get(value) || 0) + 1)
  }
  return [...map.entries()].map(([value, count]) => ({ kind, value, count }))
}

/**
 * استخراج كل الكيانات من نص.
 * @param text النص الخام
 * @param wordCount عدد الكلمات — لحساب الكثافة
 */
export function extractEntities(text: string, wordCount: number): EntityReport {
  const body = text || ""

  const groups: Entity[][] = [
    countMatches(body, LEGAL_ARTICLE_RE, "legal-article"),
    countMatches(body, LAW_RE, "law"),
    countMatches(body, COURT_RE, "court"),
    countMatches(body, INSTITUTION_RE, "institution"),
    countMatches(body, CONCEPT_RE, "concept"),
  ]

  const entities = groups.flat().sort((a, b) => b.count - a.count)
  const byKind: Record<EntityKind, number> = {
    "legal-article": 0,
    law: 0,
    court: 0,
    institution: 0,
    concept: 0,
    place: 0,
  }
  let totalCount = 0
  for (const entity of entities) {
    byKind[entity.kind] += entity.count
    totalCount += entity.count
  }

  return {
    entities,
    uniqueCount: entities.length,
    totalCount,
    density: wordCount ? Math.round((totalCount / wordCount) * 1000) / 10 : 0,
    byKind,
    sourcedCount: groups[0].length + groups[3].length,
    hasOfficialSource: OFFICIAL_SOURCE_RE.test(body),
  }
}

/**
 * نتيجة الكيانات (0-100).
 *
 * ما يُكافَأ: تنوّع الكيانات، وجود مراجع فصول/مواد محددة، كيانات مؤسساتية،
 * وإسناد لمصدر رسمي. ما يُعاقَب: نص بلا أي كيان قابل للربط بمخطط معرفي.
 */
export function entityScore(report: EntityReport, wordCount: number): number {
  if (wordCount === 0) return 0

  const unique = Math.min(report.uniqueCount, 15)
  const diversity = Math.round((unique / 15) * 100) // 40 نقطة

  const legalRefs = Math.min(report.byKind["legal-article"], 6)
  const precision = Math.round((legalRefs / 6) * 100) // 30 نقطة

  const institutional = report.byKind.institution + report.byKind.court
  const grounding = Math.min(institutional, 3) > 0 ? 100 : 0 // 15 نقطة

  const sourced = report.hasOfficialSource ? 100 : 0 // 15 نقطة

  return Math.round(diversity * 0.4 + precision * 0.3 + grounding * 0.15 + sourced * 0.15)
}

/**
 * نتيجة الدلالة (Semantic 0-100): كثافة كيانات معقولة + تغطية مفاهيم متعددة +
 * عناوين فرعية تُظهر بنية الموضوع.
 */
export function semanticScore(
  report: EntityReport,
  structure: { h2Count: number; h3Count: number },
  wordCount: number
): number {
  if (wordCount === 0) return 0

  // كثافة مثالية بين 1% و4% — أقل = سطحى، أكثر = حشو كلمات مفتاحية
  const density = report.density
  const densityScore =
    density < 1 ? Math.round((density / 1) * 100) : density <= 4 ? 100 : Math.max(0, 100 - (density - 4) * 20)

  const concepts = Math.min(report.byKind.concept, 8)
  const conceptScore = Math.round((concepts / 8) * 100)

  const headingScore = Math.min(structure.h2Count + structure.h3Count, 8) >= 4 ? 100 : Math.round(((structure.h2Count + structure.h3Count) / 4) * 100)

  return Math.round(densityScore * 0.4 + conceptScore * 0.35 + headingScore * 0.25)
}
