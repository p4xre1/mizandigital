/**
 * src/lib/seo/analyzers/legalAccuracy.ts
 *
 * Legal Accuracy Checker / Citation Checker / Law Reference Checker /
 * Effective-Date Checker / Hallucination Detector / Claim Verification.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * حدود الصدق — اقرأ هذا قبل تفسير النتيجة
 * ─────────────────────────────────────────────────────────────────────────────
 * هذه الوحدة **لا تتحقق من صحة معلومة قانونية**. التحقق من أن «الفصل 77
 * من ق.ل.ع» يقول فعلاً ما يقوله المقال يتطلب المتن الرسمي الكامل للتشريع
 * المغربي، وهو غير متوفر دون مصدر خارجي.
 *
 * ما تقيسه فعلاً هو **انضباط الاستشهاد وقابلية التحقق** (verifiability):
 *   • هل الادعاء مُسنَد إلى مرجع محدد قابل للتتبّع (قانون رقم، ظهير، فصل)؟
 *   • هل ذُكر رقم الجريدة الرسمية وتاريخ النشر؟
 *   • هل تاريخ النفاذ مذكور ومعقول؟
 *   • هل توجد أرقام وادعاءات كمية بلا سند (خطر هلوسة)؟
 *   • هل توجد صيغ مبهمة تُخفي غياب المصدر؟
 *
 * النتيجة إذن اسمها الصحيح «انضباط الاستشهاد القانوني»، وتُعرض في
 * mizanScore تحت بُعد Legal Accuracy مع توضيح صريح لهذا الحد.
 */

import { tokenize } from "./text"

/** قانون/مدونة برقم: «قانون رقم 58.25»، «القانون رقم 65.00». */
const LAW_NUMBER_RE =
  /(?:قانون|القانون|مدونة|المدونة|مرسوم|المرسوم|قرار)\s*(?:رقم\s*)?(\d{1,4}[.\-]\d{1,4}|\d{1,4})/g

/** ظهير شريف برقم وتاريخ. */
const DAHIR_RE = /الظهير\s+الشريف\s*(?:رقم\s*)?([\d.\-]+)?(?:\s*المؤرخ\s*في\s*([^\s،.]+(?:\s[^\s،.]+){0,3})?)?/g

/** فصل أو مادة برقم. */
const ARTICLE_REF_RE = /(?:الفصل|الفصول|المادة|المواد)\s+(?:رقم\s+)?(\d+(?:[-–]\d+)?)/g

/** الجريدة الرسمية: «الجريدة الرسمية عدد 7485 بتاريخ 23 فبراير 2026». */
const OFFICIAL_GAZETTE_RE = /الجريدة\s+الرسمية\s*(?:عدد\s*)?(\d+)?(?:\s*بتاريخ\s*([^\s،.]+(?:\s[^\s،.]+){0,3})?)?/g

/** قرار محكمة دستورية/نقض برقم. */
const COURT_DECISION_RE = /(?:قرار|حكم)\s*(?:عدد\s*)?(\d+[\/.\-]?\d*)/g

/** تاريخ نفاذ/سريان/تطبيق. */
const EFFECTIVE_DATE_RE =
  /(يدخل\s+حيز\s+التنفيذ|حيز\s+التنفيذ|يسري|ساري\s+المفعول|ابتداءً?\s+من|اعتباراً?\s+من|يدخل\s+حيز\s+التطبيق)([^.]{0,80})/g

/** تواريخ صريحة. */
const DATE_RE = /(\d{1,2})\s+(يناير|فبراير|مارس|أبريل|ماي|يونيو|يوليوز|غشت|شتنبر|أكتوبر|نونبر|دجنبر)\s+(20\d{2})/g

/** صيغ مبهمة تُخفي غياب المصدر. */
const VAGUE_ATTRIBUTION_RE =
  /(حسب\s+بعض|يقال\s+إن|يُقال\s+إن|من\s+المعروف\s+أن|كما\s+هو\s+معلوم|بعض\s+المصادر|مصادر\s+مطلعة|يتردد\s+أن|تشير\s+مصادر)/g

/** ادعاءات كمية تحتاج سنداً (بما فيها الصيغ العربية للنسبة). */
const QUANT_CLAIM_RE =
  /\d+\s*(?:%|بالمئة|بالمائة|في\s+المئة|في\s+المائة)|\d+\s*(?:سنة|سنوات|شهراً|أشهر|يوماً|أيام|درهماً?|مليون|مليار)/g

