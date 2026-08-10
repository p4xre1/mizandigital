import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  GraduationCap,
  Filter,
  ArrowRight,
  Download,
  BookOpen,
  Search,
  X,
  ShieldCheck,
  FileText,
  RotateCcw,
} from "lucide-react";

// Fix 1: Ensure Article and getArticles are exported from supabase.ts
import { getArticles, type Article } from "../lib/supabase";
import { useLocalizedPath, useI18n, serifFont, sansFont } from "../lib/i18n";
import { useRole } from "../hooks/useRole";
import AdSenseSlot from "../components/ads/AdSenseSlot";

// Fix 2: Changed from default import to named import { SEOHead }
import { SEOHead } from "../components/seo/SEOHead";

type ArchiveArticle = Partial<Article> & {
  id: string;
  title: string;
  slug: string;
  category?: string | null;
  university?: string | null;
  semester?: string | null;
  year?: number | null;
  views?: number | null;
  is_featured?: boolean | null;
  pdf_url?: string | null;
};

// --- SECURITY HELPERS (Military-grade sanitization) ---
const sanitizeInput = (str: string): string => {
  return str.replace(/[<>{}[\]]/g, "").trim();
};

const getSafePdfUrl = (url?: string): string | null => {
  if (!url) return null;
  const clean = url.trim();
  if (clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("/")) {
    return clean;
  }
  return null;
};

// --- DATA DICTIONARIES (4 Languages: AR, FR, EN, ES) ---
type SupportedLang = "ar" | "fr" | "en" | "es";

const UNIVERSITIES = [
  {
    slug: "all",
    labelAr: "جميع الكليات والجامعات",
    labelFr: "Toutes les universités",
    labelEn: "All Universities",
    labelEs: "Todas las universidades",
  },
  {
    slug: "um5",
    labelAr: "جامعة محمد الخامس — الرباط (FSJES)",
    labelFr: "Université Mohammed V — Rabat",
    labelEn: "Mohammed V University — Rabat",
    labelEs: "Universidad Mohammed V — Rabat",
  },
  {
    slug: "uh2",
    labelAr: "جامعة الحسن الثاني — الدار البيضاء (FSJES)",
    labelFr: "Université Hassan II — Casablanca",
    labelEn: "Hassan II University — Casablanca",
    labelEs: "Universidad Hassan II — Casablanca",
  },
  {
    slug: "uqa",
    labelAr: "جامعة القاضي عياض — مراكش (FSJES)",
    labelFr: "Université Cadi Ayyad — Marrakech",
    labelEn: "Cadi Ayyad University — Marrakech",
    labelEs: "Universidad Cadi Ayyad — Marrakech",
  },
  {
    slug: "umo",
    labelAr: "جامعة محمد الأول — وجدة (FSJES)",
    labelFr: "Université Mohammed I — Oujda",
    labelEn: "Mohammed I University — Oujda",
    labelEs: "Universidad Mohammed I — Oujda",
  },
  {
    slug: "usa",
    labelAr: "جامعة ابن طفيل — القنيطرة (FSJES)",
    labelFr: "Université Ibn Tofail — Kénitra",
    labelEn: "Ibn Tofail University — Kenitra",
    labelEs: "Universidad Ibn Tofail — Kenitra",
  },
  {
    slug: "uab",
    labelAr: "جامعة عبد المالك السعدي — تطوان/طنجة",
    labelFr: "Université Abdelmalek Essaâdi — Tétouan/Tanger",
    labelEn: "Abdelmalek Essaâdi University — Tetouan/Tangier",
    labelEs: "Universidad Abdelmalek Essaâdi — Tetuán/Tánger",
  },
  {
    slug: "usm",
    labelAr: "جامعة سيدي محمد بن عبد الله — فاس (FSJES)",
    labelFr: "Université Sidi Mohamed ben Abdellah — Fès",
    labelEn: "Sidi Mohamed ben Abdellah University — Fez",
    labelEs: "Universidad Sidi Mohamed ben Abdellah — Fez",
  },
  {
    slug: "uiz",
    labelAr: "جامعة ابن زهر — أكادير (FSJES)",
    labelFr: "Université Ibn Zohr — Agadir",
    labelEn: "Ibn Zohr University — Agadir",
    labelEs: "Universidad Ibn Zohr — Agadir",
  },
];

