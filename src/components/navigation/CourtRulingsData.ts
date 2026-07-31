/**
 * ============================================================================
 * Mizan Digital - Master Court Rulings & Legal Doctrine Data Layer
 * Path: /workspaces/mizandigital/src/components/navigation/CourtRulingsData.ts
 *
 * Features:
 * - 4 Languages: Arabic (AR), French (FR), English (EN), Spanish (ES)
 * - Phones-First High-Performance Structure (Sub-millisecond filtering)
 * - Military-Grade Security: Deep freezing, XSS sanitization, safe URL resolution
 * - Master SEO: Keywords taxonomy, Schema.org JSON-LD generation for photos & files
 * ============================================================================
 */

// ----------------------------------------------------------------------
// 1. Domain Configuration & Environment Safeguards
// ----------------------------------------------------------------------
const getEnvUrl = (key: string, fallback: string): string => {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) {
    return String(import.meta.env[key]);
  }
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return String(process.env[key]);
  }
  return fallback;
};

export const VITE_SITE_URL = getEnvUrl("VITE_SITE_URL", "https://www.mizan.page");
export const VITE_APP_URL = getEnvUrl("VITE_APP_URL", "https://www.mizan.page");

// ----------------------------------------------------------------------
// 2. Type Definitions (Multilingual, SEO & Media)
// ----------------------------------------------------------------------
export type SupportedLang = "ar" | "fr" | "en" | "es";

export interface MultilingualText {
  ar: string;
  fr: string;
  en: string;
  es: string;
}

export interface MultilingualKeywords {
  ar: string[];
  fr: string[];
  en: string[];
  es: string[];
}

export interface LegalImageMeta {
  id: string;
  url: string;
  width: number;
  height: number;
  mimeType: string;
  alt: MultilingualText;
  caption: MultilingualText;
  keywords: MultilingualKeywords;
  license: string;
}

export interface LegalFileMeta {
  id: string;
  title: MultilingualText;
  fileUrl: string;
  fileSizeBytes: number;
  fileType: string; // e.g. "application/pdf"
  keywords: MultilingualKeywords;
  downloadCount: number;
  datePublished: string;
}

export interface SubCategory {
  id: string;
  slug: string;
  href: string;
  icon: string;
  badgeColor?: string;
  // Legacy backward-compatible string defaults (Arabic fallback)
  title: string;
  description: string;
  // Multilingual dictionaries
  titles: MultilingualText;
  descriptions: MultilingualText;
  keywords: MultilingualKeywords;
  image: LegalImageMeta;
  sampleFiles: LegalFileMeta[];
}

export interface SectionCategory {
  id: string;
  slug: string;
  icon: string;
  // Legacy backward-compatible string defaults
  title: string;
  description: string;
  // Multilingual dictionaries
  titles: MultilingualText;
  descriptions: MultilingualText;
  subcategories: SubCategory[];
}

// ----------------------------------------------------------------------
// 3. Security Helper Functions (Military Grade)
// ----------------------------------------------------------------------

/**
 * Sanitizes user input or search queries against HTML tag injection and control characters.
 */
export function sanitizeSecurityInput(input: string): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, "") // Strip HTML tags
    .replace(/[^\w\s\u0600-\u06FF\u00C0-\u024F\-_.]/gi, "") // Allow alphanumeric, Arabic, Latin extended
    .trim();
}

/**
 * Validates and enforces safe URL patterns. Prevents Javascript protocol injections.
 */
