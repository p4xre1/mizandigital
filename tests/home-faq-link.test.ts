/**
 * رابط «المزيد من الأسئلة والأجوبة» تحت قائمة الأسئلة الشائعة في الصفحة
 * الرئيسية، ويؤدّي إلى /faq.
 *
 * شقّان: ساكن على المصدر، وتحقّق من HTML المُهيَّأ مسبقاً فعلاً إن كان
 * dist موجوداً (فالرئيسية تُهيَّأ من React، فالرابط يجب أن يظهر فيه).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { describe, expect, it, test } from "vitest"
import faqGroups from "@/data/faq.json"

const SRC = readFileSync("src/components/home/HomeFaqSection.tsx", "utf8")
const DIST = "dist/index.html"
const hasDist = existsSync(DIST)

const totalQuestions = faqGroups.reduce((n, g) => n + (g.items?.length ?? 0), 0)

describe("رابط صفحة الأسئلة الشائعة في الرئيسية", () => {
  it("يستعمل مساراً نسبياً لا نطاقاً مطلقاً", () => {
    // النطاق المطلق يكسر المعاينة المحلية ويعيد تحميل التطبيق كاملاً.
    expect(SRC).toContain('to="/faq"')
    expect(SRC).not.toContain("https://www.mizan.page/faq")
    expect(SRC).not.toMatch(/href="https?:\/\/[^"]*\/faq/)
  })

  it("الرابط عنصر Link من react-router لا وسم <a>", () => {
    expect(SRC).toContain('import { Link } from "react-router-dom"')
    expect(SRC).toContain("<Link\n            to=\"/faq\"")
  })

  it("نصّه واضح ويحمل سهم الاتجاه المتّبع في الموقع", () => {
    expect(SRC).toContain("المزيد من الأسئلة والأجوبة")
    // نفس اصطلاح باقي روابط «عرض الكل»: سهم ينقلب في RTL.
    expect(SRC).toContain('ArrowRight className="size-4 rtl:rotate-180"')
  })

  it("موضوع بعد القائمة لا قبلها", () => {
    const lastFaqItem = SRC.indexOf("})}")
    const linkAt = SRC.indexOf('to="/faq"')
    expect(lastFaqItem).toBeGreaterThan(-1)
    expect(linkAt).toBeGreaterThan(lastFaqItem)
  })

  it("الوصف يُشتقّ من faq.json فلا يتقادم", () => {
    expect(SRC).toContain('import faqGroups from "@/data/faq.json"')
    expect(SRC).toContain("totalFaqCount")
    expect(SRC).toContain("{faqGroups.length} مواضيع")
    // لا رقم مكتوب يدوياً في النص
    expect(SRC).not.toMatch(/>\s*\d+\s*سؤالاً/)
  })

  it("البيانات نفسها أغنى من خلاصة الرئيسية", () => {
    // الخلاصة 5 أسئلة؛ الصفحة الكاملة يجب أن تزيد وإلا فلا معنى للرابط.
    expect(totalQuestions).toBeGreaterThan(5)
    expect(faqGroups.length).toBeGreaterThan(1)
  })

  it("مسار /faq موجود فعلاً في الموجّه", () => {
    expect(readFileSync("src/routes/AppRoutes.tsx", "utf8")).toContain('path="/faq"')
  })
})

// ملاحظة: describe.skipIf تُنفّذ متن الوصف لجمع الاختبارات وإن وُسِمت
// skipped، فقراءة dist هناك ترمي ENOENT في CI حيث لا يُبنى dist. القراءة
// تكون داخل كل اختبار — وهو اصطلاح tests/legal-pages-agree.test.ts.
const readAssets = () =>
  readdirSync("dist/assets")
    .filter((f) => f.endsWith(".js"))
    .map((f) => readFileSync(`dist/assets/${f}`, "utf8"))
    .join("\n")

describe("البناء الناتج", () => {
  // الرئيسية تُبنى بـ createRoot().render() لا hydrateRoot، فالمتن الثابت
  // موجّه للزاحف وحده ويستبدله React عند الإقلاع. لذلك نفحص شقّين:
  // الرابط في HTML الثابت، ونصوص المكوّن في حزمة JS.

  test.skipIf(!hasDist)("HTML الرئيسية الثابت يربط إلى /faq للزاحف", () => {
    expect(readFileSync(DIST, "utf8")).toContain('href="/faq"')
  })

  test.skipIf(!hasDist)("نص الرابط مشحون في حزمة JavaScript", () => {
    expect(readAssets()).toContain("المزيد من الأسئلة والأجوبة")
  })

  test.skipIf(!hasDist)("قالب جملة العدد المحسوب من faq.json يصل إلى الحزمة", () => {
    // الرقم نفسه يُحسب وقت التشغيل فلا يُطبع ثابتاً، لكن القالب موجود.
    const assets = readAssets()
    expect(assets).toContain("سؤالاً في")
    expect(assets).toContain("مواضيع")
  })

  test.skipIf(!hasDist)("صفحة /faq نفسها مُهيَّأة", () => {
    expect(existsSync("dist/faq.html")).toBe(true)
  })
})
