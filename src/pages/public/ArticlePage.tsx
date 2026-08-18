import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { SEOHead } from "../../components/seo/SEOHead"
import { stripHtml, truncateCleanText } from "../../lib/utils/sanitize"
import { renderTextWithInternalLinks } from "../../lib/utils/autoLinker"
import { supabase } from "../../lib/supabase/client"
import { generateArticleSchema, generateBreadcrumbSchema, SITE_CONFIG } from "../../lib/seo/schema"
import newsData from "../../data/news.json"
import articlesData from "../../data/articles.json"
import lexiconData from "../../data/lexicon.json"
import {
  Calendar,
  Clock,
  User,
  Tag,
  ArrowRight,
  Share2,
  Check,
  FileText,
  AlertCircle,
  Newspaper,
  BookOpen
} from "lucide-react"

interface ArticlePageProps {
  slug?: string
}

// دالة توليد الرابط المتوافقة مع السيرفر وخريطة الموقع
const generateSlug = (text = "") => {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[\s\/\\_]+/g, "-")
    .replace(/[^\w\u0600-\u06FF\-]+/g, "")
    .replace(/\-+$/, "");
};

// عدد الكلمات التقريبي لأي نص (يدعم العربية) لاستخدامه في wordCount الخاص بـ Schema.org
const countWords = (text = "") => {
  const clean = stripHtml(text).trim()
  return clean ? clean.split(/\s+/).length : 0
}

/**
 * توحيد شكل البيانات القادمة من ثلاثة مصادر مختلفة:
 * - جدول "articles" في Supabase CMS (لوحة التحكم)
 * - جدول "news" في Supabase CMS (لوحة التحكم)
 * - ملفات JSON المحلية الثابتة (articles.json / news.json)
 * في كائن واحد متجانس، لضمان دقة بيانات SEO (التاريخ، الكاتب، الوصف...) مهما كان مصدر المحتوى.
 */
function normalizeArticle(raw: any, source: "cms_article" | "cms_news" | "local"): any {
  if (source === "cms_article") {
    return {
      id: raw.id,
      slug: raw.slug,
      type: "article",
      title: raw.title,
      summary: raw.excerpt || "",
      content: raw.content || "",
      category: raw.category?.name || raw.category?.name_fr || null,
      author: null,
      date: raw.published_at || raw.created_at || null,
      updatedDate: raw.updated_at || raw.published_at || raw.created_at || null,
      readingTime: null,
      image: raw.cover_image || null,
      status: raw.status,
      metaTitle: raw.meta_title || null,
      metaDescription: raw.meta_description || null,
      canonicalUrl: raw.canonical_url || null,
      targetKeyword: raw.target_keyword || null,
    }
  }

  if (source === "cms_news") {
    return {
      id: raw.id,
      slug: raw.slug,
      type: "news",
      title: raw.title,
      summary: raw.summary || "",
      content: raw.content || "",
      category: raw.source || null,
      author: null,
      date: raw.published_at || raw.created_at || null,
      updatedDate: raw.updated_at || raw.published_at || raw.created_at || null,
      readingTime: null,
      image: raw.image_url || null,
      status: raw.is_published ? "published" : "draft",
      metaTitle: null,
      metaDescription: null,
      canonicalUrl: null,
      targetKeyword: null,
    }
  }

  // بيانات محلية ثابتة: articles.json تستعمل excerpt/body/publishedAt، news.json تستعمل summary/content/date
  const localContent = Array.isArray(raw.body) ? raw.body.join("\n\n") : raw.content || ""
  return {
    id: raw.id,
    slug: raw.slug,
    type: raw.type || "article",
    title: raw.title,
    summary: raw.excerpt || raw.summary || "",
    content: localContent,
    category: raw.category || null,
    author: raw.author || null,
    date: raw.publishedAt || raw.date || null,
    updatedDate: raw.updatedAt || raw.publishedAt || raw.date || null,
    readingTime: raw.readingTime || raw.readTime || null,
    image: raw.image || raw.coverImage || null,
    status: "published",
    metaTitle: null,
    metaDescription: null,
    canonicalUrl: null,
    targetKeyword: null,
  }
}

