import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  MessageSquare,
  FileText,
  Filter,
  Globe,
  Calendar,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useI18n, serifFont, sansFont, type Lang } from "../lib/i18n";
import {
  useCms,
  deleteArticle,
  saveArticle,
  type AdminArticle,
} from "../lib/adminStore";

const LABELS = {
  title: { ar: "إدارة المقالات", fr: "Gestion des articles", en: "Articles Management", es: "Gestión de artículos" },
  subTitle: { ar: "عرض وتعديل وإنشاء المقالات في منصة ميزان", fr: "Consulter, éditer et créer des articles", en: "View, edit, and create articles", es: "Ver, editar y crear artículos" },
  newArticle: { ar: "مقال جديد", fr: "Nouvel article", en: "New Article", es: "Nuevo artículo" },
  searchPlaceholder: { ar: "البحث في المقالات...", fr: "Rechercher des articles...", en: "Search articles...", es: "Buscar artículos..." },
  filterAll: { ar: "الكل", fr: "Tous", en: "All", es: "Todos" },
  filterPublished: { ar: "منشور", fr: "Publié", en: "Published", es: "Publicado" },
  filterDraft: { ar: "مسودة", fr: "Brouillon", en: "Draft", es: "Borrador" },
  colArticle: { ar: "المقال", fr: "Article", en: "Article", es: "Artículo" },
  colCategory: { ar: "التصنيف", fr: "Catégorie", en: "Category", es: "Categoría" },
  colStatus: { ar: "الحالة", fr: "Statut", en: "Status", es: "Estado" },
  colViews: { ar: "المشاهدات", fr: "Vues", en: "Views", es: "Vistas" },
  colUpdated: { ar: "آخر تحديث", fr: "Dernière مise à jour", en: "Last Updated", es: "Última actualización" },
  colActions: { ar: "إجراءات", fr: "Actions", en: "Actions", es: "Acciones" },
  empty: { ar: "لم يتم العثور على مقالات.", fr: "Aucun article trouvé.", en: "No articles found.", es: "No se encontraron artículos." },
  deleteConfirm: { ar: "هل أنت ألكيد من رغبتك في حذف هذا المقال؟", fr: "Êtes-vous sûr de vouloir supprimer cet article ?", en: "Are you sure you want to delete this article?", es: "¿Estás seguro de que deseas eliminar este artículo?" },
  togglePublish: { ar: "تغيير حالة النشر", fr: "Changer le statut", en: "Toggle Status", es: "Cambiar estado" },
  edit: { ar: "تعديل", fr: "Éditer", en: "Edit", es: "Editar" },
  delete: { ar: "حذف", fr: "Supprimer", en: "Delete", es: "Eliminar" },
} as const;

function getLabel(key: keyof typeof LABELS, lang: Lang): string {
  return LABELS[key]?.[lang] || LABELS[key]?.en || "";
}

export default function ArticlesList() {
  const navigate = useNavigate();
  const { lang, dir } = useI18n();
  const cms = useCms();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");

  const articles = cms?.articles || [];

  // Filtered Articles based on Search & Status
  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const matchesSearch =
        article.title.toLowerCase().includes(search.toLowerCase()) ||
        article.category.toLowerCase().includes(search.toLowerCase()) ||
        article.author.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || article.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [articles, search, statusFilter]);

  const handleToggleStatus = async (article: AdminArticle) => {
    const nextStatus = article.status === "published" ? "draft" : "published";
    await saveArticle({
      ...article,
      status: nextStatus,
      published: nextStatus === "published",
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(getLabel("deleteConfirm", lang))) {
      await deleteArticle(id);
    }
  };

  return (
    <div
      className="min-h-screen bg-background text-foreground p-4 sm:p-8 max-w-7xl mx-auto space-y-6"
      dir={dir}
      style={{ fontFamily: sansFont(lang) }}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-extrabold flex items-center gap-2"
            style={{ fontFamily: serifFont(lang) }}
          >
            <FileText className="text-primary w-7 h-7" />
            <span>{getLabel("title", lang)}</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {getLabel("subTitle", lang)}
          </p>
        </div>

        <button
          onClick={() => navigate("/admin/articles/new")}
          className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm"
        >
          <Plus size={18} />
          <span>{getLabel("newArticle", lang)}</span>
        </button>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border">
        {/* Search Field */}
        <div className="relative w-full md:w-96">
          <Search
            size={18}
            className="absolute top-1/2 -translate-y-1/2 ltr:left-3.5 rtl:right-3.5 text-muted-foreground pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={getLabel("searchPlaceholder", lang)}
            className="w-full text-sm ltr:pl-10 rtl:pr-10 ltr:pr-4 rtl:pl-4 py-2.5 rounded-xl border border-border bg-background outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter size={16} className="text-muted-foreground shrink-0 ltr:mr-1 rtl:ml-1" />
          {(["all", "published", "draft"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all whitespace-nowrap ${
                statusFilter === st
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              {st === "all"
                ? getLabel("filterAll", lang)
                : st === "published"
                ? getLabel("filterPublished", lang)
                : getLabel("filterDraft", lang)}
            </button>
          ))}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm ltr:text-left rtl:text-right border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs uppercase font-bold">
                <th className="p-4">{getLabel("colArticle", lang)}</th>
                <th className="p-4">{getLabel("colCategory", lang)}</th>
                <th className="p-4">{getLabel("colStatus", lang)}</th>
                <th className="p-4">{getLabel("colViews", lang)}</th>
                <th className="p-4">{getLabel("colUpdated", lang)}</th>
                <th className="p-4 text-center">{getLabel("colActions", lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredArticles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground italic">
                    {getLabel("empty", lang)}
                  </td>
                </tr>
              ) : (
                filteredArticles.map((article) => {
                  const isPublished = article.status === "published";
                  return (
                    <tr
                      key={article.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* Title & Author */}
                      <td className="p-4 max-w-xs sm:max-w-md">
                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {article.title}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                          <span>{article.author || "—"}</span>
                          {article.commentsEnabled && (
                            <span className="flex items-center gap-0.5 text-[11px] text-primary/80">
                              <MessageSquare size={12} />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-muted text-foreground border border-border">
                          {article.category || "—"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(article)}
                          title={getLabel("togglePublish", lang)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                            isPublished
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20"
                          }`}
                        >
                          {isPublished ? (
                            <CheckCircle2 size={12} />
                          ) : (
                            <Clock size={12} />
                          )}
                          <span>
                            {isPublished
                              ? getLabel("filterPublished", lang)
                              : getLabel("filterDraft", lang)}
                          </span>
                        </button>
                      </td>

                      {/* Views */}
                      <td className="p-4 whitespace-nowrap text-muted-foreground font-mono text-xs">
                        <div className="flex items-center gap-1">
                          <Eye size={14} className="text-muted-foreground/70" />
                          <span>{(article.views || 0).toLocaleString()}</span>
                        </div>
                      </td>

                      {/* Updated Date */}
                      <td className="p-4 whitespace-nowrap text-muted-foreground font-mono text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar size={13} className="text-muted-foreground/70" />
                          <span>{article.updated || "—"}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => navigate(`/admin/articles/edit/${article.id}`)}
                            title={getLabel("edit", lang)}
                            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(article.id)}
                            title={getLabel("delete", lang)}
                            className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}