import { useCallback, useRef, useState } from "react"
import { FileText, UploadCloud, Wand2, Copy, Save, Loader2, X, Check } from "lucide-react"

/**
 * PdfToMarkdownTool
 * -----------------------------------------------------------------------
 * أداة لوحة تحكم بسيطة: اختيار ملف PDF (نص قانوني)، تحويله إلى Markdown
 * منسّق (عناوين للفصول/المواد، فقرات نظيفة)، ثم تعديل النتيجة يدوياً قبل
 * نسخها أو حفظها.
 *
 * ملاحظة حول الاستخراج الفعلي للنص:
 * هذا المكوّن يحاول استخدام مكتبة `pdfjs-dist` (إن كانت مثبّتة في المشروع)
 * لاستخراج نص حقيقي من الـ PDF. إن لم تكن مثبّتة، أو فشل الاستخراج لأي
 * سبب، تنتقل الأداة تلقائياً لوضع "محاكاة" يعرض نصاً تجريبياً منسّقاً
 * حتى لا تتعطل الواجهة. لتفعيل الاستخراج الحقيقي:
 *   npm install pdfjs-dist
 */

interface PdfToMarkdownToolProps {
  onSave?: (markdown: string, fileName: string) => void | Promise<void>
}

type Status = "idle" | "converting" | "done" | "error"

