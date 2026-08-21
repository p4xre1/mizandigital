import { useParams, Link } from "react-router-dom"
import { useState } from "react"
import { SEOHead } from "../../components/seo/SEOHead"
import { NotFound } from "./NotFound"
import lexiconData from "../../data/lexicon.json"
import { lexiconSlugById } from "../../lib/utils/generateSlug"
import { BookOpen, ArrowRight, Share2, Scale, Gavel } from "lucide-react"
import type { LegalSource } from "../../types/cms"
import { LegalTermTree, legalSourceAnchorId } from "../../components/lexicon/LegalTermTree"

interface TermPageProps {
  slug?: string
  id?: string
}

export function TermPage({ slug: propSlug, id: propId }: TermPageProps) {
  const params = useParams<{ slug?: string; id?: string }>()
  const targetQuery = propSlug || propId || params.slug || params.id
  const [highlighted, setHighlighted] = useState<string | null>(null)

  const slugById = lexiconSlugById(lexiconData)
  const term = lexiconData.find(
    (item) =>
      item.id === targetQuery ||
      slugById.get(item.id) === targetQuery
  ) as (typeof lexiconData[number] & { legal_sources?: LegalSource[] }) | undefined

  if (!term) {
    return <NotFound />
  }

  const legalSources = term.legal_sources ?? []

  const handleSelectArticle = (codeIndex: number, articleIndex: number) => {
    const anchorId = legalSourceAnchorId(codeIndex, articleIndex)
    const el = document.getElementById(anchorId)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      setHighlighted(anchorId)
      window.setTimeout(() => setHighlighted((cur) => (cur === anchorId ? null : cur)), 2200)
    }
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
        keywords={[
          term.term_ar,
          term.term_fr,
          term.category,
          "القاموس القانوني المغربي",
          ...legalSources.map((s) => s.code_ar),
        ]}
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

          {legalSources.length > 0 && (
            <section className="mt-8 pt-6 border-t border-border">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground mb-1">
                <Scale size={18} className="text-primary" />
                الشجرة القانونية للمصطلح
              </h2>
              <p className="text-xs text-muted-foreground mb-4">
                كل القوانين والمدونات المغربية التي يرد فيها هذا المصطلح، مع رقم الفصل/المادة
                والمقتضى القانوني المرتبط به.
              </p>

              <div className="mb-6">
                <LegalTermTree
                  termAr={term.term_ar}
                  termFr={term.term_fr}
                  legalSources={legalSources}
                  onSelectArticle={handleSelectArticle}
                />
              </div>

              <div className="space-y-4">
                {legalSources.map((source, sIdx) => (
                  <div
                    key={`${source.code_short ?? source.code_ar}-${sIdx}`}
                    className="rounded-xl border border-border bg-muted/20 p-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                      <h3 className="font-bold text-foreground text-sm md:text-base">
                        {source.code_ar}
                        {source.code_short && (
                          <span className="ms-2 text-xs font-semibold text-primary">
                            ({source.code_short})
                          </span>
                        )}
                      </h3>
                      {source.code_fr && (
                        <span className="text-xs text-muted-foreground font-mono" dir="ltr">
                          {source.code_fr}
                        </span>
                      )}
                    </div>

                    <ul className="space-y-3">
                      {source.articles.map((article, aIdx) => {
                        const anchorId = legalSourceAnchorId(sIdx, aIdx)
                        const isHighlighted = highlighted === anchorId
                        return (
                          <li
                            key={anchorId}
                            id={anchorId}
                            className={`flex gap-3 rounded-lg border p-3 transition-colors duration-500 scroll-mt-24 ${
                              isHighlighted
                                ? "bg-primary/10 border-primary"
                                : "bg-background/60 border-border/60"
                            }`}
                          >
                            <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary border border-primary/20 h-fit">
                              <Gavel size={12} />
                              {/^\d+$/.test(article.number) ? `الفصل ${article.number}` : article.number}
                            </span>
                            <p className="text-xs md:text-sm leading-relaxed text-muted-foreground">
                              {article.phrase}
                            </p>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-[11px] text-muted-foreground/80">
                ملاحظة: هذه الإحالات معدّة لأغراض تعليمية ولا تغني عن الرجوع إلى النص الرسمي
                للقانون أو استشارة مختص.
              </p>
            </section>
          )}

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