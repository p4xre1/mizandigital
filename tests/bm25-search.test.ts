import { describe, expect, test } from "vitest"
import {
  MAX_QUERY_TOKENS,
  normalizeForSearch,
  rankDocuments,
  sanitizeQueryTokens,
  tokenize,
} from "../shared/search/bm25.js"

describe("search — normalisation and tokens", () => {
  test("removes diacritics and unifies alef, ya and ta marbuta forms", () => {
    expect(normalizeForSearch("مُدَوَّنَةُ")).toBe("مدونه")
    expect(normalizeForSearch("إدارة آخر")).toBe("اداره اخر")
    expect(normalizeForSearch("على")).toBe("علي")
    expect(normalizeForSearch("مدونة")).toBe(normalizeForSearch("مدونه"))
  })

  test("punctuation becomes spaces; French accents are folded", () => {
    expect(normalizeForSearch("Droit, pénal!")).toBe("droit penal")
  })

  test("tokenize drops stopwords and single letters by default, keeps numbers", () => {
    expect(tokenize("مدونة الشغل من 1995")).toEqual(["مدونه", "الشغل", "1995"])
    expect(tokenize("de la loi", { keepStopwords: true })).toEqual(["de", "la", "loi"])
    expect(tokenize("a b c")).toEqual([])
  })
})

describe("search — query sanitising for PostgREST filters", () => {
  test("strips the characters that break .or() filter syntax", () => {
    const tokens = sanitizeQueryTokens('عقد (البيع), title.eq.x) "%_*')
    for (const t of tokens) expect(t).toMatch(/^[\p{L}\p{N}]+$/u)
    expect(tokens).toContain("عقد")
  })

  test("removes duplicates and caps the number of terms", () => {
    expect(sanitizeQueryTokens("شغل شغل قانون")).toEqual(["شغل", "قانون"])
    const many = Array.from({ length: 12 }, (_, i) => `كلمه${i}`).join(" ")
    expect(sanitizeQueryTokens(many)).toHaveLength(MAX_QUERY_TOKENS)
  })

  test("stopword-only input gives no terms", () => {
    expect(sanitizeQueryTokens("من في على")).toEqual([])
    expect(sanitizeQueryTokens("")).toEqual([])
  })
})

describe("search — BM25 ranking", () => {
  test("a title match outranks a body-only match", () => {
    const docs = [
      { title: "أخبار عامة", body: "الشغل والأجور" },
      { title: "مدونة الشغل", body: "نص عام" },
    ]
    const [first] = rankDocuments(docs, "الشغل")
    expect(first.index).toBe(1)
  })

  test("a rare term counts for more than a common one", () => {
    const docs = [
      { title: "", body: "قانون قانون" },
      { title: "", body: "قانون" },
      { title: "", body: "قانون" },
      { title: "", body: "قانون الاسرة" },
    ]
    const [first] = rankDocuments(docs, "قانون الاسره")
    expect(first.index).toBe(3)
  })

  test("the exact phrase in order beats the same words scattered", () => {
    const docs = [
      { title: "", body: "الشغل كثيرا ما يرتبط بالأجور والعقد" },
      { title: "", body: "مدونة الشغل المغربية" },
    ]
    const ranked = rankDocuments(docs, "مدونة الشغل")
    expect(ranked[0].index).toBe(1)
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score)
  })

  test("Arabic spelling variants match (ta marbuta vs ha)", () => {
    const docs = [{ title: "مدونه الشغل", body: "" }, { title: "عقود", body: "" }]
    const [first, second] = rankDocuments(docs, "مدونة الشغل")
    expect(first.index).toBe(0)
    expect(first.score).toBeGreaterThan(0)
    expect(second.score).toBe(0)
  })

  test("documents with no match are kept, at the end", () => {
    const docs = [{ title: "زائد", body: "" }, { title: "مدونة الشغل", body: "" }, { title: "لا علاقة", body: "" }]
    const ranked = rankDocuments(docs, "الشغل")
    expect(ranked).toHaveLength(3)
    expect(ranked[0].index).toBe(1)
    expect(ranked.slice(1).every((r) => r.score === 0)).toBe(true)
  })

  test("ties keep input order, and an empty query scores everything 0", () => {
    const docs = [{ title: "x", body: "" }, { title: "y", body: "" }, { title: "z", body: "" }]
    expect(rankDocuments(docs, "").map((r) => r.index)).toEqual([0, 1, 2])
    expect(rankDocuments([], "شغل")).toEqual([])
  })

  test("repeating a term does not let spam dominate (term saturation)", () => {
    const spam = { title: "", body: Array.from({ length: 40 }, () => "الشغل").join(" ") }
    const once = { title: "", body: "الشغل مع كلمات أخرى كثيرة لا علاقة لها بالموضوع" }
    const [first, second] = rankDocuments([spam, once], "الشغل")
    expect(first.score / second.score).toBeLessThan(3)
  })
})
