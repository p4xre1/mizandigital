import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"

const root = join(__dirname, "..")
const read = (p: string) => JSON.parse(readFileSync(join(root, p), "utf8"))

const auto = read("src/data/reference-map.auto.json") as {
  meta: { reviewedBy: string; reviewedOn: string; stats: Record<string, number> }
  references: {
    id: string; fromText: string; fromArticle: string; toText: string; toArticle: string; also?: string[]
    type: string; excerpt: string; relationship: string; sourceUrl: string; targetUrl?: string; targetVerified: boolean
    reviewedBy: string; reviewedOn: string
  }[]
}
const curated = read("src/data/reference-map.json") as { references: { fromArticle: string; toArticle: string; type: string }[] }

const CONST = "الدستور المغربي (2011)"
const FC = "مدونة الأسرة (القانون 70.03)"
const articles: Record<string, Record<number, string>> = {}
for (const [text, file] of [
  [CONST, "data/laws/constitution-2011.articles.json"],
  [FC, "data/laws/mudawana-70-03.articles.json"],
] as const) {
  articles[text] = {}
  // ملفات المستودع تستعمل "number" (والتصديرات الأقدم "article")
  for (const a of read(file).articles as { number?: number; article?: number; text: string }[])
    articles[text][Number(a.number ?? a.article)] = a.text
}
const numberOf = (label: string) => Number(label.match(/\d+/)?.[0])

describe("الإحالات المستخرجة آلياً من كامل النصين", () => {
  test("تغطي عدداً معتبراً من المواد وتحمل الإحصاءات", () => {
    expect(auto.references.length).toBeGreaterThan(60)
    expect(auto.meta.stats.explicit).toBeGreaterThan(0)
    expect(auto.meta.stats.delegation).toBeGreaterThan(0)
  })

  test("كل اقتباس جملة حرفية موجودة في نص المادة المصدر", () => {
    for (const r of auto.references) {
      const n = numberOf(r.fromArticle)
      expect(articles[r.fromText]?.[n], r.id).toBeTruthy()
      expect(articles[r.fromText][n].includes(r.excerpt), r.id).toBe(true)
    }
  })

  test("كل إحالة صريحة تشير إلى فصل أو مادة موجودة فعلاً، وليست إلى نفسها", () => {
    for (const r of auto.references.filter(x => x.type === "explicit")) {
      const targetText = r.toText
      const targets = [r.toArticle, ...(r.also ?? [])]
      for (const t of targets) {
        const n = numberOf(t)
        expect(articles[targetText]?.[n], `${r.id}: ${t}`).toBeTruthy()
        expect(t, r.id).not.toBe(r.fromArticle)
      }
    }
  })

  test("المادة 383 غير واردة في النص، فلا تُذكر كمصدر ولا كهدف", () => {
    for (const r of auto.references) {
      expect(r.fromArticle, r.id).not.toBe("المادة 383")
      expect(r.toArticle, r.id).not.toMatch(/^المادة 383$/)
    }
  })

  test("التخويل التشريعي لا يُنسب إلى نص منفّذ ولا يحمل رابط هدف", () => {
    for (const r of auto.references.filter(x => x.type === "delegation")) {
      expect(r.targetVerified, r.id).toBe(false)
      expect(r.targetUrl, r.id).toBeUndefined()
    }
  })

  test("الإحالة الصريحة المؤكدة لها رابط https للنص المُنفِّذ", () => {
    for (const r of auto.references.filter(x => x.type === "explicit")) {
      expect(r.targetVerified, r.id).toBe(true)
      expect(r.targetUrl, r.id).toMatch(/^https:\/\//)
    }
  })

  test("كل إحالة مصدرها https ومراجعتها موثّقة ولا تتجاوز اليوم", () => {
    const today = new Date().toISOString().slice(0, 10)
    for (const r of auto.references) {
      expect(r.sourceUrl, r.id).toMatch(/^https:\/\//)
      expect(r.reviewedBy.length, r.id).toBeGreaterThan(0)
      expect(r.reviewedOn <= today, r.id).toBe(true)
      expect(r.relationship.length, r.id).toBeGreaterThan(20)
    }
  })

  test("لا تتكرر مفاتيح الإحالة بين المنسّقة والمستخرجة", () => {
    const keys = [
      ...curated.references.map(r => `${r.fromArticle}|${r.toArticle}|${r.type}`),
      ...auto.references.map(r => `${r.fromArticle}|${r.toArticle}|${r.type}`),
    ]
    expect(new Set(keys).size).toBe(keys.length)
  })

  test("الإحالة المكررة في نفس المادة لا تُضاف مرتين", () => {
    const ids = auto.references.map(r => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
