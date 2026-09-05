import { useParams, Link } from "react-router-dom"
import { useState, useEffect } from "react"
import { SEOHead } from "../../components/seo/SEOHead"
import { generateBreadcrumbSchema } from "../../lib/seo/schema"
import { NotFound } from "./NotFound"
import lexiconData from "../../data/lexicon.json"
import { lexiconSlugById, generateSlug } from "../../lib/utils/generateSlug"
import { BookOpen, ArrowRight, ArrowLeft, Share2, Scale, Gavel, Loader2, Tags } from "lucide-react"
import type { LegalSource } from "../../types/cms"
import { LegalTermTree, legalSourceAnchorId } from "../../components/lexicon/LegalTermTree"
import { supabase } from "../../lib/supabase/client"
import { rankRelatedItems } from "../../lib/utils/recommend"
import { buildMetaDescription } from "../../lib/seo/description"
import { useTrackView } from "@/hooks/useTrackView"

interface TermPageProps {
  slug?: string
  id?: string
}

// يطابق مصطلحاً محلياً فوراً (بدون انتظار الشبكة) بأكثر من صيغة للرابط —
// نفس منطق المطابقة المستخدم لاحقاً مع بيانات Supabase، لكن متاح فور التحميل
// الأول حتى لا تُعرض الصفحة فارغة أو "غير موجودة" قبل اكتمال أي طلب شبكي.
function findLocalTermSync(targetQuery: string) {
  if (!targetQuery) return null
  const slugByIdLocal = lexiconSlugById(lexiconData as any)
  const matchTerm = (item: any) => {
    const itemSlug = slugByIdLocal.get(item.id) || generateSlug(item.term_ar)
    const baseSlug = generateSlug(item.term_ar)
    return (
      item.id === targetQuery ||
      itemSlug === targetQuery ||
      baseSlug === targetQuery ||
      (item.id && targetQuery.endsWith(item.id)) ||
      targetQuery.startsWith(baseSlug)
    )
  }
  return lexiconData.find(matchTerm) ?? null
}