export default function PdfToMarkdownTool({ onSave }: PdfToMarkdownToolProps) {
  const [file, setFile] = useState<File | null>(null)
  const [markdown, setMarkdown] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const pickFile = useCallback((f: File | undefined | null) => {
    if (!f) return
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setErrorMsg("الرجاء اختيار ملف بصيغة PDF فقط.")
      return
    }
    setErrorMsg(null)
    setFile(f)
    setMarkdown("")
    setStatus("idle")
  }, [])

  const handleDrop = useCallback(
    // HTMLElement بدل HTMLDivElement: نفس المعالج موصول بعنصر <label>
    // (شوف JSX تحت)، فتقييده بـ HTMLDivElement كان يمنع التصريف (TS2322).
    (e: React.DragEvent<HTMLElement>) => {
      e.preventDefault()
      setIsDragging(false)
      pickFile(e.dataTransfer.files?.[0])
    },
    [pickFile]
  )

  // تحويل نص خام مستخرج من PDF إلى Markdown منظّم، مع تمييز عناوين
  // الفصول والمواد الشائعة في النصوص القانونية المغربية.
  const formatLegalMarkdown = (rawText: string): string => {
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)

    const chapterRegex = /^(الباب|القسم|الكتاب)\s+(.+)/
    const articleRegex = /^(الفصل|المادة)\s+(\d+|[أ-ي]+)/

    // ملاحظة إصلاح خلل: الأسطر القادمة من PDF مقسّمة حسب عرض الصفحة
    // (التفاف السطر)، وليس حسب نهاية الجملة/الفقرة. دفع كل سطر PDF كسطر
    // Markdown منفصل كان كينتج فقرات "مقطّعة" بشكل غير مقروء. هنا نجمّع
    // الأسطر العادية المتتالية فـ فقرة واحدة متدفقة، ولا نفصل إلا عند
    // عنوان فصل/مادة جديد.
    const out: string[] = []
    let paragraph: string[] = []

    const flushParagraph = () => {
      if (paragraph.length) {
        out.push(paragraph.join(" "))
        paragraph = []
      }
    }

    for (const line of lines) {
      if (chapterRegex.test(line)) {
        flushParagraph()
        out.push(`\n## ${line}\n`)
      } else if (articleRegex.test(line)) {
        flushParagraph()
        out.push(`\n### ${line}\n`)
      } else {
        paragraph.push(line)
      }
    }
    flushParagraph()

    return out.join("\n\n").replace(/\n{3,}/g, "\n\n").trim()
  }

  // نص تجريبي يُستخدم عند تعذّر الاستخراج الحقيقي (وضع المحاكاة).
  const buildSimulatedMarkdown = (fileName: string): string =>
    `## نص تجريبي (محاكاة)\n\n> تعذّر استخراج نص حقيقي من "${fileName}". هذا محتوى نموذجي فقط — يمكنك حذفه والكتابة/اللصق يدوياً، أو تثبيت \`pdfjs-dist\` لتفعيل الاستخراج الفعلي.\n\n### الفصل الأول: أحكام عامة\n\nتنص هذه المادة على تنظيم موضوع القانون محل الدراسة، مع تحديد نطاق تطبيقه على الأشخاص والوقائع المعنية.\n\n### الفصل الثاني: الأحكام التفصيلية\n\nيوضح هذا الفصل الإجراءات والشروط الواجب توفرها، إضافة إلى الآثار القانونية المترتبة عن الإخلال بها.\n`

  // يحمّل worker ديال pdfjs-dist، مع تجربة أكثر من اسم ملف iu لأن اسم
  // الحزمة المبنية (min.mjs مقابل mjs) اختلف بين إصدارات pdfjs-dist.
  // بدون هذا، أي فرق فـ الإصدار كان كيخلي getDocument() يفشل بصمت من
  // أول استعمال، والأداة كتسقط دائماً فـ وضع "المحاكاة" (نص تجريبي) —
  // وهذا بالضبط سبب كون التحويل الحقيقي "ما كيخدمش" فـ الممارسة.
  const loadPdfWorkerSrc = async (): Promise<string> => {
    const candidates = [
      () => import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
      () => import("pdfjs-dist/build/pdf.worker.mjs?url"),
    ]
    for (const loadCandidate of candidates) {
      try {
        const mod = await loadCandidate()
        // @ts-ignore - شكل الاستيراد ?url يرجع { default: string }
        if (mod?.default) return mod.default as string
      } catch {
        // نجرب المرشّح التالي
      }
    }
    throw new Error("تعذّر تحميل ملف worker الخاص بـ pdfjs-dist")
  }

  const extractWithPdfJs = async (pdfFile: File): Promise<string> => {
    // تحميل ديناميكي حتى لا تُحمَّل مكتبة pdfjs-dist إلا عند الحاجة فعلاً
    // (ولا يتعطل المشروع إن لم تكن مثبّتة أصلاً).
    // @ts-ignore - قد لا تكون المكتبة مثبّتة بعد
    const pdfjsLib = await import("pdfjs-dist")
    // @ts-ignore
    pdfjsLib.GlobalWorkerOptions.workerSrc = await loadPdfWorkerSrc()

    const buffer = await pdfFile.arrayBuffer()
    const doc = await pdfjsLib.getDocument({ data: buffer }).promise

    let fullText = ""
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()

      // ملاحظة إصلاح خلل جوهري: content.items لا تحتوي على أسطر حقيقية —
      // كل عناصر النص فـ الصفحة كانت تُلصَق ببعضها بمسافة واحدة فـ سطر
      // واحد ضخم (`.join(" ")`). هذا كان كيخلي formatLegalMarkdown (اللي
      // كتبحث عن عناوين الفصول/المواد فـ بداية كل سطر عبر ^) لا تجد أي
      // تطابق أبداً، لأن كل شيء أصبح سطراً واحداً متواصلاً — فالنتيجة
      // كانت كتلة نص غير منسّقة بلا فقرات ولا عناوين حتى مع استخراج ناجح.
      // الحل: نعيد بناء الأسطر فعلياً بمقارنة الإحداثي العمودي (transform[5])
      // بين كل عنصر نصي والذي يليه — أي تغيّر ملحوظ فـ الموضع العمودي
      // يعني سطراً جديداً فـ الـ PDF الأصلي.
      let pageText = ""
      let lastY: number | null = null
      for (const item of content.items as any[]) {
        const str: string = item.str ?? ""
        const y: number | undefined = item.transform?.[5]
        if (typeof y === "number" && lastY !== null && Math.abs(y - lastY) > 1) {
          pageText += "\n"
        } else if (pageText && !pageText.endsWith("\n")) {
          pageText += " "
        }
        pageText += str
        if (typeof y === "number") lastY = y
        // hasEOL من pdf.js يشير أحياناً لنهاية فقرة/سطر منطقي
        if ((item as any).hasEOL) pageText += "\n"
      }
      fullText += pageText.trim() + "\n\n"
    }
    return fullText
  }

  const handleConvert = async () => {
    if (!file) return
    setStatus("converting")
    setErrorMsg(null)

    try {
      const rawText = await extractWithPdfJs(file)
      const formatted = formatLegalMarkdown(rawText)
      setMarkdown(formatted || buildSimulatedMarkdown(file.name))
      setStatus("done")
    } catch (err) {
      // فشل الاستخراج الحقيقي (المكتبة غير مثبّتة أو ملف معقّد) → محاكاة
      console.warn("تعذّر استخراج نص PDF حقيقي، سيتم استخدام وضع المحاكاة:", err)
      setMarkdown(buildSimulatedMarkdown(file.name))
      setStatus("done")
    }
  }

  const handleCopy = async () => {
    if (!markdown) return
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const handleSave = async () => {
    if (!markdown || !onSave) return
    setSaving(true)
    try {
      await onSave(markdown, file?.name ?? "document.md")
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setFile(null)
    setMarkdown("")
    setStatus("idle")
    setErrorMsg(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div dir="rtl" className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
          <FileText className="size-4 text-primary" />
          تحويل PDF إلى Markdown
        </h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          ارفع نصاً قانونياً بصيغة PDF، حوّله إلى Markdown منسّق، ثم عدّله قبل الحفظ.
        </p>
      </div>

      {/* منطقة الرفع */}
      {!file ? (
        <label
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/30 hover:border-primary hover:bg-primary/5"
          }`}
        >
          <UploadCloud className="size-7 text-muted-foreground" />
          <p className="text-xs font-bold text-foreground">
            اسحب ملف PDF هنا أو انقر للاختيار
          </p>
          <p className="text-[10.5px] text-muted-foreground">PDF فقط</p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
        </label>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="size-4 shrink-0 text-primary" />
            <span className="truncate text-xs font-semibold text-foreground">{file.name}</span>
            <span className="shrink-0 text-[10.5px] text-muted-foreground">
              ({(file.size / 1024).toFixed(0)} كيلوبايت)
            </span>
          </div>
          <button
            type="button"
            onClick={reset}
            title="إزالة الملف"
            className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {errorMsg && <p className="text-[11px] font-semibold text-destructive">{errorMsg}</p>}

      {/* زر التحويل */}
      <button
        type="button"
        onClick={handleConvert}
        disabled={!file || status === "converting"}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
      >
        {status === "converting" ? (
          <>
            <Loader2 className="size-3.5 animate-spin" /> جاري التحويل...
          </>
        ) : (
          <>
            <Wand2 className="size-3.5" /> تحويل إلى Markdown
          </>
        )}
      </button>

      {/* معاينة/تعديل النتيجة */}
      {(status === "done" || markdown) && (
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-muted-foreground">
            معاينة Markdown (قابل للتعديل)
          </label>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            dir="rtl"
            rows={14}
            className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-xs leading-relaxed text-foreground outline-none focus:border-primary"
            placeholder="سيظهر نص Markdown هنا بعد التحويل..."
          />

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!markdown}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[11px] font-bold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
              {copied ? "تم النسخ" : "نسخ Markdown"}
            </button>

            {onSave && (
              <button
                type="button"
                onClick={handleSave}
                disabled={!markdown || saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent-gold px-3 py-2 text-[11px] font-bold text-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                {saving ? "جاري الحفظ..." : "حفظ"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}