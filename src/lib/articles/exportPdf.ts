/**
 * تصدير المقال/الخبر كملف PDF — من المحتوى المعروض نفسه.
 * ─────────────────────────────────────────────────────────────────────
 * الفكرة كما طُلب: «نسخ» المقال كما يُعرض للقارئ تماماً ووضعها في PDF.
 * التنفيذ: لقطة canvas للعنصر المعروض (html2canvas-pro) تُقسَّم إلى صفحات
 * A4 وتُغلَّف في jsPDF.
 *
 * لماذا لقطة الصورة لا إعادة حرف نصي؟ العربية تتطلب تشكيلاً ووصل حروف
 * وثنائية اتجاه لا يجيدها مولّدات PDF النصية (jsPDF وغيره يرسم حروفاً
 * مقطوعة معكوسة)، بينما المتصفح يرسم النص العربي كتابعاً كاملاً مع خط
 * القارئ الذي اختاره المستخدم — فاللقطة هنا الأدقّ والأسرع وأصدق ما يراه
 * القارئ على الشاشة.
 *
 * التقسيم إلى صفحات يُجرى داخل مكتبة اللقطة نفسها (خيار x/y/width/height)
 * فلا تُنشأ أبداً canvas أطول من صفحة واحدة — هذا يُجنّب حدود مساحة canvas
 * في iOS Safari (~16.7 مليون بكسل) مهما طال المقال.
 *
 * الحِزم تُحمَّل ديناميكياً عند أول ضغطة فقط: زائر الصفحة العادي لا يدفع
 * بايتاً منها، ولا أي طلب خارجي (لا تغيير في CSP) — تُبنى داخل الحزمة
 * كأي مصدر محلي وتُخدَّم من نفس النطاق.
 */

/** نسبة ارتفاع A4 إلى عرضه (297mm × 210mm) */
const A4_HEIGHT_RATIO = 297 / 210

/**
 * سقف مساحة canvas الواحدة (بكسل مربّع). حدّ iOS Safari الفعلي ~16.7MP،
 * نبقى تحت ذلك بهامش للصور والاستهلاك الداخلي.
 */
const MAX_SLICE_CANVAS_AREA = 12_000_000

/** تكبير 2 يكفي لحدّة النص العربي مطبوعاً؛ أعلى من ذلك ذاكرة بلا مقابل */
const MAX_SCALE = 2
const MIN_SCALE = 1

/** صنف يُضاف لعنصر المقال أثناء التصدير — قواعده في globals.css */
export const PDF_EXPORT_CLASS = "pdf-export"

export interface PdfPagePlan {
  pageCount: number
  /** ارتفاع الشريحة الواحدة بالبكسل (نسبة A4 على عرض المقال) */
  sliceHeightPx: number
  scale: number
}

/**
 * خطة تقسيم المقال إلى صفحات A4: عدد الصفحات وارتفاع الشريحة والتكبير.
 * التكبير يُقيَّد بحدّ مساحة canvas (الشريحة × التكبير² ≤ السقف) حتى لا
 * يفشل التصدير على الأجهزة الضعيفة في المقالات الطويلة.
 */
export function planPdfPages(widthPx: number, heightPx: number): PdfPagePlan {
  const width = Math.max(1, Math.floor(widthPx))
  const slice = Math.max(1, Math.round(width * A4_HEIGHT_RATIO))
  const scaleByArea = Math.sqrt(MAX_SLICE_CANVAS_AREA / (width * slice))
  const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scaleByArea))
  const pageCount = Math.max(1, Math.ceil(heightPx / slice))
  return { pageCount, sliceHeightPx: slice, scale }
}

/** إطار رسم واحد (rAF إن توفر وإلا مهلة قصيرة) لضمان تطبيق الأنماط قبل القياس */
const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => resolve())
    else setTimeout(resolve, 16)
  })

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/** انتظار جهوزية الخطوط (خط القارئ الديناميكي قد لا يكون واصلاً بعد) — بسقف زمني */
async function waitForFonts(): Promise<void> {
  try {
    const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts
    if (fonts?.ready) await Promise.race([fonts.ready, sleep(1500)])
  } catch {
    /* بيئات بلا FontFaceSet — نكمل بخط النظام */
  }
}

/** سطر المصدر أسفل الملف: المنصة + الرابط + تاريخ التحميل (نصوص فقط بلا HTML) */
function buildSourceNode(url: string | undefined): HTMLElement {
  const row = document.createElement("div")
  row.className = "pdf-export-source"
  row.setAttribute("dir", "rtl")

  const platform = document.createElement("span")
  platform.textContent = "منصة ميزان الرقمية — منصة طلبة الحقوق بالمغرب"
  const link = document.createElement("span")
  link.textContent = url || ""
  const date = document.createElement("span")
  date.textContent = `تاريخ التحميل: ${new Date().toLocaleDateString("ar-MA", { year: "numeric", month: "long", day: "numeric" })}`

  row.append(platform, link, date)
  return row
}

export interface ExportElementToPdfOptions {
  /** عنصر المقال المعروض (يُلتقط كما هو: خط القارئ وحجمه وتباعده) */
  element: HTMLElement
  /** اسم الملف الناتج */
  fileName: string
  /** عنوان المقال — يُكتب في خصائص PDF (metadata) */
  title: string
  /** رابط المقال الأصلي — يظهر في سطر المصدر أسفل الصفحة الأخيرة */
  sourceUrl?: string
  backgroundColor?: string
  onProgress?: (done: number, total: number) => void
}

