/**
 * src/lib/seo/scoring/contentScores.ts
 *
 * المقاييس التي تُحسب من نص واحد: المحتوى، السيو على الصفحة، القراءة،
 * الكيانات، الدلالة، نية البحث، الحداثة، E-E-A-T، الثقة، المرجعية، UX، CRO،
 * وطبقة الذكاء الاصطناعي (AEO / GEO / الاستشهاد).
 *
 * كل دالة تُرجع { score, evidence, issues } — النتيجة دائماً مبرَّرة بأدلة
 * ملموسة من النص، لا رقم بلا تفسير.
 */

import { extractEntities, entityScore, semanticScore } from "../analyzers/entities"
import {
  analyzeBodyStructure,
  analyzeText,
  directScale,
  invertScale,
  keywordDensity,
  normalizeArabic,
  readabilityScore,
  tokenize,
} from "../analyzers/text"

export interface ScoreParts {
  score: number
  evidence: string[]
  issues: string[]
}

function parts(score: number, evidence: string[], issues: string[]): ScoreParts {
  return { score: Math.max(0, Math.min(100, Math.round(score))), evidence, issues }
}

export interface ContentInput {
  title: string
  body: string
  slug: string
  description?: string
  excerpt?: string
  category?: string
  publishedAt?: string
  updatedAt?: string
  author?: string
  focusKeyword?: string
  imageAlt?: string
  readingTime?: string
  now?: Date
}

/** نطاقات رسمية/أكاديمية تُحتسب إسناداً موثوقاً. */
const AUTHORITATIVE_DOMAIN_RE =
  /(?:\.gov\.ma|\.gov|justice\.gov\.ma|adala\.justice|sgg\.gov\.ma|enssup\.gov\.ma|university|ac\.ma|\.edu)/i

const EXTERNAL_LINK_RE = /https?:\/\/[^\s)"']+/g
const INTERNAL_LINK_RE = /(?:^|\s)\/(?!\/)[a-z0-9\-/]+/gi