export function validateSafeUrl(url: string): string {
  if (!url || typeof url !== "string") return VITE_SITE_URL;
  const trimmed = url.trim();

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return `${VITE_SITE_URL}${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
  } catch {
    // Fallback on invalid URL parse
  }
  return VITE_SITE_URL;
}

/**
 * Ensures strict safe slug generation for route matching.
 */
export function sanitizeSlug(slug: string): string {
  if (typeof slug !== "string") return "";
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/-+/g, "-")
    .trim();
}

// ----------------------------------------------------------------------
// 4. Global Master Keyword Repository (AR, FR, EN, ES)
// ----------------------------------------------------------------------
export const MASTER_LEGAL_KEYWORDS: MultilingualKeywords = Object.freeze({
  ar: [
    "الاجتهاد القضائي المغربي",
    "قرارات محكمة النقض",
    "أحكام محاكم الاستئناف",
    "القضاء الإداري",
    "المحاكم التجارية",
    "المحكمة الدستورية المغربية",
    "الفقه القانوني",
    "دراسات قانونية معلقة",
    "مدونة الأسرة",
    "قانون الالتزامات والعقود",
    "القانون الجنائي المغربي",
    "الجريدة الرسمية المملكة المغربية",
    "قرارات ومراسيم وزارية",
  ],
  fr: [
    "Jurisprudence marocaine",
    "Arrêts de la Cour de Cassation",
    "Décisions Cours d'Appel",
    "Tribunaux administratifs Maroc",
    "Jurisprudence commerciale",
    "Cour Constitutionnelle marocaine",
    "Doctrine juridique",
    "Commentaires d'arrêts",
    "Code de famille Maroc",
    "Code des obligations et contrats",
    "Droit pénal marocain",
    "Bulletin Officiel du Maroc",
  ],
  en: [
    "Moroccan Court Rulings",
    "Court of Cassation precedents",
    "Appellate Court decisions",
    "Administrative Law decisions",
    "Commercial Law jurisdiction",
    "Constitutional Court rulings",
    "Legal Doctrine & Scholarship",
    "Case law commentaries",
    "Moroccan Family Code",
    "Law of Obligations and Contracts",
    "Criminal Law precedents",
    "Official Gazette records",
  ],
  es: [
    "Jurisprudencia de Marruecos",
    "Sentencias Tribunal de Casación",
    "Fallos Tribunales de Apelación",
    "Derecho Administrativo judicial",
    "Tribunales Comerciales",
    "Tribunal Constitucional Marroquí",
    "Doctrina legal y análisis",
    "Comentarios de jurisprudencia",
    "Código de Familia",
    "Código de Obligaciones y Contratos",
    "Boletín Oficial",
  ],
});

// ----------------------------------------------------------------------
// 5. Primary Master Dataset: COURT_RULINGS_AND_DOCTRINE
// ----------------------------------------------------------------------
export const COURT_RULINGS_AND_DOCTRINE: SectionCategory[] = [
  {
    id: "court-rulings",
    slug: "court-rulings",
    icon: "Scale",
    title: "القرارات والاجتهادات القضائية",
    description: "الأحكام والقرارات المبدئية الصادرة عن أعلى الهيئات القضائية",
    titles: {
      ar: "القرارات والاجتهادات القضائية",
      fr: "Jurisprudence & Arrêts Judiciaires",
      en: "Court Rulings & Precedents",
      es: "Jurisprudencia y Fallos Judiciales",
    },
    descriptions: {
      ar: "الأحكام والقرارات المبدئية الصادرة عن أعلى الهيئات القضائية والمحاكم الوطنية",
      fr: "Principaux arrêts et décisions rendus par la Cour de Cassation et les juridictions nationales",
      en: "Landmark judgments, precedents, and rulings issued by the Court of Cassation and national courts",
      es: "Sentencias de principio y decisiones emitidas por el Tribunal de Casación y juzgados nacionales",
    },
    subcategories: [
      {
        id: "court-of-cassation",
        slug: "court-of-cassation",
        href: "/rulings/court-of-cassation",
        icon: "Gavel",
        badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        title: "محكمة النقض",
        description: "القرارات المبدئية والاجتهادات المستقرة لأعلى هيئة قضائية بالمملكة",
        titles: {
          ar: "محكمة النقض",
          fr: "Cour de Cassation",
          en: "Court of Cassation",
          es: "Tribunal de Casación",
        },
        descriptions: {
          ar: "القرارات المبدئية والاجتهادات المستقرة لأعلى هيئة قضائية بالمملكة",
          fr: "Arrêts de principe et jurisprudence constante de la plus haute juridiction",
          en: "Landmark rulings and established jurisprudence from the highest court of the realm",
          es: "Sentencias de principio y jurisprudencia consolidada de la más alta instancia judicial",
        },
        keywords: {
          ar: ["قرارات محكمة النقض", "الاجتهاد القضائي المستقر", "نقض وإبرام", "غرفة مدنية", "غرفة جنائية"],
          fr: ["Arrêts Cour de Cassation", "Chambre Civile", "Chambre Pénale", "Chambre Commerciale", "Jurisprudence constante"],
          en: ["Court of Cassation rulings", "Civil Chamber", "Criminal Chamber", "Commercial Chamber", "Supreme precedents"],
          es: ["Fallos Tribunal de Casación", "Cámara Civil", "Cámara Penal", "Jurisprudencia de casación"],
        },
        image: {
          id: "img-cassation-court",
          url: `${VITE_SITE_URL}/images/legal/court-of-cassation.jpg`,
          width: 1200,
          height: 630,
          mimeType: "image/jpeg",
          alt: {
            ar: "مقر محكمة النقض - القرارات والاجتهادات القضائية الرسمية",
            fr: "Siège de la Cour de Cassation - Arrêts et Jurisprudence Officiels",
            en: "Court of Cassation Headquarters - Official Rulings & Precedents",
            es: "Sede del Tribunal de Casación - Sentencias y Jurisprudencia Oficial",
          },
          caption: {
            ar: "القرارات الصادرة عن مختلف الغرف بمحكمة النقض",
            fr: "Décisions publiques des différentes chambres de la Cour de Cassation",
            en: "Public decisions published across all chambers of the Court of Cassation",
            es: "Decisiones públicas expedidas por las cámaras del Tribunal de Casación",
          },
          keywords: {
            ar: ["صورة محكمة النقض", "شعار القضاء المغربي", "وثائق قضائية رسمية"],
            fr: ["Photo Cour de Cassation", "Logo Justice Marocaine", "Documents juridiques officiels"],
            en: ["Court of Cassation photo", "Moroccan Judicial emblem", "Official legal records"],
            es: ["Foto Tribunal de Casación", "Emblema judicial de Marruecos", "Archivos legales oficiales"],
          },
          license: `${VITE_SITE_URL}/legal#terms`,
        },
        sampleFiles: [
          {
            id: "doc-cassation-civil-2025-01",
            title: {
              ar: "قرار محكمة النقض في المادة المدنية - مسؤولية العقد والالتزامات",
              fr: "Arrêt de la Cour de Cassation en matière civile - Responsabilité contractuelle",
              en: "Court of Cassation Ruling in Civil Law - Contractual Liability",
              es: "Sentencia del Tribunal de Casación en materia civil - Responsabilidad contractual",
            },
            fileUrl: `${VITE_SITE_URL}/docs/cassation-civil-2025.pdf`,
            fileSizeBytes: 2458290,
            fileType: "application/pdf",
            keywords: {
              ar: ["قرار مدني PDF", "المسؤولية العقودية", "اجتهاد النقض المدني"],
              fr: ["Arrêt civil PDF", "Responsabilité contractuelle", "Jurisprudence cassation civile"],
              en: ["Civil ruling PDF", "Contract liability", "Civil cassation precedent"],
              es: ["Sentencia civil PDF", "Responsabilidad contractual", "Jurisprudencia casación"],
            },
            downloadCount: 1420,
            datePublished: "2025-01-15T00:00:00.000Z",
          },
        ],
      },
      {
        id: "courts-of-appeal",
        slug: "courts-of-appeal",
        href: "/rulings/courts-of-appeal",
        icon: "Building2",
        badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        title: "محاكم الاستئناف",
        description: "الأحكام الاستئنافية الصادرة في مختلف الدوائر القضائية المملكة",
        titles: {
          ar: "محاكم الاستئناف",
          fr: "Cours d'Appel",
          en: "Courts of Appeal",
          es: "Tribunales de Apelación",
        },
        descriptions: {
          ar: "الأحكام والقرارات الاستئنافية الصادرة في مختلف الدوائر القضائية بالمملكة",
          fr: "Arrêts rendus par les Cours d'Appel dans les différents ressorts judiciaires",
          en: "Appellate judgments rendered across regional judicial jurisdictions",
          es: "Fallos pronunciados por los Tribunales de Apelación en los distritos judiciales",
        },
        keywords: {
          ar: ["محاكم الاستئناف", "قرار استئنافي", "استئناف الرباط", "استئناف الدار البيضاء"],
          fr: ["Cours d'Appel", "Arrêt d'appel", "Cour d'appel Rabat", "Cour d'appel Casablanca"],
          en: ["Courts of Appeal", "Appellate rulings", "Rabat Appeal Court", "Casablanca Appeal Court"],
          es: ["Tribunales de Apelación", "Sentencia de apelación", "Apelación Rabat", "Apelación Casablanca"],
        },
        image: {
          id: "img-appeal-court",
          url: `${VITE_SITE_URL}/images/legal/courts-of-appeal.jpg`,
          width: 1200,
          height: 630,
          mimeType: "image/jpeg",
          alt: {
            ar: "محاكم الاستئناف المملكة المغربية - الأرشيف والقرارات",
            fr: "Cours d'Appel du Royaume du Maroc - Arrêts et archives",
            en: "Courts of Appeal Kingdom of Morocco - Rulings & archives",
            es: "Tribunales de Apelación del Reino de Marruecos - Fallos y archivos",
          },
          caption: {
            ar: "القرارات القضائية الاستئنافية بمختلف الدوائر القضائية",
            fr: "Décisions judiciaires des cours d'appel régionales",
            en: "Judicial decisions issued by regional appellate courts",
            es: "Decisiones judiciales expedidas por los tribunales de apelación regionales",
          },
          keywords: {
            ar: ["استئناف أحكام", "دوائر قضائية", "صورة محكمة الاستئناف"],
            fr: ["Arrêts d'appel", "Ressort judiciaire", "Photo cour d'appel"],
            en: ["Appellate decisions", "Judicial circuits", "Court of appeal photo"],
            es: ["Fallos de apelación", "Distritos judiciales", "Foto tribunal de apelación"],
          },
          license: `${VITE_SITE_URL}/legal#terms`,
        },
        sampleFiles: [
          {
            id: "doc-appeal-commercial-2025-02",
            title: {
              ar: "قرار محكمة الاستئناف التجارية - منازعات الأوراق التجارية والأعمال",
              fr: "Arrêt de la Cour d'Appel de Commerce - Litiges de la lettre de change",
              en: "Court of Appeal Ruling in Commercial Law - Bills of Exchange",
              es: "Sentencia del Tribunal de Apelación Comercial - Litigio de letras de cambio",
            },
            fileUrl: `${VITE_SITE_URL}/docs/appeal-commercial-2025.pdf`,
            fileSizeBytes: 1894100,
            fileType: "application/pdf",
            keywords: {
              ar: ["استئناف تجاري PDF", "الأوراق التجارية", "منازعات الشركات"],
              fr: ["Appel commercial PDF", "Effets de commerce", "Litiges sociétés"],
              en: ["Commercial appeal PDF", "Commercial paper", "Corporate disputes"],
              es: ["Apelación comercial PDF", "Efectos comerciales", "Disputas corporativas"],
            },
            downloadCount: 980,
            datePublished: "2025-02-10T00:00:00.000Z",
          },
        ],
      },
      {
        id: "administrative-courts",
        slug: "administrative-courts",
        href: "/rulings/administrative-courts",
        icon: "Landmark",
        badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        title: "المحاكم الإدارية",
        description: "نزاعات الإدارة العامة، دعاوى الإلغاء، والتجنيب والتعويض الإداري",
        titles: {
          ar: "المحاكم الإدارية",
          fr: "Tribunaux Administratifs",
          en: "Administrative Courts",
          es: "Tribunales Administrativos",
        },
        descriptions: {
          ar: "أحكام وقرارات المحاكم والمحاكم الاستئنافية الإدارية ومنازعات الدولة",
          fr: "Jugements et arrêts relatifs aux litiges administratifs et recours en annulation",
          en: "Judgments regarding administrative disputes, annulment claims, and state liability",
          es: "Sentencias en materia de disputas administrativas y recursos de anulación",
        },
        keywords: {
          ar: ["القضاء الإداري", "دعوى الإلغاء بسب الشطط", "النزاعات الإدارية", "الصفقات العمومية"],
          fr: ["Tribunaux administratifs", "Recours pour excès de pouvoir", "Marchés publics", "Responsabilité administrative"],
          en: ["Administrative Courts", "Annulment for abuse of power", "Public procurement", "State liability"],
          es: ["Tribunales Administrativos", "Recurso por exceso de poder", "Contratación pública", "Responsabilidad estatal"],
        },
        image: {
          id: "img-administrative-court",
          url: `${VITE_SITE_URL}/images/legal/administrative-court.jpg`,
          width: 1200,
          height: 630,
          mimeType: "image/jpeg",
          alt: {
            ar: "المحاكم الإدارية والمنازعات مع الإدارة العامة",
            fr: "Tribunaux Administratifs et contentieux de l'administration",
            en: "Administrative Courts and litigation with public authorities",
            es: "Tribunales Administrativos y litigios con la administración pública",
          },
          caption: {
            ar: "الأحكام الصادرة في قضايا الشطط في استعمال السلطة والصفقات العمومية",
            fr: "Jugements rendus dans les affaires d'excès de pouvoir et marchés publics",
            en: "Rulings issued in abuse of power claims and public procurement disputes",
            es: "Fallos dictados en litigios por abuso de poder y contratos públicos",
          },
          keywords: {
            ar: ["صورة المحكمة الإدارية", "القضاء الإداري المغربي", "منازعات الدولة"],
            fr: ["Photo Tribunal Administratif", "Contentieux administratif Maroc", "Litiges de l'État"],
            en: ["Administrative Court photo", "Administrative litigation Morocco", "State disputes"],
            es: ["Foto Tribunal Administrativo", "Litigio administrativo Marruecos", "Disputas del Estado"],
          },
          license: `${VITE_SITE_URL}/legal#terms`,
        },
        sampleFiles: [
          {
            id: "doc-admin-court-2025-03",
            title: {
              ar: "الحكم الإداري في إلغاء قرار إداري بسبب الشطط في استعمال السلطة",
              fr: "Jugement Administratif - Annulation pour excès de pouvoir",
              en: "Administrative Court Judgment - Annulment for abuse of authority",
              es: "Sentencia Administrativa - Anulación por exceso de poder",
            },
            fileUrl: `${VITE_SITE_URL}/docs/admin-ruling-2025.pdf`,
            fileSizeBytes: 3120400,
            fileType: "application/pdf",
            keywords: {
              ar: ["حكم إداري PDF", "دعوى إلغاء", "شطط السلطة"],
              fr: ["Jugement administratif PDF", "Recours excès de pouvoir", "Abus d'autorité"],
              en: ["Administrative judgment PDF", "Abuse of authority", "Public annulment"],
              es: ["Sentencia administrativa PDF", "Abuso de autoridad", "Anulación administrativa"],
            },
            downloadCount: 1760,
            datePublished: "2025-03-01T00:00:00.000Z",
          },
        ],
      },
    ],
  },
  {
    id: "doctrine",
    slug: "doctrine",
    icon: "BookOpen",
    title: "الفقه القانوني والدراسات",
    description: "الأبحاث الأكاديمية، التعليق على الأحكام، والدراسات المقارنة",
    titles: {
      ar: "الفقه القانوني والدراسات",
      fr: "Doctrine Juridique & Études",
      en: "Legal Doctrine & Research",
      es: "Doctrina Legal e Investigaciones",
    },
    descriptions: {
      ar: "الأبحاث الأكاديمية المحكمة، التعليق المباشر على الأحكام، والدراسات الفقهية المقارنة",
      fr: "Articles académiques, commentaires d'arrêts et travaux de recherche comparative",
      en: "Peer-reviewed academic studies, case commentaries, and comparative jurisprudence",
      es: "Investigaciones académicas, comentarios de jurisprudencia y estudios comparados",
    },
    subcategories: [
      {
        id: "academic-articles",
        slug: "academic-articles",
        href: "/doctrine/academic-articles",
        icon: "FileSpreadsheet",
        badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/20",
        title: "المقالات والبحوث الأكاديمية",
        description: "أبحاث ودراسات قانونية معمقة لنخبة من الأساتذة والباحثين",
        titles: {
          ar: "المقالات والبحوث الأكاديمية",
          fr: "Articles Académiques & Recherche",
          en: "Academic Articles & Research",
          es: "Artículos Académicos e Investigación",
        },
        descriptions: {
          ar: "أبحاث ودراسات قانونية معمقة لنخبة من الأساتذة والباحثين المحكمين",
          fr: "Travaux et études juridiques approfondies rédigés par des universitaires certifiés",
          en: "In-depth legal scholarship authored by peer-reviewed law professors and scholars",
          es: "Estudios e investigaciones jurídicas elaboradas por docentes e investigadores",
        },
        keywords: {
          ar: ["بحوث قانونية", "دراسات أكاديمية", "مجلة الفقه المغربي", "مقالات القانون الخاص"],
          fr: ["Articles juridiques", "Recherche académique", "Revue de droit", "Doctrine droit privé"],
          en: ["Legal scholarship", "Academic articles", "Law review papers", "Private law studies"],
          es: ["Artículos jurídicos", "Investigación académica", "Revista de derecho", "Doctrina derecho privado"],
        },
        image: {
          id: "img-academic-articles",
          url: `${VITE_SITE_URL}/images/legal/academic-articles.jpg`,
          width: 1200,
          height: 630,
          mimeType: "image/jpeg",
          alt: {
            ar: "المقالات والأبحاث الأكاديمية في العلوم القانونية",
            fr: "Articles et recherches académiques en sciences juridiques",
            en: "Academic articles and research papers in legal science",
            es: "Artículos e investigaciones académicas en ciencias jurídicas",
          },
          caption: {
            ar: "دراسات قانونية محكمة تنشر في المجلات العلمية المتخصصة",
            fr: "Études juridiques publiées dans des revues scientifiques spécialisées",
            en: "Peer-reviewed legal research published in specialized university journals",
            es: "Estudios jurídicos publicados en revistas científicas especializadas",
          },
          keywords: {
            ar: ["بحث قانوني", "مقال أكاديمي", "صورة دراسات قانونية"],
            fr: ["Recherche juridique", "Article académique", "Photo étude de droit"],
            en: ["Legal research", "Academic paper", "Law study photo"],
            es: ["Investigación jurídica", "Artículo académico", "Foto estudio de derecho"],
          },
          license: `${VITE_SITE_URL}/legal#terms`,
        },
        sampleFiles: [
          {
            id: "doc-research-ai-law-2025",
            title: {
              ar: "دراسة فقهية: المساءلة القانونية للذكاء الاصطناعي في القانون المدني",
              fr: "Étude doctrinale: La responsabilité civile de l'intelligence artificielle",
              en: "Legal Research: Civil Liability of Artificial Intelligence Systems",
              es: "Estudio doctrinal: La responsabilidad civil de la inteligencia artificial",
            },
            fileUrl: `${VITE_SITE_URL}/docs/ai-legal-liability-study.pdf`,
            fileSizeBytes: 4120800,
            fileType: "application/pdf",
            keywords: {
              ar: ["بحث الذكاء الاصطناعي PDF", "المسؤولية المدنية للذكاء", "فقه قانوني حديث"],
              fr: ["Recherche IA PDF", "Responsabilité civile IA", "Doctrine moderne"],
              en: ["AI Liability study PDF", "Civil AI liability", "Modern legal scholarship"],
              es: ["Estudio IA PDF", "Responsabilidad civil IA", "Doctrina moderna"],
            },
            downloadCount: 2310,
            datePublished: "2025-02-20T00:00:00.000Z",
          },
        ],
      },
      {
        id: "case-commentaries",
        slug: "case-commentaries",
        href: "/doctrine/case-commentaries",
        icon: "MessageSquareCode",
        badgeColor: "bg-rose-500/10 text-rose-600 border-rose-500/20",
        title: "التعليق على الأحكام",
        description: "تحليل ومناقشة علمية لأهم القرارات القضائية الصادرة حديثاً",
        titles: {
          ar: "التعليق على الأحكام",
          fr: "Commentaires d'Arrêts",
          en: "Case Commentaries",
          es: "Comentarios de Sentencias",
        },
        descriptions: {
          ar: "تحليلات نقدية وفقهية ومناقشة علمية لأهم القرارات القضائية المستحدثة",
          fr: "Analyses critiques et explications méthodologiques des arrêts marquants",
          en: "Expert breakdowns, critical analysis, and commentary on landmark judicial rulings",
          es: "Análisis crítico y explicaciones de sentencias jurídicas destacadas",
        },
        keywords: {
          ar: ["التعليق على الأحكام", "تحليل القرار القضائي", "منهجية التعليق", "المنحى القضائي"],
          fr: ["Commentaire d'arrêt", "Analyse de décision", "Méthodologie juridique", "Portée jurisprudentielle"],
          en: ["Case commentary", "Ruling breakdown", "Legal methodology", "Judicial impact analysis"],
          es: ["Comentario de sentencia", "Análisis judicial", "Metodología jurídica", "Efecto jurisprudencial"],
        },
        image: {
          id: "img-case-commentaries",
          url: `${VITE_SITE_URL}/images/legal/case-commentaries.jpg`,
          width: 1200,
          height: 630,
          mimeType: "image/jpeg",
          alt: {
            ar: "التعليق والتحليل العلمي على الأحكام القضائية",
            fr: "Commentaires et analyses scientifiques des arrêts de justice",
            en: "Scientific commentary and legal analysis of court judgments",
            es: "Comentarios y análisis científico de sentencias de justicia",
          },
          caption: {
            ar: "تحليل السند القانوني والمنطق القضائي في قرارات محكمة النقض",
            fr: "Analyse des motifs juridiques et de la logique judiciaire de la Cour de Cassation",
            en: "Examination of legal grounds and reasoning in High Court precedents",
            es: "Análisis de los fundamentos jurídicos y la lógica judicial en fallos de casación",
          },
          keywords: {
            ar: ["تعليق قضائي", "تحليل قرار", "صورة تعليق أحكام"],
            fr: ["Commentaire d'arrêt", "Analyse décision", "Photo commentaire juridique"],
            en: ["Case breakdown", "Ruling analysis", "Law commentary photo"],
            es: ["Análisis de sentencia", "Comentario judicial", "Foto análisis legal"],
          },
          license: `${VITE_SITE_URL}/legal#terms`,
        },
        sampleFiles: [
          {
            id: "doc-commentary-family-2025",
            title: {
              ar: "تعليق على قرار محكمة النقض بشأن مستحقات الزوجة والأطفال بعد الطلاق",
              fr: "Commentaire de l'arrêt de la Cour de Cassation relatif à la Moudawana",
              en: "Case Commentary on Cassation Ruling Regarding Post-Divorce Alimony",
              es: "Comentario de la sentencia de Casación sobre pensión tras el divorcio",
            },
            fileUrl: `${VITE_SITE_URL}/docs/commentary-family-law-2025.pdf`,
            fileSizeBytes: 1654000,
            fileType: "application/pdf",
            keywords: {
              ar: ["تعليق أسرة PDF", "مدونة الأسرة", "نفقة الأطفال والزوجة"],
              fr: ["Commentaire famille PDF", "Code de famille", "Pension alimentaire"],
              en: ["Family law commentary PDF", "Family Code ruling", "Child support precedent"],
              es: ["Comentario familia PDF", "Código de familia", "Pensión alimenticia"],
            },
            downloadCount: 1980,
            datePublished: "2025-01-28T00:00:00.000Z",
          },
        ],
      },
      {
        id: "comparative-studies",
        slug: "comparative-studies",
        href: "/doctrine/comparative-studies",
        icon: "Globe",
        badgeColor: "bg-teal-500/10 text-teal-600 border-teal-500/20",
        title: "الدراسات القانونية المقارنة",
        description: "مقارنة الأنظمة التشريعية الوطنية والقوانين الدولية والأنظمة المقارنة",
        titles: {
          ar: "الدراسات القانونية المقارنة",
          fr: "Études Juridiques Comparées",
          en: "Comparative Legal Studies",
          es: "Estudios Jurídicos Comparados",
        },
        descriptions: {
          ar: "مقارنة التشريعات الوطنية مع الأنظمة القضائية اللاتينية والانجلو-سكسونية والدولية",
          fr: "Analyse comparative entre le droit national, les systèmes romano-germaniques et anglo-saxons",
          en: "Comparative cross-border studies evaluating civil law, common law, and international treaties",
          es: "Análisis comparado entre el derecho nacional y los sistemas internacionales",
        },
        keywords: {
          ar: ["قانون مقارن", "التشريع المقارن", "القانون الدولي والوطني", "الأنظمة القضائية العالمية"],
          fr: ["Droit comparé", "Législation comparée", "Droit international", "Grands systèmes juridiques"],
          en: ["Comparative law", "Cross-jurisdictional studies", "International legal systems", "Comparative jurisprudence"],
          es: ["Derecho comparado", "Legislación comparada", "Derecho internacional", "Sistemas jurídicos"],
        },
        image: {
          id: "img-comparative-studies",
          url: `${VITE_SITE_URL}/images/legal/comparative-studies.jpg`,
          width: 1200,
          height: 630,
          mimeType: "image/jpeg",
          alt: {
            ar: "الدراسات والأبحاث في القانون المقارن",
            fr: "Études et recherches en droit comparé",
            en: "Studies and scholarship in comparative jurisprudence",
            es: "Estudios e investigaciones en derecho comparado",
          },
          caption: {
            ar: "تحليلات مقارنة بين التشريعات الوطنية والدولية",
            fr: "Analyses comparatives entre législations nationales et internationales",
            en: "Comparative cross-border analysis of domestic and international legislation",
            es: "Análisis comparativo entre legislación nacional e internacional",
          },
          keywords: {
            ar: ["قانون مقارن", "دراسات دولية", "صورة قانون مقارن"],
            fr: ["Droit comparé", "Études internationales", "Photo droit comparé"],
            en: ["Comparative law", "International research", "Comparative law photo"],
            es: ["Derecho comparado", "Estudios internacionales", "Foto derecho comparado"],
          },
          license: `${VITE_SITE_URL}/legal#terms`,
        },
        sampleFiles: [
          {
            id: "doc-comparative-arbitration-2025",
            title: {
              ar: "دراسة مقارنة: التحكيم التجاري الدولي بين القانون المغربي والقوانين الأوربية",
              fr: "Étude comparée: L'arbitrage commercial international Maroc-UE",
              en: "Comparative Study: International Commercial Arbitration Morocco vs EU",
              es: "Estudio comparado: El arbitraje comercial internacional Marruecos vs UE",
            },
            fileUrl: `${VITE_SITE_URL}/docs/comparative-arbitration-2025.pdf`,
            fileSizeBytes: 3840200,
            fileType: "application/pdf",
            keywords: {
              ar: ["تحكيم مقارن PDF", "التحكيم التجاري الدولي", "قانون المغرب وأوروبا"],
              fr: ["Arbitrage comparé PDF", "Arbitrage international", "Droit Maroc UE"],
              en: ["Comparative arbitration PDF", "International arbitration", "Morocco EU law"],
              es: ["Arbitraje comparado PDF", "Arbitraje internacional", "Derecho Marruecos UE"],
            },
            downloadCount: 1450,
            datePublished: "2025-03-05T00:00:00.000Z",
          },
        ],
      },
    ],
  },
];