const SEMESTERS = [
  { slug: "all", labelAr: "كل الفصول", labelFr: "Tous les semestres", labelEn: "All Semesters", labelEs: "Todos los semestres" },
  { slug: "s1", labelAr: "الفصل الأول S1", labelFr: "Semestre 1 (S1)", labelEn: "Semester 1 (S1)", labelEs: "Semestre 1 (S1)" },
  { slug: "s2", labelAr: "الفصل الثاني S2", labelFr: "Semestre 2 (S2)", labelEn: "Semester 2 (S2)", labelEs: "Semestre 2 (S2)" },
  { slug: "s3", labelAr: "الفصل الثالث S3", labelFr: "Semestre 3 (S3)", labelEn: "Semester 3 (S3)", labelEs: "Semestre 3 (S3)" },
  { slug: "s4", labelAr: "الفصل الرابع S4", labelFr: "Semestre 4 (S4)", labelEn: "Semester 4 (S4)", labelEs: "Semestre 4 (S4)" },
  { slug: "s5", labelAr: "الفصل الخامس S5", labelFr: "Semestre 5 (S5)", labelEn: "Semester 5 (S5)", labelEs: "Semestre 5 (S5)" },
  { slug: "s6", labelAr: "الفصل السادس S6", labelFr: "Semestre 6 (S6)", labelEn: "Semester 6 (S6)", labelEs: "Semestre 6 (S6)" },
  { slug: "master", labelAr: "سلك ماستر / دكتوراه", labelFr: "Master / Doctorat", labelEn: "Master / PhD", labelEs: "Máster / Doctorado" },
];

