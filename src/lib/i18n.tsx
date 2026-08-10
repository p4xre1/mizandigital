import { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode } from "react";
import {
  interactionUIElements,
  accountManagementElements,
  getInteractionText,
  type LocalizedText,
} from "./interaction-i18n";

// ── Environmental Constants & Domain Configuration ───────────────────────────
const PRIMARY_SITE_URL = "https://www.mizan.page";

export const SITE_URL = PRIMARY_SITE_URL;
export const APP_URL = PRIMARY_SITE_URL;

// ── Core Types ───────────────────────────────────────────────────────────────
export type Lang = "ar" | "fr" | "en" | "es";
export type Theme = "light" | "dark";

export interface LangOption {
  code: Lang;
  label: string;
  nativeName: string;
  dir: "rtl" | "ltr";
  flag: string;
}

export const LANGS: LangOption[] = [
  { code: "ar", label: "العربية", nativeName: "العربية", dir: "rtl", flag: "🇲🇦" },
  { code: "fr", label: "FR", nativeName: "Français", dir: "ltr", flag: "🇫🇷" },
  { code: "en", label: "EN", nativeName: "English", dir: "ltr", flag: "🇬🇧" },
  { code: "es", label: "ES", nativeName: "Español", dir: "ltr", flag: "🇪🇸" },
];

export const SUPPORTED_LANGS = LANGS.map((item) => item.code) as Lang[];

// ── Security & Input Sanitization (Military-Grade Security) ──────────────────
/**
 * Sanitizes string parameters to mitigate XSS attacks during translation string interpolation.
 */
