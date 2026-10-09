import { describe, expect, test } from "vitest"
import {
  LANDING_CARD_LIMIT,
  extractDate,
  extractGazetteNumber,
  extractLawNumber,
  landingRankOf,
  lawTypeOf,
  normalizeTitleKey,
  planLawDrop,
  titleFromFileName,
  titleFromText,
  toAsciiDigits,
  toIsoDate,
} from "../shared/laws/drop-publish.js"

const TODAY = "2026-10-09"

describe("law drop — date extraction", () => {
  test("ISO and day-first numeric dates", () => {
    expect(extractDate("published 2024-03-05")).toBe("2024-03-05")
    expect(extractDate("le 05/03/2024")).toBe("2024-03-05")
    expect(extractDate("5.3.2024")).toBe("2024-03-05")
  })

  test("Arabic, Moroccan and French month names", () => {
    expect(extractDate("بتاريخ 5 مارس 2024")).toBe("2024-03-05")
    expect(extractDate("Dahir du 1er mars 2024")).toBe("2024-03-01")
    expect(extractDate("le 12 juillet 2023")).toBe("2023-07-12")
    expect(extractDate("في 3 يوليوز 2022")).toBe("2022-07-03")
    expect(extractDate("17 غشت 2020")).toBe("2020-08-17")
    expect(extractDate("20 دجنبر 2021")).toBe("2021-12-20")
  })

  test("Hijri dates are ignored: their month names are not in the list", () => {
    expect(extractDate("صادر في 5 شوال 1442 الموافق 17 ماي 2021")).toBe("2021-05-17")
  })

  test("Arabic-Indic digits are normalised", () => {
    expect(toAsciiDigits("٥ مارس ٢٠٢٤")).toBe("5 مارس 2024")
    expect(extractDate("٠٥/٠٣/٢٠٢٤")).toBe("2024-03-05")
  })

  test("invalid calendar dates are rejected", () => {
    expect(toIsoDate(2024, 2, 31)).toBeNull()
    expect(toIsoDate(2024, 13, 1)).toBeNull()
    expect(toIsoDate(2024, 2, 29)).toBe("2024-02-29")
    expect(extractDate("31/02/2024")).toBeNull()
  })

  test("no date is invented when none exists", () => {
    expect(extractDate("نص بلا تاريخ")).toBeNull()
  })
})

describe("law drop — law number and gazette", () => {
  test("labelled Arabic and French forms", () => {
    expect(extractLawNumber({ text: "قانون رقم 46.21 يتعلق بـ" })).toBe("46.21")
    expect(extractLawNumber({ text: "Loi n° 51-17 relative à" })).toBe("51.17")
    expect(extractLawNumber({ text: "قانون-إطار رقم ٥١.١٧" })).toBe("51.17")
  })

  test("file-name fallback works, and does not read a date as a law number", () => {
    expect(extractLawNumber({ fileName: "قانون-46.21-الشغل.pdf" })).toBe("46.21")
    expect(extractLawNumber({ fileName: "loi-2026-10-09.pdf" })).toBeNull()
  })

  test("dahir numbers such as 1.24.01 are not taken as law numbers", () => {
    expect(extractLawNumber({ text: "الظهير الشريف رقم 1.24.01" })).toBeNull()
  })

  test("gazette issue number", () => {
    expect(extractGazetteNumber("الجريدة الرسمية عدد 7123 بتاريخ")).toBe("7123")
    expect(extractGazetteNumber("Bulletin officiel n° 6840 du")).toBe("6840")
    expect(extractGazetteNumber("بلا عدد")).toBeNull()
  })
})

