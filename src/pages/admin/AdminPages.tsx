import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, FileText, Globe, Clock, Tag } from "lucide-react";
import { useI18n, serifFont, sansFont } from "../../lib/i18n";
import { useCms, upsertPage, deletePage, type AdminPage } from "../../lib/adminStore";
import { sanitizeText } from "../../lib/security";
import { AdminWrapper } from "../../components/AdminWrapper";

type Draft = Partial<AdminPage>;

export default function AdminPages() {
  const { lang, dir, t } = useI18n();
  const cms = useCms();
  const [editing, setEditing] = useState<Draft | null>(null);

  // Close modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEditing(null);
    };
    if (editing) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [editing]);

  const generateSlug = (text: string) => {
    return sanitizeText(text, 120)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
  };

  const handleTitleChange = (newTitle: string) => {
    if (!editing) return;
    const isNew = !editing.id;
    setEditing({
      ...editing,
      title: newTitle,
      // Auto-generate slug for new items if slug was not manually customized
      slug: isNew ? generateSlug(newTitle) : editing.slug || "",
    });
  };

  const save = () => {
    if (!editing || !editing.title) return;

    upsertPage({
      ...editing,
      title: sanitizeText(editing.title, 200),
      slug: editing.slug
        ? sanitizeText(editing.slug, 120).replace(/\s+/g, "-").toLowerCase()
        : generateSlug(editing.title),
      updated: new Date().toISOString().split("T")[0],
    });
    setEditing(null);
  };

  return (
    <AdminWrapper title={t("admin_pages")}>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: serifFont(lang) }}
            >
              {t("admin_pages")}
            </h1>
            <p
              className="text-xs text-muted-foreground mt-0.5"
              style={{ fontFamily: sansFont(lang) }}
            >
              {cms.pages.length}{" "}
              {lang === "ar" ? "صفحات مسجلة" : lang === "fr" ? "pages enregistrées" : "pages registered"}
            </p>
          </div>

          <button
            onClick={() => setEditing({ status: "draft", title: "", slug: "" })}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] active:scale-95"
            style={{ fontFamily: sansFont(lang) }}
          >
            <Plus size={16} />
            {t("admin_add")}
          </button>
        </div>

        {/* Pages Table Container */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ fontFamily: sansFont(lang) }}>
              <thead>
                <tr className="text-[11px] text-muted-foreground uppercase border-b border-border bg-muted/40 tracking-wider">
                  <th className="p-4 text-start font-bold">
                    {lang === "ar" ? "الصفحة" : lang === "fr" ? "Page" : "Page"}
                  </th>
                  <th className="p-4 text-start font-bold">{t("admin_status")}</th>
                  <th className="p-4 text-start font-bold">
                    {lang === "ar" ? "التحديث" : lang === "fr" ? "Mis à jour" : "Updated"}
                  </th>
                  <th className="p-4 text-end font-bold">—</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cms.pages.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground text-xs">
                      {lang === "ar" ? "لا توجد صفحات حالياً." : "No pages registered yet."}
                    </td>
                  </tr>
                ) : (
                  cms.pages.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-muted/50 transition-colors group"
                    >
                      <td className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                            <FileText size={16} />
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                              {p.title}
                            </div>
                            <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Globe size={11} className="text-emerald-500/70" />
                              <span>/{p.slug}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                            p.status === "published"
                              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400"
                              : "bg-amber-950/40 border-amber-500/30 text-amber-400"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              p.status === "published" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                            }`}
                          />
                          {p.status === "published" ? t("admin_published") : t("admin_draft")}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground text-xs font-mono">
                        <span className="flex items-center gap-1 text-[11px]">
                          <Clock size={12} className="text-muted-foreground/60" />
                          {p.updated}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditing(p)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-all"
                            title={t("admin_edit")}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(t("admin_confirm_delete"))) deletePage(p.id);
                            }}
                            className="p-2 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-950/20 transition-all"
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

        {/* Page Modal Editor */}
        {editing && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setEditing(null)}
          >
            <div
              className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
              dir={dir}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
                <div className="flex items-center gap-2">
                  <Tag size={18} className="text-emerald-500" />
                  <h2
                    className="font-bold text-foreground text-lg"
                    style={{ fontFamily: serifFont(lang) }}
                  >
                    {editing.id ? t("admin_edit") : t("admin_add")}
                  </h2>
                </div>
                <button
                  onClick={() => setEditing(null)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Form Inputs */}
              <div className="space-y-4" style={{ fontFamily: sansFont(lang) }}>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    {lang === "ar" ? "عنوان الصفحة" : "Page Title"}
                  </label>
                  <input
                    value={editing.title || ""}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    maxLength={200}
                    autoFocus
                    placeholder="e.g. Terms of Service"
                    className={`w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background text-foreground outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all ${
                      dir === "rtl" ? "text-right" : "text-left"
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    {lang === "ar" ? "المعرف (Slug)" : "URL Slug"}
                  </label>
                  <div className="relative">
                    <span className="absolute top-1/2 -translate-y-1/2 left-3 font-mono text-xs text-muted-foreground pointer-events-none">
                      /
                    </span>
                    <input
                      value={editing.slug || ""}
                      onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                      maxLength={120}
                      placeholder="terms-of-service"
                      className={`w-full pl-7 pr-3 py-2.5 text-sm font-mono border border-border rounded-xl bg-background text-foreground outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all ${
                        dir === "rtl" ? "text-right" : "text-left"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    {t("admin_status")}
                  </label>
                  <select
                    value={editing.status || "draft"}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        status: e.target.value as AdminPage["status"],
                      })
                    }
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background text-foreground outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                  >
                    <option value="draft">{t("admin_draft")}</option>
                    <option value="published">{t("admin_published")}</option>
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-border">
                <button
                  onClick={save}
                  disabled={!editing.title?.trim()}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-slate-950 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                >
                  {t("admin_save")}
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="px-5 py-2.5 border border-border rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                >
                  {t("admin_cancel")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminWrapper>
  );
}