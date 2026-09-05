import { useEffect, useMemo, useState } from "react"
import { useParams, useLocation, Link } from "react-router-dom"
import { SEOHead } from "../../components/seo/SEOHead"
import { generateBreadcrumbSchema, SITE_CONFIG } from "../../lib/seo/schema"
import { buildMetaDescription } from "../../lib/seo/description"
import { supabase } from "../../lib/supabase/client"
import { useTrackView } from "@/hooks/useTrackView"
import docsData from "../../data/docs.json"
import { titledSlugById } from "../../lib/utils/generateSlug"
import { Download, Loader2, ArrowRight, FileText, ShieldCheck, AlertCircle } from "lucide-react"

// مدة الانتظار قبل تفعيل زر التحميل — بوابة أمان بسيطة تمنع الربط
// المباشر الفوري (hotlinking) وتمنح وقتاً كافياً لعرض الإعلانات المسؤولة
// وتحسين تجربة الانتظار قبل الوصول إلى ملف Cloudflare R2.
const WAIT_SECONDS = 10

type SourceTable = "local" | "pdf_summaries" | "laws"

interface DownloadTarget {
  title: string
  downloadUrl: string
  fileSize?: string
  fileFormat?: string
  sourceTable?: SourceTable
  dbId?: string
}

/**
 * صفحة تحميل مخصّصة لكل مستند بمُعرِّف فريد وقابل للمشاركة: /pdf/:slug
 * على عكس الرابط القديم /download/:id (الذي كان يعتمد على مُعرِّفات
 * داخلية غير قابلة للمشاركة بأمان)، هذا الرابط ثابت، صديق لمحركات
 * البحث، ويمكن نسخه ومشاركته مباشرة أو فتحه بعد إعادة تحميل الصفحة.
 */
