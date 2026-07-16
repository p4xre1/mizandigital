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
// Économiques et Sociales). Data is representative for a prototype directory.
export const LAW_SCHOOLS: LawSchool[] = [
  {
    slug: "um5-rabat-agdal",
    name: t4("كلية العلوم القانونية والاقتصادية والاجتماعية — أكدال", "FSJES Agdal", "Faculty of Law — Agdal", "Facultad de Derecho — Agdal"),
    university: t4("جامعة محمد الخامس", "Université Mohammed V", "Mohammed V University", "Universidad Mohammed V"),
    city: t4("الرباط", "Rabat", "Rabat", "Rabat"),
    established: 1957, students: "24,000+", website: "https://fsjes-agdal.um5.ac.ma",
    description: t4(
      "أعرق كلية للحقوق في المغرب، مرجع في القانون العام والخاص والعلوم السياسية.",
      "La plus ancienne faculté de droit du Maroc, référence en droit public, privé et sciences politiques.",
      "Morocco's oldest law faculty, a reference in public, private law and political science.",
      "La facultad de derecho más antigua de Marruecos, referente en derecho público, privado y ciencias políticas."),
    programs: [
      t4("القانون الخاص", "Droit privé", "Private Law", "Derecho privado"),
      t4("القانون العام", "Droit public", "Public Law", "Derecho público"),
      t4("العلوم السياسية", "Sciences politiques", "Political Science", "Ciencias políticas"),
    ],
  },
  {
    slug: "uh2-casablanca-ain-chock",
    name: t4("كلية الحقوق عين الشق", "FSJES Aïn Chock", "Faculty of Law — Aïn Chock", "Facultad de Derecho — Aïn Chock"),
    university: t4("جامعة الحسن الثاني", "Université Hassan II", "Hassan II University", "Universidad Hassan II"),
    city: t4("الدار البيضاء", "Casablanca", "Casablanca", "Casablanca"),
    established: 1975, students: "30,000+", website: "https://fsjesac.univh2c.ma",
    description: t4(
      "أكبر كلية حقوق من حيث عدد الطلبة، متخصصة في قانون الأعمال والقانون التجاري.",
      "La plus grande faculté de droit en effectifs, spécialisée en droit des affaires et commercial.",
      "The largest law faculty by enrollment, specialized in business and commercial law.",
      "La mayor facultad de derecho por matrícula, especializada en derecho mercantil y de empresa."),
    programs: [
      t4("قانون الأعمال", "Droit des affaires", "Business Law", "Derecho de empresa"),
      t4("القانون التجاري", "Droit commercial", "Commercial Law", "Derecho mercantil"),
      t4("القانون الاجتماعي", "Droit social", "Social Law", "Derecho social"),
    ],
  },
  {
    slug: "uqa-marrakech",
    name: t4("كلية العلوم القانونية بمراكش", "FSJES Marrakech", "Faculty of Law — Marrakech", "Facultad de Derecho — Marrakech"),
    university: t4("جامعة القاضي عياض", "Université Cadi Ayyad", "Cadi Ayyad University", "Universidad Cadi Ayyad"),
    city: t4("مراكش", "Marrakech", "Marrakech", "Marrakech"),
    established: 1978, students: "18,000+", website: "https://fsjes.uca.ma",
    description: t4(
      "كلية رائدة في القانون العقاري والقانون البيئي بجهة مراكش آسفي.",
      "Faculté de pointe en droit foncier et environnemental dans la région de Marrakech-Safi.",
      "A leading faculty in property and environmental law in the Marrakech-Safi region.",
      "Facultad puntera en derecho inmobiliario y ambiental en la región de Marrakech-Safi."),
    programs: [
      t4("القانون العقاري", "Droit foncier", "Property Law", "Derecho inmobiliario"),
      t4("القانون البيئي", "Droit de l'environnement", "Environmental Law", "Derecho ambiental"),
      t4("القانون الجنائي", "Droit pénal", "Criminal Law", "Derecho penal"),
    ],
  },
  {
    slug: "umo-oujda",
    name: t4("كلية الحقوق بوجدة", "FSJES Oujda", "Faculty of Law — Oujda", "Facultad de Derecho — Oujda"),
    university: t4("جامعة محمد الأول", "Université Mohammed Premier", "Mohammed I University", "Universidad Mohammed I"),
    city: t4("وجدة", "Oujda", "Oujda", "Oujda"),
    established: 1978, students: "15,000+", website: "https://fdo.ump.ma",
    description: t4(
      "قطب أكاديمي بالجهة الشرقية متخصص في القانون الدولي والقانون الإداري.",
      "Pôle académique de l'Oriental spécialisé en droit international et administratif.",
      "An academic hub in the Oriental region specialized in international and administrative law.",
      "Polo académico de la región Oriental especializado en derecho internacional y administrativo."),
    programs: [
      t4("القانون الدولي", "Droit international", "International Law", "Derecho internacional"),
      t4("القانون الإداري", "Droit administratif", "Administrative Law", "Derecho administrativo"),
      t4("العلاقات الدولية", "Relations internationales", "International Relations", "Relaciones internacionales"),
    ],
  },
  {
    slug: "usmba-fes",
    name: t4("كلية الحقوق بفاس", "FSJES Fès", "Faculty of Law — Fès", "Facultad de Derecho — Fez"),
    university: t4("جامعة سيدي محمد بن عبد الله", "Université Sidi Mohamed Ben Abdellah", "Sidi Mohamed Ben Abdellah University", "Universidad Sidi Mohamed Ben Abdellah"),
    city: t4("فاس", "Fès", "Fès", "Fez"),
    established: 1975, students: "20,000+", website: "https://fsjes.usmba.ac.ma",
    description: t4(
      "كلية عريقة تجمع بين الفقه الإسلامي والقانون الوضعي في تكوين متكامل.",
      "Faculté historique alliant droit musulman et droit positif dans un cursus intégré.",
      "A historic faculty blending Islamic jurisprudence and positive law in an integrated curriculum.",
      "Facultad histórica que combina jurisprudencia islámica y derecho positivo en un currículo integrado."),
    programs: [
      t4("الفقه الإسلامي والقانون", "Droit musulman & positif", "Islamic & Positive Law", "Derecho islámico y positivo"),
      t4("قانون الأسرة", "Droit de la famille", "Family Law", "Derecho de familia"),
      t4("القانون الدستوري", "Droit constitutionnel", "Constitutional Law", "Derecho constitucional"),
    ],
  },
  {
    slug: "uae-tangier",
    name: t4("كلية العلوم القانونية بطنجة", "FSJES Tanger", "Faculty of Law — Tangier", "Facultad de Derecho — Tánger"),
    university: t4("جامعة عبد المالك السعدي", "Université Abdelmalek Essaâdi", "Abdelmalek Essaâdi University", "Universidad Abdelmalek Essaâdi"),
    city: t4("طنجة", "Tanger", "Tangier", "Tánger"),
    established: 1993, students: "16,000+", website: "https://fsjest.uae.ac.ma",
    description: t4(
      "كلية حديثة متخصصة في قانون التجارة الدولية والقانون البحري بشمال المغرب.",
      "Faculté moderne spécialisée en droit du commerce international et droit maritime au nord du Maroc.",
      "A modern faculty specialized in international trade and maritime law in northern Morocco.",
      "Facultad moderna especializada en comercio internacional y derecho marítimo en el norte de Marruecos."),
    programs: [
      t4("قانون التجارة الدولية", "Droit du commerce international", "International Trade Law", "Derecho del comercio internacional"),
      t4("القانون البحري", "Droit maritime", "Maritime Law", "Derecho marítimo"),
      t4("قانون الأعمال", "Droit des affaires", "Business Law", "Derecho de empresa"),
    ],
  },
];

export const getSchoolBySlug = (slug: string) => LAW_SCHOOLS.find(s => s.slug === slug);