function sanitizeParam(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Validates path URLs to guard against open redirects and malicious scheme injections.
 */
function isSafeUrl(url: string): boolean {
  if (!url) return true;
  const normalized = url.trim().toLowerCase();
  if (
    normalized.startsWith("javascript:") ||
    normalized.startsWith("vbscript:") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("file:")
  ) {
    return false;
  }
  return true;
}

// ── Language Helpers & Normalization ─────────────────────────────────────────
export function normalizeLang(value: string | null | undefined): Lang {
  if (!value) return "ar";
  const code = String(value).trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGS.includes(code as Lang) ? (code as Lang) : "ar";
}

export function getPreferredBrowserLanguage(): Lang {
  if (typeof navigator === "undefined") return "ar";

  const candidates = [navigator.language, ...(navigator.languages || [])]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  for (const candidate of candidates) {
    const normalized = candidate.split(/[-_]/)[0];
    if (SUPPORTED_LANGS.includes(normalized as Lang)) return normalized as Lang;
  }

  return "ar";
}

/**
 * Mobile-First Fast Localized Path Generator.
 * Safely updates or prepends the language segment while validating URL safety.
 */
export function buildLocalizedPath(path: string, targetLang: Lang): string {
  const rawPath = path.trim();

  if (!isSafeUrl(rawPath)) {
    return `/${targetLang}`;
  }

  // Keep external and special URLs unchanged.
  if (
    rawPath.startsWith("http://") ||
    rawPath.startsWith("https://") ||
    rawPath.startsWith("//") ||
    rawPath.startsWith("#") ||
    rawPath.startsWith("mailto:") ||
    rawPath.startsWith("tel:")
  ) {
    return rawPath;
  }

  // Reject malformed internal URLs such as /https://mizan.page
  if (/^\/+https?:\/\//i.test(rawPath)) {
    return `/${targetLang}`;
  }

  const hashIndex = rawPath.indexOf("#");
  const searchIndex = rawPath.indexOf("?");

  const cutIndex = Math.min(
    searchIndex === -1 ? Infinity : searchIndex,
    hashIndex === -1 ? Infinity : hashIndex
  );

  const pathname =
    cutIndex === Infinity ? rawPath : rawPath.slice(0, cutIndex);

  const suffix =
    cutIndex === Infinity ? "" : rawPath.slice(cutIndex);

  const segments = pathname
    .replace(/\/+/g, "/")
    .split("/")
    .filter(Boolean);

  // Remove only the first language segment.
  if (SUPPORTED_LANGS.includes(segments[0] as Lang)) {
    segments.shift();
  }

  const cleanPath = segments.length
    ? `/${segments.join("/")}`
    : "";

  return `/${targetLang}${cleanPath}${suffix}`;
}
export function useLocalizedPath() {
  const { lang } = useI18n();

  return useCallback(
    (path: string) => buildLocalizedPath(path, lang),
    [lang]
  );
}
// ── Master SEO & Metadata Engine ──────────────────────────────────────────────
export interface SEOMetadata {
  title: string;
  siteTitle: string;
  description: string;
  keywords: string[];
  ogType: string;
  ogImage: string;
  twitterCard: string;
  canonical: string;
}

export const SEO_METADATA_MASTER: Record<Lang, {
  title: string;
  description: string;
  keywords: string[];
  siteName: string;
  slogan: string;
}> = {
  ar: {
    siteName: "منصة ميزان",
    slogan: "المجلة القانونية الرقمية الأولى في المغرب",
    title: "منصة ميزان | المرجع القانوني الرقمي للأحكام والأبحاث الجامعية بالمغرب",
    description: "منصة ميزان الرقمية للأبحاث والخدمات القانونية بالمغرب. استعرض الاجتهاد القضائي لمحكمة النقض، الأرشيف الجامعي لكليات الحقوق، المراسيم والجريدة الرسمية.",
    keywords: [
      "منصة ميزان", "ميزان قانون", "المجلة القانونية المغربية", "محكمة النقض المغربية",
      "الجريدة الرسمية المغرب", "كليات الحقوق بالمغرب", "أرشيف FSJES", "القانون المدني المغربي",
      "القانون الجنائي المغربي", "القانون التجاري", "قوانين الأسرة", "اجتهاد قضائي", "مستجدات الماستر"
    ],
  },
  fr: {
    siteName: "Plateforme Mizan",
    slogan: "Premier Journal Juridique Numérique au Maroc",
    title: "Plateforme Mizan | Référence Juridique Numérique & Jurisprudence au Maroc",
    description: "Plateforme juridique marocaine Mizan. Consultez la jurisprudence de la Cour de Cassation, les archives universitaires FSJES, les textes de loi et le Journal Officiel.",
    keywords: [
      "Plateforme Mizan", "Revue juridique Maroc", "Cour de Cassation Maroc", "Bulletin Officiel Maroc",
      "Faculté de droit Maroc", "Archives FSJES", "Droit civil marocain", "Droit pénal",
      "Droit commercial", "Jurisprudence marocaine", "Master droit Maroc", "Recherche juridique"
    ],
  },
  en: {
    siteName: "Mizan Platform",
    slogan: "Morocco's Premier Digital Legal Journal",
    title: "Mizan Platform | Leading Digital Legal Journal & Precedents in Morocco",
    description: "Mizan Digital Platform for legal research and resources in Morocco. Access Court of Cassation precedents, FSJES university archives, legislative decrees, and the Official Gazette.",
    keywords: [
      "Mizan Platform", "Moroccan Legal Journal", "Morocco Court of Cassation", "Official Gazette Morocco",
      "Law Schools Morocco", "FSJES Archive", "Moroccan Civil Law", "Moroccan Criminal Law",
      "Commercial Law Morocco", "Moroccan Case Law", "Law Master Entrance Morocco", "Mizan Page"
    ],
  },
  es: {
    siteName: "Plataforma Mizan",
    slogan: "Primera Revista Jurídica Digital de Marruecos",
    title: "Plataforma Mizan | Referencia Jurídica Digital y Jurisprudencia en Marruecos",
    description: "Plataforma jurídica Mizan. Acceda a la jurisprudencia del Tribunal de Casación, archivos universitarios FSJES, textos legislativos y el Boletín Oficial de Marruecos.",
    keywords: [
      "Plataforma Mizan", "Revista jurídica Marruecos", "Tribunal de Casación Marruecos", "Boletín Oficial Marruecos",
      "Facultad de Derecho Marruecos", "Archivos FSJES", "Derecho civil marroquí", "Derecho penal",
      "Jurisprudencia marroquí", "Master Derecho Marruecos", "Mizan página oficial"
    ],
  },
};

/**
 * Master Image SEO Helper: Generates localized, SEO-rich alt text and titles for images.
 */
export function getSEOPhotoMetadata(
  title: string,
  category?: string,
  lang: Lang = "ar"
) {
  const site = SEO_METADATA_MASTER[lang].siteName;
  const cleanTitle = title.trim();
  const catText = category ? ` - ${category}` : "";
  
  const altMap: Record<Lang, string> = {
    ar: `صورة: ${cleanTitle}${catText} | ${site}`,
    fr: `Image: ${cleanTitle}${catText} | ${site}`,
    en: `Photo: ${cleanTitle}${catText} | ${site}`,
    es: `Imagen: ${cleanTitle}${catText} | ${site}`,
  };

  return {
    alt: altMap[lang] || altMap.ar,
    title: `${cleanTitle} - ${site}`,
    loading: "lazy" as const,
    decoding: "async" as const,
  };
}

/**
 * Master File SEO Helper: Generates SEO keywords and search-friendly metadata for PDFs and documents.
 */
export function getSEOFileMetadata(
  fileName: string,
  category?: string,
  lang: Lang = "ar"
) {
  const cleanName = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
  const site = SEO_METADATA_MASTER[lang].siteName;
  
  return {
    seoTitle: `${cleanName} (PDF) - ${site}`,
    fileKeywords: [
      cleanName,
      category || "",
      site,
      SEO_METADATA_MASTER[lang].keywords[0],
      SEO_METADATA_MASTER[lang].keywords[1],
    ].filter(Boolean),
    downloadLabel: {
      ar: `تحميل وثيقة ${cleanName} PDF مجاناً`,
      fr: `Télécharger le document ${cleanName} PDF gratuitement`,
      en: `Download ${cleanName} PDF document for free`,
      es: `Descargar documento ${cleanName} PDF gratis`,
    }[lang],
  };
}

// ── Main Translation Dictionary ───────────────────────────────────────────────
type Dict = Record<string, Record<Lang, string>>;

export const T: Dict = {
  // Branding & Tagline
  brand: { ar: "منصة ميزان", fr: "Plateforme Mizan", en: "Mizan Platform", es: "Plataforma Mizan" },
  brand_sub: { ar: "المجلة القانونية الرقمية", fr: "Journal Juridique Numérique", en: "Digital Legal Journal", es: "Revista Jurídica Digital" },
  brand_full: { ar: "منصة ميزان الرقمية", fr: "Plateforme Numérique Mizan", en: "Mizan Digital Platform", es: "Plataforma Digital Mizan" },
  motto: { ar: "الحق · العدل · الميزان", fr: "Droit · Justice · Équilibre", en: "Law · Justice · Balance", es: "Derecho · Justicia · Equilibrio" },
  footer_tagline: { ar: "المجلة القانونية الرقمية الأولى في المغرب. أرشيف جامعي، وثائق تشريعية، وأحكام قضائية.", fr: "Le premier journal juridique numérique du Maroc. Archives universitaires, textes législatifs et jurisprudence.", en: "Morocco's leading digital legal journal. University archives, legislative texts, and case law.", es: "La principal revista jurídica digital de Marruecos. Archivos universitarios, textos legislativos y jurisprudencia." },
  sponsors_heading: { ar: "بدعم من شركائنا المؤسساتيين", fr: "Avec le soutien de nos partenaires institutionnels", en: "Supported by our institutional partners", es: "Con el apoyo de nuestros socios institucionales" },

  // Navigation
  nav_home: { ar: "الرئيسية", fr: "Accueil", en: "Home", es: "Inicio" },
  nav_news: { ar: "الأخبار", fr: "Actualités", en: "News", es: "Noticias" },
  nav_library: { ar: "المكتبة الرقمية", fr: "Bibliothèque", en: "Library", es: "Biblioteca" },
  nav_archive: { ar: "الأرشيف الجامعي", fr: "Archives", en: "Archive", es: "Archivo" },
  nav_seminars: { ar: "الندوات والأنشطة", fr: "Séminaires", en: "Seminars", es: "Seminarios" },
  nav_about: { ar: "عن المنصة", fr: "À propos", en: "About", es: "Acerca de" },
  nav_contact: { ar: "اتصل بنا", fr: "Contact", en: "Contact", es: "Contacto" },
  nav_jurisprudence: { ar: "الاجتهاد القضائي", fr: "Jurisprudence", en: "Jurisprudence", es: "Jurisprudencia" },
  nav_schools: { ar: "كليات الحقوق", fr: "Facultés de droit", en: "Law Schools", es: "Facultades de derecho" },

  // News Subcategories
  news_schools_title: { ar: "أخبار الكليات والجامعات", fr: "Actualités universitaires", en: "University & Law School News", es: "Noticias universitarias" },
  news_schools_desc: { ar: "مباريات الماستر، النتائج والأنشطة الأكاديمية", fr: "Concours de Master, résultats et actualités académiques", en: "Master entrance exams, results & faculty updates", es: "Concursos de Máster, resultados y actualidad académica" },
  news_gov_title: { ar: "المستجدات التشريعية والحكومية", fr: "Actualités gouvernementales", en: "Government & Legal Updates", es: "Novedades gubernamentales" },
  news_gov_desc: { ar: "مشاريع القوانين، المراسيم والجريدة الرسمية", fr: "Projets de loi, décrets et Journal Officiel", en: "Bills, decrees, and official announcements", es: "Proyectos de ley, decretos y Boletín Oficial" },
  news_general_title: { ar: "أخبار قانونية عامة", fr: "Actualités juridiques générales", en: "General Legal News", es: "Noticias jurídicas generales" },
  news_general_desc: { ar: "مستجدات الساحة القضائية والقوانين", fr: "Évolutions du secteur judiciaire", en: "Judicial sector updates & articles", es: "Novedades del sector judicial" },
  news_full_center: { ar: "مركز الأخبار الكامل", fr: "Centre d'actualités complet", en: "Visit Full News Center", es: "Centro de noticias completo" },

  // Roles Translations
  role_root: { ar: "المشرف الأقصى (Root)", fr: "Super Administrateur", en: "Root Admin", es: "Superadministrador" },
  role_security_admin: { ar: "مسؤول الأمان", fr: "Administrateur Sécurité", en: "Security Admin", es: "Admin de Seguridad" },
  role_admin: { ar: "مدير النظام", fr: "Administrateur", en: "Administrator", es: "Administrador" },
  role_marketer: { ar: "مسؤول التسويق", fr: "Sujet Marketing", en: "Marketer", es: "Especialista Marketing" },
  role_writer: { ar: "محرر محتوى", fr: "Rédacteur", en: "Writer / Content Author", es: "Redactor" },
  role_member: { ar: "عضو باحث", fr: "Membre Chercheur", en: "Research Member", es: "Miembro Investigador" },
  role_guest: { ar: "زائر", fr: "Invité", en: "Guest Visitor", es: "Invitado" },

  // Search & Filters
  search_placeholder: { ar: "ابحث في ميزان...", fr: "Rechercher dans Mizan...", en: "Search Mizan...", es: "Buscar en Mizan..." },
  search_placeholder_long: { ar: "ابحث عن مقال، نص قانوني، أو حكم قضائي...", fr: "Rechercher un article, texte de loi ou jugement...", en: "Search articles, legal texts, or court rulings...", es: "Buscar un artículo, texto legal o sentencia..." },
  login: { ar: "تسجيل الدخول", fr: "Connexion", en: "Sign In", es: "Iniciar sesión" },
  profile: { ar: "الملف الشخصي", fr: "Profil", en: "Profile", es: "Perfil" },
  logout: { ar: "تسجيل الخروج", fr: "Déconnexion", en: "Sign Out", es: "Cerrar sesión" },

  // Hero Section
  hero_badge: { ar: "المجلة القانونية الرقمية · 2026", fr: "Journal Juridique Numérique · 2026", en: "Digital Legal Journal · 2026", es: "Revista Jurídica Digital · 2026" },
  hero_title: { ar: "المرجع الأول للباحثين القانونيين في المغرب", fr: "La référence des chercheurs en droit au Maroc", en: "The leading reference for legal researchers in Morocco", es: "La referencia de los investigadores jurídicos en Marruecos" },
  hero_subtitle: { ar: "أرشيف جامعي شامل، وثائق تشريعية محدّثة، وأحدث أحكام القضاء المغربي في مكان واحد.", fr: "Archives universitaires complètes, textes législatifs à jour et dernières décisions de justice marocaines en un seul endroit.", en: "A comprehensive university archive, up-to-date legislative texts, and the latest Moroccan case law in one place.", es: "Un archivo universitario completo, textos legislativos actualizados y la jurisprudencia marroquí más reciente en un solo lugar." },
  hero_cta_library: { ar: "استعرض المكتبة", fr: "Explorer la bibliothèque", en: "Browse the Library", es: "Explorar la biblioteca" },
  hero_cta_archive: { ar: "الأرشيف الجامعي", fr: "Archives universitaires", en: "University Archive", es: "Archivo universitario" },

  // Stats
  stat_documents: { ar: "وثيقة قانونية", fr: "documents juridiques", en: "legal documents", es: "documentos jurídicos" },
  stat_universities: { ar: "جامعة مغربية", fr: "universités marocaines", en: "Moroccan universities", es: "universidades marroquíes" },
  stat_rulings: { ar: "حكم قضائي", fr: "décisions de justice", en: "court rulings", es: "sentencias judiciales" },
  stat_researchers: { ar: "باحث مسجّل", fr: "chercheurs inscrits", en: "registered researchers", es: "investigadores registrados" },

  // Library & Documents
  "library.title": { ar: "المكتبة الرقمية", fr: "Bibliothèque Numérique", en: "Digital Library", es: "Biblioteca Digital" },
  "library.subtitle": { ar: "استعرض القوانين والمراسيم والنصوص التشريعية المغربية.", fr: "Consultez les lois, décrets et textes législatifs marocains.", en: "Browse Moroccan laws, decrees, and legislative texts.", es: "Consulte las leyes, decretos y textos legislativos marroquíes." },
  "jurisprudence.title": { ar: "الاجتهاد القضائي", fr: "Jurisprudence", en: "Jurisprudence & Precedents", es: "Jurisprudencia" },
  "jurisprudence.subtitle": { ar: "قرارات محكمة النقض ومحاكم الاستئناف والدراسات الأكاديمية.", fr: "Décisions de la Cour de Cassation, cours d'appel et études.", en: "Court of Cassation rulings, appeal decisions, and studies.", es: "Decisiones de la Corte de Casación, tribunales de apelación y estudios." },
  "jurisprudence.empty": { ar: "لا توجد نتائج مطابقة لخيارات البحث حالياً.", fr: "Aucun résultat ne correspond à votre recherche.", en: "No legal precedents found matching your criteria.", es: "No se encontraron precedentes que coincidan con su búsqueda." },

  // Common & Categories
  "common.all": { ar: "جميع المواد", fr: "Tous", en: "All Resources", es: "Todos" },
  "categories.civil": { ar: "القانون المدني", fr: "Droit Civil", en: "Civil Law", es: "Derecho Civil" },
  "categories.commercial": { ar: "القانون التجاري", fr: "Droit Commercial", en: "Commercial Law", es: "Derecho Comercial" },
  "categories.penal": { ar: "القانون الجنائي", fr: "Droit Pénal", en: "Penal Law", es: "Derecho Penal" },
  fields_of_law: { ar: "التخصصات القانونية", fr: "DISCIPLINES JURIDIQUES", en: "FIELDS OF LAW", es: "ESPECIALIDADES JURÍDICAS" },
  documents_category: { ar: "الوثائق", fr: "DOCUMENTS", en: "DOCUMENTS", es: "DOCUMENTOS" },
  semesters: { ar: "الفصول الدراسية", fr: "Semestres", en: "Semesters", es: "Semestres" },

  // Home Sections & Cards
  latest_articles: { ar: "أحدث المقالات", fr: "Derniers articles", en: "Latest Articles", es: "Últimos artículos" },
  view_all: { ar: "عرض الكل", fr: "Voir tout", en: "View All", es: "Ver todo" },
  trending_topics: { ar: "المواضيع الرائجة", fr: "Sujets tendance", en: "Trending Topics", es: "Temas populares" },
  browse_by_semester: { ar: "استعرض حسب الفصل", fr: "Parcourir par semestre", en: "Browse by Semester", es: "Explorar por semestre" },
  semester_label: { ar: "الفصل", fr: "Semestre", en: "Semester", es: "Semestre" },
  newsletter_title: { ar: "النشرة القانونية", fr: "Newsletter juridique", en: "Legal Newsletter", es: "Boletín jurídico" },
  newsletter_sub: { ar: "أحدث التشريعات والأحكام كل أسبوع", fr: "Législation et jurisprudence chaque semaine", en: "Latest legislation and rulings every week", es: "Legislación y jurisprudencia cada semana" },
  newsletter_email: { ar: "بريدك الإلكتروني", fr: "Votre e-mail", en: "Your email", es: "Tu correo" },
  newsletter_cta: { ar: "اشترك مجاناً", fr: "S'abonner", en: "Subscribe Free", es: "Suscríbete gratis" },
  read_more: { ar: "اقرأ المزيد", fr: "Lire la suite", en: "Read More", es: "Leer más" },
  trending_badge: { ar: "رائج", fr: "Tendance", en: "Trending", es: "Popular" },
  reads: { ar: "قراءة", fr: "lectures", en: "reads", es: "lecturas" },
  time_hours_ago: { ar: "منذ {n} ساعة", fr: "il y a {n} h", en: "{n}h ago", es: "hace {n} h" },
  time_days_ago: { ar: "منذ {n} يوم", fr: "il y a {n} j", en: "{n}d ago", es: "hace {n} d" },

  // Schools Directory
  schools_title: { ar: "دليل كليات الحقوق بالمغرب", fr: "Annuaire des facultés de droit au Maroc", en: "Directory of Moroccan Law Schools", es: "Directorio de facultades de derecho de Marruecos" },
  schools_subtitle: { ar: "قائمة شاملة بكليات ومؤسسات تدريس القانون في المملكة المغربية.", fr: "Liste complète des facultés et instituts de droit du Royaume du Maroc.", en: "A comprehensive list of law faculties and institutes across the Kingdom of Morocco.", es: "Lista completa de facultades e institutos de derecho del Reino de Marruecos." },
  school_established: { ar: "تأسست", fr: "Fondée en", en: "Established", es: "Fundada en" },
  school_city: { ar: "المدينة", fr: "Ville", en: "City", es: "Ciudad" },
  school_programs: { ar: "المسالك والتخصصات", fr: "Filières & spécialités", en: "Programs & Specialties", es: "Programas y especialidades" },
  school_students: { ar: "عدد الطلبة", fr: "Étudiants", en: "Students", es: "Estudiantes" },
  school_website: { ar: "الموقع الرسمي", fr: "Site officiel", en: "Official Website", es: "Sitio oficial" },
  school_articles: { ar: "المواد المرتبطة", fr: "Documents liés", en: "Related Documents", es: "Documentos relacionados" },
  back_to_schools: { ar: "العودة إلى الدليل", fr: "Retour à l'annuaire", en: "Back to Directory", es: "Volver al directorio" },
  search_schools: { ar: "ابحث عن كلية أو مدينة...", fr: "Rechercher une faculté ou ville...", en: "Search a school or city...", es: "Buscar una facultad o ciudad..." },

  // Profile & User Dashboard
  dashboard: { ar: "لوحة التحكم", fr: "Tableau de bord", en: "Dashboard", es: "Panel" },
  liked_articles: { ar: "المقالات المُعجب بها", fr: "Articles aimés", en: "Liked Articles", es: "Artículos gustados" },
  saved_news: { ar: "المحفوظات", fr: "Enregistrés", en: "Saved", es: "Guardados" },
  uploaded_resumes: { ar: "السير الذاتية المرفوعة", fr: "CV téléchargés", en: "Uploaded Resumes", es: "CV subidos" },
  academic_progress: { ar: "التقدم الأكاديمي", fr: "Progression académique", en: "Academic Progress", es: "Progreso académico" },
  membership_active: { ar: "طالب حقوق نشط", fr: "Étudiant en droit actif", en: "Active Law Student", es: "Estudiante activo" },
  membership_admin: { ar: "مدير النظام", fr: "Administrateur", en: "System Administrator", es: "Administrador" },
  short_bio: { ar: "نبذة شخصية", fr: "Biographie", en: "Short Bio", es: "Biografía" },
  danger_zone: { ar: "منطقة الخطر", fr: "Zone de danger", en: "Danger Zone", es: "Zona de peligro" },
  delete_account: { ar: "حذف الحساب نهائياً", fr: "Supprimer le compte", en: "Delete Account Permanently", es: "Eliminar cuenta" },

  // Admin CMS & Security
  admin_panel: { ar: "لوحة تحكم الإدارة", fr: "Panneau d'administration", en: "Admin Dashboard", es: "Panel de administración" },
  admin_overview: { ar: "نظرة عامة", fr: "Vue d'ensemble", en: "Overview", es: "Resumen" },
  admin_users: { ar: "المستخدمون", fr: "Utilisateurs", en: "Users", es: "Usuarios" },
  admin_articles: { ar: "المقالات", fr: "Articles", en: "Articles", es: "Artículos" },
  admin_pages: { ar: "الصفحات", fr: "Pages", en: "Pages", es: "Páginas" },
  admin_security: { ar: "الأمان والتراخيص", fr: "Sécurité & Accès", en: "Security & Permissions", es: "Seguridad y Accesos" },
  admin_seo: { ar: "تحسين محركات البحث", fr: "SEO & mots-clés", en: "SEO & Keywords", es: "SEO y palabras clave" },
  admin_analytics: { ar: "التحليلات", fr: "Analytique", en: "Analytics", es: "Analítica" },
  admin_back_site: { ar: "العودة إلى الموقع", fr: "Retour au site", en: "Back to Site", es: "Volver al sitio" },
  admin_add: { ar: "إضافة", fr: "Ajouter", en: "Add", es: "Añadir" },
  admin_edit: { ar: "تعديل", fr: "Modifier", en: "Edit", es: "Editar" },
  admin_delete: { ar: "حذف", fr: "Supprimer", en: "Delete", es: "Eliminar" },
  admin_save: { ar: "حفظ", fr: "Enregistrer", en: "Save", es: "Guardar" },
  admin_cancel: { ar: "إلغاء", fr: "Annuler", en: "Cancel", es: "Cancelar" },
  admin_ban: { ar: "حظر", fr: "Bannir", en: "Ban", es: "Bloquear" },
  admin_unban: { ar: "رفع الحظر", fr: "Débannir", en: "Unban", es: "Desbloquear" },
  admin_status: { ar: "الحالة", fr: "Statut", en: "Status", es: "Estado" },
  admin_role: { ar: "الدور", fr: "Rôle", en: "Role", es: "Rol" },
  admin_active: { ar: "نشط", fr: "Actif", en: "Active", es: "Activo" },
  admin_banned: { ar: "محظور", fr: "Banni", en: "Banned", es: "Bloqueado" },
  admin_published: { ar: "منشور", fr: "Publié", en: "Published", es: "Publicado" },
  admin_draft: { ar: "مسودة", fr: "Brouillon", en: "Draft", es: "Borrador" },
  admin_search: { ar: "بحث...", fr: "Rechercher...", en: "Search...", es: "Buscar..." },
  admin_confirm_delete: { ar: "هل أنت متأكد من الحذف؟ لا يمكن التراجع.", fr: "Confirmer la suppression ? Action irréversible.", en: "Confirm deletion? This cannot be undone.", es: "¿Confirmar la eliminación? No se puede deshacer." },

  // Footer & Legal Pages
  privacy: { ar: "سياسة الخصوصية", fr: "Confidentialité", en: "Privacy Policy", es: "Privacidad" },
  terms: { ar: "شروط الاستخدام", fr: "Conditions d'utilisation", en: "Terms of Use", es: "Términos de uso" },
  disclaimer: { ar: "إخلاء المسؤولية القانونية", fr: "Avertissement Légal", en: "Legal Disclaimer", es: "Exención de Responsabilidad" },
  sitemap: { ar: "خريطة الموقع", fr: "Plan du site", en: "Site Map", es: "Mapa del sitio" },
  partners: { ar: "الشركاء", fr: "Partenaires", en: "Partners", es: "Socios" },
  toggle_theme: { ar: "الوضع الليلي", fr: "Thème", en: "Theme", es: "Tema" },
};

// ── Font Helpers ─────────────────────────────────────────────────────────────
const FONT_MAP: Record<Lang, string> = {
  ar: "'Readex Pro', system-ui, sans-serif",
  fr: "'Plus Jakarta Sans', system-ui, sans-serif",
  en: "'Plus Jakarta Sans', system-ui, sans-serif",
  es: "'Plus Jakarta Sans', system-ui, sans-serif",
};

export const serifFont = (lang: Lang) => FONT_MAP[lang] || FONT_MAP.ar;
export const sansFont = (lang: Lang) => FONT_MAP[lang] || FONT_MAP.ar;

// ── Context & Provider Interface ─────────────────────────────────────────────
interface I18nCtx {
  lang: Lang;
  language: Lang;
  dir: "rtl" | "ltr";
  theme: Theme;
  siteUrl: string;
  appUrl: string;
  seoMetadata: SEOMetadata;
  setLang: (l: Lang) => void;
  setLanguage: (l: Lang) => void;
  setTheme: (t: Theme) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  getSEOPhoto: (title: string, category?: string) => { alt: string; title: string; loading: "lazy"; decoding: "async" };
  getSEOFile: (fileName: string, category?: string) => { seoTitle: string; fileKeywords: string[]; downloadLabel: string };
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({
  children,
  pathname,
}: {
  children: ReactNode;
  pathname?: string;
}) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window !== "undefined") {
      const firstSegment = window.location.pathname.split("/").filter(Boolean)[0];
      if (SUPPORTED_LANGS.includes(firstSegment as Lang)) {
        return firstSegment as Lang;
      }
      try {
        const saved = localStorage.getItem("mizan_lang") as Lang;
        if (SUPPORTED_LANGS.includes(saved)) return saved;
        return getPreferredBrowserLanguage();
      } catch {
        /* ignore storage error */
      }
    }
    return "ar";
  });

  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("mizan_theme") as Theme;
        if (saved === "light" || saved === "dark") return saved;
      } catch {
        /* ignore storage error */
      }
    }
    return "light";
  });

  // Sync state with browser URL navigation dynamically
   // Sync language with React Router pathname
