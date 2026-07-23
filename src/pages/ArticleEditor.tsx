import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Save, 
  ArrowLeft, 
  Image as ImageIcon, 
  Globe, 
  Check, 
  AlertCircle,
  Eye,
  PenTool
} from "lucide-react";
import { useI18n, serifFont, sansFont, type Lang } from "../lib/i18n";
import { useCms, saveArticle, getArticleById, Article } from "../lib/adminStore";
import { sanitizeText } from "../lib/security";

const LABELS = {
  title: { ar: "محرر المقالات", fr: "Éditeur d'articles", en: "Article Editor", es: "Editor de artículos" },
  back: { ar: "رجوع", fr: "Retour", en: "Back", es: "Volver" },
  articleTitle: { ar: "عنوان المقال", fr: "Titre de l'article", en: "Article Title", es: "Título del artículo" },
  slug: { ar: "المعرف الفريد (Slug)", fr: "Slug (URL)", en: "Slug", es: "Slug" },
  category: { ar: "التصنيف", fr: "Catégorie", en: "Category", es: "Categoría" },
  coverImage: { ar: "رابط الصورة البارزة", fr: "URL de l'image de couverture", en: "Cover Image URL", es: "URL de la imagen de portada" },
  excerpt: { ar: "الملخص", fr: "Extrait", en: "Excerpt", es: "Extracto" },
  content: { ar: "محتوى المقال (دعم Markdown)", fr: "Contenu (Support Markdown)", en: "Content (Markdown supported)", es: "Contenido (Soporta Markdown)" },
  commentsEnabled: { ar: "السماح بالتعليقات", fr: "Autoriser les commentaires", en: "Allow Comments", es: "Permitir comentarios" },
  published: { ar: "نشر المقال", fr: "Publier l'article", en: "Publish Article", es: "Publicar artículo" },
  save: { ar: "حفظ المقال", fr: "Enregistrer", en: "Save Article", es: "Guardar artículo" },
  preview: { ar: "معاينة", fr: "Aperçu", en: "Preview", es: "Vista previa" },
  edit: { ar: "تعديل", fr: "Éditer", en: "Edit", es: "Editar" },
  savedSuccess: { ar: "تم حفظ المقال بنجاح!", fr: "Article enregistré avec succès !", en: "Article saved successfully!", es: "¡Artículo guardado con éxito!" },
  errorTitle: { ar: "العنوان مطلوب.", fr: "Le titre est requis.", en: "Title is required.", es: "El título es obligatorio." }
} as const;

function getLabel(key: keyof typeof LABELS, lang: Lang): string {
  return LABELS[key]?.[lang] || LABELS[key]?.en || "";
}

export default function ArticleEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang, dir } = useI18n();
  const cms = useCms();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("Technology");
  const [coverImage, setCoverImage] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [allowComments, setAllowComments] = useState(true);
  const [isPublished, setIsPublished] = useState(false);

  const [isPreview, setIsPreview] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing article if editing
  useEffect(() => {
    if (id && cms) {
      const existing = getArticleById(cms, id);
      if (existing) {
        setTitle(existing.title || "");
        setSlug(existing.slug || "");
        setCategory(existing.category || "Technology");
        setCoverImage(existing.coverImage || "");
        setExcerpt(existing.excerpt || "");
        setContent(existing.content || "");
        setAllowComments(existing.allowComments ?? true);
        setIsPublished(existing.published ?? false);
      }
    }
  }, [id, cms]);

  // Auto-generate slug from title if empty
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!id && !slug) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, ""));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    const cleanTitle = sanitizeText(title, 150);
    if (!cleanTitle) {
      setStatusMsg({ type: "error", text: getLabel("errorTitle", lang) });
      return;
    }

    setIsSaving(true);

    const articleData: Partial<Article> = {
      id: id || `art_${Date.now()}`,
      title: cleanTitle,
      slug: slug.trim() || cleanTitle.toLowerCase().replace(/\s+/g, "-"),
      category: sanitizeText(category, 50),
      coverImage: coverImage.trim(),
      excerpt: sanitizeText(excerpt, 300),
      content: sanitizeText(content, 50000),
      allowComments,
      published: isPublished,
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveArticle(articleData);
      setStatusMsg({ type: "success", text: getLabel("savedSuccess", lang) });
      setTimeout(() => {
        navigate("/admin/articles");
      }, 1200);
    } catch {
      setStatusMsg({ type: "error", text: "Failed to save article." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-background text-foreground p-4 sm:p-8 max-w-5xl mx-auto"
      dir={dir}
      style={{ fontFamily: sansFont(lang) }}
    >
      {/* Header bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl border border-border hover:bg-muted transition-colors flex items-center justify-center"
            title={getLabel("back", lang)}
          >
            <ArrowLeft size={18} className="rtl:rotate-180" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: serifFont(lang) }}>
            {getLabel("title", lang)}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className="px-4 py-2 text-sm font-medium border border-border rounded-xl hover:bg-muted transition-colors flex items-center gap-2"
          >
            {isPreview ? <PenTool size={16} /> : <Eye size={16} />}
            <span>{isPreview ? getLabel("edit", lang) : getLabel("preview", lang)}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={16} />
            <span>{getLabel("save", lang)}</span>
          </button>
        </div>
      </header>

      {/* Status Alert */}
      {statusMsg && (
        <div 
          className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
            statusMsg.type === "success" 
              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" 
              : "bg-destructive/10 text-destructive border border-destructive/20"
          }`}
        >
          {statusMsg.type === "success" ? <Check size={18} /> : <AlertCircle size={18} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Main Body */}
      {isPreview ? (
        /* Preview Mode */
        <article className="prose dark:prose-invert max-w-none bg-card p-6 sm:p-10 rounded-2xl border border-border">
          {coverImage && (
            <img 
              src={coverImage} 
              alt={title} 
              className="w-full h-64 sm:h-96 object-cover rounded-xl mb-6" 
            />
          )}
          <span className="text-xs uppercase font-bold text-primary tracking-wider">{category}</span>
          <h1 className="text-3xl font-extrabold mt-2 mb-4" style={{ fontFamily: serifFont(lang) }}>
            {title || "Untitled Article"}
          </h1>
          {excerpt && <p className="text-lg text-muted-foreground italic mb-6">{excerpt}</p>}
          <hr className="my-6 border-border" />
          <div className="whitespace-pre-wrap leading-relaxed">{content}</div>
        </article>
      ) : (
        /* Edit Form */
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Title */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">
                {getLabel("articleTitle", lang)} *
              </label>
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                required
                className="w-full px-4 py-3 rounded-xl border border-border bg-card outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-base"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">
                {getLabel("category", lang)}
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Slug */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                <Globe size={14} />
                {getLabel("slug", lang)}
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-card outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm font-mono"
              />
            </div>

            {/* Cover Image */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                <ImageIcon size={14} />
                {getLabel("coverImage", lang)}
              </label>
              <input
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-card outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm"
              />
            </div>
          </div>

          {/* Excerpt */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground">
              {getLabel("excerpt", lang)}
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              maxLength={300}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-card outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm resize-none"
            />
          </div>

          {/* Body Content */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground">
              {getLabel("content", lang)}
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={14}
              className="w-full p-4 rounded-xl border border-border bg-card outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm font-mono leading-relaxed"
            />
          </div>

          {/* Settings Toggles */}
          <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-border">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allowComments}
                onChange={(e) => setAllowComments(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium">{getLabel("commentsEnabled", lang)}</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium">{getLabel("published", lang)}</span>
            </label>
          </div>
        </form>
      )}
    </div>
  );
}