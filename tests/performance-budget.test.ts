/**
 * ميزانية الأداء — اختبارات انحدار لما أوصى به تقرير PageSpeed الأخير.
 *
 * كل اختبار هنا يثبّت قراراً معيّناً حتى لا يعود الخطأ صامتاً:
 *   • robots.txt بتوجيه غير معروف   → «robots.txt is not valid» وسقوط 8 نقاط SEO
 *   • طلب CSS يحجب الرسم (650ms)    → FCP 1.7s و LCP 2.4s
 *   • خط من أصل ثالث + preconnect    → «Unused preconnect» وجولة اتصال زائدة
 *   • GA و Supabase وبيانات الصفحة   → 191KB + 57KB + 72KB في نافذة القياس
 *   • هيكل المصادقة بعرض مختلف       → عنصر أكبر يختفي ثم يعود ⇒ LCP متأخر
 *
 * الاختبارات التي تلمس dist/ تُتخطّى تلقائياً إن لم يكن البناء قد جرى
 * (CI يشغّل pnpm test قبل pnpm build).
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { gzipSync } from "node:zlib"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vitest"
import { checkRobots } from "../shared/seo/technical-checks.js"

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (file: string) => readFileSync(path.join(rootDir, file), "utf8")
const hasFile = (file: string) => existsSync(path.join(rootDir, file))

const robotsTxt = read("public/robots.txt")
const indexHtml = read("index.html")
const fontsCss = read("src/styles/fonts.css")
const gtag = read("src/lib/analytics/gtag.ts")
const authProvider = read("src/lib/auth/AuthProvider.tsx")
const authControls = read("src/components/auth/AuthControls.tsx")
const homePage = read("src/pages/public/HomePage.tsx")
const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> }

/* ────────────────────────────────────────────────────────────────────────
   1) robots.txt — لا توجيهات خارج قائمة المعروفة (كان «Agentmap:»)
──────────────────────────────────────────────────────────────────────── */

