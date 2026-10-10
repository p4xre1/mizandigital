import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"
import { answerQuestion } from "../shared/help/answer.js"
import { allEntries, CURATED_ENTRIES, FAQ_ENTRIES, LEXICON_ENTRIES } from "../shared/help/knowledge.js"
import { checkScope } from "../shared/help/guardrails.js"
import { normalize, tokenize, rankEntries } from "../shared/help/retrieve.js"

const ROOT = join(__dirname, "..")

describe("تطبيع النص العربي", () => {
  test("يزيل التشكيل ويوحّد الألف والتاء المربوطة والياء", () => {
    expect(normalize("الأرشِيفُ")).toBe(normalize("الارشيف"))
    expect(normalize("مدرسة")).toBe("مدرسه")
    expect(normalize("على")).toBe("علي")
  })

  test("الكلمات الوظيفية تُحذف وأل التعريف تُزال من الكلمات الطويلة", () => {
    expect(tokenize("كيف أبحث في الأرشيف؟")).toEqual(["ابحث", "ارشيف"])
  })
})

describe("حدود النطاق: رفض الاستشارة الفردية فقط", () => {
  const refused = [
    "هل يحق لي فسخ عقد الكراء في حالتي؟",
    "قضيتي في المحكمة، ماذا أفعل؟",
    "انصحني ماذا أفعل مع مشكلتي في العمل",
    "عندي محامي هل سأربح الدعوى؟",
    "Puis-je résilier mon bail ?",
    "Je veux un conseil juridique pour mon divorce",
  ]
  for (const question of refused) {
    test(`يرفض: ${question}`, () => {
      expect(checkScope(question).refuse).toBe(true)
    })
  }

  const allowed = [
    "كيف أبحث في الأرشيف؟",
    "ما معنى الالتزام؟",
    "ما هي المسؤولية العقدية؟",
    "أين أجد ملفات الفصل S3؟",
    "ما هي الكليات المدرجة في الدليل؟",
    "Comment chercher dans le lexique ?",
  ]
  for (const question of allowed) {
    test(`يسمح: ${question}`, () => {
      expect(checkScope(question).refuse).toBe(false)
    })
  }
})

describe("الإجابات من محتوى الموقع", () => {
  test("سؤال عن الأرشيف يُجاب من صفحة الأرشيف", () => {
    const result = answerQuestion("كيف أبحث في الأرشيف؟")
    expect(result.mode).toBe("answer")
    expect(result.sources.map((s) => s.url)).toContain("/archive")
  })

  test("سؤال عن الكليات يُجاب من دليل الكليات", () => {
    const result = answerQuestion("ما هي الكليات المدرجة في الدليل؟")
    expect(result.mode).toBe("answer")
    expect(result.sources[0].url).toBe("/schools")
  })

  test("سؤال عن اختبارات المباريات يُحال إلى صفحتها", () => {
    const result = answerQuestion("كيف أبدأ اختبارات المباريات المهنية؟")
    expect(result.sources[0].url).toBe("/quiz/concours")
  })

  test("سؤال عن الحساب يوضح أن القراءة لا تحتاج تسجيلاً", () => {
    const result = answerQuestion("هل أحتاج حساباً للقراءة؟")
    expect(result.answer).toContain("لا يتطلبان حساباً")
  })

  test("سؤال عن تعريف مصطلح يُجاب من المعجم بالتعريف الموجود في الموقع", () => {
    const result = answerQuestion("ما معنى الالتزام؟")
    expect(result.mode).toBe("answer")
    expect(result.sources[0].url).toBe("/lexicon/الالتزام")
    expect(result.answer).toContain("رابطة قانونية")
  })

  test("سؤال عن الاستئناف والنقض يُحال إلى مصطلحاتهما في المعجم", () => {
    const result = answerQuestion("ما الفرق بين الاستئناف والنقض؟")
    expect(result.sources[0].url).toBe("/lexicon/الاستئناف")
  })

  test("سؤال فرنسي عن المعجم يُحال إلى صفحته", () => {
    const result = answerQuestion("Où trouver le lexique ?")
    expect(result.mode).toBe("answer")
    expect(result.sources[0].url).toBe("/lexicon")
  })

  test("سؤال عام عن الموقع يُجاب بتعريف المنصة", () => {
    const result = answerQuestion("شنو هي ميزان؟")
    expect(result.mode).toBe("answer")
    expect(result.sources[0].url).toBe("/platform")
  })

  test("سؤال عن التسجيل يُحال إلى صفحة التسجيل", () => {
    const result = answerQuestion("كيف أسجل حساب جديد؟")
    expect(result.sources[0].url).toBe("/signup")
  })

  test("سؤال خارج المحتوى يُعاد بجواب بديل وروابط عامة، لا باختلاق", () => {
    const result = answerQuestion("xq zv wnorp qlm")
    expect(result.mode).toBe("not_found")
    expect(result.sources.map((s) => s.url)).toEqual(["/faq", "/contact"])
  })

  test("السؤال القانوني الفردي يُرفض ويُحال إلى صفحة الشروط", () => {
    const result = answerQuestion("هل يحق لي فسخ عقد الكراء في حالتي؟")
    expect(result.mode).toBe("refused")
    expect(result.sources).toEqual([{ title: expect.any(String), url: "/terms" }])
  })

  test("الترتيب يعطي الأولوية للعنوان على نص الجواب", () => {
    const ranked = rankEntries("المعجم القانوني", CURATED_ENTRIES, { limit: 1 })
    expect(ranked[0].entry.id).toBe("lexicon")
  })
})

