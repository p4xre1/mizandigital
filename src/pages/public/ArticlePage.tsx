import { useState, useEffect, useRef, useMemo } from "react"
import { useParams, Link } from "react-router-dom"
import { SEOHead } from "../../components/seo/SEOHead"
import { generateBreadcrumbSchema, SITE_CONFIG } from "../../lib/seo/schema"
import { buildMetaDescription } from "../../lib/seo/description"
import { supabase } from "../../lib/supabase/client"
import articlesData from "../../data/articles.json"
import localNewsData from "../../data/news.json"
import { rankRelatedItems } from "../../lib/utils/recommend"
import { parseArticleMarkdown } from "../../lib/content/parseArticleMarkdown"
import { ArticleContent } from "../../components/articles/ArticleContent"
import { PartnerSuggestionBox } from "../../components/articles/PartnerSuggestionBox"
import { ViewCounter } from "../../components/articles/ViewCounter"
import { CommentSection } from "../../components/articles/CommentSection"
import { InContentAd } from "../../components/ads/InContentAd"
import { useTrackView } from "@/hooks/useTrackView"
import {
  Calendar, Tag, ArrowRight, ArrowLeft, Loader2, BookOpen, KeyRound,
  List, SlidersHorizontal, ChevronDown, Minus, Plus, AlignLeft,
  Columns2, Sun, Moon, MonitorSmartphone, X,
} from "lucide-react"

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
  /** أي جدول ينتمي إليه هذا المحتوى في قاعدة البيانات — يُستخدم لعداد المشاهدات والتعليقات */
  sourceTable?: "articles" | "news"
  image?: string | null
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

  // تتبّع قراءة حقيقية لهذا المقال/الخبر (مرة واحدة لكل جلسة متصفح)
  useTrackView(article?.sourceTable === "news" ? "news" : "article", article?.slug)

  // حالات الإخفاء والإظهار للأشرطة الجانبية
  const [showContents, setShowContents] = useState<boolean>(false)
  const [showAppearance, setShowAppearance] = useState<boolean>(false)
  const [activeSection, setActiveSection] = useState<string>("top")
  const [readingProgress, setReadingProgress] = useState<number>(0)

  // خيارات المظهر
  const [textSize, setTextSize] = useState<"Small" | "Standard" | "Large">("Standard")
  const [pageWidth, setPageWidth] = useState<"Standard" | "Wide">("Standard")
  const [colorMode, setColorMode] = useState<"Light" | "Dark" | "Automatic">("Light")

  const articleBodyRef = useRef<HTMLDivElement | null>(null)

  // تحليل محتوى المقال (Markdown مبسّط) إلى عناصر منظمة + فهرس محتويات حقيقي
  // مبني على العناوين الفعلية داخل النص (##, ###) بدل تخمين أول كل فقرة
  const parsed = useMemo(() => parseArticleMarkdown(article?.content ?? ""), [article?.content])

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

  // تتبع الفقرة الحالية أثناء التمرير لتفعيلها في قائمة المحتويات
  useEffect(() => {
    if (!parsed.toc.length) return

    const ids = ["top", ...parsed.toc.map((s) => s.id)]
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveSection(visible[0].target.id)
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: [0, 1] }
    )

    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [parsed])

  // شريط تقدّم القراءة أعلى الصفحة
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
          cover_image,
          category:categories(name)
        `)
        .eq("slug", targetSlug)
        .maybeSingle()

      let currentArticleData: ArticleDetail | null = null;

      if (data && !error) {
        const catName = Array.isArray(data.category) 
          ? (data.category[0] as any)?.name 
          : (data.category as any)?.name

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
          sourceTable: "articles",
          image: (data as any).cover_image || null,
        }
      } else {
        const localMatch = (articlesData as any[]).find((item) => item.slug === targetSlug)
        if (localMatch) {
          const bodyContent = Array.isArray(localMatch.body) 
            ? localMatch.body.join("\n\n") 
            : localMatch.content || ""

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
            sourceTable: "articles",
            image: localMatch.image || localMatch.coverImage || null,
          }
        }
      }

      // لم يُعثر على المقال في مصدر "articles" — جرّب مصدر "news"
      // (البطاقات في صفحة الأخبار تُشير إلى /news/:slug وتُعالَج بنفس هذا المكوّن)
      if (!currentArticleData) {
        const { data: newsRow, error: newsError } = await (supabase as any)
          .from("news")
          .select("id, title, slug, content, summary, source, image_url, published_at, created_at")
          .eq("slug", targetSlug)
          .maybeSingle()

        if (newsRow && !newsError) {
          currentArticleData = {
            id: newsRow.id,
            title: newsRow.title,
            slug: newsRow.slug,
            content: newsRow.content || "",
            summary: newsRow.summary || undefined,
            category: "أخبار",
            date: newsRow.published_at || newsRow.created_at || undefined,
            readingTime: "3 دقائق",
            sourceTable: "news",
            image: newsRow.image_url || null,
          }
        } else {
          // الأخبار المحلية (news.json): الـ id يُستخدم كـ slug (كما في NewsPage.tsx)
          const localNewsMatch = (localNewsData as any[]).find(
            (item) => item.type === "news" && item.id === targetSlug
          )
          if (localNewsMatch) {
            currentArticleData = {
              id: localNewsMatch.id,
              title: localNewsMatch.title,
              slug: localNewsMatch.id,
              content: localNewsMatch.content || "",
              summary: localNewsMatch.summary || undefined,
              category: "أخبار",
              date: localNewsMatch.date || undefined,
              readingTime: "3 دقائق",
              sourceTable: "news",
              image: localNewsMatch.image || localNewsMatch.imageUrl || null,
            }
          }
        }
      }

      setArticle(currentArticleData)

      if (currentArticleData) {
        await fetchRelated(currentArticleData);
      }
    } catch (err) {
      console.error("خطأ في جلب تفاصيل المقال:", err)
      setArticle(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchRelated = async (current: ArticleDetail) => {
    try {
      let supabaseList: RelatedArticle[] = [];
      // نجلب مجموعة أوسع من المقالات (وليس 3 فقط) لتتمكن الخوارزمية من
      // المفاضلة الفعلية بينها قبل اختيار الأقرب صلة بالمقال الحالي
      const { data } = await supabase
        .from("articles")
        .select("id, title, slug, excerpt, published_at, created_at, category:categories(name)")
        .eq("status", "published")
        .neq("slug", current.slug)
        .order("published_at", { ascending: false })
        .limit(30);

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
        .filter((item) => item.slug !== current.slug)
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

      // خوارزمية اقتراح: ترتيب المقالات حسب تطابق التصنيف وتشابه الكلمات
      // المفتاحية مع عنوان/ملخص المقال الحالي (انظر lib/utils/recommend.ts)
      const ranked = rankRelatedItems(
        { id: current.id, slug: current.slug, title: current.title, text: current.summary, category: current.category },
        combined.map((item) => ({ ...item, text: item.summary })),
        3
      )

      setRelatedArticles(ranked);
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
        <Link to="/articles" title="العودة إلى قائمة المقالات" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground">
          <ArrowRight size={16} />
          العودة إلى قائمة المقالات
        </Link>
      </main>
    )
  }

  const formattedDate = article.date
    ? new Date(article.date).toLocaleDateString("ar-MA", { year: "numeric", month: "long", day: "numeric" })
    : null

  const textSizeClass = textSize === "Small" ? "text-sm md:text-[15px]" : textSize === "Large" ? "text-lg md:text-xl" : "text-base md:text-[17px]";
  const maxWidthClass = pageWidth === "Wide" ? "max-w-[98%] xl:max-w-[95%]" : "max-w-6xl";
  const sectionsList = parsed.toc

  const tocPanel = (
    <nav className="space-y-0.5 text-[13px] max-h-[60vh] overflow-y-auto pl-1">
      <a
        href="#top"
        title="بداية المقال"
        className={`flex items-center gap-2 rounded-lg py-1.5 px-2.5 font-semibold transition ${
          activeSection === "top"
            ? "bg-primary/10 text-primary"
            : "text-foreground hover:bg-muted"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${activeSection === "top" ? "bg-primary" : "bg-transparent"}`} />
        بداية المقال
      </a>
      {sectionsList.map((section, idx) => {
        const isActive = activeSection === section.id
        return (
          <a
            key={idx}
            href={`#${section.id}`}
            title={section.title}
            className={`flex items-center gap-2 rounded-lg py-1.5 px-2.5 transition truncate ${
              section.level === 3 ? "mr-3.5 text-[12px]" : ""
            } ${
              isActive
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isActive ? "bg-primary" : "bg-border"}`} />
            <span className="truncate">{section.title}</span>
          </a>
        )
      })}
    </nav>
  )

  const appearancePanel = (
    <div className="space-y-4 text-xs">
      <div className="space-y-2">
        <span className="font-bold text-muted-foreground flex items-center gap-1.5">
          <AlignLeft size={13} />
          حجم الخط
        </span>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {(["Small", "Standard", "Large"] as const).map((size) => (
            <button
              key={size}
              onClick={() => setTextSize(size)}
              aria-label={size}
              className={`flex-1 py-1.5 rounded-md flex items-center justify-center transition cursor-pointer ${
                textSize === size
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {size === "Small" && <Minus size={13} />}
              {size === "Standard" && <span className="text-[13px] font-black">A</span>}
              {size === "Large" && <Plus size={13} />}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 pt-1">
        <span className="font-bold text-muted-foreground flex items-center gap-1.5">
          <Columns2 size={13} />
          عرض الصفحة
        </span>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {(["Standard", "Wide"] as const).map((w) => (
            <button
              key={w}
              onClick={() => setPageWidth(w)}
              className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                pageWidth === w
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {w === "Standard" ? "عادي" : "عريض"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 pt-1">
        <span className="font-bold text-muted-foreground flex items-center gap-1.5">
          <Sun size={13} />
          المظهر
        </span>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {([
            { key: "Light" as const, icon: Sun, label: "فاتح" },
            { key: "Dark" as const, icon: Moon, label: "داكن" },
            { key: "Automatic" as const, icon: MonitorSmartphone, label: "تلقائي" },
          ]).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setColorMode(key)}
              className={`flex-1 py-1.5 rounded-md flex flex-col items-center gap-0.5 transition cursor-pointer ${
                colorMode === key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={13} />
              <span className="text-[9px] font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <SEOHead
        title={article.title}
        description={buildMetaDescription(article.summary, [
          article.category ? `مقال ضمن قسم ${article.category}` : null,
          "اطّلع على التفاصيل الكاملة على منصة الميزان الرقمية، المرجع القانوني الأول للطلبة والباحثين بالمغرب.",
        ])}
        canonicalUrl={`${SITE_CONFIG.url}/articles/${article.slug}`}
        schema={[generateBreadcrumbSchema([{ name: "الرئيسية", url: "/" }, { name: "المقالات", url: "/articles" }, { name: article.title, url: `/articles/${article.slug}` }])]}
      />

      {/* شريط تقدّم القراءة */}
      <div className="fixed inset-x-0 top-0 z-40 h-[3px] bg-transparent">
        <div
          className="h-full bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      <div id="top" />
      <main className={`mx-auto ${maxWidthClass} px-2 md:px-6 py-6 md:py-10 transition-all duration-300`} dir="rtl">
        <div className="mb-4 px-2 flex items-center justify-between gap-3 flex-wrap">
          <Link to="/articles" title="العودة إلى قائمة المقالات" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition">
            <ArrowRight size={14} />
            <span>العودة إلى المقالات</span>
          </Link>

          {/* أزرار أدوات القراءة (تظهر دائما، وتتحول إلى شريط علوي على الجوال) */}
          <div className="flex items-center gap-2 xl:hidden">
            <button
              onClick={() => { setShowContents((v) => !v); setShowAppearance(false) }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                showContents ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <List size={13} />
              المحتويات
              <ChevronDown size={12} className={`transition-transform ${showContents ? "rotate-180" : ""}`} />
            </button>
            <button
              onClick={() => { setShowAppearance((v) => !v); setShowContents(false) }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                showAppearance ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <SlidersHorizontal size={13} />
              المظهر
            </button>
          </div>
        </div>

        {/* لوحتا المحتويات والمظهر المنسدلتان على الجوال/التابلت */}
        {(showContents || showAppearance) && (
          <div className="mb-4 px-2 xl:hidden">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm relative">
              <button
                onClick={() => { setShowContents(false); setShowAppearance(false) }}
                className="absolute left-3 top-3 text-muted-foreground hover:text-foreground"
                aria-label="إغلاق"
              >
                <X size={16} />
              </button>
              {showContents && (
                <>
                  <h3 className="font-bold text-xs text-foreground mb-3 flex items-center gap-1.5">
                    <List size={14} className="text-primary" />
                    محتويات المقال
                  </h3>
                  {sectionsList.length > 0 ? tocPanel : (
                    <p className="text-[11px] text-muted-foreground">لا توجد عناوين فرعية لهذا المقال.</p>
                  )}
                </>
              )}
              {showAppearance && (
                <>
                  <h3 className="font-bold text-xs text-foreground mb-3 flex items-center gap-1.5">
                    <SlidersHorizontal size={14} className="text-primary" />
                    خيارات القراءة
                  </h3>
                  {appearancePanel}
                </>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6 items-start">

          {/* 1. Contents Sidebar (desktop only) */}
          <div className="hidden xl:block xl:col-span-3 xl:order-1">
            {sectionsList.length > 0 && (
              <div className="rounded-xl border border-border bg-card/60 p-4 xl:sticky xl:top-6">
                <h3 className="flex items-center gap-1.5 pb-2 mb-2 border-b border-border font-bold text-xs text-foreground">
                  <List size={14} className="text-primary" />
                  محتويات المقال
                </h3>
                {tocPanel}
              </div>
            )}
          </div>

          {/* 2. Main Article Content */}
          <article ref={articleBodyRef} className="xl:col-span-6 order-1 xl:order-2 rounded-2xl border border-border bg-card p-5 md:p-10 shadow-sm">
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
                {article.sourceTable && (
                  <ViewCounter table={article.sourceTable} slug={article.slug} />
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

            {article.image && (
              <div className="mb-8 -mt-2 overflow-hidden rounded-xl border border-border bg-muted">
                <img
                  src={article.image}
                  alt={article.title}
                  className="max-h-[420px] w-full object-cover"
                />
              </div>
            )}

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

            <InContentAd className="mb-8" />

            <div className={`prose prose-neutral dark:prose-invert max-w-none leading-loose text-foreground/90 ${textSizeClass}`}>
              <ArticleContent blocks={parsed.blocks} />
            </div>

            <PartnerSuggestionBox
              href="https://www.wadifapublic.ma/ar/tawjih"
              title="عروض التسجيل والتوجيه الجامعي"
              description="تصفّح مباريات ولوج المدارس والجامعات، عتبات الانتقاء ومواعيد التسجيل عبر بوابة WadifaPublic.ma."
              ctaLabel="شاهد عروض التسجيل"
            />

            {article.sourceTable && (
              <CommentSection table={article.sourceTable} slug={article.slug} />
            )}
          </article>

          {/* 3. Appearance Sidebar (desktop only) */}
          <div className="hidden xl:block xl:col-span-3 order-3">
            <div className="rounded-xl border border-border bg-card/60 p-4 xl:sticky xl:top-6">
              <h3 className="flex items-center gap-1.5 pb-2 mb-3 border-b border-border font-bold text-xs text-foreground">
                <SlidersHorizontal size={14} className="text-primary" />
                خيارات القراءة
              </h3>
              {appearancePanel}
            </div>
          </div>

        </div>

        {/* related articles */}
        {relatedArticles.length > 0 && (
          <section className="mt-16 pt-8 border-t border-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-foreground">مقالات ودراسات ذات صلة</h3>
              <Link to="/articles" title="عرض جميع المقالات" className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1">
                <span>عرض الكل</span>
                <ArrowLeft size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedArticles.map((item) => (
                <Link
                  key={item.id}
                  to={`/articles/${item.slug}`}
                  title={item.title}
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