/**
 * تصدير عنصر المقال إلى ملف PDF متعدد الصفحات.
 *
 * لا نلمس الصفحة الحية إطلاقاً: يُستنسخ عنصر المقال إلى حاوية خارج
 * الشاشة ويُطبَّق عليها صنف PDF_EXPORT_CLASS (سمة فاتحة وإخفاء عناصر
 * .no-pdf)، واللّقطة تُؤخذ من هذا المستنسخ نفسه (لا من العنصر المعروض) فلا
 * يرى الزائر وميضاً ولا قفزة أثناء التجهيز، ولا تدخل خِضالة التفاعل في
 * الملف، والحاوية كلها تُزال في النهاية — حتى عند الفشل.
 */
export async function exportElementToPdf(options: ExportElementToPdfOptions): Promise<void> {
  const { element, fileName, title, sourceUrl, backgroundColor = "#ffffff", onProgress } = options

  // عرض المقال الحقيقي قبل الاستنساخ حتى يبقى كسر الأسطر مطابقاً للشاشة
  const liveRect = element.getBoundingClientRect()
  const width = Math.round(element.offsetWidth || liveRect.width)
  if (!width) throw new Error("عنصر المقال بلا أبعاد")

  // حاوية خارج الشاشة: مرسومة فعلاً (لا display:none وإلا تعذّرت اللقطة)
  // لكنها خلف الصفحة ومعزولة عن المؤشر وقارئات الشاشة
  const host = document.createElement("div")
  host.setAttribute("aria-hidden", "true")
  host.style.cssText = `position:fixed;top:0;left:-10000px;width:${width}px;z-index:-1;pointer-events:none;`
  const clone = element.cloneNode(true) as HTMLElement
  clone.classList.add(PDF_EXPORT_CLASS)
  const sourceNode = buildSourceNode(sourceUrl)
  clone.appendChild(sourceNode)
  host.appendChild(clone)
  document.body.appendChild(host)

  try {
    // دوران اثنان من rAF: الحساب ثم الرسم ثم قياس الاستنساخ بعد إخفاء
    // عناصر .no-pdf (خروجها يغيّر الارتفاع فعلاً)
    await nextFrame()
    await nextFrame()
    await waitForFonts()

    const height = clone.offsetHeight
    if (!height) throw new Error("عنصر المقال بلا أبعاد")

    const plan = planPdfPages(width, height)

    // الحِزم تُنزَّل الآن فقط (أول تصدير) — انظر التعليق أعلى الملف
    const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
      import("jspdf"),
      import("html2canvas-pro"),
    ])

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true })
    pdf.setProperties({
      title,
      subject: "نسخة PDF من محتوى منصة ميزان الرقمية",
      author: "ميزان الرقمية",
      keywords: "ميزان الرقمية, القانون المغربي",
      creator: "ميزان الرقمية (mizan.page)",
    })

    const marginMm = 6
    const contentWidthMm = 210 - marginMm * 2

    for (let i = 0; i < plan.pageCount; i += 1) {
      const sliceHeight = Math.min(plan.sliceHeightPx, height - i * plan.sliceHeightPx)
      /*
        الملتقط هو المستنسخ لا العنصر الحيّ: المستنسخ يحمل صنف pdf-export
        (سمة فاتحة قسراً + إخفاء خِضالة التفاعل .no-pdf) فالملف يطابق ما
        قُرِّر أن يخرج، والصفحة الحية لا تُلمس.

        ⚠ x/y في html2canvas-pro (2.x) إزاحتان نسبيتان إلى أعلى-يسار العنصر
        الملتقط — تُجمعان مع حدوده داخل المستنسخ:
            x = (opts.x ?? 0) + left   ,   y = (opts.y ?? 0) + top
        وليستا إحداثيات مستندية مطلقة كما في html2canvas 1.x. تمرير إحداثيات
        المستنسخ (top:0;left:-10000px) كان يُزيح نافذة القص ~10000px خارج
        المحتوى في كل صفحة، فينزل الملف صفحات بيضاء فارغة. الصحيح: القص من
        أعلى العنصر (x=0) والنزول شريحةً في كل صفحة (y = i × ارتفاع الشريحة).
      */
      const canvas = await html2canvas(clone, {
        backgroundColor,
        scale: plan.scale,
        // صور المقال من مخزن Supabase/R2 — CORS مطلوب لتضمينها؛ ما لا
        // يُحمَّل يُترك فارغاً ولا يُفسد الملف كله (لا تلويث للـcanvas)
        useCORS: true,
        allowTaint: false,
        logging: false,
        imageTimeout: 10000,
        x: 0,
        y: i * plan.sliceHeightPx,
        width,
        height: sliceHeight,
      })
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95)
      const sliceHeightMm = contentWidthMm * (canvas.height / canvas.width)
      if (i > 0) pdf.addPage()
      pdf.addImage(dataUrl, "JPEG", marginMm, marginMm, contentWidthMm, sliceHeightMm)
      onProgress?.(i + 1, plan.pageCount)
    }

    pdf.save(fileName)
  } finally {
    host.remove()
  }
}
