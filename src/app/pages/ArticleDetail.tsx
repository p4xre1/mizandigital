import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router";
import { useLocalizedPath } from "../lib/i18n";
import { ArrowRight, Download, Clock, Eye, Tag, BookOpen, GraduationCap, Heart, Bookmark } from "lucide-react";
import { getArticleBySlug, type Article } from "../lib/supabase";
import { trackArticleRead, trackPDFDownload, trackEvent } from "../lib/analytics";
import { setArticleSchema, setBreadcrumbSchema, clearSchema } from "../lib/jsonld";
import { sanitizeHtml, isSearchEngineBot } from "../lib/security";
import { useCms } from "../lib/adminStore";
import { useRole } from "../hooks/useRole";
import ShareBar from "../components/ShareBar";
import ArticleComments from "../components/ArticleComments";

const isHtml = (s: string) => /<(p|h[1-6]|div|ul|ol|li|img|iframe|strong|em|br|blockquote|span|font)[\s/>]/i.test(s);

const MOCK: Article = {
  id: "1",
  title: "أسئلة وأجوبة امتحان قانون الأسرة S1 — المغرب 2026",
  slug: "family-law-s1-2026",
  excerpt: "نماذج إجابات شاملة تغطي مدوّنة الأسرة: الزواج، الطلاق، النسب والحضانة.",
  content: `
## مقدمة في قانون الأسرة المغربي

يُعدّ قانون الأسرة المغربي، المُجسَّد في مدوّنة الأسرة الصادرة عام 2004، من أبرز التشريعات المدنية في المنظومة القانونية المغربية. يُنظّم هذا القانون العلاقات الأسرية من زواج وطلاق ونسب وحضانة ونفقة وميراث.

## أولاً: الزواج — الشروط والأركان

**تعريف الزواج:** عقد يُفيد التوافق بين رجل وامرأة على وجه الإباحة والتأبيد، ويتضمن أهدافاً نبيلة من تكوين أسرة وتنمية المجتمع.

**أركان الزواج:**
1. الإيجاب والقبول
2. أهلية الزوجين
3. الولي (في حالة المرأة)
4. الصداق
5. الشاهدان العدلان

**شروط صحة عقد الزواج:**
- بلوغ الزوجين سن الرشد (18 سنة) أو الحصول على إذن القاضي
- خلو كل منهما من موانع الزواج
- توثيق العقد من قِبَل عدلين منتصبين لذلك

## ثانياً: الطلاق والتطليق والخلع

### الطلاق

الطلاق حق يمارسه الزوج تحت إشراف القضاء، إذ لا يقع أي طلاق إلا بحكم قضائي.

**شروط ممارسة حق الطلاق:**
- تقديم طلب إلى المحكمة الابتدائية
- محاولة الصلح من طرف القاضي
- أداء جميع الحقوق المالية للزوجة والأطفال

### التطليق

حق يمارسه القاضي بطلب من الزوجة في حالات:
- الضرر
- الشقاق
- الغياب
- الإيلاء والهجر
- عدم الإنفاق

### الخلع

حق تملكه الزوجة مقابل إعادة الصداق أو بذل مال للزوج للتخلص من عصمة الزواج.

## ثالثاً: النسب والحضانة

**النسب:** يثبت بالفراش أو بالإقرار أو بالبيّنة. للطفل حق في النسب من أبيه وأمه ويترتب عليه الإرث والنفقة.

**الحضانة:** حق الطفل في التنشئة السليمة. تُعطى الأولوية للأم ما لم يكن في ذلك ضرر بالطفل.
  `,
  category: "قانون الأسرة",
  university: "محمد الخامس — الرباط",
  semester: "s1",
  year: 2026,
  pdf_url: "#",
  views: 4200,
  is_featured: true,
  author: "هيئة تحرير ميزان",
  tags: ["S1", "2026", "مدوّنة الأسرة", "الزواج", "الطلاق"],
  created_at: "2026-07-13T10:00:00Z",
  updated_at: "2026-07-13T10:00:00Z",
};

function renderContent(md: string) {
  return md.split("\n").map((line, i) => {
    if (line.startsWith("## ")) return <h2 key={i} className="text-xl font-bold text-foreground mt-8 mb-4" style={{ fontFamily: "'Noto Serif Arabic', serif" }}>{line.slice(3)}</h2>;
    if (line.startsWith("### ")) return <h3 key={i} className="text-base font-bold text-foreground mt-6 mb-3" style={{ fontFamily: "'Noto Serif Arabic', serif" }}>{line.slice(4)}</h3>;
    if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-bold text-foreground mt-4 mb-1" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>{line.slice(2, -2)}</p>;
    if (line.startsWith("- ")) return <li key={i} className="text-gray-700 mb-1 mr-4" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>{line.slice(2)}</li>;
    if (line.match(/^\d+\./)) return <li key={i} className="text-gray-700 mb-1 mr-4 list-decimal" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>{line.replace(/^\d+\.\s/, "")}</li>;
    if (line.trim() === "") return <div key={i} className="h-2" />;
    return <p key={i} className="text-gray-700 leading-relaxed mb-2" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>{line}</p>;
  });
}

