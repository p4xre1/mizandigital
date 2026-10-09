import { lazy, Suspense } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, Languages } from "lucide-react"
import { generateSlug } from "@/lib/utils/generateSlug"
import { ARTICLE_FORMS, SOURCE_FORMS, TERM_FORMS, arabicCount } from "@/lib/utils/arabicCount"
import { articleTotal, categoryTone, type CategoryTone, type TreeTerm } from "@/lib/lexicon/treeTerms"
import type { LegalSource } from "@/types/cms"

const LegalTermTree = lazy(() => import("../lexicon/LegalTermTree").then((m) => ({ default: m.LegalTermTree })))

/**
 * لون الفئة (الشارة وحدود التمرير). أصناف كاملة مكتوبة صراحةً حتى يلتقطها Tailwind.
 * مدني أزرق، تجاري كهرماني، تنظيم قضائي بنفسجي، جنائي أحمر.
 */
const PILL: Record<CategoryTone, string> = {
  blue: "bg-[#eff6ff] text-[#1d4ed8] dark:bg-[#1e3a5f] dark:text-[#93c5fd]",
  amber: "bg-[#fffbeb] text-[#b45309] dark:bg-[#451a03] dark:text-[#fcd34d]",
  purple: "bg-[#f5f3ff] text-[#6d28d9] dark:bg-[#2e1065] dark:text-[#c4b5fd]",
  red: "bg-[#fef2f2] text-[#b91c1c] dark:bg-[#450a0a] dark:text-[#fca5a5]",
  emerald: "bg-[#ecfdf5] text-[#047857] dark:bg-[#022c22] dark:text-[#6ee7b7]",
  teal: "bg-[#f0fdfa] text-[#0f766e] dark:bg-[#042f2e] dark:text-[#5eead4]",
  slate: "bg-[#f1f5f9] text-[#334155] dark:bg-[#334155] dark:text-[#cbd5e1]",
}

const HOVER_BORDER: Record<CategoryTone, string> = {
  blue: "hover:border-[#2563eb]",
  amber: "hover:border-[#f59e0b]",
  purple: "hover:border-[#7c3aed]",
  red: "hover:border-[#ef4444]",
  emerald: "hover:border-[#10b981]",
  teal: "hover:border-[#0f766e]",
  slate: "hover:border-[#64748b]",
}

const CHIP_SOURCES = "bg-[#eff6ff] text-[#1d4ed8] dark:bg-[#1e3a5f] dark:text-[#93c5fd]"
const CHIP_ARTICLES = "bg-[#f1f5f9] text-[#334155] dark:bg-[#334155] dark:text-[#cbd5e1]"

/** شارتا التذييل: عدد المصادر وعدد الفصول، بالمطابقة العربية الصحيحة. */
function TreeChips({ term }: { term: TreeTerm }) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className={`rounded-full px-3 py-1 text-[12px] font-bold ${CHIP_SOURCES}`}>
        {arabicCount(term.legal_sources.length, SOURCE_FORMS)}
      </span>
      <span className={`rounded-full px-3 py-1 text-[12px] font-bold ${CHIP_ARTICLES}`}>
        {arabicCount(articleTotal(term), ARTICLE_FORMS)}
      </span>
    </div>
  )
}

function LexiconCard({ term }: { term: TreeTerm }) {
  const tone = categoryTone(term.category)
  return (
    <Link
      to={`/lexicon/${generateSlug(term.term_ar)}`}
      className={`group flex h-full flex-col rounded-2xl border border-[#e2e8f0] bg-white p-5 transition-all hover:-translate-y-1 hover:shadow-[0_12px_24px_-12px_rgba(15,23,42,0.18)] dark:border-[#334155] dark:bg-[#1e293b] ${HOVER_BORDER[tone]}`}
    >
      <span className={`self-start rounded-full px-3 py-1 text-[12px] font-bold ${PILL[tone]}`}>{term.category}</span>

      <h3 className="mt-4 text-[24px] font-black leading-tight text-[#0f172a] transition-colors group-hover:text-[#2563eb] dark:text-white dark:group-hover:text-[#93c5fd]">
        {term.term_ar}
      </h3>
      {term.term_fr && (
        <p className="mt-1.5 text-[15px] font-medium text-[#475569] dark:text-[#cbd5e1]">{term.term_fr}</p>
      )}

      <p className="mt-3 line-clamp-3 flex-1 text-[13.5px] leading-6 text-[#475569] dark:text-[#cbd5e1]">{term.definition}</p>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#f1f5f9] pt-4 dark:border-[#334155]">
        <TreeChips term={term} />
        <ArrowRight className="size-5 shrink-0 text-[#2563eb] transition-transform group-hover:-translate-x-1 rtl:rotate-180 dark:text-[#93c5fd]" aria-hidden="true" />
      </div>
    </Link>
  )
}

