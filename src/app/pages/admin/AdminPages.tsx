import { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { useI18n, serifFont, sansFont } from "../../lib/i18n";
import { useCms, upsertPage, deletePage, type AdminPage } from "../../lib/adminStore";
import { sanitizeText } from "../../lib/security";

type Draft = Partial<AdminPage>;

export default function AdminPages() {
  const { lang, dir, t } = useI18n();
  const cms = useCms();
  const [editing, setEditing] = useState<Draft | null>(null);

  const save = () => {
    if (!editing) return;
    upsertPage({
      ...editing,
      title: sanitizeText(editing.title || "", 200),
      slug: sanitizeText(editing.slug || "", 120).replace(/\s+/g, "-").toLowerCase(),
    });
    setEditing(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: serifFont(lang) }}>{t("admin_pages")}</h1>
        <button onClick={() => setEditing({ status: "draft" })}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90"
          style={{ fontFamily: sansFont(lang) }}>
          <Plus size={16} />{t("admin_add")}
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm" style={{ fontFamily: sansFont(lang) }}>
          <thead>
            <tr className="text-xs text-muted-foreground uppercase border-b border-border">
              <th className="p-4 text-start">Page</th>
              <th className="p-4 text-start">{t("admin_status")}</th>
              <th className="p-4 text-start">Updated</th>
              <th className="p-4 text-end">—</th>
            </tr>
          </thead>
          <tbody>
            {cms.pages.map(p => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="p-4">
                  <div className="font-semibold text-foreground">{p.title}</div>
                  <div className="text-xs text-muted-foreground">/{p.slug}</div>
                </td>
                <td className="p-4">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${p.status === "published" ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}>
                    {p.status === "published" ? t("admin_published") : t("admin_draft")}
                  </span>
                </td>
                <td className="p-4 text-muted-foreground text-xs">{p.updated}</td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => setEditing(p)} className="p-2 rounded-lg text-primary hover:bg-accent"><Pencil size={15} /></button>
                    <button onClick={() => { if (confirm(t("admin_confirm_delete"))) deletePage(p.id); }} className="p-2 rounded-lg text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-card rounded-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()} dir={dir}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-foreground" style={{ fontFamily: serifFont(lang) }}>{editing.id ? t("admin_edit") : t("admin_add")}</h2>
              <button onClick={() => setEditing(null)} className="p-1 text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="space-y-3" style={{ fontFamily: sansFont(lang) }}>
              <div>
                <label className="text-xs text-muted-foreground">Title</label>
                <input value={editing.title || ""} onChange={e => setEditing({ ...editing, title: e.target.value })} maxLength={200}
                  className={`w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-card outline-none focus:border-primary ${dir === "rtl" ? "text-right" : "text-left"}`} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Slug</label>
                <input value={editing.slug || ""} onChange={e => setEditing({ ...editing, slug: e.target.value })} maxLength={120}
                  className={`w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-card outline-none focus:border-primary ${dir === "rtl" ? "text-right" : "text-left"}`} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{t("admin_status")}</label>
                <select value={editing.status || "draft"} onChange={e => setEditing({ ...editing, status: e.target.value as AdminPage["status"] })}
                  className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-card outline-none focus:border-primary">
                  <option value="draft">{t("admin_draft")}</option>
                  <option value="published">{t("admin_published")}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={save} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90">{t("admin_save")}</button>
              <button onClick={() => setEditing(null)} className="px-5 py-2.5 border border-border rounded-lg text-sm text-foreground hover:bg-muted">{t("admin_cancel")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
