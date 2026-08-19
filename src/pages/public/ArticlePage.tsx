import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { SEOHead } from "../../components/seo/SEOHead"
import { generateBreadcrumbSchema, SITE_CONFIG } from "../../lib/seo/schema"
import { supabase } from "../../lib/supabase/client"
import articlesData from "../../data/articles.json"
import { Calendar, Tag, ArrowRight, ArrowLeft, Loader2, BookOpen, KeyRound } from "lucide-react"

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
  sections?: { title: string; id: string }[]
}

interface RelatedArticle {
  id: string
  title: string
  slug: string
  summary?: string
  category?: string
  date?: string
}

interface ArticlePageProps {
  slug?: string
}

export function ArticlePage({ slug: propSlug }: ArticlePageProps) {
  const params = useParams<{ slug: string }>()
  const rawSlug = propSlug || params.slug
  const slug = rawSlug ? decodeURIComponent(rawSlug) : ""

  const [article, setArticle] = useState<ArticleDetail | null>(null)
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // حالات الإخفاء والإظهار للأشرطة الجانبية
  const [hideContents, setHideContents] = useState<boolean>(false)
  const [hideAppearance, setHideAppearance] = useState<boolean>(false)

  // خيارات المظهر
  const [textSize, setTextSize] = useState<"Small" | "Standard" | "Large">("Standard")
  const [pageWidth, setPageWidth] = useState<"Standard" | "Wide">("Standard")
  const [colorMode, setColorMode] = useState<"Light" | "Dark" | "Automatic">("Light")

  // تفعيل تغيير الألوان (Light / Dark) على مستوى النظام أو الصفحة
  useEffect(() => {
    const root = document.documentElement;
    if (colorMode === "Dark") {
      root.classList.add("dark");
    } else if (colorMode === "Light") {
      root.classList.remove("dark");
    } else {
      // Automatic - الاعتماد على تفضيلات النظام
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (systemPrefersDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }, [colorMode]);

  useEffect(() => {
    if (slug) {
      fetchArticleDetail(slug)
    }
  }, [slug])

  const fetchArticleDetail = async (targetSlug: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("articles")
        .select(`
          id,
          title,
          slug,
          content,
          excerpt,
          target_keyword,
          published_at,
          created_at,
          category_id,
          category:categories(name)
        `)
        .eq("slug", targetSlug)
        .maybeSingle()

      let currentArticleData: ArticleDetail | null = null;

      if (data && !error) {
        const catName = Array.isArray(data.category) 
          ? (data.category[0] as any)?.name 
          : (data.category as any)?.name

        const paragraphs = (data.content || "").split(/\r?\n\r?/).filter((p: string) => p.trim());
        const generatedSections = paragraphs.slice(0, 6).map((p: string, idx: number) => ({
          title: p.length > 32 ? p.substring(0, 29) + "..." : p,
          id: `section-${idx + 1}`
        }));

        currentArticleData = {
          id: data.id,
          title: data.title,
          slug: data.slug,
          content: data.content || "",
          summary: data.excerpt || undefined,
          category: catName || "عام",
          date: data.published_at || data.created_at || undefined,
          readingTime: "5 دقائق",
          targetKeyword: data.target_keyword || undefined,
          keywords: data.target_keyword ? [data.target_keyword] : undefined,
          sections: generatedSections
        }
      } else {
        const localMatch = (articlesData as any[]).find((item) => item.slug === targetSlug)
        if (localMatch) {
          const bodyContent = Array.isArray(localMatch.body) 
            ? localMatch.body.join("\n\n") 
            : localMatch.content || ""

          const localParagraphs = bodyContent.split(/\r?\n\r?/).filter((p: string) => p.trim());
          const generatedSections = localParagraphs.slice(0, 6).map((p: string, idx: number) => ({
            title: p.length > 32 ? p.substring(0, 29) + "..." : p,
            id: `section-${idx + 1}`
          }));

          currentArticleData = {
            id: localMatch.id,
            title: localMatch.title,
            slug: localMatch.slug,
            content: bodyContent,
            summary: localMatch.excerpt || undefined,
            category: localMatch.category || undefined,
            date: localMatch.publishedAt || undefined,
            readingTime: localMatch.readingTime || undefined,
            highlights: localMatch.highlights,
            targetKeyword: localMatch.targetKeyword || localMatch.keyword,
            keywords: localMatch.keywords || (localMatch.targetKeyword ? [localMatch.targetKeyword] : []),
            sections: localMatch.sections || generatedSections
          }
        }
      }

      setArticle(currentArticleData)

      if (currentArticleData) {
        await fetchRelated(targetSlug, currentArticleData.category);
      }
    } catch (err) {
      console.error("خطأ في جلب تفاصيل المقال:", err)
      setArticle(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchRelated = async (currentSlug: string, currentCategory?: string) => {
    try {
      let supabaseList: RelatedArticle[] = [];
      const { data } = await supabase
        .from("articles")
        .select("id, title, slug, excerpt, published_at, created_at, category:categories(name)")
        .neq("slug", currentSlug)
        .limit(3);

      if (data) {
        supabaseList = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          slug: item.slug,
          summary: item.excerpt || undefined,
          category: Array.isArray(item.category) ? item.category[0]?.name : item.category?.name,
          date: item.published_at || item.created_at,
        }));
      }

      const localList: RelatedArticle[] = (articlesData as any[])
        .filter((item) => item.slug !== currentSlug)
        .map((item) => ({
          id: item.id,
          title: item.title,
          slug: item.slug,
          summary: item.excerpt || item.summary,
          category: item.category,
          date: item.publishedAt || item.date,
        }));

      const combined = Array.from(
        new Map([...localList, ...supabaseList].map((item) => [item.slug, item])).values()
      );

      const filtered = currentCategory 
        ? combined.sort((a, b) => (a.category === currentCategory ? -1 : 1))
        : combined;

      setRelatedArticles(filtered.slice(0, 3));
    } catch (e) {
      console.error("خطأ في جلب المقالات المقترحة:", e);
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!article) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-16 text-center" dir="rtl">
        <h1 className="text-2xl font-bold text-foreground">المقال غير موجود</h1>
        <p className="mt-2 text-muted-foreground text-sm">عذراً، لم نتمكن من العثور على المقال الذي تبحث عنه.</p>
        <Link to="/articles" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground">
          <ArrowRight size={16} />
          العودة إلى قائمة المقالات
        </Link>
      </main>
    )
  }

  const formattedDate = article.date
    ? new Date(article.date).toLocaleDateString("ar-MA", { year: "numeric", month: "long", day: "numeric" })
    : null

  const textSizeClass = textSize === "Small" ? "text-xs md:text-sm" : textSize === "Large" ? "text-base md:text-lg" : "text-sm md:text-base";
  const maxWidthClass = pageWidth === "Wide" ? "max-w-[98%] xl:max-w-[95%]" : "max-w-7xl";

  return (
    <>
      <SEOHead
        title={`${article.title} | الميزان الرقمية`}
        description={article.summary || article.title}
        canonicalUrl={`${SITE_CONFIG.url}/articles/${article.slug}`}
        schema={[generateBreadcrumbSchema([{ name: "الرئيسية", url: "/" }, { name: "المقالات", url: "/articles" }, { name: article.title, url: `/articles/${article.slug}` }])]}
      />

      <div id="top" />
      <main className={`mx-auto ${maxWidthClass} px-2 md:px-6 py-6 md:py-10 transition-all duration-300`} dir="rtl">
        <div className="mb-4 px-2">
          <Link to="/articles" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition">
            <ArrowRight size={14} />
            <span>العودة إلى المقالات</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6 items-start">
          
          {/* 1. Contents Sidebar */}
          <div className="xl:col-span-3 order-2 xl:order-1">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3 xl:sticky xl:top-6">
              <div className="flex items-center justify-between pb-2 border-b border-border font-bold text-xs text-foreground">
                <span>Contents</span>
                <button
                  onClick={() => setHideContents(!hideContents)}
                  className="text-[11px] text-muted-foreground hover:text-primary transition underline cursor-pointer font-normal"
                >
                  {hideContents ? "show" : "hide"}
                </button>
              </div>

              {!hideContents && (
                <nav className="space-y-1.5 text-xs max-h-[70vh] overflow-y-auto pr-1">
                  <a href="#top" className="block py-1 px-1.5 rounded text-foreground font-semibold hover:bg-primary/5">(Top)</a>
                  {article.sections?.map((section, idx) => (
                    <a
                      key={idx}
                      href={`#${section.id}`}
                      className="block py-1 px-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/5 transition truncate"
                    >
                      {section.title}
                    </a>
                  ))}
                </nav>
              )}
            </div>
          </div>

          {/* 2. Main Article Content */}
          <article className="xl:col-span-6 order-1 xl:order-2 rounded-2xl border border-border bg-card p-5 md:p-10 shadow-sm">
            <header className="space-y-4 mb-8 pb-6 border-b border-border">
              <div className="flex items-center gap-3 text-xs flex-wrap">
                {article.category && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-3 py-1 font-semibold text-primary border border-primary/20">
                    <Tag size={12} />
                    {article.category}
                  </span>
                )}
                {formattedDate && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Calendar size={12} />
                    {formattedDate}
                  </span>
                )}
                {article.readingTime && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <BookOpen size={12} />
                    {article.readingTime}
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-4xl font-black text-foreground tracking-tight leading-tight">
                {article.title}
              </h1>

              {article.keywords && article.keywords.length > 0 && (
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <span className="text-xs font-bold text-muted-foreground inline-flex items-center gap-1">
                    <KeyRound size={12} className="text-primary" />
                    الكلمات المفتاحية:
                  </span>
                  {article.keywords.map((kw, idx) => (
                    <span
                      key={idx}
                      className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground border border-border"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              )}
            </header>

            {article.highlights && article.highlights.length > 0 && (
              <div className="mb-8 rounded-xl bg-primary/5 p-4 md:p-5 border border-primary/20">
                <h3 className="text-xs md:text-sm font-bold text-primary mb-3">أبرز النقاط والمنهجية:</h3>
                <ul className="space-y-2">
                  {article.highlights.map((h, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs md:text-sm text-foreground/90">
                      <span className="text-primary font-bold">•</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className={`prose prose-neutral dark:prose-invert max-w-none leading-relaxed space-y-6 text-foreground/90 ${textSizeClass}`}>
              {article.content.split(/\r?\n\r?/).map((paragraph, index) => {
                const trimmed = paragraph.trim();
                if (!trimmed) return null;
                const sectionId = `section-${index + 1}`;
                return (
                  <p key={index} id={sectionId} className="scroll-mt-24">
                    {trimmed}
                  </p>
                );
              })}
            </div>
          </article>

          {/* 3. Appearance Sidebar */}
          <div className="xl:col-span-3 order-3">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4 xl:sticky xl:top-6">
              <div className="flex items-center justify-between pb-2 border-b border-border font-bold text-xs text-foreground">
                <span>Appearance</span>
                <button
                  onClick={() => setHideAppearance(!hideAppearance)}
                  className="text-[11px] text-muted-foreground hover:text-primary transition underline cursor-pointer font-normal"
                >
                  {hideAppearance ? "show" : "hide"}
                </button>
              </div>

              {!hideAppearance && (
                <div className="space-y-4 text-xs">
                  {/* Text Size */}
                  <div className="space-y-1.5">
                    <span className="font-bold text-muted-foreground block">Text</span>
                    <div className="grid grid-cols-3 gap-1">
                      {(["Large", "Standard", "Small"] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => setTextSize(size)}
                          className={`py-1.5 rounded text-center font-medium border transition cursor-pointer ${
                            textSize === size
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Width */}
                  <div className="space-y-1.5 pt-2 border-t border-border/60">
                    <span className="font-bold text-muted-foreground block">Width</span>
                    <div className="grid grid-cols-2 gap-1">
                      {(["Wide", "Standard"] as const).map((w) => (
                        <button
                          key={w}
                          onClick={() => setPageWidth(w)}
                          className={`py-1.5 rounded text-center font-medium border transition cursor-pointer ${
                            pageWidth === w
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color */}
                  <div className="space-y-1.5 pt-2 border-t border-border/60">
                    <span className="font-bold text-muted-foreground block">Color</span>
                    <div className="grid grid-cols-3 gap-1">
                      {(["Light", "Dark", "Automatic"] as const).map((c) => (
                        <button
                          key={c}
                          onClick={() => setColorMode(c)}
                          className={`py-1.5 rounded text-center font-medium border transition cursor-pointer ${
                            colorMode === c
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* related articles */}
        {relatedArticles.length > 0 && (
          <section className="mt-16 pt-8 border-t border-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-foreground">مقالات ودراسات ذات صلة</h3>
              <Link to="/articles" className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1">
                <span>عرض الكل</span>
                <ArrowLeft size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedArticles.map((item) => (
                <Link
                  key={item.id}
                  to={`/articles/${item.slug}`}
                  className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition hover:border-primary/50 hover:shadow-sm"
                >
                  <div className="space-y-2">
                    {item.category && (
                      <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {item.category}
                      </span>
                    )}
                    <h4 className="text-xs md:text-sm font-bold text-foreground group-hover:text-primary transition line-clamp-2 leading-snug">
                      {item.title}
                    </h4>
                    {item.summary && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.summary}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-primary font-bold">
                    <span>قراءة المقال</span>
                    <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  )
}