function serializeNode(node: ChildNode) {
  if (node instanceof Element) return node.outerHTML;
  return node.textContent || "";
}

function splitMarkdownContent(md: string) {
  const paragraphs = md.split(/\n\s*\n/).filter(Boolean);
  const previewCount = Math.max(3, Math.ceil(paragraphs.length * 0.3));
  return {
    preview: paragraphs.slice(0, previewCount).join("\n\n"),
    locked: paragraphs.slice(previewCount).join("\n\n"),
  };
}

function splitHtmlContent(html: string) {
  if (typeof document === "undefined") {
    return { preview: html, locked: "" };
  }
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  const nodes = Array.from(wrapper.childNodes);
  const previewCount = Math.max(3, Math.ceil(nodes.length * 0.3));
  return {
    preview: nodes.slice(0, previewCount).map(serializeNode).join(""),
    locked: nodes.slice(previewCount).map(serializeNode).join(""),
  };
}

function renderHtmlSnippet(html: string) {
  return <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}

export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const localizedPath = useLocalizedPath();
  const cms = useCms();
  const { isPremium } = useRole();
  const [article, setArticle] = useState<Article>(MOCK);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likes, setLikes] = useState(342);

  // A CMS-authored article (with the same slug) takes precedence over mock data.
  const cmsArticle = cms.articles.find(a => a.slug === slug);
  const commentsEnabled = cmsArticle ? cmsArticle.commentsEnabled !== false : true;

  const toggleLike = () => {
    setLiked(v => { const next = !v; setLikes(c => c + (next ? 1 : -1)); trackEvent(next ? "article_like" : "article_unlike", { id: article.id }); return next; });
  };
  const toggleSave = () => {
    setSaved(v => { trackEvent(!v ? "article_save" : "article_unsave", { id: article.id }); return !v; });
  };

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    // Prefer a CMS-authored article; otherwise fall back to Supabase/mock.
    if (cmsArticle) {
      setArticle({
        ...MOCK,
        id: cmsArticle.id,
        title: cmsArticle.title,
        slug: cmsArticle.slug,
        category: cmsArticle.category,
        excerpt: cmsArticle.excerpt || MOCK.excerpt,
        content: cmsArticle.content || MOCK.content,
        author: cmsArticle.author,
        tags: cmsArticle.tags || MOCK.tags,
        views: cmsArticle.views,
      });
      trackArticleRead(cmsArticle.id, cmsArticle.title, cmsArticle.category);
      setLoading(false);
      return;
    }
    getArticleBySlug(slug)
      .then(data => { setArticle(data); trackArticleRead(data.id, data.title, data.category); })
      .catch(() => { setArticle({ ...MOCK, slug: slug || MOCK.slug }); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, cmsArticle?.id]);

  const isBot = isSearchEngineBot();
  const isLocked = !isPremium && !isBot;

  const contentFragments = useMemo(() => {
    const raw = article.content || article.excerpt || "";
    if (!raw) return { preview: "", locked: "", isHtml: false };
    if (isHtml(raw)) {
      return { ...splitHtmlContent(raw), isHtml: true };
    }
    return { ...splitMarkdownContent(raw), isHtml: false };
  }, [article.content, article.excerpt]);

  // SEO structured data (Schema.org) — refreshed per article, cleared on unmount.
  useEffect(() => {
    setArticleSchema({
      title: article.title,
      description: article.excerpt || article.title,
      slug: article.slug,
      author: article.author,
      datePublished: article.created_at,
      category: article.category,
      schemaType: "LegalArticle",
      lang: "ar",
      path: `/article/${article.slug}`,
    });
    setBreadcrumbSchema([
      { name: "الرئيسية", url: "/" },
      { name: "المكتبة", url: "/library" },
      { name: article.title, url: `/article/${article.slug}` },
    ]);
    return () => { clearSchema("ld-article"); clearSchema("ld-breadcrumb"); };
  }, [article]);

  const handlePDF = () => {
    if (article.pdf_url) trackPDFDownload(article.id, article.title);
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-4">
      {[...Array(6)].map((_, i) => <div key={i} className={`h-6 rounded bg-gray-100 animate-pulse ${i === 0 ? "w-3/4" : i === 1 ? "w-1/2" : "w-full"}`} />)}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="grid lg:grid-cols-[1fr_260px] gap-10" dir="rtl">
        {/* Article */}
        <article>
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-6" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
            <Link to={localizedPath("/")} className="hover:text-primary">الرئيسية</Link>
            <ArrowRight size={11} className="rotate-180" />
            <Link to={localizedPath("/library")} className="hover:text-primary">المكتبة</Link>
            <ArrowRight size={11} className="rotate-180" />
            <span className="text-foreground line-clamp-1">{article.title}</span>
          </nav>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent text-primary border border-blue-100">{article.category}</span>
            {article.semester && <span className="text-xs font-mono border border-border px-2 py-0.5 rounded-full text-muted-foreground">{article.semester.toUpperCase()}</span>}
            {article.year && <span className="text-xs font-mono text-muted-foreground">{article.year}</span>}
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight mb-4" style={{ fontFamily: "'Noto Serif Arabic', serif" }}>
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-6 pb-6 border-b border-border">
            {article.author && <span className="flex items-center gap-1"><BookOpen size={12} />{article.author}</span>}
            {article.university && <span className="flex items-center gap-1"><GraduationCap size={12} />{article.university}</span>}
            <span className="flex items-center gap-1"><Clock size={12} />{new Date(article.created_at).toLocaleDateString("ar-MA")}</span>
            <span className="flex items-center gap-1"><Eye size={12} />{article.views.toLocaleString()} قراءة</span>
          </div>

          {/* Content — CMS articles store sanitised HTML; mock uses markdown. */}
          <div className="prose-container rte-content leading-loose text-base">
            {contentFragments.preview ? (
              contentFragments.isHtml ? renderHtmlSnippet(contentFragments.preview) : renderContent(contentFragments.preview)
            ) : (
              <p className="text-muted-foreground" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>{article.excerpt}</p>
            )}

            {contentFragments.locked ? (
              <div className="premium-content-section relative mt-6">
                {isLocked ? (
                  <>
                    <div className="pointer-events-none select-none blur-sm">
                      {contentFragments.isHtml ? renderHtmlSnippet(contentFragments.locked) : renderContent(contentFragments.locked)}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center p-6 bg-gradient-to-t from-white/95 to-transparent">
                      <div className="max-w-md rounded-3xl border border-border bg-white/95 p-6 shadow-xl text-center">
                        <p className="text-sm font-semibold text-foreground mb-4" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
                          المحتوى الكامل مقفول لحماية حقوق المنصة. سجّل الدخول أو اشترك للوصول إليه.
                        </p>
                        <Link to={localizedPath("/login")}
                          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-primary text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                          style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
                          تسجيل الدخول للوصول الكامل
                        </Link>
                      </div>
                    </div>
                  </>
                ) : (
                  contentFragments.isHtml ? renderHtmlSnippet(contentFragments.locked) : renderContent(contentFragments.locked)
                )}
              </div>
            ) : null}
          </div>

          {/* Tags */}
          {article.tags?.length && (
            <div className="flex flex-wrap items-center gap-2 mt-10 pt-6 border-t border-border">
              <Tag size={13} className="text-muted-foreground" />
              {article.tags.map(t => (
                <Link key={t} to={`/search?q=${encodeURIComponent(t)}`}
                  className="text-xs px-2.5 py-1 rounded-full border border-border text-gray-600 hover:bg-accent hover:text-primary hover:border-primary/30 transition-colors"
                  style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>{t}</Link>
              ))}
            </div>
          )}

          {/* Comments */}
          <ArticleComments articleId={article.id} enabled={commentsEnabled} />
        </article>

        {/* Sticky sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-24 self-start">
          {article.pdf_url && (
            <a href={article.pdf_url} onClick={handlePDF}
              className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-colors text-sm"
              style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
              <Download size={16} /> تحميل PDF
            </a>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={toggleLike} aria-pressed={liked}
              className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-medium border transition-colors ${liked ? "bg-red-50 border-red-200 text-red-600" : "border-border text-gray-700 hover:border-primary hover:text-primary"}`}
              style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
              <Heart size={15} className={liked ? "fill-red-500 text-red-500" : ""} />{likes.toLocaleString()}
            </button>
            <button onClick={toggleSave} aria-pressed={saved}
              className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-medium border transition-colors ${saved ? "bg-accent border-primary/30 text-primary" : "border-border text-gray-700 hover:border-primary hover:text-primary"}`}
              style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
              <Bookmark size={15} className={saved ? "fill-current" : ""} />{saved ? "محفوظ" : "حفظ"}
            </button>
          </div>
          <ShareBar url={`${window.location.origin}/article/${article.slug}`} title={article.title} campaign={article.slug} />

          <div className="bg-white border border-border rounded-xl p-4">
            <h4 className="text-xs font-bold text-foreground mb-3 pb-2 border-b border-border" style={{ fontFamily: "'Noto Serif Arabic', serif" }}>تفاصيل الوثيقة</h4>
            <dl className="space-y-2 text-xs" style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>
              {[["الفئة", article.category], ["الجامعة", article.university], ["الفصل", article.semester?.toUpperCase()], ["السنة", article.year?.toString()]].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-accent border border-blue-100 rounded-xl p-4">
            <p className="text-xs text-blue-700 mb-2 font-semibold" style={{ fontFamily: "'Noto Serif Arabic', serif" }}>اشترك في النشرة القانونية</p>
            <input type="email" placeholder="بريدك الإلكتروني"
              className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-white mb-2 text-right outline-none focus:border-primary"
              style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }} />
            <button className="w-full py-2 bg-primary text-white text-xs font-semibold rounded-lg"
              style={{ fontFamily: "'Noto Sans Arabic', sans-serif" }}>اشترك</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
