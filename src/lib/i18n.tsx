import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  interactionUIElements,
  accountManagementElements,
  getInteractionText,
  type LocalizedText,
} from "./interaction-i18n";

export type Lang = "ar" | "fr" | "en" | "es";
export type Theme = "light" | "dark";

export const LANGS: { code: Lang; label: string; dir: "rtl" | "ltr" }[] = [
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "fr", label: "FR", dir: "ltr" },
  { code: "en", label: "EN", dir: "ltr" },
  { code: "es", label: "ES", dir: "ltr" },
];

export const SUPPORTED_LANGS = LANGS.map((item) => item.code) as Lang[];

export function normalizeLang(value: string | null | undefined): Lang {
  const code = String(value || "").trim().toLowerCase().split(/[-_]/)[0];
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
 * ⚡ Cleanly prepends or updates the target language in a path.
 * Prevents URL formatting bugs across language switches and handles edge cases.
 */
export function buildLocalizedPath(path: string, targetLang: Lang): string {
  if (
    !path ||
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("//") ||
    path.startsWith("#") ||
    path.startsWith("mailto:") ||
    path.startsWith("tel:")
  ) {
    return path;
  }

  // Extract hash & search params cleanly
  const hashIndex = path.indexOf("#");
  const searchIndex = path.indexOf("?");
  
  let pathname = path;
  let suffix = "";

  const cutIndex = Math.min(
    searchIndex === -1 ? Infinity : searchIndex,
    hashIndex === -1 ? Infinity : hashIndex
  );

  if (cutIndex !== Infinity) {
    pathname = path.substring(0, cutIndex);
    suffix = path.substring(cutIndex);
  }

  // Split and filter out ALL existing language prefixes
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .filter((segment) => !SUPPORTED_LANGS.includes(segment as Lang));

  const cleanPath = segments.length > 0 ? `/${segments.join("/")}` : "";
  return `/${targetLang}${cleanPath}${suffix}`;
}

export function useLocalizedPath() {
  const { lang } = useI18n();
  return (path: string) => buildLocalizedPath(path, lang);
}

// ── Translation Dictionary ────────────────────────────────────────────────────
type Dict = Record<string, Record<Lang, string>>;

export const T: Dict = {
  brand: { ar: "منصة ميزان", fr: "Plateforme Mizan", en: "Mizan Platform", es: "Plataforma Mizan" },
  brand_sub: { ar: "المجلة القانونية الرقمية", fr: "Journal Juridique Numérique", en: "Digital Legal Journal", es: "Revista Jurídica Digital" },
  nav_library: { ar: "المكتبة القانونية", fr: "Bibliothèque", en: "Library", es: "Biblioteca" },
  nav_archive: { ar: "الأرشيف الجامعي", fr: "Archives", en: "Archive", es: "Archivo" },
  nav_seminars: { ar: "الندوات", fr: "Séminaires", en: "Seminars", es: "Seminarios" },
  nav_about: { ar: "عن المنصة", fr: "À propos", en: "About", es: "Acerca de" },
  nav_contact: { ar: "اتصل بنا", fr: "Contact", en: "Contact", es: "Contacto" },
  nav_jurisprudence: { ar: "الاجتهاد والقضاء", fr: "Jurisprudence", en: "Jurisprudence", es: "Jurisprudencia" },
  search_placeholder: { ar: "ابحث...", fr: "Rechercher...", en: "Search...", es: "Buscar..." },
  search_placeholder_long: { ar: "ابحث في ميزان...", fr: "Rechercher dans Mizan...", en: "Search Mizan...", es: "Buscar en Mizan..." },
  login: { ar: "تسجيل الدخول", fr: "Connexion", en: "Sign In", es: "Iniciar sesión" },
  motto: { ar: "الحق · العدل · الميزان", fr: "Droit · Justice · Équilibre", en: "Law · Justice · Balance", es: "Derecho · Justicia · Equilibrio" },
  brand_full: { ar: "منصة ميزان", fr: "Plateforme Mizan", en: "Mizan Platform", es: "Plataforma Mizan" },
  footer_tagline: { ar: "المجلة القانونية الرقمية الأولى في المغرب. أرشيف جامعي، وثائق تشريعية، وأحكام قضائية.", fr: "Le premier journal juridique numérique du Maroc. Archives universitaires, textes législatifs et jurisprudence.", en: "Morocco's leading digital legal journal. University archives, legislative texts, and case law.", es: "La principal revista jurídica digital de Marruecos. Archivos universitarios, textos legislativos y jurisprudencia." },
  sponsors_heading: { ar: "بدعم من شركائنا المؤسساتيين", fr: "Avec le soutien de nos partenaires institutionnels", en: "Supported by our institutional partners", es: "Con el apoyo de nuestros socios institucionales" },
  
  // Library
  "library.title": { ar: "المكتبة الرقمية", fr: "Bibliothèque Numérique", en: "Digital Library", es: "Biblioteca Digital" },
  "library.subtitle": { ar: "استعرض القوانين والمراسيم والنصوص التشريعية المغربية.", fr: "Consultez les lois, décrets et textes législatifs marocains.", en: "Browse Moroccan laws, decrees, and legislative texts.", es: "Consulte las leyes, decretos y textos legislativos marroquíes." },
  
  // Jurisprudence
  "jurisprudence.title": { ar: "الاجتهاد القضائي", fr: "Jurisprudence", en: "Jurisprudence & Precedents", es: "Jurisprudencia" },
  "jurisprudence.subtitle": { ar: "قرارات محكمة النقض ومحاكم الاستئناف والدراسات الأكاديمية.", fr: "Décisions de la Cour de Cassation, cours d'appel et études.", en: "Court of Cassation rulings, appeal decisions, and studies.", es: "Decisiones de la Corte de Casación, tribunales de apelación y estudios." },
  "jurisprudence.empty": { ar: "لا توجد نتائج مطابقة لخيارات البحث حالياً.", fr: "Aucun résultat ne correspond à votre recherche.", en: "No legal precedents found matching your criteria.", es: "No se encontraron precedentes que coincidan con su búsqueda." },

  // Common / Filter Categories
  "common.all": { ar: "جميع المواد", fr: "Tous", en: "All Resources", es: "Todos" },
  "categories.civil": { ar: "القانون المدني", fr: "Droit Civil", en: "Civil Law", es: "Derecho Civil" },
  "categories.commercial": { ar: "القانون التجاري", fr: "Droit Commercial", en: "Commercial Law", es: "Derecho Comercial" },
  "categories.penal": { ar: "القانون الجنائي", fr: "Droit Pénal", en: "Penal Law", es: "Derecho Penal" },

  // Hero
  hero_badge: { ar: "المجلة القانونية الرقمية · 2026", fr: "Journal Juridique Numérique · 2026", en: "Digital Legal Journal · 2026", es: "Revista Jurídica Digital · 2026" },
  hero_title: { ar: "المرجع الأول للباحثين القانونيين في المغرب", fr: "La référence des chercheurs en droit au Maroc", en: "The leading reference for legal researchers in Morocco", es: "La referencia de los investigadores jurídicos en Marruecos" },
  hero_subtitle: { ar: "أرشيف جامعي شامل، وثائق تشريعية محدّثة، وأحدث أحكام القضاء المغربي في مكان واحد.", fr: "Archives universitaires complètes, textes législatifs à jour et dernières décisions de justice marocaines en un seul endroit.", en: "A comprehensive university archive, up-to-date legislative texts, and the latest Moroccan case law in one place.", es: "Un archivo universitario completo, textos legislativos actualizados y la jurisprudencia marroquí más reciente en un solo lugar." },
  hero_cta_library: { ar: "استعرض المكتبة", fr: "Explorer la bibliothèque", en: "Browse the Library", es: "Explorar la biblioteca" },
  hero_cta_archive: { ar: "الأرشيف الجامعي", fr: "Archives universitaires", en: "University Archive", es: "Archivo universitario" },
  profile: { ar: "الملف الشخصي", fr: "Profil", en: "Profile", es: "Perfil" },
  logout: { ar: "تسجيل الخروج", fr: "Déconnexion", en: "Sign Out", es: "Cerrar sesión" },
  semesters: { ar: "الفصول الدراسية", fr: "Semestres", en: "Semesters", es: "Semestres" },
  
  // Profile
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
  
  // Footer / legal
  privacy: { ar: "سياسة الخصوصية", fr: "Confidentialité", en: "Privacy Policy", es: "Privacidad" },
  terms: { ar: "شروط الاستخدام", fr: "Conditions d'utilisation", en: "Terms of Use", es: "Términos de uso" },
  disclaimer: { ar: "إخلاء المسؤولية", fr: "Non-Responsabilité", en: "Legal Disclaimer", es: "Exención" },
  sitemap: { ar: "خريطة الموقع", fr: "Plan du site", en: "Site Map", es: "Mapa del sitio" },
  partners: { ar: "الشركاء", fr: "Partenaires", en: "Partners", es: "Socios" },
  toggle_theme: { ar: "الوضع الليلي", fr: "Thème", en: "Theme", es: "Tema" },
  
  // Home stats
  stat_documents: { ar: "وثيقة قانونية", fr: "documents juridiques", en: "legal documents", es: "documentos jurídicos" },
  stat_universities: { ar: "جامعة مغربية", fr: "universités marocaines", en: "Moroccan universities", es: "universidades marroquíes" },
  stat_rulings: { ar: "حكم قضائي", fr: "décisions de justice", en: "court rulings", es: "sentencias judiciales" },
  stat_researchers: { ar: "باحث مسجّل", fr: "chercheurs inscrits", en: "registered researchers", es: "investigadores registrados" },
  
  // Home sections
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
  
  // Law schools directory
  nav_schools: { ar: "كليات الحقوق", fr: "Facultés de droit", en: "Law Schools", es: "Facultades de derecho" },
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
  
  // Admin CMS
  admin_panel: { ar: "لوحة تحكم الإدارة", fr: "Panneau d'administration", en: "Admin Dashboard", es: "Panel de administración" },
  admin_overview: { ar: "نظرة عامة", fr: "Vue d'ensemble", en: "Overview", es: "Resumen" },
  admin_users: { ar: "المستخدمون", fr: "Utilisateurs", en: "Users", es: "Usuarios" },
  admin_articles: { ar: "المقالات", fr: "Articles", en: "Articles", es: "Artículos" },
  admin_pages: { ar: "الصفحات", fr: "Pages", en: "Pages", es: "Páginas" },
  admin_security: { ar: "الأمان", fr: "Sécurité", en: "Security", es: "Seguridad" },
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
};

// ── Font Helpers ─────────────────────────────────────────────────────────────
// Modern fonts: Readex Pro (Arabic) & Plus Jakarta Sans (FR / EN / ES)
const FONT_MAP: Record<Lang, string> = {
  ar: "'Readex Pro', sans-serif",
  fr: "'Plus Jakarta Sans', system-ui, sans-serif",
  en: "'Plus Jakarta Sans', system-ui, sans-serif",
  es: "'Plus Jakarta Sans', system-ui, sans-serif",
};

export const serifFont = (lang: Lang) => FONT_MAP[lang] || FONT_MAP.ar;
export const sansFont = (lang: Lang) => FONT_MAP[lang] || FONT_MAP.ar;

// ── Context & Provider ─────────────────────────────────────────────────────────
interface I18nCtx {
  lang: Lang;
  language: Lang;
  dir: "rtl" | "ltr";
  theme: Theme;
  setLang: (l: Lang) => void;
  setLanguage: (l: Lang) => void;
  setTheme: (t: Theme) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window !== "undefined") {
      // 1. First priority: Get language directly from current URL path (/fr/library -> 'fr')
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

  // ⚡ Sync state with browser location/URL changes dynamically
  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncLangFromUrl = () => {
      const urlLang = window.location.pathname.split("/").filter(Boolean)[0];
      if (SUPPORTED_LANGS.includes(urlLang as Lang) && urlLang !== lang) {
        setLangState(urlLang as Lang);
      }
    };

    syncLangFromUrl();
    window.addEventListener("popstate", syncLangFromUrl);
    return () => window.removeEventListener("popstate", syncLangFromUrl);
  }, [lang]);

  const dir = LANGS.find((l) => l.code === lang)?.dir || "rtl";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    try {
      localStorage.setItem("mizan_lang", lang);
    } catch {
      /* ignore storage error */
    }
  }, [lang, dir]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("mizan_theme", theme);
    } catch {
      /* ignore storage error */
    }
  }, [theme]);

  // Helper with parameter replacement support (e.g., {n}) and multi-dictionary fallback
  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = T[key]?.[lang] ?? T[key]?.ar;

    // Fallback search through interactionUIElements & accountManagementElements if key isn't in T
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
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(value));
      });
    }
    return text;
  };

  return (
    <Ctx.Provider
      value={{
        lang,
        language: lang,
        dir,
        theme,
        setLang: setLangState,
        setLanguage: setLangState,
        setTheme: setThemeState,
        t,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}