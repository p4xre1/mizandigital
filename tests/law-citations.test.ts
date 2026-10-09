import { describe, expect, test } from "vitest"
import {
  auditCitations,
  daysBetween,
  extractLawCitations,
  toAsciiDigits,
} from "../shared/laws/citations.js"

const TODAY = "2026-10-09"
const nums = (text: string) => extractLawCitations(text).map((c) => c.number)

describe("citations — extraction", () => {
  test("finds numbers after the usual Arabic keywords", () => {
    expect(nums("القانون رقم 52.05 المتعلق بمدونة الشغل")).toEqual(["52.05"])
    expect(nums("والمعدّل بالقانون 116.14 لتشديد العقوبات")).toEqual(["116.14"])
    expect(nums("قانون 65.00 والقانون 02.23")).toEqual(["65.00", "02.23"])
  })

  test("accepts French and dash forms, and normalises them to a dot", () => {
    expect(nums("loi n° 52-05 du code du travail")).toEqual(["52.05"])
  })

  test("reads Arabic-Indic digits", () => {
    expect(nums("القانون رقم ٥٢.٠٥")).toEqual(["52.05"])
    expect(toAsciiDigits("١٦.١٤ و۰۹")).toBe("16.14 و09")
  })

  test("ignores prices, dates and dahir numbers", () => {
    expect(nums("ثمن الكتاب 12.50 درهم")).toEqual([])
    expect(nums("الظهير 1.02.297 بتاريخ")).toEqual([])
  })

  test("a citation at the end of a sentence still matches", () => {
    expect(nums("وفق القانون 52.05.")).toEqual(["52.05"])
  })
})

describe("citations — dates", () => {
  test("daysBetween counts whole days and rejects bad input", () => {
    expect(daysBetween("2026-09-20", TODAY)).toBe(19)
    expect(daysBetween("2026-10-09", "2026-10-09")).toBe(0)
    expect(Number.isNaN(daysBetween("nope", TODAY))).toBe(true)
  })
})

describe("citations — audit", () => {
  test("a repealed law in the archive is an error", () => {
    const { findings, summary } = auditCitations({
      citations: [{ number: "10.10", source: "articles.json[0]" }],
      archive: [{ law_number: "10.10", status: "repealed" }],
      today: TODAY,
    })
    expect(findings).toEqual([{ number: "10.10", severity: "error", code: "repealed_cited", sources: ["articles.json[0]"] }])
    expect(summary.errors).toBe(1)
  })

  test("a repealed status record is an error even without an archive row", () => {
    const { findings } = auditCitations({
      citations: [{ number: "10.10", source: "news.json[1]" }],
      statuses: { "10.10": { status: "repealed", checked_at: TODAY } },
      today: TODAY,
    })
    expect(findings[0]).toMatchObject({ severity: "error", code: "repealed_cited" })
  })

  test("a cited law missing from a non-empty archive is a warning", () => {
    const { findings } = auditCitations({
      citations: [{ number: "99.99", source: "articles.json[2]" }],
      archive: [{ law_number: "52.05", title: "مدونة الشغل" }],
      today: TODAY,
    })
    expect(findings[0]).toMatchObject({ severity: "warning", code: "not_in_archive" })
  })

  test("with an empty archive, unknown citations are info, not warnings", () => {
    const { findings, summary } = auditCitations({
      citations: [{ number: "52.05", source: "articles.json[0]" }],
      archive: [],
      today: TODAY,
    })
    expect(findings[0]).toMatchObject({ severity: "info", code: "unverifiable_no_archive" })
    expect(summary).toMatchObject({ errors: 0, warnings: 0, infos: 1 })
  })

  test("a law present in the archive with a clean status produces no finding", () => {
    const { findings } = auditCitations({
      citations: [{ number: "52.05", source: "a" }],
      archive: [{ law_number: "52.05", status: "in_force" }],
      today: TODAY,
    })
    expect(findings).toEqual([])
  })

  test("a status check older than the window is a warning with its age", () => {
    const { findings } = auditCitations({
      citations: [{ number: "52.05", source: "a" }],
      archive: [{ law_number: "52.05" }],
      statuses: { "52.05": { status: "amended", checked_at: "2025-01-01" } },
      today: TODAY,
    })
    expect(findings[0]).toMatchObject({ severity: "warning", code: "status_stale" })
    expect(findings[0].ageDays).toBeGreaterThan(180)
  })

  test("a legal source not verified recently is a warning; a fresh one is not", () => {
    const { findings } = auditCitations({
      citations: [],
      sources: [
        { code: "ق.ل.ع", last_verified: "2026-09-20", source: "lexicon.json[7].legal_sources[0]" },
        { code: "ق.ج", last_verified: "2025-01-01", source: "lexicon.json[9].legal_sources[0]" },
      ],
      today: TODAY,
    })
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ code: "source_not_verified_recently", number: "ق.ج" })
  })

  test("each law is reported once, with all of its sources, and the count is right", () => {
    const { findings, summary } = auditCitations({
      citations: [
        { number: "52.05", source: "a" },
        { number: "52.05", source: "b" },
        { number: "52.05", source: "a" },
      ],
      archive: [],
      today: TODAY,
    })
    expect(findings).toHaveLength(1)
    expect(findings[0].sources).toEqual(["a", "b"])
    expect(summary).toMatchObject({ citations: 3, uniqueLaws: 1 })
  })
})
