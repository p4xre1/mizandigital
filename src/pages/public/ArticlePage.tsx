import { useState, useEffect, useRef, useMemo } from "react"
import { useParams, Link, useLocation } from "react-router-dom"
import { AEOHead } from "../../components/seo/AEOHead"
import { generateBreadcrumbSchema, SITE_CONFIG } from "../../lib/seo/schema"
import { buildMetaDescription } from "../../lib/seo/description"
import { supabase } from "../../lib/supabase/client"
import { rankRelatedItems } from "../../lib/utils/recommend"
import { parseArticleMarkdown } from "../../lib/content/parseArticleMarkdown"
import { ArticleContent } from "../../components/articles/ArticleContent"
import lexiconData from "../../data/lexicon.json"
import { lexiconSlugById } from "../../lib/utils/generateSlug"
import { PartnerSuggestionBox } from "../../components/articles/PartnerSuggestionBox"
import { ViewCounter } from "../../components/articles/ViewCounter"
import { CommentSection } from "../../components/articles/CommentSection"
import { ContentTags } from "../../components/content/ContentTags"
import { ReactionBar } from "@/components/reactions/ReactionBar"
import { ReportDialog } from "@/components/governance/ReportDialog"
import { useTrackView } from "@/hooks/useTrackView"
import { Calendar, ArrowRight, Loader2, ArrowUpLeft } from "lucide-react"

interface ArticleDetail {
  id: string
  title: string
  slug: string
  content: string
  summary?: string
  category?: string
  date?: string
  readingTime?: string
  highlights?: string[]
  targetKeyword?: string
  keywords?: string[]
  sourceTable?: "articles" | "news"
  image?: string | null
  imageAlt?: string | null
}

interface RelatedArticle {
  id: string
  title: string
  slug: string
  summary?: string
  category?: string
  date?: string
}

interface ArticlePageProps { slug?: string }

