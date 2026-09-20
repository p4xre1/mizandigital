/**
 * اختبارات محرك السيو والتحسين: المحللات، التقييم، المولّدات، الفحوص
 * التقنية، وسجلّ القدرات.
 */
import { describe, expect, test } from "vitest"

import {
  analyzeBodyStructure,
  analyzeText,
  keywordDensity,
  normalizeArabic,
  readabilityScore,
  tokenize,
} from "../src/lib/seo/analyzers/text"
import { entityScore, extractEntities, semanticScore } from "../src/lib/seo/analyzers/entities"
import { findDuplicates, jaccard, originalityScore, shingles } from "../src/lib/seo/analyzers/duplicate"
import { scoreAeo, scoreAiVisibility, scoreCitation, scoreGeo } from "../src/lib/seo/scoring/aiScores"
import {
  classifyIntent,
  scoreContentDepth,
  scoreEeat,
  scoreOnPageSeo,
  scoreSearchIntent,
  scoreFreshness,
} from "../src/lib/seo/scoring/contentScores"
import { averageOf, scoreContent } from "../src/lib/seo/scoring/index"
import { aggregate } from "../src/lib/seo/scoring/aggregate"
import { SCORE_WEIGHTS, SUB_SCORE_KEYS, totalWeight } from "../src/lib/seo/scoring/weights"
import { CAPABILITIES, capabilityStats, capabilitiesByCluster, CLUSTERS } from "../src/lib/seo/registry/capabilities"
import { generateTitles, generateMetaDescription, optimizeHeadline } from "../src/lib/seo/generators/title"
import { generateFaq, generateDirectAnswer, extractQuestions } from "../src/lib/seo/generators/faq"
import { generateCitations, optimizeForCitation, validateCitations } from "../src/lib/seo/generators/citation"
import { articleTargets, lexiconTargets, suggestInternalLinks } from "../src/lib/seo/generators/internalLinks"
import { generateContentBrief, suggestExpansions } from "../src/lib/seo/generators/brief"
import { checkNewsFreshness, evaluateRefresh } from "../src/lib/seo/generators/refresh"
import { scoreCoreWebVitals, scoreLlmProbe } from "../src/lib/seo/adapters/index"

import {
  aggregateTechnical,
  checkAccessibility,
  checkAiDiscoveryFiles,
  checkHreflang,
  checkHtmlHead,
  checkImages,
  checkRobots,
  checkRobotsAiAccess,
  checkSecurityHeaders,
  checkSitemap,
  checkStructuredData,
  checkUrlStructure,
  extractLinks,
  findOrphanPages,
} from "../shared/seo/technical-checks.js"

// ─────────────────────────────────────────────────────────────────────────────
// نص مرجعي واقعي (قانوني مغربي)
// ─────────────────────────────────────────────────────────────────────────────
const SAMPLE_BODY = [
  "تُعد المسؤولية التقصيرية من أهم مؤسسات القانون المدني المغربي، ويقوم أساسها على الفصل 77 من قانون الالتزامات والعقود.",
  "## أركان المسؤولية التقصيرية",
  "يتطلب قيام المسؤولية التقصيرية توافر ثلاثة أركان، هي الخطأ والضرر والعلاقة السببية بينهما.",
  "## الركن الأول: الخطأ",
  "يُعرَّف الخطأ بأنه إخلال بواجب قانوني أو اجتماعي، وقد يكون فعلاً إيجابياً أو امتناعاً عن فعل كان واجباً.",
  "## الركن الثاني: الضرر",
  "الضرر هو الأذى الذي يصيب الشخص في حق من حقوقه أو في مصلحة مشروعة له، ويشمل الضرر المادي والمعنوي.",
  "## الركن الثالث: العلاقة السببية",
  "يجب أن يكون الخطأ هو السبب المباشر في حدوث الضرر، وإلا انتفت المسؤولية.",
  "### تطبيقات قضائية",
  "وفقاً لاجتهاد محكمة النقض، تُقدَّر العلاقة السببية بمعيار السبب الملائم لا بمجرد التسلسل الزمني.",
  "## أسئلة شائعة",
  "ما هو التقادم في دعوى المسؤولية؟، يسقط الحق في دعوى المسؤولية التقصيرية بمضي خمس سنوات من يوم العلم بالضرر.",
  "راجع النص النافذ على بوابة عدالة: https://adala.justice.gov.ma/ للاطلاع على الصيغة الرسمية للفصل 77.",
  "اقرأ أيضاً: منهجية قراءة النص القانوني /articles/manhajiyat-qiraat-nass-qanuni",
].join(",")