/** المصطلح المميز: يعرض الشجرة القانونية كاملة. */
function FeaturedTerm({ term }: { term: TreeTerm }) {
  const tone = categoryTone(term.category)
  return (
    <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 md:p-7 dark:border-[#334155] dark:bg-[#1e293b]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <span className={`inline-block rounded-full px-3 py-1 text-[12px] font-bold ${PILL[tone]}`}>{term.category}</span>
          <h3 className="mt-3 text-[28px] font-black leading-tight text-[#0f172a] dark:text-white">{term.term_ar}</h3>
          {term.term_fr && <p className="mt-1 text-[16px] font-medium text-[#475569] dark:text-[#cbd5e1]">{term.term_fr}</p>}
          <p className="mt-3 max-w-2xl text-[14px] leading-7 text-[#475569] dark:text-[#cbd5e1]">{term.definition}</p>
          <div className="mt-4">
            <TreeChips term={term} />
          </div>
        </div>
        <Link
          to={`/lexicon/${generateSlug(term.term_ar)}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#2563eb] px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#1d4ed8]"
        >
          التفاصيل <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
        </Link>
      </div>

      <Suspense fallback={<div className="grid h-20 place-items-center text-[12px] text-[#475569] dark:text-[#cbd5e1]">جارٍ تحميل الشجرة...</div>}>
        <LegalTermTree termAr={term.term_ar} termFr={term.term_fr} legalSources={term.legal_sources as LegalSource[]} />
      </Suspense>
    </div>
  )
}

/**
 * قسم القاموس في الصفحة الرئيسية.
 * `terms` مصطلحات لها شجرة فقط (انظر pickTreeTerms): أول واحد مميّز، والستة
 * التالية في الشبكة. `total` عدد مصطلحات القاموس كاملاً للزرّ السفلي.
 */
export function HomeLexiconShowcase({ terms, total }: { terms: TreeTerm[]; total: number }) {
  if (terms.length === 0) return null
  const [featured, ...rest] = terms
  const cards = rest.slice(0, 6)

  return (
    <section className="mt-12" aria-labelledby="home-lexicon-title">
      <header className="mb-6">
        <h2 id="home-lexicon-title" className="flex items-center gap-2 text-[22px] font-black text-[#0f172a] dark:text-white">
          <span className="grid size-8 place-items-center rounded-full bg-[#2563eb]/10 text-[#2563eb]" aria-hidden="true">
            <Languages className="size-4" />
          </span>
          كيف يساعدك القاموس القانوني؟
        </h2>
        <p className="mt-2 max-w-2xl text-[14px] leading-7 text-[#475569] dark:text-[#cbd5e1]">
          يعرض القاموس كل مصطلح بالعربية والفرنسية، ويربطه بالنصوص والفصول التي يستند إليها.
        </p>
      </header>

      <FeaturedTerm term={featured} />

      {cards.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((term) => (
            <LexiconCard key={term.id} term={term} />
          ))}
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <Link
          to="/lexicon"
          className="inline-flex items-center gap-2 rounded-full bg-[#2563eb] px-7 py-3 text-[15px] font-bold text-white transition-colors hover:bg-[#1d4ed8]"
        >
          تصفح القاموس كاملاً — {arabicCount(total, TERM_FORMS)}
          <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