export function PdfDownloadPage() {
  const { slug } = useParams<{ slug: string }>()
  const location = useLocation()
  const stateTarget = (location.state as DownloadTarget | null) || null

  const [target, setTarget] = useState<DownloadTarget | null>(stateTarget)
  const [loading, setLoading] = useState(!stateTarget)
  const [notFound, setNotFound] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(WAIT_SECONDS)

  // خريطة الروابط الصديقة للمستندات المحلية (docs.json) — نفس المنطق
  // المستخدم بالضبط في صفحة الأرشيف، لضمان تطابق الروابط بين الصفحتين
  const localSlugMap = useMemo(() => {
    const idToSlug = titledSlugById((docsData as any[]).map((d) => ({ id: d.id, title: d.title })))
    const slugToDoc = new Map<string, any>()
    for (const doc of docsData as any[]) {
      const s = idToSlug.get(doc.id)
      if (s) slugToDoc.set(s, doc)
    }
    return slugToDoc
  }, [])

  // تتبّع قراءة/معاينة حقيقية لهذا الملف (مرة واحدة لكل جلسة متصفح)
  useTrackView("pdf", slug)

  // إن لم تصل بيانات الملف عبر التنقّل الداخلي (فُتحت الصفحة مباشرة، أُعيد
  // تحميلها، أو وُصل إليها عبر رابط مُشارَك)، نحلّها اعتماداً على الـ slug
  useEffect(() => {
    if (stateTarget || !slug) {
      setLoading(false)
      return
    }
    let cancelled = false

    const resolve = async () => {
      // 1) المستندات المحلية (docs.json) — لا تحتاج شبكة
      const localDoc = localSlugMap.get(slug)
      if (localDoc) {
        setTarget({
          title: localDoc.title,
          downloadUrl: localDoc.fileUrl || "#",
          fileFormat: "PDF",
          sourceTable: "local",
        })
        setLoading(false)
        return
      }

      // 2) ملخصات مرفوعة عبر لوحة التحكم (pdf_summaries)
      const { data: pdfRow } = await supabase
        .from("pdf_summaries")
        .select("id, title, file_url, file_size_bytes")
        .eq("slug", slug)
        .maybeSingle()

      if (!cancelled && pdfRow) {
        setTarget({
          title: (pdfRow as any).title,
          downloadUrl: (pdfRow as any).file_url,
          fileSize: (pdfRow as any).file_size_bytes
            ? `${((pdfRow as any).file_size_bytes / (1024 * 1024)).toFixed(1)} MB`
            : undefined,
          fileFormat: "PDF",
          sourceTable: "pdf_summaries",
          dbId: (pdfRow as any).id,
        })
        setLoading(false)
        return
      }

      // 3) نصوص قانونية عامة (laws)
      const { data: lawRow } = await (supabase as any)
        .from("laws")
        .select("id, title, pdf_url")
        .eq("slug", slug)
        .maybeSingle()

      if (!cancelled && lawRow && lawRow.pdf_url) {
        setTarget({
          title: lawRow.title,
          downloadUrl: lawRow.pdf_url,
          fileFormat: "PDF",
          sourceTable: "laws",
          dbId: lawRow.id,
        })
        setLoading(false)
        return
      }

      if (!cancelled) {
        setNotFound(true)
        setLoading(false)
      }
    }

    resolve()

    return () => {
      cancelled = true
    }
  }, [slug, stateTarget, localSlugMap])

  // العدّ التنازلي
  useEffect(() => {
    if (!target || secondsLeft <= 0) return
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [target, secondsLeft])

  const readyToDownload = secondsLeft <= 0
  const progressPct = Math.round(((WAIT_SECONDS - secondsLeft) / WAIT_SECONDS) * 100)

  const handleFinalDownload = async () => {
    // زيادة عدّاد التحميلات بحسب مصدر الملف (لا يوقف التحميل إن فشل الطلب)
    try {
      if (target?.sourceTable === "pdf_summaries" && target.dbId) {
        await (supabase as any).rpc("increment_pdf_downloads", { p_id: target.dbId })
      } else if (target?.sourceTable === "laws" && target.dbId) {
        await (supabase as any).rpc("increment_law_downloads", { p_id: target.dbId })
      } else if (target?.sourceTable === "local" && slug) {
        // الملفات المحلية الثابتة (docs.json) لا تملك معرّفاً في قاعدة البيانات،
        // لذا نستخدم الـ slug الفريد الخاص بها كمفتاح للعدّاد
        await (supabase as any).rpc("increment_local_pdf_downloads", { p_slug: slug })
      }
    } catch {
      /* تجاهل الخطأ — لا نمنع التحميل بسببه */
    }
  }

  if (loading) {
    return (
      <main className="container mx-auto max-w-2xl px-4 py-24 flex items-center justify-center" dir="rtl">
        <Loader2 className="animate-spin text-primary" size={32} />
      </main>
    )
  }

  if (notFound || !target || !target.downloadUrl || target.downloadUrl === "#") {
    return (
      <>
        <SEOHead
          title="الملف غير متاح"
          description="تعذّر العثور على رابط تحميل صالح لهذا الملف ضمن أرشيف منصة الميزان الرقمية. قد يكون الملف غير متاح مؤقتاً أو تم نقله إلى قسم آخر من الأرشيف."
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

  const canonicalUrl = `${SITE_CONFIG.url}/pdf/${slug}`

  return (
    <>
      <SEOHead
        title={`تحميل: ${target.title}`}
        description={buildMetaDescription(null, [
          `حمّل مجاناً ملف "${target.title}" من أرشيف منصة الميزان الرقمية`,
          "المرجع القانوني المخصص لطلبة كليات الحقوق بالمغرب، بما يضم ملخصات دراسية ونصوصاً قانونية محدَّثة باستمرار.",
        ])}
        canonicalUrl={canonicalUrl}
        schema={[
          generateBreadcrumbSchema([
            { name: "الرئيسية", url: "/" },
            { name: "المكتبة والملخصات", url: "/archive" },
            { name: target.title, url: `/pdf/${slug}` },
          ]),
        ]}
      />

      <main className="container mx-auto max-w-2xl px-4 py-10" dir="rtl">
        {/* شريط إعلاني علوي — وحدة Adsterra (Banner 300x250) */}
        <div className="mb-6 flex min-h-24 items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 text-xs text-muted-foreground">
          <span>مساحة إعلانية</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileText size={26} />
          </div>

          <h1 className="text-lg md:text-xl font-bold text-foreground leading-snug">
            {target.title}
          </h1>

          {target.fileSize && (
            <p className="mt-1 text-xs font-mono text-muted-foreground">
              {target.fileSize} {target.fileFormat ? `· ${target.fileFormat}` : ""}
            </p>
          )}

          {/* شريط التقدّم / العدّ التنازلي */}
          <div className="mt-6" role="status" aria-live="polite">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-1000 ease-linear"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <ShieldCheck size={13} />
              {readyToDownload ? "الملف جاهز الآن" : `جارٍ تجهيز رابط التحميل الآمن... ${secondsLeft} ثانية`}
            </p>
          </div>

          {/* إعلان أوسط — وحدة Adsterra (Banner 320x50) */}
          <div className="mt-6 flex min-h-[50px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 text-xs text-muted-foreground">
            <span>مساحة إعلانية</span>
          </div>

          {/* زر التحميل الحقيقي (رابط Cloudflare R2 الآمن) */}
          <a
            href={readyToDownload ? target.downloadUrl : undefined}
            title={`تحميل ${target.title}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!readyToDownload) {
                e.preventDefault()
                return
              }
              handleFinalDownload()
            }}
            aria-disabled={!readyToDownload}
            tabIndex={readyToDownload ? 0 : -1}
            className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold shadow-md transition ${
              readyToDownload
                ? "bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {readyToDownload ? <Download size={18} /> : <Loader2 size={18} className="animate-spin" />}
            <span>{readyToDownload ? "تحميل الملف الآن" : `تحميل الملف (${secondsLeft})`}</span>
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
