/**
 * src/lib/seo/scoring/aiScores.ts
 *
 * طبقة محركات الإجابة والمحرّكات التوليدية:
 *   AEO  — Answer Engine Optimization
 *   GEO  — Generative Engine Optimization
 *   AI Visibility / LLMO / LSO / KEO / SGEO
 *   Citation — قابلية الاستشهاد
 *
 * الصدق أولاً: ما يُحسب هنا هو **الجاهزية** (readiness) — هل بنيتك ونصّك
 * قابلان للاقتباس والاستشهاد؟ أما "هل يستشهد ChatGPT بك فعلاً" فلا يمكن
 * معرفته دون فحص النماذج فعلياً، وهو خلف محوّل llmProbe المعطّل حتى توفّر
 * مفتاحاً.
 */

import { analyzeBodyStructure, analyzeText, tokenize } from "../analyzers/text"
import type { ScoreParts } from "./contentScores"

function parts(score: number, evidence: string[], issues: string[]): ScoreParts {
  return { score: Math.max(0, Math.min(100, Math.round(score))), evidence, issues }
}

export interface AiInput {
  title: string
  body: string
  slug: string
  excerpt?: string
  updatedAt?: string
  faqs?: { question: string; answer: string }[]
  canonicalUrl?: string
  schemaTypes?: string[]
}

/**
 * AEO — هل يحتوي النص إجابة مباشرة قابلة للالتقاط؟
 *
 * محركات الإجابة (و«الأسئلة الشائعة» و«الناس يسألون أيضاً») تلتقط:
 * جملة إجابة مبكرة قصيرة، عناوين على شكل سؤال، قوائم مرقّمة، وتعريفاً صريحاً.
 */
export function scoreAeo(input: AiInput): ScoreParts {
  const structure = analyzeBodyStructure(input.body)
  const prose = structure.proseText
  const issues: string[] = []
  const evidence: string[] = []

  const firstSentence = (prose.trim().split(/[.؟?]/)[0] || "").trim()
  const firstSentenceWords = tokenize(firstSentence).length
  const hasDirectAnswer = firstSentenceWords >= 8 && firstSentenceWords <= 45

  evidence.push(`أول جملة: ${firstSentenceWords} كلمة`)
  if (!hasDirectAnswer) {
    issues.push(
      firstSentenceWords === 0
        ? "لا توجد جملة افتتاحية — أضف إجابة مباشرة في أول 40-60 كلمة."
        : `أول جملة ${firstSentenceWords} كلمة — المقتطفات المفضّلة بين 15 و45 كلمة. اجعلها إجابة قائمة بذاتها.`
    )
  }

  // عناوين على شكل سؤال — تُلتقط مباشرة في People Also Ask
  const questionHeadings = structure.headings.filter((h) => /[؟?]|^(?:هل|ما|كيف|متى|أين|لماذا)/.test(h.text))
  const questionScore = questionHeadings.length >= 2 ? 100 : questionHeadings.length === 1 ? 60 : 0
  if (questionHeadings.length < 2) issues.push("لا توجد عناوين بصيغة سؤال — أسئلة H2/H3 هي ما يُلتقط في «الناس يسألون أيضاً».")

  // FAQ
  const faqCount = input.faqs?.length || 0
  const faqScore = faqCount >= 3 ? 100 : Math.round((faqCount / 3) * 100)
  if (faqCount < 3) issues.push(`عدد الأسئلة الشائعة ${faqCount} — ثلاثة على الأقل مع FAQPage schema يضاعف فرص الظهور.`)

  // قوائم مرقّمة = مقتطفات «خطوات»
  const listScore = structure.hasLists ? 100 : 30
  if (!structure.hasLists) issues.push("لا توجد قوائم — القوائم المرقّمة أكثر صيغة تُلتقط كمقتطف مميز.")

  const answerScore = hasDirectAnswer ? 100 : 30
  const score = answerScore * 0.35 + questionScore * 0.25 + faqScore * 0.2 + listScore * 0.2
  return parts(score, [...evidence, `عناوين سؤالية=${questionHeadings.length}، FAQ=${faqCount}`], issues)
}

/**
 * GEO — Generative Engine Optimization.
 *
 * ما يجعل نصاً قابلاً للاقتباس من نموذج لغوي:
 *   • فقرات مكتفية ذاتياً (تُفهم خارج سياقها)
 *   • حقائق قابلة للتحقق (أرقام، فصول، تواريخ)
 *   • إسناد صريح للمصدر
 *   • جمل خبرية قصيرة (النماذج تقتبس الجمل الخبرية لا الإنشائية)
 *   • بنية واضحة بحدود موضوعية
 */