/** عدد الأيام بين تاريخ وآخر. */
function daysSince(dateString: string | undefined, now: Date): number | null {
  if (!dateString) return null
  const then = new Date(dateString)
  if (Number.isNaN(then.getTime())) return null
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / 86_400_000))
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) نتيجة المحتوى
// ─────────────────────────────────────────────────────────────────────────────
export function scoreContentDepth(input: ContentInput): ScoreParts {
  const metrics = analyzeText(input.body, ",")
  const structure = analyzeBodyStructure(input.body)
  const evidence: string[] = []
  const issues: string[] = []

  evidence.push(`${metrics.words} كلمة، ${structure.paragraphCount} فقرة، ${structure.h2Count} عنوان H2`)

  // العمق: 600+ كلمة جيد لمقال تعليمي قانوني
  const depth = directScale(metrics.words, 150, 900)
  if (metrics.words < 400) issues.push(`المحتوى قصير (${metrics.words} كلمة) — المقالات المرجعية القانونية تحتاج 600+ كلمة.`)

  // البنية: عناوين فرعية تُقسّم الموضوع
  const structureScore = structure.h2Count >= 3 ? 100 : Math.round((structure.h2Count / 3) * 100)
  if (structure.h2Count < 3) issues.push(`عدد العناوين الفرعية (H2) = ${structure.h2Count}، يُفضّل 3 على الأقل لتحسين المسح البصري والفهرسة.`)

  // التنسيق الغني: قوائم/جداول تُلتقط كـ Featured Snippet
  const richScore = (structure.hasLists ? 60 : 0) + (structure.hasTables ? 40 : 0)
  if (!structure.hasLists) issues.push("لا توجد قوائم نقطية أو مرقّمة — القوائم أكثر ما يُلتقط كمقتطف مميز.")

  // الملخص
  const excerptScore = input.excerpt && input.excerpt.length >= 80 ? 100 : input.excerpt ? 50 : 0
  if (!input.excerpt || input.excerpt.length < 80) issues.push("الملخص (excerpt) مفقود أو قصير جداً — يُستخدم في الوصف والمقتطفات.")

  const score = depth * 0.35 + structureScore * 0.3 + richScore * 0.2 + excerptScore * 0.15
  return parts(score, evidence, issues)
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) السيو على الصفحة
// ─────────────────────────────────────────────────────────────────────────────
export function scoreOnPageSeo(input: ContentInput): ScoreParts {
  const evidence: string[] = []
  const issues: string[] = []
  const titleLen = (input.title || "").trim().length
  const description = (input.description || input.excerpt || "").trim()
  const descriptionLen = description.length

  const titleScore = invertScale(Math.abs(titleLen - 48), 0, 30)
  if (titleLen === 0) issues.push("العنوان مفقود.")
  else if (titleLen < 30 || titleLen > 65) issues.push(`طول العنوان ${titleLen} حرفاً — النطاق المثالي 30-65 (يُقتطع في نتائج البحث خارجه).`)
  evidence.push(`طول العنوان ${titleLen} حرفاً`)

  const descriptionScore = invertScale(Math.abs(descriptionLen - 150), 0, 60)
  if (descriptionLen === 0) issues.push("وصف الميتا مفقود.")
  else if (descriptionLen < 120 || descriptionLen > 165) issues.push(`طول وصف الميتا ${descriptionLen} حرفاً — النطاق المثالي 120-165.`)

  // الكلمة المفتاحية
  let keywordScore = 50
  if (input.focusKeyword?.trim()) {
    const keyword = normalizeArabic(input.focusKeyword.trim())
    const inTitle = normalizeArabic(input.title || "").includes(keyword)
    const inDescription = normalizeArabic(description).includes(keyword)
    const firstParagraph = analyzeBodyStructure(input.body).proseText.slice(0, 400)
    const inIntro = normalizeArabic(firstParagraph).includes(keyword)
    const inSlug = normalizeArabic(input.slug || "").includes(keyword)

    keywordScore = (inTitle ? 35 : 0) + (inDescription ? 25 : 0) + (inIntro ? 25 : 0) + (inSlug ? 15 : 0)
    evidence.push(`الكلمة المفتاحية: عنوان=${inTitle} وصف=${inDescription} مقدمة=${inIntro} رابط=${inSlug}`)

    if (!inTitle) issues.push(`الكلمة المفتاحية "${input.focusKeyword}" غير موجودة في العنوان.`)
    if (!inIntro) issues.push("الكلمة المفتاحية لا تظهر في أول 400 حرف — موضعها في المقدمة إشارة دلالية قوية.")

    const density = keywordDensity(input.body, input.focusKeyword)
    if (density > 4) issues.push(`كثافة الكلمة المفتاحية ${density}% — فوق 4% يُقرأ كحشو.`)
  } else {
    issues.push("لم تُحدَّد كلمة مفتاحية رئيسية (Focus Keyword)، فتعذّر قياس التوافق الدلالي.")
  }

  // جودة الرابط
  const slugScore = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug || "")
    ? input.slug.length <= 60
      ? 100
      : 60
    : 0
  if (slugScore === 0) issues.push("الرابط (slug) يحتوي أحرفاً غير لاتينية أو مسافات — يؤثر على الزحف والمشاركة.")

  const score =
    titleScore * 0.25 + descriptionScore * 0.25 + keywordScore * 0.3 + slugScore * 0.2
  return parts(score, evidence, issues)
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) سهولة القراءة
// ─────────────────────────────────────────────────────────────────────────────
export function scoreReadability(input: ContentInput): ScoreParts {
  const structure = analyzeBodyStructure(input.body)
  const metrics = analyzeText(structure.proseText)
  const score = readabilityScore(metrics)

  const evidence = [
    `${metrics.wordsPerSentence} كلمة/جملة`,
    `${metrics.charsPerWord} حرف/كلمة`,
    `${Math.round(metrics.longWordRatio * 100)}% كلمات طويلة`,
  ]
  const issues: string[] = []

  if (metrics.wordsPerSentence > 25) issues.push(`الجمل طويلة (${metrics.wordsPerSentence} كلمة وسطياً) — قسّمها لجمل أقصر.`)
  if (structure.averageParagraphWords > 120) issues.push("الفقرات طويلة — الفقرة فوق 120 كلمة تُرهق القراءة على الجوال.")
  if (score < 50) issues.push("النص صعب القراءة إجمالاً: بسّط التركيب وقلّل الجمل الاعتراضية.")

  return parts(score, evidence, issues)
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) الكيانات والدلالة
// ─────────────────────────────────────────────────────────────────────────────
export function scoreEntities(input: ContentInput): ScoreParts {
  const metrics = analyzeText(input.body, ",")
  const report = extractEntities(input.body, metrics.words)
  const score = entityScore(report, metrics.words)

  const evidence = [
    `${report.uniqueCount} كيان فريد / ${report.totalCount} إشارة`,
    `فصول ومواد: ${report.byKind["legal-article"]}`,
    `مفاهيم: ${report.byKind.concept}`,
    `مؤسسات ومحاكم: ${report.byKind.institution + report.byKind.court}`,
    `كثافة: ${report.density}%`,
  ]
  const issues: string[] = []

  if (report.byKind["legal-article"] === 0) issues.push("لا توجد إحالات إلى فصول أو مواد محددة — الاستشهاد بالمادة/الفصل يرفع الدقة والمرجعية.")
  if (report.uniqueCount < 5) issues.push(`عدد الكيانات الفريدة منخفض (${report.uniqueCount}) — وسّع التغطية المفاهيمية للموضوع.`)
  if (!report.hasOfficialSource) issues.push("لا يوجد رابط لمصدر رسمي (عدالة / الأمانة العامة للحكومة / الجريدة الرسمية).")

  return parts(score, evidence, issues)
}

