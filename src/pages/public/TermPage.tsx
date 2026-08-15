import { useParams, Link } from "react-router-dom"
import { SEOHead } from "../../components/seo/SEOHead"
import { NotFound } from "./NotFound"
import lexiconData from "../../data/lexicon.json"
import { generateSlug } from "../../lib/utils/generateSlug"
import { BookOpen, ArrowRight, Share2 } from "lucide-react"

interface TermPageProps {
  slug?: string
  id?: string
}

export function TermPage({ slug: propSlug, id: propId }: TermPageProps) {
  const params = useParams<{ slug?: string; id?: string }>()
  const targetQuery = propSlug || propId || params.slug || params.id

  // Match term by ID or slug
  const term = lexiconData.find(
    (item) =>
      item.id === targetQuery ||
      generateSlug(item.term_ar) === targetQuery
  )

  if (!term) {
    return <NotFound />
  }

  // DefinedTerm Schema for Google Rich Search Results
  const termSchema = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "name": term.term_ar,
    "alternateName": term.term_fr,
    "description": term.definition,
    "inDefinedTermSet": "https://www.mizan.page/lexicon",
    "inLanguage": ["ar-MA", "fr"]
  }

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  return (
    <>
      <SEOHead
        title={`تعريف مصطلح: ${term.term_ar} (${term.term_fr})`}
        description={term.definition.slice(0, 160)}
        ogType="article"
        keywords={[term.term_ar, term.term_fr, term.category, "القاموس القانوني المغربي"]}
        schema={termSchema}
      />

      <main className="container mx-auto max-w-4xl px-4 py-12" dir="rtl">
        <div className="mb-6">
          <Link
            to="/lexicon"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition"
          >
            <ArrowRight size={16} />
            العودة إلى المعجم القانوني
          </Link>
        </div>

        <article className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
            <div>
              <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-2">
                <BookOpen size={18} />
                <span>المعجم القانوني المغربي</span>
              </div>
              <h1 className="text-3xl font-black text-foreground md:text-4xl">
                {term.term_ar}
              </h1>
              {term.term_fr && (
                <p className="mt-1 text-lg font-semibold text-muted-foreground" dir="ltr">
                  {term.term_fr}
                </p>
              )}
            </div>

            <span className="rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary border border-primary/20">
              {term.category}
            </span>
          </header>

          <section className="prose dark:prose-invert mt-6 max-w-none">
            <h2 className="text-lg font-bold text-foreground mb-3">الشرح والتفصيل القانوني:</h2>
            <p className="text-base leading-relaxed text-muted-foreground whitespace-pre-line">
              {term.definition}
            </p>
          </section>

          <footer className="mt-8 pt-6 border-t border-border flex justify-between items-center flex-wrap gap-4">
            <button
              onClick={handleCopyLink}
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition"
            >
              <Share2 size={14} />
              مشاركة رابط المصطلح
            </button>
          </footer>
        </article>
      </main>
    </>
  )
}