/** مصادر رسمية أولية. */
const PRIMARY_SOURCE_RE = /(adala\.justice\.gov\.ma|sgg\.gov\.ma|justice\.gov\.ma|enssup\.gov\.ma|\.gov\.ma)/i

/**
 * نسخ غير عامة من الإشارات، تُستعمل مع `.test()` فقط.
 *
 * ⚠️ استدعاء `.test()` على إشارة تحمل العلم `g` يُغيّر `lastIndex` عليها،
 * فتُرجع نتائج مختلفة بين استدعاء وآخر على نفس النص (خطأ حالة صامت).
 */
const ARTICLE_REF_TEST = new RegExp(ARTICLE_REF_RE.source)
const LAW_NUMBER_TEST = new RegExp(LAW_NUMBER_RE.source)

export interface LegalReference {
  kind: "law" | "dahir" | "article" | "gazette" | "court-decision" | "effective-date"
  value: string
  /** هل المرجع محدد بما يكفي للتتبّع (يحمل رقماً أو تاريخاً)؟ */
  specific: boolean
}

export interface LegalAccuracyReport {
  references: LegalReference[]
  counts: Record<LegalReference["kind"], number>
  /** مراجع محددة (برقم) مقابل إشارات عامة. */
  specificCount: number
  vagueCount: number
  /** ادعاءات كمية بلا سند قريب. */
  unsourcedClaims: string[]
  hasPrimarySource: boolean
  hasEffectiveDate: boolean
  hasGazetteReference: boolean
  /** 0-100: انضباط الاستشهاد (لا صحة المعلومة). */
  score: number
  issues: string[]
  evidence: string[]
}

/**
 * تحويل المدخل إلى نص. أجسام المقالات في src/data/articles.json مصفوفات
 * فقرات (لا سلسلة مفصولة بفواصل)؛ أي دالة تفترض سلسلة ستنهار أو تُنتج
 * نتائج خاطئة. هذا هو المكان الوحيد الذي يُطبَّع فيه الشكل.
 */
export function toPlainText(value: unknown): string {
  if (typeof value === "string") return value
  if (Array.isArray(value)) return value.map((part) => toPlainText(part)).join("\n")
  return value == null ? "" : String(value)
}

function collect(text: string, re: RegExp, kind: LegalReference["kind"]): LegalReference[] {
  const out: LegalReference[] = []
  for (const match of text.matchAll(re)) {
    const value = (match[0] || "").replace(/\s+/g, " ").trim()
    if (!value) continue
    // المرجع "محدد" إن احتوى رقماً
    out.push({ kind, value, specific: /\d/.test(value) })
  }
  return out
}

/**
 * هل يوجد مصدر رسمي خلال نافذة نصية حول الادعاء؟
 * نبحث في نفس الفقرة لا في النص كله — وجود مصدر في نهاية المقال لا يُسنِد
 * ادعاءً في بدايته.
 */
function hasNearbySource(paragraph: string): boolean {
  return PRIMARY_SOURCE_RE.test(paragraph) || /(الجريدة الرسمية|بوابة عدالة|الأمانة العامة للحكومة)/.test(paragraph)
}

/**
 * تحليل انضباط الاستشهاد القانوني في نص.
 */
