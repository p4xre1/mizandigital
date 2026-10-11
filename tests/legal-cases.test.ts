import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"
import {
  draftToPayload, emptyDraft, parseCheck, suggestSlug, validateDraft, type CaseDraft,
} from "@/lib/cases/model"

const root = join(__dirname, "..")
const read = (p: string) => readFileSync(join(root, p), "utf8")

const seed = JSON.parse(read("data/cases/cases.json")) as {
  reviewed_by: string
  reviewed_on: string
  cases: {
    slug: string; title: string; law_code: string; difficulty: string; story: string; question: string
    options: string[]; answer_index: number; hint: string; explanation: string
    articles: { law: string; article: number }[]; image: string; image_alt: string
  }[]
}
const laws: Record<string, Record<number, string>> = {}
for (const [code, file] of [
  ["mudawana-70-03", "data/laws/mudawana-70-03.articles.json"],
  ["constitution-2011", "data/laws/constitution-2011.articles.json"],
] as const) {
  laws[code] = {}
  // ملفات المستودع تستعمل "number" (والتصديرات الأقدم "article")
  for (const a of JSON.parse(read(file)).articles as { number?: number; article?: number; text: string }[])
    laws[code][Number(a.number ?? a.article)] = a.text
}

function validDraft(overrides: Partial<CaseDraft> = {}): CaseDraft {
  return {
    ...emptyDraft(),
    slug: "hurmat-al-manzil-test",
    title: "تفتيش منزل بلا إجراء",
    story: "وصل عناصر من الشرطة إلى منزل أسرة في مدينة تطوان، وأرادوا تفتيشه دون إذن قضائي.",
    question: "هل يجوز هذا التفتيش وفق الفصل 24؟",
    options: ["نعم دائماً", "نعم نهاراً", "لا إلا وفق الإجراءات", "نعم بموافقة الجيران"],
    answer_index: 2,
    hint: "راجع الفصل 24 من الدستور.",
    explanation: "ينص الفصل 24 على أن حرمة المنزل لا تنتهك إلا وفق القانون.",
    articles: [{ law: "constitution-2011", article: "24", text: "لا تنتهك حرمة المنزل." }],
    ...overrides,
  }
}

describe("نموذج الحالات: الرابط الثابت", () => {
  test("suggestSlug ينتج رابطاً لاتينياً صالحاً أو لا شيء", () => {
    expect(suggestSlug("Hurmat Al Manzil 2026!")).toBe("hurmat-al-manzil-2026")
    expect(suggestSlug("حرمة المنزل")).toBe("")
  })

  test("validateDraft يقبل النموذج الصالح", () => {
    expect(validateDraft(validDraft())).toBeNull()
  })

  test("يرفض الرابط غير الصالح أو الكبير الحروف", () => {
    expect(validateDraft(validDraft({ slug: "Bad Slug" }))).toMatch(/الرابط الثابت/)
    expect(validateDraft(validDraft({ slug: "-x-" }))).toMatch(/الرابط الثابت/)
    expect(validateDraft(validDraft({ slug: "ab" }))).toMatch(/الرابط الثابت/)
  })

  test("يرفض خيارات متكررة أو فارغة", () => {
    expect(validateDraft(validDraft({ options: ["نعم", "نعم", "لا", "ربما"] }))).toMatch(/مختلفة/)
    expect(validateDraft(validDraft({ options: ["نعم", "", "لا", "ربما"] }))).toMatch(/كل خيار/)
  })

  test("يرفض فهرس جواب خارج النطاق", () => {
    expect(validateDraft(validDraft({ answer_index: 4 }))).toMatch(/الخيار الصحيح/)
  })

  test("لا ينشر حالة بلا مراجع", () => {
    expect(validateDraft(validDraft({ published: true, reviewed_by: "" }))).toMatch(/المراجع/)
    expect(validateDraft(validDraft({ published: true, reviewed_by: "مراجعة داخلية" }))).toBeNull()
  })

  test("يرفض مادة بلا رقم أو بنص فارغ، ورابط صورة غير آمن", () => {
    expect(validateDraft(validDraft({ articles: [{ law: "constitution-2011", article: "abc", text: "نص" }] }))).toMatch(/رقم المادة/)
    expect(validateDraft(validDraft({ articles: [{ law: "constitution-2011", article: "24", text: " " }] }))).toMatch(/نص المادة/)
    expect(validateDraft(validDraft({ image_url: "javascript:alert(1)" }))).toMatch(/رابط الصورة/)
  })

  test("draftToPayload يحوّل المواد إلى أرقام ويضبط التاريخ الفارغ", () => {
    const payload = draftToPayload(validDraft({ reviewed_on: "" }))
    expect(payload.articles[0].article).toBe(24)
    expect(payload.reviewed_on).toBeNull()
    expect("id" in payload).toBe(false)
  })
})

describe("تحليل ردّ التصحيح", () => {
  test("الصواب يكشف الشرح والمواد", () => {
    const parsed = parseCheck({ status: "correct", correct_index: 2, explanation: "شرح", articles: [{ law: "constitution-2011", article: 24, text: "نص" }] })
    expect(parsed).toEqual({ status: "correct", correctIndex: 2, explanation: "شرح", articles: [{ law: "constitution-2011", article: 24, text: "نص" }] })
  })

  test("الخطأ يعيد التلميح فقط دون رقم الجواب", () => {
    const parsed = parseCheck({ status: "wrong", hint: "راجع الفصل 24" })
    expect(parsed).toEqual({ status: "wrong", hint: "راجع الفصل 24" })
    expect(JSON.stringify(parsed)).not.toMatch(/correct/)
  })

  test("أي شكل غير متوقع يصبح unavailable", () => {
    expect(parseCheck(null)).toEqual({ status: "unavailable" })
    expect(parseCheck({ status: "correct" })).toEqual({ status: "unavailable" })
    expect(parseCheck("x")).toEqual({ status: "unavailable" })
  })
})

