// src/pages/ArticlesList.tsx
import React, { useState, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  Search,
  Eye,
  Calendar,
  GraduationCap,
  Landmark,
  Scale,
  ArrowLeft,
  ArrowRight,
  Newspaper,
  Tag,
} from "lucide-react";
import { useI18n, serifFont, sansFont, type Lang } from "../lib/i18n";
import { useCms } from "../lib/adminStore";

type CategorySlug = "all" | "schools" | "government" | "general";

const CATEGORIES = [
  {
    id: "all",
    path: "",
    label: { ar: "جميع الأخبار", fr: "Toutes les Actualités", en: "All News", es: "Todas las Noticias" },
    icon: Newspaper,
  },
  {
    id: "schools",
    path: "schools",
    label: { ar: "أخبار الكليات والجامعات", fr: "Actualités Universitaires", en: "University & Law Schools", es: "Noticias Universitarias" },
    icon: GraduationCap,
  },
  {
    id: "government",
    path: "government",
    label: { ar: "المستجدات التشريعية والحكومية", fr: "Mises à jour Législatives", en: "Government & Legal Updates", es: "Novedades Legislativas" },
    icon: Landmark,
  },
  {
    id: "general",
    path: "general",
    label: { ar: "أخبار قانونية عامة", fr: "Actualités Juridiques Générales", en: "General Legal News", es: "Noticias Jurídicas Generales" },
    icon: Scale,
  },
] as const;

const LABELS = {
  title: { ar: "مركز الأخبار والمستجدات", fr: "Centre d'Actualités", en: "News & Updates Center", es: "Centro de Noticias" },
  subtitle: { ar: "تصفح أحدث الأخبار الجامعية، والمستجدات التشريعية، والقضايا القانونية", fr: "Parcourez les dernières actualités universitaires et législatives", en: "Browse the latest academic, legislative, and legal developments", es: "Explore las últimas novedades académicas y legislativas" },
  searchPlaceholder: { ar: "البحث في الأخبار والمقالات...", fr: "Rechercher des articles...", en: "Search news & articles...", es: "Buscar noticias..." },
  noArticles: { ar: "لا توجد مقالات متاحة حالياً في هذا التصنيف.", fr: "Aucun article disponible dans cette catégorie.", en: "No articles available in this category.", es: "No hay artículos disponibles en esta categoría." },
  readMore: { ar: "اقرأ المزيد", fr: "Lire la suite", en: "Read More", es: "Leer más" },
  uncategorized: { ar: "عام", fr: "Général", en: "General", es: "General" }
} as const;

function getLabel(key: keyof typeof LABELS, lang: Lang): string {
  return LABELS[key]?.[lang] || LABELS[key]?.en || "";
}

export default function ArticlesList() {
  const { lang, dir } = useI18n();
  const cms = useCms();
  const navigate = useNavigate();
  const { category: currentCategoryParam } = useParams<{ category?: string }>();

  const [searchQuery, setSearchQuery] = useState("");

  // Determine active category from route param (/news/schools -> "schools")
  const activeCategory: CategorySlug = useMemo(() => {
    const cat = (currentCategoryParam || "all").toLowerCase();
    if (["schools", "government", "general"].includes(cat)) {
      return cat as CategorySlug;
    }
    return "all";
  }, [currentCategoryParam]);

  // Navigate when clicking tabs
  const handleCategoryClick = (catId: CategorySlug) => {
    if (catId === "all") {
      navigate(`/${lang}/news`);
    } else {
      navigate(`/${lang}/news/${catId}`);
    }
  };

  const articles = cms?.articles || [];

  // Filter published articles matching Category + Search
  const filteredArticles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return articles.filter((article) => {
      const isPublished = article.status === "published";
      const artCat = (article.category || "").toLowerCase();

      // Flexible Category Matcher
      const matchesCategory =
        activeCategory === "all" ||
        artCat.includes(activeCategory) ||
        (activeCategory === "schools" && (artCat.includes("جامع") || artCat.includes("كلي") || artCat.includes("school") || artCat.includes("univ"))) ||
        (activeCategory === "government" && (artCat.includes("تشريع") || artCat.includes("حكوم") || artCat.includes("gov") || artCat.includes("law"))) ||
        (activeCategory === "general" && (artCat.includes("عام") || artCat.includes("general")));

      // Guard against null/undefined fields during search match
      const titleMatch = (article.title || "").toLowerCase().includes(query);
      const categoryMatch = artCat.includes(query);
      const authorMatch = (article.author || "").toLowerCase().includes(query);

      const matchesSearch = !query || titleMatch || categoryMatch || authorMatch;

      return isPublished && matchesCategory && matchesSearch;
    });
  }, [articles, activeCategory, searchQuery]);

  return (
    <div
      className="min-h-screen bg-background text-foreground py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8"
      dir={dir}
      style={{ fontFamily: sansFont(lang) }}
    >
      {/* Header */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <h1
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight"
          style={{ fontFamily: serifFont(lang) }}
        >
          {getLabel("title", lang)}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          {getLabel("subtitle", lang)}
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                  : "bg-card text-muted-foreground border border-border hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon size={16} />
              <span>{cat.label[lang as Lang] || cat.label.en}</span>
            </button>
          );
        })}
      </div>

      {/* Search Input using Logical Utilities */}
      <div className="max-w-md mx-auto relative">
        <Search
          size={18}
          className="absolute top-1/2 -translate-y-1/2 start-4 text-muted-foreground pointer-events-none"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={getLabel("searchPlaceholder", lang)}
          className="w-full text-sm ps-11 pe-4 py-3 rounded-2xl border border-border bg-card text-foreground shadow-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      {/* Articles Grid */}
      {filteredArticles.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <p className="text-muted-foreground text-sm font-medium">
            {getLabel("noArticles", lang)}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article) => (
            <Link
              key={article.id}
              to={`/${lang}/article/${article.slug || article.id}`}
              className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Cover Image */}
                {article.coverImage && (
                  <div className="h-48 w-full overflow-hidden bg-muted relative">
                    <img
                      src={article.coverImage}
                      alt={article.imageAlt || article.title || "Article Image"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}

                <div className="p-5 space-y-3">
                  {/* Category Tag */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                    <Tag size={12} />
                    <span>{article.category || getLabel("uncategorized", lang)}</span>
                  </div>

                  {/* Title */}
                  <h2
                    className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug"
                    style={{ fontFamily: serifFont(lang) }}
                  >
                    {article.title}
                  </h2>

                  {/* Excerpt */}
                  {article.excerpt && (
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {article.excerpt}
                    </p>
                  )}
                </div>
              </div>

              {/* Meta Footer */}
              <div className="p-5 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground font-mono">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Calendar size={13} />
                    {article.updated || "2026"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye size={13} />
                    {(article.views || 0).toLocaleString()}
                  </span>
                </div>

                <span className="flex items-center gap-1 text-primary font-sans font-semibold group-hover:underline">
                  <span>{getLabel("readMore", lang)}</span>
                  {dir === "rtl" ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