export function analyzeLegalAccuracy(
  text: string | string[],
  options: { publishedAt?: string } = {}
): LegalAccuracyReport {
  const body = toPlainText(text)
  const issues: string[] = []
  const evidence: string[] = []

  const refs: LegalReference[] = [
    ...collect(body, LAW_NUMBER_RE, "law"),
    ...collect(body, DAHIR_RE, "dahir"),
    ...collect(body, ARTICLE_REF_RE, "article"),
    ...collect(body, OFFICIAL_GAZETTE_RE, "gazette"),
    ...collect(body, COURT_DECISION_RE, "court-decision"),
    ...collect(body, EFFECTIVE_DATE_RE, "effective-date"),
  ]

  const counts: Record<LegalReference["kind"], number> = {
    law: 0, dahir: 0, article: 0, gazette: 0, "court-decision": 0, "effective-date": 0,
  }
  for (const ref of refs) counts[ref.kind]++

  const specificCount = refs.filter((r) => r.specific).length
  evidence.push(`${refs.length} إحالة (${specificCount} محددة برقم)`)

  const hasPrimarySource = PRIMARY_SOURCE_RE.test(body)
  const hasGazetteReference = counts.gazette > 0
  const effectiveMatches = [...body.matchAll(EFFECTIVE_DATE_RE)]
  const hasEffectiveDate = effectiveMatches.length > 0

  // ── الادعاءات الكمية بلا سند قريب ─────────────────────────────────────────
  const paragraphs = body.split(/,|\n+/).map((p) => p.trim()).filter((p) => p.length > 20)
  const unsourcedClaims: string[] = []
  for (const paragraph of paragraphs) {
    const claims = paragraph.match(QUANT_CLAIM_RE) || []
    if (claims.length === 0) continue
    // الفقرة مسنودة إن احتوت مصدراً رسمياً أو إحالة تشريعية محددة
    const hasLegalRef = ARTICLE_REF_TEST.test(paragraph) || LAW_NUMBER_TEST.test(paragraph)
    if (!hasNearbySource(paragraph) && !hasLegalRef) {
      unsourcedClaims.push(`${claims[0]} — ${paragraph.slice(0, 110)}`)
    }
  }
  if (unsourcedClaims.length) {
    issues.push(`${unsourcedClaims.length} ادعاء كمي بلا سند في فقرته: ${unsourcedClaims[0]}`)
  }

  // ── صيغ مبهمة ─────────────────────────────────────────────────────────────
  const vague = body.match(VAGUE_ATTRIBUTION_RE) || []
  if (vague.length) issues.push(`${vague.length} صيغة إسناد مبهمة (${vague[0]}) — استبدلها بمرجع محدد.`)

  // ── مخاطر التقادم/التعديل ─────────────────────────────────────────────────
  // ذكر «قانون» بلا رقم = إشارة عامة لا يمكن التحقق من نفاذها
  const genericLawMentions = (body.match(/(?:قانون|القانون|مدونة|المدونة)\s+(?!رقم)/g) || []).length
  if (genericLawMentions > 0 && counts.law === 0) {
    issues.push("يذكر قوانين دون أرقامها — لا يمكن التحقق من النسخة النافذة أو التعديلات.")
  }

  // تاريخ النفاذ يجب ألا يسبق تاريخ النشر (تناقض داخلي)
  if (options.publishedAt && hasEffectiveDate) {
    const dates = [...body.matchAll(DATE_RE)]
    const published = new Date(options.publishedAt)
    if (!Number.isNaN(published.getTime())) {
      for (const d of dates) {
        const parsed = parseArabicDate(d[0])
        if (parsed && parsed < published && /حيز\s+التنفيذ|يدخل/.test(body.slice(Math.max(0, (d.index ?? 0) - 60), (d.index ?? 0) + 120))) {
          issues.push(`تناقض محتمل: تاريخ نفاذ (${d[0]}) يسبق تاريخ النشر (${options.publishedAt.slice(0, 10)}).`)
          break
        }
      }
    }
  }

  if (counts.article === 0) issues.push("لا توجد إحالة إلى فصل أو مادة محددة.")
  if (!hasPrimarySource) issues.push("لا يوجد رابط لمصدر رسمي أولي (.gov.ma / بوابة عدالة).")

  // ── احتساب النتيجة (انضباط الاستشهاد) ─────────────────────────────────────
  // 30 نقطة: إحالات تشريعية محددة
  const refScore = Math.min(100, (specificCount / 4) * 100)
  // 25 نقطة: مصدر رسمي أولي
  const sourceScore = hasPrimarySource ? 100 : 0
  // 20 نقطة: الجريدة الرسمية / تاريخ النفاذ (للقوانين الجديدة)
  const traceScore = (hasGazetteReference ? 60 : 0) + (hasEffectiveDate ? 40 : 0)
  // 15 نقطة: غياب الادعاءات غير المسنودة
  const claimScore = unsourcedClaims.length === 0 ? 100 : Math.max(0, 100 - unsourcedClaims.length * 35)
  // 10 نقاط: غياب الإسناد المبهم
  const vagueScore = vague.length === 0 ? 100 : Math.max(0, 100 - vague.length * 40)

  const score = Math.round(
    refScore * 0.3 + sourceScore * 0.25 + traceScore * 0.2 + claimScore * 0.15 + vagueScore * 0.1
  )

  return {
    references: refs,
    counts,
    specificCount,
    vagueCount: vague.length,
    unsourcedClaims,
    hasPrimarySource,
    hasEffectiveDate,
    hasGazetteReference,
    score,
    issues,
    evidence,
  }
}

const ARABIC_MONTHS: Record<string, number> = {
  يناير: 0, فبراير: 1, مارس: 2, أبريل: 3, ماي: 4, يونيو: 5,
  يوليوز: 6, غشت: 7, شتنبر: 8, أكتوبر: 9, نونبر: 10, دجنبر: 11,
}