export function scoreSemantic(input: ContentInput): ScoreParts {
  const metrics = analyzeText(input.body, ",")
  const structure = analyzeBodyStructure(input.body)
  const report = extractEntities(input.body, metrics.words)
  const score = semanticScore(report, structure, metrics.words)

  const issues: string[] = []
  if (report.density < 1) issues.push(`كثافة الكيانات منخفضة (${report.density}%) — النص سطحى دلالياً.`)
  if (report.density > 4) issues.push(`كثافة الكيانات مرتفعة (${report.density}%) — يبدو كحشو كلمات مفتاحية.`)
  if (structure.h2Count + structure.h3Count < 4) issues.push("بنية العناوين ضعيفة — المحركات التوليدية تعتمد عليها لفهم حدود الموضوع.")

  return parts(score, [`كثافة كيانات ${report.density}%`, `${structure.h2Count + structure.h3Count} عنوان فرعي`], issues)
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) نية البحث
// ─────────────────────────────────────────────────────────────────────────────
export type SearchIntent = "informational" | "how-to" | "definitional" | "navigational"

export function classifyIntent(title: string): SearchIntent {
  const text = normalizeArabic(title || "")
  if (/^(?:كيف|طريقه|خطوات|دليل)/.test(text)) return "how-to"
  if (/(?:ما هو|ما هي|ماهو|ماهي|مفهوم|تعريف|معنى)/.test(text)) return "definitional"
  if (/(?:موقع|تسجيل الدخول|الرئيسيه|من نحن)/.test(text)) return "navigational"
  return "informational"
}

