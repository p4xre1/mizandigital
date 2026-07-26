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

export interface LawSchool {
  id: string;
  slug: string;
  name: LocalizedString;
  university: LocalizedString;
  city: LocalizedString;
  established: number;
  students: string;
  // Phones-First Actionable Metadata
  phone: string;
  telUri: string;
  email: string;
  website: string;
  address: LocalizedString;
  description: LocalizedString;
  programs: LocalizedString[];
  // UI/UX Styling Props (Mobile Touch Optimized)
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
 * Military-grade input sanitizer for search queries, slugs, and mobile parameters.
 * Cleans XSS vectors, SQL syntax injections, and invalid dynamic characters.
 */
export const sanitizeSchoolQuery = (input: string): string => {
  if (!input) return "";
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/gi, "")
    .replace(/\s+/g, "-")
    .substring(0, 80);
};

export const LAW_SCHOOLS: LawSchool[] = [
  {
    id: "um5-rabat-agdal",
    slug: "um5-rabat-agdal",
    canonicalUrl: `${SITE_DOMAIN}/schools/um5-rabat-agdal`,
    name: {
      ar: "كلية العلوم القانونية والاقتصادية والاجتماعية أكدال — الرباط",
      fr: "FSJES Agdal — Rabat",
      en: "Faculty of Law — Agdal, Rabat",
      es: "Facultad de Derecho — Agdal, Rabat",
    },
    university: {
      ar: "جامعة محمد الخامس بالرباط",
      fr: "Université Mohammed V de Rabat",
      en: "Mohammed V University in Rabat",
      es: "Universidad Mohammed V de Rabat",
    },
    city: {
      ar: "الرباط",
      fr: "Rabat",
      en: "Rabat",
      es: "Rabat",
    },
    established: 1957,
    students: "24,000+",
    phone: "+212 537 77 18 34",
    telUri: "tel:+212537771834",
    email: "fsjes.agdal@um5.ac.ma",
    website: "https://fsjes-agdal.um5.ac.ma",
    address: {
      ar: "شارع الأمم المتحدة، أكدال، ص.ب 6511، الرباط",
      fr: "Avenue des Nations Unies, Agdal, B.P. 6511, Rabat",
      en: "Avenue des Nations Unies, Agdal, P.O. Box 6511, Rabat",
      es: "Avenue des Nations Unies, Agdal, B.P. 6511, Rabat",
    },
    description: {
      ar: "أعرق كلية للحقوق في المغرب، مرجع أكاديمي في القانون العام والخاص والعلوم السياسية.",
      fr: "La plus ancienne faculté de droit du Maroc, référence en droit public, privé et sciences politiques.",
      en: "Morocco's premier law faculty, a reference institution for public law, private law, and political science.",
      es: "La facultad de derecho más antigua de Marruecos, referencia en derecho público, privado y ciencias políticas.",
    },
    programs: [
      { ar: "القانون الخاص", fr: "Droit Privé", en: "Private Law", es: "Derecho Privado" },
      { ar: "القانون العام والعلوم السياسية", fr: "Droit Public & Sciences Politiques", en: "Public Law & Political Science", es: "Derecho Público y Ciencias Políticas" },
      { ar: "العلوم الجنائية والأمنية", fr: "Sciences Criminelles", en: "Criminal Sciences", es: "Ciencias Penales" },
    ],
    accentColor: "border-blue-500/30 text-blue-600 dark:text-blue-400",
    badgeBg: "bg-blue-500/10 hover:bg-blue-500/20",
    textColor: "text-blue-600 dark:text-blue-400",
    keywords: {
      ar: ["جامعة_محمد_الخامس", "حقوق_أكدال", "الرباط", "ماستر_القانون", "ميزان_الجامعي"],
      fr: ["FSJES_Agdal", "Université_Mohammed_V", "Droit_Rabat", "Master_Droit_Maroc"],
      en: ["FSJES_Agdal", "Rabat_Law_Faculty", "Mohammed_V_University", "Moroccan_Law_School"],
      es: ["FSJES_Agdal", "Facultad_Derecho_Rabat", "Universidad_Mohammed_V"],
    },
    photoMeta: {
      coverImageUrl: `${SITE_DOMAIN}/images/schools/agdal-cover.webp`,
      ogImageUrl: `${SITE_DOMAIN}/images/og/agdal-og.jpg`,
      twitterImageUrl: `${SITE_DOMAIN}/images/og/agdal-twitter.jpg`,
      width: 1200,
      height: 630,
      altText: {
        ar: "صورة كلية العلوم القانونية والاقتصادية والاجتماعية أكدال الرباط",
        fr: "Faculté des Sciences Juridiques, Économiques et Sociales Agdal Rabat",
        en: "Faculty of Law Agdal Rabat Morocco - Main Entrance",
        es: "Facultad de Derecho Agdal Rabat Marruecos",
      },
      caption: {
        ar: "كلية الحقوق أكدال الرباط عبر منصة ميزان الرقمية",
        fr: "Faculté de droit Agdal Rabat sur la plateforme Mizan Digital",
        en: "Law Faculty Agdal Rabat on Mizan Digital Platform",
        es: "Facultad de derecho Agdal Rabat en la plataforma Mizan",
      },
    },
    fileMeta: {
      fileKeywords: {
        ar: ["امتحانات_أكدال_pdf", "دروس_حقوق_الرباط", "ماستر_أكدال_pdf"],
        fr: ["examens_agdal_pdf", "cours_droit_rabat", "master_agdal_pdf"],
        en: ["agdal_exams_pdf", "rabat_law_lectures", "agdal_master_guide"],
        es: ["examenes_agdal_pdf", "apuntes_derecho_rabat", "guia_master_agdal"],
      },
      mimeType: "application/pdf",
      allowedExtensions: ["pdf", "docx"],
    },
  },
  {
    id: "um5-rabat-souissi",
    slug: "um5-rabat-souissi",
    canonicalUrl: `${SITE_DOMAIN}/schools/um5-rabat-souissi`,
    name: {
      ar: "كلية العلوم القانونية والاقتصادية والاجتماعية السويسي وسلا",
      fr: "FSJES Souissi & Salé",
      en: "Faculty of Law — Souissi & Salé",
      es: "Facultad de Derecho — Souissi y Salé",
    },
    university: {
      ar: "جامعة محمد الخامس بالرباط",
      fr: "Université Mohammed V de Rabat",
      en: "Mohammed V University in Rabat",
      es: "Universidad Mohammed V de Rabat",
    },
    city: {
      ar: "الرباط / سلا",
      fr: "Rabat / Salé",
      en: "Rabat / Salé",
      es: "Rabat / Salé",
    },
    established: 1993,
    students: "22,000+",
    phone: "+212 537 77 00 00",
    telUri: "tel:+212537770000",
    email: "fsjes.souissi@um5.ac.ma",
    website: "https://fsjes-souissi.um5.ac.ma",
    address: {
      ar: "مدينة العرفان، ص.ب 6430، الرباط",
      fr: "Cité Madinat Al Irfane, B.P. 6430, Rabat",
      en: "Madinat Al Irfane Campus, P.O. Box 6430, Rabat",
      es: "Campus Madinat Al Irfane, B.P. 6430, Rabat",
    },
    description: {
      ar: "مركز أكاديمي متميز متخصص في الدراسات القانونية المعمقة وقوانين الشغل والإدارة.",
      fr: "Centre académique d'excellence spécialisé en études juridiques approfondies et droit du travail.",
      en: "Academic center of excellence specialized in advanced legal studies and labor law.",
      es: "Centro académico de excelencia especializado en estudios jurídicos avanzados y derecho laboral.",
    },
    programs: [
      { ar: "قانون الشغل والتحول الرقمي", fr: "Droit du travail & numérique", en: "Labor & Digital Law", es: "Derecho laboral y digital" },
      { ar: "القانون الإداري والمؤسسات", fr: "Droit administratif & institutions", en: "Administrative & Institutional Law", es: "Derecho administrativo e institucional" },
      { ar: "العلوم الجنائية", fr: "Sciences criminelles", en: "Criminal Sciences", es: "Ciencias penales" },
    ],
    accentColor: "border-indigo-500/30 text-indigo-600 dark:text-indigo-400",
    badgeBg: "bg-indigo-500/10 hover:bg-indigo-500/20",
    textColor: "text-indigo-600 dark:text-indigo-400",
    keywords: {
      ar: ["حقوق_السويسي", "سلا", "الرباط", "قانون_العمل", "ميزان"],
      fr: ["FSJES_Souissi", "Salé_Droit", "Rabat_Université", "Droit_Travail"],
      en: ["Souissi_Law_Faculty", "Sale_Law", "Morocco_Legal_School"],
      es: ["FSJES_Souissi", "Derecho_Sale", "Universidad_Rabat"],
    },
    photoMeta: {
      coverImageUrl: `${SITE_DOMAIN}/images/schools/souissi-cover.webp`,
      ogImageUrl: `${SITE_DOMAIN}/images/og/souissi-og.jpg`,
      twitterImageUrl: `${SITE_DOMAIN}/images/og/souissi-twitter.jpg`,
      width: 1200,
      height: 630,
      altText: {
        ar: "صورة كلية الحقوق السويسي وسلا الرباط منصة ميزان",
        fr: "Faculté de droit Souissi et Salé - Mizan",
        en: "Law Faculty Souissi and Salé Campus - Mizan",
        es: "Facultad de derecho Souissi y Salé - Mizan",
      },
      caption: {
        ar: "مستجدات كلية العلوم القانونية السويسي الرباط",
        fr: "Actualités de la faculté des sciences juridiques Souissi Rabat",
        en: "Updates from FSJES Souissi Law Faculty Rabat",
        es: "Actualidades de la facultad de derecho Souissi Rabat",
      },
    },
    fileMeta: {
      fileKeywords: {
        ar: ["امتحانات_السويسي_pdf", "محاضرات_حقوق_سلا", "ماستر_السويسي"],
        fr: ["examens_souissi_pdf", "cours_droit_sale", "master_souissi_pdf"],
        en: ["souissi_exams_pdf", "sale_law_notes", "master_souissi_pdf"],
        es: ["examenes_souissi_pdf", "apuntes_sale_pdf", "master_souissi_pdf"],
      },
      mimeType: "application/pdf",
      allowedExtensions: ["pdf", "docx"],
    },
  },
  {
    id: "uh2-casablanca-ain-chock",
    slug: "uh2-casablanca-ain-chock",
    canonicalUrl: `${SITE_DOMAIN}/schools/uh2-casablanca-ain-chock`,
    name: {
      ar: "كلية الحقوق عين الشق — الدار البيضاء",
      fr: "FSJES Aïn Chock — Casablanca",
      en: "Faculty of Law — Aïn Chock, Casablanca",
      es: "Facultad de Derecho — Aïn Chock, Casablanca",
    },
    university: {
      ar: "جامعة الحسن الثاني بالدار البيضاء",
      fr: "Université Hassan II de Casablanca",
      en: "Hassan II University of Casablanca",
      es: "Universidad Hassan II de Casablanca",
    },
    city: {
      ar: "الدار البيضاء",
      fr: "Casablanca",
      en: "Casablanca",
      es: "Casablanca",
    },
    established: 1975,
    students: "30,000+",
    phone: "+212 522 23 04 09",
    telUri: "tel:+212522230409",
    email: "contact@fsjesac.ma",
    website: "https://fsjesac.univh2c.ma",
    address: {
      ar: "طريق الكليات، عين الشق، ص.ب 8110، الدار البيضاء",
      fr: "Route des Facultés, Aïn Chock, B.P. 8110, Casablanca",
      en: "Route des Facultés, Aïn Chock, P.O. Box 8110, Casablanca",
      es: "Route des Facultés, Aïn Chock, B.P. 8110, Casablanca",
    },
    description: {
      ar: "أكبر كلية حقوق من حيث عدد الطلبة بالمغرب، متخصصة في قانون الأعمال والقانون التجاري والمالي.",
      fr: "La plus grande faculté de droit du Maroc en effectifs, spécialisée en droit des affaires et commercial.",
      en: "The largest law faculty in Morocco by enrollment, specialized in business and commercial law.",
      es: "La mayor facultad de derecho de Marruecos por matrícula, especializada en derecho mercantil.",
    },
    programs: [
      { ar: "قانون الأعمال والتجارة", fr: "Droit des affaires", en: "Business Law", es: "Derecho de Empresa" },
      { ar: "القانون التجاري والمالي", fr: "Droit commercial & financier", en: "Commercial & Financial Law", es: "Derecho Mercantil y Financiero" },
      { ar: "القانون الاجتماعي والعقاري", fr: "Droit social & foncier", en: "Social & Property Law", es: "Derecho Social e Inmobiliario" },
    ],
    accentColor: "border-purple-500/30 text-purple-600 dark:text-purple-400",
    badgeBg: "bg-purple-500/10 hover:bg-purple-500/20",
    textColor: "text-purple-600 dark:text-purple-400",
    keywords: {
      ar: ["عين_الشق", "حقوق_البيضاء", "جامعة_الحسن_الثاني", "قانون_الأعمال", "ميزان"],
      fr: ["FSJES_Ain_Chock", "Casablanca_Droit", "Université_Hassan_II", "Droit_Affaires"],
      en: ["Ain_Chock_Law", "Casablanca_Faculty_Law", "Business_Law_Morocco"],
      es: ["FSJES_Ain_Chock", "Derecho_Casablanca", "Universidad_Hassan_II"],
    },
    photoMeta: {
      coverImageUrl: `${SITE_DOMAIN}/images/schools/ain-chock-cover.webp`,
      ogImageUrl: `${SITE_DOMAIN}/images/og/ain-chock-og.jpg`,
      twitterImageUrl: `${SITE_DOMAIN}/images/og/ain-chock-twitter.jpg`,
      width: 1200,
      height: 630,
      altText: {
        ar: "كلية الحقوق عين الشق الدار البيضاء منصة ميزان",
        fr: "Faculté de droit Aïn Chock Casablanca - Mizan",
        en: "Law Faculty Aïn Chock Casablanca - Mizan Platform",
        es: "Facultad de derecho Aïn Chock Casablanca - Mizan",
      },
      caption: {
        ar: "دليل كلية الحقوق عين الشق كازابلانكا عبر ميزان",
        fr: "Guide de la faculté de droit Aïn Chock Casablanca",
        en: "Aïn Chock Casablanca Law Faculty Directory on Mizan",
        es: "Guía de la facultad de derecho Aïn Chock Casablanca",
      },
    },
    fileMeta: {
      fileKeywords: {
        ar: ["امتحانات_عين_الشق_pdf", "محاضرات_قانون_الأعمال", "ماستر_عين_الشق"],
        fr: ["examens_ain_chock_pdf", "cours_droit_affaires", "master_ain_chock_pdf"],
        en: ["ain_chock_exams_pdf", "business_law_notes", "master_ain_chock_pdf"],
        es: ["examenes_ain_chock_pdf", "apuntes_derecho_empresa", "master_ain_chock"],
      },
      mimeType: "application/pdf",
      allowedExtensions: ["pdf", "docx"],
    },
  },
  {
    id: "uh2-mohammedia",
    slug: "uh2-mohammedia",
    canonicalUrl: `${SITE_DOMAIN}/schools/uh2-mohammedia`,
    name: {
      ar: "كلية العلوم القانونية بالمحمدية",
      fr: "FSJES Mohammedia",
      en: "Faculty of Law — Mohammedia",
      es: "Facultad de Derecho — Mohammedia",
    },
    university: {
      ar: "جامعة الحسن الثاني بالدار البيضاء",
      fr: "Université Hassan II de Casablanca",
      en: "Hassan II University of Casablanca",
      es: "Universidad Hassan II de Casablanca",
    },
    city: {
      ar: "المحمدية",
      fr: "Mohammedia",
      en: "Mohammedia",
      es: "Mohammedia",
    },
    established: 1985,
    students: "25,000+",
    phone: "+212 523 31 46 82",
    telUri: "tel:+212523314682",
    email: "contact@fsjesm.ma",
    website: "https://fsjesm.ma",
    address: {
      ar: "شارع الحسن الثاني، ص.ب 145، المحمدية",
      fr: "Boulevard Hassan II, B.P. 145, Mohammedia",
      en: "Boulevard Hassan II, P.O. Box 145, Mohammedia",
      es: "Boulevard Hassan II, B.P. 145, Mohammedia",
    },
    description: {
      ar: "كلية متميزة في البحث العلمي الأكاديمي، متخصصة في السياسات العمومية وقوانين العقود والمنازعات.",
      fr: "Faculté renommée pour la recherche académique, spécialisée en politiques publiques et droit des contrats.",
      en: "Renowned faculty for academic research, specialized in public policies and contract law.",
      es: "Facultad reconocida por la investigación académica, especializada en políticas públicas y contratos.",
    },
    programs: [
      { ar: "قانون عقود وتجارة دولية", fr: "Droit des contrats & commerce", en: "Contracts & International Trade", es: "Derecho de contratos y comercio" },
      { ar: "السياسات العمومية والتنمية", fr: "Politiques publiques & développement", en: "Public Policies & Development", es: "Políticas públicas y desarrollo" },
      { ar: "قانون المنازعات القضائية", fr: "Droit du contentieux", en: "Litigation Law", es: "Derecho procesal" },
    ],
    accentColor: "border-teal-500/30 text-teal-600 dark:text-teal-400",
    badgeBg: "bg-teal-500/10 hover:bg-teal-500/20",
    textColor: "text-teal-600 dark:text-teal-400",
    keywords: {
      ar: ["حقوق_المحمدية", "جامعة_الحسن_الثاني", "ماستر_المحمدية", "قانون_العقود"],
      fr: ["FSJES_Mohammedia", "Droit_Contrats", "Politiques_Publiques_Maroc"],
      en: ["Mohammedia_Law", "FSJES_Mohammedia_Guide", "Contract_Law_Morocco"],
      es: ["FSJES_Mohammedia", "Derecho_Contratos", "Universidad_Mohammedia"],
    },
    photoMeta: {
      coverImageUrl: `${SITE_DOMAIN}/images/schools/mohammedia-cover.webp`,
      ogImageUrl: `${SITE_DOMAIN}/images/og/mohammedia-og.jpg`,
      twitterImageUrl: `${SITE_DOMAIN}/images/og/mohammedia-twitter.jpg`,
      width: 1200,
      height: 630,
      altText: {
        ar: "كلية العلوم القانونية بالمحمدية منصة ميزان",
        fr: "Faculté des Sciences Juridiques Mohammedia - Mizan",
        en: "Faculty of Law Mohammedia Campus - Mizan",
        es: "Facultad de Derecho Mohammedia - Mizan",
      },
      caption: {
        ar: "مستجدات الدراسة والأبحاث بكلية الحقوق المحمدية",
        fr: "Actualités des études et recherches à la FSJES Mohammedia",
        en: "Study and research updates from FSJES Mohammedia Law",
        es: "Novedades académicas de la facultad de derecho Mohammedia",
      },
    },
    fileMeta: {
      fileKeywords: {
        ar: ["امتحانات_المحمدية_pdf", "محاضرات_العقود_doc", "ماستر_المحمدية"],
        fr: ["examens_mohammedia_pdf", "cours_contrats_pdf", "master_mohammedia"],
        en: ["mohammedia_exams_pdf", "contract_law_pdf", "master_mohammedia_pdf"],
        es: ["examenes_mohammedia_pdf", "apuntes_contratos_pdf", "master_mohammedia"],
      },
      mimeType: "application/pdf",
      allowedExtensions: ["pdf", "docx"],
    },
  },
  {
    id: "uqa-marrakech",
    slug: "uqa-marrakech",
    canonicalUrl: `${SITE_DOMAIN}/schools/uqa-marrakech`,
    name: {
      ar: "كلية العلوم القانونية بمراكش",
      fr: "FSJES Marrakech",
      en: "Faculty of Law — Marrakech",
      es: "Facultad de Derecho — Marrakech",
    },
    university: {
      ar: "جامعة القاضي عياض بمراكش",
      fr: "Université Cadi Ayyad de Marrakech",
      en: "Cadi Ayyad University in Marrakech",
      es: "Universidad Cadi Ayyad de Marrakech",
    },
    city: {
      ar: "مراكش",
      fr: "Marrakech",
      en: "Marrakech",
      es: "Marrakech",
    },
    established: 1978,
    students: "28,000+",
    phone: "+212 524 43 01 19",
    telUri: "tel:+212524430119",
    email: "fsjes@uca.ma",
    website: "https://fsjes.uca.ma",
    address: {
      ar: "شارع عبد الكريم الخطابي، ص.ب 511، مراكش",
      fr: "Boulevard Abdelkrim Al Khattabi, B.P. 511, Marrakech",
      en: "Boulevard Abdelkrim Al Khattabi, P.O. Box 511, Marrakech",
      es: "Boulevard Abdelkrim Al Khattabi, B.P. 511, Marrakech",
    },
    description: {
      ar: "كلية رائدة في القانون العقاري والتنمية المستدامة والقانون البيئي والعلوم الجنائية بجهة مراكش آسفي.",
      fr: "Faculté de pointe en droit foncier, environnemental et sciences criminelles dans la région de Marrakech-Safi.",
      en: "A leading faculty in property, environmental, and criminal law in the Marrakech-Safi region.",
      es: "Facultad puntera en derecho inmobiliario, ambiental y ciencias penales en la región de Marrakech-Safi.",
    },
    programs: [
      { ar: "القانون العقاري والتعمير", fr: "Droit foncier & urbanisme", en: "Real Estate & Urban Law", es: "Derecho inmobiliario y urbanístico" },
      { ar: "القانون البيئي والتنمية", fr: "Droit de l'environnement", en: "Environmental Law", es: "Derecho ambiental" },
      { ar: "القانون الجنائي والعلوم الجنائية", fr: "Droit pénal & sciences criminelles", en: "Criminal Law & Criminology", es: "Derecho penal y criminología" },
    ],
    accentColor: "border-rose-500/30 text-rose-600 dark:text-rose-400",
    badgeBg: "bg-rose-500/10 hover:bg-rose-500/20",
    textColor: "text-rose-600 dark:text-rose-400",
    keywords: {
      ar: ["حقوق_مراكش", "القاضي_عياض", "القانون_العقاري", "ماستر_مراكش", "ميزان"],
      fr: ["FSJES_Marrakech", "Université_Cadi_Ayyad", "Droit_Foncier", "Master_Marrakech"],
      en: ["Marrakech_Law_Faculty", "Cadi_Ayyad_University", "Morocco_Real_Estate_Law"],
      es: ["FSJES_Marrakech", "Universidad_Cadi_Ayyad", "Derecho_Inmobiliario"],
    },
    photoMeta: {
      coverImageUrl: `${SITE_DOMAIN}/images/schools/marrakech-cover.webp`,
      ogImageUrl: `${SITE_DOMAIN}/images/og/marrakech-og.jpg`,
      twitterImageUrl: `${SITE_DOMAIN}/images/og/marrakech-twitter.jpg`,
      width: 1200,
      height: 630,
      altText: {
        ar: "كلية العلوم القانونية جامعة القاضي عياض بمراكش",
        fr: "Faculté des Sciences Juridiques Université Cadi Ayyad Marrakech",
        en: "Cadi Ayyad University Law Faculty Marrakech Morocco",
        es: "Facultad de Derecho Universidad Cadi Ayyad Marrakech",
      },
      caption: {
        ar: "مستجدات مباريات الماستر والنتائج بكلية حقوق مراكش",
        fr: "Mises à jour des concours de Master et résultats FSJES Marrakech",
        en: "Master entrance exams and updates at FSJES Marrakech",
        es: "Exámenes de máster y resultados en la FSJES Marrakech",
      },
    },
    fileMeta: {
      fileKeywords: {
        ar: ["امتحانات_مراكش_pdf", "محاضرات_عقاري_مراكش", "ماستر_مراكش_pdf"],
        fr: ["examens_marrakech_pdf", "cours_foncier_marrakech", "master_marrakech_pdf"],
        en: ["marrakech_exams_pdf", "property_law_marrakech", "master_marrakech"],
        es: ["examenes_marrakech_pdf", "apuntes_derecho_marrakech", "master_marrakech"],
      },
      mimeType: "application/pdf",
      allowedExtensions: ["pdf", "docx"],
    },
  },
  {
    id: "usmba-fes",
    slug: "usmba-fes",
    canonicalUrl: `${SITE_DOMAIN}/schools/usmba-fes`,
    name: {
      ar: "كلية الحقوق ظهر المهراز — فاس",
      fr: "FSJES Dhar El Mehraz — Fès",
      en: "Faculty of Law — Dhar El Mehraz, Fes",
      es: "Facultad de Derecho — Dhar El Mehraz, Fez",
    },
    university: {
      ar: "جامعة سيدي محمد بن عبد الله بـفاس",
      fr: "Université Sidi Mohamed Ben Abdellah de Fès",
      en: "Sidi Mohamed Ben Abdellah University in Fes",
      es: "Universidad Sidi Mohamed Ben Abdellah de Fez",
    },
    city: {
      ar: "فاس",
      fr: "Fès",
      en: "Fes",
      es: "Fez",
    },
    established: 1975,
    students: "26,000+",
    phone: "+212 535 60 85 85",
    telUri: "tel:+212535608585",
    email: "contact.fsjes@usmba.ac.ma",
    website: "https://fsjes.usmba.ac.ma",
    address: {
      ar: "ظهر المهراز، ص.ب 42، فاس",
      fr: "Dhar El Mehraz, B.P. 42, Fès",
      en: "Dhar El Mehraz, P.O. Box 42, Fes",
      es: "Dhar El Mehraz, B.P. 42, Fez",
    },
    description: {
      ar: "كلية عريقة تجمع بين المقاربة الفقهية والقانون الوضعي الحديث والدراسات الدستورية.",
      fr: "Faculté historique alliant droit musulman et droit positif dans un cursus intégré.",
      en: "A historic faculty blending Islamic jurisprudence and modern positive legal studies.",
      es: "Facultad histórica que combina jurisprudencia islámica y derecho positivo moderno.",
    },
    programs: [
      { ar: "الفقه الإسلامي والقانون المقارن", fr: "Droit musulman & comparé", en: "Islamic & Comparative Law", es: "Derecho islámico y comparado" },
      { ar: "قانون الأسرة والتوثيق", fr: "Droit de la famille & notariat", en: "Family & Notarial Law", es: "Derecho de familia y notarial" },
      { ar: "القانون الدستوري والعلوم السياسية", fr: "Droit constitutionnel", en: "Constitutional Law", es: "Derecho constitucional" },
    ],
    accentColor: "border-amber-500/30 text-amber-600 dark:text-amber-400",
    badgeBg: "bg-amber-500/10 hover:bg-amber-500/20",
    textColor: "text-amber-600 dark:text-amber-400",
    keywords: {
      ar: ["حقوق_فاس", "ظهر_المهراز", "سيدي_محمد_بن_عبدالله", "ماستر_فاس", "ميزان"],
      fr: ["FSJES_Fes", "Dhar_El_Mehraz", "Université_Fes", "Droit_Fes"],
      en: ["Fes_Law_Faculty", "USMBA_Fes", "Moroccan_Islamic_Law"],
      es: ["FSJES_Fez", "Universidad_Fez", "Derecho_Fez"],
    },
    photoMeta: {
      coverImageUrl: `${SITE_DOMAIN}/images/schools/fes-cover.webp`,
      ogImageUrl: `${SITE_DOMAIN}/images/og/fes-og.jpg`,
      twitterImageUrl: `${SITE_DOMAIN}/images/og/fes-twitter.jpg`,
      width: 1200,
      height: 630,
      altText: {
        ar: "كلية الحقوق ظهر المهراز فاس منصة ميزان",
        fr: "Faculté de droit Dhar El Mehraz Fès - Mizan",
        en: "Law Faculty Dhar El Mehraz Fes - Mizan",
        es: "Facultad de derecho Dhar El Mehraz Fez - Mizan",
      },
      caption: {
        ar: "أحدث المستجدات الأكاديمية والمستندات بكلية حقوق فاس",
        fr: "Dernières actualités académiques et documents FSJES Fès",
        en: "Latest academic news and documents from FSJES Fes",
        es: "Últimas novedades académicas y documentos FSJES Fez",
      },
    },
    fileMeta: {
      fileKeywords: {
        ar: ["امتحانات_فاس_pdf", "محاضرات_حقوق_فاس", "ماستر_فاس_pdf"],
        fr: ["examens_fes_pdf", "cours_droit_fes", "master_fes_pdf"],
        en: ["fes_exams_pdf", "fes_law_notes", "master_fes_pdf"],
        es: ["examenes_fez_pdf", "apuntes_derecho_fez", "master_fez"],
      },
      mimeType: "application/pdf",
      allowedExtensions: ["pdf", "docx"],
    },
  },
  {
    id: "umo-oujda",
    slug: "umo-oujda",
    canonicalUrl: `${SITE_DOMAIN}/schools/umo-oujda`,
    name: {
      ar: "كلية العلوم القانونية بوجدة",
      fr: "FSJES Oujda",
      en: "Faculty of Law — Oujda",
      es: "Facultad de Derecho — Oujda",
    },
    university: {
      ar: "جامعة محمد الأول بوجدة",
      fr: "Université Mohammed Premier d'Oujda",
      en: "Mohammed I University in Oujda",
      es: "Universidad Mohammed I de Oujda",
    },
    city: {
      ar: "وجدة",
      fr: "Oujda",
      en: "Oujda",
      es: "Oujda",
    },
    established: 1978,
    students: "18,000+",
    phone: "+212 536 50 06 12",
    telUri: "tel:+212536500612",
    email: "fdo@ump.ac.ma",
    website: "https://fdo.ump.ma",
    address: {
      ar: "المركب الجامعي القدس، ص.ب 524، وجدة",
      fr: "Complexe Universitaire Al Qods, B.P. 524, Oujda",
      en: "Al Qods Campus, P.O. Box 524, Oujda",
      es: "Complexe Universitaire Al Qods, B.P. 524, Oujda",
    },
    description: {
      ar: "قطب أكاديمي بالجهة الشرقية متخصص في القانون الدولي والتكامل المغاربي والقانون الإداري.",
      fr: "Pôle académique de l'Oriental spécialisé en droit international, intégration maghrébine et administratif.",
      en: "Academic hub in the Oriental region specialized in international law and regional governance.",
      es: "Polo académico de la región Oriental especializado en derecho internacional y gobernanza.",
    },
    programs: [
      { ar: "القانون الدولي والعلاقات الدولية", fr: "Droit international", en: "International Law", es: "Derecho Internacional" },
      { ar: "القانون الإداري والحكامة الترابية", fr: "Droit administratif & gouvernance", en: "Administrative Law & Governance", es: "Derecho Administrativo y Gobernanza" },
      { ar: "قانون الحدود والجمارك", fr: "Droit douanier & frontières", en: "Customs & Border Law", es: "Derecho Aduanero y Fronterizo" },
    ],
    accentColor: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
    badgeBg: "bg-emerald-500/10 hover:bg-emerald-500/20",
    textColor: "text-emerald-600 dark:text-emerald-400",
    keywords: {
      ar: ["حقوق_وجدة", "جامعة_محمد_الأول", "الجهة_الشرقية", "ماستر_وجدة", "ميزان"],
      fr: ["FSJES_Oujda", "Université_Mohammed_Premier", "Droit_Oriental"],
      en: ["Oujda_Law_Faculty", "UMP_Oujda", "Morocco_Border_Law"],
      es: ["FSJES_Oujda", "Universidad_Oujda", "Derecho_Oujda"],
    },
    photoMeta: {
      coverImageUrl: `${SITE_DOMAIN}/images/schools/oujda-cover.webp`,
      ogImageUrl: `${SITE_DOMAIN}/images/og/oujda-og.jpg`,
      twitterImageUrl: `${SITE_DOMAIN}/images/og/oujda-twitter.jpg`,
      width: 1200,
      height: 630,
      altText: {
        ar: "كلية الحقوق بوجدة المركب الجامعي القدس",
        fr: "Faculté de droit Oujda Complexe Al Qods",
        en: "Oujda Law Faculty Al Qods Campus Morocco",
        es: "Facultad de Derecho Oujda Campus Al Qods",
      },
      caption: {
        ar: "دليل وروافد كلية العلوم القانونية بوجدة عبر ميزان",
        fr: "Guide de la faculté des sciences juridiques Oujda sur Mizan",
        en: "Oujda Law Faculty directory and resources on Mizan",
        es: "Guía de la facultad de derecho Oujda en Mizan",
      },
    },
    fileMeta: {
      fileKeywords: {
        ar: ["امتحانات_وجدة_pdf", "محاضرات_وجدة", "ماستر_وجدة_pdf"],
        fr: ["examens_oujda_pdf", "cours_droit_oujda", "master_oujda_pdf"],
        en: ["oujda_exams_pdf", "oujda_law_notes", "master_oujda_pdf"],
        es: ["examenes_oujda_pdf", "apuntes_derecho_oujda", "master_oujda"],
      },
      mimeType: "application/pdf",
      allowedExtensions: ["pdf", "docx"],
    },
  },
  {
    id: "uae-tangier",
    slug: "uae-tangier",
    canonicalUrl: `${SITE_DOMAIN}/schools/uae-tangier`,
    name: {
      ar: "كلية العلوم القانونية بطنجة",
      fr: "FSJES Tanger",
      en: "Faculty of Law — Tangier",
      es: "Facultad de Derecho — Tánger",
    },
    university: {
      ar: "جامعة عبد المالك السعدي",
      fr: "Université Abdelmalek Essaâdi",
      en: "Abdelmalek Essaâdi University",
      es: "Universidad Abdelmalek Essaâdi",
    },
    city: {
      ar: "طنجة",
      fr: "Tanger",
      en: "Tangier",
      es: "Tánger",
    },
    established: 1993,
    students: "20,000+",
    phone: "+212 539 31 34 87",
    telUri: "tel:+212539313487",
    email: "fsjest@uae.ac.ma",
    website: "https://fsjest.uae.ac.ma",
    address: {
      ar: "بوخالف، ص.ب 1373، طنجة",
      fr: "Boukhalef, B.P. 1373, Tanger",
      en: "Boukhalef, P.O. Box 1373, Tangier",
      es: "Boukhalef, B.P. 1373, Tánger",
    },
    description: {
      ar: "كلية حديثة متخصصة في قانون التجارة الدولية والقانون البحري وقوانين الاستثمار بشمال المغرب.",
      fr: "Faculté moderne spécialisée en droit du commerce international et droit maritime au nord du Maroc.",
      en: "A modern faculty specialized in international trade and maritime law in northern Morocco.",
      es: "Facultad moderna especializada en comercio internacional y derecho marítimo en el norte de Marruecos.",
    },
    programs: [
      { ar: "قانون التجارة الدولية", fr: "Droit du commerce international", en: "International Trade Law", es: "Derecho del comercio internacional" },
      { ar: "القانون البحري والموانئ", fr: "Droit maritime & portuaire", en: "Maritime & Port Law", es: "Derecho marítimo y portario" },
      { ar: "قانون الأعمال الدولي", fr: "Droit des affaires international", en: "International Business Law", es: "Derecho de negocios internacionales" },
    ],
    accentColor: "border-sky-500/30 text-sky-600 dark:text-sky-400",
    badgeBg: "bg-sky-500/10 hover:bg-sky-500/20",
    textColor: "text-sky-600 dark:text-sky-400",
    keywords: {
      ar: ["حقوق_طنجة", "عبدالمالك_السعدي", "القانون_البحري", "ماستر_طنجة", "ميزان"],
      fr: ["FSJES_Tanger", "Droit_Maritime", "Université_Tangier", "Master_Tanger"],
      en: ["Tangier_Law_Faculty", "Maritime_Law_Morocco", "UAE_Tangier"],
      es: ["FSJES_Tanger", "Derecho_Maritimo", "Universidad_Tanger"],
    },
    photoMeta: {
      coverImageUrl: `${SITE_DOMAIN}/images/schools/tangier-cover.webp`,
      ogImageUrl: `${SITE_DOMAIN}/images/og/tangier-og.jpg`,
      twitterImageUrl: `${SITE_DOMAIN}/images/og/tangier-twitter.jpg`,
      width: 1200,
      height: 630,
      altText: {
        ar: "كلية العلوم القانونية بطنجة بوخالف منصة ميزان",
        fr: "Faculté des Sciences Juridiques Tanger Boukhalef - Mizan",
        en: "Tangier Law Faculty Boukhalef Campus - Mizan",
        es: "Facultad de Derecho Tánger Boukhalef - Mizan",
      },
      caption: {
        ar: "مستجدات كلية الحقوق طنجة عبر منصة ميزان",
        fr: "Actualités de la FSJES Tanger sur la plateforme Mizan",
        en: "Tangier Law Faculty updates on the Mizan platform",
        es: "Novedades de la FSJES Tánger en la plataforma Mizan",
      },
    },
    fileMeta: {
      fileKeywords: {
        ar: ["امتحانات_طنجة_pdf", "محاضرات_بحري_طنجة", "ماستر_طنجة"],
        fr: ["examens_tanger_pdf", "cours_maritime_tanger", "master_tanger_pdf"],
        en: ["tangier_exams_pdf", "maritime_law_notes", "master_tangier_pdf"],
        es: ["examenes_tanger_pdf", "apuntes_maritimo_tanger", "master_tanger"],
      },
      mimeType: "application/pdf",
      allowedExtensions: ["pdf", "docx"],
    },
  },
  {
    id: "uae-tetouan-martil",
    slug: "uae-tetouan-martil",
    canonicalUrl: `${SITE_DOMAIN}/schools/uae-tetouan-martil`,
    name: {
      ar: "كلية العلوم القانونية مرتيل — تطوان",
      fr: "FSJES Tétouan / Martil",
      en: "Faculty of Law — Tetouan / Martil",
      es: "Facultad de Derecho — Tetuán / Martil",
    },
    university: {
      ar: "جامعة عبد المالك السعدي",
      fr: "Université Abdelmalek Essaâdi",
      en: "Abdelmalek Essaâdi University",
      es: "Universidad Abdelmalek Essaâdi",
    },
    city: {
      ar: "تطوان / مرتيل",
      fr: "Tétouan / Martil",
      en: "Tetouan / Martil",
      es: "Tetuán / Martil",
    },
    established: 1997,
    students: "15,000+",
    phone: "+212 539 97 92 68",
    telUri: "tel:+212539979268",
    email: "fsjes.martil@uae.ac.ma",
    website: "https://fsjesmartil.uae.ac.ma",
    address: {
      ar: "طريق سبتة، ص.ب 137، مرتيل",
      fr: "Route de Ceuta, B.P. 137, Martil",
      en: "Route de Ceuta, P.O. Box 137, Martil",
      es: "Route de Ceuta, B.P. 137, Martil",
    },
    description: {
      ar: "مؤسسة متميزة في الدراسات القانونية المتوسطية وحقوق الإنسان والقانون العام والعلوم السياسية.",
      fr: "Établissement dynamique axé sur les études juridiques méditerranéennes et les droits de l'homme.",
      en: "Dynamic institution focusing on Mediterranean legal studies and human rights law.",
      es: "Institución dinámica centrada en estudios jurídicos mediterráneos y derechos humanos.",
    },
    programs: [
      { ar: "حقوق الإنسان والقانون الدولي الإنساني", fr: "Droits de l'homme", en: "Human Rights Law", es: "Derechos Humanos" },
      { ar: "الدراسات القانونية المتوسطية", fr: "Études méditerranéennes", en: "Mediterranean Legal Studies", es: "Estudios Jurídicos Mediterráneos" },
      { ar: "العلوم السياسية والتواصل", fr: "Sciences politiques", en: "Political Science", es: "Ciencias Políticas" },
    ],
    accentColor: "border-cyan-500/30 text-cyan-600 dark:text-cyan-400",
    badgeBg: "bg-cyan-500/10 hover:bg-cyan-500/20",
    textColor: "text-cyan-600 dark:text-cyan-400",
    keywords: {
      ar: ["حقوق_مرتيل", "تطوان", "عبدالمالك_السعدي", "حقوق_الإنسان", "ميزان"],
      fr: ["FSJES_Martil", "Tetouan_Droit", "Droits_Homme_Maroc"],
      en: ["Martil_Law_Faculty", "Tetouan_Law", "Mediterranean_Law_Morocco"],
      es: ["FSJES_Martil", "Derecho_Tetuan", "Derechos_Humanos_Marruecos"],
    },
    photoMeta: {
      coverImageUrl: `${SITE_DOMAIN}/images/schools/martil-cover.webp`,
      ogImageUrl: `${SITE_DOMAIN}/images/og/martil-og.jpg`,
      twitterImageUrl: `${SITE_DOMAIN}/images/og/martil-twitter.jpg`,
      width: 1200,
      height: 630,
      altText: {
        ar: "كلية الحقوق مرتيل تطوان منصة ميزان",
        fr: "Faculté de droit Martil Tétouan - Mizan",
        en: "Law Faculty Martil Tetouan - Mizan",
        es: "Facultad de derecho Martil Tetuán - Mizan",
      },
      caption: {
        ar: "مستجدات وأوراق مباريات ماستر كلية مرتيل تطوان عبر ميزان",
        fr: "Mises à jour des concours Master FSJES Martil Tétouan sur Mizan",
        en: "Master entrance exams and research papers at FSJES Martil Tetouan",
        es: "Novedades de los exámenes de máster en la FSJES Martil Tetuán",
      },
    },
    fileMeta: {
      fileKeywords: {
        ar: ["امتحانات_مرتيل_pdf", "دروس_حقوق_الإنسان", "ماستر_مرتيل"],
        fr: ["examens_martil_pdf", "cours_droits_homme", "master_martil_pdf"],
        en: ["martil_exams_pdf", "human_rights_notes", "master_martil_pdf"],
        es: ["examenes_martil_pdf", "apuntes_derechos_humanos", "master_martil"],
      },
      mimeType: "application/pdf",
      allowedExtensions: ["pdf", "docx"],
    },
  },
  {
    id: "uiz-agadir",
    slug: "uiz-agadir",
    canonicalUrl: `${SITE_DOMAIN}/schools/uiz-agadir`,
    name: {
      ar: "كلية العلوم القانونية بأكادير",
      fr: "FSJES Agadir",
      en: "Faculty of Law — Agadir",
      es: "Facultad de Derecho — Agadir",
    },
    university: {
      ar: "جامعة ابن زهر بأكادير",
      fr: "Université Ibn Zohr d'Agadir",
      en: "Ibn Zohr University in Agadir",
      es: "Universidad Ibn Zohr de Agadir",
    },
    city: {
      ar: "أكادير",
      fr: "Agadir",
      en: "Agadir",
      es: "Agadir",
    },
    established: 1984,
    students: "35,000+",
    phone: "+212 528 22 01 00",
    telUri: "tel:+212528220100",
    email: "fsjes@uiz.ac.ma",
    website: "https://fsjes-ibnzohr.ac.ma",
    address: {
      ar: "مجمع ابن زهر، ص.ب 8018، أكادير",
      fr: "Complexe Ibn Zohr, B.P. 8018, Agadir",
      en: "Ibn Zohr Campus, P.O. Box 8018, Agadir",
      es: "Complexe Ibn Zohr, B.P. 8018, Agadir",
    },
    description: {
      ar: "أكبر قطب جامعي قانوني بجنوب المغرب، متخصص في القانون البحري والصفقات العمومية والشغـل.",
      fr: "Grand pôle juridique du Sud marocain, spécialisé en droit maritime, marchés publics et droit de l'entreprise.",
      en: "Major legal academic hub in Southern Morocco, specialized in maritime law and public procurement.",
      es: "Gran polo jurídico del sur de Marruecos, especializado en derecho marítimo y contratación pública.",
    },
    programs: [
      { ar: "قانون الصفقات العمومية", fr: "Marchés publics", en: "Public Procurement Law", es: "Contratación Pública" },
      { ar: "القانون الخاص والممارسات القضائية", fr: "Pratiques judiciaires", en: "Judicial Practices", es: "Prácticas Judiciales" },
      { ar: "قانون الشغـل والمقاولة", fr: "Droit de l'entreprise", en: "Corporate & Labor Law", es: "Derecho Empresarial y Laboral" },
    ],
    accentColor: "border-orange-500/30 text-orange-600 dark:text-orange-400",
    badgeBg: "bg-orange-500/10 hover:bg-orange-500/20",
    textColor: "text-orange-600 dark:text-orange-400",
    keywords: {
      ar: ["حقوق_أكادير", "ابن_زهر", "جنوب_المغرب", "ماستر_أكادير", "ميزان"],
      fr: ["FSJES_Agadir", "Université_Ibn_Zohr", "Droit_Sud_Maroc"],
      en: ["Agadir_Law_Faculty", "Ibn_Zohr_University", "South_Morocco_Law"],
      es: ["FSJES_Agadir", "Universidad_Ibn_Zohr", "Derecho_Agadir"],
    },
    photoMeta: {
      coverImageUrl: `${SITE_DOMAIN}/images/schools/agadir-cover.webp`,
      ogImageUrl: `${SITE_DOMAIN}/images/og/agadir-og.jpg`,
      twitterImageUrl: `${SITE_DOMAIN}/images/og/agadir-twitter.jpg`,
      width: 1200,
      height: 630,
      altText: {
        ar: "كلية الحقوق ابن زهر بأكادير منصة ميزان",
        fr: "Faculté de droit Ibn Zohr Agadir - Mizan",
        en: "Ibn Zohr Law Faculty Agadir Morocco - Mizan",
        es: "Facultad de derecho Ibn Zohr Agadir - Mizan",
      },
      caption: {
        ar: "تغطية شاملة لأخبار كلية الحقوق ابن زهر بأكادير عبر ميزان",
        fr: "Couverture complète des actualités FSJES Agadir sur Mizan",
        en: "Comprehensive coverage of FSJES Agadir law updates on Mizan",
        es: "Cobertura completa de noticias de la FSJES Agadir en Mizan",
      },
    },
    fileMeta: {
      fileKeywords: {
        ar: ["امتحانات_أكادير_pdf", "محاضرات_ابن_زهر", "ماستر_أكادير_pdf"],
        fr: ["examens_agadir_pdf", "cours_ibn_zohr", "master_agadir_pdf"],
        en: ["agadir_exams_pdf", "ibn_zohr_notes", "master_agadir_pdf"],
        es: ["examenes_agadir_pdf", "apuntes_agadir", "master_agadir"],
      },
      mimeType: "application/pdf",
      allowedExtensions: ["pdf", "docx"],
    },
  },
  {
    id: "uh1-settat",
    slug: "uh1-settat",
    canonicalUrl: `${SITE_DOMAIN}/schools/uh1-settat`,
    name: {
      ar: "كلية الحقوق سطات",
      fr: "FSJES Settat",
      en: "Faculty of Law — Settat",
      es: "Facultad de Derecho — Settat",
    },
    university: {
      ar: "جامعة الحسن الأول بسطات",
      fr: "Université Hassan 1er de Settat",
      en: "Hassan I University in Settat",
      es: "Universidad Hassan I de Settat",
    },
    city: {
      ar: "سطات",
      fr: "Settat",
      en: "Settat",
      es: "Settat",
    },
    established: 1997,
    students: "19,000+",
    phone: "+212 523 40 00 22",
    telUri: "tel:+212523400022",
    email: "fsjes@uh1.ac.ma",
    website: "https://fsjes.uh1.ac.ma",
    address: {
      ar: "المركب الجامعي، ص.ب 539، سطات",
      fr: "Complexe Universitaire, B.P. 539, Settat",
      en: "University Complex, P.O. Box 539, Settat",
      es: "Complexe Universitaire, B.P. 539, Settat",
    },
    description: {
      ar: "كلية رائدة ومبتكرة في ماسترات القانون الرياضي والقانون المالي والمالية العامة.",
      fr: "Faculté innovante, pionnière dans les masters en droit du sport et finances publiques.",
      en: "Innovative faculty, pioneer in sports law and public finance master programs.",
      es: "Facultad innovadora, pionera en másteres de derecho deportivo y finanzas públicas.",
    },
    programs: [
      { ar: "القانون الرياضي والحكامة", fr: "Droit du sport", en: "Sports Law & Governance", es: "Derecho Deportivo y Gobernanza" },
      { ar: "المالية العامة والجبايات", fr: "Finances publiques & fiscalité", en: "Public Finance & Taxation", es: "Finanzas Públicas y Fiscalidad" },
      { ar: "العلوم الجنائية وحقوق الإنسان", fr: "Sciences criminelles", en: "Criminal Sciences", es: "Ciencias Penales" },
    ],
    accentColor: "border-lime-500/30 text-lime-600 dark:text-lime-400",
    badgeBg: "bg-lime-500/10 hover:bg-lime-500/20",
    textColor: "text-lime-600 dark:text-lime-400",
    keywords: {
      ar: ["حقوق_سطات", "جامعة_الحسن_الأول", "القانون_الرياضي", "ماستر_سطات", "ميزان"],
      fr: ["FSJES_Settat", "Droit_Sport_Maroc", "Université_Settat"],
      en: ["Settat_Law_Faculty", "Sports_Law_Morocco", "Hassan_I_Settat"],
      es: ["FSJES_Settat", "Derecho_Deportivo", "Universidad_Settat"],
    },
    photoMeta: {
      coverImageUrl: `${SITE_DOMAIN}/images/schools/settat-cover.webp`,
      ogImageUrl: `${SITE_DOMAIN}/images/og/settat-og.jpg`,
      twitterImageUrl: `${SITE_DOMAIN}/images/og/settat-twitter.jpg`,
      width: 1200,
      height: 630,
      altText: {
        ar: "كلية العلوم القانونية جامعة الحسن الأول بسطات منصة ميزان",
        fr: "Faculté de droit Université Hassan 1er Settat - Mizan",
        en: "Hassan I University Law Faculty Settat Morocco - Mizan",
        es: "Facultad de derecho Universidad Hassan I Settat - Mizan",
      },
      caption: {
        ar: "إعلانات ونتائج مباريات ماستر كلية حقوق سطات عبر ميزان",
        fr: "Annonces et résultats des masters FSJES Settat sur Mizan",
        en: "Master announcements and entrance exam results at FSJES Settat",
        es: "Anuncios y resultados de máster en la FSJES Settat",
      },
    },
    fileMeta: {
      fileKeywords: {
        ar: ["امتحانات_سطات_pdf", "محاضرات_قانون_رياضي", "ماستر_سطات_pdf"],
        fr: ["examens_settat_pdf", "cours_droit_sport", "master_settat_pdf"],
        en: ["settat_exams_pdf", "sports_law_notes", "master_settat_pdf"],
        es: ["examenes_settat_pdf", "apuntes_derecho_deportivo", "master_settat"],
      },
      mimeType: "application/pdf",
      allowedExtensions: ["pdf", "docx"],
    },
  },
  {
    id: "uit-kenitra",
    slug: "uit-kenitra",
    canonicalUrl: `${SITE_DOMAIN}/schools/uit-kenitra`,
    name: {
      ar: "كلية العلوم القانونية بالقنيطرة",
      fr: "FSJES Kénitra",
      en: "Faculty of Law — Kenitra",
      es: "Facultad de Derecho — Kenitra",
    },
    university: {
      ar: "جامعة ابن طفيل بالقنيطرة",
      fr: "Université Ibn Tofail de Kénitra",
      en: "Ibn Tofail University in Kenitra",
      es: "Universidad Ibn Tofail de Kenitra",
    },
    city: {
      ar: "القنيطرة",
      fr: "Kénitra",
      en: "Kenitra",
      es: "Kenitra",
    },
    established: 2004,
    students: "21,000+",
    phone: "+212 537 32 92 00",
    telUri: "tel:+212537329200",
    email: "fsjes@uit.ac.ma",
    website: "https://fsjes.uit.ac.ma",
    address: {
      ar: "الحرم الجامعي، ص.ب 242، القنيطرة",
      fr: "Campus Universitaire, B.P. 242, Kénitra",
      en: "University Campus, P.O. Box 242, Kenitra",
      es: "Campus Universitaire, B.P. 242, Kenitra",
    },
    description: {
      ar: "مركز أكاديمي متصاعد يقدم تكوينات قانونية حديثة في قوانين الأعمال والعقار والعدالة الإدارية.",
      fr: "Centre académique dynamique proposant des formations modernes en droit des affaires et foncier.",
      en: "A fast-growing academic hub offering modern law degree programs in business and real estate.",
      es: "Centro académico en rápido crecimiento que ofrece programas modernos en derecho empresarial e inmobiliario.",
    },
    programs: [
      { ar: "قانون الأعمال والاستثمار", fr: "Droit des affaires & investissement", en: "Business & Investment Law", es: "Derecho de Negocios e Inversión" },
      { ar: "العدالة الإدارية والإدارة", fr: "Justice administrative", en: "Administrative Justice", es: "Justicia Administrativa" },
      { ar: "القانون المدني والعقاري", fr: "Droit civil & foncier", en: "Civil & Property Law", es: "Derecho Civil e Inmobiliario" },
    ],
    accentColor: "border-red-500/30 text-red-600 dark:text-red-400",
    badgeBg: "bg-red-500/10 hover:bg-red-500/20",
    textColor: "text-red-600 dark:text-red-400",
    keywords: {
      ar: ["حقوق_القنيطرة", "ابن_طفيل", "ماستر_القنيطرة", "جامعة_القنيطرة", "ميزان"],
      fr: ["FSJES_Kenitra", "Université_Ibn_Tofail", "Droit_Kenitra"],
      en: ["Kenitra_Law_Faculty", "Ibn_Tofail_Law", "Moroccan_Civil_Law"],
      es: ["FSJES_Kenitra", "Universidad_Ibn_Tofail", "Derecho_Kenitra"],
    },
    photoMeta: {
      coverImageUrl: `${SITE_DOMAIN}/images/schools/kenitra-cover.webp`,
      ogImageUrl: `${SITE_DOMAIN}/images/og/kenitra-og.jpg`,
      twitterImageUrl: `${SITE_DOMAIN}/images/og/kenitra-twitter.jpg`,
      width: 1200,
      height: 630,
      altText: {
        ar: "كلية الحقوق ابن طفيل بالقنيطرة منصة ميزان",
        fr: "Faculté de droit Ibn Tofail Kénitra - Mizan",
        en: "Ibn Tofail Law Faculty Kenitra - Mizan",
        es: "Facultad de derecho Ibn Tofail Kenitra - Mizan",
      },
      caption: {
        ar: "دليل كلية العلوم القانونية بالقنيطرة عبر منصة ميزان",
        fr: "Guide de la faculté des sciences juridiques Kénitra",
        en: "Kenitra Law Faculty directory and resources on Mizan",
        es: "Guía de la facultad de derecho de Kenitra en Mizan",
      },
    },
    fileMeta: {
      fileKeywords: {
        ar: ["امتحانات_القنيطرة_pdf", "محاضرات_ابن_طفيل", "ماستر_القنيطرة_pdf"],
        fr: ["examens_kenitra_pdf", "cours_ibn_tofail", "master_kenitra_pdf"],
        en: ["kenitra_exams_pdf", "kenitra_law_notes", "master_kenitra_pdf"],
        es: ["examenes_kenitra_pdf", "apuntes_kenitra", "master_kenitra"],
      },
      mimeType: "application/pdf",
      allowedExtensions: ["pdf", "docx"],
    },
  },
  {
    id: "umi-meknes",
    slug: "umi-meknes",
    canonicalUrl: `${SITE_DOMAIN}/schools/umi-meknes`,
    name: {
      ar: "كلية العلوم القانونية بمكناس",
      fr: "FSJES Meknès",
      en: "Faculty of Law — Meknes",
      es: "Facultad de Derecho — Meknes",
    },
    university: {
      ar: "جامعة مولاي إسماعيل بمكناس",
      fr: "Université Moulay Ismaïl de Meknès",
      en: "Moulay Ismaïl University in Meknes",
      es: "Universidad Moulay Ismaïl de Meknes",
    },
    city: {
      ar: "مكناس",
      fr: "Meknès",
      en: "Meknes",
      es: "Meknes",
    },
    established: 1993,
    students: "22,000+",
    phone: "+212 535 53 88 70",
    telUri: "tel:+212535538870",
    email: "fsjes@umi.ac.ma",
    website: "http://fsjes.umi.ac.ma",
    address: {
      ar: "تولال، ص.ب 3102، مكناس",
      fr: "Toulal, B.P. 3102, Meknès",
      en: "Toulal, P.O. Box 3102, Meknes",
      es: "Toulal, B.P. 3102, Meknes",
    },
    description: {
      ar: "مؤسسة أكاديمية بارزة بجهة فاس-مكناس متخصصة في القانون العام والتنمية الجهوية وقانون المقاولات.",
      fr: "Établissement majeur de la région Fès-Meknès spécialisé en droit public et développement régional.",
      en: "A major institution in the Fes-Meknes region specialized in public law and regional development.",
      es: "Institución clave en la región de Fez-Mequinez especializada en derecho público y desarrollo regional.",
    },
    programs: [
      { ar: "القانون العام والترابي", fr: "Droit public & territorial", en: "Public & Territorial Law", es: "Derecho Público y Territorial" },
      { ar: "قانون الأسرة والتوثيق", fr: "Droit de la famille & notariat", en: "Family Law & Notarial Studies", es: "Derecho de Familia y Notarial" },
      { ar: "قانون المقاولات والاستثمار", fr: "Droit des entreprises", en: "Corporate Law", es: "Derecho de Empresas" },
    ],
    accentColor: "border-yellow-500/30 text-yellow-600 dark:text-yellow-400",
    badgeBg: "bg-yellow-500/10 hover:bg-yellow-500/20",
    textColor: "text-yellow-600 dark:text-yellow-400",
    keywords: {
      ar: ["حقوق_مكناس", "مولاي_إسماعيل", "ماستر_مكناس", "جامعة_مكناس", "ميزان"],
      fr: ["FSJES_Meknes", "Université_Moulay_Ismail", "Droit_Meknes"],
      en: ["Meknes_Law_Faculty", "UMI_Meknes", "Moroccan_Public_Law"],
      es: ["FSJES_Meknes", "Universidad_Moulay_Ismail", "Derecho_Meknes"],
    },
    photoMeta: {
      coverImageUrl: `${SITE_DOMAIN}/images/schools/meknes-cover.webp`,
      ogImageUrl: `${SITE_DOMAIN}/images/og/meknes-og.jpg`,
      twitterImageUrl: `${SITE_DOMAIN}/images/og/meknes-twitter.jpg`,
      width: 1200,
      height: 630,
      altText: {
        ar: "كلية الحقوق مولاي إسماعيل بمكناس منصة ميزان",
        fr: "Faculté de droit Moulay Ismaïl Meknès - Mizan",
        en: "Moulay Ismail Law Faculty Meknes - Mizan",
        es: "Facultad de derecho Moulay Ismaïl Meknes - Mizan",
      },
      caption: {
        ar: "تغطية شاملة لمباريات الماستر والأبحاث بكلية حقوق مكناس عبر ميزان",
        fr: "Couverture des concours Master et travaux de recherche FSJES Meknès",
        en: "Master entrance exams and research coverage at FSJES Meknes",
        es: "Cobertura de exámenes de máster en la FSJES Meknes",
      },
    },
    fileMeta: {
      fileKeywords: {
        ar: ["امتحانات_مكناس_pdf", "محاضرات_مولاي_إسماعيل", "ماستر_مكناس_pdf"],
        fr: ["examens_meknes_pdf", "cours_moulay_ismail", "master_meknes_pdf"],
        en: ["meknes_exams_pdf", "meknes_law_notes", "master_meknes_pdf"],
        es: ["examenes_meknes_pdf", "apuntes_meknes", "master_meknes"],
      },
      mimeType: "application/pdf",
      allowedExtensions: ["pdf", "docx"],
    },
  },
  {
    id: "usms-beni-mellal",
    slug: "usms-beni-mellal",
    canonicalUrl: `${SITE_DOMAIN}/schools/usms-beni-mellal`,
    name: {
      ar: "كلية العلوم القانونية ببني ملال",
      fr: "FSJES Béni Mellal",
      en: "Faculty of Law — Beni Mellal",
      es: "Facultad de Derecho — Beni Mellal",
    },
    university: {
      ar: "جامعة السلطان مولاي سليمان ببني ملال",
      fr: "Université Sultan Moulay Slimane de Béni Mellal",
      en: "Sultan Moulay Slimane University in Beni Mellal",
      es: "Universidad Sultán Moulay Slimane de Beni Mellal",
    },
    city: {
      ar: "بني ملال",
      fr: "Béni Mellal",
      en: "Beni Mellal",
      es: "Beni Mellal",
    },
    established: 2019,
    students: "12,000+",
    phone: "+212 523 48 51 00",
    telUri: "tel:+212523485100",
    email: "fsjes@usms.ma",
    website: "https://fsjes.usms.ac.ma",
    address: {
      ar: "المركب الجامعي المغيلة، ص.ب 591، بني ملال",
      fr: "Complexe Universitaire M'Ghila, B.P. 591, Béni Mellal",
      en: "M'Ghila Campus, P.O. Box 591, Beni Mellal",
      es: "Complexe Universitaire M'Ghila, B.P. 591, Beni Mellal",
    },
    description: {
      ar: "مؤسسة جامعية صاعدة تهتم بالتنمية القانونية المستدامة وقوانين الشأن المحلي بجهة بني ملال خنيفرة.",
      fr: "Établissement universitaire récent axé sur le développement juridique durable et la gouvernance locale.",
      en: "A rising law faculty focusing on sustainable legal development and local governance.",
      es: "Institución académica reciente centrada en desarrollo jurídico sostenible y gobernanza local.",
    },
    programs: [
      { ar: "الحكامة المحلية والتنمية", fr: "Gouvernance locale", en: "Local Governance & Development", es: "Gobernanza Local y Desarrollo" },
      { ar: "القانون الخاص المعمق", fr: "Droit privé approfondi", en: "Advanced Private Law", es: "Derecho Privado Avanzado" },
      { ar: "قانون الأعمال والعقار", fr: "Droit des affaires & foncier", en: "Business & Property Law", es: "Derecho de Negocios e Inmobiliario" },
    ],
    accentColor: "border-emerald-600/30 text-emerald-700 dark:text-emerald-300",
    badgeBg: "bg-emerald-600/10 hover:bg-emerald-600/20",
    textColor: "text-emerald-700 dark:text-emerald-300",
    keywords: {
      ar: ["حقوق_بني_ملال", "المغيلة", "السلطان_مولاي_سليمان", "ماستر_بني_ملال", "ميزان"],
      fr: ["FSJES_Beni_Mellal", "USMS_Droit", "Gouvernance_Locale_Maroc"],
      en: ["Beni_Mellal_Law", "USMS_Law_Faculty", "Morocco_Local_Law"],
      es: ["FSJES_Beni_Mellal", "Universidad_Beni_Mellal", "Derecho_Local"],
    },
    photoMeta: {
      coverImageUrl: `${SITE_DOMAIN}/images/schools/beni-mellal-cover.webp`,
      ogImageUrl: `${SITE_DOMAIN}/images/og/beni-mellal-og.jpg`,
      twitterImageUrl: `${SITE_DOMAIN}/images/og/beni-mellal-twitter.jpg`,
      width: 1200,
      height: 630,
      altText: {
        ar: "كلية العلوم القانونية بني ملال المركب الجامعي المغيلة منصة ميزان",
        fr: "Faculté de droit Béni Mellal M'Ghila - Mizan",
        en: "Beni Mellal Law Faculty M'Ghila Campus - Mizan",
        es: "Facultad de Derecho Beni Mellal M'Ghila - Mizan",
      },
      caption: {
        ar: "دليل وروافق كلية العلوم القانونية ببني ملال عبر منصة ميزان",
        fr: "Guide des ressources de la faculté de droit de Béni Mellal sur Mizan",
        en: "Beni Mellal Law Faculty directory and resources on Mizan",
        es: "Guía de la facultad de derecho de Beni Mellal en Mizan",
      },
    },
    fileMeta: {
      fileKeywords: {
        ar: ["امتحانات_بني_ملال_pdf", "محاضرات_المغيلة", "ماستر_بني_ملال"],
        fr: ["examens_beni_mellal_pdf", "cours_mgila", "master_beni_mellal_pdf"],
        en: ["beni_mellal_exams_pdf", "beni_mellal_notes", "master_beni_mellal"],
        es: ["examenes_beni_mellal_pdf", "apuntes_beni_mellal", "master_beni_mellal"],
      },
      mimeType: "application/pdf",
      allowedExtensions: ["pdf", "docx"],
    },
  },
];

