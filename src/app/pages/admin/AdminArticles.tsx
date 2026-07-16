import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, X, MessageSquare, MessageSquareOff, Gauge } from "lucide-react";
import { useI18n, serifFont, sansFont } from "../../lib/i18n";
import { useCms, upsertArticle, deleteArticle, type AdminArticle } from "../../lib/adminStore";
import { sanitizeText, sanitizeHtml } from "../../lib/security";
import { analyzeSeo, type SeoReport } from "../../lib/seoScore";
import RichTextEditor from "../../components/RichTextEditor";

type Draft = Partial<AdminArticle>;

export default function AdminArticles() {
  const { lang, dir, t } = useI18n();
  const cms = useCms();
  const [editing, setEditing] = useState<Draft | null>(null);

  return (
    <div dir={dir} className="w-full">
      {/* ── 🔝 الهيدر العلوي للصفحة ── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: serifFont(lang) }}>
          {t("admin_articles")}
        </h1>
        <button 
          onClick={() => setEditing({ status: "draft", commentsEnabled: true, content: "", tags: [] })}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ fontFamily: sansFont(lang) }}
        >
          <Plus size={16} />
          {t("admin_add")}
        </button>
      </div>

      {/* ── 📊 جدول البيانات المطور ── */}
      <div className="bg-card border border-border rounded-2xl overflow-x-auto shadow-sm">
        <table className="w-full text-sm" style={{ fontFamily: sansFont(lang) }}>
          <thead>
            <tr className="text-xs text-muted-foreground uppercase border-b border-border bg-muted/20">
              <th className="p-4 text-start">Title</th>
              <th className="p-4 text-start">{t("admin_status")}</th>
              <th className="p-4 text-start">Comments</th>
              <th className="p-4 text-start">{t("reads")}</th>
              <th className="p-4 text-end">—</th>
            </tr>
          </thead>
          <tbody>
            {cms.articles.map(a => (
              <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                <td className="p-4">
                  <div className="font-semibold text-foreground">{a.title}</div>
                  <div className="text-xs text-muted-foreground">/{a.slug} · {a.category}</div>
                </td>
                <td className="p-4">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${a.status === "published" ? "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400" : "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"}`}>
                    {a.status === "published" ? t("admin_published") : t("admin_draft")}
                  </span>
                </td>
                <td className="p-4">
                  {a.commentsEnabled !== false
                    ? <MessageSquare size={15} className="text-green-600 dark:text-green-400" />
                    : <MessageSquareOff size={15} className="text-muted-foreground" />}
                </td>
                <td className="p-4 text-muted-foreground">{a.views.toLocaleString()}</td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => setEditing(a)} 
                      className="p-2 rounded-lg text-primary hover:bg-accent transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    <button 
                      onClick={() => { if (confirm(t("admin_confirm_delete"))) deleteArticle(a.id); }} 
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 📝 محرر المقالات المنبثق ── */}
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

function ArticleEditor({ draft, onClose, dir, lang, t }: {
  draft: Draft; onClose: () => void; dir: "rtl" | "ltr";
  lang: ReturnType<typeof useI18n>["lang"]; t: (k: string) => string;
}) {
  const [d, setD] = useState<Draft>(draft);
  const [tagInput, setTagInput] = useState((draft.tags || []).join(", "));

  const report: SeoReport = useMemo(() => analyzeSeo({
    title: d.title || "",
    metaTitle: d.metaTitle,
    metaDescription: d.metaDescription,
    slug: d.slug || "",
    keyword: d.keyword,
    contentHtml: d.content || "",
    tags: tagInput.split(",").map(s => s.trim()).filter(Boolean),
  }), [d, tagInput]);

  const save = () => {
    upsertArticle({
      ...d,
      title: sanitizeText(d.title || "", 200),
      slug: sanitizeText(d.slug || "", 120).replace(/\s+/g, "-").toLowerCase(),
      category: sanitizeText(d.category || "", 80),
      author: sanitizeText(d.author || "", 120),
      excerpt: sanitizeText(d.excerpt || "", 300),
      metaTitle: sanitizeText(d.metaTitle || "", 70),
      metaDescription: sanitizeText(d.metaDescription || "", 180),
      keyword: sanitizeText(d.keyword || "", 60),
      content: sanitizeHtml(d.content || ""),
      tags: tagInput.split(",").map(s => sanitizeText(s, 40)).filter(Boolean).slice(0, 12),
    });
    onClose();
  };

  const gradeColor = report.grade === "A" ? "text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400" : report.grade === "B" ? "text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400" : report.grade === "C" ? "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400" : "text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-muted rounded-2xl w-full max-w-5xl my-6 border border-border shadow-2xl" onClick={e => e.stopPropagation()} dir={dir}>
        <div className="flex items-center justify-between p-5 border-b border-border bg-card rounded-t-2xl sticky top-0 z-10">
          <h2 className="font-bold text-foreground" style={{ fontFamily: serifFont(lang) }}>{d.id ? t("admin_edit") : t("admin_add")}</h2>
          <div className="flex items-center gap-2">
            <button onClick={save} className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">{t("admin_save")}</button>
            <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-5 p-5" style={{ fontFamily: sansFont(lang) }}>
          <div className="space-y-4">
            <Field label="Title" value={d.title || ""} onChange={v => setD({ ...d, title: v })} dir={dir} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Slug" value={d.slug || ""} onChange={v => setD({ ...d, slug: v })} dir={dir} />
              <Field label="Category" value={d.category || ""} onChange={v => setD({ ...d, category: v })} dir={dir} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Content</label>
              <div className="mt-1">
                <RichTextEditor value={d.content || ""} onChange={html => setD({ ...d, content: html })} dir={dir} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div>
                <label htmlFor="article-status" className="text-xs text-muted-foreground">{t("admin_status")}</label>
                <select 
                  id="article-status"
                  name="status"
                  value={d.status || "draft"} 
                  onChange={e => setD({ ...d, status: e.target.value as AdminArticle["status"] })}
                  className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground outline-none focus:border-primary"
                >
                  <option value="draft">{t("admin_draft")}</option>
                  <option value="published">{t("admin_published")}</option>
                </select>
              </div>
              <Field label="Author" value={d.author || ""} onChange={v => setD({ ...d, author: v })} dir={dir} />
              <Field label="Tags (comma separated)" value={tagInput} onChange={setTagInput} dir={dir} />
              <label htmlFor="comments-enabled" className="flex items-center justify-between text-sm text-foreground cursor-pointer pt-2">
                <span className="flex items-center gap-1.5"><MessageSquare size={14} />Comments</span>
                <input 
                  type="checkbox" 
                  id="comments-enabled"
                  name="commentsEnabled"
                  checked={d.commentsEnabled !== false}
                  onChange={e => setD({ ...d, commentsEnabled: e.target.checked })} 
                  className="w-4 h-4 accent-primary" 
                />
              </label>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">SEO</h3>
              <Field label="Focus keyword" value={d.keyword || ""} onChange={v => setD({ ...d, keyword: v })} dir={dir} />
              <Field label="Meta title" value={d.metaTitle || ""} onChange={v => setD({ ...d, metaTitle: v })} dir={dir} />
              <div>
                <label htmlFor="meta-description" className="text-xs text-muted-foreground">Meta description</label>
                <textarea 
                  id="meta-description"
                  name="metaDescription"
                  value={d.metaDescription || ""} 
                  onChange={e => setD({ ...d, metaDescription: e.target.value })} 
                  rows={3} 
                  maxLength={180}
                  className={`w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground outline-none focus:border-primary resize-none ${dir === "rtl" ? "text-right" : "text-left"}`} 
                />
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wide"><Gauge size={14} />SEO Score</h3>
                <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${gradeColor}`}>{report.score} · {report.grade}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${report.score}%` }} />
              </div>
              <ul className="space-y-1.5">
                {report.checks.map(c => (
                  <li key={c.id} className="flex items-start gap-2 text-xs" title={c.hint}>
                    <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${c.status === "pass" ? "bg-green-500" : c.status === "warn" ? "bg-amber-500" : "bg-red-500"}`} />
                    <span className="text-foreground/80">{c.label}</span>
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

function Field({ label, value, onChange, dir }: { label: string; value: string; onChange: (v: string) => void; dir: "rtl" | "ltr" }) {
  // توليد معرف فريد يعتمد على العنوان (Slugified field ID)
  const fieldId = useMemo(() => "field-" + label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), [label]);

  return (
    <div>
      <label htmlFor={fieldId} className="text-xs text-muted-foreground">{label}</label>
      <input 
        id={fieldId}
        name={fieldId}
        value={value} 
        onChange={e => onChange(e.target.value)} 
        maxLength={200}
        className={`w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground outline-none focus:border-primary ${dir === "rtl" ? "text-right" : "text-left"}`} 
      />
    </div>
  );
}