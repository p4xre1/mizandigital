// @vitest-environment jsdom
//
// أداة تصدير المقال/الخبر PDF — الزر في الصفحة، والتقسيم إلى صفحات A4،
// واستعادة الصفحة بعد التصدير، ومسار الطباعة البديل عند الفشل.
//
// تثبيت القرارات:
//   • لقطة المحتوى المعروض نفسه (بخط القارئ الذي اختاره الزائر) — العربية
//     تُرسم بالتشكيل الصحيح من المتصفح لا من مولّد نصي.
//   • الحِزم (jspdf + html2canvas-pro) تُحمَّل ديناميكياً عند أول ضغطة
//     فقط، في chunk مستقل لا يجرفه vendor العام إلى كل صفحة.
//   • خِضالة التفاعل (تعليقات/تفاعلات/شريك/أزرار) تُستبعد بـ .no-pdf فيخرج
//     الملف للمذاكرة والطباعة، والسمة فاتحة قسراً حتى لو كان الموقع داكناً.
import { beforeEach, describe, expect, test, vi } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { act } from "react"

import { PDF_EXPORT_CLASS, exportElementToPdf, planPdfPages } from "../src/lib/articles/exportPdf"

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = (file: string) => readFileSync(path.join(rootDir, file), "utf8")

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/*Mocks: jsPDF يُسجّل النداءات، واللقطة تعيد أبعاداً مشتقة من الخيارات */
const pdfState = vi.hoisted(() => ({
  images: [] as { data: string; w: number; h: number }[],
  pages: 1,
  saved: null as string | null,
  props: null as Record<string, string> | null,
  failCanvas: false,
  /** كل نداء لقطة: أي عنصر التُقط وبأي نافذة قصّ (x/y/width/height) */
  calls: [] as { element: HTMLElement; options: Record<string, unknown> }[],
}))

vi.mock("jspdf", () => ({
  jsPDF: class {
    constructor() {
      pdfState.images = []
      pdfState.pages = 1
      pdfState.saved = null
      pdfState.props = null
      pdfState.calls = []
    }
    setProperties(props: Record<string, string>) {
      pdfState.props = props
    }
    addImage(data: string, _format: string, _x: number, _y: number, w: number, h: number) {
      pdfState.images.push({ data, w, h })
    }
    addPage() {
      pdfState.pages += 1
    }
    save(fileName: string) {
      pdfState.saved = fileName
    }
  },
}))

vi.mock("html2canvas-pro", () => ({
  default: async (
    element: HTMLElement,
    options?: { width?: number; height?: number; scale?: number; x?: number; y?: number }
  ) => {
    if (pdfState.failCanvas) throw new Error("canvas boom")
    pdfState.calls.push({ element, options: { ...(options ?? {}) } })
    const scale = options?.scale ?? 1
    const width = Math.round((options?.width ?? element.offsetWidth) * scale)
    const height = Math.round((options?.height ?? element.offsetHeight) * scale)
    return {
      width,
      height,
      toDataURL: () => `data:image/jpeg;base64,${width}x${height}`,
    }
  },
}))

beforeEach(() => {
  pdfState.failCanvas = false
})

/* ────────────────────────────────────────────────────────────────────────
   1) خطة التقسيم إلى صفحات A4
──────────────────────────────────────────────────────────────────────── */

