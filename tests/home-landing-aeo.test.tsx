/**
 * الصفحة الرئيسية: بنية العناوين والإجابة المباشرة والاستشهاد.
 *
 * تربط هذه الاختبارات الإصلاحات بالمعايير نفسها التي يقيسها المدقّق
 * (analyzeBodyStructure / isQuestionHeading / analyzeAnswerFirstStructure /
 * analyzeCitationPresentation) حتى لا تعود الصفحة إلى الحالة السابقة بصمت.
 */
import { readFileSync } from "node:fs"
import { renderToStaticMarkup } from "react-dom/server"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, test } from "vitest"
import lexicon from "@/data/lexicon.client.json"
import { HomeLexiconShowcase } from "@/components/home/HomeLexiconShowcase"
import { HomeFaqSection } from "@/components/home/HomeFaqSection"
import { pickTreeTerms } from "@/lib/lexicon/treeTerms"
import { analyzeBodyStructure, isQuestionHeading } from "@/lib/seo/analyzers/text"
import { analyzeCitationPresentation } from "@/lib/seo/analyzers/sourceQuality"
import { analyzeAnswerFirstStructure } from "@/lib/seo/scoring/aiScores"

const HOME = readFileSync("src/pages/public/HomePage.tsx", "utf8")
const PRERENDER = readFileSync("scripts/prerender.mjs", "utf8")

const renderIn = (node: React.ReactElement) => renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)

/**
 * يزيل الوسوم حتى يستقرّ النص (فلا يبقى وسم مُركّب مثل `<<b>b>` بعد مرور واحد)،
 * ثم يحذف أي `<` أو `>` متبقٍّ. هذا نص اختبار من HTML مُهيَّأ داخل المستودع.
 */
export function stripTags(html: string): string {
  let text = html
  let previous: string
  do {
    previous = text
    text = text.replace(/<[^<>]*>/g, "")
  } while (text !== previous)
  return text.replace(/[<>]/g, "")
}

/** مستويات العناوين بالترتيب من HTML مُهيَّأ، كما يقرأها المدقّق. */
function headingLevels(html: string) {
  return [...html.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/g)].map((m) => ({
    level: Number(m[1]),
    text: stripTags(m[2]).trim(),
  }))
}

const HERO_ANSWER =
  "ميزان الرقمية هي منصة مغربية مجانية لطلبة كليات الحقوق، تجمع ملخصات S1-S6 والقاموس القانوني والمقالات والاختبارات في مكان واحد، بلا إعلانات تجارية."

describe("تسلسل مستويات العناوين", () => {
  test("قسم القاموس لا يقفز من H2 إلى H4", () => {
    const terms = pickTreeTerms(lexicon as any[], 7)
    const html = renderIn(<HomeLexiconShowcase terms={terms} total={250} />)
    const levels = headingLevels(html)
    expect(levels.length).toBeGreaterThan(1)
    expect(levels.some((h) => h.level === 4)).toBe(false)

    const markdown = levels.map((h) => `${"#".repeat(h.level)} ${h.text}`).join("\n")
    expect(analyzeBodyStructure(markdown).headingJumps).toEqual([])
  })

  test("قسم الأسئلة الشائعة والمصادر لا يقفز في مستويات العناوين", () => {
    const html = renderIn(<HomeFaqSection lexiconCount={250} articlesCount={10} schoolsCount={21} />)
    const markdown = headingLevels(html)
      .map((h) => `${"#".repeat(h.level)} ${h.text}`)
      .join("\n")
    expect(analyzeBodyStructure(markdown).headingJumps).toEqual([])
  })
})