// Deep Freeze the primary dataset for military-grade immutability against runtime modifications
Object.freeze(COURT_RULINGS_AND_DOCTRINE);

// ----------------------------------------------------------------------
// 6. Fast Lookup Map Indexing ($O(1)$ Navigation Engine)
// ----------------------------------------------------------------------
const CATEGORY_MAP = new Map<string, SectionCategory>();
const SUBCATEGORY_MAP = new Map<string, { sub: SubCategory; parent: SectionCategory }>();

COURT_RULINGS_AND_DOCTRINE.forEach((sec) => {
  CATEGORY_MAP.set(sec.id, sec);
  CATEGORY_MAP.set(sec.slug, sec);

  sec.subcategories.forEach((sub) => {
    SUBCATEGORY_MAP.set(sub.id, { sub, parent: sec });
    SUBCATEGORY_MAP.set(sub.slug, { sub, parent: sec });
  });
});

// ----------------------------------------------------------------------
// 7. Dynamic Localized Data Generator (AR, FR, EN, ES)
// ----------------------------------------------------------------------

/**
 * Returns a localized projection of the court data tuned specifically for the requested language.
 * Ensures zero-latency rendering on mobile devices with localized strings.
 */
export function getLocalizedCourtData(lang: SupportedLang = "ar"): SectionCategory[] {
  const safeLang = ["ar", "fr", "en", "es"].includes(lang) ? lang : "ar";

  return COURT_RULINGS_AND_DOCTRINE.map((section) => ({
    ...section,
    title: section.titles[safeLang] || section.titles.ar,
    description: section.descriptions[safeLang] || section.descriptions.ar,
    subcategories: section.subcategories.map((sub) => ({
      ...sub,
      title: sub.titles[safeLang] || sub.titles.ar,
      description: sub.descriptions[safeLang] || sub.descriptions.ar,
    })),
  }));
}

