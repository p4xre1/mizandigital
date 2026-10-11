// تركيب متتبّع زيارة الموقع: `SiteVisitTracker` كان مكتوباً وموثّقاً بلا تركيب،
// فبقيت «زيارات الموقع» في لوحة التحكم محصورة في قراءات المحتوى (article/news/
// term/pdf/event) ولا صف واحد بـ content_type = 'page'.
//
// هذا الملف يثبّت ما يلي على مستوى المصدر (لا يمكن تشغيل الراوتر كاملاً هنا):
//   1) المكوّن مُركَّب داخل PublicLayout (المكان الموثّق في تعليقه).
//   2) يُسجَّل بـ content_type = 'page' وبلا استثناء الزيارات المتكررة
//      (dedupePerSession: false) — أي زيارة حقيقية لكل تنقّل.
//   3) يُمرَّر المسار الحالي، لا شيء ثابت.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"

const root = join(__dirname, "..")
const read = (p: string) => readFileSync(join(root, p), "utf8")

const LAYOUT = read("src/layouts/PublicLayout.tsx")
const TRACKER = read("src/components/analytics/SiteVisitTracker.tsx")
const HOOK = read("src/hooks/useTrackView.ts")
const ADMIN_PAGE = read("src/pages/admin/AnalyticsPage.tsx")

describe("متتبّع زيارة الموقع", () => {
  test("مُركَّب مرة واحدة داخل PublicLayout (لا AdminLayout ولا أكثر من مرة)", () => {
    // يُحمَّل كسولاً: استيراده مباشرةً يجرّ عميل Supabase إلى حزمة الدخول
    // ويتجاوز ميزانية الحزمة التي يقيسها tests/performance-budget.test.ts
    expect(LAYOUT).toMatch(/const SiteVisitTracker = lazy\(\(\) =>/)
    expect(LAYOUT).toContain('import("@/components/analytics/SiteVisitTracker")')
    expect(LAYOUT.match(/<SiteVisitTracker \/>/g)?.length).toBe(1)
    expect(LAYOUT).toMatch(/<Suspense fallback=\{null\}>\s*<SiteVisitTracker \/>/)
    // داخل غلاف الموقع العام، قبل المحتوى
    expect(LAYOUT.indexOf("<SiteVisitTracker />")).toBeLessThan(LAYOUT.indexOf("<Outlet />"))
    expect(LAYOUT).toContain("site-public")
  })

  test("يُسجَّل بلا استثناء الجلسة وبالمسار الحالي", () => {
    expect(TRACKER).toContain('useTrackView("page", location.pathname')
    expect(TRACKER).toContain("dedupePerSession: false")
    expect(TRACKER).toContain("useLocation()")
  })

  test("الزيارات بلا استثناء جلسة تمرّ بالمسار نفسه من useTrackView", () => {
    // عند dedupePerSession=false يُرسل كل تنقّل ولا يُخزَّن مفتاح الاستثناء
    expect(HOOK).toMatch(/if \(dedupePerSession && window\.sessionStorage\.getItem\(dedupeKey\) === "1"\)/)
    expect(HOOK).toMatch(/if \(!cancelled && !error && dedupePerSession\)/)
    // وcontent_type مسموح به في قيد الجدول
    expect(HOOK).toContain('from("page_views")')
  })

  test("لوحة التحكم تعرض مصدر الزيارات من الدالة الجديدة، وغياب الترحيل لا يُفشل الصفحة", () => {
    expect(ADMIN_PAGE).toContain('rpc("get_visits_by_referrer"')
    expect(ADMIN_PAGE).toContain("setSourcesAvailable(!sourcesRes?.error)")
    expect(ADMIN_PAGE).toContain("20261012000500_page_views_traffic_sources.sql")
    // لا يُرمى الخطأ على المستخدم: الخطأ الحاجب يبقى get_total_visits وحده
    expect(ADMIN_PAGE).toMatch(/if \(totalRes\.error\) throw totalRes\.error/)
  })
})
