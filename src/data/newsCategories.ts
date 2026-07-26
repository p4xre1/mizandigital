export type SupportedLang = "ar" | "fr" | "en" | "es";

export interface LocalizedString {
  ar: string;
  fr: string;
  en: string;
  es: string;
}

export interface LocalizedKeywords {
  ar: string[];
  fr: string[];
  en: string[];
  es: string[];
}

export interface PhotoSEOMetadata {
  coverImageUrl: string;
  ogImageUrl: string;
  twitterImageUrl: string;
  width: number;
  height: number;
  altText: LocalizedString;
  caption: LocalizedString;
}

export interface FileSEOMetadata {
  fileKeywords: LocalizedKeywords;
  mimeType: string;
  allowedExtensions: string[];
}

export interface NewsCategory {
  id: string;
  slug: string;
  title: LocalizedString;
  subtitle: LocalizedString;
  description: LocalizedString;
  icon: string;
  // UI/UX Styling Props (Mobile-optimized touch targets & badge themes)
  accentColor: string;
  badgeBg: string;
  textColor: string;
  // Master SEO & File/Photo Meta
  keywords: LocalizedKeywords;
  photoMeta: PhotoSEOMetadata;
  fileMeta: FileSEOMetadata;
  canonicalUrl: string;
}

const SITE_DOMAIN =
  import.meta.env.VITE_SITE_URL ||
  import.meta.env.VITE_APP_URL ||
  "https://www.mizan.page";

/**
 * Military-grade input sanitizer for category slugs and dynamic search queries.
 * Prevents DOM injection, XSS vectors, and SQL syntax leaks on mobile inputs.
 */
export const sanitizeCategoryQuery = (input: string): string => {
  if (!input) return "";
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/gi, "")
    .replace(/\s+/g, "-")
    .substring(0, 80);
};

