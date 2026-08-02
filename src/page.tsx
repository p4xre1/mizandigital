import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Scale,
  BookOpen,
  GraduationCap,
  Search,
  Download,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  FileText,
  Landmark,
  Globe2,
  FileCheck,
  ExternalLink,
  PlusCircle,
} from "lucide-react";

import { useRole } from "@/hooks/useRole";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DeveloperBuilder } from "@/components/common/DeveloperBuilder";

// ----------------------------------------------------------------------
// GLOBALS & CONSTANTS
// ----------------------------------------------------------------------
const SITE_URL = import.meta.env.VITE_SITE_URL || "https://www.mizan.page";
const SUPPORTED_LANGS = ["ar", "fr", "en", "es"] as const;
type Language = (typeof SUPPORTED_LANGS)[number];
const DEFAULT_LANG: Language = "ar";

declare global {
  interface Window {
    adsbygoogle: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
  }
}

// ----------------------------------------------------------------------
// INPUT SANITIZATION (XSS & Injection Protection)
// ----------------------------------------------------------------------
function sanitizeInput(str: string): string {
  return str.replace(/[^\w\s\u0600-\u06FF\u0750-\u077F-]/gi, "").trim();
}

// ----------------------------------------------------------------------
// MULTI-LANGUAGE KEYWORDS & SEO DICTIONARY
// ----------------------------------------------------------------------
const TRANSLATIONS: Record<
  Language,
  {
    dir: "rtl" | "ltr";
    metaTitle: string;
    metaDesc: string;
    searchPlaceholder: string;
    quickCategories: Array<{ id: string; name: string; slug: string }>;
    heroHeading: string;
    heroSubheading: string;
    featureTitle: string;
    docsTitle: string;
    newsTitle: string;
    schoolsTitle: string;
    downloadDoc: string;
    views: string;
    writerAction: string;
    adminAction: string;
    verifiedBadge: string;
  }