const SAMPLE = {
  title: "مفاهيم أساسية في المسؤولية المدنية التقصيرية",
  slug: "mafhum-al-masuuliya-al-madaniya-al-qusuria",
  body: SAMPLE_BODY,
  excerpt: "دليل مبسّط لفهم أركان المسؤولية المدنية: الخطأ، الضرر، والعلاقة السببية.",
  category: "القانون المدني",
  publishedAt: "2026-08-01",
  updatedAt: "2026-09-01",
  author: "فريق ميزان الرقمية",
  readingTime: "7 دقائق",
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) المحللات النصية
// ─────────────────────────────────────────────────────────────────────────────
describe("analyzers/text", () => {
  test("normalizeArabic يوحّد الهمزات والتاء المربوطة", () => {
    expect(normalizeArabic("إقامة")).toBe(normalizeArabic("اقامه"))
    expect(normalizeArabic("قانون")).toBe("قانون")
  })

  test("tokenize يحسب الكلمات بعد إزالة الترقيم", () => {
    expect(tokenize("الفصل 77 من القانون.")).toContain("الفصل")
    expect(tokenize("")).toHaveLength(0)
  })

  test("analyzeText يحسب المقاييس الأساسية", () => {
    const metrics = analyzeText(SAMPLE_BODY, ",")
    expect(metrics.words).toBeGreaterThan(50)
    expect(metrics.wordsPerSentence).toBeGreaterThan(0)
    expect(metrics.arabicCharRatio).toBeGreaterThan(0.5)
  })

  test("readabilityScore يقع في 0-100 ويفضّل الجمل القصيرة", () => {
    const short = analyzeText("هذه جملة قصيرة. وهذه أخرى قصيرة.")
    const long = analyzeText(
      "هذه جملة طويلة جداً تحتوي على كثير من العبارات الاعتراضية والتفصيلات الفرعية التي تجعل قراءتها صعبة على القارئ العادي وتتطلب منه العودة إلى بدايتها أكثر من مرة لفهم المعنى المقصود منها بشكل كامل ودقيق."
    )
    expect(readabilityScore(short)).toBeGreaterThan(readabilityScore(long))
    expect(readabilityScore(short)).toBeLessThanOrEqual(100)
  })

  test("keywordDensity يحتسب التطابقات الجزئية (العربية تصريفية)", () => {
    const density = keywordDensity("القانون وقوانين وقانوني", "قانون")
    expect(density).toBeGreaterThan(50)
  })

  test("analyzeBodyStructure يميّز العناوين من الفقرات", () => {
    const structure = analyzeBodyStructure(SAMPLE_BODY)
    expect(structure.h2Count).toBeGreaterThanOrEqual(4)
    expect(structure.h3Count).toBeGreaterThanOrEqual(1)
    expect(structure.paragraphCount).toBeGreaterThan(3)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2) الكيانات والدلالة
// ─────────────────────────────────────────────────────────────────────────────
describe("analyzers/entities", () => {
  test("يستخرج الفصول والمواد", () => {
    const metrics = analyzeText(SAMPLE_BODY, ",")
    const report = extractEntities(SAMPLE_BODY, metrics.words)
    expect(report.byKind["legal-article"]).toBeGreaterThan(0)
    expect(report.entities.some((e) => e.value.includes("الفصل 77"))).toBe(true)
  })

  test("يكشف المصدر الرسمي", () => {
    const report = extractEntities(SAMPLE_BODY, 100)
    expect(report.hasOfficialSource).toBe(true)
  })

  test("يستخرج المفاهيم القانونية", () => {
    const report = extractEntities(SAMPLE_BODY, 100)
    expect(report.byKind.concept).toBeGreaterThan(2)
  })

  test("entityScore يعطي نتيجة أعلى لنص غني بالكيانات", () => {
    const metrics = analyzeText(SAMPLE_BODY, ",")
    const rich = extractEntities(SAMPLE_BODY, metrics.words)
    const poor = extractEntities("نص عام بلا أي إحالة أو مفهوم محدد.", 20)
    expect(entityScore(rich, metrics.words)).toBeGreaterThan(entityScore(poor, 20))
  })

  test("semanticScore يعاقب كثافة الكيانات المنخفضة", () => {
    const low = semanticScore({ byKind: { concept: 0, "legal-article": 0, law: 0, court: 0, institution: 0, place: 0 }, density: 0, entities: [], uniqueCount: 0, totalCount: 0, sourcedCount: 0, hasOfficialSource: false }, { h2Count: 0, h3Count: 0 }, 500)
    expect(low).toBeLessThan(40)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3) التكرار والأصالة
// ─────────────────────────────────────────────────────────────────────────────
describe("analyzers/duplicate", () => {
  const textA = "المسؤولية التقصيرية تقوم على الخطأ والضرر والعلاقة السببية بين الخطأ والضرر الواقع"
  const textB = "المسؤولية التقصيرية تقوم على الخطأ والضرر والعلاقة السببية بين الخطأ والضرر الواقع"
  const textC = "دليل كليات الحقوق بالمغرب يضم معلومات التسجيل والوحدات الدراسية لكل كلية"

  test("shingles و jaccard يكشفان التطابق", () => {
    expect(jaccard(shingles(textA), shingles(textB))).toBe(1)
    expect(jaccard(shingles(textA), shingles(textC))).toBeLessThan(0.2)
  })

  test("findDuplicates يبلّغ عن الصفحات المتطابقة", () => {
    const report = findDuplicates({ a: textA, b: textB, c: textC }, 0.25)
    expect(report.hasDuplicates).toBe(true)
    expect(report.pairs[0].similarity).toBeGreaterThan(0.9)
  })

  test("originalityScore ينخفض مع ارتفاع التشابه", () => {
    expect(originalityScore(0.05)).toBe(100)
    expect(originalityScore(0.55)).toBe(0)
    expect(originalityScore(0.3)).toBeLessThan(originalityScore(0.15))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4) التقييم
// ─────────────────────────────────────────────────────────────────────────────
describe("scoring", () => {
  test("مجموع الأوزان = 1.00 بالضبط", () => {
    expect(totalWeight()).toBeCloseTo(1, 10)
    expect(SUB_SCORE_KEYS).toHaveLength(18)
  })

  test("كل مفتاح وزن له تسمية", () => {
    for (const key of SUB_SCORE_KEYS) expect(SCORE_WEIGHTS[key]).toBeGreaterThan(0)
  })

  test("aggregate ينتج نتيجة 0-1000", () => {
    const result = scoreContent(SAMPLE, { duplicateSimilarity: 0.05, now: new Date("2026-09-11") })
    expect(result.overall).toBeGreaterThanOrEqual(0)
    expect(result.overall).toBeLessThanOrEqual(1000)
    expect(result.subScores).toHaveLength(18)
  })

  test("المحتوى الغني يسجّل أعلى من المحتوى الضعيف", () => {
    const weak = {
      title: "نص",
      slug: "weak",
      body: "كلام عام.",
      publishedAt: "2026-08-01",
    }
    const rich = scoreContent(SAMPLE, { duplicateSimilarity: 0.05, now: new Date("2026-09-11") })
    const poor = scoreContent(weak, { duplicateSimilarity: 0.05, now: new Date("2026-09-11") })
    expect(rich.overall).toBeGreaterThan(poor.overall)
  })

  test("المقياس غير المتاح لا يُعاد توزيع وزنه بل يُبلَّغ عنه", () => {
    const result = scoreContent(SAMPLE, { duplicateSimilarity: 0.05, now: new Date("2026-09-11") })
    expect(result.unmeasurableWeight).toBeGreaterThan(0)
    expect(result.subScores.filter((s) => s.status === "adapter-required").length).toBeGreaterThan(0)
  })

  test("topIssues مرتّبة حسب الأثر", () => {
    const result = scoreContent({ ...SAMPLE, body: "قصير" }, { now: new Date("2026-09-11") })
    expect(result.topIssues.length).toBeGreaterThan(0)
    expect(result.topIssues.length).toBeLessThanOrEqual(5)
  })

  test("averageOf يتجاهل القيم غير الصالحة", () => {
    expect(averageOf([80, 60])).toBe(70)
    expect(averageOf([])).toBe(0)
    expect(averageOf([NaN, 50])).toBe(50)
  })
})

describe("scoring/contentScores", () => {
  test("classifyIntent يصنّف النية", () => {
    expect(classifyIntent("كيف تبني خطة مراجعة قانونية؟")).toBe("how-to")
    expect(classifyIntent("ما هو التقادم؟")).toBe("definitional")
    expect(classifyIntent("مستجدات قانونية")).toBe("informational")
  })

  test("scoreOnPageSeo يعاقب العنوان القصير", () => {
    const bad = scoreOnPageSeo({ ...SAMPLE, title: "نص" })
    expect(bad.score).toBeLessThan(scoreOnPageSeo(SAMPLE).score)
    expect(bad.issues.some((i) => i.includes("العنوان"))).toBe(true)
  })

  test("scoreSearchIntent يكتشف عدم تطابق العنوان مع المحتوى", () => {
    const mismatch = scoreSearchIntent({
      ...SAMPLE,
      title: "كيف تفعل الشيء؟",
      body: "نص وصفي بلا خطوات ولا ترقيم إطلاقاً.",
    })
    expect(mismatch.issues.some((i) => i.includes("خطوات"))).toBe(true)
  })

  test("scoreEeat يطلب المؤلف والإسناد وإخلاء المسؤولية", () => {
    const noAuthor = scoreEeat({ ...SAMPLE, author: undefined })
    expect(noAuthor.issues.some((i) => i.includes("مؤلف"))).toBe(true)
    expect(noAuthor.score).toBeLessThan(scoreEeat(SAMPLE).score)
  })

  test("scoreFreshness يعاقب المحتوى القديم", () => {
    const stale = scoreFreshness({ ...SAMPLE, updatedAt: "2020-01-01" }, )
    const fresh = scoreFreshness({ ...SAMPLE, updatedAt: "2026-09-01" })
    expect(stale.score).toBeLessThan(fresh.score)
  })

  test("scoreFreshness يبلغ عن غياب تاريخ التحديث", () => {
    const result = scoreFreshness({ ...SAMPLE, updatedAt: undefined })
    expect(result.score).toBe(0)
    expect(result.issues.length).toBeGreaterThan(0)
  })

  test("scoreContentDepth يطلب العمق والبنية", () => {
    const thin = scoreContentDepth({ ...SAMPLE, body: "فقرة واحدة قصيرة." })
    expect(thin.score).toBeLessThan(scoreContentDepth(SAMPLE).score)
  })
})

describe("scoring/aiScores", () => {
  test("scoreAeo يكافئ الإجابة المباشرة والعناوين السؤالية", () => {
    const result = scoreAeo({ ...SAMPLE, faqs: [{ question: "س؟", answer: "ج" }] })
    expect(result.score).toBeGreaterThan(0)
  })

  test("scoreAeo يعاقب غياب الأسئلة الشائعة", () => {
    expect(scoreAeo({ ...SAMPLE, faqs: [] }).issues.some((i) => i.includes("الأسئلة الشائعة"))).toBe(true)
  })

  test("scoreGeo يقيس الفقرات المكتفية ذاتياً والحقائق", () => {
    const result = scoreGeo(SAMPLE)
    expect(result.evidence.some((e) => e.includes("مكتفية ذاتياً"))).toBe(true)
    expect(result.score).toBeGreaterThan(0)
  })

  test("scoreCitation يطلب رابطاً قانونياً", () => {
    const noUrl = scoreCitation({ ...SAMPLE, canonicalUrl: undefined })
    expect(noUrl.issues.some((i) => i.includes("canonical"))).toBe(true)
    const withUrl = scoreCitation({ ...SAMPLE, canonicalUrl: "https://www.mizan.page/articles/x" })
    expect(withUrl.score).toBeGreaterThan(noUrl.score)
  })

  test("scoreAiVisibility يكافئ اكتمال ملفات الاكتشاف", () => {
    const complete = scoreAiVisibility({
      hasLlmsTxt: true,
      llmsTxtIsMarkdown: true,
      hasAiCatalog: true,
      hasAgentCard: true,
      hasMcpEndpoint: true,
      mcpToolCount: 2,
      schemaTypes: ["Organization", "WebSite", "Article", "FAQPage"],
      robotsAllowsAiBots: true,
    })
    expect(complete.score).toBe(100)

    const broken = scoreAiVisibility({
      hasLlmsTxt: true,
      llmsTxtIsMarkdown: false,
      hasAiCatalog: false,
      hasAgentCard: false,
      hasMcpEndpoint: false,
      mcpToolCount: 0,
      schemaTypes: [],
      robotsAllowsAiBots: true,
    })
    expect(broken.score).toBeLessThan(complete.score)
    expect(broken.issues.some((i) => i.includes("llms.txt"))).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5) الفحوص التقنية
// ─────────────────────────────────────────────────────────────────────────────
describe("technical-checks", () => {
  const PAGE = `<!doctype html><html lang="ar-MA" dir="rtl"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>عنوان الصفحة التجريبية للفحص التقني الكامل</title>
    <meta name="description" content="صفحة اختبار لفحوص الرأس: عنوان ووصف ووسوم Open Graph وcanonical على النطاق القانوني، تُستعمل للتأكد من أن الفاحص يمرّ على الصفحة المكتملة ويكشف الناقص منها.">
    <link rel="canonical" href="https://www.mizan.page/test">
    <meta property="og:title" content="x"><meta property="og:description" content="x">
    <meta property="og:image" content="x"><meta property="og:url" content="x">
    <meta property="og:type" content="website"><meta property="og:locale" content="ar_MA">
    <meta name="twitter:card" content="summary"><meta name="twitter:title" content="x">
    <meta name="twitter:description" content="x"><meta name="twitter:image" content="x">
    <script type="application/ld+json">{"@type":"Article","headline":"x"}</script>
  </head><body><header></header><main>
    <h1>العنوان</h1>
    <img src="/a.webp" alt="صورة" width="10" height="10" loading="lazy">
    <a href="/articles">المقالات</a><a href="https://adala.justice.gov.ma">عدالة</a>
  </main></body></html>`

  test("checkHtmlHead يمر على صفحة مكتملة", () => {
    const result = checkHtmlHead(PAGE, { url: "https://www.mizan.page/test" })
    expect(result.score).toBe(100)
    expect(result.issues).toHaveLength(0)
  })

  test("checkHtmlHead يكشف canonical غير المطابق", () => {
    const result = checkHtmlHead(PAGE, { url: "https://www.mizan.page/other" })
    expect(result.issues.some((i) => i.includes("canonical"))).toBe(true)
  })

  test("checkStructuredData يقرأ محتوى JSON-LD (لا وسم الفتح فقط)", () => {
    const result = checkStructuredData(PAGE)
    expect(result.score).toBeGreaterThan(0)
    expect(result.details.join()).toContain("Article")
  })

  test("checkStructuredData يكشف JSON غير صالح", () => {
    const broken = `<script type="application/ld+json">{invalid json</script>`
    const result = checkStructuredData(broken)
    expect(result.issues.some((i) => i.includes("غير صالحة"))).toBe(true)
  })

  test("checkStructuredData يبلّغ عن غياب البيانات المنظمة", () => {
    expect(checkStructuredData("<html><body>x</body></html>").issues.length).toBeGreaterThan(0)
  })

  test("checkImages يكشف alt الناقص وCLS", () => {
    const result = checkImages(`<img src="/a.png"><img src="/b.webp" alt="ok" width="1" height="1" loading="lazy">`)
    expect(result.issues.some((i) => i.includes("alt"))).toBe(true)
    expect(result.issues.some((i) => i.includes("CLS"))).toBe(true)
  })

  test("checkRobots يكشف الخريطة والحجب الكامل", () => {
    expect(checkRobots("User-agent: *\nDisallow: /\n", {}).issues.some((i) => i.includes("بالكامل"))).toBe(true)
    const good = checkRobots("User-agent: *\nAllow: /\nSitemap: https://www.mizan.page/sitemap.xml\n", {
      siteUrl: "https://www.mizan.page",
    })
    expect(good.pass).toBe(true)
  })

  test("checkSitemap يكشف الروابط المكررة والنسبية", () => {
    const dupes = `<urlset><url><loc>https://x.page/a</loc></url><url><loc>https://x.page/a</loc></url><url><loc>/b</loc></url></urlset>`
    const result = checkSitemap(dupes, [], { siteUrl: "https://x.page" })
    expect(result.issues.some((i) => i.includes("مكرر"))).toBe(true)
    expect(result.issues.some((i) => i.includes("نسبي"))).toBe(true)
  })

  test("checkSitemap يكشف المسارات الناقصة", () => {
    const xml = `<urlset><url><loc>https://x.page/a</loc></url></urlset>`
    const result = checkSitemap(xml, ["/a", "/missing"], { siteUrl: "https://x.page" })
    expect(result.issues.some((i) => i.includes("/missing"))).toBe(true)
  })

  test("checkUrlStructure يفك الترميز قبل الحكم على الأحرف الكبيرة", () => {
    // رابط عربي مُرمَّز: أحرف الستّ عشرية الكبيرة ليست "أحرف كبيرة" حقيقية
    const encoded = "/news/%D8%B5%D8%AF%D9%88%D8%B1"
    const result = checkUrlStructure([encoded])
    expect(result.issues.some((i) => i.includes("أحرف كبيرة"))).toBe(false)

    const realUppercase = checkUrlStructure(["/Articles/Test"])
    expect(realUppercase.issues.some((i) => i.includes("أحرف كبيرة"))).toBe(true)
  })

  test("findOrphanPages يكشف الصفحات بلا رابط داخلي", () => {
    const result = findOrphanPages(["/", "/articles", "/orphan"], ["/", "/articles"])
    expect(result.orphans).toEqual(["/orphan"])
  })

  test("extractLinks يفصل الداخلي من الخارجي ويكشف http", () => {
    const { internal, external, issues } = extractLinks(
      `<a href="/articles">داخلي</a><a href="https://ext.example">خارجي</a><a href="http://bad.example">غير آمن</a>`,
      { origin: "https://www.mizan.page" }
    )
    expect(internal).toContain("/articles")
    expect(external).toContain("https://ext.example")
    expect(issues.some((i) => i.includes("غير آمن"))).toBe(true)
  })

  test("checkHreflang يقبل موقع اللغة الواحدة", () => {
    expect(checkHreflang([], { expectSingleLanguage: true }).pass).toBe(true)
  })

  test("checkSecurityHeaders يكشف الترويسة الناقصة", () => {
    const partial = "/*\n  X-Content-Type-Options: nosniff\n"
    expect(checkSecurityHeaders(partial).pass).toBe(false)
  })

  test("checkAccessibility يطلب H1 واحداً والمعالم", () => {
    expect(checkAccessibility("<html><body><h1>a</h1><h1>b</h1></body></html>").issues.some((i) => i.includes("H1"))).toBe(true)
    expect(checkAccessibility(PAGE).pass).toBe(true)
  })

  test("checkAiDiscoveryFiles يكشف llms.txt الذي يحتوي كوداً", () => {
    // هذا هو الخطأ الحقيقي الذي كان موجوداً في المستودع
    const broken = checkAiDiscoveryFiles([
      { path: "llms.txt", content: 'import { readFile } from "node:fs/promises";\nconst x = 1;' },
      { path: ".well-known/ai-catalog.json", content: "{}" },
      { path: ".well-known/agent-card.json", content: "{}" },
    ])
    expect(broken.issues.some((i) => i.includes("كود مصدر"))).toBe(true)
  })

  test("checkAiDiscoveryFiles يقبل Markdown صالحاً", () => {
    const good = checkAiDiscoveryFiles([
      { path: "llms.txt", content: "# الموقع\n\n> وصف\n\n- [رابط](https://x.page/a)\n" },
      { path: ".well-known/ai-catalog.json", content: "{}" },
      { path: ".well-known/agent-card.json", content: "{}" },
    ])
    expect(good.pass).toBe(true)
  })

  test("checkRobotsAiAccess يكشف حجب زواحف الذكاء الاصطناعي", () => {
    expect(checkRobotsAiAccess("User-agent: GPTBot\nDisallow: /\n").allows).toBe(false)
    expect(checkRobotsAiAccess("User-agent: *\nAllow: /\n").allows).toBe(true)
  })

  test("aggregateTechnical يجمع بالترجيح", () => {
    const result = aggregateTechnical({
      robots: { score: 100, issues: [] },
      sitemap: { score: 0, issues: ["مشكلة"] },
    })
    expect(result.score).toBeGreaterThan(0)
    expect(result.score).toBeLessThan(100)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6) المولّدات
// ─────────────────────────────────────────────────────────────────────────────
describe("generators", () => {
  test("generateTitles ينتج بدائل في النطاق المثالي", () => {
    const titles = generateTitles("مفاهيم المسؤولية التقصيرية", { focusKeyword: "المسؤولية" })
    expect(titles.length).toBeGreaterThan(1)
    expect(titles[0].score).toBeGreaterThanOrEqual(titles[titles.length - 1].score)
  })

  test("generateMetaDescription يبني وصفاً من النص الموجود", () => {
    const result = generateMetaDescription({ excerpt: SAMPLE.excerpt })
    expect(result.description.length).toBeGreaterThan(20)
    expect(result.description.length).toBeLessThanOrEqual(170)
  })

  test("generateMetaDescription يبلغ عن الوصف القصير", () => {
    const result = generateMetaDescription({ excerpt: "قصير" })
    expect(result.warnings.some((w) => w.includes("قصير"))).toBe(true)
  })

  test("optimizeHeadline يقترح زوايا مختلفة", () => {
    const variants = optimizeHeadline("المسؤولية التقصيرية")
    expect(variants.length).toBeGreaterThanOrEqual(3)
    expect(new Set(variants.map((v) => v.angle)).size).toBeGreaterThan(2)
  })

  test("extractQuestions يستخرج الأسئلة من النص", () => {
    const questions = extractQuestions(SAMPLE_BODY)
    expect(questions.some((q) => q.includes("التقادم"))).toBe(true)
  })

  test("generateFaq يبني إجابات من النص لا من الخيال", () => {
    const faqs = generateFaq(SAMPLE_BODY, { maxItems: 4 })
    expect(faqs.length).toBeGreaterThan(0)
    // كل إجابة يجب أن تكون مقتطعة من النص الأصلي
    for (const faq of faqs) {
      expect(SAMPLE_BODY).toContain(faq.answer.replace(/[.…]$/, "").slice(0, 20))
    }
  })

  test("generateDirectAnswer يقترح إجابة مباشرة", () => {
    const result = generateDirectAnswer(SAMPLE_BODY)
    expect(result.answer.length).toBeGreaterThan(10)
  })

  test("generateCitations ينتج صيغاً متعددة", () => {
    const citations = generateCitations({
      title: "المسؤولية التقصيرية",
      url: "https://www.mizan.page/articles/x",
      publishedAt: "2026-08-01",
    })
    expect(citations.apa).toContain("2026")
    expect(citations.mla).toContain("mizan.page")
    expect(citations.bibtex).toContain("@misc")
  })

  test("validateCitations يكشف الادعاءات بلا سند", () => {
    const result = validateCitations("ارتفعت النسبة إلى 45 بالمئة دون ذكر أي مصدر أو مرجع رسمي")
    expect(result.issues.length).toBeGreaterThan(0)
  })

  test("optimizeForCitation يقترح تحسينات ملموسة", () => {
    const suggestions = optimizeForCitation("نص عام بلا إحالات وبلا روابط وبلا أرقام", {
      url: "https://x.page",
      title: "t",
    })
    expect(suggestions.length).toBeGreaterThan(0)
  })

  test("suggestInternalLinks يقترح روابط لصفحات موجودة فقط", () => {
    const targets = [
      ...lexiconTargets([{ term_ar: "المسؤولية التقصيرية", id: 1, slug: "al-masuuliya" }]),
      ...articleTargets([{ slug: "manhajiyat", title: "منهجية قراءة النص القانوني" }]),
    ]
    const suggestions = suggestInternalLinks(SAMPLE_BODY, targets, { currentSlug: "current" })
    expect(suggestions.length).toBeGreaterThan(0)
    for (const s of suggestions) {
      expect(s.target.path.startsWith("/")).toBe(true)
      expect(SAMPLE_BODY.replace(/\s+/g, "")).toContain(s.anchor.replace(/\s+/g, ""))
    }
  })

  test("generateContentBrief ينتج هيكلاً حسب النية", () => {
    const howTo = generateContentBrief("خطة المراجعة", { title: "كيف تبني خطة مراجعة؟" })
    expect(howTo.intent).toBe("how-to")
    expect(howTo.outline.length).toBeGreaterThan(3)
    expect(howTo.acceptanceCriteria.length).toBeGreaterThan(5)

    const definitional = generateContentBrief("التقادم", { title: "ما هو التقادم؟" })
    expect(definitional.intent).toBe("definitional")
    expect(definitional.schemaTypes).toContain("DefinedTerm")
  })

  test("suggestExpansions يقترح محاور ناقصة", () => {
    const result = suggestExpansions({ body: "", wordCount: 200, h2Count: 1, hasLists: false, hasFaq: false, legalRefs: 0, targetWords: 800 })
    expect(result.length).toBeGreaterThanOrEqual(3)
  })

  test("evaluateRefresh يرتّب الأولوية حسب العمر والبنية", () => {
    const stale = evaluateRefresh({ slug: "a", title: "قديم", body: "نص قصير يذكر 2019", publishedAt: "2019-01-01", now: new Date("2026-09-11") })
    const fresh = evaluateRefresh({ slug: "b", title: "حديث", body: SAMPLE_BODY, updatedAt: "2026-09-01", now: new Date("2026-09-11") })
    expect(stale.priority).toBeGreaterThan(fresh.priority)
    expect(stale.reasons.some((r) => r.includes("2019"))).toBe(true)
  })

  test("checkNewsFreshness يحدد الأخبار المتقادمة", () => {
    const result = checkNewsFreshness(
      [{ id: "1", title: "قديم", date: "2024-01-01" }, { id: "2", title: "حديث", date: "2026-09-01" }],
      { now: new Date("2026-09-11") }
    )
    expect(result[0].stale).toBe(true)
    expect(result[1].stale).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 7) المحوّلات (معطّلة بلا مفاتيح)
// ─────────────────────────────────────────────────────────────────────────────
describe("adapters", () => {
  test("scoreCoreWebVitals يطبّق عتبات Google", () => {
    expect(scoreCoreWebVitals(null).score).toBe(0)
    const good = scoreCoreWebVitals({ lcpMs: 1500, inpMs: 100, cls: 0.05, fcpMs: 800, ttfbMs: 200, origin: "x" })
    expect(good.score).toBe(100)
    const bad = scoreCoreWebVitals({ lcpMs: 6000, inpMs: 900, cls: 0.5, fcpMs: 4000, ttfbMs: 2000, origin: "x" })
    expect(bad.score).toBeLessThan(good.score)
    expect(bad.issues.length).toBe(3)
  })

  test("scoreLlmProbe يحسب نسبة الاستشهاد", () => {
    expect(scoreLlmProbe(null).score).toBe(0)
    const result = scoreLlmProbe([
      { query: "a", mentioned: true, cited: true, model: "m" },
      { query: "b", mentioned: false, cited: false, model: "m" },
    ])
    expect(result.score).toBe(50)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 8) سجلّ القدرات
// ─────────────────────────────────────────────────────────────────────────────
describe("registry", () => {
  test("كل معرّف فريد", () => {
    const ids = CAPABILITIES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test("كل بند implemented له backedBy حقيقي", () => {
    const missing = CAPABILITIES.filter((c) => c.status === "implemented" && !c.backedBy)
    expect(missing.map((c) => c.id)).toEqual([])
  })

  test("كل بند not-applicable مبرَّر", () => {
    const missing = CAPABILITIES.filter((c) => c.status === "not-applicable" && !c.note)
    expect(missing.map((c) => c.id)).toEqual([])
  })

  test("كل بند ينتمي إلى مجموعة معروفة", () => {
    for (const capability of CAPABILITIES) expect(CLUSTERS).toContain(capability.cluster)
  })

  test("المجموعات الثماني كلها مغطاة", () => {
    for (const cluster of CLUSTERS) expect(capabilitiesByCluster(cluster).length).toBeGreaterThan(0)
  })

  test("الإحصاء يجمع كل البنود", () => {
    const stats = capabilityStats()
    const total = Object.values(stats).reduce((a, b) => a + b, 0)
    expect(total).toBe(CAPABILITIES.length)
  })

  test("المقاييس الثمانية عشر كلها في السجل", () => {
    const scoringCluster = capabilitiesByCluster("scoring")
    expect(scoringCluster.length).toBeGreaterThanOrEqual(19)
    expect(scoringCluster.some((c) => c.id === "score-overall")).toBe(true)
  })
})