export function TermPage({ slug: propSlug, id: propId }: TermPageProps) {
  const params = useParams<{ slug?: string; id?: string }>()
  const rawQuery = propSlug || propId || params.slug || params.id
  const targetQuery = rawQuery ? decodeURIComponent(rawQuery) : ""

  // نبدأ بالمطابقة المحلية الفورية بدلاً من null — يطابق هذا المحتوى الثابت
  // المُولَّد مسبقاً في scripts/prerender.mjs، ويمنع وميض "جاري التحميل" أو
  // "غير موجود" لدى الزائر الحقيقي قبل أن يتدخل جافاسكريبت أصلاً.
  const [term, setTerm] = useState<any | null>(() => findLocalTermSync(targetQuery))
  const [loading, setLoading] = useState(() => findLocalTermSync(targetQuery) === null)
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const [relatedTerms, setRelatedTerms] = useState<any[]>([])

  // تتبّع قراءة حقيقية لهذا المصطلح (مرة واحدة لكل جلسة متصفح)
  useTrackView("term", term ? targetQuery : null)

  useEffect(() => {
    async function fetchTerm() {
      if (!targetQuery) {
        setLoading(false)
        return
      }

      // دالة مساعدة لمطابقة المصطلح بأكثر من صيغة للروابط
      const matchTerm = (item: any, slugMap: Map<string, string>) => {
        const itemSlug = slugMap.get(item.id) || generateSlug(item.term_ar)
        const baseSlug = generateSlug(item.term_ar)

        return (
          item.id === targetQuery ||
          itemSlug === targetQuery ||
          baseSlug === targetQuery ||
          (item.id && targetQuery.endsWith(item.id)) ||
          targetQuery.startsWith(baseSlug)
        )
      }

      try {
        // 1. مسار سريع: إن كان الرابط مطابقاً لـ UUID (id حقيقي)، جلب صف
        //    واحد فقط بدل تحميل الجدول كاملاً
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetQuery)
        if (isUuid) {
          const { data: byId } = await supabase.from("lexicon_terms").select("*").eq("id", targetQuery).maybeSingle()
          if (byId) {
            setTerm(byId)
            const slugById = lexiconSlugById([...(lexiconData as any[]), byId] as any)
            computeRelatedTerms([...(lexiconData as any[])], byId, slugById)
            setLoading(false)
            return
          }
        }

        // 2. مسار سريع: إن كان عمود slug موجوداً فـ قاعدة البيانات (بعد
        //    تطبيق migration اختيارية — راجع
        //    supabase/migrations/20260904130000_add_lexicon_terms_slug.sql)،
        //    جلب صف واحد مباشرة به. إن لم يكن العمود موجوداً بعد، Supabase
        //    يُرجع خطأ فنتجاهله ونكمل بالمسار الحالي (الجدول كاملاً) بلا أي
        //    عطل — توافقية كاملة قبل/بعد تطبيق الـ migration.
        try {
          const { data: bySlug, error: slugError } = await (supabase as any)
            .from("lexicon_terms")
            .select("*")
            .eq("slug", targetQuery)
            .maybeSingle()
          if (!slugError && bySlug) {
            setTerm(bySlug)
            const slugById = lexiconSlugById([...(lexiconData as any[]), bySlug] as any)
            computeRelatedTerms([...(lexiconData as any[])], bySlug, slugById)
            setLoading(false)
            return
          }
        } catch {
          // عمود slug غير موجود بعد — تجاهل والمتابعة بالمسار العادي
        }

        // 3. محاولة الجلب من Supabase (الجدول كاملاً) — المسار الحالي، يبقى
        //    كاحتياط إلى حين تطبيق migration الـ slug أعلاه
        const { data: remoteTerms, error } = await supabase
          .from("lexicon_terms")
          .select("*")

        if (!error && remoteTerms && remoteTerms.length > 0) {
          const remoteNames = new Set(remoteTerms.map((t: any) => t.term_ar))
          const filteredLocal = lexiconData.filter((t: any) => !remoteNames.has(t.term_ar))
          const combined = [...remoteTerms, ...filteredLocal]

          const slugById = lexiconSlugById(combined as any)
          const found = combined.find((item: any) => matchTerm(item, slugById))

          if (found) {
            setTerm(found)
            computeRelatedTerms(combined, found, slugById)
            setLoading(false)
            return
          }
        }
      } catch (err) {
        console.error("Error fetching term from Supabase:", err)
      }

      // 2. Fallback: البحث في الملف المحلي إذا لم يُوجد سحابياً
      const slugByIdLocal = lexiconSlugById(lexiconData as any)
      const localFound = lexiconData.find((item: any) => matchTerm(item, slugByIdLocal))

      if (localFound) {
        setTerm(localFound)
        computeRelatedTerms(lexiconData as any[], localFound, slugByIdLocal)
      }

      setLoading(false)
    }

    // خوارزمية اقتراح: ترتيب باقي المصطلحات حسب تطابق التصنيف وتشابه الكلمات
    // المفتاحية مع تعريف المصطلح الحالي (انظر lib/utils/recommend.ts)
    const computeRelatedTerms = (pool: any[], current: any, slugMap: Map<string, string>) => {
      const currentSlug = slugMap.get(current.id) || generateSlug(current.term_ar)
      const candidates = pool.map((item: any) => ({
        id: item.id,
        slug: slugMap.get(item.id) || generateSlug(item.term_ar),
        title: item.term_ar,
        text: item.definition,
        category: item.category,
        term_fr: item.term_fr,
      }))

      const ranked = rankRelatedItems(
        { id: current.id, slug: currentSlug, title: current.term_ar, text: current.definition, category: current.category },
        candidates,
        3
      )
      setRelatedTerms(ranked)
    }

    fetchTerm()
  }, [targetQuery])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" dir="rtl">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="animate-spin text-primary" size={24} />
          <span>جاري تحميل المصطلح القانوني...</span>
        </div>
      </div>
    )
  }

  if (!term) {
    return <NotFound />
  }

  const legalSources: LegalSource[] = term.legal_sources ?? []
  const canonicalUrl = `https://www.mizan.page/lexicon/${targetQuery}`

  const handleSelectArticle = (codeIndex: number, articleIndex: number) => {
    const anchorId = legalSourceAnchorId(codeIndex, articleIndex)
    const el = document.getElementById(anchorId)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      setHighlighted(anchorId)
      window.setTimeout(() => setHighlighted((cur) => (cur === anchorId ? null : cur)), 2200)
    }
  }

  const termSchema = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "name": term.term_ar,
    "alternateName": term.term_fr || undefined,
    "description": term.definition,
    "inDefinedTermSet": "https://www.mizan.page/lexicon",
    "inLanguage": ["ar-MA", "fr"]
  }

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "الرئيسية", url: "/" },
    { name: "المعجم القانوني", url: "/lexicon" },
    { name: term.term_ar, url: `/lexicon/${targetQuery}` },
  ])

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  return (
    <>
      <SEOHead
        title={`تعريف مصطلح: ${term.term_ar} (${term.term_fr || ""})`}
        description={buildMetaDescription(term.definition, [
          term.term_fr ? `Terme juridique: ${term.term_fr}` : null,
          `تعريف مصطلح "${term.term_ar}" ضمن المعجم القانوني المغربي على منصة الميزان الرقمية، مع الشجرة القانونية الرابطة بالقوانين والفصول ذات الصلة.`,
        ])}
        ogType="article"
        canonicalUrl={canonicalUrl}
        keywords={[
          term.term_ar,
          term.term_fr || "",
          term.category || "قانون",
          "القاموس القانوني المغربي",
          ...legalSources.map((s) => s.code_ar),
        ]}
        schema={[termSchema, breadcrumbSchema]}
      />

      <main className="container mx-auto max-w-4xl px-4 py-12" dir="rtl">
        <div className="mb-6">
          <Link
            to="/lexicon"
            title="العودة إلى المعجم القانوني"
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

            {term.category && (
              <span className="rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary border border-primary/20">
                {term.category}
              </span>
            )}
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
                كل القوانين والمدونات المغربية التي يرد فيها هذا المصطلح، مع رقم الفصل/المادة والمقتضى القانوني المرتبط به.
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

        {/* مصطلحات ذات صلة */}
        {relatedTerms.length > 0 && (
          <section className="mt-10 pt-8 border-t border-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <Tags size={18} className="text-primary" />
                مصطلحات ذات صلة
              </h3>
              <Link to="/lexicon" title="عرض القاموس القانوني بالكامل" className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1">
                <span>عرض المعجم كاملاً</span>
                <ArrowLeft size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedTerms.map((item) => (
                <Link
                  key={item.id}
                  to={`/lexicon/${item.slug}`}
                  title={item.title}
                  className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition hover:border-primary/50 hover:shadow-sm"
                >
                  {item.category && (
                    <span className="w-fit rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {item.category}
                    </span>
                  )}
                  <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition line-clamp-1">
                    {item.title}
                  </h4>
                  {item.term_fr && (
                    <p className="text-[11px] text-muted-foreground" dir="ltr">
                      {item.term_fr}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  )
}