export function scoreSearchIntent(input: ContentInput): ScoreParts {
  const intent = classifyIntent(input.title)
  const structure = analyzeBodyStructure(input.body)
  const prose = structure.proseText
  const evidence = [`النية المصنّفة: ${intent}`]
  const issues: string[] = []
  let score = 55

  const hasSteps = /(الخطوه|الخطوة|خطوه \d|أولاً|ثانياً|ثالثاً|1[.)-]|\d[.)-])/.test(prose)
  const hasDefinition = /(يُعرَّف|يعرف ب|هو\s|هي\s|المقصود ب)/.test(prose)
  const hasAnswerFirst = prose.trim().length > 0 && prose.trim().split(/[.؟?]/)[0].length <= 220

  if (intent === "how-to") {
    score = hasSteps ? 95 : 40
    if (!hasSteps) issues.push("العنوان يَعِد بخطوات («كيف…») لكن المحتوى لا يحتوي تسلسلاً مرقّماً — عدم تطابق مع نية البحث.")
  } else if (intent === "definitional") {
    score = hasDefinition ? 95 : 45
    if (!hasDefinition) issues.push("العنوان سؤالي/تعريفي لكن لا يوجد تعريف صريح مبكر في النص.")
  } else {
    score = hasAnswerFirst ? 85 : 60
    if (!hasAnswerFirst) issues.push("لا توجد إجابة مباشرة في أول جملة — أهم موضع لنية البحث المعلوماتية ولمقتطفات الإجابة.")
  }

  // مكافأة التوافق مع النية عبر العناوين
  if (structure.h2Count >= 2) score = Math.min(100, score + 5)
  if (!hasAnswerFirst) issues.push("أول جملة طويلة جداً — اجعل أول 40-60 كلمة إجابة قائمة بذاتها.")

  return parts(score, [...evidence, `خطوات=${hasSteps} تعريف=${hasDefinition} إجابة مبكرة=${hasAnswerFirst}`], issues)
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) الحداثة وتقادم المحتوى
// ─────────────────────────────────────────────────────────────────────────────
export function scoreFreshness(input: ContentInput): ScoreParts {
  const now = input.now ?? new Date()
  const updatedDays = daysSince(input.updatedAt, now)
  const publishedDays = daysSince(input.publishedAt, now)
  const issues: string[] = []
  const evidence: string[] = []

  if (updatedDays === null) {
    return parts(0, ["لا يوجد تاريخ تحديث"], ["تاريخ التحديث (updatedAt) مفقود — لا يمكن قياس الحداثة ولا إثباتها للمحركات."])
  }

  evidence.push(`آخر تحديث قبل ${updatedDays} يوماً`)
  // المحتوى القانوني يفقد دقته بتغيّر التشريعات؛ 365 يوماً عتبة معقولة
  const freshness = invertScale(updatedDays, 90, 540)
  if (updatedDays > 365) issues.push(`المحتوى لم يُحدَّث منذ ${updatedDays} يوماً — راجع الإحالات التشريعية فقد تغيّرت.`)
  else if (updatedDays > 180) issues.push(`مرّ ${updatedDays} يوماً على آخر تحديث — راجع النصوص المُستشهد بها.`)

  // كشف التقادم: تاريخ نشر قديم + ذكر أرقام/سنوات
  const mentionsYears = /20\d{2}/g.test(input.body || "")
  const isStale = (publishedDays ?? 0) > 365 && !input.updatedAt
  if (isStale) issues.push("تاريخ النشر قديم ولا يوجد تاريخ تحديث — علامة تقادم واضحة.")
  if (mentionsYears && updatedDays > 270) issues.push("النص يذكر سنوات محددة ولم يُحدَّث مؤخراً — تحقق من صحة الأرقام والتواريخ.")

  return parts(freshness, evidence, issues)
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) E-E-A-T
// ─────────────────────────────────────────────────────────────────────────────
export function scoreEeat(input: ContentInput): ScoreParts {
  const evidence: string[] = []
  const issues: string[] = []

  const hasAuthor = Boolean(input.author?.trim())
  const officialLinks = (input.body || "").match(EXTERNAL_LINK_RE)?.filter((l) => AUTHORITATIVE_DOMAIN_RE.test(l)) || []
  const hasDisclaimer = /(ليست|لا يُعد|لا يعد|ليس استشاره|ليس استشارة|استشاره قانونيه|استشارة قانونية|التحقق من|الجهة الرسمية)/.test(input.body || "")
  const hasUpdateDate = Boolean(input.updatedAt)
  const hasSources = /(المصدر|المصادر|المراجع|راجع|انظر)/.test(input.body || "")

  evidence.push(`مؤلف=${hasAuthor} روابط رسمية=${officialLinks.length} إخلاء مسؤولية=${hasDisclaimer}`)

  // Experience + Expertise: مؤلف معلوم
  const authorScore = hasAuthor ? 100 : 0
  if (!hasAuthor) issues.push("لا يوجد اسم مؤلف — E-E-A-T يتطلب خبرة قابلة للنسب، خاصة في المحتوى القانوني (محتوى YMYL).")

  // Authoritativeness: إسناد رسمي
  const authorityScore = Math.min(officialLinks.length, 3) > 0 ? 100 : hasSources ? 45 : 0
  if (officialLinks.length === 0) issues.push("لا توجد روابط لمصادر رسمية (.gov.ma / عدالة / الجريدة الرسمية) — أساس المرجعية في المحتوى القانوني.")

  // Trustworthiness: إخلاء مسؤولية + تاريخ تحديث
  const trustScore = (hasDisclaimer ? 60 : 0) + (hasUpdateDate ? 40 : 0)
  if (!hasDisclaimer) issues.push("لا يوجد إخلاء مسؤولية يوضّح أن المحتوى تعليمي لا استشارة قانونية — ضروري لمحتوى YMYL.")
  if (!hasUpdateDate) issues.push("لا يوجد تاريخ تحديث ظاهر — إشارة ثقة أساسية.")

  const score = authorScore * 0.3 + authorityScore * 0.4 + trustScore * 0.3
  return parts(score, evidence, issues)
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) الثقة والمرجعية
// ─────────────────────────────────────────────────────────────────────────────
export function scoreTrust(input: ContentInput): ScoreParts {
  const links = (input.body || "").match(EXTERNAL_LINK_RE) || []
  const insecure = links.filter((l) => l.startsWith("http://"))
  const official = links.filter((l) => AUTHORITATIVE_DOMAIN_RE.test(l))
  const issues: string[] = []

  if (insecure.length) issues.push(`${insecure.length} رابط غير آمن (http://) — يكسر الثقة وقد يُحجب.`)
  if (links.length && official.length === 0) issues.push("روابط خارجية موجودة لكنها لا تشير إلى أي مصدر رسمي أو أكاديمي.")

  const secureScore = links.length ? (insecure.length === 0 ? 100 : 30) : 70
  const officialScore = official.length ? 100 : 40
  const score = secureScore * 0.5 + officialScore * 0.5

  return parts(score, [`${links.length} رابط خارجي، ${official.length} رسمي، ${insecure.length} غير آمن`], issues)
}

