import { readFileSync } from "node:fs"
import { renderToStaticMarkup } from "react-dom/server"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, test } from "vitest"
import { LawShowcaseCard } from "@/components/home/HomeLawArchive"
import { toShowcaseLaw, type ShowcaseLaw } from "@/lib/laws/showcase"

const base: ShowcaseLaw = toShowcaseLaw({
  slug: "mofawidin",
  title: "القانون رقم 46.21 المتعلق بتنظيم مهنة المفوضين القضائيين",
  law_number: "46.21",
  official_gazette_number: "7412",
  publication_date: "2025-06-01",
  pdf_url: "https://files.example.com/46-21.pdf",
  pagePath: "/pdf/mofawidin",
})

const render = (law: ShowcaseLaw) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <LawShowcaseCard law={law} index={0} />
    </MemoryRouter>,
  )

describe("بطاقة النص القانوني", () => {
  test("العنوان بلا بادئة «القانون رقم» والرقم يظهر مرة واحدة في البطاقة", () => {
    const html = render(base)
    expect(html).toContain("المتعلق بتنظيم مهنة المفوضين القضائيين")
    expect(html).not.toContain("القانون رقم 46.21")
    // الرقم في كتلة الرقم فقط؛ زرّا الإجراء يحملانه في aria-label لا في النص المرئي.
    expect(html.match(/>46\.21</g)).toHaveLength(1)
  })

  test("الرقم بـ dir=ltr وفي كتلة مستقلة", () => {
    expect(render(base)).toContain('<span class="law-card__number" dir="ltr">46.21</span>')
  })

  test("السنة من تاريخ النشر، والتاريخ في <time> بأسماء الشهور المغربية", () => {
    const html = render(base)
    expect(html).toContain('<span class="law-card__year">2025</span>')
    expect(html).toContain('<time dateTime="2025-06-01">1 يونيو 2025</time>')
  })

  test("سطر الجريدة الرسمية بلا تاريخ هجري ولا تكرار للتاريخ", () => {
    const html = render(base)
    expect(html).toContain("الجريدة الرسمية عدد 7412")
    expect(html.match(/<time/g)).toHaveLength(1)
    expect(html).not.toContain("هـ")
  })

  test("زرّ القراءة وزرّ PDF لهما aria-label يحمل رقم القانون", () => {
    const html = render(base)
    expect(html).toContain('aria-label="اقرأ نص القانون 46.21 كاملاً"')
    expect(html).toContain('aria-label="تحميل ملف PDF للقانون 46.21"')
    expect(html).toContain('href="/pdf/mofawidin"')
    expect(html).toContain('href="https://files.example.com/46-21.pdf"')
  })

  test("زرّ PDF يظهر فقط حين يوجد ملف", () => {
    const html = render({ ...base, pdfUrl: null })
    expect(html).not.toContain("law-card__btn--ghost")
    expect(html).toContain("اقرأ النص كاملاً")
  })

  test("بلا صفحة منشورة يصبح زرّ القراءة ملف PDF خارجياً ولا يتكرر زرّ PDF", () => {
    const html = render({ ...base, pagePath: null })
    expect(html).not.toContain("law-card__btn--ghost")
    expect(html).toContain('href="https://files.example.com/46-21.pdf"')
    expect(html).toContain('target="_blank"')
  })

  test("قانون-إطار يضيف صنف النوع، وقانون عادي لا يضيفه", () => {
    const frame = render({ ...base, type: "قانون-إطار" })
    expect(frame).toContain("law-card--frame")
    expect(frame).toContain("قانون-إطار")
    expect(render(base)).not.toContain("law-card--frame")
  })

  test("البطاقة عنصر <article> بعنوان مرتبط", () => {
    const html = render(base)
    expect(html).toMatch(/<article[^>]*aria-labelledby="[^"]+"/)
    expect(html).toMatch(/<h3 id="[^"]+" class="law-card__title">/)
  })

  test("لا يُعرض الظهير لأنه غير مخزَّن", () => {
    expect(render({ ...base, dahir: "1.25.xx" })).not.toContain("1.25.xx")
  })
})

describe("ملف الأنماط", () => {
  const css = readFileSync("src/styles/law-showcase.css", "utf8")

  test("لا ألوان صريحة: كل الألوان من متغيرات السمة", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/\b(?:rgb|rgba|hsla?)\(\s*\d/)
  })

  test("تقليل الحركة ونقطة 520px موجودتان", () => {
    expect(css).toContain("prefers-reduced-motion: reduce")
    expect(css).toContain("max-width: 519px")
  })

  test("الحركة تستعمل fill-mode backwards كي لا تغلب الـhover", () => {
    expect(css).toMatch(/animation: law-card-in [^;]*backwards/)
  })
})