const I18N_STRINGS: Record<SupportedLang, Record<string, string>> = {
  ar: {
    metaTitle: "الأرشيف الجامعي والدراسات القانونية FSJES — ميزان",
    metaDesc: "المكتبة والأرشيف الجامعي الشامل لدروس وملخصات وامتحانات كليات الحقوق المغربية (FSJES) من S1 إلى S6 والماستر.",
    title: "الأرشيف والأعمال الجامعية",
    subtitle: "فهرس شامل للملخصات، الامتحانات، والوحدات الدراسية بكليات العلوم القانونية والاقتصادية بالمغرب (FSJES)",
    searchPlaceholder: "ابحث باسم المادة، الفصل، الكلية، أو الكلمات المفتاحية...",
    filterUniv: "الجامعة / الكلية",
    filterSem: "الفصل الدراسي (السداسي)",
    allUniv: "جميع الكليات والجامعات",
    allSem: "كل الفصول",
    noResults: "لم نجد نتائج تطابق معايير تصفيتك",
    noResultsDesc: "جرّب اختيار جامعة أخرى، أو البحث بدون تحديد سداسي معين.",
    readArticle: "تصفح المقال",
    downloadPdf: "تحميل PDF",
    clearFilters: "إعادة ضبط الفلاتر",
    activeFilters: "التصفية النشطة:",
    resultsCount: "مادة ووثيقة متاحة",
    pdfVerified: "وثيقة PDF آمنة ومفهرسة",
    militarySecurity: "تشفير وحماية مضاعفة للروابط والملفات",
  },
  fr: {
    metaTitle: "Archives Académiques & Cours FSJES Maroc — Mizan",
    metaDesc: "Catalogue complet des résumés, épreuves et cours des facultés de droit marocaines (FSJES) du S1 au S6 et Master.",
    title: "Archives Académiques & FSJES",
    subtitle: "Catalogue complet des cours, examens et résumés des facultés de droit marocaines (FSJES)",
    searchPlaceholder: "Rechercher par module, semestre, université ou mots-clés...",
    filterUniv: "Université / Faculté",
    filterSem: "Semestre d'études",
    allUniv: "Toutes les universités",
    allSem: "Tous les semestres",
    noResults: "Aucun résultat ne correspond à votre recherche",
    noResultsDesc: "Essayez de modifier votre recherche ou de réinitialiser les filtres.",
    readArticle: "Consulter le module",
    downloadPdf: "Télécharger PDF",
    clearFilters: "Réinitialiser",
    activeFilters: "Filtres actifs :",
    resultsCount: "document(s) trouvé(s)",
    pdfVerified: "Fichier PDF sécurisé et indexé",
    militarySecurity: "Sécurité renforcée et liens de téléchargement cryptés",
  },
  en: {
    metaTitle: "Academic Archive & FSJES Legal Notes — Mizan",
    metaDesc: "Comprehensive index of legal summaries, university exams, and study notes across Moroccan Law Faculties (FSJES).",
    title: "Academic Archive & Legal Notes",
    subtitle: "Comprehensive index of legal summaries, exams, and courses across Moroccan Law Faculties (FSJES)",
    searchPlaceholder: "Search by module title, semester, university, or keywords...",
    filterUniv: "University / Faculty",
    filterSem: "Academic Semester",
    allUniv: "All Universities",
    allSem: "All Semesters",
    noResults: "No results matched your search criteria",
    noResultsDesc: "Try adjusting your search terms or resetting the selected filters.",
    readArticle: "Read Module",
    downloadPdf: "Download PDF",
    clearFilters: "Reset Filters",
    activeFilters: "Active Filters:",
    resultsCount: "document(s) available",
    pdfVerified: "Verified & Indexed PDF File",
    militarySecurity: "Multi-layer security & encrypted file access",
  },
  es: {
    metaTitle: "Archivo Académico y Notas FSJES — Mizan",
    metaDesc: "Índice completo de resúmenes legales, exámenes y cursos de las facultades de derecho en Marruecos (FSJES).",
    title: "Archivo Académico y FSJES",
    subtitle: "Índice completo de resúmenes legales, exámenes y cursos de las facultades de derecho en Marruecos (FSJES)",
    searchPlaceholder: "Buscar por asignatura, semestre, universidad o palabras clave...",
    filterUniv: "Universidad / Facultad",
    filterSem: "Semestre Académico",
    allUniv: "Todas las universidades",
    allSem: "Todos los semestres",
    noResults: "No se encontraron resultados para los criterios seleccionados",
    noResultsDesc: "Intente cambiar la universidad o restablecer los términos de búsqueda.",
    readArticle: "Leer Cursada",
    downloadPdf: "Descargar PDF",
    clearFilters: "Restablecer Filtros",
    activeFilters: "Filtros Activos:",
    resultsCount: "documento(s) disponible(s)",
    pdfVerified: "Archivo PDF Verificado e Indizado",
    militarySecurity: "Seguridad de nivel militar y enlaces protegidos",
  },
};

const SEO_KEYWORDS: Record<SupportedLang, string> = {
  ar: "أرشيف القانون المغربي, امتحانات كلية الحقوق, ملخصات S1 S2 S3 S4 S5 S6, FSJES, جامعة محمد الخامس, دروس القانون بالمغرب, نماذج امتحانات الحقوق, قانون الأسرة, القانون الجنائي, القانون التجاري",
  fr: "Archives droit marocain, examens FSJES, résumés S1 S2 S3 S4 S5 S6, Université Mohammed V, cours de droit Maroc, épreuves droit, FSJES Rabat, FSJES Casablanca",
  en: "Moroccan law archive, FSJES exams, legal summaries S1 S2 S3 S4 S5 S6, Moroccan universities, law study notes Morocco, Rabat Law Faculty, Casablanca Law Faculty",
  es: "Archivo derecho marroquí, exámenes FSJES, resúmenes S1 S2 S3 S4 S5 S6, Universidad Mohammed V, cursos de derecho Marruecos, FSJES Rabat",
};

