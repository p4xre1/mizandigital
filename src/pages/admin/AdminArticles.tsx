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
} from "lucide-react";
import { useI18n, serifFont, sansFont } from "../../lib/i18n";
import {
  useCms,
  upsertArticle,
  deleteArticle,
  type AdminArticle,
} from "../../lib/adminStore";
import { sanitizeText, sanitizeHtml } from "../../lib/security";
import { analyzeSeo, type SeoReport } from "../../lib/seoScore";
import RichTextEditor from "@/components/common/RichTextEditor";

type Draft = Partial<AdminArticle>;

export default function AdminArticles() {
  const { lang, dir, t } = useI18n();
  const cms = useCms();
  const [editing, setEditing] = useState<Draft | null>(null);

  return (
    <div dir={dir} className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: serifFont(lang) }}
          >
            {t("admin_articles")}
          </h1>
          <p
            className="text-xs text-muted-foreground mt-0.5"
            style={{ fontFamily: sansFont(lang) }}
          >
            {cms.articles.length}{" "}
            {lang === "ar"
              ? "مقالات نشرت أو مسودات"
              : lang === "fr"
              ? "articles publiés ou brouillons"
              : "published or draft articles"}
          </p>
        </div>

        <button
          onClick={() =>
            setEditing({
              status: "draft",
              commentsEnabled: true,
              content: "",
              tags: [],
            })
          }
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          style={{ fontFamily: sansFont(lang) }}
        >
          <Plus size={15} />
          {t("admin_add")}
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ fontFamily: sansFont(lang) }}>
            <thead>
              <tr className="text-[11px] text-muted-foreground uppercase border-b border-border bg-muted/40 font-semibold tracking-wider">
                <th className="p-4 text-start">
                  {lang === "ar" ? "العنوان" : lang === "fr" ? "Titre" : "Title"}
                </th>
                <th className="p-4 text-start">{t("admin_status")}</th>
                <th className="p-4 text-start">
                  {lang === "ar" ? "التعليقات" : lang === "fr" ? "Commentaires" : "Comments"}
                </th>
                <th className="p-4 text-start">{t("reads")}</th>
                <th className="p-4 text-end">—</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cms.articles.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-muted-foreground text-xs font-mono"
                  >
                    {lang === "ar"
                      ? "لا توجد مقالات مسجلة حتى الآن."
                      : "No articles found in repository."}
                  </td>
                </tr>
              ) : (
                cms.articles.map((a) => (
                  <tr
                    key={a.id}
                    className="hover:bg-muted/40 transition-colors group"
                  >
                    <td className="p-4 max-w-xs">
                      <div className="font-semibold text-foreground text-sm group-hover:text-emerald-400 transition-colors truncate">
                        {a.title}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono truncate mt-0.5">
                        /{a.slug} · <span className="text-emerald-500/80">{a.category}</span>
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
                        {a.views.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditing(a)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-emerald-400 hover:bg-emerald-950/30 transition-all"
                          title={t("admin_edit")}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(t("admin_confirm_delete")))
                              deleteArticle(a.id);
                          }}
                          className="p-2 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-950/30 transition-all"
                          title={t("admin_delete")}
                        >
                          <Trash2 size={15} />
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
        <ArticleEditor
          draft={editing}
          onClose={() => setEditing(null)}
          dir={dir}
          lang={lang}
          t={t}
        />
      )}
    </div>
  );
}

