import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { BookOpen, Download, FileText } from "lucide-react";

interface Article {
  id: string;
  title: string;
  category_slug: string;
  school_slug?: string;
  file_url?: string;
  author?: string;
}

export function Library() {
  const { lang = "ar" } = useParams();
  const { t } = useI18n();

  const [articles, setArticles] = useState<Article[]>([]);
  const [allArticlesForCount, setAllArticlesForCount] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Fetch all articles for accurate tab badge counts
  useEffect(() => {
    async function fetchAllForCounts() {
      const { data } = await supabase.from("articles").select("category_slug");
      if (data) setAllArticlesForCount(data as Article[]);
    }
    fetchAllForCounts();
  }, []);

  // Fetch articles based on filter and active language
  useEffect(() => {
    async function fetchDynamicArticles() {
      setLoading(true);

      let query = supabase.from("articles").select("*");

      if (selectedCategory !== "all") {
        query = query.eq("category_slug", selectedCategory);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Supabase articles error:", error.message);
      } else {
        setArticles(data || []);
      }
      setLoading(false);
    }

    fetchDynamicArticles();
  }, [selectedCategory, lang]);

  // Dynamic count helper
  const getCategoryCount = (slug: string) => {
    if (slug === "all") return allArticlesForCount.length || articles.length;
    return allArticlesForCount.filter((a) => a.category_slug === slug).length;
  };

  // Translations dictionary with fallbacks
  const translations = {
    title: t("library.title") || (lang === "fr" ? "Bibliothèque Numérique" : lang === "en" ? "Digital Library" : "المكتبة الرقمية"),
    subtitle: t("library.subtitle") || (lang === "fr" ? "Documents, recherches et ouvrages juridiques" : lang === "en" ? "Legal documents, research, and publications" : "الكتب والمجلات والأبحاث القانونية المتخصصة"),
    all: t("common.all") || (lang === "fr" ? "Tous" : lang === "en" ? "All" : "الكل"),
    civil: t("categories.civil") || (lang === "fr" ? "Droit Civil" : lang === "en" ? "Civil Law" : "القانون المدني"),
    commercial: t("categories.commercial") || (lang === "fr" ? "Droit Commercial" : lang === "en" ? "Commercial Law" : "القانون التجاري"),
    penal: t("categories.penal") || (lang === "fr" ? "Droit Pénal" : lang === "en" ? "Penal Law" : "القانون الجنائي"),
    loading: t("common.loading") || (lang === "fr" ? "Chargement..." : lang === "en" ? "Loading..." : "جاري التحميل..."),
    empty: t("library.empty") || (lang === "fr" ? "Aucun document trouvé" : lang === "en" ? "No documents found" : "لا توجد وثائق متاحة حالياً"),
    download: t("common.download") || (lang === "fr" ? "Télécharger" : lang === "en" ? "Download" : "تحميل المستند"),
    docCount: lang === "fr" ? "documents" : lang === "en" ? "documents" : "وثيقة",
  };

  const categories = [
    { slug: "all", label: translations.all },
    { slug: "civil", label: translations.civil },
    { slug: "commercial", label: translations.commercial },
    { slug: "penal", label: translations.penal },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="text-primary" size={28} />
            {translations.title} ({articles.length} {translations.docCount})
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {translations.subtitle}
          </p>
        </div>

        {/* Dynamic Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                selectedCategory === cat.slug
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-muted text-muted-foreground"
              }`}
            >
              <span>{cat.label}</span>
              <span className="opacity-75 text-[10px] px-1.5 py-0.2 bg-muted/40 rounded-full">
                {getCategoryCount(cat.slug)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">{translations.loading}</div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl p-8">
          {translations.empty}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((item) => (
            <div
              key={item.id}
              className="p-5 border border-border rounded-xl bg-card text-card-foreground shadow-sm hover:border-primary/50 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <span className="inline-block px-2.5 py-1 text-[11px] rounded-md bg-secondary text-secondary-foreground font-semibold">
                  {item.category_slug}
                </span>

                <h3 className="font-bold text-base leading-snug">{item.title}</h3>

                {item.author && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileText size={12} /> {item.author}
                  </p>
                )}
              </div>

              {item.file_url && (
                <a
                  href={item.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center justify-center gap-2 w-full py-2 bg-secondary hover:bg-primary hover:text-primary-foreground text-xs font-bold rounded-lg transition-colors"
                >
                  <Download size={14} /> {translations.download}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Library;