export const NEWS_CATEGORIES: NewsCategory[] = [
  {
    id: "university-news",
    slug: "university-news",
    canonicalUrl: `${SITE_DOMAIN}/news/schools`,
    title: {
      ar: "أخبار الكليات والجامعات",
      fr: "Actualités Universitaires & Facultés",
      en: "University & Law School News",
      es: "Noticias Universitarias y Facultades",
    },
    subtitle: {
      ar: "مباريات الماستر، النتائج والأنشطة الأكاديمية",
      fr: "Concours de Master, Résultats et Activités Académiques",
      en: "Master entrance exams & faculty updates",
      es: "Exámenes de Máster y novedades de facultades",
    },
    description: {
      ar: "تغطية شاملة ومباشرة لجميع مستجدات كليات العلوم القانونية والاقتصادية والاجتماعية بالمغرب، إعلانات ماستر، ونتائج المباريات.",
      fr: "Couverture complète de toutes les actualités des facultés FSJES au Maroc, concours de Master et résultats d'admission.",
      en: "Comprehensive coverage of all Moroccan FSJES law faculties, Master's degree competitions, and admissions results.",
      es: "Cobertura completa de todas las facultades de derecho FSJES en Marruecos, exámenes de máster y resultados de admisión.",
    },
    icon: "GraduationCap",
    accentColor: "border-blue-500/30 text-blue-600 dark:text-blue-400",
    badgeBg: "bg-blue-500/10 hover:bg-blue-500/20",
    textColor: "text-blue-600 dark:text-blue-400",
    keywords: {
      ar: ["مباريات_الماستر", "نتائج_الانتقاء", "FSJES", "أنشطة_أكاديمية", "ميزان_الجامعي"],
      fr: ["Concours_Master", "FSJES_Maroc", "Résultats_Sélection", "Actualité_Universitaire"],
      en: ["Master_Admissions", "Moroccan_Universities", "FSJES_News", "Law_Faculty_Updates"],
      es: ["Master_Marruecos", "FSJES_Noticias", "Examenes_Master", "Universidad_Derecho"],
    },
    photoMeta: {
      coverImageUrl: `${SITE_DOMAIN}/images/news/university-cover.webp`,
      ogImageUrl: `${SITE_DOMAIN}/images/og/university-news-og.jpg`,
      twitterImageUrl: `${SITE_DOMAIN}/images/og/university-news-twitter.jpg`,
      width: 1200,
      height: 630,
      altText: {
        ar: "صورة تعبيرية لأخبار كليات الحقوق والجامعات المغربية منصة ميزان",
        fr: "Image représentant les actualités des facultés de droit au Maroc - Mizan",
        en: "Moroccan Law Faculty and University news representation - Mizan Platform",
        es: "Representación de noticias universitarias de derecho en Marruecos - Mizan",
      },
      caption: {
        ar: "مستجدات الدراسة والأبحاث ومباريات الماستر عبر منصة ميزان",
        fr: "Mises à jour des études et concours de Master sur la plateforme Mizan",
        en: "Study updates and Master entrance exams on the Mizan platform",
        es: "Actualizaciones de estudios y exámenes de máster en la plataforma Mizan",
      },
    },
    fileMeta: {
      fileKeywords: {
        ar: ["ملف_ماستر_pdf", "جدول_المباريات_doc", "نماذج_امتحانات_pdf"],
        fr: ["fiche_master_pdf", "planning_concours_pdf", "epreuves_fsjes"],
        en: ["master_guide_pdf", "exam_schedules_pdf", "sample_papers"],
        es: ["guia_master_pdf", "calendario_examenes_pdf", "modelos_examenes"],
      },
      mimeType: "application/pdf",
      allowedExtensions: ["pdf", "docx", "webp"],
    },
  },
  {
    id: "legislative-updates",
    slug: "legislative-updates",
    canonicalUrl: `${SITE_DOMAIN}/news/government`,
    title: {
      ar: "المستجدات التشريعية والحكومية",
      fr: "Nouveautés Législatives & Gouvernementales",
      en: "Government & Legal Updates",
      es: "Novedades Gubernamentales y Legislativas",
    },
    subtitle: {
      ar: "مشاريع القوانين، المراسيم والجريدة الرسمية",
      fr: "Projets de lois, décrets et annonces officielles",
      en: "Bills, decrees, and official announcements",
      es: "Proyectos de ley, decretos y anuncios oficiales",
    },
    description: {
      ar: "متابعة فورية وموثوقة لجميع القوانين الصادرة بالجريدة الرسمية المملكة المغربية ومشاريع القوانين المعروضة على البرلمان.",
      fr: "Suivi en temps réel des lois publiées au Journal Officiel du Royaume du Maroc et des projets de lois parlementaires.",
      en: "Real-time tracking of laws published in the Official Gazette of the Kingdom of Morocco and parliamentary bills.",
      es: "Seguimiento en tiempo real de leyes publicadas en la Gaceta Oficial del Reino de Marruecos y proyectos parlamentarios.",
    },
    icon: "Landmark",
    accentColor: "border-amber-500/30 text-amber-600 dark:text-amber-400",
    badgeBg: "bg-amber-500/10 hover:bg-amber-500/20",
    textColor: "text-amber-600 dark:text-amber-400",
    keywords: {
      ar: ["الجريدة_الرسمية", "مشاريع_القوانين", "المراسيم_التنفيذية", "التشريع_المغربي", "منصة_ميزان"],
      fr: ["Journal_Officiel", "Projets_de_Loi", "Décrets_Exécutifs", "Législation_Marocaine"],
      en: ["Official_Gazette", "Moroccan_Legislation", "Executive_Decrees", "Parliamentary_Bills"],
      es: ["Boletin_Oficial", "Legislacion_Marroqui", "Decretos_Ejecutivos", "Proyectos_Ley"],
    },
    photoMeta: {
      coverImageUrl: `${SITE_DOMAIN}/images/news/legislative-cover.webp`,
      ogImageUrl: `${SITE_DOMAIN}/images/og/legislative-news-og.jpg`,
      twitterImageUrl: `${SITE_DOMAIN}/images/og/legislative-news-twitter.jpg`,
      width: 1200,
      height: 630,
      altText: {
        ar: "صورة تعبيرية للمستجدات التشريعية والجريدة الرسمية المغربية منصة ميزان",
        fr: "Image représentant les actualités législatives et le Journal Officiel du Maroc",
        en: "Moroccan legislative updates and Official Gazette representation",
        es: "Representación de novedades legislativas y Boletín Oficial de Marruecos",
      },
      caption: {
        ar: "تحليلات ونصوص الجريدة الرسمية والمراسيم الحكومية منصة ميزان",
        fr: "Analyses et textes du Journal Officiel et décrets gouvernementaux - Mizan",
        en: "Official Gazette texts and government decrees analysis - Mizan",
        es: "Análisis del Boletín Oficial y decretos gubernamentales - Mizan",
      },
    },
    fileMeta: {
      fileKeywords: {
        ar: ["نص_القانون_pdf", "الجريدة_الرسمية_pdf", "مرسوم_تنفيذي_doc"],
        fr: ["texte_loi_pdf", "journal_officiel_pdf", "decret_executif_pdf"],
        en: ["law_text_pdf", "official_gazette_pdf", "executive_decree_pdf"],
        es: ["texto_ley_pdf", "boletin_oficial_pdf", "decreto_ejecutivo_pdf"],
      },
      mimeType: "application/pdf",
      allowedExtensions: ["pdf", "docx"],
    },
  },
  {
    id: "general-legal-news",
    slug: "general-legal-news",
    canonicalUrl: `${SITE_DOMAIN}/news/general`,
    title: {
      ar: "أخبار قانونية عامة",
      fr: "Actualités Juridiques Générales",
      en: "General Legal News",
      es: "Noticias Jurídicas Generales",
    },
    subtitle: {
      ar: "مستجدات الساحة القضائية والقوانين",
      fr: "Nouveautés du secteur judiciaire et articles",
      en: "Judicial sector updates & articles",
      es: "Novedades del sector judicial y artículos",
    },
    description: {
      ar: "رصد لمستجدات مهن القضاء، المحاماة، والتطبيقات القضائية في مختلف المحاكم المغربية مع دراسات قانونية معاصرة.",
      fr: "Aperçu des professions judiciaires, du barreau et des décisions de justice dans les tribunaux marocains.",
      en: "Coverage of judicial professions, bar association, and court rulings across Moroccan jurisdictions.",
      es: "Cobertura de profesiones judiciales, abogacía y resoluciones judiciales en los tribunales marroquíes.",
    },
    icon: "Globe2",
    accentColor: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
    badgeBg: "bg-emerald-500/10 hover:bg-emerald-500/20",
    textColor: "text-emerald-600 dark:text-emerald-400",
    keywords: {
      ar: ["مستجدات_القضاء", "مهن_القانون", "الساحة_القضائية", "قوانين_جديدة", "أخبار_المحاماة"],
      fr: ["Actualité_Judiciaire", "Professions_Juridiques", "Decisions_Judiciaires_Maroc", "Barreau_Maroc"],
      en: ["Judicial_Updates", "Legal_Professions", "Moroccan_Courts", "Case_Law_News"],
      es: ["Noticias_Judiciales", "Profesiones_Juridicas", "Tribunales_Marruecos", "Decisiones_Judiciales"],
    },
    photoMeta: {
      coverImageUrl: `${SITE_DOMAIN}/images/news/general-legal-cover.webp`,
      ogImageUrl: `${SITE_DOMAIN}/images/og/general-legal-og.jpg`,
      twitterImageUrl: `${SITE_DOMAIN}/images/og/general-legal-twitter.jpg`,
      width: 1200,
      height: 630,
      altText: {
        ar: "صورة للساحة القضائية والمهن القانونية بالمغرب منصة ميزان",
        fr: "Image du paysage judiciaire et des professions juridiques au Maroc - Mizan",
        en: "Judicial sector and legal professions in Morocco - Mizan Platform",
        es: "Panorama judicial y profesiones jurídicas en Marruecos - Mizan",
      },
      caption: {
        ar: "تغطية مستمرة لمستجدات مهن القضاء والمحاماة عبر ميزان",
        fr: "Couverture continue des actualités judiciaires et du barreau sur Mizan",
        en: "Continuous coverage of judicial news and legal sector updates on Mizan",
        es: "Cobertura continua de noticias judiciales y de la abogacía en Mizan",
      },
    },
    fileMeta: {
      fileKeywords: {
        ar: ["دليل_المحاماة_pdf", "اجتهاد_قضائي_pdf", "مقال_قانوني_doc"],
        fr: ["guide_barreau_pdf", "decisions_justice_pdf", "article_juridique_pdf"],
        en: ["legal_guide_pdf", "court_precedent_pdf", "law_article_pdf"],
        es: ["guia_abogacia_pdf", "decisiones_judiciales_pdf", "articulo_juridico_pdf"],
      },
      mimeType: "application/pdf",
      allowedExtensions: ["pdf", "docx"],
    },
  },
];