> = {
  ar: {
    dir: "rtl",
    metaTitle: "منصة ميزان الرقمية | المرجع القانوني والأكاديمي الأول بالمغرب",
    metaDesc: "منصة ميزان الرقمية للخدمات والبحوث القانونية، الاجتهادات القضائية، المكتبة الرقمية، ونماذج العقود والجريدة الرسمية بالمغرب.",
    searchPlaceholder: "ابحث عن قانون، اجتهاد قضائي، مرسوم، أو وثيقة...",
    quickCategories: [
      { id: "1", name: "قانون الأسرة", slug: "family-law" },
      { id: "2", name: "القانون الجنائي", slug: "criminal-law" },
      { id: "3", name: "القانون التجاري", slug: "commercial-law" },
      { id: "4", name: "القانون الإداري", slug: "administrative-law" },
      { id: "5", name: "القانون الدستوري", slug: "constitutional-law" },
    ],
    heroHeading: "المنصة القانونية والأكاديمية الموثوقة بالمغرب",
    heroSubheading: "وصول سريع لأحدث الاجتهادات القضائية، المراسيم الحكومية، والنصوص التشريعية المحينة مع مكتبة رقمية شاملة.",
    featureTitle: "التخصصات القانونية الرئيسية",
    docsTitle: "الوثائق والقرارات الصادرة حديثاً",
    newsTitle: "مستجدات الساحة التشريعية والجامعية",
    schoolsTitle: "دليل كليات العلوم القانونية والجامعات",
    downloadDoc: "تحميل الوثيقة PDF",
    views: "مشاهدة",
    writerAction: "كتابة مقال جديد",
    adminAction: "لوحة التحكم",
    verifiedBadge: "محتوى موثق ورسمي",
  },
  fr: {
    dir: "ltr",
    metaTitle: "Plateforme Mizan Digital | Portal Juridique et Académique",
    metaDesc: "Première plateforme de recherches et services juridiques au Maroc: jurisprudence, textes de loi, décrets et actualités universitaires.",
    searchPlaceholder: "Rechercher une loi, arrêt, décret ou document...",
    quickCategories: [
      { id: "1", name: "Droit de la Famille", slug: "family-law" },
      { id: "2", name: "Droit Pénal", slug: "criminal-law" },
      { id: "3", name: "Droit Commercial", slug: "commercial-law" },
      { id: "4", name: "Droit Administratif", slug: "administrative-law" },
      { id: "5", name: "Droit Constitutionnel", slug: "constitutional-law" },
    ],
    heroHeading: "La Référence Juridique et Académique au Maroc",
    heroSubheading: "Accès instantané à la jurisprudence, aux décrets ministériels, aux bulletins officiels et aux ressources universitaires.",
    featureTitle: "Domaines Juridiques Majeurs",
    docsTitle: "Documents et Arrêts Récents",
    newsTitle: "Actualités Législatives & Académiques",
    schoolsTitle: "Annuaire des Facultés de Droit",
    downloadDoc: "Télécharger PDF",
    views: "vues",
    writerAction: "Rédiger un article",
    adminAction: "Administration",
    verifiedBadge: "Document Officiel Vérifié",
  },
  en: {
    dir: "ltr",
    metaTitle: "Mizan Digital Platform | Leading Legal & Academic Portal",
    metaDesc: "Moroccan premier legal platform for jurisprudence research, legal codes, court rulings, decrees, and law school directories.",
    searchPlaceholder: "Search for a law, court ruling, decree, or file...",
    quickCategories: [
      { id: "1", name: "Family Law", slug: "family-law" },
      { id: "2", name: "Criminal Law", slug: "criminal-law" },
      { id: "3", name: "Commercial Law", slug: "commercial-law" },
      { id: "4", name: "Administrative Law", slug: "administrative-law" },
      { id: "5", name: "Constitutional Law", slug: "constitutional-law" },
    ],
    heroHeading: "Morocco's Premier Legal & Academic Portal",
    heroSubheading: "Seamless access to updated legal codes, supreme court rulings, official gazettes, and academic research.",
    featureTitle: "Core Legal Specialties",
    docsTitle: "Recently Published Legal Documents",
    newsTitle: "Legislative & Academic News",
    schoolsTitle: "Directory of Moroccan Law Faculties",
    downloadDoc: "Download File PDF",
    views: "views",
    writerAction: "Create New Post",
    adminAction: "Admin Panel",
    verifiedBadge: "Verified Official Content",
  },
  es: {
    dir: "ltr",
    metaTitle: "Mizan Digital | Portal Jurídico y Académico Líder",
    metaDesc: "Plataforma digital para la investigación jurídica, jurisprudencia, boletines oficiales y directorio universitario en Marruecos.",
    searchPlaceholder: "Buscar leyes, jurisprudencia, decretos o archivos...",
    quickCategories: [
      { id: "1", name: "Derecho de Familia", slug: "family-law" },
      { id: "2", name: "Derecho Penal", slug: "criminal-law" },
      { id: "3", name: "Derecho Mercantil", slug: "commercial-law" },
      { id: "4", name: "Derecho Administrativo", slug: "administrative-law" },
      { id: "5", name: "Derecho Constitucional", slug: "constitutional-law" },
    ],
    heroHeading: "El Portal Jurídico y Académico de Referencia",
    heroSubheading: "Acceso rápido a jurisprudencia actualizada, decretos gubernamentales, boletines oficiales y guías universitarias.",
    featureTitle: "Especialidades Jurídicas Principales",
    docsTitle: "Documentos Jurídicos Recientes",
    newsTitle: "Noticias Legislativas y Universitarias",
    schoolsTitle: "Directorio de Facultades de Derecho",
    downloadDoc: "Descargar PDF",
    views: "vistas",
    writerAction: "Escribir Artículo",
    adminAction: "Panel Control",
    verifiedBadge: "Contenido Oficial Verificado",
  },
};

// ----------------------------------------------------------------------
// SAMPLE LEGAL DOCUMENTS (SEO Image & File Metadata)
// ----------------------------------------------------------------------
const FEATURED_DOCUMENTS = [
  {
    id: "doc-1",
    title: "القرارات الأخيرة لمجلس الأعلى / محكمة النقض - 2026",
    slug: "cassation-rulings-2026",
    category: "الاجتهاد القضائي",
    size: "4.2 MB",
    downloads: 1420,
    fileUrl: "/documents/cassation-2026.pdf",
    coverImg: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80",
    coverAlt: "صورة توضيحية لقرارات محكمة النقض المغربية - منصة ميزان",
  },
  {
    id: "doc-2",
    title: "العدد الأخير من الجريدة الرسمية للمملكة المغربية",
    slug: "official-journal-latest",
    category: "الجريدة الرسمية",
    size: "8.1 MB",
    downloads: 3890,
    fileUrl: "/documents/journal-official.pdf",
    coverImg: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80",
    coverAlt: "الجريدة الرسمية للمملكة المغربية - تحميل PDF - منصة ميزان",
  },
  {
    id: "doc-3",
    title: "دليل المساطر الإدارية والمراسيم التنفيذية المحينة",
    slug: "ministerial-decrees-guide",
    category: "المراسيم والقرارات",
    size: "2.7 MB",
    downloads: 940,
    fileUrl: "/documents/decrees-guide.pdf",
    coverImg: "https://images.unsplash.com/photo-1436450412740-6b988f486c6b?auto=format&fit=crop&w=800&q=80",
    coverAlt: "دليل المساطر الإدارية والمراسيم الحكومية - منصة ميزان الرقمية",
  },
];

