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

import { analyzeBodyStructure, analyzeText, isQuestionHeading, parseBodyBlocks, splitSentences, tokenize } from "../analyzers/text"
import { analyzeCitationPresentation } from "../analyzers/sourceQuality"
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

export interface AnswerFirstAnalysis {
  hasDirectAnswer: boolean
  hasDefinition: boolean
  openingSentence: string
  openingWords: number
  openingParagraphWords: number
  questionSections: { heading: string; hasDirectAnswer: boolean; openingWords: number }[]
  answeredQuestionSections: number
}

/**
 * يفحص المقدمة قبل احتسابها جواباً مباشراً: جملة موجزة في بداية المقال،
 * ضمن فقرة افتتاحية قصيرة، من دون تمهيد إنشائي من نوع «في هذا المقال سنتناول».
 * هذا فحص بنيوي heuristic وليس حكماً على صحة الإجابة أو كفايتها الموضوعية.
 */
export function analyzeAnswerFirstStructure(body: string): AnswerFirstAnalysis {
  const structure = analyzeBodyStructure(body)
  const blocks = parseBodyBlocks(body)
  const firstBlock = blocks[0]
  const openingParagraph =
    firstBlock?.kind === "paragraph" &&
    !/^(?:>|!\[|[-*•]\s|\d+[.)]\s|[«“\"])/.test(firstBlock.text.trim())
      ? firstBlock.text.trim()
      : ""
  const inspectOpening = (paragraph: string) => {
    const openingSentence = splitSentences(paragraph)[0] || paragraph
    const openingWords = tokenize(openingSentence).length
    const paragraphWords = tokenize(paragraph).length
    const normalizedOpening = openingSentence.toLowerCase()
    const preamble = /^(?:في هذا المقال|في هذه المقالة|يتناول هذا المقال|سنتناول|سوف نتناول|سنتحدث|سوف نتحدث|سنستعرض|سوف نستعرض|في السطور التالية|مقدمة|تمهيد)(?:\s|،|:|$)/u.test(normalizedOpening)
    const explicitYesNo = /^(?:نعم|لا)(?:[\s،؛]|$)/u.test(normalizedOpening)
    const hasDirectAnswer =
      !preamble &&
      paragraphWords <= 60 &&
      ((openingWords >= 8 && openingWords <= 45) || (explicitYesNo && openingWords > 0))
    return { openingSentence, openingWords, paragraphWords, hasDirectAnswer }
  }

  const opening = inspectOpening(openingParagraph)
  const hasDefinition = /(?:^|[\s،])(?:هو|هي|يعني|تعني|يُعرَّف|يعرف|يُقصد|يقصد|المقصود)(?:\s|\s*ب|$)|عبارة عن|يتمثل في|تتمثل في/u.test(opening.openingSentence)

  const questionSections: AnswerFirstAnalysis["questionSections"] = []
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index]
    if (block.kind !== "heading" || !isQuestionHeading(block.text)) continue

    let answerParagraph = ""
    for (let next = index + 1; next < blocks.length && blocks[next].kind !== "heading"; next++) {
      const candidate = blocks[next].text.trim()
      if (blocks[next].kind !== "paragraph" || !candidate) continue
      if (/^!\[/.test(candidate)) continue // صورة لا تُعد جواباً ولا تمنع الفقرة التالية.
      if (/^(?:>|[-*•]\s|\d+[.)]\s|---)/.test(candidate)) break
      answerParagraph = candidate
      break
    }
    const sectionOpening = inspectOpening(answerParagraph)
    questionSections.push({
      heading: block.text,
      hasDirectAnswer: sectionOpening.hasDirectAnswer,
      openingWords: sectionOpening.openingWords,
    })
  }

  return {
    hasDirectAnswer: opening.hasDirectAnswer,
    hasDefinition,
    openingSentence: opening.openingSentence,
    openingWords: opening.openingWords,
    openingParagraphWords: opening.paragraphWords,
    questionSections,
    answeredQuestionSections: questionSections.filter((section) => section.hasDirectAnswer).length,
  }
}