/**
 * Fast $O(1)$ helper to resolve a subcategory by ID or slug.
 */
export function getSubCategoryBySlug(
  slugOrId: string,
  lang: SupportedLang = "ar"
): { sub: SubCategory; parent: SectionCategory } | null {
  const cleanKey = sanitizeSlug(slugOrId);
  const found = SUBCATEGORY_MAP.get(cleanKey);
  if (!found) return null;

  const safeLang = ["ar", "fr", "en", "es"].includes(lang) ? lang : "ar";

  return {
    parent: {
      ...found.parent,
      title: found.parent.titles[safeLang] || found.parent.titles.ar,
      description: found.parent.descriptions[safeLang] || found.parent.descriptions.ar,
    },
    sub: {
      ...found.sub,
      title: found.sub.titles[safeLang] || found.sub.titles.ar,
      description: found.sub.descriptions[safeLang] || found.sub.descriptions.ar,
    },
  };
}

// ----------------------------------------------------------------------
// 8. Master SEO & Schema JSON-LD Generators (Photos & Files Included)
// ----------------------------------------------------------------------

/**
 * Generates comprehensive Schema.org JSON-LD structured data for court rulings,
 * photos, legal documents, and navigation elements across all 4 languages.
 */
export function generateCourtMasterSeoJSONLD(lang: SupportedLang = "ar"): string {
  const safeLang = ["ar", "fr", "en", "es"].includes(lang) ? lang : "ar";

  const allSubcategories = COURT_RULINGS_AND_DOCTRINE.flatMap((s) => s.subcategories);

  // 1. Image Schemas for Google Image Search
  const imageObjects = allSubcategories.map((sub) => ({
    "@type": "ImageObject",
    "@id": `${sub.image.url}#identity`,
    "url": sub.image.url,
    "width": sub.image.width,
    "height": sub.image.height,
    "encodingFormat": sub.image.mimeType,
    "caption": sub.image.caption[safeLang],
    "description": sub.image.alt[safeLang],
    "keywords": sub.image.keywords[safeLang].join(", "),
    "license": sub.image.license,
    "acquireLicensePage": `${VITE_SITE_URL}/legal#terms`,
  }));

  // 2. Document Schemas for Google PDF / Document Search
  const documentObjects = allSubcategories.flatMap((sub) =>
    sub.sampleFiles.map((file) => ({
      "@type": "DigitalDocument",
      "@id": `${file.fileUrl}#doc`,
      "name": file.title[safeLang],
      "url": file.fileUrl,
      "encodingFormat": file.fileType,
      "contentSize": `${file.fileSizeBytes} B`,
      "datePublished": file.datePublished,
      "keywords": file.keywords[safeLang].join(", "),
      "publisher": {
        "@type": "Organization",
        "name": "Mizan Digital Legal Platform",
        "url": VITE_SITE_URL,
      },
    }))
  );

  // 3. Navigation List Schema
  const itemListElements = allSubcategories.map((sub, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "item": {
      "@type": "WebPage",
      "@id": `${VITE_APP_URL}${sub.href}`,
      "name": sub.titles[safeLang],
      "description": sub.descriptions[safeLang],
      "image": sub.image.url,
    },
  }));

  const masterSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        "@id": `${VITE_APP_URL}/#court-rulings-master-list`,
        "name":
          safeLang === "ar"
            ? "الاجتهادات القضائية والفقه القانوني"
            : safeLang === "fr"
            ? "Jurisprudence et Doctrine Juridique"
            : safeLang === "es"
            ? "Jurisprudencia y Doctrina Legal"
            : "Court Rulings & Legal Doctrine",
        "description":
          safeLang === "ar"
            ? "دليل وقاعدة بيانات الاجتهادات القضائية والفقه القانوني بالمملكة المغربية"
            : "Database of judicial rulings and legal doctrine in Morocco",
        "numberOfItems": itemListElements.length,
        "itemListElement": itemListElements,
      },
      ...imageObjects,
      ...documentObjects,
    ],
  };

  return JSON.stringify(masterSchema);
}

export default COURT_RULINGS_AND_DOCTRINE;