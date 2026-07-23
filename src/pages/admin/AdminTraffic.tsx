import { Trash2, MessageSquare, Activity, Globe, Clock, ArrowRight } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { useI18n, serifFont, sansFont } from "../../lib/i18n";
import { useCms, deleteComment } from "../../lib/adminStore";

const COLORS = [
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#f59e0b", // Amber
  "#ef4444", // Rose
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#64748b", // Slate
];

export default function AdminTraffic() {
  const { lang, t } = useI18n();
  const cms = useCms();

  // Aggregate traffic by source.
  const bySource = Object.entries(
    cms.traffic.reduce<Record<string, number>>((acc, h) => {
      acc[h.source] = (acc[h.source] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const articleTitle = (id: string) =>
    cms.articles.find((a) => a.id === id)?.title || id;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: serifFont(lang) }}
        >
          {t("admin_analytics")}
        </h1>
        <span className="text-xs text-muted-foreground font-mono flex items-center gap-1.5 bg-card border border-border px-3 py-1.5 rounded-xl">
          <Activity size={13} className="text-emerald-500 animate-pulse" />
          {cms.traffic.length}{" "}
          {lang === "ar"
            ? "زيارة مسجلة"
            : lang === "fr"
            ? "visites enregistrées"
            : "logged visits"}
        </span>
      </div>

      {/* Analytics Row: Pie Chart + Traffic Logs */}
      <div className="grid lg:grid-cols-[340px_1fr] gap-6">
        {/* Source Pie Chart */}
        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <h2
              className="font-bold text-foreground text-base mb-1 flex items-center gap-2"
              style={{ fontFamily: serifFont(lang) }}
            >
              <Globe size={16} className="text-emerald-500" />
              {lang === "ar"
                ? "مصادر الزيارات"
                : lang === "fr"
                ? "Sources de trafic"
                : "Traffic sources"}
            </h2>
            <p
              className="text-xs text-muted-foreground mb-4"
              style={{ fontFamily: sansFont(lang) }}
            >
              {lang === "ar"
                ? "توزيع القنوات والمصادر القادمة"
                : lang === "fr"
                ? "Répartition des canaux d'origine"
                : "Distribution of inbound visit channels"}
            </p>
          </div>

          <div className="h-[220px] w-full">
            {bySource.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-mono">
                {lang === "ar" ? "لا توجد بيانات حركة مرور" : "No traffic data available"}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bySource}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={40}
                    paddingAngle={3}
                  >
                    {bySource.map((_, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={COLORS[i % COLORS.length]}
                        stroke="var(--card)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                      borderRadius: "12px",
                      fontSize: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Traffic Log Table */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border bg-muted/30">
            <h2
              className="font-bold text-foreground text-sm"
              style={{ fontFamily: serifFont(lang) }}
            >
              {lang === "ar"
                ? "سجل الزيارات الأخير"
                : lang === "fr"
                ? "Journal de trafic récents"
                : "Recent Traffic Logs"}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ fontFamily: sansFont(lang) }}>
              <thead>
                <tr className="text-[11px] text-muted-foreground uppercase border-b border-border bg-muted/40 font-semibold tracking-wider">
                  <th className="p-3 text-start">Source</th>
                  <th className="p-3 text-start">Medium</th>
                  <th className="p-3 text-start">Campaign</th>
                  <th className="p-3 text-start">Landing page</th>
                  <th className="p-3 text-start">Referrer</th>
                  <th className="p-3 text-start">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cms.traffic.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-muted-foreground text-xs font-mono"
                    >
                      {lang === "ar"
                        ? "لم يتم تسجيل أي زيارات حتى الآن."
                        : "No traffic entries recorded."}
                    </td>
                  </tr>
                ) : (
                  cms.traffic.slice(0, 30).map((h) => (
                    <tr
                      key={h.id}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      <td className="p-3">
                        <span className="font-bold text-foreground uppercase tracking-wide text-[11px]">
                          {h.source}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground font-mono">
                        {h.medium || "—"}
                      </td>
                      <td className="p-3 text-muted-foreground font-mono">
                        {h.campaign || "—"}
                      </td>
                      <td className="p-3 text-muted-foreground font-mono max-w-[160px] truncate">
                        {h.path}
                      </td>
                      <td className="p-3 text-muted-foreground font-mono max-w-[160px] truncate">
                        {h.referrer || "—"}
                      </td>
                      <td className="p-3 text-muted-foreground font-mono text-[11px]">
                        <span className="flex items-center gap-1">
                          <Clock size={11} className="text-muted-foreground/60" />
                          {h.at}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Comment Moderation Section */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <h2
            className="flex items-center gap-2 font-bold text-foreground text-base"
            style={{ fontFamily: serifFont(lang) }}
          >
            <MessageSquare size={18} className="text-emerald-500" />
            {lang === "ar"
              ? `إدارة التعليقات (${cms.comments.length})`
              : lang === "fr"
              ? `Modération des commentaires (${cms.comments.length})`
              : `Comment Moderation (${cms.comments.length})`}
          </h2>
        </div>

        <div className="space-y-3">
          {cms.comments.length === 0 ? (
            <p className="text-xs text-muted-foreground font-mono text-center py-6">
              {lang === "ar" ? "لا توجد تعليقات جديدة للمراجعة." : "No comments available for moderation."}
            </p>
          ) : (
            cms.comments.map((c) => (
              <div
                key={c.id}
                className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-border bg-muted/20 hover:border-emerald-500/30 transition-all group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
                    <span className="font-bold text-foreground">{c.name}</span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      • {c.at}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium truncate max-w-[260px]">
                      <ArrowRight size={10} className="shrink-0" />
                      {articleTitle(c.articleId)}
                    </span>
                  </div>
                  <p
                    className="text-xs text-foreground/90 leading-relaxed break-words"
                    style={{ fontFamily: sansFont(lang) }}
                  >
                    {c.body}
                  </p>
                </div>

                <button
                  onClick={() => deleteComment(c.id)}
                  title={t("admin_delete")}
                  className="p-2 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-950/30 transition-all shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}