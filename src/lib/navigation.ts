import { type Role } from "./security";

// ── 🌐 DOMAIN & ENVIRONMENT CONFIGURATION ────────────────────────────────────
export const SITE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL) ||
  "https://www.mizan.page";

export const APP_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_URL) ||
  "https://www.mizan.page";

export type SupportedLang = "ar" | "fr" | "en" | "es";

export interface NavCategory {
  title: Record<SupportedLang, string>;
  slug: string;
  description?: Record<SupportedLang, string>;
  seoImageKeywords?: Record<SupportedLang, string[]>;
}

export interface NavLinkItem {
  id: string;
  label: Record<SupportedLang, string>;
  path: string;
  hasDropdown?: boolean;
  requiredRole?: Role[];
  minPermission?: "isStaff" | "canManageUsers" | "canWriteContent";
  isMobileBottomNav?: boolean;
  mobileIcon?: string;
  googlePriority?: number; // Priority for Googlebot crawling (0.0 - 1.0)
}

// 🏛️ LEGAL FIELDS (4 Languages + Master SEO Keywords)
export const LEGAL_FIELDS: NavCategory[] = [
  {
    title: { ar: "قانون الأسرة", fr: "Droit de la famille", en: "Family Law", es: "Derecho de familia" },
    slug: "family-law",
    description: {
      ar: "مدونة الأسرة والقضايا المتعلقة بالأحوال الشخصية والزواج والطلاق",
      fr: "Code de la famille, statut personnel, mariage et divorce au Maroc",
      en: "Family Code, personal status, marriage and divorce law in Morocco",
      es: "Código de Familia, estado personal, matrimonio y divorcio en Marruecos",
    },
    seoImageKeywords: {
      ar: ["قانون الأسرة المغربي", "مدونة الأسرة", "صورة أحكام الأسرة"],
      fr: ["Droit de la famille Maroc", "Code de la famille", "Jurisprudence famille"],
      en: ["Moroccan Family Law", "Family Code Morocco", "Family Law Documents"],
      es: ["Derecho de familia Marruecos", "Código de Familia", "Jurisprudencia familia"],
    },
  },
  {
    title: { ar: "القانون الجنائي", fr: "Droit pénal", en: "Criminal Law", es: "Derecho penal" },
    slug: "criminal-law",
    description: {
      ar: "قانون العقوبات والمسطرة الجنائية والاجتهادات القضائية الزجرية",
      fr: "Code pénal, procédure pénale et jurisprudence répressive",
      en: "Penal Code, criminal procedure and criminal court rulings",
      es: "Código Penal, procedimiento penal y jurisprudencia penal",
    },
    seoImageKeywords: {
      ar: ["القانون الجنائي المغربي", "المسطرة الجنائية", "وثائق القانون الجنائي"],
      fr: ["Droit pénal Maroc", "Procédure pénale", "Textes de loi pénal"],
      en: ["Moroccan Criminal Law", "Criminal Procedure Morocco", "Penal Law PDF"],
      es: ["Derecho penal Marruecos", "Procedimiento penal", "Documentos derecho penal"],
    },
  },
  {
    title: { ar: "القانون التجاري", fr: "Droit commercial", en: "Commercial Law", es: "Derecho mercantil" },
    slug: "commercial-law",
    description: {
      ar: "مدونة التجارة، العقود التجارية، والشركات والمساطر الجماعية",
      fr: "Code de commerce, contrats commerciaux, sociétés et procédures collectives",
      en: "Commercial Code, business contracts, corporate law and bankruptcy",
      es: "Código de Comercio, contratos comerciales, sociedades y derecho mercantil",
    },
    seoImageKeywords: {
      ar: ["القانون التجاري المغربي", "مدونة التجارة", "عقود الشركات"],
      fr: ["Droit commercial Maroc", "Code de commerce", "Contrats commerciaux"],
      en: ["Moroccan Commercial Law", "Trade Code Morocco", "Corporate Law PDF"],
      es: ["Derecho mercantil Marruecos", "Código de Comercio", "Contratos comerciales"],
    },
  },
  {
    title: { ar: "القانون الإداري", fr: "Droit administratif", en: "Administrative Law", es: "Derecho administrativo" },
    slug: "administrative-law",
    description: {
      ar: "المنازعات الإدارية، العقود الإدارية، والصفقات العمومية بالمغرب",
      fr: "Contentieux administratif, contrats administratifs et marchés publics",
      en: "Administrative disputes, government contracts and public procurement",
      es: "Litigios administrativos, contratos administrativos y contratación pública",
    },
    seoImageKeywords: {
      ar: ["القانون الإداري المغربي", "المنازعات الإدارية", "القرارات الإدارية"],
      fr: ["Droit administratif Maroc", "Contentieux administratif", "Marchés publics"],
      en: ["Moroccan Administrative Law", "Public Procurement Morocco", "Administrative Rulings"],
      es: ["Derecho administrativo Marruecos", "Contratos públicos", "Jurisprudencia administrativa"],
    },
  },
  {
    title: { ar: "القانون الدستوري", fr: "Droit constitutionnel", en: "Constitutional Law", es: "Derecho constitucional" },
    slug: "constitutional-law",
    description: {
      ar: "الدستور المغربي، المؤسسات الدستورية، وقرارات المحكمة الدستورية",
      fr: "Constitution marocaine, institutions et décisions de la Cour Constitutionnelle",
      en: "Moroccan Constitution, constitutional institutions and court decrees",
      es: "Constitución marroquí, instituciones y decisiones del Tribunal Constitucional",
    },
    seoImageKeywords: {
      ar: ["الدستور المغربي", "المحكمة الدستورية", "القانون الدستوري المغرب"],
      fr: ["Constitution marocaine", "Cour Constitutionnelle Maroc", "Droit constitutionnel"],
      en: ["Moroccan Constitution", "Constitutional Court Rulings", "Constitutional Law"],
      es: ["Constitución Marruecos", "Tribunal Constitucional", "Derecho constitucional"],
    },
  },
];

