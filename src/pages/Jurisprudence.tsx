import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { Scale, Download, Gavel } from "lucide-react";

interface JurisprudenceItem {
  id: string;
  title: string;
  category_slug?: string;
  case_number?: string;
  year?: number;
  summary?: string;
  file_url?: string;
}

export function Jurisprudence() {
  const { lang = "ar" } = useParams();
  const { t } = useI18n();

  const [items, setItems] = useState<JurisprudenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    async function fetchJurisprudence() {
      setLoading(true);

      let query = supabase.from("jurisprudence").select("*");

      if (selectedCategory !== "all") {
        query = query.eq("category_slug", selectedCategory);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Supabase jurisprudence error:", error.message);
      } else {
        setItems(data || []);
      }
      setLoading(false);
    }

    fetchJurisprudence();
  }, [selectedCategory, lang]);

  // Fallback translations dictionary if keys aren't in your main i18n file yet
  const translations = {
    title: t("jurisprudence.title") || (lang === "fr" ? "Jurisprudence" : lang === "en" ? "Jurisprudence" : "الاجتهاد القضائي"),
    subtitle: t("jurisprudence.subtitle") || (lang === "fr" ? "Décisions de justice et jurisprudence" : lang === "en" ? "Court rulings and legal precedents" : "الأحكام والقرارات القضائية والتطبيقات القانونية"),
    all: t("common.all") || (lang === "fr" ? "Tous" : lang === "en" ? "All" : "الكل"),
    civil: t("categories.civil") || (lang === "fr" ? "Droit Civil" : lang === "en" ? "Civil Law" : "القضاء المدني"),
    commercial: t("categories.commercial") || (lang === "fr" ? "Droit Commercial" : lang === "en" ? "Commercial Law" : "القضاء التجاري"),
    penal: t("categories.penal") || (lang === "fr" ? "Droit Pénal" : lang === "en" ? "Penal Law" : "القضاء الجنائي"),
    loading: t("common.loading") || (lang === "fr" ? "Chargement..." : lang === "en" ? "Loading..." : "جاري التحميل..."),
    empty: t("jurisprudence.empty") || (lang === "fr" ? "Aucune décision trouvée" : lang === "en" ? "No rulings found" : "لا توجد قرارات قضائية متاحة حالياً"),
    download: t("common.download") || (lang === "fr" ? "Télécharger (PDF)" : lang === "en" ? "Download (PDF)" : "تحميل القرار (PDF)"),
    year: lang === "fr" ? "Année" : lang === "en" ? "Year" : "سنة",
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="text-primary" size={28} />
            {translations.title} ({items.length})
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {translations.subtitle}
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {[
            { slug: "all", label: translations.all },
            { slug: "civil", label: translations.civil },
            { slug: "commercial", label: translations.commercial },
            { slug: "penal", label: translations.penal },
          ].map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                selectedCategory === cat.slug
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-muted text-muted-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">{translations.loading}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl p-8">
          {translations.empty}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-5 border border-border rounded-xl bg-card text-card-foreground shadow-sm hover:border-primary/50 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-primary">
                  <span className="flex items-center gap-1">
                    <Gavel size={14} /> {item.case_number || "---"}
                  </span>
                  {item.year && (
                    <span className="bg-muted px-2 py-0.5 rounded text-muted-foreground">
                      {translations.year} {item.year}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-base leading-snug">{item.title}</h3>

                {item.summary && (
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {item.summary}
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

export default Jurisprudence;