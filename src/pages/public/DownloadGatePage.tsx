import { useEffect, useState } from "react"
import { useParams, useLocation, Link } from "react-router-dom"
import { AEOHead } from "../../components/seo/AEOHead"
import { buildMetaDescription } from "../../lib/seo/description"
import { supabase } from "../../lib/supabase/client"
import { useTrackView } from "@/hooks/useTrackView"
import { Download, Loader2, ArrowRight, FileText, AlertCircle } from "lucide-react"


interface DownloadTarget {
  title: string
  downloadUrl: string
  fileSize?: string
  fileFormat?: string
}

export function DownloadGatePage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const stateTarget = (location.state as DownloadTarget | null) || null

  const [target, setTarget] = useState<DownloadTarget | null>(stateTarget)
  const [loading, setLoading] = useState(!stateTarget)

  // تتبّع قراءة/معاينة حقيقية لهذا الملف (مرة واحدة لكل جلسة متصفح)
  useTrackView("pdf", id)

  // إن لم تصل بيانات الملف عبر التنقّل الداخلي (مثلاً: فُتحت الصفحة مباشرة أو أُعيد تحميلها)،
  // نحاول جلبها من قاعدة البيانات اعتماداً على المعرّف في الرابط
  useEffect(() => {
    if (stateTarget || !id) {
      setLoading(false)
      return
    }
    let cancelled = false

    supabase
      .from("pdf_summaries")
      .select("title, file_url, file_size_bytes")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        if (data) {
          setTarget({
            title: (data as any).title,
            downloadUrl: (data as any).file_url,
            fileSize: (data as any).file_size_bytes
              ? `${((data as any).file_size_bytes / (1024 * 1024)).toFixed(1)} MB`
              : undefined,
          })
        }
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, stateTarget])

  const handleFinalDownload = async () => {
    // زيادة عدّاد التحميلات (لا يوقف التحميل إن فشل)
    if (id) {
      try {
        await (supabase as any).rpc("increment_pdf_downloads", { p_id: id })
      } catch {
        /* تجاهل الخطأ — لا نمنع التحميل بسببه */
      }
    }
  }

  if (loading) {
    return (
      <main className="container mx-auto max-w-2xl px-4 py-24 flex items-center justify-center" dir="rtl">
        <Loader2 className="animate-spin text-primary" size={32} />
      </main>
    )
  }

  if (!target || !target.downloadUrl || target.downloadUrl === "#") {
    return (
      <>
        <AEOHead
          title="الملف غير متاح"
          description="تعذّر العثور على رابط تحميل صالح لهذا الملف ضمن أرشيف منصة الميزان الرقمية. قد يكون الملف غير متاح مؤقتاً أو تم نقله إلى قسم آخر من الأرشيف."
        directAnswer="DownloadGatePage في ميزان الرقمية منصة مغربية للمعرفة القانونية لطلبة الحقوق."
        breadcrumbs={[{ name: "الرئيسية", url: "/" }, { name: "الملف غير متاح", url: "/archive" }]}
          noindex
        />
        <main className="container mx-auto max-w-xl px-4 py-20 text-center" dir="rtl">
          <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-card p-8">
            <AlertCircle size={40} className="mx-auto text-muted-foreground mb-3" />
            <h1 className="text-xl font-bold text-foreground">الملف غير متاح حالياً</h1>
            <p className="mt-2 text-xs text-muted-foreground">
              لم نتمكن من العثور على رابط تحميل صالح لهذا الملف.
            </p>
            <Link
              to="/archive"
              title="العودة إلى المكتبة والملخصات"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition hover:opacity-90"
            >
              <ArrowRight size={16} />
              العودة إلى المكتبة والملخصات
            </Link>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <AEOHead
        title={`تحميل: ${target.title}`}
        description={buildMetaDescription(null, [
          `حمّل مجاناً ملف "${target.title}" من أرشيف منصة الميزان الرقمية`,
          "المرجع القانوني المخصص لطلبة كليات الحقوق بالمغرب، بما يضم ملخصات دراسية ونصوصاً قانونية محدَّثة باستمرار.",
        ])}
      />

      <main className="container mx-auto max-w-2xl px-4 py-10" dir="rtl">
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileText size={26} />
          </div>

          <h1 className="text-lg md:text-xl font-bold text-foreground leading-snug">
            {target.title}
          </h1>

          {target.fileSize && (
            <p className="mt-1 text-xs font-mono text-muted-foreground">
              {target.fileSize} {target.fileFormat ? `- ${target.fileFormat}` : ""}
            </p>
          )}

          <p className="mt-5 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            الملف جاهز للتحميل مجاناً
          </p>

          {/* زر التحميل الحقيقي */}
          <a
            href={target.downloadUrl}
            title={`تحميل ${target.title}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleFinalDownload()}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-md transition hover:opacity-90"
          >
            <Download size={18} />
            <span>تحميل الملف الآن</span>
          </a>

          <Link
            to="/archive"
            title="العودة إلى المكتبة والملخصات"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition"
          >
            <ArrowRight size={14} />
            العودة إلى المكتبة والملخصات
          </Link>
        </div>
      </main>
    </>
  )
}