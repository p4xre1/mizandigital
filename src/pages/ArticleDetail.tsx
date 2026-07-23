import { useState, useEffect, useMemo } from "react";

import { useParams, Link } from "react-router-dom";

import { useLocalizedPath, useI18n, serifFont, sansFont, type Lang } from "@/lib/i18n";

import { ArrowRight, Download, Clock, Eye, Tag, BookOpen, GraduationCap, Heart, Bookmark, ExternalLink, ShieldCheck, UserPlus } from "lucide-react";

import { getArticleBySlug, type Article } from "@/lib/supabase";

import { trackArticleRead, trackPDFDownload, trackEvent } from "@/lib/analytics";

import { setArticleSchema, setBreadcrumbSchema, clearSchema } from "@/lib/jsonld";

import { sanitizeHtml, isSearchEngineBot } from "@/lib/security";

import { useCms } from "@/lib/adminStore";

import { useRole } from "@/hooks/useRole";



import ArticleComments from "/workspaces/mizandigital/src/components/common/ArticleComments.tsx";



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



function renderContent(md: string, lang: Lang) {

  return md.split("\n").map((line, i) => {

    if (line.startsWith("## ")) return <h2 key={i} className="text-xl font-bold text-foreground mt-8 mb-4" style={{ fontFamily: serifFont(lang) }}>{line.slice(3)}</h2>;

    if (line.startsWith("### ")) return <h3 key={i} className="text-base font-bold text-foreground mt-6 mb-3" style={{ fontFamily: serifFont(lang) }}>{line.slice(4)}</h3>;

    if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-bold text-foreground mt-4 mb-1" style={{ fontFamily: sansFont(lang) }}>{line.slice(2, -2)}</p>;

    if (line.startsWith("- ")) return <li key={i} className="text-slate-700 dark:text-slate-300 mb-1 mr-4" style={{ fontFamily: sansFont(lang) }}>{line.slice(2)}</li>;

    if (line.match(/^\d+\./)) return <li key={i} className="text-slate-700 dark:text-slate-300 mb-1 mr-4 list-decimal" style={{ fontFamily: sansFont(lang) }}>{line.replace(/^\d+\.\s/, "")}</li>;

    if (line.trim() === "") return <div key={i} className="h-2" />;

    return <p key={i} className="text-slate-700 dark:text-slate-300 leading-relaxed mb-2" style={{ fontFamily: sansFont(lang) }}>{line}</p>;

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



// Secure Isolated Ad Banner Component for Standard & Guest Users

function SecuredAdBanner({ slot, lang, isSidebar = false }: { slot: string; lang: Lang; isSidebar?: boolean }) {

  const localizedPath = useLocalizedPath();



  const handleAdClick = (adId: string) => {

    trackEvent("ad_click", { slot, ad_id: adId });

  };



  return (

    <aside

      aria-label="Advertisement"

      className={`my-6 p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 text-center relative overflow-hidden transition-all ${

        isSidebar ? "text-xs" : "text-sm"

      }`}

    >

      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-amber-200/50 dark:border-amber-800/30 text-[10px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-400">

        <span>{lang === "ar" ? "إعلان ممول" : lang === "fr" ? "Sponsorisé" : "Sponsored"}</span>

        <span className="flex items-center gap-1 opacity-80">

          <ShieldCheck size={11} aria-hidden="true" />

          {lang === "ar" ? "آمن" : "Secure"}

        </span>

      </div>



      <div className="space-y-2 my-2">

        <p className="font-bold text-amber-950 dark:text-amber-200 leading-snug">

          {lang === "ar"

            ? "انضم إلى مجتمع ميزان الرقمي وتابع أحدث البحوث والملخصات القانونية!"

            : lang === "fr"

            ? "Rejoignez Mizan Digital et suivez les dernières publications juridiques !"

            : "Join Mizan Digital and get unlimited access to verified legal research!"}

        </p>

      </div>



      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">

        <Link

          to={localizedPath("/register")}

          onClick={() => handleAdClick("register_promo")}

          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 text-white font-semibold text-xs hover:bg-amber-700 transition-colors shadow-sm"

        >

          <UserPlus size={13} aria-hidden="true" />

          <span>{lang === "ar" ? "إنشاء حساب مجاني" : lang === "fr" ? "Créer un compte" : "Create Free Account"}</span>

        </Link>

      </div>

    </aside>

  );

}



export default function ArticleDetail() {

  const { slug } = useParams<{ slug: string }>();

  const localizedPath = useLocalizedPath();

  const { lang, dir, t } = useI18n();

  const cms = useCms();

  const { isStaff, isGuest } = useRole();

  const [article, setArticle] = useState<Article>(MOCK);

  const [loading, setLoading] = useState(true);

  const [liked, setLiked] = useState(false);

  const [saved, setSaved] = useState(false);

  const [likes, setLikes] = useState(342);



  // CMS-authored article with matching slug takes priority

  const cmsArticle = cms.articles.find((a) => a.slug === slug);

  const commentsEnabled = cmsArticle ? cmsArticle.commentsEnabled !== false : true;



  const toggleLike = () => {

    setLiked((v) => {

      const next = !v;

      setLikes((c) => c + (next ? 1 : -1));

      trackEvent(next ? "article_like" : "article_unlike", { id: article.id });

      return next;

    });

  };



  const toggleSave = () => {

    setSaved((v) => {

      trackEvent(!v ? "article_save" : "article_unsave", { id: article.id });

      return !v;

    });

  };



  useEffect(() => {

    if (!slug) return;

    setLoading(true);

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

      .then((data) => {

        setArticle(data);

        trackArticleRead(data.id, data.title, data.category);

      })

      .catch(() => {

        setArticle({ ...MOCK, slug: slug || MOCK.slug });

      })

      .finally(() => setLoading(false));

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [slug, cmsArticle?.id]);



  const isBot = isSearchEngineBot();

  // Guest users must sign in to see locked portions; bots and registered users are granted full read access

  const isLocked = isGuest && !isBot;



  const contentFragments = useMemo(() => {

    const raw = article.content || article.excerpt || "";

    if (!raw) return { preview: "", locked: "", isHtml: false };

    if (isHtml(raw)) {

      return { ...splitHtmlContent(raw), isHtml: true };

    }

    return { ...splitMarkdownContent(raw), isHtml: false };

  }, [article.content, article.excerpt]);



  // SEO structured data

  useEffect(() => {

    setArticleSchema({

      title: article.title,

      description: article.excerpt || article.title,

      slug: article.slug,

      author: article.author,

      datePublished: article.created_at,

      category: article.category,

      schemaType: "LegalArticle",

      lang,

      path: `/article/${article.slug}`,

    });

    setBreadcrumbSchema([

      { name: lang === "ar" ? "الرئيسية" : lang === "fr" ? "Accueil" : "Home", url: "/" },

      { name: lang === "ar" ? "المكتبة" : lang === "fr" ? "Bibliothèque" : "Library", url: "/library" },

      { name: article.title, url: `/article/${article.slug}` },

    ]);

    return () => {

      clearSchema("ld-article");

      clearSchema("ld-breadcrumb");

    };

  }, [article, lang]);



  const handlePDF = () => {

    if (article.pdf_url) trackPDFDownload(article.id, article.title);

  };



  const arrowFlip = dir === "rtl" ? "rotate-180" : "";



  if (loading)

    return (

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-4">

        {[...Array(6)].map((_, i) => (

          <div key={i} className={`h-6 rounded bg-slate-100 dark:bg-slate-800 animate-pulse ${i === 0 ? "w-3/4" : i === 1 ? "w-1/2" : "w-full"}`} />

        ))}

      </div>

    );



  return (

    <div className="max-w-7xl mx-auto px-6 py-10">

      <div className="grid lg:grid-cols-[1fr_280px] gap-10" dir={dir}>

        {/* Main Article Section */}

        <article>

          {/* Breadcrumbs */}

          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-6" style={{ fontFamily: sansFont(lang) }}>

            <Link to={localizedPath("/")} className="hover:text-primary transition-colors">

              {lang === "ar" ? "الرئيسية" : lang === "fr" ? "Accueil" : "Home"}

            </Link>

            <ArrowRight size={11} className={arrowFlip} aria-hidden="true" />

            <Link to={localizedPath("/library")} className="hover:text-primary transition-colors">

              {lang === "ar" ? "المكتبة" : lang === "fr" ? "Bibliothèque" : "Library"}

            </Link>

            <ArrowRight size={11} className={arrowFlip} aria-hidden="true" />

            <span className="text-foreground line-clamp-1">{article.title}</span>

          </nav>



          {/* Meta Badges */}

          <div className="flex flex-wrap items-center gap-2 mb-4">

            <Link

              to={localizedPath(`/library?category=${encodeURIComponent(article.category)}`)}

              className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"

            >

              {article.category}

            </Link>

            {article.semester && (

              <span className="text-xs font-mono border border-border px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-300">

                {article.semester.toUpperCase()}

              </span>

            )}

            {article.year && (

              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">

                {article.year}

              </span>

            )}

          </div>



          <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight mb-4" style={{ fontFamily: serifFont(lang) }}>

            {article.title}

          </h1>



          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-6 pb-6 border-b border-border">

            {article.author && (

              <span className="flex items-center gap-1">

                <BookOpen size={12} aria-hidden="true" />

                {article.author}

              </span>

            )}

            {article.university && (

              <span className="flex items-center gap-1">

                <GraduationCap size={12} aria-hidden="true" />

                {article.university}

              </span>

            )}

            <span className="flex items-center gap-1">

              <Clock size={12} aria-hidden="true" />

              {new Date(article.created_at).toLocaleDateString(lang === "ar" ? "ar-MA" : "en-US")}

            </span>

            <span className="flex items-center gap-1">

              <Eye size={12} aria-hidden="true" />

              {article.views.toLocaleString()} {t("reads")}

            </span>

          </div>



          {/* Article Content */}

          <div className="prose-container rte-content leading-loose text-base">

            {contentFragments.preview ? (

              contentFragments.isHtml ? renderHtmlSnippet(contentFragments.preview) : renderContent(contentFragments.preview, lang)

            ) : (

              <p className="text-slate-600 dark:text-slate-300" style={{ fontFamily: sansFont(lang) }}>

                {article.excerpt}

              </p>

            )}



            {/* Ads displayed only to non-staff users */}

            {!isStaff && <SecuredAdBanner slot="in_article_preview" lang={lang} />}



            {contentFragments.locked ? (

              <div className="premium-content-section relative mt-6">

                {isLocked ? (

                  <>

                    <div className="pointer-events-none select-none blur-sm">

                      {contentFragments.isHtml ? renderHtmlSnippet(contentFragments.locked) : renderContent(contentFragments.locked, lang)}

                    </div>

                    <div className="absolute inset-0 flex items-center justify-center p-6 bg-gradient-to-t from-background/95 via-background/80 to-transparent">

                      <div className="max-w-md rounded-3xl border border-border bg-card/95 p-6 shadow-xl text-center backdrop-blur-sm">

                        <p className="text-sm font-semibold text-foreground mb-4" style={{ fontFamily: sansFont(lang) }}>

                          {lang === "ar"

                            ? "المحتوى الكامل متاح للأعضاء. قم بتسجيل الدخول أو إنشاء حساب مجاني للوصول إلى بقية النص."

                            : lang === "fr"

                            ? "Le contenu complet est réservé aux membres. Connectez-vous ou créez un compte gratuit."

                            : "Full content is reserved for members. Sign in or create a free account to continue reading."}

                        </p>

                        <div className="flex flex-wrap items-center justify-center gap-3">

                          <Link

                            to={localizedPath("/login")}

                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors min-h-[44px]"

                            style={{ fontFamily: sansFont(lang) }}

                          >

                            {lang === "ar" ? "تسجيل الدخول" : lang === "fr" ? "Se connecter" : "Sign In"}

                          </Link>

                          <Link

                            to={localizedPath("/register")}

                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-border bg-card text-foreground text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px]"

                            style={{ fontFamily: sansFont(lang) }}

                          >

                            {lang === "ar" ? "حساب جديد" : lang === "fr" ? "Créer un compte" : "Register"}

                          </Link>

                        </div>

                      </div>

                    </div>

                  </>

                ) : (

                  contentFragments.isHtml ? renderHtmlSnippet(contentFragments.locked) : renderContent(contentFragments.locked, lang)

                )}

              </div>

            ) : null}

          </div>



          {/* Article Tags */}

          {article.tags?.length ? (

            <div className="flex flex-wrap items-center gap-2 mt-10 pt-6 border-t border-border">

              <Tag size={13} className="text-slate-500 dark:text-slate-400" aria-hidden="true" />

              {article.tags.map((tag) => (

                <Link

                  key={tag}

                  to={localizedPath(`/search?q=${encodeURIComponent(tag)}`)}

                  className="text-xs px-2.5 py-1 rounded-full border border-border text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition-colors"

                  style={{ fontFamily: sansFont(lang) }}

                >

                  {tag}

                </Link>

              ))}

            </div>

          ) : null}



          {/* Comments Component */}

          <ArticleComments articleId={article.id} enabled={commentsEnabled} />

        </article>



        {/* Sticky Sidebar */}

        <aside className="space-y-4 lg:sticky lg:top-24 self-start">

          {article.pdf_url && (

            <a

              href={article.pdf_url}

              onClick={handlePDF}

              className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors text-sm shadow-sm min-h-[44px]"

              style={{ fontFamily: sansFont(lang) }}

            >

              <Download size={16} aria-hidden="true" /> {lang === "ar" ? "تحميل PDF" : lang === "fr" ? "Télécharger PDF" : "Download PDF"}

            </a>

          )}

          <div className="grid grid-cols-2 gap-2">

            <button

              onClick={toggleLike}

              aria-pressed={liked}

              className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-medium border transition-colors min-h-[44px] ${

                liked

                  ? "bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"

                  : "border-border text-slate-700 dark:text-slate-300 hover:border-primary hover:text-primary"

              }`}

              style={{ fontFamily: sansFont(lang) }}

            >

              <Heart size={15} className={liked ? "fill-red-500 text-red-500" : ""} aria-hidden="true" />

              <span>{likes.toLocaleString()}</span>

            </button>

            <button

              onClick={toggleSave}

              aria-pressed={saved}

              className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-medium border transition-colors min-h-[44px] ${

                saved

                  ? "bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200"

                  : "border-border text-slate-700 dark:text-slate-300 hover:border-primary hover:text-primary"

              }`}

              style={{ fontFamily: sansFont(lang) }}

            >

              <Bookmark size={15} className={saved ? "fill-current" : ""} aria-hidden="true" />

              <span>

                {saved

                  ? lang === "ar"

                    ? "محفوظ"

                    : lang === "fr"

                    ? "Enregistré"

                    : "Saved"

                  : lang === "ar"

                  ? "حفظ"

                  : lang === "fr"

                  ? "Enregistrer"

                  : "Save"}

              </span>

            </button>

          </div>



          

          {/* Sidebar Ad for standard/guest users */}

          {!isStaff && <SecuredAdBanner slot="sidebar" lang={lang} isSidebar />}



          {/* Document Meta Box */}

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">

            <h2 className="text-xs font-bold text-foreground mb-3 pb-2 border-b border-border" style={{ fontFamily: serifFont(lang) }}>

              {lang === "ar" ? "تفاصيل الوثيقة" : lang === "fr" ? "Détails du document" : "Document Details"}

            </h2>

            <dl className="space-y-2 text-xs" style={{ fontFamily: sansFont(lang) }}>

              {[

                [lang === "ar" ? "الفئة" : lang === "fr" ? "Catégorie" : "Category", article.category],

                [lang === "ar" ? "الجامعة" : lang === "fr" ? "Université" : "University", article.university],

                [lang === "ar" ? "الفصل" : lang === "fr" ? "Semestre" : "Semester", article.semester?.toUpperCase()],

                [lang === "ar" ? "السنة" : lang === "fr" ? "Année" : "Year", article.year?.toString()],

              ]

                .filter(([, v]) => v)

                .map(([k, v]) => (

                  <div key={k} className="flex justify-between items-center">

                    <dt className="text-slate-500 dark:text-slate-400">{k}</dt>

                    <dd className="font-medium text-foreground">{v}</dd>

                  </div>

                ))}

            </dl>

          </div>



          {/* Sidebar Newsletter */}

          <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl p-4 shadow-sm">

            <h3 className="text-xs font-bold text-blue-900 dark:text-blue-200 mb-2" style={{ fontFamily: serifFont(lang) }}>

              {t("newsletter_title")}

            </h3>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-2">

              <label htmlFor="sidebar-newsletter-email" className="sr-only">

                {t("newsletter_email")}

              </label>

              <input

                id="sidebar-newsletter-email"

                type="email"

                placeholder={t("newsletter_email")}

                aria-label={t("newsletter_email")}

                className={`w-full text-xs px-3 py-2 rounded-lg border border-border bg-card text-foreground outline-none focus:ring-2 focus:ring-primary ${

                  dir === "rtl" ? "text-right" : "text-left"

                }`}

                style={{ fontFamily: sansFont(lang) }}

              />

              <button

                type="submit"

                className="w-full py-2 bg-blue-900 dark:bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-950 dark:hover:bg-blue-700 transition-colors min-h-[36px]"

                style={{ fontFamily: sansFont(lang) }}

              >

                {t("newsletter_cta")}

              </button>

            </form>

          </div>

        </aside>

      </div>

    </div>

  );

} 

