/**
 * src/lib/seo/generators/faq.ts
 *
 * FAQ Generator + AEO Answer Generator.
 *
 * يستخرج الأسئلة الفعلية من المحتوى ويولّد إجابات قائمة بذاتها من النص
 * الموجود — لا يخترع معلومة. الإجابة تُبنى من أول جملة تحمل حقيقة، وتُحفظ
 * الإشارة إلى الفقرة المصدر حتى يراجعها المحرر.
 */

import { tokenize } from "../analyzers/text"

export interface FaqItem {
  question: string
  answer: string
  /** موضع المصدر في النص الأصلي، للمراجعة البشرية. */
  sourceExcerpt: string
  /** 0-100: مدى صلاحية الإجابة للالتقاط كمقتطف. */
  quality: number
}

/** أنماط الأسئلة في النص العربي. */
const QUESTION_PATTERNS = [
  /(?:^|[,.\s])((?:هل|ما|ماذا|كيف|متى|أين|لماذا|من|كم)\s+[^،.؟?]{6,120})\s*[؟?]/g,
  /^#{1,6}\s*((?:هل|ما|ماذا|كيف|متى|أين|لماذا|من|كم)\s+[^#\n]{6,120})\s*[؟?]?\s*$/gm,
]

/** استخراج الأسئلة المذكورة صراحة في النص. */
export function extractQuestions(text: string): string[] {
  const source = text || ""
  const found = new Set<string>()
  for (const pattern of QUESTION_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      const question = (match[1] || "").trim()
      if (question.length >= 10) found.add(question.endsWith("؟") ? question : `${question}؟`)
    }
  }
  return [...found]
}

/** تقسيم النص إلى فقرات مفيدة. */
function toParagraphs(text: string): string[] {
  return (text || "")
    .split(/,|\n+/)
    .map((p) => p.replace(/^#{1,6}\s+/, "").trim())
    .filter((p) => tokenize(p).length >= 8)
}

/**
 * اختيار أفضل جملة من فقرة لتكون إجابة مباشرة.
 * تُفضَّل الجملة الخبرية التي تحمل حقيقة (رقم، فصل، تعريف) وطولها مناسب.
 */
export function pickAnswerSentence(paragraph: string): string {
  const sentences = (paragraph || "")
    .split(/(?<=[.!؟?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)

  if (sentences.length === 0) return paragraph.trim()

  const scored = sentences.map((sentence) => {
    const words = tokenize(sentence).length
    let score = 0
    // الطول المثالي للمقتطف: 12-45 كلمة
    if (words >= 12 && words <= 45) score += 40
    else if (words >= 8) score += 15
    // جملة خبرية
    if (/(?:يُعد|يُعرَّف|يعني|هو|هي|ينص|يجب|يلزم|تُعتبر|يعتبر)/.test(sentence)) score += 25
    // حقيقة قابلة للتحقق
    if (/(?:الفصل|المادة)\s+\d+|\d+\s*%|20\d{2}|\d+/.test(sentence)) score += 25
    // أول جملة في الفقرة عادةً تحمل الفكرة
    if (sentence === sentences[0]) score += 10
    return { sentence, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored[0].sentence
}

/**
 * توليد أسئلة وأجوبة من محتوى.
 *
 * @param text نص المقال
 * @param options.title عنوان المقال — يُستخدم لصياغة أسئلة عند غيابها
 * @param options.maxItems الحد الأقصى للأسئلة
 */
export function generateFaq(
  text: string,
  options: { title?: string; maxItems?: number } = {}
): FaqItem[] {
  const maxItems = options.maxItems ?? 6
  const paragraphs = toParagraphs(text)
  if (paragraphs.length === 0) return []

  const explicitQuestions = extractQuestions(text)
  const items: FaqItem[] = []

  // 1) أسئلة موجودة فعلاً في النص + أقرب فقرة كإجابة
  for (const question of explicitQuestions) {
    if (items.length >= maxItems) break
    const keyword = tokenize(question).slice(0, 3).join(" ")
    const match =
      paragraphs.find((p) => keyword && p.includes(keyword) && tokenize(p).length >= 12) || paragraphs[0]
    const answer = pickAnswerSentence(match)
    items.push({
      question,
      answer,
      sourceExcerpt: match.slice(0, 240),
      quality: scoreAnswer(answer),
    })
  }

  // 2) أسئلة مُولّدة من العناوين/الفقرات الرئيسية
  for (const paragraph of paragraphs) {
    if (items.length >= maxItems) break
    if (items.some((item) => item.sourceExcerpt === paragraph.slice(0, 240))) continue

    const answer = pickAnswerSentence(paragraph)
    const words = tokenize(answer)
    if (words.length < 8) continue

    // صياغة سؤال من أول عبارات الفقرة
    const topic = words.slice(0, 6).join(" ")
    const question = `ما المقصود ب${topic}؟`
    items.push({
      question,
      answer,
      sourceExcerpt: paragraph.slice(0, 240),
      quality: scoreAnswer(answer),
    })
  }

  return items.sort((a, b) => b.quality - a.quality).slice(0, maxItems)
}

/** مدى صلاحية الإجابة للالتقاط كمقتطف (0-100). */
export function scoreAnswer(answer: string): number {
  const words = tokenize(answer).length
  let score = 0
  if (words >= 12 && words <= 45) score += 45
  else if (words >= 6) score += 20
  if (/(?:يُعد|يُعرَّف|يعني|هو|هي|ينص|يجب|يلزم)/.test(answer)) score += 25
  if (/(?:الفصل|المادة)\s+\d+|\d/.test(answer)) score += 20
  if (/[.!؟?]$/.test(answer.trim())) score += 10
  return Math.min(100, score)
}

/**
 * AEO Answer Generator: إجابة مباشرة واحدة لأعلى الصفحة.
 * تُبنى من أول فقرة، وتُقاس صلاحيتها كمقتطف.
 */
export function generateDirectAnswer(text: string): { answer: string; quality: number; issues: string[] } {
  const paragraphs = toParagraphs(text)
  const issues: string[] = []
  if (paragraphs.length === 0) {
    return { answer: "", quality: 0, issues: ["لا يوجد محتوى كافٍ لبناء إجابة مباشرة."] }
  }

  const answer = pickAnswerSentence(paragraphs[0])
  const quality = scoreAnswer(answer)
  const words = tokenize(answer).length

  if (words < 10) issues.push("الإجابة قصيرة جداً — اجعلها بين 12 و45 كلمة.")
  if (words > 45) issues.push("الإجابة طويلة — المقتطفات تفضّل 12-45 كلمة.")
  if (!/(?:يُعد|يُعرَّف|يعني|هو|هي|ينص|يجب|يلزم)/.test(answer)) {
    issues.push("الإجابة ليست جملة خبرية صريحة — ابدأ بصيغة تعريفية.")
  }

  return { answer, quality, issues }
}