export function scoreAuthority(input: ContentInput): ScoreParts {
  const internal = (input.body || "").match(INTERNAL_LINK_RE) || []
  const external = (input.body || "").match(EXTERNAL_LINK_RE) || []
  const issues: string[] = []

  if (internal.length === 0) issues.push("لا توجد روابط داخلية — تفقد توزيع المرجعية وتُبقي الصفحة يتيمة سياقياً.")
  if (external.length === 0) issues.push("لا توجد روابط خارجية لمصادر — يقلل مصداقية النص كمرجع.")

  const internalScore = directScale(internal.length, 0, 4)
  const externalScore = directScale(external.length, 0, 2)
  const score = internalScore * 0.65 + externalScore * 0.35

  return parts(score, [`${internal.length} رابط داخلي، ${external.length} رابط خارجي`], issues)
}

// ─────────────────────────────────────────────────────────────────────────────
// 9) UX و CRO (بمعايير موقع تعليمي، لا تجاري)
// ─────────────────────────────────────────────────────────────────────────────
export function scoreUx(input: ContentInput): ScoreParts {
  const structure = analyzeBodyStructure(input.body)
  const metrics = analyzeText(structure.proseText)
  const issues: string[] = []

  const paragraphScore = structure.averageParagraphWords <= 90 ? 100 : invertScale(structure.averageParagraphWords, 90, 200)
  if (structure.averageParagraphWords > 120) issues.push("الفقرات طويلة على الشاشات الصغيرة — اهدف إلى 60-90 كلمة.")

  const headingScore = structure.h2Count >= 3 ? 100 : Math.round((structure.h2Count / 3) * 100)
  const scanningScore = structure.hasLists ? 100 : 40
  if (!structure.hasLists) issues.push("لا توجد قوائم — القوائم تجعل المحتوى قابلاً للمسح البصري.")

  const readingTimeScore = input.readingTime ? 100 : 50
  if (!input.readingTime) issues.push("زمن القراءة غير معروض — يقلل ثقة القارئ في حجم الالتزام.")

  const score = paragraphScore * 0.3 + headingScore * 0.3 + scanningScore * 0.25 + readingTimeScore * 0.15
  return parts(score, [`${structure.averageParagraphWords} كلمة/فقرة`, `${metrics.sentences} جملة`], issues)
}

export function scoreCro(input: ContentInput): ScoreParts {
  const issues: string[] = []
  const internal = (input.body || "").match(INTERNAL_LINK_RE) || []
  const hasCta = /(اقرأ|شاهد|تصفح|اطّلع|راجع|حمّل|حمِّل|اكتشف|ابدأ)/.test(input.body || "")

  if (!hasCta) issues.push("لا توجد دعوة لاتخاذ إجراء في نهاية المحتوى — أضف خطوة تالية واضحة.")
  if (internal.length === 0) issues.push("لا روابط لمحتوى ذي صلة — يقلل عمق الجلسة ومعدل التحويل إلى محتوى آخر.")

  const ctaScore = hasCta ? 100 : 20
  const relatedScore = directScale(internal.length, 0, 3)
  const score = ctaScore * 0.5 + relatedScore * 0.5

  return parts(score, [`دعوة إجراء=${hasCta}، ${internal.length} رابط داخلي`], issues)
}
