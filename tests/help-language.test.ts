import { describe, expect, test } from "vitest"
import { detectLanguage, UNSUPPORTED_LANGUAGE_ANSWER } from "../shared/help/language.js"

describe("كشف لغة سؤال المساعد", () => {
  test("الأسئلة العربية تُعد عربية", () => {
    expect(detectLanguage("كيف أبحث في الأرشيف؟")).toBe("ar")
    expect(detectLanguage("ما هو الدهير الشريف؟")).toBe("ar")
    expect(detectLanguage("كيف أحمل ملفات PDF من S1؟")).toBe("ar")
  })

  test("الأسئلة الفرنسية والإنجليزية تُعد غير عربية", () => {
    expect(detectLanguage("Comment chercher dans le lexique ?")).toBe("other")
    expect(detectLanguage("How do I search the archive?")).toBe("other")
    expect(detectLanguage("Как найти статью?")).toBe("other")
  })

  test("النص بلا حروف (أرقام ورموز فقط) يُعد none", () => {
    expect(detectLanguage("12345 ?!")).toBe("none")
    expect(detectLanguage("")).toBe("none")
  })

  test("النص المختلط يحسمه الأغلب", () => {
    expect(detectLanguage("ما معنى contract في الموقع؟")).toBe("ar")
    expect(detectLanguage("what is the الأرشيف section of the site?")).toBe("other")
  })

  test("رسالة الرفض تذكر العربية وتحمل نص الفرنسية", () => {
    expect(UNSUPPORTED_LANGUAGE_ANSWER).toContain("العربية فقط")
    expect(UNSUPPORTED_LANGUAGE_ANSWER).toContain("arabe")
  })
})
