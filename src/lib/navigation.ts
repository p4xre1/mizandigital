export interface NavCategory {
  title: { ar: string; fr: string; en: string };
  slug: string;
}

export interface NavLinkItem {
  id: string;
  label: { ar: string; fr: string; en: string };
  path: string;
  hasDropdown?: boolean;
}

// 🏛️ التخصصات القانونية
export const LEGAL_FIELDS: NavCategory[] = [
  { title: { ar: "قانون الأسرة", fr: "Droit de la famille", en: "Family Law" }, slug: "family-law" },
  { title: { ar: "القانون الجنائي", fr: "Droit pénal", en: "Criminal Law" }, slug: "criminal-law" },
  { title: { ar: "القانون التجاري", fr: "Droit commercial", en: "Commercial Law" }, slug: "commercial-law" },
  { title: { ar: "القانون الإداري", fr: "Droit administratif", en: "Administrative Law" }, slug: "administrative-law" },
  { title: { ar: "القانون الدستوري", fr: "Droit constitutionnel", en: "Constitutional Law" }, slug: "constitutional-law" },
];

// 📄 أنواع الوثائق القانونية
export const DOCUMENT_TYPES: NavCategory[] = [
  { title: { ar: "النصوص القانونية", fr: "Textes juridiques", en: "Legal Texts" }, slug: "legal-texts" },
  { title: { ar: "المراسيم والقرارات", fr: "Décrets et Arrêtés", en: "Decrees" }, slug: "ministerial-decrees" },
  { title: { ar: "قرارات محكمة النقض", fr: "Arrêts de la Cassation", en: "Cassation Rulings" }, slug: "cassation-rulings" },
  { title: { ar: "الجريدة الرسمية", fr: "Bulletin Officiel", en: "Official Journals" }, slug: "official-journals" },
];

// 🌐 روابط الهيدر الرئيسية (Navbar Header Links)
export const MAIN_NAV_LINKS: NavLinkItem[] = [
  { id: "home", label: { ar: "الرئيسية", fr: "Accueil", en: "Home" }, path: "" },
  { id: "library", label: { ar: "المكتبة الرقمية", fr: "Bibliothèque", en: "Library" }, path: "library", hasDropdown: true },
  { id: "archive", label: { ar: "الأرشيف القانوني", fr: "Archives", en: "Archive" }, path: "archive" },
  { id: "jurisprudence", label: { ar: "الاجتهاد القضائي", fr: "Jurisprudence", en: "Jurisprudence" }, path: "jurisprudence" },
  { id: "about", label: { ar: "عن المنصة", fr: "À propos", en: "About" }, path: "about" },
];

// 📊 الإحصائيات والأرقام الحقيقية (Stats Data)
export const PLATFORM_STATS = [
  { id: "docs", label: { ar: "وثيقة قانونية", fr: "Documents", en: "Documents" }, value: "+12,400" },
  { id: "universities", label: { ar: "جامعة مغربية", fr: "Universités", en: "Universities" }, value: "18" },
  { id: "rulings", label: { ar: "حكم قضائي", fr: "Décisions", en: "Rulings" }, value: "+3,200" },
  { id: "users", label: { ar: "مستخدم نشط", fr: "Utilisateurs", en: "Active Users" }, value: "28k" },
];