// 📄 DOCUMENT TYPES (4 Languages + Master File/Photo SEO)
export const DOCUMENT_TYPES: NavCategory[] = [
  {
    title: { ar: "النصوص القانونية", fr: "Textes juridiques", en: "Legal Texts", es: "Textos legales" },
    slug: "legal-texts",
    description: {
      ar: "القوانين التنظيمية، الظهائر الشريفة، والقوانين العادية بالمملكة المغربية",
      fr: "Lois organiques, Dahirs chérifiens et lois ordinaires du Royaume du Maroc",
      en: "Organic laws, Royal Dahirs, and acts of the Kingdom of Morocco",
      es: "Leyes orgánicas, Dahires Reales y leyes ordinarias del Reino de Marruecos",
    },
    seoImageKeywords: {
      ar: ["تحميل النصوص القانونية PDF", "الظهائر الشريفة", "قوانين المملكة المغربية"],
      fr: ["Télécharger textes juridiques PDF", "Dahirs chérifiens", "Lois Maroc"],
      en: ["Download Moroccan Legal Texts PDF", "Royal Dahirs Morocco", "Moroccan Laws"],
      es: ["Descargar textos legales PDF", "Dahires Reales", "Leyes de Marruecos"],
    },
  },
  {
    title: { ar: "المراسيم والقرارات", fr: "Décrets et Arrêtés", en: "Decrees", es: "Decretos" },
    slug: "ministerial-decrees",
    description: {
      ar: "المراسيم الحكومية والقرارات الوزارية الصادرة في الجريدة الرسمية",
      fr: "Décrets gouvernementaux et arrêtés ministériels publiés au Bulletin Officiel",
      en: "Government decrees and ministerial decisions published in the Official Gazette",
      es: "Decretos gubernamentales y decisiones ministeriales del Boletín Oficial",
    },
    seoImageKeywords: {
      ar: ["المراسيم الحكومية", "القرارات الوزارية PDF", "المرسوم التنفيذي المغربي"],
      fr: ["Décrets gouvernementaux Maroc", "Arrêtés ministériels PDF", "Textes réglementaires"],
      en: ["Government Decrees Morocco", "Ministerial Decisions PDF", "Regulatory Texts"],
      es: ["Decretos gubernamentales Marruecos", "Decisiones ministeriales PDF", "Textos regulatorios"],
    },
  },
  {
    title: { ar: "قرارات محكمة النقض", fr: "Arrêts de la Cassation", en: "Cassation Rulings", es: "Sentencias de Casación" },
    slug: "cassation-rulings",
    description: {
      ar: "القرارات الصادرة عن غرف محكمة النقض المغربية والمبادئ القضائية المستقرة",
      fr: "Arrêts des chambres de la Cour de Cassation du Maroc et principes jurisprudentiels",
      en: "Rulings of the Supreme Court of Cassation of Morocco and established precedents",
      es: "Sentencias de la Corte de Casación de Marruecos y precedentes judiciales",
    },
    seoImageKeywords: {
      ar: ["قرارات محكمة النقض PDF", "اجتهاد محكمة النقض المغربية", "المبادئ القضائية"],
      fr: ["Arrêts Cour de Cassation PDF", "Jurisprudence Cassation Maroc", "Décisions de justice"],
      en: ["Cassation Rulings PDF Morocco", "Supreme Court Precedents", "Legal Decisions"],
      es: ["Sentencias de Casación PDF", "Jurisprudencia Casación Marruecos", "Precedentes judiciales"],
    },
  },
  {
    title: { ar: "الجريدة الرسمية", fr: "Bulletin Officiel", en: "Official Journals", es: "Boletín Oficial" },
    slug: "official-journals",
    description: {
      ar: "أعداد الجريدة الرسمية للمملكة المغربية باللغتين العربية والفرنسية",
      fr: "Editions du Bulletin Officiel du Royaume du Maroc en arabe et en français",
      en: "Official Gazette editions of the Kingdom of Morocco in Arabic and French",
      es: "Ediciones del Boletín Oficial del Reino de Marruecos en árabe y francés",
    },
    seoImageKeywords: {
      ar: ["الجريدة الرسمية المغربية PDF", "تحميل الجريدة الرسمية", "عدد الجريدة الرسمية"],
      fr: ["Bulletin Officiel Maroc PDF", "Télécharger Bulletin Officiel", "Édition BO Maroc"],
      en: ["Moroccan Official Gazette PDF", "Download Official Bulletin", "Morocco Gazette"],
      es: ["Boletín Oficial Marruecos PDF", "Descargar Boletín Oficial", "Edición BO Marruecos"],
    },
  },
];