export function ArticlePage({ slug: propSlug }: ArticlePageProps) {
  const params = useParams<{ slug: string }>()
  const rawSlug = propSlug || params.slug
  const slug = rawSlug ? decodeURIComponent(rawSlug) : ""
  const location = useLocation()
  const isNewsRoute = location.pathname.startsWith("/news")

  const [article, setArticle] = useState<ArticleDetail | null>(null)
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [activeSection, setActiveSection] = useState<string>("top")
  const [readingProgress, setReadingProgress] = useState<number>(0)

  const lexiconTerms = useMemo(() => {
    const slugById = lexiconSlugById(lexiconData as { id: string; term_ar: string; term_fr?: string }[])
    return (lexiconData as { id: string; term_ar: string }[])
      .filter((t) => t.term_ar && t.term_ar.length >= 4)
      .map((t) => ({ id: t.id, term_ar: t.term_ar, slug: slugById.get(t.id) || t.id }))
  }, [])

  useTrackView(article?.sourceTable === "news" ? "news" : "article", article?.slug)

  const articleBodyRef = useRef<HTMLDivElement | null>(null)
  const parsed = useMemo(() => parseArticleMarkdown(article?.content ?? ""), [article?.content])

  useEffect(() => { if (slug) fetchArticleDetail(slug, isNewsRoute) }, [slug, isNewsRoute])

  useEffect(() => {
    if (!parsed.toc.length) return
    const ids = ["top", ...parsed.toc.map((s) => s.id)]
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveSection(visible[0].target.id)
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: [0, 1] }
    )
    ids.forEach((id) => { const el = document.getElementById(id); if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [parsed])

  useEffect(() => {
    const handleScroll = () => {
      const el = articleBodyRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const total = rect.height - window.innerHeight
      const scrolled = -rect.top
      const pct = total > 0 ? Math.min(100, Math.max(0, (scrolled / total) * 100)) : 0
      setReadingProgress(pct)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [article])

  const fetchArticleDetail = async (targetSlug: string, preferNews: boolean) => {
    setLoading(true)
    try {
      let currentArticleData: ArticleDetail | null = null
      const tryArticlesTable = async (): Promise<ArticleDetail | null> => {
        const { data, error } = await supabase.from("articles").select(`id,title,slug,content,excerpt,target_keyword,published_at,created_at,category_id,cover_image,cover_image_alt,category:categories(name)`).eq("slug", targetSlug).maybeSingle()
        if (!data || error) return null
        const catName = Array.isArray(data.category) ? (data.category[0] as any)?.name : (data.category as any)?.name
        return { id: data.id, title: data.title, slug: data.slug, content: data.content || "", summary: data.excerpt || undefined, category: catName || "عام", date: data.published_at || data.created_at || undefined, readingTime: "5 دقائق", targetKeyword: data.target_keyword || undefined, keywords: data.target_keyword ? [data.target_keyword] : undefined, sourceTable: "articles", image: (data as any).cover_image || null, imageAlt: (data as any).cover_image_alt || null }
      }
      const tryArticlesLocal = async (): Promise<ArticleDetail | null> => {
        const { default: articlesData } = await import("../../data/articles.json")
        const localMatch = (articlesData as any[]).find((item) => item.slug === targetSlug)
        if (!localMatch) return null
        const bodyContent = Array.isArray(localMatch.body) ? localMatch.body.join("\n\n") : localMatch.content || ""
        return { id: localMatch.id, title: localMatch.title, slug: localMatch.slug, content: bodyContent, summary: localMatch.excerpt || undefined, category: localMatch.category || undefined, date: localMatch.publishedAt || undefined, readingTime: localMatch.readingTime || undefined, highlights: localMatch.highlights, targetKeyword: localMatch.targetKeyword || localMatch.keyword, keywords: localMatch.keywords || (localMatch.targetKeyword ? [localMatch.targetKeyword] : []), sourceTable: "articles", image: localMatch.image || localMatch.coverImage || null, imageAlt: localMatch.imageAlt || localMatch.coverImageAlt || null }
      }
      const tryNewsTable = async (): Promise<ArticleDetail | null> => {
        const { data: newsRow, error: newsError } = await (supabase as any).from("news").select("id, title, slug, content, summary, source, image_url, image_alt, published_at, created_at, target_keyword").eq("slug", targetSlug).maybeSingle()
        if (!newsRow || newsError) return null
        return { id: newsRow.id, title: newsRow.title, slug: newsRow.slug, content: newsRow.content || "", summary: newsRow.summary || undefined, category: "أخبار", targetKeyword: newsRow.target_keyword || undefined, date: newsRow.published_at || newsRow.created_at || undefined, readingTime: "3 دقائق", sourceTable: "news", image: newsRow.image_url || null, imageAlt: newsRow.image_alt || null }
      }
      const tryNewsLocal = async (): Promise<ArticleDetail | null> => {
        const { default: localNewsData } = await import("../../data/news.json")
        const localNewsMatch = (localNewsData as any[]).find((item) => item.type === "news" && item.id === targetSlug)
        if (!localNewsMatch) return null
        return { id: localNewsMatch.id, title: localNewsMatch.title, slug: localNewsMatch.id, content: localNewsMatch.content || "", summary: localNewsMatch.summary || undefined, category: localNewsMatch.category || "أخبار", date: localNewsMatch.date || undefined, readingTime: "3 دقائق", sourceTable: "news", image: localNewsMatch.image || localNewsMatch.imageUrl || null }
      }
      const attemptsInOrder = preferNews ? [tryNewsTable, tryNewsLocal, tryArticlesTable, tryArticlesLocal] : [tryArticlesTable, tryArticlesLocal, tryNewsTable, tryNewsLocal]
      for (const attempt of attemptsInOrder) { currentArticleData = await attempt(); if (currentArticleData) break }
      setArticle(currentArticleData)
      if (currentArticleData) await fetchRelated(currentArticleData)
    } catch (err) { console.error(err); setArticle(null) } finally { setLoading(false) }
  }

  const fetchRelated = async (current: ArticleDetail) => {
    try {
      let supabaseList: RelatedArticle[] = []
      const { data } = await supabase.from("articles").select("id, title, slug, excerpt, published_at, created_at, category:categories(name)").eq("status", "published").neq("slug", current.slug).order("published_at", { ascending: false }).limit(30)
      if (data) supabaseList = data.map((item: any) => ({ id: item.id, title: item.title, slug: item.slug, summary: item.excerpt || undefined, category: Array.isArray(item.category) ? item.category[0]?.name : item.category?.name, date: item.published_at || item.created_at }))
      const { default: articlesDataForRelated } = await import("../../data/articles.json")
      const localList: RelatedArticle[] = (articlesDataForRelated as any[]).filter((item) => item.slug !== current.slug).map((item) => ({ id: item.id, title: item.title, slug: item.slug, summary: item.excerpt || item.summary, category: item.category, date: item.publishedAt || item.date }))
      const combined = Array.from(new Map([...localList, ...supabaseList].map((item) => [item.slug, item])).values())
      const ranked = rankRelatedItems({ id: current.id, slug: current.slug, title: current.title, text: current.summary, category: current.category }, combined.map((item) => ({ ...item, text: item.summary })), 3)
      setRelatedArticles(ranked)
    } catch {}
  }

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="size-6 animate-spin" /></div>
  if (!article) return <main className="container mx-auto max-w-4xl px-6 py-16 text-center" dir="rtl"><h1 className="text-xl font-bold">المقال غير موجود</h1><Link to="/articles" className="mt-6 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-xs font-medium hover:border-foreground/20"><ArrowRight size={14} />العودة</Link></main>

  const formattedDate = article.date ? new Date(article.date).toLocaleDateString("ar-MA", { year: "numeric", month: "long", day: "numeric" }) : null

  return (
    <>
      <AEOHead title={article.title} description={buildMetaDescription(article.summary, [article.category ? `مقال ضمن قسم ${article.category}` : null, "منصة الميزان الرقمية."])} ogType="article" publishedTime={article.date} ogImage={article.image || undefined} canonicalUrl={`${SITE_CONFIG.url}${article.sourceTable === "news" ? "/news" : "/articles"}/${article.slug}`} schema={[generateBreadcrumbSchema(article.sourceTable === "news" ? [{ name: "الرئيسية", url: "/" }, { name: "الأخبار", url: "/news" }, { name: article.title, url: `/news/${article.slug}` }] : [{ name: "الرئيسية", url: "/" }, { name: "المقالات", url: "/articles" }, { name: article.title, url: `/articles/${article.slug}` }])]} />
      
      {/* Minimal progress - thin black line */}
      <div className="fixed inset-x-0 top-0 z-50 h-[2px] bg-transparent">
        <div className="h-full bg-foreground transition-[width] duration-150 ease-out" style={{ width: `${readingProgress}%` }} />
      </div>

      <div id="top" />
      <main className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8" dir="rtl">
        {/* Breadcrumb minimal */}
        <div className="mb-8 flex items-center gap-2 text-[11px] tracking-wide text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">الرئيسية</Link>
          <span className="size-[2px] rounded-full bg-border" />
          <Link to={article.sourceTable === "news" ? "/news" : "/articles"} className="hover:text-foreground transition-colors">{article.sourceTable === "news" ? "الأخبار" : "المقالات"}</Link>
          <span className="size-[2px] rounded-full bg-border" />
          <span className="text-foreground truncate max-w-[200px]">{article.title.slice(0, 30)}...</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* TOC - minimal */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-24 space-y-6">
              {parsed.toc.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-px w-4 bg-foreground" />
                    <span className="text-[11px] font-bold tracking-wide">المحتويات</span>
                  </div>
                  <nav className="space-y-1">
                    <a href="#top" className={`block py-1.5 text-[12px] transition-colors ${activeSection === "top" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                      بداية المقال
                    </a>
                    {parsed.toc.map((section, idx) => (
                      <a key={idx} href={`#${section.id}`} className={`block py-1.5 text-[12px] transition-colors ${section.level === 3 ? "mr-3" : ""} ${activeSection === section.id ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                        {section.title}
                      </a>
                    ))}
                  </nav>
                </div>
              )}

              <div className="border-t border-border pt-6 space-y-3">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">التقدم</span>
                  <span className="font-medium">{Math.round(readingProgress)}%</span>
                </div>
                <div className="h-[2px] rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-foreground transition-all" style={{ width: `${readingProgress}%` }} />
                </div>
                <div className="text-[11px] text-muted-foreground">
                  وقت القراءة: {article.readingTime || "5 د"}
                </div>
              </div>
            </div>
          </div>

          {/* Article */}
          <article ref={articleBodyRef} className="lg:col-span-6">
            <header className="mb-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {article.category && (
                  <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-medium tracking-wide">
                    {article.category}
                  </span>
                )}
                {formattedDate && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Calendar size={12} />
                    {formattedDate}
                  </span>
                )}
                {article.sourceTable && <ViewCounter table={article.sourceTable} slug={article.slug} />}
              </div>

              <h1 className="text-[28px] font-bold leading-[1.15] tracking-[-0.02em] md:text-[32px]">
                {article.title}
              </h1>

              {article.summary && (
                <p className="border-s-2 border-foreground/10 ps-4 text-[14px] leading-[1.7] text-muted-foreground">
                  {article.summary}
                </p>
              )}
            </header>

            {article.image && (
              <div className="mb-8 overflow-hidden rounded-[12px] border border-border bg-muted">
                <img src={article.image} alt={article.imageAlt || article.title} className="w-full object-cover" />
              </div>
            )}

            {article.highlights && article.highlights.length > 0 && (
              <div className="mb-8 rounded-[12px] border border-border p-5">
                <h3 className="mb-3 text-[12px] font-bold tracking-wide">أبرز النقاط</h3>
                <ul className="space-y-2">
                  {article.highlights.map((h, idx) => (
                    <li key={idx} className="flex gap-2 text-[13px] leading-[1.6] text-muted-foreground">
                      <span className="mt-2 size-1 rounded-full bg-foreground shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="prose prose-neutral dark:prose-invert max-w-none leading-[1.8] text-[15px] prose-headings:font-bold prose-headings:tracking-[-0.01em] prose-h2:text-[18px] prose-h2:mt-8 prose-h2:mb-3 prose-h3:text-[15px] prose-p:my-4 prose-p:text-foreground/90">
              <ArticleContent blocks={parsed.blocks} lexiconTerms={lexiconTerms} />
            </div>

            <ContentTags tags={[article.category, article.targetKeyword, ...(article.keywords || [])]} className="mt-8 border-t border-border pt-6" />
            <PartnerSuggestionBox href="https://www.wadifapublic.ma/ar/tawjih" title="عروض التسجيل والتوجيه الجامعي" description="تصفّح مباريات ولوج المدارس والجامعات، عتبات الانتقاء ومواعيد التسجيل." ctaLabel="شاهد عروض التسجيل" />

            <div className="mt-8 rounded-[12px] border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[13px] font-bold">هل كان مفيداً؟</h3>
                <ReportDialog targetType={article.sourceTable === "news" ? "news" : "article"} targetId={article.slug} />
              </div>
              <ReactionBar targetType={article.sourceTable === "news" ? "news" : "article"} targetId={article.slug} />
            </div>

            {article.sourceTable && (
              <div className="mt-6">
                <CommentSection table={article.sourceTable} slug={article.slug} />
              </div>
            )}
          </article>

          {/* Right - empty or share */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-24">
              <div className="text-[11px] text-muted-foreground leading-[1.6] border border-border rounded-[12px] p-4">
                <div className="h-px w-6 bg-foreground mb-3" />
                مقال من إعداد فريق ميزان الرقمية — منصة مجانية صممت لمساعدة طلبة القانون بالمغرب.
              </div>
            </div>
          </div>
        </div>

        {relatedArticles.length > 0 && (
          <section className="mt-16 border-t border-border pt-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[14px] font-bold tracking-[-0.01em]">مقالات ذات صلة</h3>
              <Link to="/articles" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                عرض الكل <ArrowUpLeft size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedArticles.map((item) => (
                <Link key={item.id} to={`/articles/${item.slug}`} className="group rounded-[12px] border border-border p-4 hover:border-foreground/15 transition-colors">
                  {item.category && <span className="inline-block rounded-full border border-border px-2 py-0.5 text-[10px] mb-2">{item.category}</span>}
                  <h4 className="font-bold text-[13px] leading-snug line-clamp-2 group-hover:text-foreground/80">{item.title}</h4>
                  {item.summary && <p className="mt-2 text-[11px] text-muted-foreground line-clamp-2 leading-[1.5]">{item.summary}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  )
}
