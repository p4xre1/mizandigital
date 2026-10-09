import { describe, expect, test } from "vitest"
import { ARTICLE_FORMS, SOURCE_FORMS, TERM_FORMS, arabicCount } from "@/lib/utils/arabicCount"

describe("arabicCount: مطابقة العدد للمعدود", () => {
  test("1 يعرض المفرد مع «واحد» بلا رقم، ولا «1 مصادر» أبداً", () => {
    expect(arabicCount(1, SOURCE_FORMS)).toBe("مصدر قانوني واحد")
    expect(arabicCount(1, ARTICLE_FORMS)).toBe("فصل واحد")
    expect(arabicCount(1, SOURCE_FORMS)).not.toMatch(/\d/)
  })

  test("2 يعرض المثنى بلا رقم", () => {
    expect(arabicCount(2, SOURCE_FORMS)).toBe("مصدران قانونيان")
    expect(arabicCount(2, ARTICLE_FORMS)).toBe("فصلان")
  })

  test("3 إلى 10 تعرض الرقم مع الجمع", () => {
    expect(arabicCount(3, ARTICLE_FORMS)).toBe("3 فصول")
    expect(arabicCount(10, ARTICLE_FORMS)).toBe("10 فصول")
    expect(arabicCount(3, SOURCE_FORMS)).toBe("3 مصادر قانونية")
  })

  test("11 فما فوق تعرض الرقم مع المنصوب المفرد", () => {
    expect(arabicCount(11, SOURCE_FORMS)).toBe("11 مصدراً قانونياً")
    expect(arabicCount(12, ARTICLE_FORMS)).toBe("12 فصلاً")
    expect(arabicCount(250, TERM_FORMS)).toBe("250 مصطلحاً")
  })
})
