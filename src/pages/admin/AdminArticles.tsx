import { useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  MessageSquare,
  MessageSquareOff,
  Gauge,
  FileText,
  Eye,
  Loader2,
  Search,
  Filter,
  Image as ImageIcon,
  ShieldAlert,
  Key,
  AlertTriangle,
} from "lucide-react";
import { useI18n, serifFont, sansFont } from "@/lib/i18n";
import {
  useCms,
  upsertArticle,
  deleteArticle,
  type AdminArticle,
} from "@/lib/adminStore";
import { sanitizeText, sanitizeHtml } from "@/lib/security";
import { analyzeSeo, type SeoReport } from "@/lib/seoScore";
import { useRole } from "@/hooks/useRole";
import RichTextEditor from "@/components/common/RichTextEditor";

type Draft = Partial<AdminArticle> & {
  coverImage?: string;
  imageAlt?: string;
  imageKeywords?: string;
  metaKeywords?: string;
};

type SupportedLang = "ar" | "fr" | "en" | "es";

// Multi-language UI Dictionary to maintain clean JSX and appease code linters
const UI_STRINGS: Record<string, Record<SupportedLang, string>> = {
  noDeletePerm: {
    ar: "ليس لديك صلاحية لحذف المقالات",
    fr: "Vous n'avez pas la permission de supprimer des articles",
    en: "You do not have permission to delete articles",
    es: "No tienes permiso para eliminar artículos",
  },
  unauthorizedTitle: {
    ar: "غير مصرح بالوصول",
    fr: "Accès non autorisé",
    en: "Unauthorized Access",
    es: "Acceso no autorizado",
  },
  unauthorizedDesc: {
    ar: "عذراً، هذه المنطقة مخصصة للقيادة والإدارة الأمنية وتطلب صلاحيات محرر أو مسؤول.",
    fr: "Désolé, cette zone est réservée à l'administration et requiert des privilèges d'auteur ou d'administrateur.",
    en: "Sorry, this security zone is restricted to authorized administrative and editorial staff.",
    es: "Lo sentimos, esta zona de seguridad está restringida al personal administrativo y editorial autorizado.",
  },
  registeredCount: {
    ar: "مقالات مسجلة بالنظام",
    fr: "articles enregistrés au système",
    en: "articles registered in repository",
    es: "artículos registrados en el sistema",
  },
  searchPlaceholder: {
    ar: "بحث بالعنوان، الرابط الفرعي أو التصنيف...",
    fr: "Rechercher par titre, slug ou catégorie...",
    en: "Search by title, slug or category...",
    es: "Buscar por título, slug o categoría...",
  },
  statusLabel: {
    ar: "الحالة:",
    fr: "Statut:",
    en: "Status:",
    es: "Estado:",
  },
  allStatus: {
    ar: "الكل",
    fr: "Tous",
    en: "All",
    es: "Todos",
  },
  noMatchingArticles: {
    ar: "لا توجد مقالات مطابقة لشروط البحث.",
    fr: "Aucun article ne correspond aux critères de recherche.",
    en: "No articles match search criteria.",
    es: "No hay artículos que coincidan con la búsqueda.",
  },
  noArticlesInRepo: {
    ar: "لا توجد مقالات مسجلة حتى الآن.",
    fr: "Aucun article enregistré pour le moment.",
    en: "No articles found in repository.",
    es: "No se encontraron artículos en el repositorio.",
  },
  tableHeaderTitleSlug: {
    ar: "العنوان والمسار",
    fr: "Titre & Slug",
    en: "Title & Slug",
    es: "Título y Slug",
  },
  tableHeaderComments: {
    ar: "التعليقات",
    fr: "Commentaires",
    en: "Comments",
    es: "Comentarios",
  },
  titleRequired: {
    ar: "العنوان مطلوب",
    fr: "Le titre est requis",
    en: "Title is required",
    es: "El título es obligatorio",
  },
  saveError: {
    ar: "حدث خطأ أثناء الحفظ. يرجى التحقق من الشبكة وإعادة المحاولة.",
    fr: "Une erreur est survenue lors de l'enregistrement.",
    en: "An error occurred while saving.",
    es: "Ocurrió un error al guardar.",
  },
  fieldArticleTitle: {
    ar: "عنوان المقال الرئيسي",
    fr: "Titre de l'article",
    en: "Main Article Title",
    es: "Título principal",
  },
  titlePlaceholder: {
    ar: "مثال: مستجدات قانون المسطرة الجنائية...",
    fr: "Ex: Nouveautés de la procédure pénale...",
    en: "Ex: Criminal procedure law updates...",
    es: "Ej: Novedades del derecho procesal penal...",
  },
  fieldCategory: {
    ar: "التصنيف",
    fr: "Catégorie",
    en: "Category",
    es: "Categoría",
  },
  categoryPlaceholder: {
    ar: "قانون جنائي",
    fr: "Droit Pénal",
    en: "Criminal Law",
    es: "Derecho Penal",
  },
  fieldRichText: {
    ar: "محتوى المقال (Rich Text)",
    fr: "Contenu de l'article",
    en: "Article Content",
    es: "Contenido del artículo",
  },
  fieldCoverImageUrl: {
    ar: "رابط صورة الغلاف",
    fr: "URL d'image de couverture",
    en: "Cover Image URL",
    es: "URL de imagen de portada",
  },
  fieldImageAlt: {
    ar: "النص البديل (Image Alt Tag)",
    fr: "Texte alternatif (Alt)",
    en: "Image Alt Tag",
    es: "Texto alternativo (Alt)",
  },
  altPlaceholder: {
    ar: "وصف الصورة للكلمات المفتاحية",
    fr: "Description image SEO",
    en: "SEO image description",
    es: "Descripción de imagen SEO",
  },
  fieldImageKeywords: {
    ar: "كلمات دلالية للصورة",
    fr: "Mots-clés image",
    en: "Photo SEO Keywords",
    es: "Palabras clave de la foto",
  },
  fieldAuthor: {
    ar: "اسم الكاتب / المرجع",
    fr: "Auteur / Référence",
    en: "Author / Reference",
    es: "Autor / Referencia",
  },
  fieldTags: {
    ar: "الوسوم (مفصولة بفواصل)",
    fr: "Tags (séparés par des virgules)",
    en: "Tags (comma separated)",
    es: "Etiquetas",
  },
  fieldEnableComments: {
    ar: "تفعيل التعليقات",
    fr: "Activer les commentaires",
    en: "Enable Comments",
    es: "Habilitar comentarios",
  },
  fieldFocusKeyword: {
    ar: "الكلمة المفتاحية المستهدفة",
    fr: "Mot-clé principal",
    en: "Focus Keyword",
    es: "Palabra clave principal",
  },
};

