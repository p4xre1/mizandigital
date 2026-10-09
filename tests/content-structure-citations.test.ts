import { describe, expect, test } from "vitest"
import { analyzeBodyStructure, isQuestionHeading } from "../src/lib/seo/analyzers/text"
import { analyzeCitationPresentation, analyzeSourceQuality } from "../src/lib/seo/analyzers/sourceQuality"
import { analyzeAnswerFirstStructure, scoreAeo, scoreCitation } from "../src/lib/seo/scoring/aiScores"
import { parseArticleMarkdown } from "../src/lib/content/parseArticleMarkdown"

const OFFICIAL_LINK = "https://adala.justice.gov.ma/"

describe("AEO content structure", () => {
  test("detects skipped heading levels but accepts sequential and upward transitions", () => {
    const sequential = analyzeBodyStructure("## القسم الأول\n### الفرع الأول\n## القسم الثاني")
    expect(sequential.headingJumps).toHaveLength(0)

    const skipped = analyzeBodyStructure("## القسم الأول\n#### عنوان متجاوز\n### عنوان تالٍ")
    expect(skipped.headingJumps).toEqual([
      {
        fromLevel: 2,
        toLevel: 4,
        fromHeading: "القسم الأول",
        toHeading: "عنوان متجاوز",
      },
    ])
  })

  test("recognizes Arabic and English question-style headings", () => {
    expect(isQuestionHeading("### هل يمكن الطعن في القرار؟")).toBe(true)
    expect(isQuestionHeading("## كيف يُحسب التعويض؟")).toBe(true)
    expect(isQuestionHeading("## ما هي المسؤولية المدنية")).toBe(true)
    expect(isQuestionHeading("## الإطار القانوني")).toBe(false)
    expect(isQuestionHeading("## How does the appeal work?")).toBe(true)
  })

  test("distinguishes an answer-first definition from a preamble", () => {
    const direct = analyzeAnswerFirstStructure(
      "المسؤولية المدنية التقصيرية هي التزام قانوني بجبر الضرر الذي ينشأ عن فعل غير مشروع.\n\nوتتطلب قيامها أركاناً محددة."
    )
    expect(direct.hasDirectAnswer).toBe(true)
    expect(direct.hasDefinition).toBe(true)

    const preamble = analyzeAnswerFirstStructure(
      "في هذا المقال سنتناول بالتفصيل موضوع المسؤولية المدنية وأهم جوانبه القانونية والتطبيقية.\n\nثم نستعرض أمثلة متعددة."
    )
    expect(preamble.hasDirectAnswer).toBe(false)
    expect(analyzeAnswerFirstStructure("## قسم أول\nهذا نص مباشر لكنه يأتي بعد عنوان لا قبله.").hasDirectAnswer).toBe(false)

    const sectionAnswers = analyzeAnswerFirstStructure(
      "ينظم القانون هذه المسألة ويحدد شروطها وآثارها بصورة واضحة ومباشرة.\n## هل يمكن الطعن في القرار؟\nنعم، يجوز الطعن متى توافرت الشروط القانونية المحددة.\n## متى يسقط الحق؟\nسياق قصير بلا جواب مباشر."
    )
    expect(sectionAnswers.questionSections).toHaveLength(2)
    expect(sectionAnswers.answeredQuestionSections).toBe(1)

    const quoteFirst = analyzeAnswerFirstStructure(
      "## هل يمكن الطعن في القرار؟\n\n> «قول منقول لا يجيب بذاته عن السؤال المطروح.»\n\nنعم، يجوز الطعن متى توافرت الشروط القانونية المحددة."
    )
    expect(quoteFirst.questionSections[0].hasDirectAnswer).toBe(false)
  })

  test("AEO score reports hierarchy jumps and missing question headings", () => {
    const result = scoreAeo({
      title: "موضوع قانوني",
      slug: "legal-topic",
      body: "مقدمة قصيرة عن الموضوع تتضمن معلومة مباشرة ومفيدة للقارئ.\n## الإطار القانوني\n#### التفاصيل",
    })
    expect(result.issues.some((issue) => issue.includes("يقفز"))).toBe(true)
    expect(result.issues.some((issue) => issue.includes("أسئلة"))).toBe(true)
  })
})