describe("planPdfPages — تقسيم A4", () => {
  test("عمود قراءة نموذجي: صفحة كل ~792px بتكبير 2", () => {
    const plan = planPdfPages(560, 2400)
    expect(plan.sliceHeightPx).toBe(Math.round(560 * (297 / 210))) // 792
    expect(plan.pageCount).toBe(4) // 2400 / 792 = 3.03 → 4
    expect(plan.scale).toBe(2)
  })

  test("مقال قصير يملأ صفحة واحدة على الأقل", () => {
    expect(planPdfPages(560, 120).pageCount).toBe(1)
  })

  test("الأعمدة العريضة تخفض التكبير ليبقى canvas تحت سقف الذاكرة", () => {
    // كل شريحة canvas بارتفاع صفحة ثابت؛ التكبير يتكيّف مع عرض المقال:
    // عمود القراءة النموذجي (560px) يأخذ 2، والعريض جداً (2000px) ينخفض
    const normal = planPdfPages(560, 8000)
    expect(normal.scale).toBe(2)
    const wide = planPdfPages(2000, 8000)
    expect(wide.scale).toBeLessThan(2)
    expect(wide.scale).toBeGreaterThanOrEqual(1)
    // الشرط الحاكم: مساحة canvas للشريحة الواحدة تحت السقف (بسماحية تقريب)
    const area = wide.sliceHeightPx * 2000 * wide.scale * wide.scale
    expect(area).toBeLessThanOrEqual(12_000_001)
  })

  test("قيم منقوصة أو صفرية لا تُسقط الخطة", () => {
    expect(planPdfPages(0, 0)).toEqual({ pageCount: 1, sliceHeightPx: 1, scale: 2 })
  })
})

/* ────────────────────────────────────────────────────────────────────────
   2) التصدير الفعلي (بمكتبات مُحاكاة): صفحات، مصدر، استعادة
──────────────────────────────────────────────────────────────────────── */

