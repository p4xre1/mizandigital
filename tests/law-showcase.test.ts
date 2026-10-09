import { describe, expect, test } from "vitest"
import {
  compareNewestFirst,
  formatMoroccanDate,
  lawTypeOf,
  pickLatest,
  stripLawPrefix,
  toShowcaseLaw,
  yearOf,
  type ShowcaseLaw,
} from "@/lib/laws/showcase"

const law = (over: Partial<ShowcaseLaw>): ShowcaseLaw => ({
  type: "قانون",
  number: null,
  year: null,
  title: "نص",
  gazette: null,
  published: null,
  dahir: null,
  slug: "s",
  pdfUrl: null,
  pagePath: null,
  ...over,
})

describe("stripLawPrefix", () => {
  test("يزيل «القانون رقم X» ويُبقي العنوان", () => {
    expect(stripLawPrefix("القانون رقم 46.21 المتعلق بتنظيم مهنة المفوضين القضائيين")).toBe(
      "المتعلق بتنظيم مهنة المفوضين القضائيين",
    )
  })

  test("يزيل بادئة قانون-إطار مع الفاصلة أو الشرطة بعد الرقم", () => {
    expect(stripLawPrefix("قانون-إطار رقم 51.17 : بمنظومة التربية والتكوين")).toBe("بمنظومة التربية والتكوين")
    expect(stripLawPrefix("القانون-الإطار رقم 2.11.1، المتعلق بالتعليم")).toBe("المتعلق بالتعليم")
  })

  test("يتعامل مع أرقام بشرطات ومسارات", () => {
    expect(stripLawPrefix("القانون رقم 1-22 المتعلق بالضبط")).toBe("المتعلق بالضبط")
    expect(stripLawPrefix("القانون رقم 2.11.1 المتعلق بالتعليم")).toBe("المتعلق بالتعليم")
  })

  test("لا يلمس عنواناً لا يبدأ بالبادئة", () => {
    expect(stripLawPrefix("المتعلق بتنظيم مهنة المفوضين القضائيين")).toBe("المتعلق بتنظيم مهنة المفوضين القضائيين")
    expect(stripLawPrefix("مدونة الشغل")).toBe("مدونة الشغل")
  })

  test("إن استهلكت البادئة العنوان كله يُعاد العنوان الأصلي", () => {
    expect(stripLawPrefix("القانون رقم 46.21")).toBe("القانون رقم 46.21")
  })

  test("لا يحذف البادئة إن جاء الرقم بعد كلمة أخرى", () => {
    expect(stripLawPrefix("مشروع القانون رقم 10.20")).toBe("مشروع القانون رقم 10.20")
  })
})

describe("lawTypeOf", () => {
  test("قانون-إطار إن بدأ العنوان بها", () => {
    expect(lawTypeOf("قانون-إطار رقم 51.17 : بمنظومة التربية")).toBe("قانون-إطار")
    expect(lawTypeOf("القانون الإطار رقم 1.00")).toBe("قانون-إطار")
  })

  test("قانون في كل الحالات الأخرى", () => {
    expect(lawTypeOf("القانون رقم 46.21 المتعلق بالمفوضين")).toBe("قانون")
    expect(lawTypeOf("المتعلق بتنظيم مهنة المفوضين")).toBe("قانون")
  })
})

describe("formatMoroccanDate", () => {
  test("يستعمل أسماء الشهور المغربية", () => {
    expect(formatMoroccanDate("2025-06-01")).toBe("1 يونيو 2025")
    expect(formatMoroccanDate("2025-07-15")).toBe("15 يوليوز 2025")
    expect(formatMoroccanDate("2025-08-03")).toBe("3 غشت 2025")
    expect(formatMoroccanDate("2025-09-10")).toBe("10 شتنبر 2025")
    expect(formatMoroccanDate("2025-12-31")).toBe("31 دجنبر 2025")
  })

  test("لا يزيح اليوم بسبب المنطقة الزمنية", () => {
    expect(formatMoroccanDate("2025-01-01")).toBe("1 يناير 2025")
  })

  test("يعيد null لقيمة فارغة أو غير صالحة", () => {
    expect(formatMoroccanDate(null)).toBeNull()
    expect(formatMoroccanDate("")).toBeNull()
    expect(formatMoroccanDate("2025-13-01")).toBeNull()
    expect(formatMoroccanDate("غير معروف")).toBeNull()
  })
})