useEffect(() => {
  const syncLangFromPath = (currentPath: string) => {
    const urlLang = currentPath.split("/").filter(Boolean)[0];

    if (SUPPORTED_LANGS.includes(urlLang as Lang)) {
      setLangState(urlLang as Lang);
    }
  };

  if (pathname) {
    syncLangFromPath(pathname);
    return;
  }

  if (typeof window === "undefined") return;

  const syncFromBrowser = () => {
    syncLangFromPath(window.location.pathname);
  };

  syncFromBrowser();
  window.addEventListener("popstate", syncFromBrowser);

  return () => {
    window.removeEventListener("popstate", syncFromBrowser);
  };
}, [pathname]);

useEffect(() => {
  document.documentElement.classList.toggle("dark", theme === "dark");

  try {
    localStorage.setItem("mizan_theme", theme);
  } catch {
    /* ignore storage error */
  }
}, [theme]);

const dir = useMemo(
  () => LANGS.find((language) => language.code === lang)?.dir || "rtl",
  [lang]
);

useEffect(() => {
  document.documentElement.lang = lang;
  document.documentElement.dir = dir;

  try {
    localStorage.setItem("mizan_lang", lang);
  } catch {
    /* ignore storage error */
  }
}, [lang, dir]);
  // Parameterized translation lookup with HTML sanitization
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let text = T[key]?.[lang] ?? T[key]?.ar;

      if (!text) {
        const parts = key.split(".");
        if (parts.length === 2) {
          const scope = (interactionUIElements as Record<string, Record<string, LocalizedText>>)[parts[0]] 
                     || (accountManagementElements as Record<string, Record<string, LocalizedText>>)[parts[0]];
          
          if (scope?.[parts[1]]) {
            text = getInteractionText(scope[parts[1]], lang);
          }
        }
      }

      if (!text) {
        text = key;
      }

      if (params) {
        Object.entries(params).forEach(([paramKey, value]) => {
          const safeVal = sanitizeParam(value);
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), safeVal);
        });
      }
      return text;
    },
    [lang]
  );

  // Memoized Photo SEO generator bound to active lang
  const getSEOPhoto = useCallback(
    (title: string, category?: string) => getSEOPhotoMetadata(title, category, lang),
    [lang]
  );

  // Memoized File SEO generator bound to active lang
  const getSEOFile = useCallback(
    (fileName: string, category?: string) => getSEOFileMetadata(fileName, category, lang),
    [lang]
  );

  // Construct Master SEO Metadata object
  const seoMetadata = useMemo<SEOMetadata>(() => {
    const activeSeo = SEO_METADATA_MASTER[lang] || SEO_METADATA_MASTER.ar;
    return {
      title: activeSeo.title,
      siteTitle: activeSeo.siteName,
      description: activeSeo.description,
      keywords: activeSeo.keywords,
      ogType: "website",
      ogImage: `${SITE_URL}/Logo.svg`,
      twitterCard: "summary_large_image",
      canonical: `${SITE_URL}/${lang}`,
    };
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      language: lang,
      dir,
      theme,
      siteUrl: SITE_URL,
      appUrl: APP_URL,
      seoMetadata,
      setLang: setLangState,
      setLanguage: setLangState,
      setTheme: setThemeState,
      t,
      getSEOPhoto,
      getSEOFile,
    }),
    [lang, dir, theme, seoMetadata, t, getSEOPhoto, getSEOFile]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}