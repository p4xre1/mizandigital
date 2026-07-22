import type { Lang } from "../lib/i18n";

export type L = Record<Lang, string>;
const t4 = (ar: string, fr: string, en: string, es: string): L => ({ ar, fr, en, es });

export interface LawSchool {
  slug: string;
  name: L;
  university: L;
  city: L;
  established: number;
  students: string;
  website: string;
  description: L;
  programs: L[];
}

// Directory of major Moroccan law faculties (Facultés des Sciences Juridiques,
// Économiques et Sociales - FSJES). Data is representative for the Mizan Digital directory.
export const LAW_SCHOOLS: LawSchool[] = [
  {
    slug: "um5-rabat-agdal",
    name: t4(
      "كلية العلوم القانونية والاقتصادية والاجتماعية — أكدال",
      "FSJES Agdal — Rabat",
      "Faculty of Law — Agdal",
      "Facultad de Derecho — Agdal"
    ),
    university: t4(
      "جامعة محمد الخامس بالرباط",
      "Université Mohammed V de Rabat",
      "Mohammed V University in Rabat",
      "Universidad Mohammed V de Rabat"
    ),
    city: t4("الرباط", "Rabat", "Rabat", "Rabat"),
    established: 1957,
    students: "24,000+",
    website: "https://fsjes-agdal.um5.ac.ma",
    description: t4(
      "أعرق كلية للحقوق في المغرب، مرجع في القانون العام والخاص والعلوم السياسية.",
      "La plus ancienne faculté de droit du Maroc, référence en droit public, privé et sciences politiques.",
      "Morocco's oldest law faculty, a reference in public, private law and political science.",
      "La facultad de derecho más antigua de Marruecos, referente en derecho público, privado y ciencias políticas."
    ),
    programs: [
      t4("القانون الخاص", "Droit privé", "Private Law", "Derecho privado"),
      t4("القانون العام", "Droit public", "Public Law", "Derecho público"),
      t4("العلوم السياسية", "Sciences politiques", "Political Science", "Ciencias políticas"),
    ],
  },
  {
    slug: "um5-rabat-souissi",
    name: t4(
      "كلية العلوم القانونية والاقتصادية والاجتماعية — السويسي وسلا",
      "FSJES Souissi & Salé",
      "Faculty of Law — Souissi & Salé",
      "Facultad de Derecho — Souissi y Salé"
    ),
    university: t4(
      "جامعة محمد الخامس بالرباط",
      "Université Mohammed V de Rabat",
      "Mohammed V University in Rabat",
      "Universidad Mohammed V de Rabat"
    ),
    city: t4("الرباط / سلا", "Rabat / Salé", "Rabat / Salé", "Rabat / Salé"),
    established: 1993,
    students: "22,000+",
    website: "http://fsjes-salé.um5.ac.ma",
    description: t4(
      "مركز أكاديمي متميز متخصص في الدراسات القانونية المعمقة وقوانين الشغل والإدارة.",
      "Centre académique d'excellence spécialisé en études juridiques approfondies et droit du travail.",
      "Academic center of excellence specialized in advanced legal studies and labor law.",
      "Centro académico de excelencia especializado en estudios jurídicos avanzados y derecho laboral."
    ),
    programs: [
      t4("قانون الشغل والتحول الرقمي", "Droit du travail & numérique", "Labor & Digital Law", "Derecho laboral y digital"),
      t4("القانون الإداري والمؤسسات", "Droit administratif & institutions", "Administrative & Institutional Law", "Derecho administrativo e institucional"),
      t4("العلوم الجنائية", "Sciences criminelles", "Criminal Sciences", "Ciencias penales"),
    ],
  },
  {
    slug: "uh2-casablanca-ain-chock",
    name: t4(
      "كلية الحقوق عين الشق",
      "FSJES Aïn Chock — Casablanca",
      "Faculty of Law — Aïn Chock",
      "Facultad de Derecho — Aïn Chock"
    ),
    university: t4(
      "جامعة الحسن الثاني بالدار البيضاء",
      "Université Hassan II de Casablanca",
      "Hassan II University of Casablanca",
      "Universidad Hassan II de Casablanca"
    ),
    city: t4("الدار البيضاء", "Casablanca", "Casablanca", "Casablanca"),
    established: 1975,
    students: "30,000+",
    website: "https://fsjesac.univh2c.ma",
    description: t4(
      "أكبر كلية حقوق من حيث عدد الطلبة، متخصصة في قانون الأعمال والقانون التجاري والمالي.",
      "La plus grande faculté de droit en effectifs, spécialisée en droit des affaires et commercial.",
      "The largest law faculty by enrollment, specialized in business and commercial law.",
      "La mayor facultad de derecho por matrícula, especializada en derecho mercantil y de empresa."
    ),
    programs: [
      t4("قانون الأعمال", "Droit des affaires", "Business Law", "Derecho de empresa"),
      t4("القانون التجاري والمالي", "Droit commercial & financier", "Commercial & Financial Law", "Derecho mercantil y financiero"),
      t4("القانون الاجتماعي", "Droit social", "Social Law", "Derecho social"),
    ],
  },
  {
    slug: "uh2-mohammedia",
    name: t4(
      "كلية العلوم القانونية بالمحمدية",
      "FSJES Mohammedia",
      "Faculty of Law — Mohammedia",
      "Facultad de Derecho — Mohammedia"
    ),
    university: t4(
      "جامعة الحسن الثاني بالدار البيضاء",
      "Université Hassan II de Casablanca",
      "Hassan II University of Casablanca",
      "Universidad Hassan II de Casablanca"
    ),
    city: t4("المحمدية", "Mohammedia", "Mohammedia", "Mohammedia"),
    established: 1985,
    students: "25,000+",
    website: "https://fsjesm.ma",
    description: t4(
      "كلية متميزة في البحث العلمي الأكاديمي، متخصصة في السياسات العمومية وقوانين العقود.",
      "Faculté renommée pour la recherche académique, spécialisée en politiques publiques et droit des contrats.",
      "Renowned faculty for academic research, specialized in public policies and contract law.",
      "Facultad reconocida por la investigación académica, especializada en políticas públicas y derecho de contratos."
    ),
    programs: [
      t4("قانون عقود وتجارة دولية", "Droit des contrats & commerce", "Contracts & International Trade", "Derecho de contratos y comercio"),
      t4("السياسات العمومية", "Politiques publiques", "Public Policies", "Políticas públicas"),
      t4("قانون المنازعات", "Droit du contentieux", "Litigation Law", "Derecho procesal"),
    ],
  },
  {
    slug: "uqa-marrakech",
    name: t4(
      "كلية العلوم القانونية بمراكش",
      "FSJES Marrakech",
      "Faculty of Law — Marrakech",
      "Facultad de Derecho — Marrakech"
    ),
    university: t4(
      "جامعة القاضي عياض بمراكش",
      "Université Cadi Ayyad",
      "Cadi Ayyad University",
      "Universidad Cadi Ayyad"
    ),
    city: t4("مراكش", "Marrakech", "Marrakech", "Marrakech"),
    established: 1978,
    students: "28,000+",
    website: "https://fsjes.uca.ma",
    description: t4(
      "كلية رائدة في القانون العقاري والتنمية المستدامة والقانون البيئي بجهة مراكش آسفي.",
      "Faculté de pointe en droit foncier et environnemental dans la région de Marrakech-Safi.",
      "A leading faculty in property and environmental law in the Marrakech-Safi region.",
      "Facultad puntera en derecho inmobiliario y ambiental en la región de Marrakech-Safi."
    ),
    programs: [
      t4("القانون العقاري والتعمير", "Droit foncier & urbanisme", "Real Estate & Urban Law", "Derecho inmobiliario y urbanístico"),
      t4("القانون البيئي", "Droit de l'environnement", "Environmental Law", "Derecho ambiental"),
      t4("القانون الجنائي والعلوم الجنائية", "Droit pénal & sciences criminelles", "Criminal Law & Criminology", "Derecho penal y criminología"),
    ],
  },
  {
    slug: "usmba-fes",
    name: t4(
      "كلية الحقوق بفاس",
      "FSJES Fès",
      "Faculty of Law — Fès",
      "Facultad de Derecho — Fez"
    ),
    university: t4(
      "جامعة سيدي محمد بن عبد الله",
      "Université Sidi Mohamed Ben Abdellah",
      "Sidi Mohamed Ben Abdellah University",
      "Universidad Sidi Mohamed Ben Abdellah"
    ),
    city: t4("فاس", "Fès", "Fès", "Fez"),
    established: 1975,
    students: "26,000+",
    website: "https://fsjes.usmba.ac.ma",
    description: t4(
      "كلية عريقة تجمع بين المقاربة الفقهية الإسلامية والقانون الوضعي الحديث.",
      "Faculté historique alliant droit musulman et droit positif dans un cursus intégré.",
      "A historic faculty blending Islamic jurisprudence and positive law in an integrated curriculum.",
      "Facultad histórica que combina jurisprudencia islámica y derecho positivo en un currículo integrado."
    ),
    programs: [
      t4("الفقه الإسلامي والقانون", "Droit musulman & positif", "Islamic & Positive Law", "Derecho islámico y positivo"),
      t4("قانون الأسرة والتركة", "Droit de la famille", "Family Law", "Derecho de familia"),
      t4("القانون الدستوري والقنصلي", "Droit constitutionnel", "Constitutional Law", "Derecho constitucional"),
    ],
  },
  {
    slug: "umo-oujda",
    name: t4(
      "كلية الحقوق بوجدة",
      "FSJES Oujda",
      "Faculty of Law — Oujda",
      "Facultad de Derecho — Oujda"
    ),
    university: t4(
      "جامعة محمد الأول بوجدة",
      "Université Mohammed Premier",
      "Mohammed I University",
      "Universidad Mohammed I"
    ),
    city: t4("وجدة", "Oujda", "Oujda", "Oujda"),
    established: 1978,
    students: "18,000+",
    website: "https://fdo.ump.ma",
    description: t4(
      "قطب أكاديمي بالجهة الشرقية متخصص في القانون الدولي والتكامل المغاربي والقانون الإداري.",
      "Pôle académique de l'Oriental spécialisé en droit international et administratif.",
      "An academic hub in the Oriental region specialized in international and administrative law.",
      "Polo académico de la región Oriental especializado en derecho internacional y administrativo."
    ),
    programs: [
      t4("القانون الدولي والعلاقات الدولية", "Droit international", "International Law", "Derecho internacional"),
      t4("القانون الإداري والحكامة", "Droit administratif & gouvernance", "Administrative Law & Governance", "Derecho administrativo y gobernanza"),
      t4("قانون الحدود والجمارك", "Droit douanier & frontières", "Customs & Border Law", "Derecho aduanero y fronterizo"),
    ],
  },
  {
    slug: "uae-tangier",
    name: t4(
      "كلية العلوم القانونية بطنجة",
      "FSJES Tanger",
      "Faculty of Law — Tangier",
      "Facultad de Derecho — Tánger"
    ),
    university: t4(
      "جامعة عبد المالك السعدي",
      "Université Abdelmalek Essaâdi",
      "Abdelmalek Essaâdi University",
      "Universidad Abdelmalek Essaâdi"
    ),
    city: t4("طنجة", "Tanger", "Tangier", "Tánger"),
    established: 1993,
    students: "20,000+",
    website: "https://fsjest.uae.ac.ma",
    description: t4(
      "كلية حديثة متخصصة في قانون التجارة الدولية والقانون البحري وقوانين الاستثمار بشمال المغرب.",
      "Faculté moderne spécialisée en droit du commerce international et droit maritime au nord du Maroc.",
      "A modern faculty specialized in international trade and maritime law in northern Morocco.",
      "Facultad moderna especializada en comercio internacional y derecho marítimo en el norte de Marruecos."
    ),
    programs: [
      t4("قانون التجارة الدولية", "Droit du commerce international", "International Trade Law", "Derecho del comercio internacional"),
      t4("القانون البحري والموانئ", "Droit maritime & portuaire", "Maritime & Port Law", "Derecho marítimo y portuario"),
      t4("قانون الأعمال الدولي", "Droit des affaires international", "International Business Law", "Derecho de negocios internacionales"),
    ],
  },
  {
    slug: "uae-tetouan-martil",
    name: t4(
      "كلية العلوم القانونية مرتيل — تطوان",
      "FSJES Tétouan / Martil",
      "Faculty of Law — Tetouan / Martil",
      "Facultad de Derecho — Tetuán / Martil"
    ),
    university: t4(
      "جامعة عبد المالك السعدي",
      "Université Abdelmalek Essaâdi",
      "Abdelmalek Essaâdi University",
      "Universidad Abdelmalek Essaâdi"
    ),
    city: t4("تطوان / مرتيل", "Tétouan / Martil", "Tetouan / Martil", "Tetuán / Martil"),
    established: 1997,
    students: "15,000+",
    website: "https://fsjesmartil.uae.ac.ma",
    description: t4(
      "مؤسسة متميزة في الدراسات القانونية المتوسطية وحقوق الإنسان والقانون العام.",
      "Établissement dynamique axé sur les études juridiques méditerranéennes et les droits de l'homme.",
      "Dynamic institution focusing on Mediterranean legal studies and human rights.",
      "Institución dinámica centrada en estudios jurídicos mediterráneos y derechos humanos."
    ),
    programs: [
      t4("حقوق الإنسان والقانون الدولي الإنساني", "Droits de l'homme", "Human Rights Law", "Derechos Humanos"),
      t4("الدراسات القانونية المتوسطية", "Études méditerranéennes", "Mediterranean Legal Studies", "Estudios Jurídicos Mediterráneos"),
      t4("العلوم السياسية والتواصل", "Sciences politiques", "Political Science", "Ciencias Políticas"),
    ],
  },
  {
    slug: "uiz-agadir",
    name: t4(
      "كلية العلوم القانونية بأكادير",
      "FSJES Agadir",
      "Faculty of Law — Agadir",
      "Facultad de Derecho — Agadir"
    ),
    university: t4(
      "جامعة ابن زهر بأكادير",
      "Université Ibn Zohr",
      "Ibn Zohr University",
      "Universidad Ibn Zohr"
    ),
    city: t4("أكادير", "Agadir", "Agadir", "Agadir"),
    established: 1984,
    students: "35,000+",
    website: "https://fsjes-ibnzohr.ac.ma",
    description: t4(
      "أكبر قطب جامعي قانوني بجنوب المغرب، متخصص في القانون البحري والصفقات العمومية.",
      "Grand pôle juridique du Sud marocain, spécialisé en droit maritime et marchés publics.",
      "Major legal academic hub in Southern Morocco, specialized in maritime law and public procurement.",
      "Gran polo jurídico del sur de Marruecos, especializado en derecho marítimo y contratación pública."
    ),
    programs: [
      t4("قانون الصفقات العمومية", "Marchés publics", "Public Procurement Law", "Contratación Pública"),
      t4("القانون الخاص والممارسات القضائية", "Pratiques judiciaires", "Judicial Practices", "Prácticas Judiciales"),
      t4("قانون الشغـل والمقاولة", "Droit de l'entreprise", "Corporate Law", "Derecho Empresarial"),
    ],
  },
  {
    slug: "uh1-settat",
    name: t4(
      "كلية الحقوق سطات",
      "FSJES Settat",
      "Faculty of Law — Settat",
      "Facultad de Derecho — Settat"
    ),
    university: t4(
      "جامعة الحسن الأول بسطات",
      "Université Hassan 1er",
      "Hassan I University",
      "Universidad Hassan I"
    ),
    city: t4("سطات", "Settat", "Settat", "Settat"),
    established: 1997,
    students: "19,000+",
    website: "https://fsjes.uh1.ac.ma",
    description: t4(
      "كلية رائدة ومبتكرة في ماسترات القانون الرياضي والقانون المالي والمالية العامة.",
      "Faculté innovante, pionnière dans les masters en droit du sport et finances publiques.",
      "Innovative faculty, pioneer in sports law and public finance master programs.",
      "Facultad innovadora, pionera en másteres de derecho deportivo y finanzas públicas."
    ),
    programs: [
      t4("القانون الرياضي", "Droit du sport", "Sports Law", "Derecho Deportivo"),
      t4("المالية العامة والجبايات", "Finances publiques & fiscalité", "Public Finance & Taxation", "Finanzas Públicas y Fiscalidad"),
      t4("العلوم الجنائية وحقوق الإنسان", "Sciences criminelles", "Criminal Sciences", "Ciencias Penales"),
    ],
  },
  {
    slug: "uit-kenitra",
    name: t4(
      "كلية العلوم القانونية بالقنيطرة",
      "FSJES Kénitra",
      "Faculty of Law — Kenitra",
      "Facultad de Derecho — Kenitra"
    ),
    university: t4(
      "جامعة ابن طفيل بالقنيطرة",
      "Université Ibn Tofail",
      "Ibn Tofail University",
      "Universidad Ibn Tofail"
    ),
    city: t4("القنيطرة", "Kénitra", "Kenitra", "Kenitra"),
    established: 2004,
    students: "21,000+",
    website: "https://fsjes.uit.ac.ma",
    description: t4(
      "مركز أكاديمي متصاعد يقدم تكوينات قانونية حديثة في قوانين الأعمال والعقار.",
      "Centre académique dynamique proposant des formations modernes en droit des affaires et foncier.",
      "A fast-growing academic hub offering modern law degree programs in business and real estate.",
      "Centro académico en rápido crecimiento que ofrece programas modernos en derecho empresarial e inmobiliario."
    ),
    programs: [
      t4("قانون الأعمال والاستثمار", "Droit des affaires & investissement", "Business & Investment Law", "Derecho de Negocios e Inversión"),
      t4("العدالة الإدارية", "Justice administrative", "Administrative Justice", "Justicia Administrativa"),
      t4("المدني والعقاري", "Droit civil & foncier", "Civil & Property Law", "Derecho Civil e Inmobiliario"),
    ],
  },
  {
    slug: "umi-meknes",
    name: t4(
      "كلية العلوم القانونية بمكناس",
      "FSJES Meknès",
      "Faculty of Law — Meknes",
      "Facultad de Derecho — Meknes"
    ),
    university: t4(
      "جامعة مولاي إسماعيل بمكناس",
      "Université Moulay Ismaïl",
      "Moulay Ismaïl University",
      "Universidad Moulay Ismaïl"
    ),
    city: t4("مكناس", "Meknès", "Meknes", "Meknes"),
    established: 1993,
    students: "22,000+",
    website: "http://fsjes.umi.ac.ma",
    description: t4(
      "مؤسسة أكاديمية بارزة بجهة فاس-مكناس متخصصة في القانون العام والتنمية الجهوية.",
      "Établissement majeur de la région Fès-Meknès spécialisé en droit public et développement régional.",
      "A major institution in the Fes-Meknes region specialized in public law and regional development.",
      "Institución clave en la región de Fez-Mequinez especializada en derecho público y desarrollo regional."
    ),
    programs: [
      t4("القانون العام والترابي", "Droit public & territorial", "Public & Territorial Law", "Derecho Público y Territorial"),
      t4("قانون الأسرة والتوثيق", "Droit de la famille & notariat", "Family Law & Notarial Studies", "Derecho de Familia y Notarial"),
      t4("قانون المقاولات", "Droit des entreprises", "Corporate Law", "Derecho de Empresas"),
    ],
  },
];

/**
 * Find a law school by its unique URL slug.
 */
export const getSchoolBySlug = (slug: string): LawSchool | undefined =>
  LAW_SCHOOLS.find((s) => s.slug === slug);

/**
 * Get law schools filtered by city name (case-insensitive search).
 */
export const getSchoolsByCity = (cityName: string): LawSchool[] => {
  const term = cityName.toLowerCase();
  return LAW_SCHOOLS.filter(
    (s) =>
      s.city.ar.toLowerCase().includes(term) ||
      s.city.fr.toLowerCase().includes(term) ||
      s.city.en.toLowerCase().includes(term) ||
      s.city.es.toLowerCase().includes(term)
  );
};

/**
 * Get all available school slugs (useful for route matching or sitemaps).
 */
export const getAllSchoolSlugs = (): string[] => LAW_SCHOOLS.map((s) => s.slug);