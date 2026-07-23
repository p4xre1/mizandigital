import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useI18n, serifFont, sansFont, type Lang } from "@/lib/i18n";
import {
  BookOpen,
  Download,
  FileText,
  Search,
  Scale,
  FolderOpen,
  Gavel,
  ShieldAlert,
  Building2,
  Landmark,
  Scroll,
  FileCheck2,
  BookMarked,
  Newspaper,
  Layers,
  Sparkles,
} from "lucide-react";

interface Article {
  id: string;
  title: string;
  category_slug: string;
  doc_type_slug?: string;
  school_slug?: string;
  file_url?: string;
  author?: string;
}

const VALID_LANGS: Lang[] = ["ar", "fr", "en", "es"];

function isValidLang(langStr: string | undefined): langStr is Lang {
  return typeof langStr === "string" && VALID_LANGS.includes(langStr as Lang);
}

export function Library() {
  const params = useParams();
  const { lang: contextLang, dir, t } = useI18n();

  const lang: Lang = isValidLang(params.lang)
    ? params.lang
    : contextLang || "ar";

  const [articles, setArticles] = useState<Article[]>([]);
  const [allArticlesForCount, setAllArticlesForCount] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selected category state ('all' or specific slug)
  const [selectedSlug, setSelectedSlug] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Define Category Taxonomy (Fields of Law & Document Types)
  const taxonomy = useMemo(() => {
    return [
      {
        sectionId: "fields_of_law",
        title: {
          ar: "مجالات القانون",
          fr: "Domaines du Droit",
          en: "Fields of Law",
          es: "Campos del Derecho",
        },
        icon: Scale,
        items: [
          {
            slug: "family",
            icon: HeartHandshakeIcon,
            label: {
              ar: "قانون الأسرة / المدونة",
              fr: "Droit de la Famille / Moudawana",
              en: "Family Law / Moudawana",
              es: "Derecho de Familia",
            },
          },
          {
            slug: "criminal",
            icon: ShieldAlert,
            label: {
              ar: "القانون الجنائي",
              fr: "Droit Pénal",
              en: "Criminal Law",
              es: "Derecho Penal",
            },
          },
          {
            slug: "commercial",
            icon: Building2,
            label: {
              ar: "القانون التجاري",
              fr: "Droit Commercial",
              en: "Commercial Law",
              es: "Derecho Commercial",
            },
          },
          {
            slug: "administrative",
            icon: Landmark,
            label: {
              ar: "القانون الإداري",
              fr: "Droit Administratif",
              en: "Administrative Law",
              es: "Derecho Administrativo",
            },
          },
          {
            slug: "constitutional",
            icon: Scroll,
            label: {
              ar: "القانون الدستوري",
              fr: "Droit Constitutionnel",
              en: "Constitutional Law",
              es: "Derecho Constitucional",
            },
          },
        ],
      },
      {
        sectionId: "document_types",
        title: {
          ar: "أنواع الوثائق",
          fr: "Types de Documents",
          en: "Document Types",
          es: "Tipos de Documentos",
        },
        icon: FolderOpen,
        items: [
          {
            slug: "legal_texts",
            icon: FileText,
            label: {
              ar: "النصوص القانونية / القوانين",
              fr: "Textes Juridiques / Lois",
              en: "Legal Texts / Laws",
              es: "Textos Legales / Leyes",
            },
          },
          {
            slug: "ministerial_decrees",
            icon: FileCheck2,
            label: {
              ar: "المراسيم والقرارات الوزارية",
              fr: "Décrets Ministériels",
              en: "Ministerial Decrees",
              es: "Decretos Ministeriales",
            },
          },
          {
            slug: "cassation_rulings",
            icon: Gavel,
            label: {
              ar: "قرارات محكمة النقض",
              fr: "Arrêts de la Cour de Cassation",
              en: "Cassation Rulings",
              es: "Fallos de Casación",
            },
          },
          {
            slug: "official_journals",
            icon: Newspaper,
            label: {
              ar: "الجريدة الرسمية",
              fr: "Journaux Officiels",
              en: "Official Journals",
              es: "Boletines Oficiales",
            },
          },
        ],
      },
    ];
  }, []);

  // Fetch all items for counting
  useEffect(() => {
    async function fetchAllForCounts() {
      const { data, error } = await supabase.from("articles").select("*");
      if (error) {
        console.error("Supabase count fetch error:", error.message);
      } else if (data) {
        setAllArticlesForCount(data as Article[]);
      }
    }
    fetchAllForCounts();
  }, []);

  // Fetch filtered items
  useEffect(() => {
    async function fetchDynamicArticles() {
      setLoading(true);

      let query = supabase.from("articles").select("*");

      if (selectedSlug !== "all") {
        // Query matching category_slug or doc_type_slug
        query = query.or(
          `category_slug.eq.${selectedSlug},doc_type_slug.eq.${selectedSlug}`
        );
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
  }, [selectedSlug]);

  // Client search filter
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const q = searchQuery.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.author && a.author.toLowerCase().includes(q))
    );
  }, [articles, searchQuery]);

  // Count helper for badges
  const getItemCount = (slug: string) => {
    if (slug === "all") return allArticlesForCount.length || articles.length;
    return allArticlesForCount.filter(
      (a) => a.category_slug === slug || a.doc_type_slug === slug
    ).length;
  };

  // Label helper
  const getSlugLabel = (slug: string) => {
    for (const sec of taxonomy) {
      const found = sec.items.find((item) => item.slug === slug);
      if (found) return found.label[lang] || found.label.en;
    }
    return slug;
  };

  // Localized Strings
  const translations = {
    title:
      t("library.title") ||
      (lang === "fr"
        ? "Bibliothèque Numérique"
        : lang === "en"
        ? "Digital Library"
        : "المكتبة الرقمية"),
    subtitle:
      t("library.subtitle") ||
      (lang === "fr"
        ? "Explorez nos ressources juridiques, lois et jurisprudence"
        : lang === "en"
        ? "Explore our legal resources, statutes, and case law"
        : "المكتبة الرقمية للكتب، والمقالات، والأبحاث والقرارات القانونية"),
    searchPlaceholder:
      lang === "fr"
        ? "Rechercher par titre ou auteur..."
        : lang === "en"
        ? "Search by title or author..."
        : "البحث في العنوان أو اسم المؤلف...",
    allDocs:
      lang === "fr"
        ? "Toutes les ressources"
        : lang === "en"
        ? "All Resources"
        : "جميع الوثائق والمقالات",
    loading:
      t("common.loading") ||
      (lang === "fr" ? "Chargement..." : lang === "en" ? "Loading..." : "جاري التحميل..."),
    empty:
      t("library.empty") ||
      (lang === "fr"
        ? "Aucun document trouvé dans cette catégorie"
        : lang === "en"
        ? "No documents found in this section"
        : "لا توجد وثائق متاحة حالياً في هذا القسم"),
    download:
      t("common.download") ||
      (lang === "fr" ? "Télécharger" : lang === "en" ? "Download" : "تحميل المستند"),
    docCount:
      lang === "fr" ? "documents" : lang === "en" ? "documents" : "وثيقة",
  };

  return (
    <div
      className="max-w-7xl mx-auto p-4 md:p-6 space-y-8 text-foreground min-h-screen"
      dir={dir}
      style={{ fontFamily: sansFont(lang) }}
    >
      {/* Main Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1
            className="text-2xl md:text-3xl font-extrabold flex items-center gap-3"
            style={{ fontFamily: serifFont(lang) }}
          >
            <BookOpen className="text-primary shrink-0" size={32} />
            <span>{translations.title}</span>
            <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {filteredArticles.length} {translations.docCount}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {translations.subtitle}
          </p>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full md:w-80">
          <Search
            size={18}
            className="absolute top-1/2 -translate-y-1/2 ltr:left-3.5 rtl:right-3.5 text-muted-foreground pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={translations.searchPlaceholder}
            className="w-full text-sm ltr:pl-10 rtl:pr-10 ltr:pr-4 rtl:pl-4 py-2.5 rounded-2xl border border-border bg-card outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Sidebar / Navigation (Desktop Sidebar & Mobile Slide Bar) */}
        <aside className="lg:col-span-1 space-y-6 bg-card/60 p-4 rounded-2xl border border-border sticky top-20 shadow-sm">
          {/* "All Documents" Link */}
          <button
            onClick={() => setSelectedSlug("all")}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all border ${
              selectedSlug === "all"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background border-border hover:bg-muted text-foreground"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Layers size={16} />
              <span>{translations.allDocs}</span>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                selectedSlug === "all"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {getItemCount("all")}
            </span>
          </button>

          {/* Section 1: Fields of Law & Section 2: Document Types */}
          {taxonomy.map((sec) => {
            const SectionIcon = sec.icon;
            return (
              <div key={sec.sectionId} className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-2">
                  <SectionIcon size={16} className="text-primary" />
                  <span>{sec.title[lang] || sec.title.en}</span>
                </div>

                <div className="space-y-1">
                  {sec.items.map((item) => {
                    const ItemIcon = item.icon;
                    const isActive = selectedSlug === item.slug;
                    const count = getItemCount(item.slug);

                    return (
                      <button
                        key={item.slug}
                        onClick={() => setSelectedSlug(item.slug)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all group ${
                          isActive
                            ? "bg-primary/10 text-primary font-bold border border-primary/20 shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <ItemIcon
                            size={15}
                            className={`shrink-0 transition-colors ${
                              isActive
                                ? "text-primary"
                                : "text-muted-foreground group-hover:text-foreground"
                            }`}
                          />
                          <span className="truncate">
                            {item.label[lang] || item.label.en}
                          </span>
                        </div>

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono shrink-0 ltr:ml-1 rtl:mr-1 ${
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted/80 text-muted-foreground"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </aside>

        {/* Content Area (Document Cards) */}
        <main className="lg:col-span-3 space-y-6">
          {/* Category Title Header */}
          <div className="flex items-center justify-between bg-card p-4 rounded-2xl border border-border shadow-xs">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-primary" />
              <h2
                className="text-base font-bold text-foreground"
                style={{ fontFamily: serifFont(lang) }}
              >
                {selectedSlug === "all"
                  ? translations.allDocs
                  : getSlugLabel(selectedSlug)}
              </h2>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {filteredArticles.length} {translations.docCount}
            </span>
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="text-center py-20 text-muted-foreground text-sm">
              {translations.loading}
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-2xl p-8 bg-card/40 space-y-3">
              <BookMarked size={40} className="mx-auto text-muted-foreground/40" />
              <p className="text-sm font-medium">{translations.empty}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredArticles.map((item) => (
                <div
                  key={item.id}
                  className="p-5 border border-border rounded-2xl bg-card text-card-foreground shadow-sm hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-block px-2.5 py-1 text-[11px] rounded-lg bg-secondary text-secondary-foreground font-semibold border border-border/50">
                        {getSlugLabel(item.category_slug || item.doc_type_slug || "legal")}
                      </span>
                    </div>

                    <h3
                      className="font-bold text-base leading-snug group-hover:text-primary transition-colors line-clamp-2"
                      style={{ fontFamily: serifFont(lang) }}
                    >
                      {item.title}
                    </h3>

                    {item.author && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <FileText size={13} className="shrink-0 text-muted-foreground/70" />
                        <span className="truncate">{item.author}</span>
                      </p>
                    )}
                  </div>

                  {item.file_url ? (
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 inline-flex items-center justify-center gap-2 w-full py-2.5 bg-secondary hover:bg-primary hover:text-primary-foreground text-xs font-bold rounded-xl transition-all shadow-xs active:scale-[0.98]"
                    >
                      <Download size={14} />
                      <span>{translations.download}</span>
                    </a>
                  ) : (
                    <div className="mt-5 pt-3 border-t border-border/40 text-[11px] text-muted-foreground italic text-center">
                      {lang === "fr"
                        ? "Document en consultation"
                        : lang === "en"
                        ? "Consultation mode"
                        : "متاح للقراءة والاطلاع"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// Fallback Heart Icon helper
function HeartHandshakeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

export default Library;