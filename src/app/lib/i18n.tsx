import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "ar" | "fr" | "en" | "es";
export type Theme = "light" | "dark";

export const LANGS: { code: Lang; label: string; dir: "rtl" | "ltr" }[] = [
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "fr", label: "FR", dir: "ltr" },
  { code: "en", label: "EN", dir: "ltr" },
  { code: "es", label: "ES", dir: "ltr" },
];

// ── Translation dictionary ────────────────────────────────────────────────────
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

// ── Font helpers (Arabic uses Noto; Latin scripts use Playfair/Inter) ───────────
export const serifFont = (lang: Lang) =>
  lang === "ar" ? "'Noto Serif Arabic', serif" : "'Playfair Display', 'Noto Serif Arabic', serif";
export const sansFont = (lang: Lang) =>
  lang === "ar" ? "'Noto Sans Arabic', sans-serif" : "'Inter', 'Noto Sans Arabic', sans-serif";

// ── Context ───────────────────────────────────────────────────────────────────
interface I18nCtx {
  lang: Lang;
  dir: "rtl" | "ltr";
  theme: Theme;
  setLang: (l: Lang) => void;
  setTheme: (t: Theme) => void;
  t: (key: string) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem("mizan_lang") as Lang) || "ar");
  const [theme, setThemeState] = useState<Theme>(() => (localStorage.getItem("mizan_theme") as Theme) || "light");

  const dir = LANGS.find(l => l.code === lang)?.dir || "rtl";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    localStorage.setItem("mizan_lang", lang);
  }, [lang, dir]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("mizan_theme", theme);
  }, [theme]);

  const t = (key: string) => T[key]?.[lang] ?? key;

  return (
    <Ctx.Provider value={{ lang, dir, theme, setLang: setLangState, setTheme: setThemeState, t }}>
      {children}
    </Ctx.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