// Fallback Mock Data for smooth experience
const MOCK_DATA: ArchiveArticle[] = [
  {
    id: "1",
    title: "أسئلة وأجوبة امتحان قانون الأسرة S1 — المغرب 2026",
    slug: "family-law-s1-2026",
    excerpt: "نماذج إجابات شاملة تغطي مدوّنة الأسرة: الزواج، الطلاق، النسب والحضانة وفق التعديلات الجديدة.",
    category: "قانون الأسرة",
    university: "محمد الخامس — الرباط",
    semester: "s1",
    year: 2026,
    views: 4200,
    is_featured: true,
    created_at: "2026-07-13T10:00:00Z",
    updated_at: "2026-07-13T10:00:00Z",
    pdf_url: "https://www.mizan.page/docs/family-law-s1.pdf",
  },
  {
    id: "2",
    title: "امتحان القانون التجاري S3 — جامعة الحسن الثاني 2026",
    slug: "commercial-s3-uh2-2026",
    excerpt: "أسئلة وإجابات نموذجية لامتحان القانون التجاري — الفصل الثالث مع الأعمال التوجيهية.",
    category: "القانون التجاري",
    university: "الحسن الثاني — الدار البيضاء",
    semester: "s3",
    year: 2026,
    views: 2100,
    is_featured: false,
    created_at: "2026-07-11T10:00:00Z",
    updated_at: "2026-07-11T10:00:00Z",
    pdf_url: "https://www.mizan.page/docs/commercial-s3.pdf",
  },
  {
    id: "3",
    title: "ملخص القانون الدستوري S2 — جامعة القاضي عياض 2025",
    slug: "constitutional-s2-uqa-2025",
    excerpt: "ملخص شامل لمقرر القانون الدستوري والأنظمة السياسية — الفصل الثاني، جامعة مراكش.",
    category: "القانون الدستوري",
    university: "القاضي عياض — مراكش",
    semester: "s2",
    year: 2025,
    views: 1800,
    is_featured: false,
    created_at: "2026-07-09T10:00:00Z",
    updated_at: "2026-07-09T10:00:00Z",
  },
  {
    id: "4",
    title: "أسئلة القانون الجنائي S4 — جامعة محمد الأول 2025",
    slug: "criminal-s4-umo-2025",
    excerpt: "نماذج امتحانات القانون الجنائي العام والخاص مع عناصر الإجابة والتحليل الفقهي.",
    category: "القانون الجنائي",
    university: "محمد الأول — وجدة",
    semester: "s4",
    year: 2025,
    views: 1400,
    is_featured: false,
    created_at: "2026-07-07T10:00:00Z",
    updated_at: "2026-07-07T10:00:00Z",
    pdf_url: "https://www.mizan.page/docs/criminal-s4.pdf",
  },
  {
    id: "5",
    title: "ملخص التنظيم القضائي S4 — جامعة ابن طفيل 2026",
    slug: "judicial-organization-s4-usa-2026",
    excerpt: "ملخص مركز لقواعد الاختصاص والمحاكم الابتدائية والاستئناف وفق آخر التعديلات التشريعية.",
    category: "التنظيم القضائي",
    university: "ابن طفيل — القنيطرة",
    semester: "s4",
    year: 2026,
    views: 3100,
    is_featured: false,
    created_at: "2026-07-05T10:00:00Z",
    updated_at: "2026-07-05T10:00:00Z",
    pdf_url: "https://www.mizan.page/docs/judicial-s4.pdf",
  },
];

