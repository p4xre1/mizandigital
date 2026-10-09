import { describe, expect, test } from "vitest"
import { readFileSync } from "node:fs"
import { articleTotal, categoryTone, pickTreeTerms } from "@/lib/lexicon/treeTerms"

const src = (count = 1) => ({
  code_ar: "قانون",
  articles: Array.from({ length: count }, (_, i) => ({ number: String(i + 1), phrase: "نص" })),
})

describe("pickTreeTerms", () => {
  test("يستبعد المصطلحات بلا مصادر قانونية", () => {
    const all = [
      { id: "a", term_ar: "أ", category: "قانون مدني", definition: "", legal_sources: [] },
      { id: "b", term_ar: "ب", category: "قانون مدني", definition: "", legal_sources: [src()] },
      { id: "c", term_ar: "ج", category: "قانون مدني", definition: "" },
    ]
    const out = pickTreeTerms(all, 7)
    expect(out.map((t) => t.id)).toEqual(["b"])
  })

  test("يأخذ أول n فقط بترتيب البيانات", () => {
    const all = Array.from({ length: 10 }, (_, i) => ({
      id: `t${i}`,
      term_ar: `مصطلح ${i}`,
      category: "قانون مدني",
      definition: "",
      legal_sources: [src()],
    }))
    const out = pickTreeTerms(all, 7)
    expect(out).toHaveLength(7)
    expect(out[0].id).toBe("t0")
    expect(out[6].id).toBe("t6")
  })

  test("articleTotal يجمع الفصول عبر كل المصادر", () => {
    const [term] = pickTreeTerms(
      [{ id: "x", term_ar: "x", category: "", definition: "", legal_sources: [src(3), src(4)] }],
      1,
    )
    expect(articleTotal(term)).toBe(7)
  })
})

describe("categoryTone", () => {
  test("الألوان حسب فرع القانون", () => {
    expect(categoryTone("قانون مدني")).toBe("blue")
    expect(categoryTone("قانون تجاري")).toBe("amber")
    expect(categoryTone("تنظيم قضائي")).toBe("purple")
    expect(categoryTone("قانون جنائي")).toBe("red")
    expect(categoryTone("فئة غير معروفة")).toBe("slate")
  })
})

describe("HomeLexiconShowcase source", () => {
  const SRC = readFileSync("src/components/home/HomeLexiconShowcase.tsx", "utf8")

  test("لا يوجد «عرض الكل» ولا عنوان بالشرطة", () => {
    expect(SRC).not.toContain("عرض الكل")
    expect(SRC).not.toContain("مع الشجرة القانونية")
  })

  test("العنوان والزر السفلي بالنص المطلوب", () => {
    expect(SRC).toContain("القاموس القانوني")
    expect(SRC).toContain("تصفح القاموس كاملاً")
    expect(SRC).toContain('to="/lexicon"')
  })
})
