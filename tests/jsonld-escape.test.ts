/**
 * اختبارات هرّب JSON-LD.
 *
 * كانت هذه الملفّة تعرّف نسخة محلية من `escapeJsonLd` وتختبرها — أي أنها كانت
 * تختبر نفسها لا الكود. لذلك بقيت خضراء فيما كان `HomeFaqSection.tsx` و
 * `schema.ts:renderSchemaScript` يحقنان `JSON.stringify` خاماً بلا أي هرّب.
 * الآن نستورد الدالة الحقيقية من `@/lib/seo/jsonLd`.
 *
 * الفرق الجوهري عن النسخة القديمة: لا نهرّب علامتي الاقتباس. `JSON.stringify`
 * هرّبهما أصلاً داخل السلاسل، وإعادة هرّبهما تُفسد بنية JSON نفسها فيعجز
 * محرك البحث عن تحليل البيانات المهيكلة.
 */
import { describe, test, expect } from "vitest"
import { escapeJsonLd, jsonLdProps } from "@/lib/seo/jsonLd"

describe("jsonld escape — الدالة الحقيقية", () => {
  test("escapes < > &", () => {
    const input = '<script>alert("x")</script> & more'
    const escaped = escapeJsonLd(input)
    expect(escaped).not.toContain("<script>")
    expect(escaped).not.toContain("</script>")
    expect(escaped).toContain("\\u003c")
    expect(escaped).toContain("\\u003e")
    expect(escaped).toContain("\\u0026")
  })

  test("does not escape quotes — JSON.stringify already did", () => {
    // هرّب الاقتباس هنا كان سيكسر JSON: البنية نفسها مبنية عليه.
    const html = escapeJsonLd(JSON.stringify({ name: `"test" and 'test'` }))
    expect(html).not.toContain("\\u0022")
    expect(JSON.parse(html).name).toBe(`"test" and 'test'`)
  })

  test("safe for arabic", () => {
    const input = "قانون المسطرة المدنية رقم 58.25"
    const escaped = escapeJsonLd(input)
    expect(escaped).toBe(input) // النص العربي يمرّ سليماً — لا نهرّب ما لا يكسر الوسم
  })

  test("المخرَج يبقى JSON صالحاً بعد الهرّب", () => {
    const props = jsonLdProps({ "@type": "Article", headline: "</script><script>x</script>" })
    expect(props.type).toBe("application/ld+json")
    const parsed = JSON.parse(props.dangerouslySetInnerHTML.__html)
    expect(parsed["@type"]).toBe("Article")
  })
})