/**
 * AEO — هل يحتوي النص إجابة مباشرة قابلة للالتقاط؟
 *
 * محركات الإجابة (و«الأسئلة الشائعة» و«الناس يسألون أيضاً») تلتقط:
 * جملة إجابة مبكرة قصيرة، عناوين على شكل سؤال، قوائم مرقّمة، وتعريفاً صريحاً.
 */
export function scoreAeo(input: AiInput): ScoreParts {
  const structure = analyzeBodyStructure(input.body)
  const issues: string[] = []
  const evidence: string[] = []
  const answerFirst = analyzeAnswerFirstStructure(input.body)

  evidence.push(`أول جملة: ${answerFirst.openingWords} كلمة`)
  evidence.push(`تعريف مباشر في المقدمة=${answerFirst.hasDefinition}`)
  if (!answerFirst.hasDirectAnswer) {
    issues.push(
      answerFirst.openingWords === 0
        ? "لا توجد جملة افتتاحية — ابدأ بإجابة أو تعريف مباشر قبل شرح السياق."
        : `المقدمة ليست جواباً مباشراً (${answerFirst.openingWords} كلمة في الجملة الأولى، ${answerFirst.openingParagraphWords} في الفقرة) — ابدأ بإجابة موجزة وتجنب التمهيد الإنشائي.`
    )
  }

  // عناوين بصيغة أسئلة حقيقية ومفيدة، لا مجرد وجود علامة استفهام عابرة.
  const questionHeadingCount = structure.questionHeadings.length
  const questionScore = questionHeadingCount >= 2 ? 100 : questionHeadingCount === 1 ? 60 : 0
  if (questionHeadingCount < 2) {
    issues.push("أضف عنوانين فرعيين على الأقل بصيغة أسئلة حقيقية يطرحها القارئ، ثم أجب مباشرة تحتهما.")
  }
  const unansweredQuestionSections = answerFirst.questionSections.filter((section) => !section.hasDirectAnswer)
  if (unansweredQuestionSections.length) {
    const examples = unansweredQuestionSections.slice(0, 2).map((section) => `«${section.heading}»`).join("، ")
    issues.push(`ابدأ ${unansweredQuestionSections.length} قسم سؤالي بإجابة مباشرة تحته، لا بتمهيد أو اقتباس: ${examples}.`)
  }

  // العناوين المتدرجة دون تخطٍّ تجعل حدود الأقسام قابلة للاستخراج.
  const headingHierarchyScore = structure.headingJumps.length
    ? Math.max(0, 100 - structure.headingJumps.length * 35)
    : 100
  if (structure.headingJumps.length) {
    const jumps = structure.headingJumps
      .map((jump) => `H${jump.fromLevel} → H${jump.toLevel}`)
      .join("، ")
    issues.push(`تسلسل العناوين يقفز ${structure.headingJumps.length} مرة (${jumps}) — استخدم مستوى فرعياً متتالياً.`)
  }

  // FAQ
  const faqCount = input.faqs?.length || 0
  const faqScore = faqCount >= 3 ? 100 : Math.round((faqCount / 3) * 100)
  if (faqCount < 3) issues.push(`عدد الأسئلة الشائعة ${faqCount} — أضف أسئلة وأجوبة موجزة عندما تناسب الموضوع.`)

  // قوائم مرقّمة = مقتطفات «خطوات»
  const listScore = structure.hasLists ? 100 : 30
  if (!structure.hasLists) issues.push("لا توجد قوائم — استخدم قائمة عند عرض خطوات أو عناصر متعددة.")

  const answerScore = !answerFirst.hasDirectAnswer
    ? 25
    : unansweredQuestionSections.length
      ? 65
      : 100
  const score =
    answerScore * 0.3 +
    questionScore * 0.22 +
    faqScore * 0.18 +
    listScore * 0.15 +
    headingHierarchyScore * 0.15
  return parts(
    score,
    [
      ...evidence,
      `عناوين سؤالية=${questionHeadingCount}، إجابات أقسام سؤالية=${answerFirst.answeredQuestionSections}/${answerFirst.questionSections.length}`,
      `قفزات العناوين=${structure.headingJumps.length}، FAQ=${faqCount}`,
    ],
    issues
  )
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
  const sentences = splitSentences(input.body || "")

  // جملة قابلة للاقتباس: خبرية، 12-35 كلمة، تحتوي حقيقة
  const quotable = sentences.filter((s) => {
    const words = tokenize(s).length
    return words >= 12 && words <= 35 && /(?:يُعد|يُعرَّف|هو|هي|ينص|يجب|يلزم|يعني|الفصل|المادة|\d)/.test(s)
  })

  const quotableRatio = sentences.length ? quotable.length / sentences.length : 0
  const quotableScore = Math.round(Math.min(quotableRatio / 0.35, 1) * 100)
  if (quotable.length === 0) issues.push("لا توجد جملة تصلح كاستشهاد مباشر — أضف جملاً خبرية قصيرة تحمل حقيقة محددة.")
  else if (quotableRatio < 0.2) issues.push(`نسبة الجمل القابلة للاقتباس منخفضة (${quotable.length} من ${sentences.length}).`)

  // المصدر الخارجي المسمّى يتيح التحقق من الادعاء؛ الرابط الداخلي وحده لا يكفي.
  const citationPresentation = analyzeCitationPresentation(input.body)
  const citableSource = Boolean(input.canonicalUrl) && /(adala\.justice|sgg\.gov|justice\.gov\.ma|الجريدة الرسمية|\.gov\.ma)/.test(input.body)
  const sourceScore = citableSource ? 100 : input.canonicalUrl ? 55 : 0
  const namedLinkScore = citationPresentation.namedLinkedSources.length > 0
    ? 100
    : citationPresentation.outboundLinks.length > 0
      ? 35
      : 0
  if (!input.canonicalUrl) issues.push("لا يوجد رابط قانوني (canonical) — بدونه لا يستطيع النموذج إسناد الاقتباس لصفحتك.")
  if (!citationPresentation.namedLinkedSources.length) {
    issues.push(
      citationPresentation.outboundLinks.length
        ? "يوجد رابط خارجي لكن لا يظهر معه اسم مصدر واضح — اربط اسم الجهة أو النص الرسمي بمصدره."
        : "لا يوجد استشهاد بمصدر مسمّى ورابط خارجي — اربط الادعاءات بمراجعها الأصلية."
    )
  }

  const quoteCount = citationPresentation.quotations.length
  const attributedQuoteScore = quoteCount
    ? Math.round((citationPresentation.attributedQuoteCount / quoteCount) * 100)
    : 35
  if (quoteCount === 0) {
    issues.push("لا يوجد اقتباس مباشر من سلطة أو مصدر مختص — أضف اقتباساً موثقاً مع اسم قائله أو الجهة ورابط المصدر.")
  } else if (citationPresentation.attributedQuoteCount < quoteCount) {
    issues.push(`يوجد ${quoteCount - citationPresentation.attributedQuoteCount} اقتباس بلا إسناد واضح — انسب كل قول إلى جهة أو مؤلف مسمّى.`)
  }

  // حداثة المعلومة — النماذج تفضّل المصدر الأحدث
  const freshnessSignal = input.updatedAt ? 100 : 40
  if (!input.updatedAt) issues.push("لا يوجد تاريخ تحديث — يقلل ترجيح المصدر عند تعارض المصادر.")

  const score =
    quotableScore * 0.4 +
    sourceScore * 0.25 +
    freshnessSignal * 0.15 +
    namedLinkScore * 0.1 +
    attributedQuoteScore * 0.1
  return parts(
    score,
    [
      `${quotable.length}/${sentences.length} جملة قابلة للاقتباس`,
      `مصدر رسمي قابل للإسناد=${citableSource}`,
      `مصادر مسمّاة مرتبطة=${citationPresentation.namedLinkedSources.length}`,
      `اقتباسات منسوبة=${citationPresentation.attributedQuoteCount}/${quoteCount}`,
    ],
    issues
  )
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
