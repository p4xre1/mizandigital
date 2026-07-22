import { Trash2, MessageSquare } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from "recharts";
import { useI18n, serifFont, sansFont } from "../../lib/i18n";
import { useCms, deleteComment } from "../../lib/adminStore";

const COLORS = ["#1d4ed8", "#c9a227", "#16a34a", "#dc2626", "#7c3aed", "#0891b2", "#64748b"];

export default function AdminTraffic() {
  const { lang, t } = useI18n();
  const cms = useCms();

  // Aggregate traffic by source.
  const bySource = Object.entries(
    cms.traffic.reduce<Record<string, number>>((acc, h) => {
      acc[h.source] = (acc[h.source] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const articleTitle = (id: string) => cms.articles.find(a => a.id === id)?.title || id;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6" style={{ fontFamily: serifFont(lang) }}>{t("admin_analytics")}</h1>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6 mb-8">
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-bold text-foreground mb-4" style={{ fontFamily: serifFont(lang) }}>Traffic sources</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={bySource} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {bySource.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-x-auto">
          <table className="w-full text-sm" style={{ fontFamily: sansFont(lang) }}>
            <thead>
              <tr className="text-xs text-muted-foreground uppercase border-b border-border">
                <th className="p-3 text-start">Source</th>
                <th className="p-3 text-start">Medium</th>
                <th className="p-3 text-start">Campaign</th>
                <th className="p-3 text-start">Landing page</th>
                <th className="p-3 text-start">Referrer</th>
                <th className="p-3 text-start">When</th>
              </tr>
            </thead>
            <tbody>
              {cms.traffic.slice(0, 30).map(h => (
                <tr key={h.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="p-3"><span className="font-semibold text-foreground">{h.source}</span></td>
                  <td className="p-3 text-muted-foreground">{h.medium}</td>
                  <td className="p-3 text-muted-foreground">{h.campaign || "—"}</td>
                  <td className="p-3 text-muted-foreground font-mono text-xs max-w-[160px] truncate">{h.path}</td>
                  <td className="p-3 text-muted-foreground text-xs max-w-[160px] truncate">{h.referrer || "—"}</td>
                  <td className="p-3 text-muted-foreground text-xs font-mono">{h.at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comment moderation */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="flex items-center gap-2 font-bold text-foreground mb-4" style={{ fontFamily: serifFont(lang) }}>
          <MessageSquare size={17} />Comments ({cms.comments.length})
        </h2>
        <div className="space-y-2">
          {cms.comments.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
          {cms.comments.map(c => (
            <div key={c.id} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border">
              <div className="min-w-0">
                <div className="text-sm">
                  <span className="font-semibold text-foreground">{c.name}</span>
                  <span className="text-xs text-muted-foreground mx-2 font-mono">{c.at}</span>
                  <span className="text-xs text-primary">→ {articleTitle(c.articleId)}</span>
                </div>
                <p className="text-sm text-foreground/80 mt-1 break-words" style={{ fontFamily: sansFont(lang) }}>{c.body}</p>
              </div>
              <button onClick={() => deleteComment(c.id)} className="p-2 rounded-lg text-red-600 hover:bg-red-50 shrink-0"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
