/**
 * روابط التواصل الاجتماعي — pinterest وfacebook محدّثان إلى حسابَيهما
 * الحقيقيين، وموجودان في كل الأسطح لا في بعضها.
 *
 * القيمتان متكررتان في ستة ملفات (واجهة مرئية + بيانات مهيكلة + قشرة HTML
 * + متن ثابت للزاحف)، فأي تحديث جزئي يترك الموقع يعلن حسابين مختلفين.
 * هذا الاختبار يمنع ذلك.
 */
import { readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"

const read = (p: string) => readFileSync(p, "utf8")

const PINTEREST = "https://www.pinterest.com/mohamedredayassinn/"
const FACEBOOK = "https://www.facebook.com/profile.php?id=61593607157317"

/** كل الأسطح التي يجب أن تحمل الرابطين معاً. */
const SURFACES = [
  "src/layouts/PublicNavigation.tsx", // الأزرار المرئية في التذييل
  "src/components/seo/SEOHead.tsx", // sameAs المحقون وقت التشغيل
  "src/components/seo/SchemaOrg.tsx", // sameAs في مخطط المنظمة
  "src/lib/seo/schema.ts", // SITE_CONFIG / sameAs
  "index.html", // قشرة HTML قبل الإقلاع
  "scripts/prerender.mjs", // المتن الثابت الموجّه للزاحف
]

const X = "https://x.com/MIZANPAGE"
const WHATSAPP = "https://whatsapp.com/channel/0029Vb97ZZE23n3WE7R6Tf1m"

const OLD_PINTEREST = "https://www.pinterest.com/mizan.page"
const OLD_FACEBOOK = "https://www.facebook.com/mizan.page"

describe("روابط التواصل محدَّثة في كل سطح", () => {
  test.each(SURFACES)("%s يحمل حساب بنترست الجديد", (file) => {
    expect(read(file)).toContain(PINTEREST)
  })

  test.each(SURFACES)("%s يحمل صفحة فيسبوك الجديدة", (file) => {
    expect(read(file)).toContain(FACEBOOK)
  })

  test.each(SURFACES)("%s خالٍ من الرابطين القديمين", (file) => {
    const s = read(file)
    expect(s, "old pinterest").not.toContain(OLD_PINTEREST)
    expect(s, "old facebook").not.toContain(OLD_FACEBOOK)
  })
})

describe("صيغة الرابط صحيحة", () => {
  test("فيسبوك يستضيف على www لا على web.facebook.com", () => {
    // web.facebook.com مضيف بديل يعيد التوجيه 301 إلى www، ومحركات البحث
    // وقارئات sameAs تتوقع الصيغة القانونية، فنوفّر قفزة إعادة توجيه.
    for (const file of SURFACES) {
      expect(read(file), file).not.toContain("web.facebook.com")
    }
    expect(FACEBOOK).toContain("profile.php?id=61593607157317")
  })

  test("بنترست على المسار الشخصي الجديد", () => {
    expect(PINTEREST).toBe("https://www.pinterest.com/mohamedredayassinn/")
  })

  test("كلاهما https", () => {
    expect(PINTEREST.startsWith("https://")).toBe(true)
    expect(FACEBOOK.startsWith("https://")).toBe(true)
  })
})

describe("الأسطح الأخرى لم تُمسّ", () => {
  test("صفحات فيسبوك التابعة للكليات في schools.json تبقى كما هي", () => {
    // استبدال عامّ بلا تمييز كان سيضرب روابط الجامعات أيضاً.
    const schools = read("src/data/schools.json")
    expect(schools).toContain("https://www.facebook.com/fsjesas.univh2c.ma")
    expect(schools).toContain("https://www.facebook.com/FSJESAgdalOfficiel")
    expect(schools).toContain("https://www.facebook.com/FSJESM.official")
    expect(schools).toContain("https://www.facebook.com/FSJEST.UAE")
    expect(schools).toContain("https://www.facebook.com/FSJESAgadirUIZ")
    expect(schools).toContain("https://www.facebook.com/FSJESNadorUMP")
    // ولا تسرّب إليها حساب المنصة
    expect(schools).not.toContain("61593607157317")
  })

  test("باقي المنصات لم تتغير", () => {
    const nav = read("src/layouts/PublicNavigation.tsx")
    expect(nav).toContain("https://www.instagram.com/mizan.page")
    expect(nav).toContain("https://www.tiktok.com/@mizan_page")
  })
})

describe("أمان الروابط الخارجية في الواجهة", () => {
  const nav = read("src/layouts/PublicNavigation.tsx")

  test("كل رابط اجتماعي يحمل noopener noreferrer", () => {
    // target="_blank" دون rel="noopener" يفتح نافذة تملك window.opener
    // ويمكنها تحويل الصفحة الأصلية (tabnabbing).
    const socialBlock = nav.slice(nav.indexOf("instagram.com") - 300)
    const externals = socialBlock.match(/target="_blank"/g) ?? []
    const protectedLinks = socialBlock.match(/rel="noopener noreferrer"/g) ?? []
    expect(externals.length).toBeGreaterThan(0)
    expect(protectedLinks.length).toBe(externals.length)
  })

  test("زرّا بنترست وفيسبوك لهما وصف لقارئ الشاشة", () => {
    expect(nav).toContain('aria-label="صفحة ميزان الرقمية على فيسبوك"')
    expect(nav).toContain('aria-label="حساب ميزان الرقمية على بنترست"')
  })
})

describe("إكس وقناة واتساب مضافتان في كل سطح", () => {
  test.each(SURFACES)("%s يحمل حساب إكس", (file) => {
    expect(read(file)).toContain(X)
  })

  test.each(SURFACES)("%s يحمل قناة واتساب", (file) => {
    expect(read(file)).toContain(WHATSAPP)
  })

  test("رابط واتساب هو رابط القناة نفسه بلا تعديل", () => {
    expect(WHATSAPP).toBe("https://whatsapp.com/channel/0029Vb97ZZE23n3WE7R6Tf1m")
  })
})

describe("التذييل المرئي", () => {
  const nav = read("src/layouts/PublicNavigation.tsx")

  test("زرّ إكس وزر واتساب في صف الأيقونات", () => {
    expect(nav).toContain(`href="${X}"`)
    expect(nav).toContain(`href="${WHATSAPP}"`)
    expect(nav).toContain("<XIcon size={16} />")
    expect(nav).toContain("<WhatsAppIcon size={16} />")
  })

  test("الأيقونتان معرّفتان — lucide لا يحمل شعارات العلامات", () => {
    expect(nav).toContain("function XIcon(")
    expect(nav).toContain("function WhatsAppIcon(")
    expect(nav).toContain('viewBox="0 0 24 24"')
  })

  test("دعوة مجتمع واتساب ظاهرة بذاتها لا أيقونة فقط", () => {
    expect(nav).toContain("انضمّ إلى مجتمع الطلبة على واتساب")
    // واتساب يظهر مرتين: أيقونة في الصف + دعوة مجتمعية
    expect(nav.match(new RegExp(WHATSAPP.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))?.length).toBe(2)
  })

  test("المنصات كلها ستّ في التذييل", () => {
    for (const url of [
      "https://www.instagram.com/mizan.page",
      "https://www.facebook.com/profile.php?id=61593607157317",
      "https://www.tiktok.com/@mizan_page",
      "https://www.pinterest.com/mohamedredayassinn/",
      X,
      WHATSAPP,
    ]) {
      expect(nav, url).toContain(url)
    }
  })

  test("وسم twitter:site يطابق معرّف إكس", () => {
    const seo = read("src/components/seo/SEOHead.tsx")
    expect(seo).toContain('"twitter:site", "@mizan_page"')
    expect(X.toLowerCase()).toContain("mizanpage")
  })
})

describe("البيانات المهيكلة تبقى سليمة", () => {
  test("sameAs في index.html قابل للتحليل JSON", () => {
    const html = read("index.html")
    const block = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)
    expect(block, "a JSON-LD block must exist").not.toBeNull()
    const data: unknown = JSON.parse(block![1])

    // sameAs ليست في الجذر بل داخل عقدة المنظمة، فنبحث عنها في أي عمق.
    const found: string[][] = []
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) return void node.forEach(walk)
      if (node && typeof node === "object") {
        for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
          if (key === "sameAs" && Array.isArray(value)) found.push(value as string[])
          else walk(value)
        }
      }
    }
    walk(data)

    expect(found.length, "a sameAs array must exist").toBeGreaterThan(0)
    const sameAs = found[0]
    expect(sameAs).toContain(X)
    expect(sameAs).toContain(WHATSAPP)
    // الإدراج لم يكسر الفواصل ولا أسقط عنصراً قائماً
    expect(sameAs).toContain("https://github.com/p4xre1/mizandigital")
    expect(sameAs).toContain("https://www.facebook.com/profile.php?id=61593607157317")
    expect(sameAs.length).toBeGreaterThanOrEqual(7)
  })
})