describe("العناوين بصيغة سؤال مع إجابة مباشرة تحتها", () => {
  test("عناوين الصفحة الرئيسية الجديدة تُعدّ أسئلة لدى المدقّق", () => {
    const headings = [
      "ماذا تجد في ميزان الرقمية؟",
      "كيف يساعدك القاموس القانوني؟",
      "كيف تنتقل من النص القانوني إلى الاختبار؟",
      "هل موارد ميزان مجانية فعلاً؟",
      "ما المصادر الرسمية التي نرجع إليها؟",
    ]
    for (const heading of headings) {
      expect(isQuestionHeading(heading)).toBe(true)
    }
  })

  test("الجواب تحت سؤال «هل موارد ميزان مجانية؟» يبدأ بـ«نعم» مباشرة", () => {
    const structure = analyzeAnswerFirstStructure(
      "## هل موارد ميزان مجانية فعلاً؟\nنعم، كل موارد ميزان وأدواتها مجانية، بلا إعلانات تجارية، وكل ما تحتاجه للدراسة متاح في مكان واحد."
    )
    expect(structure.questionSections).toHaveLength(1)
    expect(structure.questionSections[0].hasDirectAnswer).toBe(true)
  })

  test("المكوّنات المعروضة تحمل عنوانين سؤاليين على الأقل (المدقّق يطلب اثنين)", () => {
    const terms = pickTreeTerms(lexicon as any[], 7)
    const lexiconHtml = renderIn(<HomeLexiconShowcase terms={terms} total={250} />)
    const faqHtml = renderIn(<HomeFaqSection lexiconCount={250} articlesCount={10} schoolsCount={21} />)
    const questions = [...headingLevels(lexiconHtml), ...headingLevels(faqHtml)].filter((h) =>
      isQuestionHeading(h.text)
    )
    expect(questions.length).toBeGreaterThanOrEqual(2)
  })
})

describe("الإجابة المباشرة في الافتتاحية", () => {
  test("فقرة البطل تعرّف ميزان بجملة مباشرة تُقتبس كما هي", () => {
    const structure = analyzeAnswerFirstStructure(HERO_ANSWER)
    expect(structure.hasDirectAnswer).toBe(true)
    expect(structure.hasDefinition).toBe(true)
  })

  test("نص البطل نفسه في الصفحة الثابتة والمكوّنة", () => {
    expect(HOME).toContain(HERO_ANSWER)
    expect(PRERENDER).toContain(HERO_ANSWER)
    expect(HOME).not.toContain("انطلق في رحلة")
    expect(PRERENDER).not.toContain("انطلق في رحلة")
  })
})

describe("الاستشهاد: روابط مسمّاة واقتباس منسوب", () => {
  test("قسم المصادر يحتوي روابط رسمية مسمّاة ومقتبساً منسوباً إلى جهة", () => {
    const html = renderIn(<HomeFaqSection lexiconCount={250} articlesCount={10} schoolsCount={21} />)
    expect(html).toContain('href="https://www.sgg.gov.ma/BulletinOfficiel.aspx"')
    expect(html).toContain('href="https://adala.justice.gov.ma/"')
    expect(html).toContain("«نظام الحكم بالمغرب نظام ملكية دستورية، ديمقراطية برلمانية واجتماعية.»")

    // نحلّل نسخة Markdown مكافئة بالمعايير نفسها التي يطبّقها المدقّق.
    const markdown = [
      "[الجريدة الرسمية](https://www.sgg.gov.ma/BulletinOfficiel.aspx)",
      "[بوابة عدالة](https://adala.justice.gov.ma/)",
      "> «نظام الحكم بالمغرب نظام ملكية دستورية، ديمقراطية برلمانية واجتماعية.»",
      "> — [الدستور المغربي (2011)، الفصل 1](https://bdj.mmsp.gov.ma/Ar/Document/5601-Dahir-n-1-11-91-du-27-cha%C3%A2bane-1432-29-juillet-2.aspx)",
    ].join("\n")
    const report = analyzeCitationPresentation(markdown)
    expect(report.namedLinkedSources.length).toBeGreaterThanOrEqual(2)
    expect(report.quotations).toHaveLength(1)
    expect(report.attributedQuoteCount).toBe(1)
  })

  test("الصفحة الثابتة تربط المصادر الرسمية وتنسب الاقتباس", () => {
    expect(PRERENDER).toContain('<a href="https://www.sgg.gov.ma/BulletinOfficiel.aspx"')
    expect(PRERENDER).toContain("<blockquote")
    expect(PRERENDER).toContain("الدستور المغربي (2011)، الفصل 1")
  })
})

describe("إزالة الوسوم في نص الاختبار", () => {
  test("لا تبقى وسوم مُركّبة بعد الإزالة (مثل <<b>b>)", () => {
    expect(stripTags("<<b>b>x</b>")).toBe("x")
    expect(stripTags("<scr<b>ipt>alert(1)</scr</b>ipt>")).toBe("alert(1)")
    expect(stripTags("<strong>نص</strong> عادي")).toBe("نص عادي")
    expect(/[<>]/.test(stripTags("a<b<c>d>e"))).toBe(false)
  })
})
