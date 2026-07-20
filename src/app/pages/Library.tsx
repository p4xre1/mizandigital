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
          className="text-muted-foreground text-sm"
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
          <div className="bg-white border border-border rounded-xl p-4 sticky top-24">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <Filter size={14} className="text-primary" />
              <span
                className="text-sm font-bold text-foreground"
                style={{ fontFamily: serifFont(lang) }}
              >
                {t("categories")}
              </span>
            </div>
            <nav className="space-y-1">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  to={cat.slug === "all" ? "/library" : `/library/${cat.slug}`}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeCategory === cat.slug
                      ? "bg-accent text-primary font-semibold"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  style={{ fontFamily: sansFont(lang) }}
                >
                  <span>{cat.label[lang] || cat.label.ar}</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {cat.count}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1">
          {/* Search bar */}
          <div className="relative mb-6">
            <Search
              size={16}
              className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground ${
                dir === "rtl" ? "right-4" : "left-4"
              }`}
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className={`w-full py-3 border border-border rounded-xl bg-white text-sm focus:outline-none focus:border-primary transition-colors ${
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
                  className="h-32 rounded-xl bg-gray-100 animate-pulse"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="text-center py-20 text-muted-foreground"
              style={{ fontFamily: sansFont(lang) }}
            >
              {t("noResults")}
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((article) => (
                <article
                  key={article.id}
                  className="bg-white border border-border rounded-xl p-5 hover:shadow-sm hover:border-blue-200 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent text-primary border border-blue-100">
                          {article.category}
                        </span>
                        {article.pdf_url && (
                          <span className="text-[11px] text-green-600 flex items-center gap-1 font-medium">
                            <FileText size={10} /> PDF
                          </span>
                        )}
                      </div>
                      <Link to={`/article/${article.slug}`}>
                        <h3
                          className="text-base font-bold text-foreground hover:text-primary transition-colors mb-1"
                          style={{ fontFamily: serifFont(lang) }}
                        >
                          {article.title}
                        </h3>
                      </Link>
                      <p
                        className="text-sm text-muted-foreground line-clamp-2 mb-3"
                        style={{ fontFamily: sansFont(lang) }}
                      >
                        {article.excerpt}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(article.created_at).toLocaleDateString(
                            lang === "ar" ? "ar-MA" : lang
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye size={11} />
                          {article.views.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Link
                        to={`/article/${article.slug}`}
                        className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                        style={{ fontFamily: sansFont(lang) }}
                      >
                        {t("read")}
                        <ArrowRight
                          size={11}
                          className={dir === "rtl" ? "rotate-180" : ""}
                        />
                      </Link>
                      {article.pdf_url && (
                        <a
                          href={article.pdf_url}
                          className="px-3 py-1.5 border border-border text-xs text-muted-foreground rounded-lg hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
                          style={{ fontFamily: sansFont(lang) }}
                        >
                          <Download size={11} /> PDF
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