describe("law drop — titles and types", () => {
  test("title from file name, without number, date and separators", () => {
    expect(titleFromFileName("قانون-46.21-التنظيم-القضائي.pdf")).toBe("قانون التنظيم القضائي")
    expect(titleFromFileName("loi-cadre-17-51.pdf")).toBe("loi cadre")
    expect(titleFromFileName("قانون الشغل (2).pdf")).toBe("قانون الشغل")
  })

  test("the publication year left in the name is removed from the title", () => {
    expect(titleFromFileName("loi-sur-la-presse-46-21-2024.pdf", { year: "2024" })).toBe("loi sur la presse")
  })

  test("upload IDs, scanner names and bare type words are not titles", () => {
    expect(titleFromFileName("1728394857234.pdf")).toBeNull()
    expect(titleFromFileName("a3f9c1d2e4b5a6f7.pdf")).toBeNull()
    expect(titleFromFileName("scan_0001.pdf")).toBeNull()
    expect(titleFromFileName("قانون.pdf")).toBeNull()
  })

  test("text fallback: first law-like line, without dates or the number label", () => {
    expect(titleFromText("مقدمة\nقانون رقم 46.21 يتعلق بالتنظيم القضائي للمملكة\nالجريدة")).toBe(
      "قانون يتعلق بالتنظيم القضائي للمملكة",
    )
    expect(titleFromText("لا عنوان هنا")).toBeNull()
  })

  test("type follows the title: framework laws are marked", () => {
    expect(lawTypeOf("قانون-إطار رقم 51.17 المتعلق")).toBe("قانون-إطار")
    expect(lawTypeOf("loi-cadre sur l'éducation")).toBe("قانون-إطار")
    expect(lawTypeOf("قانون الشغل")).toBe("قانون")
  })

  test("title key ignores diacritics, accents, and letter variants", () => {
    expect(normalizeTitleKey("قَانُون الشّغل")).toBe(normalizeTitleKey("قانون الشغل"))
    expect(normalizeTitleKey("Loi n° 46.21")).toBe("loin4621")
    expect(normalizeTitleKey("أكتوبر")).toBe(normalizeTitleKey("اكتوبر"))
  })
})

describe("law drop — readiness", () => {
  test("a complete PDF drop is ready and fills every field", () => {
    const plan = planLawDrop({
      fileName: "قانون-46.21-التنظيم-القضائي.pdf",
      text: "قانون رقم 46.21 يتعلق بالتنظيم القضائي\nالجريدة الرسمية عدد 7123 بتاريخ 5 مارس 2024",
      existing: [],
      today: TODAY,
    })
    expect(plan.status).toBe("ready")
    expect(plan.fields).toEqual({
      title: "قانون التنظيم القضائي",
      law_number: "46.21",
      official_gazette_number: "7123",
      publication_date: "2024-03-05",
      type: "قانون",
    })
    expect(plan.duplicateOf).toBeNull()
    expect(plan.landing).toEqual({ eligible: true, rank: 0, willShowOnHome: true })
  })

  test("missing date → needs_review, never a guessed date", () => {
    const plan = planLawDrop({ fileName: "قانون-46.21-الشغل.pdf", text: "", existing: [], today: TODAY })
    expect(plan.status).toBe("needs_review")
    expect(plan.fields.publication_date).toBeNull()
    expect(plan.landing.eligible).toBe(false)
    expect(plan.checks.find((c) => c.code === "publication_date")?.ok).toBe(false)
  })

  test("a non-PDF upload is never published to the landing page", () => {
    const plan = planLawDrop({
      fileName: "قانون الشغل 2024-03-05.docx",
      text: "",
      existing: [],
      today: TODAY,
    })
    expect(plan.status).toBe("needs_review")
    expect(plan.checks.find((c) => c.code === "pdf_file")?.ok).toBe(false)
    expect(plan.landing.willShowOnHome).toBe(false)
  })

  test("a date after today is flagged for review", () => {
    const plan = planLawDrop({ fileName: "قانون الشغل.pdf", text: "بتاريخ 1 يناير 2030", existing: [], today: TODAY })
    expect(plan.status).toBe("needs_review")
    expect(plan.checks.find((c) => c.code === "date_not_future")?.ok).toBe(false)
  })

  test("no usable title → needs_review with a title check failure", () => {
    const plan = planLawDrop({ fileName: "1728394857234.pdf", text: "", existing: [], today: TODAY })
    expect(plan.status).toBe("needs_review")
    expect(plan.checks.find((c) => c.code === "title")?.ok).toBe(false)
  })

  test("a law without a number is still ready (warning only)", () => {
    const plan = planLawDrop({ fileName: "قانون الشغل.pdf", text: "الجريدة الرسمية عدد 1 بتاريخ 2 يناير 2026", existing: [], today: TODAY })
    expect(plan.status).toBe("ready")
    expect(plan.checks.find((c) => c.code === "law_number")?.ok).toBe(false)
  })
})