describe("citations and attributed quotations", () => {
  test("detects a named outbound citation and a quote attributed to an authority", () => {
    const body = [
      `ينظم النص القانوني الموضوع، ويمكن مراجعة [النص الرسمي لدى بوابة عدالة](${OFFICIAL_LINK}) للتحقق من الصياغة النافذة.`,
      "> «نص مقتبس للتحقق من نسبة القول إلى مصدره الأصلي قبل النشر.»",
      `> — [محكمة النقض، القرار رقم 12](${OFFICIAL_LINK})`,
    ].join("\n")

    const result = analyzeCitationPresentation(body)
    expect(result.outboundLinks).toContain(OFFICIAL_LINK)
    expect(result.namedLinkedSources.length).toBeGreaterThan(0)
    expect(result.quotations).toHaveLength(1)
    expect(result.attributedQuoteCount).toBe(1)
  })

  test("does not treat a bare quote or an unnamed generic link as attributed evidence", () => {
    const body = [
      "راجع [هنا](https://example.com/reference) لمزيد من التفاصيل.",
      "> «قول منقول بلا اسم جهة أو مؤلف يوضح مصدره.»",
      "",
      "> «اقتباس آخر لم يوثق قائله أو مصدره حتى الآن.»",
      "> — اسم الجهة أو المؤلف، رابط المصدر",
    ].join("\n")
    const result = analyzeCitationPresentation(body)
    expect(result.namedLinkedSources).toHaveLength(0)
    expect(result.quotations).toHaveLength(2)
    expect(result.attributedQuoteCount).toBe(0)
  })

  test("does not count internal or image URLs as outbound citations", () => {
    const body = "[رابط داخلي](https://www.mizan.page/articles/guide) ![صورة رسمية](https://adala.justice.gov.ma/logo.png)"
    const result = analyzeCitationPresentation(body)
    expect(result.outboundLinks).toHaveLength(0)
    expect(result.namedLinkedSources).toHaveLength(0)

    const sourceQuality = analyzeSourceQuality(body, {
      explicitSource: "بوابة عدالة",
      explicitSourceUrl: "https://www.mizan.page/sources/justice",
    })
    expect(sourceQuality.sources).toHaveLength(0)
    expect(sourceQuality.hasPrimary).toBe(false)
  })

  test("source quality calls out missing named links and anonymous quotations", () => {
    const result = analyzeSourceQuality(
      `تذكر [هنا](https://example.com/source) معلومات مقتبسة: «هذا اقتباس مجهول المصدر وطويل بما يكفي للاختبار.»`
    )
    expect(result.issues.some((issue) => issue.includes("اسم مصدر واضح"))).toBe(true)
    expect(result.issues.some((issue) => issue.includes("اقتباس بلا نسبة"))).toBe(true)
    expect(result.evidence.some((entry) => entry.includes("اقتباسات منسوبة"))).toBe(true)
  })

  test("citation score recommends named external sources and attributed authorities", () => {
    const result = scoreCitation({
      title: "موضوع قانوني",
      slug: "legal-topic",
      body: "لا توجد مراجع أو اقتباسات موثقة في هذا النص حتى الآن.",
    })
    expect(result.issues.some((issue) => issue.includes("مصدر مسمّى"))).toBe(true)
    expect(result.issues.some((issue) => issue.includes("اقتباس مباشر"))).toBe(true)
  })
})

describe("article markdown semantics", () => {
  test("preserves H4-H6 levels and parses blockquote attribution separately", () => {
    const parsed = parseArticleMarkdown(
      `## عنوان رئيسي\n#### عنوان ذو قفزة\n\n> «اقتباس قانوني موثق ينبغي أن يعرض قائله بصورة واضحة.»\n> — [المحكمة الدستورية](${OFFICIAL_LINK})`
    )

    expect(parsed.toc.map((entry) => entry.level)).toEqual([2, 4])
    const quote = parsed.blocks.find((block) => block.type === "quote")
    expect(quote).toMatchObject({ type: "quote", attribution: `[المحكمة الدستورية](${OFFICIAL_LINK})` })
  })
})