function getText(key: string, lang: string): string {
  const currentLang = (lang as SupportedLang) in UI_STRINGS.noDeletePerm ? (lang as SupportedLang) : "en";
  return UI_STRINGS[key]?.[currentLang] || UI_STRINGS[key]?.["en"] || key;
}

export default function AdminArticles() {
  const { lang, dir, t } = useI18n();
  const cms = useCms();
  const { canWriteContent, isStaff } = useRole();

  const [editing, setEditing] = useState<Draft | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");

  const siteUrl = import.meta.env.VITE_SITE_URL || import.meta.env.VITE_APP_URL || "https://www.mizan.page";

  // Filtered Articles List
  const filteredArticles = useMemo(() => {
    return cms.articles.filter((art) => {
      const matchesSearch =
          art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          art.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (art.category && art.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
          statusFilter === "all" ? true : art.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [cms.articles, searchQuery, statusFilter]);

  const handleDelete = async (id: string) => {
    if (!canWriteContent) {
      alert(getText("noDeletePerm", lang));
      return;
    }

    if (!confirm(t("admin_confirm_delete"))) return;
    try {
      setDeletingId(id);
      await deleteArticle(id);
    } catch (err) {
      console.error("Failed to delete article:", err);
    } finally {
      setDeletingId(null);
    }
  };

  if (!isStaff) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
          <ShieldAlert className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
          <h2 className="text-xl font-bold text-foreground">
            {getText("unauthorizedTitle", lang)}
          </h2>
          <p className="text-xs text-muted-foreground mt-2 max-w-md">
            {getText("unauthorizedDesc", lang)}
          </p>
        </div>
    );
  }

  return (
      <div dir={dir} className="w-full space-y-6 pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 p-4 sm:p-6 rounded-2xl border border-border/80 backdrop-blur-md shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h1
                  className="text-xl sm:text-2xl font-bold text-foreground tracking-tight"
                  style={{ fontFamily: serifFont(lang) }}
              >
                {t("admin_articles")}
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">
              Security Active
            </span>
            </div>
            <p
                className="text-xs text-muted-foreground mt-1"
                style={{ fontFamily: sansFont(lang) }}
            >
              {cms.articles.length} {getText("registeredCount", lang)} ({siteUrl})
            </p>
          </div>

          {canWriteContent && (
              <button
                  onClick={() =>
                      setEditing({
                        status: "draft",
                        commentsEnabled: true,
                        content: "",
                        tags: [],
                        coverImage: "",
                        imageAlt: "",
                        imageKeywords: "",
                        metaKeywords: "",
                      })
                  }
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                  style={{ fontFamily: sansFont(lang) }}
              >
                <Plus size={16} />
                {t("admin_add")}
              </button>
          )}
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-card p-3 sm:p-4 rounded-xl border border-border">
          <div className="relative w-full sm:flex-1">
            <Search size={16} className="absolute rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={getText("searchPlaceholder", lang)}
                className="w-full rtl:pr-9 ltr:pl-9 rtl:pl-3 ltr:pr-3 py-2 text-xs bg-muted/30 border border-border rounded-lg outline-none focus:border-emerald-500 text-foreground"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Filter size={14} />
              <span>{getText("statusLabel", lang)}</span>
            </div>
            <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "published" | "draft")}
                className="px-3 py-2 text-xs bg-muted/30 border border-border rounded-lg outline-none text-foreground font-mono"
            >
              <option value="all">{getText("allStatus", lang)}</option>
              <option value="published">{t("admin_published")}</option>
              <option value="draft">{t("admin_draft")}</option>
            </select>
          </div>
        </div>

        {/* Mobile-First Article Cards (Small Screens) */}
        <div className="block sm:hidden space-y-3">
          {filteredArticles.length === 0 ? (
              <div className="p-8 text-center bg-card border border-border rounded-2xl text-xs text-muted-foreground">
                {getText("noMatchingArticles", lang)}
              </div>
          ) : (
              filteredArticles.map((a) => (
                  <div
                      key={a.id}
                      className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-xs hover:border-emerald-500/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-sm text-foreground line-clamp-2">{a.title}</h3>
                        <div className="text-[11px] font-mono text-muted-foreground mt-1">
                          /{a.slug} · <span className="text-emerald-500 font-medium">{a.category || "General"}</span>
                        </div>
                      </div>
                      <span
                          className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              a.status === "published"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                      >
                  {a.status === "published" ? t("admin_published") : t("admin_draft")}
                </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <Eye size={13} className="text-emerald-500/70" />
                    {(a.views ?? 0).toLocaleString()}
                  </span>
                        <span>
                    {a.commentsEnabled !== false ? (
                        <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                        <MessageSquare size={13} /> ON
                      </span>
                    ) : (
                        <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                        <MessageSquareOff size={13} /> OFF
                      </span>
                    )}
                  </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                            onClick={() => setEditing(a)}
                            className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 active:scale-95"
                            title={t("admin_edit")}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                            onClick={() => handleDelete(a.id)}
                            disabled={deletingId === a.id}
                            className="p-2 rounded-lg bg-rose-500/10 text-rose-400 disabled:opacity-50 active:scale-95"
                            title={t("admin_delete")}
                        >
                          {deletingId === a.id ? (
                              <Loader2 size={15} className="animate-spin" />
                          ) : (
                              <Trash2 size={15} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
              ))
          )}
        </div>

        {/* Desktop Data Table */}
        <div className="hidden sm:block bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ fontFamily: sansFont(lang) }}>
              <thead>
              <tr className="text-[11px] text-muted-foreground uppercase border-b border-border bg-muted/30 font-semibold tracking-wider">
                <th className="p-4 text-start">{getText("tableHeaderTitleSlug", lang)}</th>
                <th className="p-4 text-start">{t("admin_status")}</th>
                <th className="p-4 text-start">{getText("tableHeaderComments", lang)}</th>
                <th className="p-4 text-start">{t("reads")}</th>
                <th className="p-4 text-end">—</th>
              </tr>
              </thead>
              <tbody className="divide-y divide-border">
              {filteredArticles.length === 0 ? (
                  <tr>
                    <td
                        colSpan={5}
                        className="p-8 text-center text-muted-foreground text-xs font-mono"
                    >
                      {getText("noArticlesInRepo", lang)}
                    </td>
                  </tr>
              ) : (
                  filteredArticles.map((a) => (
                      <tr
                          key={a.id}
                          className="hover:bg-muted/40 transition-colors group"
                      >
                        <td className="p-4 max-w-xs sm:max-w-md">
                          <div className="font-semibold text-foreground text-sm group-hover:text-emerald-400 transition-colors truncate">
                            {a.title}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono truncate mt-0.5">
                            /{a.slug} · <span className="text-emerald-500/80">{a.category || "General"}</span>
                          </div>
                        </td>
                        <td className="p-4">
                      <span
                          className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                              a.status === "published"
                                  ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400"
                                  : "bg-amber-950/40 border-amber-500/30 text-amber-400"
                          }`}
                      >
                        <span
                            className={`w-1.5 h-1.5 rounded-full ${
                                a.status === "published" ? "bg-emerald-400" : "bg-amber-400"
                            }`}
                        />
                        {a.status === "published"
                            ? t("admin_published")
                            : t("admin_draft")}
                      </span>
                        </td>
                        <td className="p-4">
                          {a.commentsEnabled !== false ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                          <MessageSquare size={14} />
                          <span className="text-[10px] font-mono">ON</span>
                        </span>
                          ) : (
                              <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                          <MessageSquareOff size={14} />
                          <span className="text-[10px] font-mono">OFF</span>
                        </span>
                          )}
                        </td>
                        <td className="p-4 text-muted-foreground font-mono text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Eye size={13} className="text-muted-foreground/60" />
                        {(a.views ?? 0).toLocaleString()}
                      </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                                onClick={() => setEditing(a)}
                                className="p-2 rounded-lg text-muted-foreground hover:text-emerald-400 hover:bg-emerald-950/30 transition-all cursor-pointer"
                                title={t("admin_edit")}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                                onClick={() => handleDelete(a.id)}
                                disabled={deletingId === a.id}
                                className="p-2 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-950/30 transition-all disabled:opacity-50 cursor-pointer"
                                title={t("admin_delete")}
                            >
                              {deletingId === a.id ? (
                                  <Loader2 size={15} className="animate-spin text-rose-400" />
                              ) : (
                                  <Trash2 size={15} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                  ))
              )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Article Modal Editor */}
        {editing && (
            <ArticleEditorModal
                draft={editing}
                onClose={() => setEditing(null)}
                dir={dir}
                lang={lang}
                t={t}
                siteUrl={siteUrl}
            />
        )}
      </div>
  );
}

function ArticleEditorModal({
                              draft,
                              onClose,
                              dir,
                              lang,
                              t,
                              siteUrl,
                            }: {
  draft: Draft;
  onClose: () => void;
  dir: "rtl" | "ltr";
  lang: ReturnType<typeof useI18n>["lang"];
  t: (k: string) => string;
  siteUrl: string;
}) {
  const [d, setD] = useState<Draft>(draft);
  const [tagInput, setTagInput] = useState((draft.tags || []).join(", "));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slugify = (text: string) =>
      text
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-");

  const handleTitleChange = (title: string) => {
    const shouldAutoSlug = !d.id && (!d.slug || d.slug === slugify(d.title || ""));
    const newSlug = shouldAutoSlug ? slugify(title) : d.slug;

    const autoImageAlt = d.imageAlt || `${title} - ${d.category || "Legal Text"} | Mizan`;

    setD((prev) => ({
      ...prev,
      title,
      slug: newSlug,
      imageAlt: autoImageAlt,
    }));
  };

  const report: SeoReport = useMemo(
      () =>
          analyzeSeo({
            title: d.title || "",
            metaTitle: d.metaTitle,
            metaDescription: d.metaDescription,
            slug: d.slug || "",
            keyword: d.keyword,
            contentHtml: d.content || "",
            tags: tagInput
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
          }),
      [d, tagInput]
  );

  const imageSeoScore = useMemo(() => {
    let score = 0;
    if (d.coverImage) score += 30;
    if (d.imageAlt && d.imageAlt.length >= 10) score += 40;
    if (d.imageKeywords && d.imageKeywords.includes(d.keyword || "")) score += 30;
    return score;
  }, [d.coverImage, d.imageAlt, d.imageKeywords, d.keyword]);

  const save = async () => {
    setError(null);
    if (!d.title?.trim()) {
      setError(getText("titleRequired", lang));
      return;
    }

    try {
      setIsSaving(true);

      const cleanArticle = {
        ...d,
        title: sanitizeText(d.title || "", 200),
        slug: sanitizeText(d.slug || "", 120).replace(/\s+/g, "-").toLowerCase(),
        category: sanitizeText(d.category || "", 80),
        author: sanitizeText(d.author || "", 120),
        excerpt: sanitizeText(d.excerpt || "", 300),
        metaTitle: sanitizeText(d.metaTitle || d.title || "", 70),
        metaDescription: sanitizeText(d.metaDescription || d.excerpt || "", 180),
        keyword: sanitizeText(d.keyword || "", 60),
        content: sanitizeHtml(d.content || ""),
        tags: tagInput
            .split(",")
            .map((s) => sanitizeText(s, 40))
            .filter(Boolean)
            .slice(0, 12),
      };

      await upsertArticle(cleanArticle);
      onClose();
    } catch (err) {
      console.error("Save error:", err);
      setError(getText("saveError", lang));
    } finally {
      setIsSaving(false);
    }
  };

  const gradeBadgeClass =
      report.grade === "A"
          ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-400"
          : report.grade === "B"
              ? "bg-blue-950/50 border-blue-500/40 text-blue-400"
              : report.grade === "C"
                  ? "bg-amber-950/50 border-amber-500/40 text-amber-400"
                  : "bg-rose-950/50 border-rose-500/40 text-rose-400";

  const progressBg =
      report.grade === "A"
          ? "bg-emerald-500"
          : report.grade === "B"
              ? "bg-blue-500"
              : report.grade === "C"
                  ? "bg-amber-500"
                  : "bg-rose-500";

  return (
      <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
          onClick={onClose}
      >
        <div
            className="bg-card w-full max-w-5xl h-[92vh] sm:h-auto sm:max-h-[90vh] rounded-t-3xl sm:rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95"
            onClick={(e) => e.stopPropagation()}
            dir={dir}
        >
          {/* Modal Topbar */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-muted/30 sticky top-0 z-10 shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="text-emerald-500" size={20} />
              <div>
                <h2
                    className="font-bold text-foreground text-base sm:text-lg leading-tight"
                    style={{ fontFamily: serifFont(lang) }}
                >
                  {d.id ? t("admin_edit") : t("admin_add")}
                </h2>
                <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline-block">
                Canonical: {siteUrl}/ar/news/{d.slug || "new"}
              </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                  onClick={save}
                  disabled={isSaving}
                  className="px-4 sm:px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {isSaving && <Loader2 size={14} className="animate-spin" />}
                {t("admin_save")}
              </button>
              <button
                  onClick={onClose}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {error && (
              <div className="bg-rose-950/40 border-b border-rose-500/30 px-5 py-2 text-xs text-rose-400 font-medium flex items-center gap-2">
                <AlertTriangle size={14} />
                <span>{error}</span>
              </div>
          )}

          {/* Modal Body */}
          <div
              className="flex-1 overflow-y-auto p-4 sm:p-6 grid lg:grid-cols-[1fr_340px] gap-6"
              style={{ fontFamily: sansFont(lang) }}
          >
            {/* Left Column */}
            <div className="space-y-4">
              <Field
                  label={getText("fieldArticleTitle", lang)}
                  value={d.title || ""}
                  onChange={handleTitleChange}
                  dir={dir}
                  placeholder={getText("titlePlaceholder", lang)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field
                    label="Slug (URL)"
                    value={d.slug || ""}
                    onChange={(v) => setD({ ...d, slug: v })}
                    dir={dir}
                    placeholder="article-slug-url"
                />
                <Field
                    label={getText("fieldCategory", lang)}
                    value={d.category || ""}
                    onChange={(v) => setD({ ...d, category: v })}
                    dir={dir}
                    placeholder={getText("categoryPlaceholder", lang)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  {getText("fieldRichText", lang)}
                </label>
                <div className="rounded-xl border border-border overflow-hidden bg-card min-h-[300px]">
                  <RichTextEditor
                      value={d.content || ""}
                      onChange={(html) => setD({ ...d, content: html })}
                      dir={dir}
                  />
                </div>
              </div>

              {/* Photo & File SEO Optimization Box */}
              <div className="bg-muted/20 border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon size={15} className="text-emerald-500" />
                    <span>Master Photo & File SEO</span>
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">
                  Score: {imageSeoScore}/100
                </span>
                </div>

                <Field
                    label={getText("fieldCoverImageUrl", lang)}
                    value={d.coverImage || ""}
                    onChange={(v) => setD({ ...d, coverImage: v })}
                    dir="ltr"
                    placeholder="https://images.mizan.page/uploads/photo.jpg"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field
                      label={getText("fieldImageAlt", lang)}
                      value={d.imageAlt || ""}
                      onChange={(v) => setD({ ...d, imageAlt: v })}
                      dir={dir}
                      placeholder={getText("altPlaceholder", lang)}
                  />
                  <Field
                      label={getText("fieldImageKeywords", lang)}
                      value={d.imageKeywords || ""}
                      onChange={(v) => setD({ ...d, imageKeywords: v })}
                      dir={dir}
                      placeholder="law, morocco, legal, court"
                  />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Status & Options */}
              <div className="bg-muted/20 border border-border rounded-xl p-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    {t("admin_status")}
                  </label>
                  <select
                      value={d.status || "draft"}
                      onChange={(e) =>
                          setD({ ...d, status: e.target.value as AdminArticle["status"] })
                      }
                      className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-card text-foreground outline-none focus:border-emerald-500 font-mono uppercase"
                  >
                    <option value="draft">{t("admin_draft")}</option>
                    <option value="published">{t("admin_published")}</option>
                  </select>
                </div>

                <Field
                    label={getText("fieldAuthor", lang)}
                    value={d.author || ""}
                    onChange={(v) => setD({ ...d, author: v })}
                    dir={dir}
                />

                <Field
                    label={getText("fieldTags", lang)}
                    value={tagInput}
                    onChange={setTagInput}
                    dir={dir}
                />

                <label className="flex items-center justify-between text-xs text-foreground cursor-pointer pt-2 border-t border-border/60">
                <span className="flex items-center gap-1.5 font-medium">
                  <MessageSquare size={14} className="text-emerald-500" />
                  {getText("fieldEnableComments", lang)}
                </span>
                  <input
                      type="checkbox"
                      checked={d.commentsEnabled !== false}
                      onChange={(e) => setD({ ...d, commentsEnabled: e.target.checked })}
                      className="w-4 h-4 rounded border-border text-emerald-600 focus:ring-emerald-500/30 accent-emerald-500 cursor-pointer"
                  />
                </label>
              </div>

              {/* SEO Configurations */}
              <div className="bg-muted/20 border border-border rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Key size={14} className="text-emerald-500" />
                  <span>SEO Configuration</span>
                </h3>

                <Field
                    label={getText("fieldFocusKeyword", lang)}
                    value={d.keyword || ""}
                    onChange={(v) => setD({ ...d, keyword: v })}
                    dir={dir}
                />

                <Field
                    label="Meta Title (Search Engine)"
                    value={d.metaTitle || ""}
                    onChange={(v) => setD({ ...d, metaTitle: v })}
                    dir={dir}
                />

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Meta Description
                  </label>
                  <textarea
                      value={d.metaDescription || ""}
                      onChange={(e) => setD({ ...d, metaDescription: e.target.value })}
                      rows={3}
                      maxLength={180}
                      className={`w-full px-3 py-2 text-xs border border-border rounded-lg bg-card text-foreground outline-none focus:border-emerald-500 transition-all resize-none ${
                          dir === "rtl" ? "text-right" : "text-left"
                      }`}
                  />
                </div>
              </div>

              {/* SEO Live Audit Meter */}
              <div className="bg-muted/20 border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wider">
                    <Gauge size={14} className="text-emerald-500" />
                    SEO Score Audit
                  </h3>
                  <span
                      className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-md border ${gradeBadgeClass}`}
                  >
                  {report.score} / 100 · {report.grade}
                </span>
                </div>

                <div className="h-1.5 rounded-full bg-border overflow-hidden mb-3">
                  <div
                      className={`h-full rounded-full transition-all duration-500 ${progressBg}`}
                      style={{ width: `${report.score}%` }}
                  />
                </div>

                <ul className="space-y-2">
                  {report.checks.map((c) => (
                      <li key={c.id} className="flex items-start gap-2 text-xs">
                    <span
                        className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                            c.status === "pass"
                                ? "bg-emerald-400"
                                : c.status === "warn"
                                    ? "bg-amber-400"
                                    : "bg-rose-400"
                        }`}
                    />
                        <span className="text-muted-foreground text-[11px] leading-tight">
                      {c.label}
                    </span>
                      </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}

function Field({
                 label,
                 value,
                 onChange,
                 dir,
                 placeholder,
               }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  dir: "rtl" | "ltr";
  placeholder?: string;
}) {
  const fieldId = useMemo(
      () => "field-" + label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      [label]
  );

  return (
      <div>
        <label
            htmlFor={fieldId}
            className="text-xs font-medium text-muted-foreground block mb-1"
        >
          {label}
        </label>
        <input
            id={fieldId}
            name={fieldId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={200}
            className={`w-full px-3 py-2 text-xs border border-border rounded-lg bg-card text-foreground outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all ${
                dir === "rtl" ? "text-right" : "text-left"
            }`}
        />
      </div>
  );
}