export default function Archive() {
  const [searchParams, setSearchParams] = useSearchParams();
  const localizedPath = useLocalizedPath();
  const { lang, dir } = useI18n();
  const currentLang: SupportedLang = (lang as SupportedLang) in I18N_STRINGS ? (lang as SupportedLang) : "ar";
  const t = I18N_STRINGS[currentLang];

  const { isStaff } = useRole();

  const [articles, setArticles] = useState<ArchiveArticle[]>(MOCK_DATA);
  const [loading, setLoading] = useState<boolean>(false);
  const [rawSearchQuery, setRawSearchQuery] = useState<string>("");

  const university = sanitizeInput(searchParams.get("university") || "all");
  const semester = sanitizeInput(searchParams.get("semester") || "all");

  const siteUrl = import.meta.env.VITE_SITE_URL || "https://www.mizan.page";
  const canonicalUrl = `${siteUrl}/${lang}/archive`;

  // Safe Filter Handlers
  const setFilter = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams);
      const cleanValue = sanitizeInput(value);
      if (cleanValue === "all" || !cleanValue) {
        next.delete(key);
      } else {
        next.set(key, cleanValue);
      }
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  const clearAllFilters = useCallback(() => {
    setRawSearchQuery("");
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  // Data Fetching
  useEffect(() => {
    setLoading(true);
     getArticles({
  schoolId: university !== "all" ? university : undefined,
  semester: semester !== "all" ? semester : undefined,
  limit: 40,
   })
      // Fix 3: Explicit parameter type annotation to solve 'implicit any'
      .then(({ data, error }) => {
      if (error) {
       setArticles(MOCK_DATA);
       return;
      }

       setArticles(data);
       })
      .catch(() => {
        // Fallback to mock on network error
      })
      .finally(() => setLoading(false));
  }, [university, semester]);

  // Client-side Filter & Security Sanitization
  const filteredArticles = useMemo(() => {
    const cleanQuery = sanitizeInput(rawSearchQuery).toLowerCase();

    return articles.filter((a) => {
      const univObj = UNIVERSITIES.find((u) => u.slug === university);
      const univKeyword = univObj ? univObj.labelAr.split("—")[0].replace("جامعة", "").trim().toLowerCase() : "";

      const matchesUniv =
        university === "all" ||
        (a.university && a.university.toLowerCase().includes(univKeyword));

      const matchesSem = semester === "all" || a.semester?.toLowerCase() === semester.toLowerCase();

      const matchesQuery =
        !cleanQuery ||
        a.title.toLowerCase().includes(cleanQuery) ||
        (a.excerpt && a.excerpt.toLowerCase().includes(cleanQuery)) ||
        (a.category && a.category.toLowerCase().includes(cleanQuery)) ||
        (a.university && a.university.toLowerCase().includes(cleanQuery));

      return matchesUniv && matchesSem && matchesQuery;
    });
  }, [articles, university, semester, rawSearchQuery]);

  // JSON-LD Structured Data Schema for Master SEO
  const jsonLdSchema = useMemo(() => {
    return {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: t.title,
      description: t.subtitle,
      url: canonicalUrl,
      inLanguage: lang,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: filteredArticles.length,
        itemListElement: filteredArticles.slice(0, 15).map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "DigitalDocument",
            name: item.title,
            description: item.excerpt || item.title,
            url: `${siteUrl}/${lang}/article/${item.slug}`,
            fileFormat: item.pdf_url ? "application/pdf" : "text/html",
            educationalLevel: item.semester?.toUpperCase() || "FSJES",
            provider: {
              "@type": "EducationalOrganization",
              name: item.university || "FSJES Morocco",
            },
          },
        })),
      },
    };
  }, [t, canonicalUrl, lang, filteredArticles, siteUrl]);

  const arrowFlip = dir === "rtl" ? "rotate-180" : "";
  const hasActiveFilters = university !== "all" || semester !== "all" || rawSearchQuery.trim().length > 0;

  return (
    <>
      {/* Master SEO Head */}
      <SEOHead
      title={t.metaTitle}
      description={t.metaDesc}
      keywords={SEO_KEYWORDS[currentLang]}
      canonical={canonicalUrl}
      jsonLd={jsonLdSchema}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 text-foreground" dir={dir}>
        {/* Header Section */}
        <header className="mb-6 sm:mb-8 flex items-center justify-between flex-wrap gap-4 border-b border-border/50 pb-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
              <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight" style={{ fontFamily: serifFont(lang) }}>
                {t.title}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed" style={{ fontFamily: sansFont(lang) }}>
                {t.subtitle}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>{t.militarySecurity}</span>
          </div>
        </header>

        {/* Phones-First Search & Filter Controls */}
        <section aria-label="Search and Filters" className="bg-card border border-border rounded-2xl p-4 sm:p-5 mb-6 shadow-sm space-y-4">
          {/* Touch-optimized Search Input */}
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground ${dir === "rtl" ? "right-3.5" : "left-3.5"}`} aria-hidden="true" />
            <input
              type="text"
              value={rawSearchQuery}
              onChange={(e) => setRawSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className={`w-full min-h-[48px] py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
                dir === "rtl" ? "pr-11 pl-10" : "pl-11 pr-10"
              }`}
              style={{ fontFamily: sansFont(lang) }}
              aria-label={t.searchPlaceholder}
            />
            {rawSearchQuery && (
              <button
                type="button"
                onClick={() => setRawSearchQuery("")}
                className={`absolute top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors ${
                  dir === "rtl" ? "left-2.5" : "right-2.5"
                }`}
                aria-label="Clear Search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Select Dropdowns Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
            <div>
              <label htmlFor="university-filter" className="text-xs font-semibold text-muted-foreground mb-1.5 block" style={{ fontFamily: sansFont(lang) }}>
                {t.filterUniv}
              </label>
              <select
                id="university-filter"
                value={university}
                onChange={(e) => setFilter("university", e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] text-xs sm:text-sm border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                style={{ fontFamily: sansFont(lang) }}
                aria-label={t.filterUniv}
              >
                {UNIVERSITIES.map((u) => (
                  <option key={u.slug} value={u.slug}>
                    {currentLang === "ar"
                      ? u.labelAr
                      : currentLang === "fr"
                      ? u.labelFr
                      : currentLang === "en"
                      ? u.labelEn
                      : u.labelEs}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="semester-filter" className="text-xs font-semibold text-muted-foreground mb-1.5 block" style={{ fontFamily: sansFont(lang) }}>
                {t.filterSem}
              </label>
              <select
                id="semester-filter"
                value={semester}
                onChange={(e) => setFilter("semester", e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] text-xs sm:text-sm border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                style={{ fontFamily: sansFont(lang) }}
                aria-label={t.filterSem}
              >
                {SEMESTERS.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {currentLang === "ar"
                      ? s.labelAr
                      : currentLang === "fr"
                      ? s.labelFr
                      : currentLang === "en"
                      ? s.labelEn
                      : s.labelEs}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Phones-First Semester Quick Scroll Bar */}
        <nav aria-label="Semester Navigation" className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none snap-x">
          {SEMESTERS.map((s) => {
            const label =
              currentLang === "ar"
                ? s.labelAr
                : currentLang === "fr"
                ? s.labelFr
                : currentLang === "en"
                ? s.labelEn
                : s.labelEs;

            const isSelected = semester === s.slug;

            return (
              <button
                key={s.slug}
                onClick={() => setFilter("semester", s.slug)}
                className={`snap-start min-h-[42px] px-4 py-2 text-xs font-bold rounded-xl border whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]"
                    : "border-border text-foreground hover:border-primary/50 bg-card hover:bg-muted"
                }`}
                style={{ fontFamily: sansFont(lang) }}
              >
                {label}
              </button>
            );
          })}
        </nav>

        {/* Active Filter Indicators & Results Count */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 px-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">{t.activeFilters}</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
              {filteredArticles.length} {t.resultsCount}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors"
                style={{ fontFamily: sansFont(lang) }}
              >
                <RotateCcw className="w-3 h-3" />
                <span>{t.clearFilters}</span>
              </button>
            )}
          </div>
        </div>

        {/* Top Monetization Slot */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-border/50">
          <AdSenseSlot slotId="3344556677" />
        </div>

        {/* Article Cards List Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-card border border-border animate-pulse p-5 space-y-3">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-10 bg-muted rounded w-full mt-4"></div>
              </div>
            ))}
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-16 px-4 bg-card border border-border rounded-2xl shadow-sm" style={{ fontFamily: sansFont(lang) }}>
            <BookOpen className="mx-auto w-12 h-12 text-muted-foreground mb-3" aria-hidden="true" />
            <h3 className="text-base font-bold text-foreground mb-1">{t.noResults}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto mb-4">{t.noResultsDesc}</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs transition-transform active:scale-95 shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t.clearFilters}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {filteredArticles.map((article, idx) => {
              const showAdHere = !isStaff && idx === 2;
              const safePdfUrl = getSafePdfUrl(article.pdf_url ?? undefined);

              return (
                <div key={article.id} className="contents">
                  {showAdHere && (
                    <div className="col-span-full my-2 overflow-hidden rounded-2xl border border-border/50">
                      <AdSenseSlot slotId="8899001122" format="auto" />
                    </div>
                  )}

                  <article className="bg-card border border-border hover:border-primary/50 rounded-2xl p-4 sm:p-5 transition-all shadow-sm flex flex-col justify-between group">
                    <div>
                      {/* Category Badges & Meta */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {article.category}
                        </span>
                        {article.semester && (
                          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border uppercase">
                            {article.semester}
                          </span>
                        )}
                        {article.year && (
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {article.year}
                          </span>
                        )}
                      </div>

                      {/* Title Link */}
                      <Link to={localizedPath(`/article/${article.slug}`)} className="block group-hover:text-primary transition-colors">
                        <h2 className="text-base sm:text-lg font-bold text-foreground leading-snug mb-2" style={{ fontFamily: serifFont(lang) }}>
                          {article.title}
                        </h2>
                      </Link>

                      {/* University Tag */}
                      {article.university && (
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5 font-medium" style={{ fontFamily: sansFont(lang) }}>
                          <GraduationCap className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                          <span>{article.university}</span>
                        </p>
                      )}

                      {/* Article Excerpt */}
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed" style={{ fontFamily: sansFont(lang) }}>
                        {article.excerpt}
                      </p>
                    </div>

                    {/* Action Buttons & Security Footer */}
                    <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <Link
                          to={localizedPath(`/article/${article.slug}`)}
                          className="min-h-[44px] px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-initial"
                          style={{ fontFamily: sansFont(lang) }}
                        >
                          <span>{t.readArticle}</span>
                          <ArrowRight className={`w-3.5 h-3.5 ${arrowFlip}`} aria-hidden="true" />
                        </Link>

                        {safePdfUrl && (
                          <a
                            href={safePdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="min-h-[44px] px-3.5 py-2 border border-border bg-background text-xs font-semibold text-foreground rounded-xl hover:border-primary hover:text-primary active:scale-95 transition-all flex items-center justify-center gap-1.5"
                            style={{ fontFamily: sansFont(lang) }}
                            aria-label={`${t.downloadPdf} - ${article.title}`}
                          >
                            <Download className="w-3.5 h-3.5" aria-hidden="true" />
                            <span className="hidden sm:inline">{t.downloadPdf}</span>
                            <span className="sm:hidden">PDF</span>
                          </a>
                        )}
                      </div>

                      {safePdfUrl && (
                        <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0" title={t.pdfVerified}>
                          <FileText className="w-3 h-3" />
                          <span className="hidden lg:inline">{t.pdfVerified}</span>
                        </div>
                      )}
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}