describe("yearOf", () => {
  test("السنة من تاريخ النشر لا من رقم النص", () => {
    expect(yearOf("2025-06-01")).toBe(2025)
    const converted = toShowcaseLaw({
      slug: "x",
      title: "القانون رقم 46.21 المتعلق بالمفوضين",
      law_number: "46.21",
      official_gazette_number: "7412",
      publication_date: "2025-06-01",
      pdf_url: null,
      pagePath: "/pdf/x",
    })
    expect(converted.year).toBe(2025)
  })
})

describe("toShowcaseLaw", () => {
  test("يبني الحقول منفصلة ولا يغيّر العنوان المخزَّن", () => {
    const row = {
      slug: "mofawidin",
      title: "القانون رقم 46.21 المتعلق بتنظيم مهنة المفوضين القضائيين",
      law_number: " 46.21 ",
      official_gazette_number: "7412",
      publication_date: "2025-06-01",
      pdf_url: "https://example.com/a.pdf",
      pagePath: "/pdf/mofawidin",
    }
    const snapshot = JSON.stringify(row)
    const shown = toShowcaseLaw(row)
    expect(shown).toMatchObject({
      type: "قانون",
      number: "46.21",
      year: 2025,
      title: "المتعلق بتنظيم مهنة المفوضين القضائيين",
      gazette: "7412",
      published: "2025-06-01",
      dahir: null,
      slug: "mofawidin",
      pdfUrl: "https://example.com/a.pdf",
      pagePath: "/pdf/mofawidin",
    })
    expect(JSON.stringify(row)).toBe(snapshot)
  })

  test("تاريخ غير صالح يصبح null دون أن يكسر البطاقة", () => {
    const shown = toShowcaseLaw({
      slug: "x",
      title: "نص",
      law_number: null,
      official_gazette_number: null,
      publication_date: "not-a-date",
      pdf_url: null,
      pagePath: null,
    })
    expect(shown.published).toBeNull()
    expect(shown.year).toBeNull()
  })
})

describe("pickLatest", () => {
  test("يرتّب الأحدث أولاً ويقتصر على n", () => {
    const laws = [
      law({ slug: "a", published: "2024-01-01" }),
      law({ slug: "b", published: "2025-06-01" }),
      law({ slug: "c", published: "2025-03-01" }),
      law({ slug: "d", published: "2023-05-05" }),
    ]
    expect(pickLatest(laws, 2).map((l) => l.slug)).toEqual(["b", "c"])
  })

  test("يزيل التكرار بالمعرّف", () => {
    const laws = [law({ slug: "a", published: "2025-01-01" }), law({ slug: "a", published: "2025-01-01" })]
    expect(pickLatest(laws, 6)).toHaveLength(1)
  })

  test("السجلات بلا تاريخ تأتي بعد المؤرَّخة", () => {
    const sorted = [law({ slug: "none", published: null }), law({ slug: "dated", published: "2020-01-01" })].sort(
      compareNewestFirst,
    )
    expect(sorted[0].slug).toBe("dated")
  })

  test("لا يعدّل المصفوفة الأصلية", () => {
    const laws = [law({ slug: "a", published: "2024-01-01" }), law({ slug: "b", published: "2025-01-01" })]
    pickLatest(laws, 2)
    expect(laws.map((l) => l.slug)).toEqual(["a", "b"])
  })
})
