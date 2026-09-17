/**
 * قراران في الواجهة:
 *   1) شريط التنقل يعرض دائرة صورة البروفايل فقط — لا اسم المستخدم.
 *   2) صفحة البروفايل لا تحمل اختصاراً إلى لوحة التحكم؛ للإدارة مسارها
 *      الخاص (/admin) المحميّ بـ AdminGate.
 *
 * الاختبارات ساكنة على المصدر لأن المكوّنات تحتاج جلسة Supabase حية للعرض،
 * وما نثبّته هنا هو وجود/غياب عناصر محددة في JSX.
 */
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (p: string) => readFileSync(p, "utf8")

const AUTH = read("src/components/auth/AuthControls.tsx")
const PROFILE = read("src/pages/public/MyProfilePage.tsx")

/** مقطع زرّ القائمة في شريط التنقل (من <button إلى </button> الأول). */
const navButton = (() => {
  const start = AUTH.indexOf('aria-haspopup="menu"')
  expect(start, "navbar account button must exist").toBeGreaterThan(-1)
  const end = AUTH.indexOf("</button>", start)
  return AUTH.slice(start, end)
})()

describe("شريط التنقل: دائرة الصورة فقط", () => {
  it("لا يعرض اسم المستخدم نصاً مرئياً", () => {
    // الاسم مسموح داخل aria-label وtitle (صفتان) لكن ممنوع كنص عنصر.
    expect(navButton).not.toMatch(/<span[^>]*>[\s\S]*?\{displayName\}/)
    // ولا الاسم مقتطعاً بعرض ثابت كما كان
    expect(navButton).not.toContain("max-w-[92px]")
    // كل ظهور للاسم داخل الزر هو في صفة، لا في متن عنصر
    const occurrences = navButton.match(/\{displayName\}/g) ?? []
    expect(occurrences.length).toBe(2)
    expect(navButton).toContain("aria-label={`قائمة الحساب — ${displayName}`}")
    expect(navButton).toContain("title={displayName}")
  })

  it("يبقي دائرة الصورة (صورة أو أحرف أولى)", () => {
    expect(navButton).toContain("profile?.avatarUrl")
    expect(navButton).toContain("rounded-full")
    expect(navButton).toContain("initials(displayName")
  })

  it("لا سهم توسيع ولا رمز رتبة داخل الزر", () => {
    expect(navButton).not.toContain("ChevronDown")
    expect(navButton).not.toContain("rankDefinition.glyph")
  })

  it("الاسم انتقل إلى aria-label وtitle فلم تُفقد المعلومة", () => {
    // إزالة النص المرئي تعني أن قارئ الشاشة يحتاج الاسم بديلاً.
    expect(navButton).toContain("aria-label={`قائمة الحساب — ${displayName}`}")
    expect(navButton).toContain("title={displayName}")
  })

  it("الزر دائري ومتساوي الحشو بعد إزالة النص", () => {
    // كان py-1 pr-1 pl-2.5 لاستيعاب النص؛ صار p-1 لدائرة متماثلة.
    expect(navButton).toContain("p-1 ")
    expect(navButton).not.toContain("pl-2.5")
  })

  it("الاسم والرتبة يبقيان داخل القائمة المنسدلة", () => {
    const menu = AUTH.slice(AUTH.indexOf("</button>"))
    expect(menu).toContain("{displayName}")
    expect(menu).toContain("RankBadge")
  })

  it("خاصية compact أُزيلت مع كل مستعمليها", () => {
    // لم يعد لها معنى: الزر متطابق على الموبايل وسطح المكتب.
    expect(AUTH).not.toContain("compact")
    expect(read("src/layouts/PublicNavigation.tsx")).not.toContain("compact")
  })
})

describe("البروفايل: لا اختصار إلى لوحة التحكم", () => {
  it("لا زر «لوحة التحكم» ولا تنقّل إلى /admin", () => {
    expect(PROFILE).not.toContain("لوحة التحكم")
    expect(PROFILE).not.toContain('navigate("/admin/dashboard")')
    expect(PROFILE).not.toContain('"/admin')
  })

  it("شارة «إدارة» بجانب الاسم تبقى — دلالة دور لا مدخلاً", () => {
    expect(PROFILE).toContain("إدارة")
    expect(PROFILE).toContain("isAdmin")
  })

  it("مسار الإدارة ما زال محمياً بوابته الخاصة", () => {
    const routes = read("src/routes/AppRoutes.tsx")
    expect(routes).toContain("AdminGate")
    expect(routes).toContain('path="/admin"')
  })
})

describe("القائمة المنسدلة للصورة: لا مدخل إلى لوحة التحكم", () => {
  // التعليق التوثيقي أعلى الملف يذكر «لوحة التحكم» ليشرح سبب غيابها،
  // فنقتطع من return الخاص بالمكوّن فصاعداً حيث JSX الفعلي.
  // الانتباه: "return (" وحدها تلتقط تنظيف useEffect (return () => {...).
  const anchor = AUTH.indexOf("  return (\n    <div ref=")
  expect(anchor, "component main return must be locatable").toBeGreaterThan(-1)
  const jsx = AUTH.slice(anchor)

  it("لا عنصر «لوحة التحكم» في القائمة", () => {
    expect(jsx).not.toContain("لوحة التحكم")
    expect(jsx).not.toContain('go("/admin/dashboard")')
    expect(jsx).not.toContain("/admin")
  })

  it("isAdmin لم يعد يُقرأ في المكوّن — فلا حاجة إليه", () => {
    expect(AUTH).not.toMatch(/isAdmin/)
  })

  it("خاصية accent أُزيلت مع مستعملها الوحيد", () => {
    expect(AUTH).not.toContain("accent")
  })

  it("باقي عناصر القائمة سليمة", () => {
    for (const item of ["بروفايلي ورتبتي", "المحتوى المحفوظ", "الاختبارات"]) {
      expect(jsx, `menu item ${item}`).toContain(item)
    }
  })

  it("تسجيل الخروج يبقى — آخر عنصر في القائمة", () => {
    expect(jsx).toContain("تسجيل الخروج")
    // الدالة نفسها تُنادى في المعالج أعلى المكوّن، لا داخل JSX.
    expect(AUTH).toContain("signOut()")
  })
})