// ----------------------------------------------------------------------
// MAIN HOME PAGE COMPONENT
// ----------------------------------------------------------------------
export default function Page(): React.JSX.Element {
  const { lang: paramLang } = useParams<{ lang?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isStaff, canWriteContent, role } = useRole();

  const adLoaded = useRef<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Determine current active language
  const currentLang = useMemo<Language>(() => {
    const clean = paramLang ? sanitizeInput(paramLang).toLowerCase() : "";
    return SUPPORTED_LANGS.includes(clean as Language)
      ? (clean as Language)
      : DEFAULT_LANG;
  }, [paramLang]);

  const t = TRANSLATIONS[currentLang];

  // --------------------------------------------------------------------
  // SEO & GOOGLE STRUCTURED DATA (JSON-LD) INJECTION
  // --------------------------------------------------------------------
  useEffect(() => {
    document.title = t.metaTitle;
    document.documentElement.lang = currentLang;
    document.documentElement.dir = t.dir;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", t.metaDesc);
    }

    // Canonical link optimization
    const canonicalUrl = `${SITE_URL}/${currentLang}`;
    let canonicalTag = document.querySelector<HTMLLinkElement>("link[rel='canonical']");
    if (!canonicalTag) {
      canonicalTag = document.createElement("link");
      canonicalTag.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.setAttribute("href", canonicalUrl);

    // Dynamic Master JSON-LD Schemas (Google Search, Images & Documents)
    const jsonLdData = [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Mizan Page",
        "alternateName": "منصة ميزان الرقمية",
        "url": SITE_URL,
        "inLanguage": currentLang,
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${SITE_URL}/${currentLang}/news?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Mizan Digital Legal Portal",
        "url": SITE_URL,
        "logo": `${SITE_URL}/Logo.svg`,
        "sameAs": [
          "https://facebook.com/mizandigital",
          "https://twitter.com/mizandigital",
        ],
      },
      ...FEATURED_DOCUMENTS.map((doc) => ({
        "@context": "https://schema.org",
        "@type": "DigitalDocument",
        "name": doc.title,
        "url": `${SITE_URL}/${currentLang}/documents/${doc.slug}`,
        "fileFormat": "application/pdf",
        "image": doc.coverImg,
        "description": doc.coverAlt,
        "publisher": {
          "@type": "Organization",
          "name": "Mizan Digital Platform",
        },
      })),
    ];

    let scriptTag = document.querySelector<HTMLScriptElement>("#mizan-page-jsonld");
    if (!scriptTag) {
      scriptTag = document.createElement("script");
      scriptTag.id = "mizan-page-jsonld";
      scriptTag.type = "application/ld+json";
      document.head.appendChild(scriptTag);
    }
    scriptTag.text = JSON.stringify(jsonLdData);
  }, [currentLang, t]);

  // --------------------------------------------------------------------
  // GOOGLE ADSENSE (Idle-Deferred Execution to protect TBT & INP)
  // --------------------------------------------------------------------
  useEffect(() => {
    if (adLoaded.current) return;

    const pushAd = () => {
      try {
        if (typeof window !== "undefined" && window.adsbygoogle) {
          window.adsbygoogle.push({});
          adLoaded.current = true;
        }
      } catch (err) {
        console.warn("AdSense push safely managed:", err);
      }
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(pushAd, { timeout: 2000 });
      return () => window.cancelIdleCallback(idleId);
    } else {
      const timerId = setTimeout(pushAd, 1000);
      return () => clearTimeout(timerId);
    }
  }, []);

  // --------------------------------------------------------------------
  // SEARCH HANDLER
  // --------------------------------------------------------------------
  const handleSearchSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cleanQuery = sanitizeInput(searchQuery);
    if (cleanQuery) {
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "search", { search_term: cleanQuery });
      }
      navigate(`/${currentLang}/news?q=${encodeURIComponent(cleanQuery)}`);
    }
  };

  const handleDocumentDownload = (docTitle: string) => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "file_download", {
        file_name: docTitle,
        link_url: location.pathname,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20 selection:text-primary">
      {/* HEADER NAVBAR */}
      <Navbar />

      {/* STAFF & ROLE CONTROLS BANNER */}
      {isStaff && (
        <div className="bg-primary/10 border-b border-primary/20 py-2 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="w-4 h-4" />
              <span>
                {currentLang === "ar"
                  ? `أهلاً بك! صلاحية الحساب الحالي: ${role.toUpperCase()}`
                  : `Active Role: ${role.toUpperCase()}`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {canWriteContent && (
                <Link
                  to={`/${currentLang}/writer/editor`}
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{t.writerAction}</span>
                </Link>
              )}
              <Link
                to={`/${currentLang}/admin`}
                className="flex items-center gap-1 text-foreground hover:text-primary font-bold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{t.adminAction}</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 sm:space-y-12">

        {/* HERO SECTION (Mobile-First Layout) */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-card via-card/80 to-background border border-border/80 p-6 sm:p-10 lg:p-12 shadow-sm text-center sm:text-start">
          {/* Ambient Decorative Blurs */}
          <div className="absolute -top-24 ltr:-right-24 rtl:-left-24 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 ltr:-left-24 rtl:-right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-4 sm:space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.verifiedBadge}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight leading-tight">
              {t.heroHeading}
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {t.heroSubheading}
            </p>

            {/* SEARCH FORM (Mobile Optimized Tap Target) */}
            <form
              onSubmit={handleSearchSubmit}
              className="relative max-w-2xl flex items-center mt-4"
            >
              <Search className="absolute ltr:left-4 rtl:right-4 w-5 h-5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full h-13 sm:h-14 ltr:pl-12 ltr:pr-28 rtl:pr-12 rtl:pl-28 rounded-2xl bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all shadow-inner"
              />
              <button
                type="submit"
                className="absolute ltr:right-2 rtl:left-2 h-9 sm:h-10 px-4 sm:px-6 bg-primary text-primary-foreground font-bold text-xs sm:text-sm rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center"
              >
                {currentLang === "ar" ? "بحث" : "Search"}
              </button>
            </form>

            {/* HORIZONTAL SWIPEABLE CATEGORY CHIPS (Mobile First) */}
            <div className="pt-2">
              <p className="text-xs font-semibold text-muted-foreground mb-2 sm:hidden">
                {currentLang === "ar" ? "التخصصات الأكثر طلباً:" : "Top Categories:"}
              </p>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 pt-1 -mx-2 px-2">
                {t.quickCategories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/${currentLang}/fields/${cat.slug}`}
                    className="shrink-0 px-3.5 py-1.5 rounded-xl bg-muted/80 hover:bg-primary/10 hover:text-primary border border-border/60 text-xs font-medium transition-colors"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* DEVELOPER BUILDER COMPONENT */}
        <DeveloperBuilder />

        {/* CORE LEGAL SPECIALTIES GRID */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              <span>{t.featureTitle}</span>
            </h2>
            <Link
              to={`/${currentLang}/library`}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <span>{currentLang === "ar" ? "عرض الكل" : "View All"}</span>
              {t.dir === "rtl" ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to={`/${currentLang}/fields/family-law`}
              className="group p-5 rounded-2xl bg-card border border-border/80 hover:border-primary/50 transition-all hover:shadow-md space-y-3"
            >
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                  {currentLang === "ar" ? "قانون الأسرة والميراث" : "Family & Inheritance Law"}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {currentLang === "ar"
                    ? "أحكام مدونة الأسرة، قضايا الزواج، الطلاق، والتركات."
                    : "Family code, marriage regulations, and inheritance rules."}
                </p>
              </div>
            </Link>

            <Link
              to={`/${currentLang}/fields/criminal-law`}
              className="group p-5 rounded-2xl bg-card border border-border/80 hover:border-primary/50 transition-all hover:shadow-md space-y-3"
            >
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                  {currentLang === "ar" ? "القانون الجنائي والمسطرة" : "Criminal Law & Procedure"}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {currentLang === "ar"
                    ? "مجموع القوانين الجنائية، الجنح، والجنايات وإجراءات المحاكمة."
                    : "Penal codes, procedures, and criminal court jurisprudence."}
                </p>
              </div>
            </Link>

            <Link
              to={`/${currentLang}/fields/commercial-law`}
              className="group p-5 rounded-2xl bg-card border border-border/80 hover:border-primary/50 transition-all hover:shadow-md space-y-3"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                  {currentLang === "ar" ? "القانون التجاري والأعمال" : "Commercial & Business Law"}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {currentLang === "ar"
                    ? "مدونة التجارة، العقود التجارية، الشركات، والعقود."
                    : "Commercial codes, business regulations, and corporate law."}
                </p>
              </div>
            </Link>

            <Link
              to={`/${currentLang}/fields/administrative-law`}
              className="group p-5 rounded-2xl bg-card border border-border/80 hover:border-primary/50 transition-all hover:shadow-md space-y-3"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Globe2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                  {currentLang === "ar" ? "القانون الإداري والنزاعات" : "Administrative Law"}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {currentLang === "ar"
                    ? "الصفقات العمومية، القرارات الإدارية، والمحاكم الإدارية."
                    : "Public contracts, administrative rulings, and disputes."}
                </p>
              </div>
            </Link>
          </div>
        </section>

        {/* GOOGLE ADSENSE BANNER SLOT (Min-height reserved to prevent CLS) */}
        <section className="min-h-[280px] sm:min-h-[100px] w-full bg-muted/30 border border-border/60 rounded-2xl overflow-hidden flex items-center justify-center p-2 text-center">
          <ins
            className="adsbygoogle"
            style={{ display: "block", width: "100%", minHeight: "250px" }}
            data-ad-client="ca-pub-1749032173858747"
            data-ad-slot="auto"
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </section>

        {/* FEATURED LEGAL DOCUMENTS & FILES (Optimized LCP & Aspect Ratios) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>{t.docsTitle}</span>
            </h2>
            <Link
              to={`/${currentLang}/archive`}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <span>{currentLang === "ar" ? "الأرشيف الكامل" : "Full Archive"}</span>
              {t.dir === "rtl" ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURED_DOCUMENTS.map((doc, index) => (
              <article
                key={doc.id}
                className="group bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Photo SEO & Priority Optimized Container */}
                  <div className="relative h-44 w-full overflow-hidden bg-muted">
                    <img
                      src={doc.coverImg}
                      alt={doc.coverAlt}
                      title={doc.title}
                      loading={index === 0 ? "eager" : "lazy"}
                      fetchPriority={index === 0 ? "high" : "low"}
                      width={800}
                      height={450}
                      decoding={index === 0 ? "sync" : "async"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-3 ltr:left-3 rtl:right-3 bg-background/90 backdrop-blur-md text-foreground text-[11px] font-bold px-2.5 py-1 rounded-lg border border-border/50">
                      {doc.category}
                    </span>
                  </div>

                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                      {doc.title}
                    </h3>

                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1">
                      <span>{doc.size}</span>
                      <span>•</span>
                      <span>
                        {doc.downloads} {t.views}
                      </span>
                    </div>
                  </div>
                </div>

                {/* File Download Action */}
                <div className="p-4 pt-0">
                  <a
                    href={doc.fileUrl}
                    onClick={() => handleDocumentDownload(doc.title)}
                    download
                    className="w-full py-2.5 px-4 bg-muted hover:bg-primary hover:text-primary-foreground text-foreground text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t.downloadDoc}</span>
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* LAW SCHOOLS & DIRECTORY */}
        <section className="bg-card/60 backdrop-blur-md rounded-2xl border border-border/80 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              <span>{t.schoolsTitle}</span>
            </h2>
            <Link
              to={`/${currentLang}/schools`}
              className="text-xs font-bold text-primary hover:underline"
            >
              {currentLang === "ar" ? "دليل الكليات" : "Faculties Directory"}
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <Link
              to={`/${currentLang}/schools/rabat`}
              className="p-3 rounded-xl bg-background border border-border/60 hover:border-primary transition-colors text-xs font-semibold text-foreground"
            >
              FSJES Rabat - السويسي
            </Link>
            <Link
              to={`/${currentLang}/schools/casablanca`}
              className="p-3 rounded-xl bg-background border border-border/60 hover:border-primary transition-colors text-xs font-semibold text-foreground"
            >
              FSJES Casablanca - عين الشق
            </Link>
            <Link
              to={`/${currentLang}/schools/fes`}
              className="p-3 rounded-xl bg-background border border-border/60 hover:border-primary transition-colors text-xs font-semibold text-foreground"
            >
              FSJES Fès - ظهر المهراز
            </Link>
            <Link
              to={`/${currentLang}/schools/marrakech`}
              className="p-3 rounded-xl bg-background border border-border/60 hover:border-primary transition-colors text-xs font-semibold text-foreground"
            >
              FSJES Marrakech - القاضي عياض
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}