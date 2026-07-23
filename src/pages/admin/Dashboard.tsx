import { Users, FileText, Eye, ShieldAlert, TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useI18n, serifFont, sansFont, useLocalizedPath } from "../../lib/i18n";
import { useCms } from "../../lib/adminStore";
import { AdminWrapper } from "../../components/AdminWrapper";

const traffic = [
  { d: "Mon", v: 1200 },
  { d: "Tue", v: 2100 },
  { d: "Wed", v: 1800 },
  { d: "Thu", v: 2600 },
  { d: "Fri", v: 3200 },
  { d: "Sat", v: 2400 },
  { d: "Sun", v: 2900 },
];

const byCategory = [
  { c: "Family", v: 4200 },
  { c: "Criminal", v: 2800 },
  { c: "Commercial", v: 1500 },
  { c: "Admin", v: 980 },
  { c: "Constit.", v: 760 },
];

export default function Dashboard() {
  const { lang, t } = useI18n();
  const getLocalizedPath = useLocalizedPath();
  const cms = useCms();

  const totalViews = cms.articles.reduce((s, a) => s + a.views, 0);

  const kpis = [
    {
      icon: Users,
      label: t("admin_users"),
      value: cms.users.length,
      sub: `${cms.users.filter((u) => u.status === "banned").length} ${t("admin_banned")}`,
      link: getLocalizedPath("/admin/users"),
    },
    {
      icon: FileText,
      label: t("admin_articles"),
      value: cms.articles.length,
      sub: `${cms.articles.filter((a) => a.status === "published").length} ${t("admin_published")}`,
      link: getLocalizedPath("/admin/articles"),
    },
    {
      icon: Eye,
      label: t("reads"),
      value: totalViews.toLocaleString(),
      sub: "+12.4%",
      link: getLocalizedPath("/admin/analytics"),
    },
    {
      icon: ShieldAlert,
      label: t("admin_security"),
      value: cms.security.filter((s) => s.severity !== "info").length,
      sub: "24h",
      link: getLocalizedPath("/admin/security"),
    },
  ];

  return (
    <AdminWrapper title={t("admin_overview")}>
      <div>
        <h1
          className="text-2xl font-bold text-foreground mb-6"
          style={{ fontFamily: serifFont(lang) }}
        >
          {t("admin_overview")}
        </h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpis.map((k) => (
            <a
              key={k.label}
              href={k.link}
              className="bg-card border border-border rounded-2xl p-5 transition-all hover:border-primary/50 hover:shadow-sm block"
            >
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-primary mb-3">
                <k.icon size={18} />
              </div>
              <div className="text-2xl font-bold text-foreground">{k.value}</div>
              <div
                className="text-xs text-muted-foreground mt-1"
                style={{ fontFamily: sansFont(lang) }}
              >
                {k.label}
              </div>
              <div className="text-[11px] text-primary font-semibold mt-1 flex items-center gap-1">
                <TrendingUp size={11} />
                {k.sub}
              </div>
            </a>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2
              className="font-bold text-foreground mb-4"
              style={{ fontFamily: serifFont(lang) }}
            >
              {t("admin_analytics")}
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={traffic}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="d" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#g)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <h2
              className="font-bold text-foreground mb-4"
              style={{ fontFamily: serifFont(lang) }}
            >
              {t("admin_articles")}
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="c" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="v" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AdminWrapper>
  );
}