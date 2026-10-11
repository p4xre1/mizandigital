// ضجيج إضافات المتصفح في console — تصنيفه بدقة حتى لا تختلط أخطاء الموقع بأخطاء الإضافات.
//
// الحالات المفحوصة مأخوذة حرفياً من console متصفح الزائر على www.mizan.page
// (إضافات: Enable Copy، Semalt SEO، AITDK SEO، وإضافة مشاركة). المطلوب:
//   1) كل سطر من الإضافات يُصنَّف ضجيجاً (يُسكَت في globalGuard).
//   2) أي خطأ حقيقي من ملفاتنا (بمسار /assets/ وبصمة) لا يُصنَّف ضجيجاً —
//      وخصوصاً نفس نص خطأ الإضافة حين يأتي من كودنا نحن.

import { describe, expect, test } from "vitest"
import { EXTENSION_NOISE_RE, EXTENSION_NOISE_SOURCE_RE, isKnownExtensionNoise } from "@/lib/security/globalGuard"

/** [الرسالة, اسم الملف المُبلِّغ] — كما تظهر في console. */
const EXTENSION_LINES: Array<[string, string]> = [
  ["Object", "enable_copy.js"],
  ["E.C.P is not enabled, returning", "enable_copy.js"],
  ["Uncaught TypeError: Cannot read properties of null (reading 'addEventListener')", "share-modal.js"],
  ["TypeError: Cannot read properties of undefined (reading 'config')", "content.js"],
  ["Cant get data about semalt rank", "content.js"],
  ["Extension title changed!", "content.js"],
  ["Switched to other tab www.mizan.page", "content.js"],
  ["Failed to load resource: net::ERR_CONNECTION_TIMED_OUT", "semalt.net/api/v1/serp/rank/?site=www.mizan.page&se=1"],
  [
    "Unchecked runtime.lastError: A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received",
    "/schools",
  ],
  [
    "Failed to execute 'postMessage' on 'DOMWindow': The target origin provided ('https://extension.aitdk.com') does not match the recipient window's origin ('https://www.mizan.page')",
    "sidebar.524fe15c.js",
  ],
]

/** أخطاء حقيقية من كود الموقع: يجب أن تبقى ظاهرة. */
const REAL_ERRORS: Array<[string, string]> = [
  ["TypeError: Cannot read properties of null (reading 'addEventListener')", "/assets/App-BmB5V0rl.js"],
  ["TypeError: Cannot read properties of undefined (reading 'slug')", "https://www.mizan.page/assets/ArticlePage-znWFa5dT.js"],
  ["Failed to fetch dynamically imported module: /assets/quiz-questions-B7ibn41S.js", ""],
  ["Uncaught (in promise) Error: تعذّر تحميل إحصائيات الزيارات", "/assets/AnalyticsPage-CFFXo4N6.js"],
  ["TypeError: Failed to fetch", ""],
]

describe("تصنيف ضجيج إضافات المتصفح", () => {
  for (const [message, source] of EXTENSION_LINES) {
    test(`ضجيج: ${source} — ${message.slice(0, 52)}`, () => {
      expect(isKnownExtensionNoise(message, source)).toBe(true)
    })
  }

  for (const [message, source] of REAL_ERRORS) {
    test(`ليس ضجيجاً: ${source || "(بلا ملف)"} — ${message.slice(0, 52)}`, () => {
      expect(isKnownExtensionNoise(message, source)).toBe(false)
    })
  }

  test("التصنيف يعتمد على اسم الملف أيضاً: نفس نص خطأ الإضافة من ملفاتنا يبقى ظاهراً", () => {
    const shareModalError = "Cannot read properties of null (reading 'addEventListener')"
    expect(isKnownExtensionNoise(shareModalError, "share-modal.js")).toBe(true)
    expect(isKnownExtensionNoise(shareModalError, "/assets/PublicLayout-Dk2mQ9.js")).toBe(false)
  })

  test("لا يبتلع أخطاء الشبكة أو المصادقة العامة", () => {
    for (const msg of [
      "AuthApiError: Invalid login credentials",
      "PGRST301: JWT expired",
      "NetworkError when attempting to fetch resource.",
      "QuotaExceededError: Failed to execute 'setItem' on 'Storage'",
    ]) {
      expect(isKnownExtensionNoise(msg, "/assets/index-Cko9M2KU.js")).toBe(false)
    }
  })

  test("الأنماط المضافة حديثاً موجودة في التعبير النمطي", () => {
    expect(EXTENSION_NOISE_RE.source).toMatch(/extension\\\.aitdk\\\.com/)
    expect(EXTENSION_NOISE_RE.source).toMatch(/Extension title changed/)
    expect(EXTENSION_NOISE_RE.source).toMatch(/Switched to other tab/)
  })
})