describe("robots.txt صالح لكل المحلّلات", () => {
  test("كل توجيه داخل القائمة المعروفة (نفس فحص Lighthouse)", () => {
    const report = checkRobots(robotsTxt)
    expect(report.issues, report.issues.join(" | ")).toEqual([])
    expect(report.pass).toBe(true)
  })

  test("مسار ARD موثَّق بتعليق بدل توجيه غير معروف، ووسائل الاكتشاف الأخرى قائمة", () => {
    expect(robotsTxt).toMatch(/^#\s*Agentmap:/m) // معلَّق لا فعّال
    expect(robotsTxt).not.toMatch(/^\s*Agentmap:/m)
    // الروابط الواجبة في مواصفة ARD: well-known + وسم الرابط + ترويسة HTTP
    expect(indexHtml).toContain('rel="ard"')
    expect(read("public/_headers")).toContain('rel="ard"')
  })
})

/* ────────────────────────────────────────────────────────────────────────
   2) الخطوط — بلا أصل ثالث، وقابلة للتحميل المسبق من نفس الأصل
──────────────────────────────────────────────────────────────────────── */

describe("الخطوط محلية", () => {
  test("لا preconnect ولا طلب إلى Google Fonts", () => {
    expect(indexHtml).not.toContain("https://fonts.gstatic.com")
    expect(indexHtml).not.toContain("https://fonts.googleapis.com")
    expect(authProvider).not.toContain("fonts.googleapis.com")
  })

  test("ملفا الخط موجودان فعلاً في public/fonts", () => {
    for (const file of ["public/fonts/cairo-arabic.woff2", "public/fonts/cairo-latin.woff2"]) {
      expect(hasFile(file), file).toBe(true)
      expect(readFileSync(path.join(rootDir, file)).byteLength).toBeGreaterThan(10_000)
    }
  })

  test("لا preconnect غير مستعمل في الشيفرة (كان googletagmanager و fonts.googleapis)", () => {
    expect(read("src/components/seo/SEOHead.tsx")).not.toContain('addLink("preconnect"')
  })
})

/* ────────────────────────────────────────────────────────────────────────
   3) CSS — لا طلب يحجب الرسم: preload غير حاجب + قَلب بسكربت السمة
   (قرار 2026-09-29: التضمين الكامل — 181KB في كل مستند — كان يفلس
   مؤشر text/HTML ratio؛ انظر docs/audits و scripts/nonblocking-css.mjs)
──────────────────────────────────────────────────────────────────────── */

describe("CSS غير حاجب للرسم (preload + قَلب بسكربت السمة)", () => {
  test("خطوة nonblocking-css موجودة ومركّبة في أمر البناء قبل فحص CSP", () => {
    expect(hasFile("scripts/nonblocking-css.mjs")).toBe(true)
    const build = pkg.scripts.build
    expect(build).toContain("node scripts/nonblocking-css.mjs")
    expect(build.indexOf("nonblocking-css.mjs")).toBeLessThan(build.indexOf("csp-hashes.mjs"))
    // بعد كل خطوات توليد HTML، وإلا أُضيفت صفحات بلا preload للنمط
    expect(build.indexOf("enhance-lexicon-prerender.mjs")).toBeLessThan(build.indexOf("nonblocking-css.mjs"))
    // لا عودة إلى التضمين: السكربت القديم ومكانه في البناء محذوفان
    expect(build).not.toContain("inline-css.mjs")
  })

  const distReady = hasFile("dist/index.html")
  test.skipIf(!distReady)("dist/index.html: preload للنمط، ولا وسم stylesheet يحجب الرسم", () => {
    const html = read("dist/index.html")
    // لا نمط مضمّن: المستند يبقى نحيفاً من أجل text/HTML ratio
    expect(html).not.toContain("data-mizan-inline-css")
    // النمط preload غير حاجب مع وسمة القَلب
    expect(html).toMatch(/<link rel="preload" as="style" href="\/assets\/[^"]+\.css" data-mizan-async-css>/)
    // fallback للمتصفحات بلا JS
    expect(html).toMatch(/<noscript><link rel="stylesheet" href="\/assets\/[^"]+\.css"><\/noscript>/)
    // لا وسم stylesheet خارجي حاجب (خارج <noscript>)
    const withoutNoscript = html.replace(/<noscript>[\s\S]*?<\/noscript>/gi, "")
    const blocking = (withoutNoscript.match(/<link[^>]*rel="stylesheet"[^>]*>/g) ?? []).filter(
      (tag) => /href="\/assets\//.test(tag)
    )
    expect(blocking).toEqual([])
    // سكربت السمة يحمل منطق القَلب قبل أي محتوى
    expect(html).toContain("data-mizan-async-css]")
    expect(html.indexOf("data-mizan-async-css]")).toBeLessThan(html.indexOf('<div id="root">'))
    // التحميل المسبق للخطوط قبل النمط وقبل أي محتوى
    expect(html.indexOf('rel="preload" as="font"')).toBeLessThan(html.indexOf('rel="preload" as="style"'))
    expect(html.indexOf('rel="preload" as="style"')).toBeLessThan(html.indexOf('<div id="root">'))
  })
})

/* ────────────────────────────────────────────────────────────────────────
   4) لا عمل غير حرج في نافذة القياس (GA / Supabase / بيانات الصفحة)
──────────────────────────────────────────────────────────────────────── */

describe("تأجيل العمل غير الحرج", () => {
  test("وحدة deferWork موجودة وتُستعمل في المواضع الثلاثة", () => {
    expect(hasFile("src/lib/utils/deferWork.ts")).toBe(true)
    for (const source of [gtag, authProvider, homePage]) {
      expect(source).toMatch(/utils\/deferWork/)
    }
  })

  test("Google Analytics لا يُحمَّل قبل تفاعل أو بعد load + خمول", () => {
    expect(gtag).toContain("onFirstInteraction")
    expect(gtag).toContain("afterWindowLoad")
    expect(gtag).toContain("firstOf")
    // لا جدولة مباشرة عند الإقلاع (كانت requestIdleCallback بسقف 4 ثوانٍ)
    expect(gtag).not.toMatch(/requestIdleCallback\(loadMizanAnalytics/)
    expect(gtag).not.toMatch(/requestIdleCallback\([^)]*,\s*\{\s*timeout:\s*[1-9]\d{0,2}\s*\}/)
  })

  test("قراءة جلسة Supabase لا تبدأ فوراً لزائر مجهول", () => {
    // لا استدعاء عارٍ خارج شرط: كل نداء داخل فرع صريح
    // نداء في أول السطر (بلا أي إزاحة) = خارج كل شرط
    const bareCall = /^void bootstrap\(\)/m.test(authProvider)
    expect(bareCall, "void bootstrap() عارٍ بلا شرط ⇒ يعود التنزيل في أول ثانية").toBe(false)
    expect(authProvider).toMatch(/if \(hasStoredSession \|\| isAuthCallback\) \{\s*\n\s*void bootstrap\(\)/)
    expect(authProvider).toContain("sb-mizan-auth") // جلسة محفوظة ⇒ فوراً
    expect(authProvider).toContain("isAuthCallback") // عودة OAuth ⇒ فوراً
    expect(authProvider).toMatch(/firstOf\(onFirstInteraction/)
  })

  test("بيانات الصفحة الرئيسية تُطلب عند اقتراب القسم من الشاشة", () => {
    expect(homePage).toContain("IntersectionObserver")
    expect(homePage).toContain("contentSectionRef")
    expect(homePage).toMatch(/rootMargin:\s*"\d+px 0px"/)
    // لا استدعاء مباشر لتحميل البيانات المحلية في أول تركيب
    expect(homePage).not.toMatch(/\n\s*loadLocal\(\)\n/)
  })
})

/* ────────────────────────────────────────────────────────────────────────
   5) زر الدخول — لا اختفاء ولا اختلاف عرض (سبب LCP متأخر + CLS)
──────────────────────────────────────────────────────────────────────── */

describe("عنصر المصادقة أثناء قراءة الجلسة", () => {
  test("الهيكل بنفس نصوص وأصناف الزر الحقيقي (لا h-9 w-24)", () => {
    const skeleton = /if \(!initialized && !user\) \{[\s\S]*?\n  \}/.exec(authControls)?.[0]
    expect(skeleton, "لم يُعثر على فرع انتظار الجلسة").toBeTruthy()
    // الهيكل القديم: مستطيل رمادي بعرض 96px لا يطابق زر 66px ⇒ انزياح + اختفاء نص
    expect(skeleton).not.toMatch(/animate-pulse|bg-\[#f1f5f9\]|\bw-24\b|\bh-9\b/)
    // <span aria-hidden> لا <a>: عنصر قابل للتركيز داخل شجرة مخفية يخالف
    // قاعدة aria-hidden-focus في axe
    expect(skeleton).toContain("<span")
    expect(skeleton).not.toMatch(/<a\s/)
    expect(skeleton).toContain("دخول")
    expect(skeleton).toContain("px-4 py-2 text-[13px]")
    expect(skeleton).toContain('aria-hidden="true"')
  })
})

/* ────────────────────────────────────────────────────────────────────────
   6) ميزانية حزمة الدخول — نصوص السياسات القانونية لا تسافر مع كل صفحة
   كانت consent.ts تستورد LEGAL_LAST_UPDATED من policies.js (38.8KB مصدر)،
   فيُحمَّل ملف السياسات كاملاً مع أول حزمة في كل صفحة (~44KB خام / ~12KB مضغوط).
   الحل: الثوابت في version.js الصغير، وpolicies.js يعيد تصديرها.
──────────────────────────────────────────────────────────────────────── */

describe("ثوابت السياسات في وحدة صغيرة (حمية حزمة الدخول)", () => {
  const version = read("src/content/legal/version.js")
  const policies = read("src/content/legal/policies.js")
  const consent = read("src/lib/legal/consent.ts")

  test("version.js يحوي الثوابت الأربعة وهو صغير", () => {
    for (const name of ["LEGAL_LAST_UPDATED", "ADSTERRA_REMOVED_ON", "CONTACT_EMAIL", "AUTH_STORAGE_KEY"]) {
      expect(version).toContain(`export const ${name}`)
    }
    expect(Buffer.byteLength(version)).toBeLessThan(2048)
  })

  test("policies.js يستوردها ويعيد تصديرها (المستهلكون القدامى يعملون كما هم)", () => {
    expect(policies).toMatch(/import\s*\{[\s\S]*?\}\s*from\s*"\.\/version\.js"/)
    expect(policies).toMatch(/export\s*\{[\s\S]*?LEGAL_LAST_UPDATED[\s\S]*?\}\s*from\s*"\.\/version\.js"/)
    // لم تبقَ نسخة ثانية من القيم داخل الملف (وإلا اختلفت النسختان يوماً)
    expect(policies).not.toMatch(/export const LEGAL_LAST_UPDATED\s*=/)
  })

  test("consent.ts يستورد من version.js لا من policies.js", () => {
    expect(consent).toContain("@/content/legal/version.js")
    expect(consent).not.toContain("legal/policies")
  })

  test("الأنواع ما زالت معلنة للمستوردين بـ TypeScript", () => {
    const types = read("src/content/legal/policies.d.ts")
    for (const name of ["LEGAL_LAST_UPDATED", "ADSTERRA_REMOVED_ON", "CONTACT_EMAIL", "AUTH_STORAGE_KEY"]) {
      expect(types).toContain(name)
    }
  })

  const distReady = hasFile("dist/index.html")
  test.skipIf(!distReady)("حزمة الدخول المبنية لا تتجاوز الميزانية ولا تحمل نصوص السياسات", () => {
    const html = read("dist/index.html")
    const entry = /<script[^>]*type="module"[^>]*src="(\/assets\/[^"]+\.js)"/.exec(html)?.[1]
    expect(entry, "لم يُعثر على سكربت الدخول في dist/index.html").toBeTruthy()
    const bytes = readFileSync(path.join(rootDir, "dist", entry!.replace(/^\//, "")))
    const gz = gzipSync(bytes, { level: 9 }).byteLength
    // القياس الحالي: ~129KB خام / ~35KB مضغوط. أي عودة إلى استيراد policies.js
    // في مسار الدخول ترفعه ~44KB خاماً فتُسقط هذا الاختبار فوراً.
    expect(bytes.byteLength, "حزمة الدخول أكبر من الميزانية").toBeLessThan(150_000)
    expect(gz, "حزمة الدخول أكبر من الميزانية مضغوطة").toBeLessThan(40_000)
    // جملة من جدول الكوكيز (policies.js) — وجودها يعني أن الملف عاد إلى الحزمة
    expect(bytes.toString("utf8")).not.toContain("يُضبط فقط لحسابات المشرفين")
  })
})

/* ────────────────────────────────────────────────────────────────────────
   7) الصور البعيدة — لا تزاحم أول رسم
──────────────────────────────────────────────────────────────────────── */

describe("صور البطاقات البعيدة", () => {
  test("كل <img> لبطاقة يحمل loading=lazy و decoding=async", () => {
    const images = homePage.match(/<img [^>]*>/g) ?? []
    expect(images.length).toBeGreaterThan(0)
    for (const img of images) {
      expect(img).toContain('loading="lazy"')
      expect(img).toContain('decoding="async"')
      // width/height صريحان: يمنعان انزياح التخطيط
      expect(img).toMatch(/width=\{\d+\}/)
      expect(img).toMatch(/height=\{\d+\}/)
    }
  })
})

/* ────────────────────────────────────────────────────────────────────────
   8) روابط التحميل في صفحات /pdf/ — لا nofollow على الروابط الداخلية
      (كانت أداة التدقيق ترصد 9 روابط داخلية nofollow نحو /docs/*.pdf:
       الملف نفسه هو محتوى الصفحة الأساسي، وكبح الرابط يُفقدنا إشارة
       التوجيه الداخلي التي نريد تمريرها لمكتبتنا).
──────────────────────────────────────────────────────────────────────── */

describe("روابط التحميل في صفحات /pdf/ بدون nofollow", () => {
  const prerenderSrc = read("scripts/prerender.mjs")

  test("قالب التحميل في prerender لا يُخرج nofollow", () => {
    // نمط القالب: <a href="..." rel="..." download> — نثبّت أن rel لا يحمل nofollow
    const tpl = /<p><a href="\$\{escapeHtml\(fileUrl\)\}"([^>]*)download/.exec(prerenderSrc)?.[1] ?? ""
    expect(tpl, "لم يُعثر على قالب رابط التحميل في scripts/prerender.mjs").toBeTruthy()
    expect(tpl).not.toMatch(/nofollow/i)
  })

  const distReady = hasFile("dist/index.html")
  test.skipIf(!distReady)("الصفحات المُولَّدة: لا رابط داخلي nofollow نحو /docs/", () => {
    const pdfDir = path.join(rootDir, "dist", "pdf")
    if (!existsSync(pdfDir)) return
    const files = readdirSync(pdfDir).filter((f) => f.endsWith(".html"))
    expect(files.length, "لم تُولَّد صفحات /pdf/").toBeGreaterThan(0)
    for (const file of files) {
      const html = readFileSync(path.join(pdfDir, file), "utf8")
      const anchors = html.match(/<a\b[^>]*>/g) ?? []
      for (const tag of anchors) {
        const rel = /rel="([^"]*)"/i.exec(tag)?.[1] ?? ""
        if (!/nofollow/i.test(rel)) continue
        const href = /href="([^"]*)"/i.exec(tag)?.[1] ?? ""
        const isHttp = /^https?:\/\//i.test(href)
        let isInternal = !isHttp
        if (isHttp) {
          // مقارنة(hostname) الكاملة بعد التحليل — لا substring، حتى لا تُعدّ
          // نطاقات مثل www.mizan.page.evil.com داخلية (CodeQL: incomplete URL sanitization)
          try {
            const parsed = new URL(href)
            isInternal = parsed.protocol === "https:" && parsed.hostname === "www.mizan.page"
          } catch {
            isInternal = false
          }
        }
        expect(
          isInternal,
          `رابط داخلي nofollow في dist/pdf/${file}: ${href}`,
        ).toBe(false)
      }
    }
  })
})

/* ────────────────────────────────────────────────────────────────────────
   9) روابط المواقع الرسمية للكليات — بلا nofollow
      (رصدت أداة التدقيق 20 رابطاً خارجياً nofollow نحو مواقع الكليات
       في صفحة /schools الثابتة: روابط مرجعية موثوقة وهي نفس الروابط
       التي تُعرض بـ follow في صفحة الكلية نفسها SchoolPage.tsx).
──────────────────────────────────────────────────────────────────────── */

describe("روابط المواقع الرسمية للكليات بدون nofollow", () => {
  const enhanceSrc = read("scripts/enhance-schools-prerender.mjs")
  const nearbySrc = read("src/components/careers/NearbyLawSchools.tsx")

  test("قالب prerender ومكوّن NearbyLawSchools لا يُخرجان nofollow", () => {
    // القالب في enhance-schools-prerender.mjs: <a href="..." rel="..." target="_blank">
    const tpl = /<p><a href="\$\{esc\(official\)\}"([^>]*)target=/.exec(enhanceSrc)?.[1] ?? ""
    expect(tpl, "لم يُعثر على قالب رابط الموقع الرسمي في enhance-schools-prerender.mjs").toBeTruthy()
    expect(tpl).not.toMatch(/nofollow/i)

    // المكوّن العميل: anchor لـ school.officialUrl بلا nofollow (تطابقاً مع SchoolPage.tsx)
    const block = /href=\{school\.officialUrl\}([\s\S]{0,200}?)\n\s*>/.exec(nearbySrc)?.[1] ?? ""
    expect(block, "لم يُعثر على anchor لـ school.officialUrl في NearbyLawSchools.tsx").toBeTruthy()
    expect(block).not.toMatch(/nofollow/i)
  })

  const distReady = hasFile("dist/schools.html")
  test.skipIf(!distReady)("dist/schools.html: كل روابط الجامعات بلا nofollow", () => {
    const html = read("dist/schools.html")
    const anchors = html.match(/<a\b[^>]*>/g) ?? []
    const uniAnchors = anchors.filter((t) => /href="https?:\/\/[^"]*\.ac\.ma/i.test(t))
    expect(uniAnchors.length, "لم تُولَّد روابط الجامعات في dist/schools.html").toBeGreaterThan(0)
    for (const tag of uniAnchors) {
      expect(tag, `رابط جامعة nofollow: ${tag}`).not.toMatch(/nofollow/i)
    }
  })
})
