import { MousePointerClick, Eye, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useI18n, serifFont, sansFont } from "../../lib/i18n";
import { useCms } from "../../lib/adminStore";

export default function AdminSeo() {
  const { lang, t } = useI18n();
  const cms = useCms();

  const totalClicks = cms.keywords.reduce((s, k) => s + k.clicks, 0);
  const totalImpr = cms.keywords.reduce((s, k) => s + k.impressions, 0);
  const avgPos = (cms.keywords.reduce((s, k) => s + k.position, 0) / cms.keywords.length).toFixed(1);

  const kpis = [
    { icon: MousePointerClick, label: "Clicks", value: totalClicks.toLocaleString() },
    { icon: Eye, label: "Impressions", value: totalImpr.toLocaleString() },
    { icon: TrendingUp, label: "Avg. position", value: avgPos },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6" style={{ fontFamily: serifFont(lang) }}>{t("admin_seo")}</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {kpis.map(k => (
          <div key={k.label} className="bg-card border border-border rounded-2xl p-5">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-primary mb-3"><k.icon size={16} /></div>
            <div className="text-xl font-bold text-foreground">{k.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: sansFont(lang) }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <h2 className="font-bold text-foreground mb-4" style={{ fontFamily: serifFont(lang) }}>Top keywords — clicks</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={cms.keywords} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis type="category" dataKey="keyword" width={140} stroke="var(--muted-foreground)" fontSize={10} />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="clicks" fill="var(--primary)" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm" style={{ fontFamily: sansFont(lang) }}>
          <thead>
            <tr className="text-xs text-muted-foreground uppercase border-b border-border">
              <th className="p-4 text-start">Keyword</th>
              <th className="p-4 text-start">Clicks</th>
              <th className="p-4 text-start">Impressions</th>
              <th className="p-4 text-start">CTR</th>
              <th className="p-4 text-start">Position</th>
            </tr>
          </thead>
          <tbody>
            {cms.keywords.map(k => (
              <tr key={k.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="p-4 font-semibold text-foreground">{k.keyword}</td>
                <td className="p-4 text-muted-foreground">{k.clicks.toLocaleString()}</td>
                <td className="p-4 text-muted-foreground">{k.impressions.toLocaleString()}</td>
                <td className="p-4 text-muted-foreground">{((k.clicks / k.impressions) * 100).toFixed(1)}%</td>
                <td className="p-4"><span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent text-primary">{k.position.toFixed(1)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