export function scoreGeo(input: AiInput): ScoreParts {
  const structure = analyzeBodyStructure(input.body)
  const paragraphs = structure.proseText.split(/\n+/).map((p) => p.trim()).filter(Boolean)
  const issues: string[] = []
  const evidence: string[] = []

  // فقرات مكتفية ذاتياً: طول معقول + لا تبدأ بضمير عائد غامض
  const ambiguousStart = /^(?:وهذا|وهي|وهو|كما ذكرنا|كما سبق|أيضاً|كذلك)/
  const selfContained = paragraphs.filter(
    (p) => tokenize(p).length >= 20 && tokenize(p).length <= 120 && !ambiguousStart.test(p)
  )
  const selfContainedRatio = paragraphs.length ? selfContained.length / paragraphs.length : 0
  const selfContainedScore = Math.round(selfContainedRatio * 100)
  if (selfContainedRatio < 0.6) issues.push("كثير من الفقرات غير مكتفية ذاتياً (قصيرة جداً أو تبدأ بإحالة غامضة) — النماذج تقتبس الفقرة المفهومة خارج سياقها.")
  evidence.push(`${selfContained.length}/${paragraphs.length} فقرة مكتفية ذاتياً`)

  // حقائق قابلة للتحقق
  const facts = (input.body.match(/(?:الفصل|المادة)\s+\d+|20\d{2}|\d+\s*%/g) || []).length
  const factScore = Math.min(facts, 6) >= 4 ? 100 : Math.round((facts / 4) * 100)
  if (facts < 4) issues.push(`عدد الحقائق القابلة للتحقق منخفض (${facts}) — أضف فصولاً وأرقاماً وتواريخ محددة.`)

  // إسناد صريح
  const attributed = /(بحسب|وفقاً|وفق|ينص|نصّت|حسب|المصدر:|الجريدة الرسمية|adala\.justice|sgg\.gov)/.test(input.body)
  const attributionScore = attributed ? 100 : 0
  if (!attributed) issues.push("لا يوجد إسناد صريح («وفقاً للفصل…»، «بحسب الجريدة الرسمية») — النماذج تفضّل اقتباس المعلومة المسنودة.")

  // حدود موضوعية
  const boundaryScore = structure.h2Count >= 3 ? 100 : Math.round((structure.h2Count / 3) * 100)

  const score =
    selfContainedScore * 0.3 + factScore * 0.3 + attributionScore * 0.2 + boundaryScore * 0.2
  return parts(score, [...evidence, `حقائق=${facts}، إسناد=${attributed}`], issues)
}

/**
 * قابلية الاستشهاد (Citation Score).
 *
 * هل يحتوي النص جملاً تصلح كاستشهاد مباشر، مع مصدر يمكن للنموذج ذكره؟
 */
