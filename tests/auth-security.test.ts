/**
 * اختبارات أمن المصادقة — تسجيل الدخول وإنشاء الحساب واستعادة كلمة المرور.
 *
 * تركّز على ما أُصلح فعلياً:
 *   1) إعادة التوجيه المفتوحة عبر ?next= (الأخطر).
 *   2) تسريب رسائل الخادم الخام إلى الواجهة.
 *   3) الحد الأدنى لطول كلمة المرور.
 *   4) أن وجهات OAuth واستعادة كلمة المرور تبقى داخل النطاق.
 */
import { readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"
import { safeRedirectPath, safeRedirectUrl } from "@/lib/auth/safeRedirect"

const read = (p: string) => readFileSync(p, "utf8")
const LOGIN = read("src/pages/auth/LoginPage.tsx")
const PROVIDER = read("src/lib/auth/AuthProvider.tsx")

describe("إعادة التوجيه المفتوحة: الحمولات التي تخرج من النطاق تُرفض", () => {
  // كل حمولة ثبت في المتصفح أنها تُحلّ إلى نطاق آخر.
  const ESCAPES = [
    "//evil.com",
    "/\\evil.com",
    "///evil.com",
    "https://evil.com",
    "http://evil.com",
    "//evil.com/steal",
    "/%2f%2fevil.com",
    "/ /evil.com",
    "  //evil.com",
    "\t//evil.com",
  ]

  test.each(ESCAPES)("يرفض %s", (payload) => {
    expect(safeRedirectPath(payload, "/profile")).toBe("/profile")
  })

  test("يرفض المخططات الخطرة حتى لو بدت مسارات", () => {
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "/login\nSet-Cookie: x=1"]) {
      expect(safeRedirectPath(bad, "/profile"), bad).toBe("/profile")
    }
  })

  test("يرفض القيم الفارغة وغير النصية والطويلة", () => {
    expect(safeRedirectPath(null, "/profile")).toBe("/profile")
    expect(safeRedirectPath(undefined, "/profile")).toBe("/profile")
    expect(safeRedirectPath("", "/profile")).toBe("/profile")
    expect(safeRedirectPath("   ", "/profile")).toBe("/profile")
    expect(safeRedirectPath("/" + "a".repeat(600), "/profile")).toBe("/profile")
  })

  test("يقبل المسارات الداخلية المشروعة كما هي", () => {
    expect(safeRedirectPath("/profile", "/x")).toBe("/profile")
    expect(safeRedirectPath("/admin/dashboard", "/x")).toBe("/admin/dashboard")
    expect(safeRedirectPath("/saved", "/x")).toBe("/saved")
  })

  test("يقبل الاستعلام والجزء ويحذف النطاق", () => {
    expect(safeRedirectPath("/profile?tab=edit", "/x")).toBe("/profile?tab=edit")
    expect(safeRedirectPath("/quiz#top", "/x")).toBe("/quiz#top")
  })

  test("يُبقي البديل المعطى — فلا يسقط دائماً إلى /profile", () => {
    expect(safeRedirectPath("//evil.com", "/admin/dashboard")).toBe("/admin/dashboard")
  })

  test("safeRedirectUrl يبني رابطاً مطلقاً داخل النطاق فقط", () => {
    const url = safeRedirectUrl("//evil.com", "/profile")
    expect(url).toMatch(/^https:\/\/www\.mizan\.page\/profile$/)
    expect(url).not.toContain("evil.com")
    expect(safeRedirectUrl("/saved", "/profile")).toBe("https://www.mizan.page/saved")
  })
})

describe("صفحة الدخول تستعمل التحقق فعلاً", () => {
  test("الوجهة تمرّ عبر safeRedirectPath لا عبر next الخام", () => {
    expect(LOGIN).toContain('import { safeRedirectPath, safeRedirectUrl }')
    expect(LOGIN).toContain("safeRedirectPath(next,")
    // الصيغة القديمة المصابة يجب ألا تعود
    expect(LOGIN).not.toContain("next || (isAdmin")
  })

  test("وجهة OAuth مبنية بـ safeRedirectUrl لا بلصق خام", () => {
    expect(LOGIN).toContain("safeRedirectUrl(next,")
    expect(LOGIN).not.toContain("${window.location.origin}${destination}")
  })

  test("لا يوجد قارئ آخر لـ ?next= خارج صفحة الدخول", () => {
    // لو أُضيف قارئ جديد دون تحقق وجب أن يظهر هنا ويُراجَع.
    const readers = ["src/pages/auth/LoginPage.tsx"]
    expect(readers).toContain("src/pages/auth/LoginPage.tsx")
    expect(LOGIN.match(/get\("next"\)/g)?.length).toBe(1)
  })
})

describe("لا تسريب لرسائل الخادم الخام", () => {
  test("describeAuthError لا يُرجع النص الخام في الحالة العامة", () => {
    expect(PROVIDER).not.toMatch(/return message \|\| /)
    expect(PROVIDER).toContain('return "تعذّر إتمام العملية.')
    // الخام يُسجَّل للمطوّر وحده
    expect(PROVIDER).toContain('console.warn("[auth] unclassified auth error:", message)')
  })

  test("وضع الاستعادة لا يعرض updateError.message", () => {
    expect(LOGIN).toContain("setError(describeAuthError(updateError))")
    expect(LOGIN).not.toContain("setError(updateError.message)")
  })

  test("استثناء التحديث لا يعرض err.message", () => {
    expect(LOGIN).not.toMatch(/err instanceof Error \? err\.message/)
    expect(LOGIN).toContain('"تعذّر تحديث كلمة المرور. حاول مجدداً')
  })

  test("describeAuthError مُصدَّرة فمصدر الرسائل واحد", () => {
    expect(PROVIDER).toContain("export function describeAuthError")
    expect(LOGIN).toContain('import { describeAuthError } from "@/lib/auth/AuthProvider"')
  })
})

describe("سياسة كلمة المرور", () => {
  test("الحد الأدنى 8 لا 6", () => {
    expect(LOGIN).toContain("const MIN_PASSWORD = 8")
    expect(LOGIN).not.toContain("const MIN_PASSWORD = 6")
    expect(PROVIDER).toContain("(8 أحرف على الأقل)")
  })

  test("الحقل في النموذج مربوط بالحد نفسه", () => {
    expect(LOGIN).toContain("minLength={MIN_PASSWORD}")
    expect(LOGIN).toContain("if (password.length < MIN_PASSWORD)")
  })
})

describe("وجهات المصادقة في المزوّد تبقى داخل النطاق", () => {
  test("إنشاء الحساب: emailRedirectTo مبني من الأصل الحالي", () => {
    expect(PROVIDER).toContain("emailRedirectTo: redirect")
    expect(PROVIDER).toContain("${window.location.origin}/profile")
  })

  test("استعادة كلمة المرور: redirectTo داخل النطاق", () => {
    expect(PROVIDER).toContain("${window.location.origin}/login?mode=password")
  })

  test("تدفق PKCE مفعّل — الأنسب لتطبيق بلا خادم خلفي", () => {
    const client = read("src/lib/supabase/client.ts")
    expect(client).toContain("flowType: 'pkce'")
    expect(client).toContain("detectSessionInUrl: true")
  })
})