describe("law drop — duplicates", () => {
  const existing = [
    { id: "row-1", slug: "tanzim", title: "قانون التنظيم القضائي", law_number: "46.21", publication_date: "2024-03-05T00:00:00+00:00", pdf_url: "https://cdn.example/x1.pdf" },
    { id: "row-2", slug: "chogl", title: "قانون الشغل", law_number: null, publication_date: "2025-01-01", pdf_url: "/docs/Loi-Travail.pdf" },
  ]

  test("same law number → duplicate, pointing at the existing row", () => {
    const plan = planLawDrop({ fileName: "نسخة-46-21.pdf", text: "قانون رقم 46.21", existing, today: TODAY })
    expect(plan.status).toBe("duplicate")
    expect(plan.duplicateOf).toEqual({ id: "row-1", slug: "tanzim", title: "قانون التنظيم القضائي", reason: "same_law_number" })
  })

  test("same title after normalisation → duplicate", () => {
    const plan = planLawDrop({ fileName: "قَانُون الشغل.pdf", text: "", existing, today: TODAY })
    expect(plan.status).toBe("duplicate")
    expect(plan.duplicateOf?.reason).toBe("same_title")
  })

  test("same file name as an existing PDF link → duplicate", () => {
    const plan = planLawDrop({ fileName: "Loi-Travail.pdf", text: "", existing: [{ ...existing[1], title: "Autre" }], today: TODAY })
    expect(plan.status).toBe("duplicate")
    expect(plan.duplicateOf?.reason).toBe("same_file_name")
  })

  test("a genuinely new law is not a duplicate", () => {
    const plan = planLawDrop({ fileName: "قانون-55.24-الصحافة.pdf", text: "بتاريخ 3 فبراير 2026", existing, today: TODAY })
    expect(plan.status).toBe("ready")
    expect(plan.duplicateOf).toBeNull()
  })
})

describe("law drop — landing page placement", () => {
  const rows = (dates: string[]) =>
    dates.map((d, i) => ({ id: `r${i}`, slug: `s${i}`, title: `نص ${i}`, law_number: null, publication_date: d, pdf_url: null }))

  test("the newest law ranks first", () => {
    expect(landingRankOf({ date: "2026-01-01", title: "ج" }, rows(["2025-01-01", "2024-01-01"]))).toBe(0)
  })

  test("a law older than LANDING_CARD_LIMIT newer ones is not shown on the home page", () => {
    const newer = rows(Array.from({ length: LANDING_CARD_LIMIT }, (_, i) => `2025-0${(i % 9) + 1}-01`))
    const plan = planLawDrop({ fileName: "قانون-10.19-الاستثمار.pdf", text: "بتاريخ 1 يناير 2019", existing: newer, today: TODAY })
    expect(plan.status).toBe("ready")
    expect(plan.landing.rank).toBe(LANDING_CARD_LIMIT)
    expect(plan.landing.willShowOnHome).toBe(false)
    expect(plan.message).toContain(String(LANDING_CARD_LIMIT))
  })

  test("ties on date are broken by title, as on the home page", () => {
    const sameDay = [{ id: "a", slug: "a", title: "ب", law_number: null, publication_date: "2026-02-01", pdf_url: null }]
    expect(landingRankOf({ date: "2026-02-01", title: "ج" }, sameDay)).toBe(1)
    expect(landingRankOf({ date: "2026-02-01", title: "آ" }, sameDay)).toBe(0)
  })

  test("rows with no date sort after dated rows, so they do not push a dated law down", () => {
    const undated = [{ id: "x", slug: "x", title: "أ", law_number: null, publication_date: null, pdf_url: null }]
    expect(landingRankOf({ date: "2000-01-01", title: "ص" }, undated)).toBe(0)
  })
})