// 🌐 MAIN NAVIGATION HEADER LINKS (Jurisprudence removed)
export const MAIN_NAV_LINKS: NavLinkItem[] = [
  {
    id: "home",
    label: { ar: "الرئيسية", fr: "Accueil", en: "Home", es: "Inicio" },
    path: "",
    isMobileBottomNav: true,
    mobileIcon: "Home",
    googlePriority: 1.0,
  },
  {
    id: "news",
    label: { ar: "الأخبار", fr: "Actualités", en: "News", es: "Noticias" },
    path: "news",
    hasDropdown: true,
    isMobileBottomNav: true,
    mobileIcon: "Newspaper",
    googlePriority: 0.9,
  },
  {
    id: "library",
    label: { ar: "المكتبة الرقمية", fr: "Bibliothèque", en: "Library", es: "Biblioteca" },
    path: "library",
    hasDropdown: true,
    isMobileBottomNav: true,
    mobileIcon: "BookOpen",
    googlePriority: 0.9,
  },
  {
    id: "archive",
    label: { ar: "الأرشيف الجامعي", fr: "Archives", en: "Archive", es: "Archivo" },
    path: "archive",
    hasDropdown: true,
    isMobileBottomNav: true,
    mobileIcon: "Archive",
    googlePriority: 0.8,
  },
  {
    id: "about",
    label: { ar: "عن المنصة", fr: "À propos", en: "About", es: "Acerca de" },
    path: "about",
    isMobileBottomNav: false,
    mobileIcon: "Info",
    googlePriority: 0.7,
  },
];