/** تحويل تاريخ عربي («23 فبراير 2026») إلى Date. */
export function parseArabicDate(value: string): Date | null {
  const match = /(\d{1,2})\s+(يناير|فبراير|مارس|أبريل|ماي|يونيو|يوليوز|غشت|شتنبر|أكتوبر|نونبر|دجنبر)\s+(20\d{2})/.exec(value || "")
  if (!match) return null
  const month = ARABIC_MONTHS[match[2]]
  if (month === undefined) return null
  const date = new Date(Date.UTC(Number(match[3]), month, Number(match[1])))
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Hallucination Detector (بصيغته الصادقة): يرتّب الفقرات حسب خطر احتوائها
 * على معلومة مُختلَقة — أي ادعاء محدد بلا أي سند قابل للتتبّع.
 *
 * لا يحكم بأن المعلومة خاطئة، بل بأنها **غير قابلة للتحقق من النص**.
 */
export interface HallucinationRisk {
  paragraph: string
  risk: "high" | "medium" | "low"
  reasons: string[]
}

export function detectHallucinationRisk(text: string | string[]): HallucinationRisk[] {
  const paragraphs = toPlainText(text)
    .split(/,|\n+/)
    .map((p) => p.trim())
    .filter((p) => tokenize(p).length >= 8)

  return paragraphs
    .map((paragraph) => {
      const reasons: string[] = []
      const hasNumbers = /\d/.test(paragraph)
      const hasLegalRef = ARTICLE_REF_TEST.test(paragraph) || LAW_NUMBER_TEST.test(paragraph)
      const hasSource = hasNearbySource(paragraph)
      const isVague = VAGUE_ATTRIBUTION_RE.test(paragraph)

      if (hasNumbers && !hasLegalRef && !hasSource) reasons.push("أرقام محددة بلا مرجع أو مصدر")
      if (isVague) reasons.push("إسناد مبهم")
      if (/(?:أول|أحدث|آخر|أكبر|أهم)\s/.test(paragraph) && !hasSource) reasons.push("ادعاء تفضيلي بلا مصدر")

      const risk: HallucinationRisk["risk"] =
        reasons.length >= 2 ? "high" : reasons.length === 1 ? "medium" : "low"
      return { paragraph: paragraph.slice(0, 200), risk, reasons }
    })
    .filter((item) => item.risk !== "low")
    .sort((a, b) => (a.risk === "high" ? -1 : 1) - (b.risk === "high" ? -1 : 1))
}

/**
 * Contradiction Detector: يكشف تناقضات داخلية قابلة للكشف آلياً.
 *
 * يقتصر على ما يمكن إثباته من النص نفسه (تواريخ متعارضة، أرقام مختلفة لنفس
 * الشيء) — لا على تناقض النص مع التشريع.
 */
export function detectContradictions(text: string | string[]): string[] {
  const body = toPlainText(text)
  const contradictions: string[] = []

  // نفس الكيان مرتبط برقمَي قانون مختلفين
  const lawNumbers = [...body.matchAll(/(?:قانون|القانون)\s*(?:رقم\s*)?(\d{1,4}[.\-]\d{1,4})/g)].map((m) => m[1])
  const uniqueLaws = [...new Set(lawNumbers)]
  if (uniqueLaws.length > 2) {
    contradictions.push(`يذكر ${uniqueLaws.length} أرقام قوانين مختلفة (${uniqueLaws.join("، ")}) — تأكد من عدم الخلط بينها.`)
  }

  // تواريخ متعارضة للجريدة الرسمية
  const gazettes = [...body.matchAll(/الجريدة\s+الرسمية\s*(?:عدد\s*)?(\d{3,5})/g)].map((m) => m[1])
  const uniqueGazettes = [...new Set(gazettes)]
  if (uniqueGazettes.length > 1) {
    contradictions.push(`يذكر ${uniqueGazettes.length} أعداد مختلفة للجريدة الرسمية (${uniqueGazettes.join("، ")}).`)
  }

  // مدد متعارضة للنفاذ
  const periods = [...body.matchAll(/(?:بعد\s+مرور\s+|بعد\s+)(\w+)\s+(?:أشهر|شهور|أيام|سنوات)/g)].map((m) => m[1])
  const uniquePeriods = [...new Set(periods)]
  if (uniquePeriods.length > 1) {
    contradictions.push(`مدد نفاذ متعارضة: ${uniquePeriods.join("، ")}.`)
  }

  return contradictions
}
