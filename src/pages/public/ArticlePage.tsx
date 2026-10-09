import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useParams, Link, useLocation } from "react-router-dom"
import { AEOHead } from "../../components/seo/AEOHead"
import { generateBreadcrumbSchema, generateNewsArticleSchema, SITE_CONFIG } from "../../lib/seo/schema"
import { canonicalArticle, canonicalNews, itemPath, newsSlug } from "../../lib/canonical"
import { buildMetaDescription } from "../../lib/seo/description"
import { supabase } from "../../lib/supabase/client"
import { rankRelatedItems } from "../../lib/utils/recommend"
import { parseArticleMarkdown } from "../../lib/content/parseArticleMarkdown"
import { ArticleContent } from "../../components/articles/ArticleContent"
import lexiconData from "../../data/lexicon.client.json"
import { lexiconSlugById } from "../../lib/utils/generateSlug"
import { PartnerSuggestionBox } from "../../components/articles/PartnerSuggestionBox"
import { ViewCounter } from "../../components/articles/ViewCounter"
import { CommentSection } from "../../components/articles/CommentSection"
import { ContentTags } from "../../components/content/ContentTags"
import { ArticleTranslateWidget } from "../../components/articles/ArticleTranslateWidget"
import { ReadingOptionsControls } from "../../components/articles/ReadingOptionsControls"
import { MaxReadBar } from "../../components/articles/MaxReadBar"
import { ArticleToolDrawer } from "../../components/articles/ArticleToolDrawer"
import { ArticleSharePanel } from "../../components/articles/ArticleSharePanel"
import { ReactionBar } from "@/components/reactions/ReactionBar"
import { ReportDialog } from "@/components/governance/ReportDialog"
import { useReadingPrefs } from "@/hooks/useReadingPrefs"
import { useTrackView } from "@/hooks/useTrackView"
import { collectReaderAnchors, scrollToAnchor, topAnchorIndex } from "@/lib/reading/anchor"
import { exportElementToPdf } from "@/lib/articles/exportPdf"
import {
  Calendar, Tag, ArrowRight, ArrowLeft, Loader2, BookOpen,
  List, SlidersHorizontal, Maximize2, Download, Share2,
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

/**
 * أدوات القراءة التي تُفتح بالنقر في درج جانبي بدل بطاقات دائمة:
 * فهرس المقال، خيارات القراءة، والمشاركة.
 */
type ReaderTool = "toc" | "options" | "share"

/**
 * صنف زر في شريط الأدوات اللاصق — هدف لمس 44px، وحالة «مفتوح» لا تُخطئها
 * العين (خلفية الأساسية) لأن الدرج يغطي جزءاً من الصفحة. التسميات نصية من
 * sm فأعلى وأيقونات فقط تحتها، فيبقى الشريط سطراً واحداً على الجوال.
 */
const toolButtonClass = (active: boolean) =>
  `inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold ` +
  `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:transition-colors ${
    active
      ? "border-primary bg-primary text-primary-foreground shadow"
      : "border-border bg-card/80 text-muted-foreground hover:text-foreground"
  }`

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

  const lexiconTerms = useMemo(() => {
    const slugById = lexiconSlugById(lexiconData as { id: string; term_ar: string; term_fr?: string }[])
    return (lexiconData as { id: string; term_ar: string }[])
      .filter((t) => t.term_ar && t.term_ar.length >= 4)
      .map((t) => ({ id: t.id, term_ar: t.term_ar, slug: slugById.get(t.id) || t.id }))
  }, [])

  useTrackView(article?.sourceTable === "news" ? "news" : "article", article?.slug)

  // أدوات القراءة خلف نقرة واحدة: درج واحد مفتوح في كل مرة (أو لا شيء) —
  // لا بطاقات جانبية دائمة تأكل نصفَي العمود وتترك المقال في شريط ضيّق
  const [openTool, setOpenTool] = useState<ReaderTool | null>(null)
  const [activeSection, setActiveSection] = useState<string>("top")
  const [readingProgress, setReadingProgress] = useState<number>(0)

  // ── تفضيلات القراءة: خط/حجم/تباعد/سمة — محفوظة في mizan_reading_prefs ──
  const { prefs: readingPrefs, update: updateReadingPrefs } = useReadingPrefs()
  // عرض العمود حالة عرض فقط (لا تُحفظ): «عريض» للجداول في الوضع العادي
  const [pageWidth, setPageWidth] = useState<"Standard" | "Wide">("Standard")

  // ── وضع القراءة الأقصى ────────────────────────────────────────────────
  // يبدأ دائماً مطفأً (لا يُحفظ بين الزيارات حتى لا تُربك الزيارة الأولى)،
  // ويُدار من زر التوسيع في بطاقة الخيارات (سطح المكتب) أو الأيقونة المجاورة
  // لشارة وقت القراءة (جوال) أو اختصار F، ويُنهى بـ Esc.
  const [maxRead, setMaxRead] = useState<boolean>(false)
  const [maxReadBarHidden, setMaxReadBarHidden] = useState<boolean>(false)
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false)
  const [tocOpen, setTocOpen] = useState<boolean>(false)
  const [exportingPdf, setExportingPdf] = useState<boolean>(false)
  const pendingAnchorRef = useRef<number | null>(null)

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

  /* ── وضع القراءة الأقصى: آليات التبديل والشريط والمراساة ────────────── */

  /* ── أدوات القراءة بالنقر: فهرس / خيارات / مشاركة ─────────────────────── */

  // أزرار الشريط اللاصق — إليها يعود التركيز حين يُغلق الدرج (Esc/الخلفية/X)
  const toolAnchors = useRef<{ toc: HTMLButtonElement | null; options: HTMLButtonElement | null; share: HTMLButtonElement | null }>({ toc: null, options: null, share: null })
  const anchorToc = useCallback((el: HTMLButtonElement | null) => { toolAnchors.current.toc = el }, [])
  const anchorOptions = useCallback((el: HTMLButtonElement | null) => { toolAnchors.current.options = el }, [])
  const anchorShare = useCallback((el: HTMLButtonElement | null) => { toolAnchors.current.share = el }, [])

  /** درج واحد في كل مرة: النقر على الزر نفسه ثانيةً يُغلقه. */
  const toggleTool = useCallback((tool: ReaderTool) => {
    setOpenTool((current) => (current === tool ? null : tool))
  }, [])

  const closeTool = useCallback(() => setOpenTool(null), [])

  /**
   * تبديل الوضع مع مراساة موضع القراءة: قبل التبديل نحفظ رقم العنصر الظاهر
   * أعلى الشاشة من بين كتل المقال، وبعد أن يرسم React التخطيط الجديد نعود
   * إليه — بدونها يقفز النص من تحت العين عند تغيّر إزاحاته.
   */
  const toggleMaxRead = useCallback(() => {
    const anchors = collectReaderAnchors(articleBodyRef.current)
    pendingAnchorRef.current = anchors.length ? topAnchorIndex(anchors) : null
    setOpenTool(null)
    setSettingsOpen(false)
    setTocOpen(false)
    setMaxRead((visible) => !visible)
  }, [])

  const exitMaxRead = useCallback(() => {
    setOpenTool(null)
    setSettingsOpen(false)
    setTocOpen(false)
    const anchors = collectReaderAnchors(articleBodyRef.current)
    pendingAnchorRef.current = anchors.length ? topAnchorIndex(anchors) : null
    setMaxRead((visible) => (visible ? false : visible))
  }, [])

  /* ── تصدير المقال/الخبر PDF ──────────────────────────────────────────── */

  const showMizanToast = useCallback((message: string) => {
    window.dispatchEvent(new CustomEvent("mizan:toast", { detail: message }))
  }, [])

  /**
   * تنزيل المقال PDF من المحتوى المعروض نفسه (لقطة للمقال كما يقرؤه
   * الزائر: خط القارئ وحجمه وتباعده). الحِزم تُحمَّل عند الطلب فقط، وعند
   * أي فشل يُفتح حوار الطباعة كمسار بديل (حفظ كـ PDF من المتصفح).
   */
  const handleExportPdf = useCallback(async () => {
    const el = articleBodyRef.current
    if (!el || exportingPdf) return
    setExportingPdf(true)
    try {
      const path = article?.sourceTable === "news" ? itemPath.news(article.slug) : itemPath.article(article?.slug ?? "")
      await exportElementToPdf({
        element: el,
        fileName: `mizan-${article?.slug ?? "article"}.pdf`,
        title: article?.title ?? "ميزان الرقمية",
        sourceUrl: `${window.location.origin}${path}`,
      })
      showMizanToast("تم تجهيز ملف PDF وبدأ تنزيله")
    } catch (error) {
      console.error("pdf export failed:", error)
      showMizanToast("تعذّر إنشاء PDF — فُتح حوار الطباعة كبديل (اختر «حفظ كـ PDF»)")
      window.setTimeout(() => window.print(), 400)
    } finally {
      setExportingPdf(false)
    }
  }, [article, exportingPdf, showMizanToast])

  // إعادة التمرير إلى العنصر المُراسَط بعد التقطّع والتخطيط الجديد (دوران
  // اثنان من rAF تضمن أن التخطيط استقر قبل قياس الإزاحة).
  useEffect(() => {
    const index = pendingAnchorRef.current
    if (index === null) return
    pendingAnchorRef.current = null
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        scrollToAnchor(collectReaderAnchors(articleBodyRef.current), index)
      })
    })
    return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner) }
  }, [maxRead])

  // إظهار/إخفاء هيكل الموقع: صنف على body يمسّه CSS في globals.css —
  // الهيدر والفوتر تبقيان في الشجرة فلا تُفقد حالة مكوّنات المقال.
  useEffect(() => {
    document.body.classList.toggle("reader-max-active", maxRead)
    return () => document.body.classList.remove("reader-max-active")
  }, [maxRead])

  // الشريط النحيف: يختفي بأول تمرير للأسفل ويعود بأول تمرير للأعلى
  useEffect(() => {
    if (!maxRead) { setMaxReadBarHidden(false); return }
    let lastY = window.scrollY
    const handleScroll = () => {
      const y = window.scrollY
      const delta = y - lastY
      if (Math.abs(delta) < 4) return
      setMaxReadBarHidden(delta > 0 && y > 96)
      lastY = y
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [maxRead])

  // الاختصارات: F للتبديل، Esc للإغلاق بالنظام: نافذة الخيارات ← الدرج ← الخروج.
  // يُتجاهل F أثناء الكتابة في حقل أو مع مفاتيح التركيب (Ctrl/Cmd/Alt).
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      const target = event.target as HTMLElement | null
      const isEditable = Boolean(target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)))

      if (event.key === "Escape") {
        if (!maxRead) return
        event.preventDefault()
        if (settingsOpen) setSettingsOpen(false)
        else if (tocOpen) setTocOpen(false)
        else exitMaxRead()
        return
      }

      if (isEditable || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === "f" || event.key === "F") {
        event.preventDefault()
        toggleMaxRead()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [maxRead, settingsOpen, tocOpen, toggleMaxRead, exitMaxRead])

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
        // البيانات المحلية لا تملك عمود slug، فيُقارن الرابط بالمعرّف الذي
        // تبنيه سياسة الروابط من العنوان — وهو نفسه اسم الملف الذي يولّده
        // prerender والرابط الذي تنشره sitemap. كان التطابق على item.id وحده،
        // فيفتح الزائر صفحة خبر من القائمة فيجد «غير موجود» فوق محتوى مولَّد.
        const localNewsMatch = (localNewsData as any[]).find(
          (item) => newsSlug(item) === targetSlug || item.id === targetSlug
        )
        if (!localNewsMatch) return null
        return { id: localNewsMatch.id, title: localNewsMatch.title, slug: newsSlug(localNewsMatch), content: localNewsMatch.content || "", summary: localNewsMatch.summary || undefined, category: localNewsMatch.category || "أخبار", date: localNewsMatch.date || undefined, readingTime: "3 دقائق", sourceTable: "news", image: localNewsMatch.image || localNewsMatch.imageUrl || null }
      }
      const attemptsInOrder = preferNews ? [tryNewsTable, tryNewsLocal, tryArticlesTable, tryArticlesLocal] : [tryArticlesTable, tryArticlesLocal, tryNewsTable, tryNewsLocal]
      for (const attempt of attemptsInOrder) { currentArticleData = await attempt(); if (currentArticleData) break }
      setArticle(currentArticleData)
      if (currentArticleData) await fetchRelated(currentArticleData)
    } catch (err) { console.error("خطأ:", err); setArticle(null) } finally { setLoading(false) }
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
    } catch (e) { console.error(e) }
  }

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>
  if (!article) return <main className="container mx-auto max-w-4xl px-4 py-16 text-center" dir="rtl"><h1 className="text-2xl font-bold">المقال غير موجود</h1><Link to="/articles" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground"><ArrowRight size={16} />العودة إلى المقالات</Link></main>

  const formattedDate = article.date ? new Date(article.date).toLocaleDateString("ar-MA", { year: "numeric", month: "long", day: "numeric" }) : null
  // البطاقات الجانبية أُزيلت (الأدوات صارت درجاً بالنقر) فالعمود كله للمقال:
  // «عادي» مقياس قراءة مريح (~760px، طول السطر نفسه الذي اختاره الوضع الأقصى)،
  // و«عريض» للجداول. وفي الوضع الأقصى يُقيَّد العمود دائماً مهما كان الاختيار.
  const maxWidthClass = pageWidth === "Wide" && !maxRead ? "max-w-[98%] xl:max-w-[95%]" : "max-w-3xl"
  const sectionsList = parsed.toc

  const tocPanel = (
    <nav className="space-y-1 text-[13px] max-h-[60vh] overflow-y-auto pl-1">
      <a href="#top" className={`flex items-center gap-2.5 rounded-xl py-2 px-3 font-bold transition-all ${activeSection === "top" ? "bg-gradient-to-r from-primary/10 to-violet-500/10 text-primary border border-primary/20 shadow-sm" : "text-foreground hover:bg-muted"}`}><span className={`size-2 rounded-full ${activeSection === "top" ? "bg-primary animate-pulse" : "bg-border"}`} />بداية المقال</a>
      {sectionsList.map((section, idx) => {
        const isActive = activeSection === section.id
        return <a key={idx} href={`#${section.id}`} style={{ marginInlineStart: `${(section.level - 2) * 12}px` }} className={`flex items-center gap-2.5 rounded-xl py-2 px-3 transition-all ${section.level > 2 ? "text-[12px]" : ""} ${isActive ? "bg-gradient-to-r from-primary/10 to-violet-500/10 text-primary font-bold border border-primary/20 shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}><span className={`size-1.5 rounded-full ${isActive ? "bg-primary animate-pulse" : "bg-border"}`} /><span className="truncate">{section.title}</span></a>
      })}
    </nav>
  )

  // إحصائيات القراءة: كانت بطاقة جانبية دائمة، فصارت ذيل درج الفهرس — تظهر
  // حين يسأل القارئ «أين أنا؟» (لحظة فتح الفهرس) لا في كل زيارة.
  const readingStatsPanel = (
    <div className="space-y-2.5 rounded-[16px] border border-border/50 bg-gradient-to-br from-primary/[0.04] to-violet-500/[0.03] p-4">
      <h3 className="text-[11px] font-black">إحصائيات القراءة</h3>
      <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">التقدم</span><span className="font-bold text-primary">{Math.round(readingProgress)}%</span></div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-violet-600 transition-all" style={{ width: `${readingProgress}%` }} /></div>
      <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">وقت القراءة</span><span className="font-bold">{article.readingTime || "5 د"}</span></div>
    </div>
  )

  const readingOptionsControls = (
    <ReadingOptionsControls
      prefs={readingPrefs}
      onPrefsChange={updateReadingPrefs}
      width={pageWidth}
      onWidthChange={setPageWidth}
      inMaxRead={maxRead}
    />
  )

  // ── الرابط القانوني والمخطط: مصدر واحد لكل نوع ──────────────────────────
  // الأخبار تحت /news/ والمقالات تحت /articles/، بلا شرطة نهاية، بنفس ما
  // يبنيه prerender وما تنشره sitemap. أي اختلاف هنا يجعل canonical يشير إلى
  // نسخة لا يولّدها البناء، فتبقى الصفحة خارج الفهرس بقرار الزاحف لا بقرارنا.
  const isNews = article.sourceTable === "news"
  const detailPath = isNews ? itemPath.news(article.slug) : itemPath.article(article.slug)
  const detailCanonical = isNews ? canonicalNews(article.slug) : canonicalArticle(article.slug)

  // الأخبار كانت تحمل مخطط Article العام فتفقد NewsArticle وتاريخيه (وهو ما
  // يطلبه Google في Top Stories و In-News for AI answers).
  const detailSchema = [
    isNews
      ? generateNewsArticleSchema({
          title: article.title,
          description: article.summary || article.title,
          url: detailCanonical,
          datePublished: article.date || "",
          authorName: SITE_CONFIG.name,
          image: article.image || undefined,
        })
      : {
          "@context": "https://schema.org",
          "@type": "Article",
          "@id": `${detailCanonical}#article`,
          headline: article.title,
          description: article.summary || "",
          url: detailCanonical,
          datePublished: article.date,
          inLanguage: "ar-MA",
          isAccessibleForFree: true,
        },
    generateBreadcrumbSchema([
      { name: "الرئيسية", url: "/" },
      { name: isNews ? "الأخبار" : "المقالات", url: isNews ? "/news" : "/articles" },
      { name: article.title, url: detailPath },
    ]),
  ]

  return (
    <>
      <AEOHead
        title={article.title}
        description={buildMetaDescription(article.summary, [
          article.category ? `مقال ضمن قسم ${article.category}` : null,
          "اطّلع على التفاصيل الكاملة على منصة الميزان الرقمية، المرجع القانوني الأول للطلبة والباحثين بالمغرب.",
        ])}
        ogType="article"
        publishedTime={article.date}
        ogImage={article.image || undefined}
        canonicalUrl={detailCanonical}
        schema={detailSchema}
      />
      <div className={`${maxRead ? "hidden" : ""} site-progress-bar fixed inset-x-0 top-0 z-50 h-[3px] bg-transparent`}><div className="h-full bg-gradient-to-r from-primary via-violet-600 to-accent-gold transition-[width] duration-150 ease-out shadow-[0_0_8px_hsl(var(--primary)/0.5)]" style={{ width: `${readingProgress}%` }} /><div className="absolute top-0 h-full w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent blur-sm" style={{ left: `${readingProgress}%`, transform: "translateX(-50%)", opacity: readingProgress > 5 ? 1 : 0 }} /></div>
      <div id="top" />
      <div className={maxRead ? "reader-shell min-h-screen bg-[hsl(var(--background))]" : "min-h-screen bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.04),transparent_60%)]"}>
      {/* الشريط داخل الغلاف (.reader-shell) حتى يرث متغيرات سمة «ورقي» كما يرثها
          العمود نفسه — موضعُه ثابت فلا يتأثر تخطيطُه بذلك */}
      {maxRead && (
        <MaxReadBar
          progress={readingProgress}
          hidden={maxReadBarHidden}
          title={article.title}
          settingsOpen={settingsOpen}
          tocOpen={tocOpen}
          onToggleSettings={() => setSettingsOpen((open) => !open)}
          onToggleToc={() => setTocOpen((open) => !open)}
          onCloseSettings={() => setSettingsOpen(false)}
          onCloseToc={() => setTocOpen(false)}
          onExit={exitMaxRead}
          settingsContent={readingOptionsControls}
          tocContent={tocPanel}
        />
      )}
      <main className={`mx-auto ${maxRead ? "w-full max-w-[760px]" : maxWidthClass} ${maxRead ? "px-3 md:px-6 pt-20 md:pt-24 pb-10" : "px-3 md:px-6 py-6 md:py-10"} ${maxRead ? "" : "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"}`} dir="rtl">
        {/* صف المسار ثم شريط الأدوات اللاصق — يُفكَّكان في وضع القراءة الأقصى
            (أدوات هناك تعيش في الشريط النحيف). فكّ الصف يعيد تركيب أداة الترجمة
            عند الخروج ويعيد تطبيق اللغة المحفوظة بأمان بفضل علامة الوحدة في
            ArticleTranslateWidget.

            البطاقات الجانبية (محتويات المقال / خيارات القراءة / شارك المقال)
            لم تعد تأكل نصفَي العمود: صارت أدراجاً تُفتح بالنقر من هذا الشريط،
            والشريط لاصق تحت هيدر الموقع (h-16) فتبقى الأدوات في المتناول وسط
            المقال الطويل بلا ثمن من مساحة النص. الضيق يُعالَج بالالتفاف
            (flex-wrap) لا بالتمرير: overflow على الشريط كان سيقصّ قائمة اللغات
            المنسدلة في أداة الترجمة. */}
        {!maxRead && (<div className="mb-3 flex items-center gap-2 text-[12px]">
          <Link to="/" className="text-muted-foreground hover:text-foreground">الرئيسية</Link><span className="text-border">/</span><Link to={article.sourceTable === "news" ? "/news" : "/articles"} className="text-muted-foreground hover:text-primary font-bold">{article.sourceTable === "news" ? "الأخبار" : "المقالات"}</Link><span className="text-border">/</span><span className="text-foreground font-bold truncate max-w-[200px]">{article.title.slice(0,30)}...</span>
        </div>)}
        {!maxRead && (<div className="no-pdf sticky top-16 z-40 mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card/85 px-2 py-1.5 shadow-[0_4px_20px_hsl(0_0%_0%/0.05)] backdrop-blur-md">
          <button type="button" ref={anchorToc} onClick={() => toggleTool("toc")} aria-label="محتويات المقال" aria-expanded={openTool === "toc"} aria-haspopup="dialog" title="محتويات المقال" className={toolButtonClass(openTool === "toc")}>
            <List size={14} aria-hidden="true" /><span className="hidden sm:inline">المحتويات</span>{sectionsList.length > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${openTool === "toc" ? "bg-primary-foreground/25" : "bg-primary/10 text-primary"}`}>{sectionsList.length}</span>}
          </button>
          <button type="button" ref={anchorOptions} onClick={() => toggleTool("options")} aria-label="خيارات القراءة" aria-expanded={openTool === "options"} aria-haspopup="dialog" title="خيارات القراءة (الخط والحجم والمظهر)" className={toolButtonClass(openTool === "options")}>
            <SlidersHorizontal size={14} aria-hidden="true" /><span className="hidden sm:inline">خيارات القراءة</span>
          </button>
          <button type="button" ref={anchorShare} onClick={() => toggleTool("share")} aria-label="شارك المقال" aria-expanded={openTool === "share"} aria-haspopup="dialog" title="شارك المقال" className={toolButtonClass(openTool === "share")}>
            <Share2 size={14} aria-hidden="true" /><span className="hidden sm:inline">شارك المقال</span>
          </button>
          <span className="mx-0.5 h-6 w-px shrink-0 bg-border" aria-hidden="true" />
          <button type="button" onClick={handleExportPdf} disabled={exportingPdf} aria-label="تحميل المقال بصيغة PDF" title="تحميل المقال بصيغة PDF" className={`${toolButtonClass(false)} disabled:opacity-60`}>
            {exportingPdf ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Download size={14} aria-hidden="true" />}<span className="hidden sm:inline">تحميل PDF</span>
          </button>
          <div className="shrink-0"><ArticleTranslateWidget /></div>
          {/* دخول وضع القراءة الأقصى من الشريط (سطح المكتب) — على الجوال الزر بجانب شارة وقت القراءة */}
          <button type="button" onClick={toggleMaxRead} aria-label="وضع القراءة الأقصى (اختصار F)" aria-pressed={maxRead} title="وضع القراءة الأقصى (F)" className="hidden xl:grid size-11 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-primary motion-safe:transition-colors"><Maximize2 size={15} aria-hidden="true" /></button>
        </div>)}
        {/* العمود كله للمقال — لا شبكة بثلاثة أعمدة بعد إخفاء الأدوات في أدراج */}
        <div className="relative">
          <article ref={articleBodyRef} className={`reader-shell group relative overflow-hidden ${maxRead ? "rounded-none border-0 bg-transparent shadow-none" : "rounded-[24px] border border-border/50 bg-card shadow-[0_8px_40px_hsl(0_0%_0%/0.06)] hover:shadow-[0_16px_60px_hsl(0_0%_0%/0.10)] transition-all duration-700"}`}>
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-primary via-violet-500 to-accent-gold opacity-80" />
            <div className={maxRead ? "p-4 md:p-8" : "p-6 md:p-10"}>
            <header className="space-y-5 mb-10">
              <div className="flex items-center gap-2 flex-wrap">{article.category && <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/20 px-3.5 py-1.5 text-[11px] font-black text-primary"><div className="size-1.5 rounded-full bg-primary animate-pulse" />{article.category}</span>}{formattedDate && <span className="inline-flex items-center gap-1.5 rounded-full bg-muted border border-border/50 px-3 py-1 text-[11px] font-bold text-muted-foreground"><Calendar size={12} />{formattedDate}</span>}{article.readingTime && <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[11px] font-bold text-amber-700"><BookOpen size={12} />{article.readingTime}</span>}{article.sourceTable && <span className="no-pdf"><ViewCounter table={article.sourceTable} slug={article.slug} /></span>}{/* دخول وضع القراءة الأقصى على الجوال — بجانب شارة وقت القراءة (F أيضاً) */}<button type="button" onClick={toggleMaxRead} aria-label="وضع القراءة الأقصى (اختصار F)" aria-pressed={maxRead} title="وضع القراءة الأقصى (F)" className={`no-pdf xl:hidden ${maxRead ? "hidden" : ""} grid size-11 place-items-center rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 motion-safe:transition-colors`}><Maximize2 size={16} aria-hidden="true" /></button>{/* تنزيل المقال PDF — من المحتوى المعروض نفسه */}<button type="button" onClick={handleExportPdf} disabled={exportingPdf} aria-label="تحميل المقال بصيغة PDF" title="تحميل المقال بصيغة PDF" className="no-pdf grid size-11 place-items-center rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 disabled:opacity-60 motion-safe:transition-colors">{exportingPdf ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}</button></div>
              <h1 className="text-[1.7rem] md:text-[2.2rem] font-black leading-[1.15] tracking-tight">{article.title}</h1>
              {article.summary && <div className="relative rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.04] to-violet-500/[0.02] p-4 md:p-5"><p className="text-[13px] md:text-[14px] leading-7 text-foreground/80 font-medium">{article.summary}</p></div>}
              {article.keywords && article.keywords.length > 0 && <div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-black text-muted-foreground flex items-center gap-1.5"><div className="grid size-5 place-items-center rounded-full bg-primary/10 text-primary"><Tag size={10} /></div>الكلمات المفتاحية:</span>{article.keywords.map((kw, idx) => <span key={idx} className="rounded-full bg-muted hover:bg-primary/10 hover:text-primary border border-border hover:border-primary/20 px-3 py-1 text-[11px] font-bold text-muted-foreground transition-all">#{kw}</span>)}</div>}
            </header>
            {article.image && <div className="mb-10 group/img relative overflow-hidden rounded-[20px] border border-border/50 bg-muted shadow-[0_8px_32px_hsl(0_0%_0%/0.08)]"><img src={article.image} alt={article.imageAlt || article.title} className="max-h-[480px] w-full object-cover transition-transform duration-[1.5s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/img:scale-[1.02]" /></div>}
            {article.highlights && article.highlights.length > 0 && <div className="mb-10 relative overflow-hidden rounded-[20px] border border-primary/15 bg-gradient-to-br from-primary/[0.06] to-violet-500/[0.04] p-6"><div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-primary/50 to-transparent" /><h3 className="flex items-center gap-2 text-[13px] font-black text-primary mb-4"><div className="grid size-6 place-items-center rounded-lg bg-primary/10"><BookOpen className="size-3.5" /></div>أبرز النقاط</h3><ul className="space-y-3">{article.highlights.map((h, idx) => <li key={idx} className="flex items-start gap-3 text-[13px] leading-6 text-foreground/90"><span className="mt-2 size-1.5 rounded-full bg-primary shrink-0" /><span className="flex-1">{h}</span></li>)}</ul></div>}
            <div className="prose prose-neutral dark:prose-invert max-w-none reader-body text-foreground/90 prose-headings:font-black prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-lg prose-p:my-5"><ArticleContent blocks={parsed.blocks} lexiconTerms={lexiconTerms} /></div>
            <ContentTags tags={[article.category, article.targetKeyword, ...(article.keywords || [])]} className="no-pdf mt-10 border-t border-border/50 pt-6" />
            <div className="no-pdf"><PartnerSuggestionBox href="https://www.wadifapublic.ma/ar/tawjih" title="عروض التسجيل والتوجيه الجامعي" description="تصفّح مباريات ولوج المدارس والجامعات، عتبات الانتقاء ومواعيد التسجيل عبر بوابة WadifaPublic.ma." ctaLabel="شاهد عروض التسجيل" /></div>
            <div className="no-pdf mt-10 rounded-[20px] border border-border/50 bg-muted/30 p-6"><div className="flex items-center justify-between gap-3 mb-4"><h3 className="text-[14px] font-black flex items-center gap-2"><div className="grid size-7 place-items-center rounded-full bg-amber-500/10 text-amber-600">👍</div>هل كان هذا المقال مفيداً؟</h3><ReportDialog targetType={article.sourceTable === "news" ? "news" : "article"} targetId={article.slug} /></div><ReactionBar targetType={article.sourceTable === "news" ? "news" : "article"} targetId={article.slug} /></div>
            {article.sourceTable && <div className="no-pdf mt-8"><CommentSection table={article.sourceTable} slug={article.slug} /></div>}
            </div>
          </article>
        </div>

        {/* ── أدراج الأدوات: تُفتح بالنقر من الشريط اللاصق وتُغلق بالنقر خارجها
               أو بـ Esc أو بالنقر على قسم في الفهرس. واحدة في كل مرة. ── */}
        {!maxRead && openTool === "toc" && (
          <ArticleToolDrawer
            label="محتويات المقال"
            icon={<List size={15} className="text-primary" aria-hidden="true" />}
            badge={sectionsList.length > 0 ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{sectionsList.length}</span> : undefined}
            onClose={closeTool}
            closeOnNavigate
            opener={toolAnchors.current.toc}
            footer={readingStatsPanel}
          >
            {sectionsList.length > 0 ? tocPanel : <p className="text-[12px] text-muted-foreground">لا توجد عناوين فرعية.</p>}
          </ArticleToolDrawer>
        )}
        {!maxRead && openTool === "options" && (
          <ArticleToolDrawer
            label="خيارات القراءة"
            icon={<SlidersHorizontal size={15} className="text-primary" aria-hidden="true" />}
            onClose={closeTool}
            opener={toolAnchors.current.options}
            footer={
              <button type="button" onClick={toggleMaxRead} aria-label="وضع القراءة الأقصى (اختصار F)" aria-pressed={maxRead} className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-[12px] font-black text-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:transition-colors">
                <Maximize2 size={15} aria-hidden="true" />وضع القراءة الأقصى (F)
              </button>
            }
          >
            {readingOptionsControls}
          </ArticleToolDrawer>
        )}
        {!maxRead && openTool === "share" && (
          <ArticleToolDrawer
            label="شارك المقال"
            icon={<Share2 size={15} className="text-primary" aria-hidden="true" />}
            onClose={closeTool}
            opener={toolAnchors.current.share}
          >
            <ArticleSharePanel title={article.title} url={detailCanonical} summary={article.summary} onToast={showMizanToast} />
          </ArticleToolDrawer>
        )}
        {relatedArticles.length > 0 && <section className="mt-20"><div className="flex items-center justify-between mb-8"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-violet-600 text-white shadow-[0_8px_20px_hsl(var(--primary)/0.25)]"><BookOpen className="size-5" /></div><div><h3 className="text-lg font-black">مقالات ذات صلة</h3><p className="text-[12px] text-muted-foreground">مختارة حسب اهتماماتك</p></div></div><Link to="/articles" className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold hover:border-primary/20"><span>عرض الكل</span><ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /></Link></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">{relatedArticles.map((item) => <Link key={item.id} to={`/articles/${item.slug}`} className="group relative overflow-hidden rounded-[20px] border border-border/50 bg-card p-5 shadow-[0_4px_24px_hsl(0_0%_0%/0.04)] hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.12)] hover:border-primary/20 hover:-translate-y-1 transition-all duration-500"><div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-primary to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" /><div className="space-y-3">{item.category && <span className="inline-flex rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-[10px] font-black text-primary">{item.category}</span>}<h4 className="font-black text-[14px] leading-snug line-clamp-2 group-hover:text-primary transition-colors">{item.title}</h4>{item.summary && <p className="text-[12px] text-muted-foreground line-clamp-2 leading-6">{item.summary}</p>}</div><div className="mt-4 flex items-center justify-between pt-3 border-t border-border/50 text-[11px] font-bold text-primary"><span>قراءة المقال</span><div className="grid size-7 place-items-center rounded-full bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"><ArrowLeft size={14} /></div></div></Link>)}</div></section>}
      </main></div>
    </>
  )
}