// 📊 REAL PLATFORM STATISTICS
export const PLATFORM_STATS = [
  {
    id: "docs",
    label: { ar: "وثيقة قانونية", fr: "Documents Légaux", en: "Legal Documents", es: "Documentos Legales" },
    value: "+12,400",
  },
  {
    id: "universities",
    label: { ar: "جامعة مغربية", fr: "Universités", en: "Universities", es: "Universidades" },
    value: "18",
  },
  {
    id: "rulings",
    label: { ar: "حكم وقرار قضائي", fr: "Décisions", en: "Court Rulings", es: "Sentencias" },
    value: "+3,200",
  },
  {
    id: "users",
    label: { ar: "مستخدم نشط", fr: "Utilisateurs Actifs", en: "Active Users", es: "Usuarios Activos" },
    value: "28k",
  },
];

// ── 📱 PHONE-FIRST & MOBILE NAVIGATION HELPERS ──────────────────────────────

/** Returns items for mobile bottom navigation bar */
export function getMobileBottomNavItems(): NavLinkItem[] {
  return MAIN_NAV_LINKS.filter((item) => item.isMobileBottomNav);
}

/** Generates canonical absolute URL for search engines and crawlers */
export function buildCanonicalUrl(path: string, lang: SupportedLang = "ar"): string {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${SITE_URL}/${lang}/${cleanPath}`.replace(/\/$/, "");
}

/** Master SEO Image metadata helper for navigation components */
export function getNavImageSeoMeta(categorySlug: string, lang: SupportedLang = "ar") {
  const field = LEGAL_FIELDS.find((f) => f.slug === categorySlug);
  const doc = DOCUMENT_TYPES.find((d) => d.slug === categorySlug);
  const target = field || doc;

  if (target?.seoImageKeywords?.[lang]) {
    const keywords = target.seoImageKeywords[lang];
    return {
      alt: `${target.title[lang]} - ${keywords[0] || "منصة ميزان الرقمية"}`,
      title: `${target.title[lang]} | ${SITE_URL}`,
      keywords: keywords.join(", "),
      cdnUrl: `${SITE_URL}/assets/images/nav/${categorySlug}.webp`,
    };
  }

  return {
    alt: `منصة ميزان الرقمية - Mizan Digital Platform (${lang})`,
    title: `Mizan Digital Platform`,
    keywords: "ميزان, قانون مغربي, مكتبة قانونية",
    cdnUrl: `${SITE_URL}/Logo.svg`,
  };
}

/** Master SEO Document metadata helper for file navigation */
export function getNavFileSeoMeta(docSlug: string, lang: SupportedLang = "ar") {
  const doc = DOCUMENT_TYPES.find((d) => d.slug === docSlug);
  if (!doc) {
    return {
      title: "وثيقة قانونية - منصة ميزان",
      downloadKeywords: "تحميل PDF, وثيقة قانونية",
      googleCrawlRule: "index, follow",
    };
  }

  return {
    title: `${doc.title[lang]} - تحميل PDF`,
    description: doc.description?.[lang] || "",
    downloadKeywords: doc.seoImageKeywords?.[lang]?.join(", ") || "",
    googleCrawlRule: "index, follow, max-snippet:-1, max-image-preview:large",
  };
}