export function scoreCitation(input: AiInput): ScoreParts {
  const issues: string[] = []
  const sentences = (input.body || "")
    .split(/[.؟?]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  // جملة قابلة للاقتباس: خبرية، 12-35 كلمة، تحتوي حقيقة
  const quotable = sentences.filter((s) => {
    const words = tokenize(s).length
    return words >= 12 && words <= 35 && /(?:يُعد|يُعرَّف|هو|هي|ينص|يجب|يلزم|يعني|الفصل|المادة|\d)/.test(s)
  })

  const quotableRatio = sentences.length ? quotable.length / sentences.length : 0
  const quotableScore = Math.round(Math.min(quotableRatio / 0.35, 1) * 100)
  if (quotable.length === 0) issues.push("لا توجد جملة تصلح كاستشهاد مباشر — أضف جملاً خبرية قصيرة تحمل حقيقة محددة.")
  else if (quotableRatio < 0.2) issues.push(`نسبة الجمل القابلة للاقتباس منخفضة (${quotable.length} من ${sentences.length}).`)

  // هل يوجد مصدر يمكن للنموذج ذكره؟
  const citableSource = Boolean(input.canonicalUrl) && /(adala\.justice|sgg\.gov|justice\.gov\.ma|الجريدة الرسمية|\.gov\.ma)/.test(input.body)
  const sourceScore = citableSource ? 100 : input.canonicalUrl ? 55 : 0
  if (!input.canonicalUrl) issues.push("لا يوجد رابط قانوني (canonical) — بدونه لا يستطيع النموذج إسناد الاقتباس لصفحتك.")

  // حداثة المعلومة — النماذج تفضّل المصدر الأحدث
  const freshnessSignal = input.updatedAt ? 100 : 40
  if (!input.updatedAt) issues.push("لا يوجد تاريخ تحديث — يقلل ترجيح المصدر عند تعارض المصادر.")

  const score = quotableScore * 0.45 + sourceScore * 0.35 + freshnessSignal * 0.2
  return parts(score, [`${quotable.length}/${sentences.length} جملة قابلة للاقتباس`, `مصدر قابل للإسناد=${citableSource}`], issues)
}

/**
 * AI Visibility (الجزء المحسوب دون شبكة): جاهزية الملف لاكتشافه من
 * وكلاء الذكاء الاصطناعي. الجزء الفعلي (هل يظهر الموقع في إجابات النماذج)
 * خلف محوّل llmProbe.
 */
export interface AiVisibilitySignals {
  hasLlmsTxt: boolean
  llmsTxtIsMarkdown: boolean
  hasAiCatalog: boolean
  hasAgentCard: boolean
  hasMcpEndpoint: boolean
  mcpToolCount: number
  schemaTypes: string[]
  robotsAllowsAiBots: boolean
}

export function scoreAiVisibility(
  signals: AiVisibilitySignals,
  perContentSchemaTypes: string[] = []
): ScoreParts {
  const issues: string[] = []
  const checks: { ok: boolean; weight: number; issue: string; evidence: string }[] = [
    {
      ok: signals.hasLlmsTxt && signals.llmsTxtIsMarkdown,
      weight: 22,
      issue: "ملف /llms.txt مفقود أو لا يحتوي Markdown صالحاً — هذا الملف هو ما تقرأه النماذج للتعرف على الموقع.",
      evidence: `llms.txt=${signals.hasLlmsTxt} markdown=${signals.llmsTxtIsMarkdown}`,
    },
    {
      ok: signals.hasAiCatalog,
      weight: 14,
      issue: "لا يوجد /.well-known/ai-catalog.json — يفوّت اكتشاف الوكلاء الآلي.",
      evidence: `ai-catalog=${signals.hasAiCatalog}`,
    },
    {
      ok: signals.hasAgentCard,
      weight: 14,
      issue: "لا يوجد /.well-known/agent-card.json — يعطّل اكتشاف الوكلاء (A2A).",
      evidence: `agent-card=${signals.hasAgentCard}`,
    },
    {
      ok: signals.hasMcpEndpoint && signals.mcpToolCount > 0,
      weight: 18,
      issue: "نقطة MCP غير متوفرة أو بلا أدوات — MCP هي الطريقة المباشرة لاستهلاك وكلاء الذكاء الاصطناعي لمحتواك.",
      evidence: `mcp=${signals.hasMcpEndpoint} tools=${signals.mcpToolCount}`,
    },
    {
      ok: signals.robotsAllowsAiBots,
      weight: 16,
      issue: "ملف robots.txt يحجب زواحف الذكاء الاصطناعي — لن تُفهرس من هذه النماذج إطلاقاً.",
      evidence: `robots-ai=${signals.robotsAllowsAiBots}`,
    },
    {
      ok: [...new Set([...signals.schemaTypes, ...perContentSchemaTypes])].length >= 4,
      weight: 16,
      issue: "أنواع البيانات المنظمة أقل من 4 — البيانات المنظمة هي لغة التفاهم مع المخططات المعرفية.",
      evidence: `schema=[${[...new Set([...signals.schemaTypes, ...perContentSchemaTypes])].join(", ")}]`,
    },
  ]

  let score = 0
  const evidence: string[] = []
  for (const check of checks) {
    evidence.push(check.evidence)
    if (check.ok) score += check.weight
    else issues.push(check.issue)
  }

  return parts(score, evidence, issues)
}

/** أنواع البيانات المنظمة الموصى بها لموقع مرجعي قانوني. */
export const RECOMMENDED_SCHEMA_TYPES = [
  "Organization",
  "WebSite",
  "Article",
  "BreadcrumbList",
  "FAQPage",
  "EducationalOccupationalProgram",
  "CollegeOrUniversity",
  "DefinedTerm",
  "DefinedTermSet",
  "Event",
  "LegalService",
  "SearchAction",
] as const
