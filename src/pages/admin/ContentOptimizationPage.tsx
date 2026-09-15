import { useEffect, useState, useMemo } from "react"
import { Link } from "react-router-dom"
import {
  FileText, Link2, Zap, BarChart3, CheckCircle2, AlertTriangle,
  BookOpen, Layers, Search, Sparkles, TrendingUp, Eye, Edit3,
  Globe, FileQuestion, GraduationCap
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import lexiconData from "@/data/lexicon.json"
import { lexiconSlugById } from "@/lib/utils/generateSlug"
import { analyzeContentLinking, suggestTermsForContent } from "@/lib/content/enhancedAutoLinker"
import { batchOptimizeContent, generateLinkingReport } from "@/lib/content/serverContent"

interface ArticleItem {
  id: string
  title: string
  slug: string
  content: string
  excerpt?: string
  category?: string
}

export default function ContentOptimizationPage() {
  const [articles, setArticles] = useState<ArticleItem[]>([])
  const [news, setNews] = useState<ArticleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedArticle, setSelectedArticle] = useState<ArticleItem | null>(null)

  const terms = useMemo(() => {
    const slugById = lexiconSlugById(lexiconData as any)
    return (lexiconData as any[])
      .filter((t: any) => t.term_ar && t.term_ar.length >= 3)
      .map((t: any) => ({
        id: t.id,
        term_ar: t.term_ar,
        term_fr: t.term_fr,
        slug: slugById.get(t.id) || t.id,
        category: t.category,
      }))
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [articlesRes, newsRes] = await Promise.all([
          supabase.from("articles").select("id, title, slug, content, excerpt, category:categories(name)").eq("status", "published").limit(50),
          (supabase as any).from("news").select("id, title, slug, content, summary").eq("is_published", true).limit(30),
        ])

        const articlesData = (articlesRes.data || []).map((a: any) => ({
          id: a.id,
          title: a.title,
          slug: a.slug,
          content: a.content || "",
          excerpt: a.excerpt,
          category: Array.isArray(a.category) ? a.category[0]?.name : a.category?.name,
        }))

        const newsData = (newsRes.data || []).map((n: any) => ({
          id: n.id,
          title: n.title,
          slug: n.slug,
          content: n.content || n.summary || "",
          excerpt: n.summary,
          category: "أخبار",
        }))

        // Fallback to local if Supabase empty
        if (articlesData.length === 0) {
          const { default: localArticles } = await import("@/data/articles.json")
          setArticles((localArticles as any[]).slice(0, 20).map((a: any) => ({
            id: a.id,
            title: a.title,
            slug: a.slug,
            content: Array.isArray(a.body) ? a.body.join("\n\n") : a.content || "",
            excerpt: a.excerpt,
            category: a.category,
          })))
        } else {
          setArticles(articlesData)
        }

        if (newsData.length === 0) {
          const { default: localNews } = await import("@/data/news.json")
          setNews((localNews as any[]).filter((n: any) => n.type === "news").slice(0, 10).map((n: any) => ({
            id: n.id,
            title: n.title,
            slug: n.id,
            content: n.content || n.summary || "",
            excerpt: n.summary,
            category: n.category || "أخبار",
          })))
        } else {
          setNews(newsData)
        }
      } catch (e) {
        console.error("Load error:", e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const analysis = useMemo(() => {
    if (articles.length === 0) return null
    return analyzeContentLinking(articles, terms)
  }, [articles, terms])

  const linkingReport = useMemo(() => {
    if (articles.length === 0) return null
    return generateLinkingReport(articles, news, terms)
  }, [articles, news, terms])

  const optimized = useMemo(() => {
    if (articles.length === 0) return null
    return batchOptimizeContent(articles.slice(0, 10), terms)
  }, [articles, terms])

  const selectedSuggestions = useMemo(() => {
    if (!selectedArticle) return []
    return suggestTermsForContent(selectedArticle.content, terms, 15)
  }, [selectedArticle, terms])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center p-6" dir="rtl">
        <p className="text-sm text-muted-foreground">جارٍ تحليل المحتوى...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-violet-500/10 text-violet-600">
          <Zap className="size-6" />
        </span>
        <div>
          <h1 className="text-xl font-black text-foreground">تحسين المحتوى — خادم + روابط المصطلحات</h1>
          <p className="text-[12px] text-muted-foreground">
            تحسين خادم للمحتوى + تحويل المصطلحات القانونية إلى روابط داخلية في المقالات والأخبار
          </p>
        </div>
      </div>

      {/* Stats */}
      {linkingReport && (
        <div className="grid gap-3 sm:grid-cols-5">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[11px] text-muted-foreground">إجمالي المحتوى</p>
            <p className="text-xl font-black text-foreground">{linkingReport.total.content}</p>
            <p className="text-[10px] text-muted-foreground">مقال + خبر</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:bg-emerald-950/20">
            <p className="text-[11px] font-bold text-emerald-700">الروابط الداخلية</p>
            <p className="text-xl font-black text-foreground">{linkingReport.total.totalLinks}</p>
            <p className="text-[10px] text-muted-foreground">متوسط {linkingReport.total.avgLinks.toFixed(1)}/مقال</p>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:bg-violet-950/20">
            <p className="text-[11px] font-bold text-violet-700">المصطلحات المستخدمة</p>
            <p className="text-xl font-black text-foreground">{linkingReport.termCoverage.linked}/{linkingReport.termCoverage.total}</p>
            <p className="text-[10px] text-muted-foreground">{Math.round((linkingReport.termCoverage.linked / linkingReport.termCoverage.total) * 100)}% تغطية</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:bg-amber-950/20">
            <p className="text-[11px] font-bold text-amber-700">غير مستخدمة</p>
            <p className="text-xl font-black text-foreground">{linkingReport.termCoverage.unlinked}</p>
            <p className="text-[10px] text-muted-foreground">مصطلح بلا ذكر</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[11px] text-muted-foreground">متوسط الكلمات</p>
            <p className="text-xl font-black text-foreground">{Math.round(optimized?.stats.avgWordCount || 0)}</p>
            <p className="text-[10px] text-muted-foreground">كلمة/مقال</p>
          </div>
        </div>
      )}

      {/* Analysis */}
      {analysis && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-foreground">
              <BarChart3 className="size-4 text-primary" /> تحليل الربط الداخلي
            </h2>
            <div className="mt-4 space-y-3 text-[11px]">
              <div className="flex justify-between"><span className="text-muted-foreground">إجمالي المقالات</span><span className="font-bold">{analysis.totalArticles}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">مقالات بروابط</span><span className="font-bold text-emerald-600">{analysis.articlesWithLinks} ({Math.round((analysis.articlesWithLinks / analysis.totalArticles) * 100)}%)</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">متوسط الروابط/مقال</span><span className="font-bold">{analysis.avgLinksPerArticle.toFixed(1)}</span></div>
              <div className="mt-3">
                <p className="font-bold text-foreground">أكثر المصطلحات ربطاً:</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {analysis.topLinkedTerms.slice(0, 8).map(item => (
                    <Link key={item.term.id} to={`/lexicon/${item.term.slug}`} className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary hover:bg-primary hover:text-primary-foreground">
                      {item.term.term_ar} ({item.articleCount})
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-foreground">
              <AlertTriangle className="size-4 text-amber-500" /> مقالات تحتاج تحسين ربط
            </h2>
            <div className="mt-3 space-y-2">
              {analysis.articlesNeedingLinks.map(article => (
                <button
                  key={article.id}
                  onClick={() => setArticles(prev => {
                    const found = prev.find(a => a.id === article.id)
                    if (found) setSelectedArticle(found)
                    return prev
                  })}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-background p-3 text-right hover:bg-muted"
                >
                  <div>
                    <p className="line-clamp-1 text-[12px] font-bold text-foreground">{article.title}</p>
                    <p className="text-[10px] text-muted-foreground">{article.suggestions} روابط مقترحة</p>
                  </div>
                  <Edit3 className="size-3.5 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {linkingReport && linkingReport.recommendations.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <h3 className="flex items-center gap-2 text-[13px] font-extrabold text-amber-900 dark:text-amber-200">
            <Sparkles className="size-4" /> توصيات التحسين
          </h3>
          <ul className="mt-3 list-disc pr-5 text-[11px] leading-6 text-muted-foreground">
            {linkingReport.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
            <li>الربط التلقائي يعمل خادم + عميل — مرة واحدة لكل مصطلح لتجنب spam</li>
            <li>المصطلحات تربط في: المقالات، الأخبار، المحتوى المُصدّر مسبقاً (prerendered) — يحسن SEO</li>
            <li>استخدم <code>enhancedAutoLinker.ts</code> للتحكم: maxLinks, minTermLength, oncePerTerm</li>
          </ul>
        </div>
      )}

      {/* Optimized preview */}
      {optimized && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-foreground">
            <Zap className="size-4 text-violet-600" /> معاينة التحسين الخادمي (أول 3 مقالات)
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {optimized.optimized.slice(0, 3).map(item => (
              <div key={item.id} className="rounded-xl border border-border bg-background p-4">
                <p className="line-clamp-2 text-[12px] font-bold text-foreground">{item.title}</p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                  <span className="rounded-full bg-muted px-2 py-1 font-bold">{item.wordCount} كلمة</span>
                  <span className="rounded-full bg-muted px-2 py-1 font-bold">{item.readingTime}</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 font-bold text-emerald-700">{item.termLinks.count} روابط</span>
                  <span className="rounded-full bg-violet-100 px-2 py-1 font-bold text-violet-700">{item.seo.keywords.length} كلمات مفتاحية</span>
                </div>
                <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">{item.seo.description}</p>
                <div className="mt-2 flex gap-1">
                  <Link to={`/articles/${item.slug}`} className="text-[10px] font-bold text-primary hover:underline">معاينة</Link>
                  <span className="text-[10px] text-muted-foreground">•</span>
                  <Link to={`/admin/articles/edit/${item.id}`} className="text-[10px] font-bold text-muted-foreground hover:text-foreground">تعديل</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected article term suggestions */}
      {selectedArticle && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-foreground">
              <Link2 className="size-4 text-primary" /> مصطلحات مقترحة لـ: {selectedArticle.title}
            </h2>
            <button onClick={() => setSelectedArticle(null)} className="text-[11px] text-muted-foreground hover:text-foreground">إغلاق</button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {selectedSuggestions.map(({ term, count }) => (
              <div key={term.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div>
                  <p className="text-[12px] font-bold text-foreground">{term.term_ar}</p>
                  <p className="text-[10px] text-muted-foreground">{term.category} • {count} ذكر</p>
                </div>
                <Link to={`/lexicon/${term.slug}`} className="rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary hover:bg-primary hover:text-primary-foreground">
                  {term.term_fr || "تعريف"}
                </Link>
              </div>
            ))}
          </div>
          {selectedSuggestions.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">لا توجد مصطلحات مقترحة لهذا المقال — قد يكون قصيراً أو بلا مصطلحات قانونية</p>
          )}
        </div>
      )}

      {/* How it works */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-[13px] font-extrabold text-foreground">كيف يعمل الربط التلقائي؟</h3>
          <ul className="mt-3 list-disc pr-5 text-[11px] leading-7 text-muted-foreground">
            <li><code>enhancedAutoLinker.ts</code> — يبني فهرس 250 مصطلح مرتب حسب الطول (الأطول أولاً)</li>
            <li>يطبق regex آمن مع escape — يتجنب الربط داخل كود، عناوين، روابط موجودة</li>
            <li>كل مصطلح يربط مرة واحدة فقط في المقال كامل (Set مشترك) — يمنع spam</li>
            <li>الحد الأقصى 12-15 رابط/مقال — قابل للتخصيص maxLinks</li>
            <li>يعمل خادم (prerender.mjs) + عميل (ArticleContent.tsx) — نفس المنطق</li>
            <li>يدعم العربية + الفرنسية (term_ar + term_fr)</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <h3 className="text-[13px] font-extrabold text-emerald-900 dark:text-emerald-200">✅ الفوائد SEO</h3>
          <ul className="mt-3 list-disc pr-5 text-[11px] leading-6 text-muted-foreground">
            <li>روابط داخلية حقيقية نحو /lexicon/* بدل صفحات معزولة</li>
            <li>يحسن crawlability — محركات البحث تكتشف القاموس عبر المقالات</li>
            <li>يبقي القارئ في الموقع — من مقال إلى تعريف مصطلح إلى مقال آخر</li>
            <li>يظهر في HTML المُصدّر مسبقاً (prerendered) — مفهرس فوراً</li>
            <li>AEOHead + directAnswer + breadcrumbs + FAQ تكمل التحسين</li>
            <li>320 route prerendered + 250 term + 21 school — كلها مترابطة</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