function ArticleEditor({
  draft,
  onClose,
  dir,
  lang,
  t,
}: {
  draft: Draft;
  onClose: () => void;
  dir: "rtl" | "ltr";
  lang: ReturnType<typeof useI18n>["lang"];
  t: (k: string) => string;
}) {
  const [d, setD] = useState<Draft>(draft);
  const [tagInput, setTagInput] = useState((draft.tags || []).join(", "));

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

  const save = () => {
    upsertArticle({
      ...d,
      title: sanitizeText(d.title || "", 200),
      slug: sanitizeText(d.slug || "", 120)
        .replace(/\s+/g, "-")
        .toLowerCase(),
      category: sanitizeText(d.category || "", 80),
      author: sanitizeText(d.author || "", 120),
      excerpt: sanitizeText(d.excerpt || "", 300),
      metaTitle: sanitizeText(d.metaTitle || "", 70),
      metaDescription: sanitizeText(d.metaDescription || "", 180),
      keyword: sanitizeText(d.keyword || "", 60),
      content: sanitizeHtml(d.content || ""),
      tags: tagInput
        .split(",")
        .map((s) => sanitizeText(s, 40))
        .filter(Boolean)
        .slice(0, 12),
    });
    onClose();
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
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-5xl my-6 border border-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        dir={dir}
      >
        {/* Modal Topbar */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <FileText className="text-emerald-500" size={18} />
            <h2
              className="font-bold text-foreground text-lg"
              style={{ fontFamily: serifFont(lang) }}
            >
              {d.id ? t("admin_edit") : t("admin_add")}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={save}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              {t("admin_save")}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Content Grid */}
        <div
          className="grid lg:grid-cols-[1fr_320px] gap-6 p-6"
          style={{ fontFamily: sansFont(lang) }}
        >
          {/* Main Form (Left) */}
          <div className="space-y-4">
            <Field
              label={lang === "ar" ? "العنوان" : "Title"}
              value={d.title || ""}
              onChange={(v) => setD({ ...d, title: v })}
              dir={dir}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Slug"
                value={d.slug || ""}
                onChange={(v) => setD({ ...d, slug: v })}
                dir={dir}
              />
              <Field
                label={lang === "ar" ? "التصنيف" : "Category"}
                value={d.category || ""}
                onChange={(v) => setD({ ...d, category: v })}
                dir={dir}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                {lang === "ar" ? "محتوى المقال" : "Article Content"}
              </label>
              <div className="rounded-xl border border-border overflow-hidden">
                <RichTextEditor
                  value={d.content || ""}
                  onChange={(html) => setD({ ...d, content: html })}
                  dir={dir}
                />
              </div>
            </div>
          </div>

          {/* Sidebar Tools (Right) */}
          <div className="space-y-4">
            {/* Status and Metadata Box */}
            <div className="bg-muted/20 border border-border rounded-xl p-4 space-y-3">
              <div>
                <label
                  htmlFor="article-status"
                  className="text-xs font-medium text-muted-foreground"
                >
                  {t("admin_status")}
                </label>
                <select
                  id="article-status"
                  name="status"
                  value={d.status || "draft"}
                  onChange={(e) =>
                    setD({
                      ...d,
                      status: e.target.value as AdminArticle["status"],
                    })
                  }
                  className="w-full mt-1.5 px-3 py-2 text-xs border border-border rounded-lg bg-card text-foreground outline-none focus:border-emerald-500/60 transition-all font-mono uppercase"
                >
                  <option value="draft">{t("admin_draft")}</option>
                  <option value="published">{t("admin_published")}</option>
                </select>
              </div>

              <Field
                label={lang === "ar" ? "الكاتب" : "Author"}
                value={d.author || ""}
                onChange={(v) => setD({ ...d, author: v })}
                dir={dir}
              />
              <Field
                label={lang === "ar" ? "الوسوم (مفصولة بفواصل)" : "Tags (comma separated)"}
                value={tagInput}
                onChange={setTagInput}
                dir={dir}
              />

              <label
                htmlFor="comments-enabled"
                className="flex items-center justify-between text-xs text-foreground cursor-pointer pt-2 border-t border-border/60"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <MessageSquare size={14} className="text-emerald-500" />
                  {lang === "ar" ? "تفعيل التعليقات" : "Enable Comments"}
                </span>
                <input
                  type="checkbox"
                  id="comments-enabled"
                  name="commentsEnabled"
                  checked={d.commentsEnabled !== false}
                  onChange={(e) =>
                    setD({ ...d, commentsEnabled: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-border text-emerald-600 focus:ring-emerald-500/30 accent-emerald-500"
                />
              </label>
            </div>

            {/* SEO Settings Box */}
            <div className="bg-muted/20 border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                <span>SEO Configuration</span>
              </h3>
              <Field
                label="Focus keyword"
                value={d.keyword || ""}
                onChange={(v) => setD({ ...d, keyword: v })}
                dir={dir}
              />
              <Field
                label="Meta title"
                value={d.metaTitle || ""}
                onChange={(v) => setD({ ...d, metaTitle: v })}
                dir={dir}
              />
              <div>
                <label
                  htmlFor="meta-description"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Meta description
                </label>
                <textarea
                  id="meta-description"
                  name="metaDescription"
                  value={d.metaDescription || ""}
                  onChange={(e) =>
                    setD({ ...d, metaDescription: e.target.value })
                  }
                  rows={3}
                  maxLength={180}
                  className={`w-full mt-1.5 px-3 py-2 text-xs border border-border rounded-lg bg-card text-foreground outline-none focus:border-emerald-500/60 transition-all resize-none ${
                    dir === "rtl" ? "text-right" : "text-left"
                  }`}
                />
              </div>
            </div>

            {/* SEO Live Analyzer Box */}
            <div className="bg-muted/20 border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wider">
                  <Gauge size={14} className="text-emerald-500" />
                  SEO Score
                </h3>
                <span
                  className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-md border ${gradeBadgeClass}`}
                >
                  {report.score} / 100 · {report.grade}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 rounded-full bg-border overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${progressBg}`}
                  style={{ width: `${report.score}%` }}
                />
              </div>

              {/* Checklist */}
              <ul className="space-y-2">
                {report.checks.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-start gap-2 text-xs"
                    title={c.hint}
                  >
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  dir: "rtl" | "ltr";
}) {
  const fieldId = useMemo(
    () => "field-" + label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    [label]
  );

  return (
    <div>
      <label
        htmlFor={fieldId}
        className="text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>
      <input
        id={fieldId}
        name={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={200}
        className={`w-full mt-1.5 px-3 py-2 text-xs border border-border rounded-lg bg-card text-foreground outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all ${
          dir === "rtl" ? "text-right" : "text-left"
        }`}
      />
    </div>
  );
}