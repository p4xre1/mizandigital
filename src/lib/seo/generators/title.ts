/**
 * src/lib/seo/generators/title.ts + headline + metaDescription
 *
 * مولّدات حتمية (deterministic) مبنية على قوالب عربية وقياسات فعلية — لا
 * نموذج لغوي. السبب: المحتوى قانوني، وتوليد نص آلي بلا تحقق خطر على الدقة.
 * هذه الأدوات تُنتج **بدائل قابلة للمراجعة البشرية**، لا نصاً يُنشر مباشرة.
 */

import { clamp, analyzeText, tokenize } from "../analyzers/text"

export interface TitleSuggestion {
  title: string
  length: number
  /** 0-100: مدى ملاءمة الطول والعرض في نتائج البحث. */
  score: number
  rationale: string
}

/**
 * توليد بدائل عنوان من عنوان أساسي.
 * النطاق المثالي 30-65 حرفاً (يُقتطع في نتائج البحث خارجه).
 */
export function generateTitles(baseTitle: string, options: { focusKeyword?: string; category?: string } = {}): TitleSuggestion[] {
  const title = (baseTitle || "").trim()
  if (!title) return []

  const keyword = options.focusKeyword?.trim()
  const candidates: { title: string; rationale: string }[] = [
    { title, rationale: "العنوان الأصلي" },
  ]

  // صيغة سؤالية — تُلتقط في «الناس يسألون أيضاً»
  if (!/^[؟?]|^(?:هل|ما|كيف|متى|لماذا)/.test(title)) {
    candidates.push({ title: `${title}؟`, rationale: "صيغة سؤالية تحسّن الالتقاط في محركات الإجابة" })
  }

  // صيغة "دليل" — نية معلوماتية واضحة
  if (!/دليل|شرح/.test(title)) {
    candidates.push({ title: `دليل ${title.replace(/^(?:كيف|ما هو|ما هي)\s+/i, "")}`.trim(), rationale: "صيغة دليل تُوضّح نية البحث المعلوماتية" })
  }

  // إضافة التصنيف كسياق
  if (options.category && !title.includes(options.category)) {
    candidates.push({
      title: `${title} — ${options.category}`,
      rationale: "إضافة التصنيف توسّع التغطية الدلالية",
    })
  }

  // الكلمة المفتاحية في المقدمة
  if (keyword && !title.startsWith(keyword)) {
    candidates.push({
      title: `${keyword}: ${title}`,
      rationale: "نقل الكلمة المفتاحية إلى بداية العنوان يقوّي الإشارة",
    })
  }

  const seen = new Set<string>()
  return candidates
    .filter((c) => {
      const key = c.title.trim()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((c) => {
      const length = c.title.length
      // 30-65 مثالي؛ عقوبة تدريجية خارجه
      const lengthScore = length >= 30 && length <= 65 ? 100 : clamp(100 - Math.abs(length - 48) * 2)
      return {
        title: c.title,
        length,
        score: Math.round(lengthScore),
        rationale: c.rationale,
      }
    })
    .sort((a, b) => b.score - a.score)
}

export interface HeadlineVariant {
  headline: string
  angle: string
  score: number
}

/**
 * بدائل عنوان رئيسي بزوايا مختلفة (لتحسين معدل النقر).
 * كل بديل معلَّل بالزاوية التي يلعب عليها.
 */
export function optimizeHeadline(title: string, context: { audience?: string; benefit?: string } = {}): HeadlineVariant[] {
  const base = (title || "").trim()
  if (!base) return []

  const audience = context.audience || "طلبة القانون"
  const benefit = context.benefit || "فهم أعمق"

  const variants: { headline: string; angle: string; bonus: number }[] = [
    { headline: base, angle: "الأصل", bonus: 0 },
    { headline: `${base} — دليل عملي ل${audience}`, angle: "جمهور محدد", bonus: 8 },
    { headline: `${base}: ما تحتاج معرفته`, angle: "وعد بالمنفعة", bonus: 6 },
    { headline: `كيف تفهم ${base.replace(/[؟?]$/, "")} خطوة بخطوة`, angle: "خطوات", bonus: 10 },
    { headline: `${base} في نقاط مختصرة`, angle: "اختصار", bonus: 5 },
  ]

  return variants
    .map((v) => {
      const length = v.headline.length
      const lengthScore = length >= 30 && length <= 70 ? 100 : clamp(100 - Math.abs(length - 50) * 1.8)
      return {
        headline: v.headline,
        angle: v.angle,
        score: Math.min(100, Math.round(lengthScore * 0.8 + v.bonus)),
      }
    })
    .sort((a, b) => b.score - a.score)
}

export interface MetaDescriptionResult {
  description: string
  length: number
  score: number
  warnings: string[]
}

/**
 * توليد وصف ميتا من الملخص أو من أول جمل المحتوى.
 *
 * النطاق المثالي 120-165 حرفاً. يُبنى من نص موجود فعلاً (لا اختراع) كي لا
 * يُعد الزائر بشيء غير موجود في الصفحة.
 */
export function generateMetaDescription(input: {
  excerpt?: string
  body?: string
  title?: string
  focusKeyword?: string
}): MetaDescriptionResult {
  const warnings: string[] = []

  const source = (input.excerpt || "").trim() || extractLead(input.body || "")
  if (!source) {
    return { description: "", length: 0, score: 0, warnings: ["لا يوجد ملخص ولا محتوى كافٍ لبناء وصف."] }
  }

  // قطع على حدّ جملة إن أمكن
  let description = source.replace(/\s+/g, " ").trim()
  if (description.length > 165) {
    const cut = description.slice(0, 165)
    const lastBreak = Math.max(cut.lastIndexOf("،"), cut.lastIndexOf("، "), cut.lastIndexOf("."), cut.lastIndexOf(" "))
    description = lastBreak > 80 ? cut.slice(0, lastBreak).trim() : cut.trim()
    if (!/[.!؟?]$/.test(description)) description += "…"
  }

  if (description.length < 120) warnings.push(`الوصف قصير (${description.length} حرفاً) — النطاق المثالي 120-165.`)
  if (description.length > 165) warnings.push(`الوصف طويل (${description.length} حرفاً) — سيُقتطع في نتائج البحث.`)
  if (input.focusKeyword && !description.includes(input.focusKeyword.trim())) {
    warnings.push("الكلمة المفتاحية غير موجودة في الوصف.")
  }
  if (!/[.!؟?…]$/.test(description)) warnings.push("الوصف لا ينتهي بعلامة ترقيم.")

  const lengthScore = description.length >= 120 && description.length <= 165 ? 100 : clamp(100 - Math.abs(description.length - 145) * 1.2)
  const keywordScore = input.focusKeyword && description.includes(input.focusKeyword.trim()) ? 100 : 60

  return {
    description,
    length: description.length,
    score: Math.round(lengthScore * 0.7 + keywordScore * 0.3 - warnings.length * 3),
    warnings,
  }
}

/** استخراج أول جمل ذات معنى من نص لتكون بداية الوصف. */
function extractLead(body: string, maxChars = 200): string {
  const prose = body.split(/,/).map((p) => p.replace(/^#{1,6}\s+/, "").trim()).filter((p) => p.length > 40)
  if (prose.length === 0) return ""
  const lead = prose[0]
  if (lead.length <= maxChars) return lead
  return lead.slice(0, maxChars)
}

export { analyzeText, tokenize }
