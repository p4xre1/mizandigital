import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Scale, FileText, ArrowRight, Download } from "lucide-react"
import { LAW_ARCHIVE } from "@/lib/careers/laws"
import { afterWindowLoad, scheduleWhenIdle } from "@/lib/utils/deferWork"
import { downloadLinkOf } from "../../../shared/archive/links.js"

/**
 * «نصوص قانونية من الأرشيف» في الصفحة الرئيسية.
 *
 * لماذا قسم مستقل في الصفحة الرئيسية؟
 * -----------------------------------
 * أرشيف القوانين أضخم محتوى حقيقي في المنصة (عشرات النصوص المنشورة في
 * الجريدة الرسمية)، وكان غائباً عن الواجهة الأولى تماماً: الزائر يرى
 * ملخصات ومقالات، ولا يعرف أن المنصة تضم النصوص نفسها إلا إن عرف طريق
 * /archive. القسم هنا يفتح الأرشيف من الباب الرئيسي.
 *
 * قواعد مطبَّقة هنا (لا رابط مُخترع، ولا رابط فارغ):
 *   1) الأساس هو اللقطة المولَّدة وقت البناء (src/data/laws.client.json):
 *      رابط الصفحة فيها محسوب بنفس دوال prerender، فالرابط المعروض هو
 *      الرابط المنشور فعلاً — لا رابط يُبنى مرتين فيفترق.
 *   2) السجلات الأحدث من آخر بناء تُجلب من القاعدة بعد التحميل، وتُعرض
 *      برابط ملفها المباشر لا برابط /pdf/<slug>: صفحتها الثابتة لم تُولَّد
 *      بعد، وربطها بها يعني 404. (هذه هي الحالة التي تجعل الأرشيف يبدو
 *      «ناقصاً» قبل إعادة البناء.)
 *   3) لا بطاقة بلا رابط حقيقي، ولا زرّ تحميل إلا لمن يملك ملفاً فعلياً.
 *   4) لا عناصر بديلة ولا قسم فارغ: بلا بيانات يُخفى القسم كلّه.
 */

const MAX_CARDS = 8

interface LawCard {
  slug: string
  title: string
  law_number: string | null
  official_gazette_number: string | null
  publication_date: string | null
  /** رابط الصفحة المنشورة — null لسجلّ أحدث من آخر بناء. */
  pagePath: string | null
  pdf_url: string | null
}

/** أحدث النصوص أولاً (تاريخ النشر)، ثم العنوان ترتيباً ثابتاً. */
function sortLaws(laws: LawCard[]): LawCard[] {
  return [...laws].sort((a, b) => {
    const left = a.publication_date ?? ""
    const right = b.publication_date ?? ""
    if (left !== right) return left < right ? 1 : -1
    return a.title.localeCompare(b.title, "ar")
  })
}

const formatDate = (value: string | null) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString("ar-MA", { year: "numeric", month: "long", day: "numeric" })
}

/** اللقطة المولَّدة وقت البناء — الرابط فيها هو الرابط المنشور فعلاً. */
function fromSnapshot(): LawCard[] {
  return (LAW_ARCHIVE as unknown as Array<Record<string, unknown>>)
    .filter((law) => typeof law.public_path === "string" && law.public_path && law.title)
    .map((law) => ({
      slug: String(law.slug ?? ""),
      title: String(law.title ?? ""),
      law_number: (law.law_number as string | null) ?? null,
      official_gazette_number: (law.official_gazette_number as string | null) ?? null,
      publication_date: (law.publication_date as string | null) ?? null,
      pagePath: String(law.public_path),
      pdf_url: (law.pdf_url as string | null) ?? null,
    }))
}

