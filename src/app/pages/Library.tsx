import { useState, useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { Search, Filter, ArrowRight, FileText, Download, Clock, Eye } from "lucide-react";
import { getArticles, type Article } from "../lib/supabase";
import { useI18n, serifFont, sansFont, type Lang } from "../lib/i18n";
import { useSeo } from "../lib/seo";

type CategoryOption = {
  slug: string;
  label: Record<Lang, string>;
  count: number;
};

const CATEGORIES: CategoryOption[] = [
  {
    slug: "all",
    label: { ar: "الكل", fr: "Tous", en: "All", es: "Todos" },
    count: 480,
  },
  {
    slug: "family-law",
    label: { ar: "قانون الأسرة", fr: "Droit de la famille", en: "Family Law", es: "Derecho de familia" },
    count: 120,
  },
  {
    slug: "criminal-law",
    label: { ar: "القانون الجنائي", fr: "Droit pénal", en: "Criminal Law", es: "Derecho penal" },
    count: 95,
  },
  {
    slug: "commercial-law",
    label: { ar: "القانون التجاري", fr: "Droit commercial", en: "Commercial Law", es: "Derecho comercial" },
    count: 88,
  },
  {
    slug: "administrative-law",
    label: { ar: "القانون الإداري", fr: "Droit administratif", en: "Administrative Law", es: "Derecho administrativo" },
    count: 74,
  },
  {
    slug: "constitutional-law",
    label: { ar: "القانون الدستوري", fr: "Droit constitutionnel", en: "Constitutional Law", es: "Derecho constitucional" },
    count: 56,
  },
  {
    slug: "civil-law",
    label: { ar: "القانون المدني", fr: "Droit civil", en: "Civil Law", es: "Derecho civil" },
    count: 47,
  },
];

const MOCK: Article[] = [
  {
    id: "1",
    title: "أسئلة وأجوبة امتحان قانون الأسرة S1 — المغرب 2026",
    slug: "family-law-s1-2026",
    excerpt: "نماذج إجابات شاملة تغطي مدوّنة الأسرة: الزواج، الطلاق، النسب والحضانة.",
    category: "قانون الأسرة",
    views: 4200,
    is_featured: true,
    created_at: "2026-07-13T10:00:00Z",
    updated_at: "2026-07-13T10:00:00Z",
    pdf_url: "#",
  },
  {
    id: "2",
    title: "مستجدات قانون المسطرة الجنائية — تعديلات 2025",
    slug: "criminal-procedure-2025",
    excerpt: "تحليل معمّق للتعديلات الأخيرة على قانون المسطرة الجنائية المغربي.",
    category: "القانون الجنائي",
    views: 2800,
    is_featured: false,
    created_at: "2026-07-12T10:00:00Z",
    updated_at: "2026-07-12T10:00:00Z",
  },
  {
    id: "3",
    title: "عقد الشركة وإشكالاته القانونية في ضوء أحكام محكمة النقض",
    slug: "company-contract",
    excerpt: "دراسة مقارنة بين القانون المغربي والفرنسي في مجال عقود الشركات.",
    category: "القانون التجاري",
    views: 1500,
    is_featured: false,
    created_at: "2026-07-10T10:00:00Z",
    updated_at: "2026-07-10T10:00:00Z",
    pdf_url: "#",
  },
  {
    id: "4",
    title: "مبدأ المشروعية في القانون الإداري المغربي",
    slug: "legality-principle",
    excerpt: "رصد لأحدث اجتهادات المحكمة الإدارية العليا حول مبدأ المشروعية.",
    category: "القانون الإداري",
    views: 980,
    is_featured: false,
    created_at: "2026-07-08T10:00:00Z",
    updated_at: "2026-07-08T10:00:00Z",
  },
  {
    id: "5",
    title: "الحقوق الدستورية وضمانات الحرية في دستور 2011",
    slug: "constitutional-rights-2011",
    excerpt: "تحليل شامل لمقتضيات الفصل الثاني من دستور 2011 المتعلق بالحريات.",
    category: "القانون الدستوري",
    views: 760,
    is_featured: false,
    created_at: "2026-07-06T10:00:00Z",
    updated_at: "2026-07-06T10:00:00Z",
  },
  {
    id: "6",
    title: "نظرية العقد في القانون المدني المغربي",
    slug: "contract-theory-civil",
    excerpt: "دراسة تأصيلية لنظرية العقد في ظهير الالتزامات والعقود.",
    category: "القانون المدني",
    views: 640,
    is_featured: false,
    created_at: "2026-07-04T10:00:00Z",
    updated_at: "2026-07-04T10:00:00Z",
    pdf_url: "#",
  },
];

export default function Library() {
  const { category } = useParams();
  const [searchParams] = useSearchParams();
  const { lang, dir, t } = useI18n();

  const [articles, setArticles] = useState<Article[]>(MOCK);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState(searchParams.get("q") || "");
  const activeCategory = category || "all";

  const activeCategoryObj = CATEGORIES.find((c) => c.slug === activeCategory) || CATEGORIES[0];
  const activeCategoryLabel = activeCategoryObj.label[lang] || activeCategoryObj.label.ar;

  useSeo(
    {
      title: activeCategory === "all" ? t("library") : `${t("library")} - ${activeCategoryLabel}`,
      description: `${t("browse")} ${activeCategoryObj.count}+ ${t("legalDocs")}`,
      path: activeCategory === "all" ? "/library" : `/library/${activeCategory}`,
      lang,
    },
    [lang, activeCategory, activeCategoryLabel, t]
  );

  useEffect(() => {
    setLoading(true);
    const cat = activeCategory !== "all" ? activeCategory : undefined;
    getArticles({ category: cat, limit: 20 })
      .then((data) => {
        if (data?.length) setArticles(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeCategory]);

  const filtered = q
    ? articles.filter(
        (a) =>
          a.title.toLowerCase().includes(q.toLowerCase()) ||
          a.excerpt?.toLowerCase().includes(q.toLowerCase())
      )
    : articles;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10" dir={dir}>
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl md:text-3xl font-bold text-foreground mb-2"
          style={{ fontFamily: serifFont(lang) }}
        >
          {t("library")}
        </h1>
        <p
          className="text-slate-600 dark:text-slate-300 text-sm"
          style={{ fontFamily: sansFont(lang) }}
        >
          {lang === "ar" && `تصفّح ${activeCategoryObj.count}+ وثيقة قانونية مصنّفة حسب الفرع`}
          {lang === "fr" && `Parcourez plus de ${activeCategoryObj.count} documents juridiques classés par catégorie`}
          {lang === "en" && `Browse over ${activeCategoryObj.count} legal documents categorized by branch`}
          {lang === "es" && `Examine más de ${activeCategoryObj.count} documentos legales clasificados por categoría`}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar filters */}
        <aside className="lg:w-56 shrink-0">
          <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 sticky top-24 shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <Filter size={16} className="text-primary" aria-hidden="true" />
              <h2
                className="text-sm font-bold text-foreground"
                style={{ fontFamily: serifFont(lang) }}
              >
                {t("categories")}
              </h2>
            </div>
            <nav aria-label={t("categories")} className="space-y-1">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.slug;
                return (
                  <Link
                    key={cat.slug}
                    to={cat.slug === "all" ? "/library" : `/library/${cat.slug}`}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 font-semibold border border-blue-200 dark:border-blue-800"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                    style={{ fontFamily: sansFont(lang) }}
                  >
                    <span>{cat.label[lang] || cat.label.ar}</span>
                    <span className="text-xs text-slate-500 font-mono font-medium">
                      {cat.count}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {/* Search Bar with Accessibility Label */}
          <div className="relative mb-6">
            <label htmlFor="library-search-input" className="sr-only">
              {t("searchPlaceholder")}
            </label>
            <Search
              size={18}
              className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                dir === "rtl" ? "right-4" : "left-4"
              }`}
              aria-hidden="true"
            />
            <input
              id="library-search-input"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className={`w-full py-3 border border-border rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
                dir === "rtl" ? "pr-11 pl-4" : "pl-11 pr-4"
              }`}
              style={{ fontFamily: sansFont(lang) }}
            />
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="text-center py-20 text-slate-500 dark:text-slate-400 text-sm"
              style={{ fontFamily: sansFont(lang) }}
            >
              {t("noResults")}
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((article) => (
                <article
                  key={article.id}
                  className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {article.category}
                        </span>
                        {article.pdf_url && (
                          <span className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                            <FileText size={12} aria-hidden="true" /> PDF
                          </span>
                        )}
                      </div>
                      <Link to={`/article/${article.slug}`}>
                        <h3
                          className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 hover:text-primary transition-colors mb-2"
                          style={{ fontFamily: serifFont(lang) }}
                        >
                          {article.title}
                        </h3>
                      </Link>
                      <p
                        className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-3"
                        style={{ fontFamily: sansFont(lang) }}
                      >
                        {article.excerpt}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock size={12} aria-hidden="true" />
                          {new Date(article.created_at).toLocaleDateString(
                            lang === "ar" ? "ar-MA" : lang
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye size={12} aria-hidden="true" />
                          {article.views.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex sm:flex-col gap-2 shrink-0 pt-2 sm:pt-0">
                      <Link
                        to={`/article/${article.slug}`}
                        className="px-4 py-2.5 bg-blue-900 dark:bg-blue-600 hover:bg-blue-950 dark:hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 min-h-[40px]"
                        style={{ fontFamily: sansFont(lang) }}
                      >
                        {t("read")}
                        <ArrowRight
                          size={12}
                          className={dir === "rtl" ? "rotate-180" : ""}
                          aria-hidden="true"
                        />
                      </Link>
                      {article.pdf_url && (
                        <a
                          href={article.pdf_url}
                          className="px-4 py-2.5 border border-border text-xs text-slate-700 dark:text-slate-200 hover:border-primary hover:text-primary rounded-lg transition-colors flex items-center justify-center gap-1 font-medium min-h-[40px]"
                          style={{ fontFamily: sansFont(lang) }}
                        >
                          <Download size={12} aria-hidden="true" /> PDF
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}