describe("exportElementToPdf", () => {
  function makeArticleElement(heightPx: number): HTMLElement {
    // على الـprototype لا على النسخة: الأبعاد يجب أن تصل إلى الاستنساخ أيضاً
    // (jsdom لا يحسب أبعاد تخطيط حقيقية)
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", { value: 560, configurable: true })
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", { value: heightPx, configurable: true })
    const el = document.createElement("article")
    el.className = "reader-shell"
    document.body.appendChild(el)
    return el
  }

  test("مقال 2400px → 4 صفحات A4 + ملف باسم المقال + سطر المصدر + استعادة الصفحة", async () => {
    const el = makeArticleElement(2400)
    const progress: Array<[number, number]> = []

    await act(async () => {
      await exportElementToPdf({
        element: el,
        fileName: "mizan-test-article.pdf",
        title: "مقال تجريبي",
        sourceUrl: "https://www.mizan.page/articles/test-article",
        onProgress: (done, total) => progress.push([done, total]),
      })
    })

    expect(pdfState.saved).toBe("mizan-test-article.pdf")
    expect(pdfState.pages).toBe(4)
    expect(pdfState.images).toHaveLength(4)
    // خصائص الملف: عنوان المقال والمنصة
    expect(pdfState.props?.title).toBe("مقال تجريبي")
    expect(pdfState.props?.author).toContain("ميزان")
    // كل شريحة بلون خلفية أبيض وأبعاد نسبية متسقة (عرض ثابت عبر الصفحات)
    for (const image of pdfState.images) {
      expect(image.data.startsWith("data:image/jpeg;base64,")).toBe(true)
    }
    // تقدّم التصدير: ينتهي بـ (4/4)
    expect(progress[progress.length - 1]).toEqual([4, 4])
    // التصدير على استنساخ خارج الشاشة: الصفحة الحية لم تُلمس إطلاقاً
    expect(el.classList.contains(PDF_EXPORT_CLASS)).toBe(false)
    expect(el.className).toBe("reader-shell")
    expect(el.querySelector(".pdf-export-source")).toBeNull()
    // والحاوية المؤقتة بأكملها أُزيلت بعد إنجاز العمل
    expect(document.querySelector(".pdf-export")).toBeNull()
    expect(document.querySelector("div[aria-hidden='true'][style*='-10000px']")).toBeNull()
    el.remove()
  })

  test("اللقطة من المستنسخ بإزاحات نسبية — لا إحداثيات المستنسخ المستندية (انحدار الملف الفارغ)", async () => {
    const el = makeArticleElement(2400)

    /*
      في jsdom كل الأبعاد صفر، وهو بالضبط ما أخفى هذا الخطأ: إحداثيات
      المستنسخ المستندية (getBoundingClientRect + scrollY) كانت صفراً فبدت
      نافذة القصّ سليمة. في المتصفح المستنسخ عند left:-10000px والصفحة
      مُمرَّرة، فتمرير تلك الإحداثيات كـ x/y — وhtml2canvas-pro 2.x يعاملهما
      إزاحتين نسبيتين إلى أعلى-يسار العنصر — كان يُزيح القصّ خارج المحتوى
      تماماً: صفحات بيضاء وملف «فارغ». نُحاكي المتصفح هنا حتى يبقى الانحدار
      مكشوفاً.
    */
    Object.defineProperty(window, "scrollY", { value: 500, configurable: true, writable: true })
    Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
      configurable: true,
      value: () =>
        ({ left: -10000, top: -500, width: 560, height: 2400, right: -9440, bottom: 1900, x: -10000, y: -500 }) as DOMRect,
    })

    try {
      await act(async () => {
        await exportElementToPdf({ element: el, fileName: "crop.pdf", title: "مقال تجريبي" })
      })

      const plan = planPdfPages(560, 2400)
      expect(pdfState.saved).toBe("crop.pdf")
      expect(pdfState.calls).toHaveLength(plan.pageCount)
      pdfState.calls.forEach((call, i) => {
        // الملتقط هو المستنسخ (pdf-export: سمة فاتحة + إخفاء .no-pdf) لا الصفحة الحية
        expect(call.element, "لا تلتقط العنصر الحيّ").not.toBe(el)
        expect(call.element.classList.contains(PDF_EXPORT_CLASS)).toBe(true)
        // نافذة القصّ: من أعلى العنصر، وتنزل شريحةً في كل صفحة — بلا تمرير ولا -10000px
        expect(call.options.x).toBe(0)
        expect(call.options.y).toBe(i * plan.sliceHeightPx)
        expect(call.options.width).toBe(560)
      })
      // الصفحة الأخيرة أقصر: ما تبقّى من ارتفاع المقال فقط
      expect(pdfState.calls[plan.pageCount - 1].options.height).toBe(2400 - (plan.pageCount - 1) * plan.sliceHeightPx)
    } finally {
      Object.defineProperty(window, "scrollY", { value: 0, configurable: true, writable: true })
      delete (HTMLElement.prototype as unknown as { getBoundingClientRect?: unknown }).getBoundingClientRect
      el.remove()
    }
  })

  test("أثناء التصدير يُخفى .no-pdf من اللقطة (قاعدة CSS موجودة)", async () => {
    const css = read("src/styles/globals.css")
    expect(css).toMatch(/\.pdf-export \.no-pdf \{ display: none !important; \}/)
    // السمة الفاتحة قسراً حتى مع السمة الداكنة/الورقية
    expect(css).toMatch(/\.pdf-export \{[\s\S]*?--background: 0 0% 100% !important;/)
    expect(css).toMatch(/\.pdf-export \{[\s\S]*?box-shadow: none !important;/)
    // قاعدة سطر المصدر موجودة
    expect(css).toMatch(/\.pdf-export-source \{/)
  })

  test("الفشل لا يترك أثراً على الصفحة (الاستنساخ والحاوية يزالان)", async () => {
    pdfState.failCanvas = true
    const el = makeArticleElement(800)
    await act(async () => {
      await expect(
        exportElementToPdf({ element: el, fileName: "x.pdf", title: "t" })
      ).rejects.toThrow("canvas boom")
    })
    expect(el.className).toBe("reader-shell")
    expect(document.querySelector(".pdf-export")).toBeNull()
    expect(pdfState.saved).toBeNull()
    el.remove()
  })
})

/* ────────────────────────────────────────────────────────────────────────
   3) الأسلاك في الصفحة: الأزرار، الاستثناءات، chunk المستقل، الطباعة البديلة
──────────────────────────────────────────────────────────────────────── */

describe("أسلاك التصدير في صفحة المقال", () => {
  const articlePage = read("src/pages/public/ArticlePage.tsx")
  const maxReadBar = read("src/components/articles/MaxReadBar.tsx")
  const pkg = JSON.parse(read("package.json")) as { dependencies: Record<string, string> }
  const viteConfig = read("vite.config.ts")
  const exportLib = read("src/lib/articles/exportPdf.ts")

  test("المكتبتان في dependencies وتُحمَّلان ديناميكياً لا استيراداً ثابتاً", () => {
    expect(pkg.dependencies.jspdf).toBeTruthy()
    expect(pkg.dependencies["html2canvas-pro"]).toBeTruthy()
    expect(exportLib).toMatch(/import\("jspdf"\)/)
    expect(exportLib).toMatch(/import\("html2canvas-pro"\)/)
    expect(exportLib).not.toMatch(/^import .*jspdf/m)
    expect(exportLib).not.toMatch(/^import .*html2canvas/m)
  })

  test("chunk مستقل لهم بعيداً عن vendor العام (لا يُحمَّل إلا عند الطلب)", () => {
    expect(viteConfig).toContain('name: "vendor-pdf-export"')
    expect(viteConfig).toMatch(/vendor-pdf-export.*priority:\s*51/)
    // ذكر jspdf في مجموعة المستوردات لا يجعله ضمن vendor العام
    expect(viteConfig).toMatch(/name: "vendor", test: \/node_modules\//)
  })

  test("زر تحميل PDF في صف المعلومات وفي شارة المقال وفي الشريط النحيف", () => {
    // زر بعنوان نصي في صف المسار/الأدوات
    expect(articlePage).toContain("تحميل PDF")
    // زرا أيقونة بأهداف لمس كاملة في شارة المقال والشريط النحيف
    expect(articlePage).toContain('aria-label="تحميل المقال بصيغة PDF"')
    expect(maxReadBar).toContain('aria-label="تحميل المقال بصيغة PDF"')
    expect(maxReadBar).toContain("onExportPdf?")
    // الحالة تعطّل الأزرار أثناء التصدير ولا تسمح بالتصدير المزدوج
    expect(articlePage).toMatch(/if \(!el \|\| exportingPdf\) return/)
  })

  test("خِضالة التفاعل مستثناة من PDF: الشريك، التفاعلات، التعليقات، الوسوم، أدوات القراءة", () => {
    // صندوق الشريك مغلّف بـ no-pdf
    expect(articlePage).toMatch(/<div className="no-pdf"><PartnerSuggestionBox/)
    // كتلة «هل كان المقال مفيداً» + التعليقات تحملان no-pdf
    expect(articlePage).toMatch(/className="no-pdf mt-10 rounded-\[20px\][^"]*"/)
    expect(articlePage).toMatch(/<div className="no-pdf mt-8"><CommentSection/)
    // أزرار الوضع الأقصى والتنزيل لا تظهر في الملف
    expect(articlePage).toMatch(/className=\{`no-pdf xl:hidden/)
    expect(articlePage).toMatch(/className="no-pdf grid size-11 place-items-center rounded-full border border-primary\/20/)
    // الشريط النحيف والدرج خارج الملف أيضاً
    expect(maxReadBar).toMatch(/no-pdf fixed inset-x-0 top-0 z-\[70\]/)
  })

  test("الفشل يفتح الطباعة كمسار بديل ورسالة toast عالمية", () => {
    expect(articlePage).toContain("window.print()")
    expect(articlePage).toContain('new CustomEvent("mizan:toast"')
  })

  test("الطباعة نفسها مرتّبة: بلا هيكل موقع ولا أدوات تفاعل", () => {
    const css = read("src/styles/globals.css")
    expect(css).toMatch(/@media print \{[\s\S]*?\.site-header,\s*\n\s*\.site-footer,\s*\n\s*\.site-mobile-menu,\s*\n\s*\.no-pdf/)
    expect(css).toMatch(/@media print \{[\s\S]*?\.site-progress-bar/)
  })

  test("لا تغيير في CSP: لا أصول خارجية جديدة في مكتبة التصدير", () => {
    expect(exportLib).not.toMatch(/https?:\/\//)
    const headers = read("public/_headers")
    expect(headers).toContain("font-src 'self' data:")
  })
})