export function HomeLawArchive() {
  const [remote, setRemote] = useState<LawCard[]>([])

  // ── لماذا التأجيل ─────────────────────────────────────────────────────
  // نفس قاعدة بقية أقسام الصفحة الرئيسية: اللقطة المحلية تُعرض فوراً في
  // أول رسم (وهي ما يقرأه الزاحف)، ويُجلب ما استجدّ بعد اكتمال التحميل
  // وأول خمول — لا في نافذة قياس Core Web Vitals.
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const { supabase } = await import("../../lib/supabase/client")
        const { data } = await (supabase as any)
          .from("laws")
          .select("id,title,slug,law_number,official_gazette_number,publication_date,pdf_url")
          .order("publication_date", { ascending: false })
          .limit(40)

        if (cancelled || !Array.isArray(data)) return

        setRemote(
          data
            .map((row: Record<string, unknown>) => ({
              slug: String(row.slug ?? row.id ?? ""),
              title: String(row.title ?? ""),
              law_number: (row.law_number as string | null) ?? null,
              official_gazette_number: (row.official_gazette_number as string | null) ?? null,
              publication_date: (row.publication_date as string | null) ?? null,
              pagePath: null,
              pdf_url: downloadLinkOf(row) || null,
            }))
            .filter((card: LawCard) => card.slug && card.title)
        )
      } catch {
        /* بلا شبكة: تبقى اللقطة المولَّدة (أو لا شيء) — لا عناصر بديلة */
      }
    }

    const cancel = afterWindowLoad(() => scheduleWhenIdle(() => void load(), { timeout: 8000 }))
    return () => {
      cancelled = true
      cancel()
    }
  }, [])

  const laws = useMemo(() => {
    const snapshot = fromSnapshot()
    const known = new Set(snapshot.map((law) => law.slug))
    // السجلات الأحدث من آخر بناء: تُعرض برابط ملفها المباشر لأن صفحتها
    // الثابتة لم تُولَّد بعد.
    const fresh = remote.filter((law) => !known.has(law.slug) && law.pdf_url)
    return sortLaws([...snapshot, ...fresh]).slice(0, MAX_CARDS)
  }, [remote])

  if (!laws.length) return null

  return (
    <section className="mt-12" aria-labelledby="home-law-archive-title" data-home-law-archive="section">
      <div className="flex items-center justify-between mb-6">
        <h3
          id="home-law-archive-title"
          className="font-black text-[16px] text-[#0f172a] dark:text-white flex items-center gap-2"
        >
          <span className="grid size-7 place-items-center rounded-full bg-[#0f766e]/10 text-[#0f766e]">
            <Scale className="size-4" />
          </span>
          نصوص قانونية من الأرشيف
        </h3>
        <Link
          to="/archive"
          aria-label="عرض الكل: نصوص قانونية من الأرشيف"
          className="text-[12px] font-bold text-[#2563eb] hover:underline flex items-center gap-1"
        >
          عرض الكل <ArrowRight className="size-3 rtl:rotate-180" aria-hidden="true" />
        </Link>
      </div>

      <p className="mb-5 text-[12.5px] leading-6 text-[#64748b] dark:text-[#94a3b8] max-w-3xl">
        نصوص تشريعية مغربية منشورة في أرشيف ميزان، مع رقم النصّ وعدد الجريدة الرسمية وتاريخ النشر.
        رابط الصفحة يفتح النصّ كاملاً، وملف PDF جاهز للتحميل متى كان متاحاً.
      </p>

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {laws.map((law) => {
          const gazette = law.official_gazette_number?.trim() || null
          const published = formatDate(law.publication_date)

          return (
            <li key={law.slug}>
              <article className="h-full rounded-2xl border border-[#e2e8f0] dark:border-[#334155] bg-white dark:bg-[#1e293b] p-4 hover:border-[#0f766e]/30 hover:shadow-[0_8px_20px_rgba(15,118,110,0.08)] transition-all flex flex-col">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f0fdfa] dark:bg-[#134e4a] text-[#0f766e]">
                    <FileText className="size-4" />
                  </span>
                  <div className="min-w-0">
                    {law.law_number && (
                      <span className="inline-block rounded-full bg-[#f1f5f9] dark:bg-[#334155] px-2.5 py-0.5 text-[10px] font-bold text-[#0f766e]">
                        {law.law_number}
                      </span>
                    )}
                    <h4 className="mt-1.5 font-bold text-[13.5px] leading-snug text-[#0f172a] dark:text-white">
                      {law.pagePath ? (
                        <Link to={law.pagePath} className="hover:text-[#0f766e] transition-colors">
                          {law.title}
                        </Link>
                      ) : (
                        law.title
                      )}
                    </h4>
                  </div>
                </div>

                <dl className="mt-3 space-y-1 text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                  {gazette && (
                    <div className="flex gap-1.5">
                      <dt className="font-semibold">الجريدة الرسمية:</dt>
                      <dd className="truncate">{gazette}</dd>
                    </div>
                  )}
                  {published && (
                    <div className="flex gap-1.5">
                      <dt className="font-semibold">تاريخ النشر:</dt>
                      <dd>{published}</dd>
                    </div>
                  )}
                </dl>

                <div className="mt-4 pt-3 border-t border-[#f1f5f9] dark:border-[#334155] flex items-center gap-2">
                  {law.pagePath && (
                    <Link
                      to={law.pagePath}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563eb] px-3.5 py-2 text-[11px] font-bold text-white hover:bg-[#1d4ed8] transition"
                    >
                      اقرأ النصّ كاملاً
                    </Link>
                  )}
                  {law.pdf_url && (
                    <a
                      href={law.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#e2e8f0] dark:border-[#334155] px-3.5 py-2 text-[11px] font-bold text-[#0f172a] dark:text-white hover:bg-[#f8fafc] dark:hover:bg-[#334155] transition"
                    >
                      <Download className="size-3.5" aria-hidden="true" />
                      تحميل PDF
                    </a>
                  )}
                </div>
              </article>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default HomeLawArchive