describe("البذر: بيانات الحالات العشر", () => {
  test("عشر حالات بروابط فريدة وصالحة", () => {
    expect(seed.cases).toHaveLength(10)
    const slugs = seed.cases.map(c => c.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  test("كل حالة: أربعة خيارات مختلفة وجواب داخل النطاق ومواد موجودة في القانون", () => {
    for (const c of seed.cases) {
      expect(new Set(c.options).size, c.slug).toBe(4)
      expect(c.answer_index, c.slug).toBeGreaterThanOrEqual(0)
      expect(c.answer_index, c.slug).toBeLessThanOrEqual(3)
      expect(c.articles.length, c.slug).toBeGreaterThan(0)
      for (const ref of c.articles) {
        expect(laws[ref.law]?.[ref.article], `${c.slug}: ${ref.law} ${ref.article}`).toBeTruthy()
      }
    }
  })

  test("كل حالة لها صورة موجودة وقصة وسؤال", () => {
    for (const c of seed.cases) {
      expect(existsSync(join(root, "public/cases", c.image)), c.slug).toBe(true)
      expect(c.story.length, c.slug).toBeGreaterThanOrEqual(40)
      expect(c.question.length, c.slug).toBeGreaterThanOrEqual(8)
      expect(c.image_alt.length, c.slug).toBeGreaterThan(0)
    }
  })

  test("الهجرة المولَّدة تحوي كل الروابط مرة واحدة", () => {
    const sql = read("supabase/migrations/20261012000400_legal_cases_seed.sql")
    for (const c of seed.cases) {
      expect(sql.split(`$q$${c.slug}$q$`).length - 1, c.slug).toBe(1)
    }
    expect(sql).toMatch(/ON CONFLICT \(slug\) DO NOTHING/)
  })
})

describe("أمان الجدول والعرض العام", () => {
  const schema = read("supabase/migrations/20261012000300_legal_cases_game.sql")
  const viewBlock = schema.slice(schema.indexOf("CREATE VIEW public.legal_cases_public"), schema.indexOf("GRANT SELECT ON public.legal_cases_public"))
  const rowsFn = schema.slice(
    schema.indexOf("CREATE OR REPLACE FUNCTION public.legal_cases_public_rows"),
    schema.indexOf("GRANT EXECUTE ON FUNCTION public.legal_cases_public_rows"),
  )

  test("الجدول الأساسي لا يُمنح لـ anon ويُقرأ للإدارة فقط", () => {
    expect(schema).toMatch(/REVOKE ALL ON public\.legal_cases FROM anon, authenticated/)
    expect(schema).toMatch(/USING \(public\.is_admin\(\)\)/)
    expect(schema).not.toMatch(/GRANT SELECT[^;]*legal_cases TO anon/)
  })

  test("العرض العام لا يكشف الجواب ولا الشرح ولا نصوص المواد", () => {
    for (const block of [viewBlock, rowsFn]) {
      expect(block.length).toBeGreaterThan(0)
      expect(block).not.toMatch(/answer_index/)
      expect(block).not.toMatch(/explanation/)
      expect(block).not.toMatch(/articles/)
    }
    // الحالات المنشورة فقط، من دالة مالكة بمسار بحث مثبّت
    expect(rowsFn).toMatch(/WHERE c\.published = true/)
    expect(rowsFn).toMatch(/SECURITY DEFINER/)
    expect(rowsFn).toMatch(/SET search_path = ''/)
  })

  test("العرض العام بصلاحية المستدعي وللقراءة فقط (لا كتابة عبره تتجاوز RLS)", () => {
    // view بصلاحية المالك على جدول واحد قابلة للتحديث، وSupabase يمنح anon كل الصلاحيات
    // على الـ views الجديدة افتراضياً — فلا نقبلها.
    expect(schema).not.toMatch(/security_invoker\s*=\s*false/)
    expect(viewBlock).toMatch(/WITH \(security_invoker = true\)/)
    expect(viewBlock).toMatch(/FROM public\.legal_cases_public_rows\(\)/)
    const revoke = schema.indexOf("REVOKE ALL ON public.legal_cases_public FROM PUBLIC, anon, authenticated")
    expect(revoke).toBeGreaterThan(-1)
    expect(revoke).toBeLessThan(schema.indexOf("GRANT SELECT ON public.legal_cases_public TO anon, authenticated"))
  })

  test("دالة التصحيح لا تُرجع رقم الجواب إلا عند الصواب", () => {
    const fn = schema.slice(schema.indexOf("CREATE OR REPLACE FUNCTION public.legal_case_check"))
    const wrongBranch = fn.slice(fn.indexOf("IF p_choice = v_case.answer_index"))
    expect(wrongBranch.indexOf("'hint'")).toBeGreaterThan(-1)
    const wrongReturn = wrongBranch.slice(wrongBranch.lastIndexOf("RETURN jsonb_build_object('status', 'wrong'"))
    expect(wrongReturn).not.toMatch(/correct_index/)
    expect(fn).toMatch(/SECURITY DEFINER/)
    expect(fn).toMatch(/GRANT EXECUTE ON FUNCTION public\.legal_case_check\(text, integer\) TO anon, authenticated/)
  })
})
