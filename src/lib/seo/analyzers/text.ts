/**
 * src/lib/seo/analyzers/text.ts
 *
 * تحليل نصي واعٍ بالعربية. صيغ القراءة الكلاسيكية (Flesch-Kincaid وغيرها)
 * مبنية على عدد المقاطع الصوتية في الإنجليزية ولا معنى لها هنا، لذلك تُحسب
 * المقاييس من خصائص عربية فعلية: طول الجملة، طول الكلمة، ونسبة الكلمات
 * الطويلة. هذه قياسات وصفية موثّقة — لا ندّعي أنها صيغة مُصادَق عليها
 * أكاديمياً.
 */

/** الحركات والتطويل — تُزال قبل العدّ لأنها لا تغيّر عدد الكلمات. */
const ARABIC_DIACRITICS_RE = /[\u064B-\u0652\u0670\u0640\u06D6-\u06ED]/g

/** علامات الترقيم العربية والإنجليزية. */
const PUNCTUATION_RE = /[.,،؛:!؟?"'()\[\]{}«»\-–—/\\|*_`~^%$#@&+=<>]/g

/**
 * توحيد أشكال الحروف العربية حتى لا تُحتسب "قانون" و"القانون" و"قوانين"
 * كيانات مختلفة بسبب الهمزات والتاء المربوطة.
 */
export function normalizeArabic(text: string): string {
  if (!text) return ""
  return text
    .replace(ARABIC_DIACRITICS_RE, "")
    .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627") // أ إ آ ٱ → ا
    .replace(/\u0649/g, "\u064A") // ى → ي
    .replace(/\u0629/g, "\u0647") // ة → ه
    .replace(/\u0624/g, "\u0648") // ؤ → و
    .replace(/\u0626/g, "\u064A") // ئ → ي
}

export function stripDiacritics(text: string): string {
  return text ? text.replace(ARABIC_DIACRITICS_RE, "") : ""
}

/**
 * تقسيم نص إلى جمل. يدعم علامة الاستفهام العربية (؟) والفواصل المنقوطة.
 */
export function splitSentences(text: string): string[] {
  if (!text) return []
  return text
    .split(/(?<=[.!؟?؛])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/** تقسيم إلى كلمات (بعد إزالة الترقيم والحركات). */
export function tokenize(text: string): string[] {
  if (!text) return []
  return stripDiacritics(text)
    .replace(PUNCTUATION_RE, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0)
}

export interface TextMetrics {
  characters: number
  words: number
  sentences: number
  wordsPerSentence: number
  charsPerWord: number
  /** كلمات بطول ≥ 8 أحرف — مؤشر تقريب على التعقيد في العربية. */
  longWords: number
  longWordRatio: number
  paragraphs: number
  /** نسبة الأحرف العربية من إجمالي الأحرف (كشف المحتوى المختلط). */
  arabicCharRatio: number
}

/** حساب المقاييس الأساسية لنص. */
export function analyzeText(text: string, paragraphSeparator = "\n"): TextMetrics {
  const raw = text || ""
  const words = tokenize(raw)
  const sentences = splitSentences(raw)
  const paragraphs = raw
    .split(paragraphSeparator === "\n" ? /\n+/ : new RegExp(paragraphSeparator))
    .map((p) => p.trim())
    .filter(Boolean)

  const longWords = words.filter((w) => w.length >= 8).length
  const arabicChars = (raw.match(/[\u0600-\u06FF]/g) || []).length
  const letterChars = (raw.match(/\p{L}/gu) || []).length

  const totalWordChars = words.reduce((sum, w) => sum + w.length, 0)

  return {
    characters: raw.length,
    words: words.length,
    sentences: sentences.length,
    wordsPerSentence: sentences.length ? round(words.length / sentences.length) : words.length,
    charsPerWord: words.length ? round(totalWordChars / words.length) : 0,
    longWords,
    longWordRatio: words.length ? round(longWords / words.length) : 0,
    paragraphs: paragraphs.length,
    arabicCharRatio: letterChars ? round(arabicChars / letterChars) : 0,
  }
}

/**
 * نتيجة القراءة (0-100، الأعلى = أسهل قراءة).
 *
 * مبنية على ثلاث عتبات عربية عملية:
 *   • طول الجملة: ≤ 18 كلمة مثالي، ≥ 35 صعب
 *   • طول الكلمة: ≤ 5.2 أحرف مثالي، ≥ 7 صعب
 *   • نسبة الكلمات الطويلة: ≤ 12% مثالي، ≥ 35% صعب
 * الأوزان: 45% للجملة، 30% للكلمة، 25% للكلمات الطويلة.
 */
export function readabilityScore(metrics: TextMetrics): number {
  if (metrics.words === 0) return 0

  const sentenceScore = invertScale(metrics.wordsPerSentence, 12, 35)
  const wordScore = invertScale(metrics.charsPerWord, 4.2, 7.2)
  const longWordScore = invertScale(metrics.longWordRatio * 100, 8, 35)

  return Math.round(sentenceScore * 0.45 + wordScore * 0.3 + longWordScore * 0.25)
}

/**
 * يحوّل قيمة إلى نتيجة 0-100 بحيث:
 *   value ≤ best → 100، value ≥ worst → 0، وخطّي بينهما.
 */
export function invertScale(value: number, best: number, worst: number): number {
  if (worst === best) return value <= best ? 100 : 0
  const ratio = (value - best) / (worst - best)
  return clamp(Math.round((1 - ratio) * 100))
}

/** قيمة ≤ best → 100، ≥ worst → 0 (للمقاييس التي "الأكثر أفضل"). */
export function directScale(value: number, worst: number, best: number): number {
  if (best === worst) return value >= best ? 100 : 0
  const ratio = (value - worst) / (best - worst)
  return clamp(Math.round(ratio * 100))
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/**
 * كثافة الكلمة المفتاحية (%) بعد التوحيد العربي، مع احتساب التطابقات الجزئية
 * لأن العربية تصريفية ("قانون" توجد داخل "القانون" و"قوانين").
 */
export function keywordDensity(text: string, keyword: string): number {
  const words = tokenize(text)
  if (!words.length || !keyword.trim()) return 0
  const needle = normalizeArabic(keyword.trim())
  const hits = words.filter((w) => normalizeArabic(w).includes(needle)).length
  return round((hits / words.length) * 100)
}

export interface MarkdownBlock {
  kind: "heading" | "paragraph"
  level: number
  text: string
}

/**
 * تحليل جسم المقال. البيانات في هذا المستودع تفصل الفقرات بفواصل (`,`) وتضع
 * العناوين بصيغة `## العنوان` داخل نفس السلسلة، فتُعالج الحالتان معاً.
 */
export function parseBodyBlocks(body: string): MarkdownBlock[] {
  if (!body) return []
  const chunks = body
    .split(/,|\n+/)
    .map((c) => c.trim())
    .filter(Boolean)

  return chunks.map((chunk) => {
    const heading = /^(#{1,6})\s+(.*)$/.exec(chunk)
    if (heading) {
      return { kind: "heading" as const, level: heading[1].length, text: heading[2].trim() }
    }
    return { kind: "paragraph" as const, level: 0, text: chunk }
  })
}

export interface BodyStructure {
  headings: { level: number; text: string }[]
  h2Count: number
  h3Count: number
  paragraphCount: number
  /** فقرات قصيرة جداً (< 40 حرفاً) — مؤشر على تقسيم جيد أو على هشاشة. */
  shortParagraphs: number
  averageParagraphWords: number
  hasLists: boolean
  hasTables: boolean
  /** كل الكلمات من الفقرات فقط (بلا عناوين) لحساب القراءة بدقة. */
  proseText: string
}

/** استخراج بنية المستند من جسم المقال. */
export function analyzeBodyStructure(body: string): BodyStructure {
  const blocks = parseBodyBlocks(body)
  const headings = blocks
    .filter((b) => b.kind === "heading")
    .map((b) => ({ level: b.level, text: b.text }))

  const paragraphs = blocks.filter((b) => b.kind === "paragraph")
  const proseText = paragraphs.map((p) => p.text).join("\n")
  const wordCounts = paragraphs.map((p) => tokenize(p.text).length)
  const totalWords = wordCounts.reduce((a, b) => a + b, 0)

  return {
    headings,
    h2Count: headings.filter((h) => h.level === 2).length,
    h3Count: headings.filter((h) => h.level === 3).length,
    paragraphCount: paragraphs.length,
    shortParagraphs: paragraphs.filter((p) => p.text.length < 40).length,
    averageParagraphWords: paragraphs.length ? round(totalWords / paragraphs.length) : 0,
    hasLists: /^(\s*[-*•]\s|\s*\d+[.)]\s)/m.test(body || ""),
    hasTables: /\|.*\|/.test(body || ""),
    proseText,
  }
}