/**
 * Category Helper Utility
 * Safely fetches a category object by slug with full input sanitization.
 */
export const getNewsCategoryBySlug = (slug: string): NewsCategory | undefined => {
  const cleanSlug = sanitizeCategoryQuery(slug);
  return NEWS_CATEGORIES.find((cat) => cat.slug === cleanSlug || cat.id === cleanSlug);
};

/**
 * Master SEO Helper Utility
 * Generates dynamic open graph metadata for any specific language context.
 */
export const getCategorySEOMetadata = (slug: string, lang: SupportedLang = "ar") => {
  const category = getNewsCategoryBySlug(slug);
  if (!category) {
    return {
      title: "أخبار ميزان الرقمية | Mizan Platform",
      description: "المناصة القانونية الأولى للأخبار والأبحاث الجامعية في المغرب",
      canonicalUrl: SITE_DOMAIN,
      keywords: ["ميزان", "أخبار_قانونية", "Mizan"],
      ogImage: `${SITE_DOMAIN}/Logo.svg`,
      altText: "Mizan Digital Platform Logo",
    };
  }

  return {
    title: `${category.title[lang]} | Mizan - ميزان`,
    description: category.description[lang],
    canonicalUrl: category.canonicalUrl,
    keywords: category.keywords[lang],
    ogImage: category.photoMeta.ogImageUrl,
    twitterImage: category.photoMeta.twitterImageUrl,
    altText: category.photoMeta.altText[lang],
    caption: category.photoMeta.caption[lang],
    fileKeywords: category.fileMeta.fileKeywords[lang],
  };
};