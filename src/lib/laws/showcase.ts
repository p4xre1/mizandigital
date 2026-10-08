/**
 * دوال مساعدة لبطاقات «نصوص قانونية من الأرشيف» في الصفحة الرئيسية.
 *
 * قواعد:
 *   • لا تُعدَّل البيانات المخزَّنة أبداً: إزالة بادئة «القانون رقم X» تحدث
 *     وقت العرض فقط (stripLawPrefix)، والعنوان الأصلي يبقى كما هو في القاعدة.
 *   • النوع (قانون / قانون-إطار) يُستنتج من العنوان لأن جدول laws لا يحمل
 *     عموداً للنوع.
 *   • التواريخ بأسماء الشهور المغربية (يوليوز، غشت، شتنبر، دجنبر)، لا بتنسيق
 *     Intl الذي يعطي «يوليو» و«سبتمبر». نحسبها يدوياً فلا يتغيّر الناتج
 *     باختلاف المتصفح أو بيئة ICU.
 *   • السنة تُؤخذ من تاريخ النشر لا من لاحقة رقم النص: رقم مثل 46.21 لا يعني
 *     دائماً سنة 2021، فالاعتماد على اللاحقة قد يعرض سنة خاطئة.
 */

export type LawType = "قانون" | "قانون-إطار"

/** الشكل الذي تبنى منه البطاقة. الحقول مخزَّنة منفصلة لا كنص واحد. */
export interface ShowcaseLaw {
  type: LawType
  /** رقم النص كما في القاعدة، مثل «46.21»، أو null. */
  number: string | null
  /** سنة النشر (من publication_date) أو null. */
  year: number | null
  /** العنوان بعد إزالة بادئة الرقم إن وُجدت. */
  title: string
  /** رقم عدد الجريدة الرسمية كنص، أو null. */
  gazette: string | null
  /** تاريخ النشر بصيغة ISO (YYYY-MM-DD)، أو null. */
  published: string | null
  /** رقم الظهير. غير مخزَّن في القاعدة حالياً، فيبقى null ولا يُعرض. */
  dahir: string | null
  slug: string
  /** رابط ملف PDF أو null. */
  pdfUrl: string | null
  /** رابط صفحة النص المنشورة، أو null لسجلّ أحدث من آخر بناء. */
  pagePath: string | null
}

/** بادئة «القانون رقم X» أو «قانون-إطار رقم X» في أول العنوان. */
const TITLE_PREFIX_RE = /^\s*(?:ال)?قانون(?:[\s-]+(?:ال)?إطار)?\s*رقم\s*\d[\d.\-/]*\s*[،,:\-–—]?\s*/u

/** العنوان يبدأ بـ«قانون-إطار» أو «القانون الإطار» ونحوه. */
const FRAME_LAW_RE = /^\s*(?:ال)?قانون[\s-]+(?:ال)?إطار/u

/**
 * يزيل بادئة «القانون رقم X» من العنوان ويعيد الباقي.
 * إن كانت البادئة تستهلك العنوان كله (عنوان فارغ بعدها) يُعاد العنوان الأصلي
 * حتى لا تظهر بطاقة بلا عنوان.
 */
export function stripLawPrefix(title: string): string {
  const stripped = title.replace(TITLE_PREFIX_RE, "").trim()
  return stripped.length > 0 ? stripped : title.trim()
}

/** يستنتج نوع النص من العنوان: «قانون-إطار» إن بدأ به، وإلا «قانون». */
export function lawTypeOf(title: string): LawType {
  return FRAME_LAW_RE.test(title) ? "قانون-إطار" : "قانون"
}

/** أسماء الشهور المغربية بالترتيب (الفهرس 0 = يناير). */
export const MOROCCAN_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "ماي",
  "يونيو",
  "يوليوز",
  "غشت",
  "شتنبر",
  "أكتوبر",
  "نونبر",
  "دجنبر",
] as const

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/

/**
 * يحوّل تاريخاً بصيغة ISO إلى «D شهر YYYY» بالشهور المغربية.
 * يقرأ الأجزاء مباشرة من النص فلا يمرّ بـDate (لا انزياح بسبب المنطقة الزمنية).
 * يعيد null لأي قيمة غير صالحة.
 */
export function formatMoroccanDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const match = ISO_DATE_RE.exec(iso)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${day} ${MOROCCAN_MONTHS[month - 1]} ${year}`
}

/** سنة من تاريخ ISO، أو null. */
export function yearOf(iso: string | null | undefined): number | null {
  if (!iso) return null
  const match = ISO_DATE_RE.exec(iso)
  return match ? Number(match[1]) : null
}

/** مدخل الأرشيف كما يصل من اللقطة أو من القاعدة. */
export interface ArchiveLawRow {
  slug: string
  title: string
  law_number: string | null
  official_gazette_number: string | null
  publication_date: string | null
  pdf_url: string | null
  pagePath: string | null
}

/** يحوّل صفّ الأرشيف إلى الشكل المعروض، دون تعديل المصدر. */
export function toShowcaseLaw(row: ArchiveLawRow): ShowcaseLaw {
  const number = row.law_number?.trim() || null
  const gazette = row.official_gazette_number?.trim() || null
  const published = row.publication_date && ISO_DATE_RE.test(row.publication_date) ? row.publication_date : null
  return {
    type: lawTypeOf(row.title),
    number,
    year: yearOf(published),
    title: stripLawPrefix(row.title),
    gazette,
    published,
    dahir: null,
    slug: row.slug,
    pdfUrl: row.pdf_url,
    pagePath: row.pagePath,
  }
}

/** ترتيب الأحدث أولاً حسب تاريخ النشر، ثم العنوان للتساوي. */
export function compareNewestFirst(a: ShowcaseLaw, b: ShowcaseLaw): number {
  const left = a.published ?? ""
  const right = b.published ?? ""
  if (left !== right) return left < right ? 1 : -1
  return a.title.localeCompare(b.title, "ar")
}

/** أحدث n نصوص، مع إزالة التكرار بالمعرّف (slug). */
export function pickLatest(laws: ShowcaseLaw[], n: number): ShowcaseLaw[] {
  const seen = new Set<string>()
  const unique = laws.filter((law) => {
    if (seen.has(law.slug)) return false
    seen.add(law.slug)
    return true
  })
  return [...unique].sort(compareNewestFirst).slice(0, n)
}
