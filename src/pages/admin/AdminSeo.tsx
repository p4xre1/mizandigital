import { MousePointerClick, Eye, TrendingUp, Search, BarChart2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useI18n, serifFont, sansFont } from "../../lib/i18n";
import { useCms } from "../../lib/adminStore";

export default function AdminSeo() {
  const { lang, t } = useI18n();
  const cms = useCms();

  const totalKeywords = cms.keywords.length;
  const totalClicks = cms.keywords.reduce((s, k) => s + k.clicks, 0);
  const totalImpr = cms.keywords.reduce((s, k) => s + k.impressions, 0);
  const avgPos = totalKeywords > 0
    ? (cms.keywords.reduce((s, k) => s + k.position, 0) / totalKeywords).toFixed(1)
    : "0.0";

  const kpis = [
    {
      icon: MousePointerClick,
      label: lang === "ar" ? "إجمالي النقرات" : lang === "fr" ? "Clics totaux" : "Clicks",
      value: totalClicks.toLocaleString(),
      accent: "text-emerald-400 bg-emerald-950/40 border-emerald-500/20",
    },
    {
      icon: Eye,
      label: lang === "ar" ? "إجمالي الظهور" : lang === "fr" ? "Impressions" : "Impressions",
      value: totalImpr.toLocaleString(),
      accent: "text-blue-400 bg-blue-950/40 border-blue-500/20",
    },
    {
      icon: TrendingUp,
      label: lang === "ar" ? "متوسط الترتيب" : lang === "fr" ? "Position moyenne" : "Avg. position",
      value: `#${avgPos}`,
      accent: "text-amber-400 bg-amber-950/40 border-amber-500/20",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: serifFont(lang) }}
          >
            {t("admin_seo")}
          </h1>
          <p
            className="text-xs text-muted-foreground mt-0.5"
            style={{ fontFamily: sansFont(lang) }}
          >
            {totalKeywords}{" "}
            {lang === "ar"
              ? "كلمات مفتاحية متتبعة"
              : lang === "fr"
              ? "mots-clés suivis"
              : "tracked keywords"}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bg-card border border-border rounded-2xl p-5 shadow-sm transition-all hover:border-emerald-500/30"
          >
            <div
              className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-3 ${k.accent}`}
            >
              <k.icon size={18} />
            </div>
            <div className="text-2xl font-bold text-foreground font-mono">
              {k.value}
            </div>
            <div
              className="text-xs text-muted-foreground mt-1"
              style={{ fontFamily: sansFont(lang) }}
            >
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {/* Bar Chart Section */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="mb-4">
          <h2
            className="font-bold text-foreground text-base flex items-center gap-2"
            style={{ fontFamily: serifFont(lang) }}
          >
            <BarChart2 size={16} className="text-emerald-500" />
            {lang === "ar"
              ? "أعلى الكلمات المفتاحية — النقرات"
              : lang === "fr"
              ? "Meilleurs mots-clés — Clics"
              : "Top keywords — clicks"}
          </h2>
        </div>

        <div className="h-[260px] w-full">
          {totalKeywords === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-mono">
              {lang === "ar"
                ? "لا توجد بيانات كلمات مفتاحية متاحة."
                : "No keyword data available."}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={cms.keywords}
                layout="vertical"
                margin={{ left: 20, right: 20, top: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis
                  type="number"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="keyword"
                  width={130}
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  }}
                />
                <Bar
                  dataKey="clicks"
                  fill="#10b981"
                  radius={[0, 6, 6, 0]}
                  barSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Keyword Performance Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <h2
            className="font-bold text-foreground text-sm flex items-center gap-2"
            style={{ fontFamily: serifFont(lang) }}
          >
            <Search size={15} className="text-emerald-500" />
            {lang === "ar"
              ? "تفاصيل أداء الكلمات البحثية"
              : lang === "fr"
              ? "Détails des performances des mots-clés"
              : "Search Keyword Performance"}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ fontFamily: sansFont(lang) }}>
            <thead>
              <tr className="text-[11px] text-muted-foreground uppercase border-b border-border bg-muted/40 font-semibold tracking-wider">
                <th className="p-4 text-start">
                  {lang === "ar" ? "الكلمة المفتاحية" : "Keyword"}
                </th>
                <th className="p-4 text-start">
                  {lang === "ar" ? "النقرات" : "Clicks"}
                </th>
                <th className="p-4 text-start">
                  {lang === "ar" ? "مرات الظهور" : "Impressions"}
                </th>
                <th className="p-4 text-start">CTR</th>
                <th className="p-4 text-start">
                  {lang === "ar" ? "الترتيب" : "Position"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {totalKeywords === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-muted-foreground text-xs font-mono"
                  >
                    {lang === "ar"
                      ? "لم يتم تسجيل أي كلمات مفتاحية بعد."
                      : "No tracked keywords recorded yet."}
                  </td>
                </tr>
              ) : (
                cms.keywords.map((k) => {
                  const ctr = (
                    (k.clicks / (k.impressions || 1)) *
                    100
                  ).toFixed(1);

                  const positionBadgeClass =
                    k.position <= 3
                      ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-400"
                      : k.position <= 10
                      ? "bg-blue-950/50 border-blue-500/40 text-blue-400"
                      : "bg-amber-950/50 border-amber-500/40 text-amber-400";

                  return (
                    <tr
                      key={k.id}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      <td className="p-4 font-bold text-foreground">
                        {k.keyword}
                      </td>
                      <td className="p-4 text-muted-foreground font-mono">
                        {k.clicks.toLocaleString()}
                      </td>
                      <td className="p-4 text-muted-foreground font-mono">
                        {k.impressions.toLocaleString()}
                      </td>
                      <td className="p-4 font-mono text-emerald-500">
                        {ctr}%
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-md border ${positionBadgeClass}`}
                        >
                          #{k.position.toFixed(1)}
                        </span>
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