/**
 * School Helper Utility
 * Safely fetches a law school object by slug with military-grade query sanitization.
 */
export const getSchoolBySlug = (slug: string): LawSchool | undefined => {
  const cleanSlug = sanitizeSchoolQuery(slug);
  return LAW_SCHOOLS.find((s) => s.slug === cleanSlug || s.id === cleanSlug);
};

/**
 * City Filter Helper
 * Get all law schools filtered by city name safely across languages.
 */
export const getSchoolsByCity = (cityName: string): LawSchool[] => {
  if (!cityName) return LAW_SCHOOLS;
  const term = sanitizeSchoolQuery(cityName);
  return LAW_SCHOOLS.filter(
    (s) =>
      s.city.ar.toLowerCase().includes(term) ||
      s.city.fr.toLowerCase().includes(term) ||
      s.city.en.toLowerCase().includes(term) ||
      s.city.es.toLowerCase().includes(term)
  );
};

/**
 * Get all available school slugs for static route generation or sitemaps.
 */
export const getAllSchoolSlugs = (): string[] => LAW_SCHOOLS.map((s) => s.slug);

/**
 * Master SEO Helper Utility for Law Schools
 * Generates dynamic Open Graph, Twitter, and file/photo SEO payloads.
 */
export const getSchoolSEOMetadata = (slug: string, lang: SupportedLang = "ar") => {
  const school = getSchoolBySlug(slug);
  if (!school) {
    return {
      title: "دليل كليات الحقوق والجامعات المغربية | Mizan - ميزان",
      description: "الدليل الشامل لكليات العلوم القانونية والاقتصادية والاجتماعية بالمغرب ومباريات الماستر",
      canonicalUrl: `${SITE_DOMAIN}/schools`,
      keywords: ["كليات_الحقوق", "FSJES_Maroc", "ماستر_القانون", "ميزان"],
      ogImage: `${SITE_DOMAIN}/Logo.svg`,
      altText: "Mizan Digital Platform Law Schools Directory",
    };
  }

  return {
    title: `${school.name[lang]} | Mizan - ميزان`,
    description: school.description[lang],
    canonicalUrl: school.canonicalUrl,
    keywords: school.keywords[lang],
    phone: school.phone,
    telUri: school.telUri,
    email: school.email,
    website: school.website,
    address: school.address[lang],
    ogImage: school.photoMeta.ogImageUrl,
    twitterImage: school.photoMeta.twitterImageUrl,
    altText: school.photoMeta.altText[lang],
    caption: school.photoMeta.caption[lang],
    fileKeywords: school.fileMeta.fileKeywords[lang],
  };
};