import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type Ref } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, Download, Scale } from "lucide-react"
import { LAW_ARCHIVE } from "@/lib/careers/laws"
import {
  formatMoroccanDate,
  pickLatest,
  toShowcaseLaw,
  type ArchiveLawRow,
  type ShowcaseLaw,
} from "@/lib/laws/showcase"
import { afterWindowLoad, scheduleWhenIdle } from "@/lib/utils/deferWork"
import { downloadLinkOf } from "../../../shared/archive/links.js"
import "@/styles/law-showcase.css"

/**
 * «نصوص قانونية من الأرشيف» في الصفحة الرئيسية — عرض لأحدث النصوص فقط.
 *
 * لا فلاتر ولا تبويبات ولا بحث هنا: الفلترة في صفحة الأرشيف. الزرّ السفلي
 * يفتح الأرشيف مفلتراً على النصوص القانونية (?type=legal-texts).
 *
 * مصدر البيانات (كما كان):
 *   1) اللقطة المولَّدة وقت البناء (src/data/laws.client.json): رابط الصفحة
 *      فيها محسوب بأدوات prerender، فالرابط المعروض هو المنشور فعلاً.
 *   2) السجلات الأحدث من آخر بناء تُجلب من القاعدة بعد التحميل، وتُعرض
 *      برابط ملفها المباشر لا برابط صفحة لم تُولَّد بعد (وإلا 404).
 *   3) لا بطاقة بلا رابط حقيقي، ولا قسم فارغ: بلا بيانات يُخفى القسم كلّه.
 */

const MAX_CARDS = 6
const STAGGER_MS = 80

function fromSnapshot(): ArchiveLawRow[] {
  return (LAW_ARCHIVE as unknown as Array<Record<string, unknown>>)
    .filter((law) => typeof law.public_path === "string" && law.public_path && law.title)
    .map((law) => ({
      slug: String(law.slug ?? ""),
      title: String(law.title ?? ""),
      law_number: (law.law_number as string | null) ?? null,
      official_gazette_number: (law.official_gazette_number as string | null) ?? null,
      publication_date: (law.publication_date as string | null) ?? null,
      pdf_url: (law.pdf_url as string | null) ?? null,
      pagePath: String(law.public_path),
    }))
}

/**
 * ظهور تدريجي عند التمرير. يعيد الطور:
 *   pending — مخفية بانتظار الدخول إلى الشاشة،
 *   in      — تعمل الحركة الآن،
 *   static  — ظاهرة بلا حركة (تقليل الحركة، أو لا IntersectionObserver).
 */
type RevealPhase = "pending" | "in" | "static"

function useReveal<T extends Element>(): { ref: Ref<T>; phase: RevealPhase } {
  const ref = useRef<T | null>(null)
  const [phase, setPhase] = useState<RevealPhase>("pending")

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (reduced || typeof IntersectionObserver === "undefined") {
      setPhase("static")
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPhase("in")
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, phase }
}

/** بطاقة نص واحد. تُبنى من الحقول المنفصلة، ولا تكرّر رقم القانون في العنوان. */
export function LawShowcaseCard({ law, index = 0 }: { law: ShowcaseLaw; index?: number }) {
  const titleId = useId()
  const { ref, phase } = useReveal<HTMLElement>()

  const numberLabel = law.number ?? "—"
  const dateLabel = formatMoroccanDate(law.published)

  // زرّ القراءة يذهب إلى صفحة النص، وإن لم تكن منشورة بعد فإلى ملف PDF.
  const primaryHref = law.pagePath ?? law.pdfUrl
  const primaryExternal = !law.pagePath
  const primaryLabel = law.number ? `اقرأ القانون ${law.number}` : `اقرأ القانون: ${law.title}`
  // زرّ PDF الثانوي يظهر فقط إن وُجد ملف، وإن كان زرّ القراءة نفسه هو الملف فلا يتكرر.
  const showPdf = Boolean(law.pdfUrl && law.pagePath)
  const pdfLabel = law.number ? `تحميل ملف PDF للقانون ${law.number}` : `تحميل ملف PDF: ${law.title}`

  const classes = [
    "law-card",
    phase === "pending" && "law-card--pending",
    phase === "in" && "law-card--in",
  ]
    .filter(Boolean)
    .join(" ")

  const style = { "--law-delay": `${Math.min(index, 5) * STAGGER_MS}ms` } as CSSProperties

  return (
    <article ref={ref} className={classes} style={style} aria-labelledby={titleId}>
      <div className="law-card__num">
        <span className="law-card__type">{law.type}</span>
        <span className="law-card__number" dir="ltr">{numberLabel}</span>
        {law.year !== null && <span className="law-card__year">{law.year}</span>}
      </div>

      <div className="law-card__body">
        <h3 id={titleId} className="law-card__title">{law.title}</h3>

        {(law.gazette || dateLabel) && (
          <ul className="law-card__meta">
            {law.gazette && <li>الجريدة الرسمية عدد {law.gazette}</li>}
            {law.published && dateLabel && (
              <li>
                <time dateTime={law.published}>{dateLabel}</time>
              </li>
            )}
          </ul>
        )}

        <div className="law-card__actions">
          {primaryHref &&
            (primaryExternal ? (
              <a
                href={primaryHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={primaryLabel}
                className="law-card__btn law-card__btn--primary"
              >
                اقرأ القانون
              </a>
            ) : (
              <Link to={primaryHref} aria-label={primaryLabel} className="law-card__btn law-card__btn--primary">
                اقرأ القانون
              </Link>
            ))}

          {showPdf && (
            <a
              href={law.pdfUrl!}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={pdfLabel}
              className="law-card__btn law-card__btn--ghost"
            >
              <Download className="size-3.5" aria-hidden="true" />
              PDF
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

export function HomeLawArchive() {
  const [remote, setRemote] = useState<ArchiveLawRow[]>([])

  // نفس قاعدة بقية أقسام الصفحة: اللقطة تُعرض فوراً، وما استجدّ يُجلب بعد
  // اكتمال التحميل وأول خمول، لا في نافذة قياس Core Web Vitals.
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
              pdf_url: downloadLinkOf(row) || null,
              pagePath: null,
            }))
            .filter((row: ArchiveLawRow) => row.slug && row.title)
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
    const known = new Set(snapshot.map((row) => row.slug))
    // السجلات الأحدث من آخر بناء: لا تُعرض إلا بملفها المباشر.
    const fresh = remote.filter((row) => !known.has(row.slug) && row.pdf_url)
    return pickLatest([...snapshot, ...fresh].map(toShowcaseLaw), MAX_CARDS)
  }, [remote])

  if (!laws.length) return null

  return (
    <section className="law-showcase" aria-labelledby="home-law-archive-title" data-home-law-archive="section">
      <header className="law-showcase__head">
        <h2 id="home-law-archive-title" className="law-showcase__title">
          <span className="law-showcase__icon" aria-hidden="true">
            <Scale className="size-4" />
          </span>
          نصوص قانونية من الأرشيف
        </h2>
        <p className="law-showcase__lead">
          أحدث النصوص التشريعية المغربية في أرشيف ميزان، اقرأها كاملة أو حمّلها بصيغة PDF.
        </p>
      </header>

      <ul className="law-showcase__grid">
        {laws.map((law, index) => (
          <li key={law.slug}>
            <LawShowcaseCard law={law} index={index} />
          </li>
        ))}
      </ul>

      <div className="law-showcase__cta">
        <Link to="/archive?type=legal-texts" className="law-showcase__cta-link">
          تصفح كل النصوص القانونية
          <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}

export default HomeLawArchive