describe("قاعدة المعرفة", () => {
  test("تضم المدخلات المنسّقة وتعريفات المعجم كلها وأسئلة الأسئلة الشائعة", () => {
    expect(CURATED_ENTRIES.length).toBeGreaterThanOrEqual(20)
    expect(LEXICON_ENTRIES.length).toBe(250)
    expect(FAQ_ENTRIES.length).toBeGreaterThan(0)
    expect(allEntries().length).toBe(CURATED_ENTRIES.length + LEXICON_ENTRIES.length + FAQ_ENTRIES.length)
  })

  test("معرّفات المدخلات فريدة وكل مدخل له عنوان وجواب", () => {
    const ids = allEntries().map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const entry of allEntries()) {
      expect(entry.title.trim().length).toBeGreaterThan(0)
      expect(entry.body.trim().length).toBeGreaterThan(0)
    }
  })

  test("كل رابط داخلي يطابق مساراً موجوداً في AppRoutes أو ملفاً عاماً", () => {
    const routesSource = readFileSync(join(ROOT, "src/routes/AppRoutes.tsx"), "utf8")
    const routePatterns = [...routesSource.matchAll(/path="([^"]+)"/g)].map((m) => m[1])
    // مقارنة المقاطع مباشرةً (بلا بناء RegExp من نص المسار): كل مقطع `:اسم` يطابق مقطعاً غير فارغ.
    const matchesRoute = (pattern: string, path: string) => {
      const patternSegments = pattern.split("/")
      const pathSegments = path.split("/")
      return (
        patternSegments.length === pathSegments.length &&
        patternSegments.every((segment, i) =>
          /^:[A-Za-z]+$/.test(segment) ? pathSegments[i].length > 0 : segment === pathSegments[i],
        )
      )
    }

    const unknown: string[] = []
    for (const entry of allEntries()) {
      const path = entry.url.split(/[?#]/)[0]
      if (path.includes(".")) {
        if (!existsSync(join(ROOT, "public", path))) unknown.push(path)
        continue
      }
      const matched = routePatterns.some((pattern) => pattern.startsWith("/") && matchesRoute(pattern, path))
      if (!matched) unknown.push(path)
    }
    expect(unknown).toEqual([])
  })
})