export function ArticlePage({ slug }: ArticlePageProps) {
  const params = useParams<{ slug?: string; id?: string }>()
  const rawSlug = slug || params.slug || params.id
  const [copied, setCopied] = useState(false)

  // دمج البيانات المحلية أولاً لضمان سرعة العرض والتحميل المسبق (Prerender)
  const [allItems, setAllItems] = useState<any[]>([
    ...(newsData as any[]).map((item) => normalizeArticle(item, "local")),
    ...(articlesData as any[]).map((item) => normalizeArticle(item, "local")),
  ])
  const [isLoading, setIsLoading] = useState(true)

  // جلب المحتوى المنشور فقط من لوحة تحكم Supabase CMS دمجاً مع الملفات المحلية
  // ملاحظة SEO/أمان: نستبعد المسودات (draft) والمقالات قيد المراجعة كي لا تُفهرس أو تُعرض للعموم
  useEffect(() => {
    async function fetchCMSContent() {
      try {
        const [{ data: dbArticles }, { data: dbNews }] = await Promise.all([
          supabase
            .from("articles")
            .select("*, category:categories(name, name_fr)")
            .eq("status", "published"),
          supabase.from("news").select("*").eq("is_published", true),
        ])

        const normalizedCms = [
          ...(dbNews || []).map((item) => normalizeArticle(item, "cms_news")),
          ...(dbArticles || []).map((item) => normalizeArticle(item, "cms_article")),
        ]

        if (normalizedCms.length > 0) {
          const combined = [
            ...normalizedCms,
            ...(newsData as any[]).map((item) => normalizeArticle(item, "local")),
            ...(articlesData as any[]).map((item) => normalizeArticle(item, "local")),
          ]

          // إزالة العناصر المكررة بناءً على المعرف أو الرابط
          const uniqueItems = Array.from(
            new Map(combined.map(item => [item.id || item.slug || item.title, item])).values()
          )

          setAllItems(uniqueItems)
        }
      } catch (err) {
        console.error("Error fetching Supabase CMS content:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCMSContent()
  }, [])

  // فك تشفير الرابط والتعامل مع النصوص العربية والمسافات
  const articleSlug = rawSlug ? decodeURIComponent(rawSlug).trim() : ""

  // البحث الذكي المطابق للأيدي، الـ slug الصريح، أو الـ slug المتولد من العنوان
  const article = allItems.find((item) => {
    const itemSlug = item.slug || generateSlug(item.title);
    return (
      String(item.id) === articleSlug || 
      String(item.slug) === articleSlug || 
      itemSlug === articleSlug
    );
  });

  // تحديد نوع المسار الصحيح بناءً على تصنيف العنصر (خبر أو مقال)
  const getBasePath = (item: any) => {
    return item?.type === "news" ? "/news" : "/articles";
  };

  // المقالات ذات الصلة (استثناء المقال الحالي)
  const relatedArticles = allItems
    .filter((item) => String(item.id) !== String(article?.id))
    .slice(0, 2)

  // التعامل مع مشاركة / نسخ الرابط
  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // حالة عدم العثور على المقال (مع مراعاة انتظار التحميل إذا أردت)
  if (!article && !isLoading) {
    return (
      <>
        <SEOHead
          title="المقال غير موجود - منصة الميزان"
          description="عذراً، لم يتم العثور على المقال أو الخبر المطلوب في الأرشيف التشريعي."
          noindex
        />
        <main className="container mx-auto max-w-4xl px-4 py-20 text-center" dir="rtl">
          <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-card p-8 shadow-sm">
            <AlertCircle size={48} className="mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold text-foreground">المقال غير موجود</h1>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              قد يكون المقال قد تم نقله أو حذف رابط النشر الخاص به.
            </p>
            <Link
              to="/news"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition hover:opacity-90"
            >
              <ArrowRight size={16} />
              <span>العودة لمدونة الأخبار والمقالات</span>
            </Link>
          </div>
        </main>
      </>
    )
  }

  if (!article && isLoading) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-20 text-center" dir="rtl">
        <p className="text-muted-foreground animate-pulse">جاري تحميل المحتوى التشريعي...</p>
      </main>
    )
  }

  const basePath = getBasePath(article);
  const currentSlug = article.slug || generateSlug(article.title);
  const canonicalUrl = article.canonicalUrl || `${SITE_CONFIG.url}${basePath}/${currentSlug}`

  // تجهيز الوصف الآمن لـ SEO: نُعطي الأولوية لوصف الـ Meta المخصص من لوحة التحكم
  const safeDescription = article.metaDescription
    ? stripHtml(article.metaDescription)
    : article.summary
      ? stripHtml(article.summary)
      : truncateCleanText(article.content || "", 160)

  // بيانات Schema.org للمحركات البحثية: مقال + مسار التنقل (Breadcrumb)
  const articleSchema = generateArticleSchema({
    title: article.title,
    description: safeDescription,
    url: canonicalUrl,
    datePublished: article.date || new Date().toISOString(),
    dateModified: article.updatedDate || article.date,
    authorName: article.author || undefined,
    image: article.image || undefined,
    keywords: [article.targetKeyword, article.category].filter(Boolean) as string[],
    wordCount: countWords(article.content),
    articleCategory: article.type === "news" ? "Legislation" : "Analysis",
  })

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "الرئيسية", url: "/" },
    {
      name: article.type === "news" ? "الأخبار التشريعية" : "المقالات والدراسات",
      url: basePath,
    },
    { name: article.title, url: `${basePath}/${currentSlug}` },
  ])

  return (
    <>
      <SEOHead
        title={article.metaTitle || `${article.title} - منصة الميزان`}
        description={safeDescription}
        canonicalUrl={canonicalUrl}
        ogType="article"
        ogImage={article.image || undefined}
        publishedTime={article.date || undefined}
        modifiedTime={article.updatedDate || undefined}
        keywords={[
          article.targetKeyword || "",
          article.category || "العلوم القانونية",
          "القانون المغربي",
          "تحليل تشريعي"
        ].filter(Boolean)}
        schema={[articleSchema, breadcrumbSchema]}
      />

      <main className="container mx-auto max-w-4xl px-4 py-10" dir="rtl">
        {/* شريط المسار Navigation */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary transition">
            الرئيسية
          </Link>
          <span>/</span>
          <Link to={basePath} className="hover:text-primary transition">
            {article.type === "news" ? "الأخبار التشريعية" : "المقالات والدراسات"}
          </Link>
          <span>/</span>
          <span className="truncate max-w-[200px] text-foreground font-semibold">
            {article.title}
          </span>
        </nav>

        {/* حاوية المقال */}
        <article className="rounded-2xl border border-border bg-card p-6 md:p-10 shadow-sm">
          {/* الترويسة العلوية */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
                <Tag size={12} />
                {article.category || "دراسة قانونية"}
              </span>

              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                {article.type === "news" ? (
                  <>
                    <Newspaper size={12} />
                    خبر تشريعي
                  </>
                ) : (
                  <>
                    <BookOpen size={12} />
                    مقال تحليلي
                  </>
                )}
              </span>
            </div>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition"
              title="مشاركة المقال"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-green-600 dark:text-green-400" />
                  <span>تم نسخ الرابط</span>
                </>
              ) : (
                <>
                  <Share2 size={14} />
                  <span>مشاركة</span>
                </>
              )}
            </button>
          </div>

          {/* العنوان الرئيسي */}
          <h1 className="text-2xl md:text-4xl font-black text-foreground leading-snug mb-6">
            {article.title}
          </h1>

          {/* شريط معلومات الكاتب والتاريخ */}
          <div className="flex flex-wrap items-center gap-4 py-4 px-5 rounded-xl bg-muted/30 border border-border/50 text-xs text-muted-foreground mb-8">
            {article.author && (
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <User size={14} className="text-primary" />
                <span>{article.author}</span>
              </div>
            )}

            {article.date && (
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-primary" />
                <span>{article.date}</span>
              </div>
            )}

            {article.readingTime && (
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-primary" />
                <span>زمن القراءة: {article.readingTime}</span>
              </div>
            )}
          </div>

          {/* الملخص التنفيذي */}
          {article.summary && (
            <div className="mb-8 rounded-xl bg-primary/5 border-r-4 border-primary p-4 md:p-5 text-sm text-foreground/90 font-medium leading-relaxed">
              <span className="block font-bold text-primary mb-1 text-xs">ملخص التقرير:</span>
              {renderTextWithInternalLinks(stripHtml(article.summary), lexiconData as any[])}
            </div>
          )}

          {/* نص المقال مع تحويل المصطلحات القانونية تلقائياً إلى روابط داخلية */}
          <div className="prose dark:prose-invert max-w-none text-base leading-relaxed text-foreground space-y-6 pt-2 border-t border-border/50">
            {article.content ? (
              article.content.split("\n\n").map((paragraph: string, idx: number) => (
                <p key={idx} className="text-justify leading-8">
                  {renderTextWithInternalLinks(paragraph, lexiconData as any[])}
                </p>
              ))
            ) : (
              <p className="text-muted-foreground italic">لا يوجد محتوى نصي متاح لهذا التقرير.</p>
            )}
          </div>
        </article>

        {/* مقالات ذات صلة */}
        {relatedArticles.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <FileText size={20} className="text-primary" />
              <span>مقالات وقراءات ذات صلة</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relatedArticles.slice(0, 2).map((rel: any) => {
                const relPath = getBasePath(rel);
                const relSlug = rel.slug || generateSlug(rel.title);
                return (
                  <Link
                    key={rel.id || rel.slug}
                    to={`${relPath}/${relSlug}`}
                    className="group flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/50 hover:shadow-md"
                  >
                    <div>
                      <span className="inline-block rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary mb-2">
                        {rel.category || "عام"}
                      </span>
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition leading-snug">
                        {rel.title}
                      </h3>
                      {(rel.summary || rel.content) && (
                        <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {truncateCleanText(rel.summary || rel.content, 130)}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-border flex items-center gap-1 text-xs font-bold text-primary">
                      <span>قراءة التقرير</span>
                      <ArrowRight size={14} className="rotate-180" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* زر العودة */}
        <div className="mt-10 pt-6 border-t border-border flex items-center justify-between">
          <Link
            to={basePath}
            className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
          >
            <ArrowRight size={16} />
            <span>العودة لجداول الأخبار والتحليلات</span>
          </Link>
        </div>
      </main>
    </>
  )
}